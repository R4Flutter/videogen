"""script.json -> AI-generated stills in video/public/footage/, free and unkeyed.

    python tools/fetch-footage.py [--force] [--dry] [--only N] [--seed K]

One image per beat whose module puts a picture on screen, named beat-N.jpg, plus
a manifest at video/src/footage.json that crime/elements.tsx reads. Idempotent: a
beat whose image is on disk is skipped, so re-running after a script edit only
fetches what changed.

Source is pollinations.ai — no API key, no signup, no meaningful rate limit. It
replaced Pexels here because stock has no 1974 Wichita and no 2005 floppy disk on
a desk, and because a key nobody has is a pipeline that never runs.

The prompt is the storyboard the author already wrote. VISUAL lines are written
for a human ("Camera pushes closer. Music cuts."), so direction is stripped and
what is left is what is actually in the frame.

Nothing generated here is case material. STYLE_LOCK forbids faces and forbids
anything that reads as evidence, and the engine tags every one of these frames
illustrative — but generation is not deterministic, so the batch still gets
looked at. Re-roll a bad one with:  --only 7 --force --seed 91
"""

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from vox_prompts import PROMPTS as CURATED

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "video/src/script.json"
OUT = ROOT / "video/public/footage"
MANIFEST = ROOT / "video/src/footage.json"

API = "https://image.pollinations.ai/prompt/{}"
MODEL = "flux"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
WORKERS = 3
TIMEOUT = 180  # generation, not download: a cold queue can sit for a minute
BACKOFF = 8  # seconds to wait after a 429/500 before the retry round

# The Vox master image style suffix, appended to every prompt. The first two
# clauses are the legal line: no real person's face, nothing that reads as
# evidence. Then the world-class editorial documentary system: archival
# photography and crisp cutouts on flat geometric information graphics, the
# 70/20/10 palette (off-white paper / charcoal / one accent), magazine-grid
# composition with one hero and reserved negative space. The engine draws its
# own type, so the "no text" clause stays; the negative constraints forbid the
# generic-AI tells.
STYLE_LOCK = (
    "no faces, no people identifiable as real persons, illustrative not evidence, "
    "elite contemporary editorial documentary visual journalism, investigative explainer art direction, "
    "archival photography and crisp photographic cutouts combined with bold flat geometric information graphics, "
    "warm off-white paper and charcoal foundation, restrained mustard yellow, warm red and deep blue accents, "
    "clean magazine-grid composition, strong hierarchy, generous negative space, subtle archival print texture, "
    "intentional composition for motion graphics animation, flat frontal editorial perspective, "
    "ultra detailed, 16:9, "
    "no text, no lettering, no captions, no labels, no logos, no watermark, "
    "no generic AI art, no cinematic movie still, no Hollywood lighting, no glossy 3D, no cartoon, no anime, "
    "no scrapbook aesthetic, no random arrows, no fake charts, no decorative clutter, no gradients"
)

# Modules that stage a photograph behind (or as) the frame. The scam engine's
# chat/transfer beats own their imagery — chat-mockup.py and transfer-mockup.py
# draw it — but they stay in the list so a beat with no mockup yet still counts
# as an image beat and `prompt()` can fall back to a generic photo instead of
# leaving a bare page. A scam `footage` beat (the image_prompt row) is a
# photograph by construction.
WANTS = {
    "caseOpen",
    "cctv",
    "statement",
    "archival",
    "headline",
    "person",
    "clock",
    "status",
    "footage",
    "chat",
    "transfer",
}

# A second frame of the same beat, seeded differently, so the scene can crossfade
# between two collages mid-beat — the image changes every few seconds, which is
# the pace a professional explainer holds. Seed offset must not collide with the
# retry offset (attempt * 1000) or with the --seed re-roll space.
VARIANTS = 2
VARIANT_SEED = 5000

# The mockup tools render these themselves; a generated photo is only the
# fallback when the mockup is missing, so it never counts toward the imagery
# budget the manifest reports.
MOCKUP_OWNED = {"chat", "transfer"}

# A storyboard sentence about the edit, the sound, the layout or the on-screen
# type is not a thing in the frame. These are the words that mark one.
DIRECTION = re.compile(
    r"\b(camera|cuts?|music|sfx|audio|beat|hold|frame|shot|zoom|push(es)?|pull(s)?|"
    r"pan(s)?|silence|hum|drone|types?|title|caption|text|screen|split|left|right|"
    r"cent(er|re)|graphic|card|enters?|slams?|appears?|surfaces?|large|small|"
    r"visuali[sz]ation|diagram|overlay|vs\.?)\b",
    re.I,
)

# Words that would make an image model draw the crime rather than the room it
# happened in. PART 8 of the plan is a hard rule, and STYLE_LOCK asking nicely
# at the end of a prompt is not the place to enforce it — the words never go.
CHARGED = re.compile(
    r"\b(kill\w*|murder\w*|strangl\w*|rape\w*|stab\w*|shot|shoot\w*|victims?|"
    r"bod(y|ies)|corpse|blood\w*|child\w*|kids?|girls?|boys?|famil(y|ies))\b",
    re.I,
)


def prompt(beat: dict) -> str | None:
    """What is in this frame, as something a diffusion model can safely draw.

    None when the storyboard was all direction and nothing survives — better a
    beat with no picture than a picture the engine had to invent the subject of.

    A beat with a curated prompt in vox-prompts.py uses it as-is. Those prompts
    are art-directed (left/right/scale/negative-space are intentional there),
    so only the CHARGED safety net applies. Beats without a curated prompt fall
    back to the storyboard, which still gets the direction strip.
    """
    if beat["n"] in CURATED:
        base = CURATED[beat["n"]]
        # Defensive net only: the curated prompts are hand-checked, but the
        # charge words never go through even by accident.
        words = [
            w for w in re.split(r"[\s,:;]+", base) if not CHARGED.search(w)
        ]
        base = " ".join(words).strip(" .:,")
        return f"{base}, {STYLE_LOCK}" if len(base) >= 12 else None

    # Bold lines are the on-screen type. They must not end up drawn into the
    # picture — the engine renders that type itself, in the right font.
    visual = re.sub(r"\*\*.+?\*\*", " ", beat.get("visual", ""))
    # Storyboards are written with typographic dashes and arrows. They mean
    # nothing to the model, and a Windows console cannot print them.
    visual = visual.replace("—", ", ").replace("–", ", ")
    visual = visual.encode("ascii", "ignore").decode()
    kept = [
        s.strip()
        for s in re.split(r"(?<=[.?!])\s+", visual)
        if s.strip() and not DIRECTION.search(s)
    ]
    base = " ".join(kept)
    # The parser's own keywords come out of the narration, so they are the least
    # trustworthy source and only get used when the storyboard left nothing.
    if len(base.strip(" .:,")) < 12:
        base = beat.get("footage", "")

    # Every real name in this story is a real person: a victim, a relative, an
    # investigator, the man convicted of it. None of them is a subject to hand
    # to an image generator. Anything the narration capitalised mid-sentence is
    # treated as one and dropped — over-removal is the safe direction.
    named = {w.lower() for w in re.findall(r"\b[A-Z][a-z]{2,}", beat.get("vo", ""))}
    words = [
        w
        for w in re.split(r"[\s,:;]+", base)
        if w.strip(".") and w.lower().strip(".") not in named and not CHARGED.search(w)
    ]
    base = " ".join(words).strip(" .:,")
    return f"{base}, {STYLE_LOCK}" if len(base) >= 12 else None


def fetch(text: str, portrait: bool, seed: int) -> bytes:
    w, h = (1080, 1920) if portrait else (1920, 1080)
    url = API.format(urllib.parse.quote(text, safe="")) + (
        f"?width={w}&height={h}&seed={seed}&model={MODEL}&nologo=true"
    )
    # Pollinations sits behind a filter that 403s urllib's default User-Agent.
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
        data = res.read()
    # Pollinations answers a failed generation with a page, not an image. Writing
    # that to beat-7.jpg gives you a broken frame at render time and no clue why.
    if not data.startswith(b"\xff\xd8") or len(data) < 4096:
        raise ValueError(f"not a jpeg ({len(data)} bytes)")
    return data


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-generate images that exist")
    ap.add_argument("--dry", action="store_true", help="print the prompts, fetch nothing")
    ap.add_argument("--only", type=int, action="append", help="just this beat (repeatable)")
    ap.add_argument("--seed", type=int, default=0, help="offset every seed, to re-roll")
    args = ap.parse_args()

    script = json.loads(SCRIPT.read_text(encoding="utf8"))
    # Any beat whose author wrote an image_prompt row gets a collage — even the
    # chat/transfer beats, which layer their mockup over the image. A module in
    # WANTS with no footage field (crime-engine legacy) still fetches its
    # generic b-roll. Mockup-owned modules fetch nothing of their own, but the
    # chat/transfer beats here all carry a footage field, so the mockup-owned
    # gate only keeps beats that never asked for an image.
    beats = [
        b
        for b in script["beats"]
        if b.get("footage") or (b.get("module") in WANTS and b.get("module") not in MOCKUP_OWNED)
    ]
    if args.only:
        beats = [b for b in beats if b["n"] in set(args.only)]
    OUT.mkdir(parents=True, exist_ok=True)

    jobs = []
    for beat in beats:
        text = prompt(beat)
        if args.dry:
            print(f"  beat {beat['n']:>3}  {text[:100] if text else '(no subject - stays on film)'}")
            continue
        if text is None:
            continue
        for v in range(VARIANTS):
            dest = OUT / (f"beat-{beat['n']}.jpg" if v == 0 else f"beat-{beat['n']}-{v + 1}.jpg")
            if dest.exists() and not args.force:
                print(f"  beat {beat['n']:>3}  have {dest.name}")
                continue
            # The seed is the beat number (plus a per-variant offset), so a
            # re-run reproduces the same pictures and only --seed changes them.
            # An idempotent fetch you can't reproduce is just a cache.
            jobs.append((beat, text, beat["n"] + v * VARIANT_SEED + args.seed, v))

    if not args.dry and jobs:
        print(f"generating {len(jobs)} image(s) via pollinations ({WORKERS} at a time)...")

        def one(job):
            beat, text, seed, v = job
            # Orientation comes from the composition, not from a beat flag — a
            # `track: short` beat is a beat of the short cut, not a portrait
            # frame. On a 16:9 canvas every image is 16:9.
            portrait = script["height"] > script["width"]
            # The free tier drops a request now and then, and rate-limits the
            # moment the queue breathes too fast — wait between the two attempts
            # so the retry round starts from a calm queue.
            for attempt in (0, 1):
                try:
                    return beat, v, fetch(text, portrait, seed + attempt * 1000), None
                except urllib.error.HTTPError as err:
                    if err.code in (429, 500, 503):
                        time.sleep(BACKOFF * (attempt + 1))
                    last = err
                except (urllib.error.URLError, ValueError, OSError) as err:
                    last = err
            return beat, v, None, last

        done = 0
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            for future in as_completed(pool.submit(one, j) for j in jobs):
                beat, v, data, err = future.result()
                done += 1
                if err:
                    print(f"  beat {beat['n']:>3}  FAILED: {err}", file=sys.stderr)
                    continue
                name = f"beat-{beat['n']}.jpg" if v == 0 else f"beat-{beat['n']}-{v + 1}.jpg"
                (OUT / name).write_bytes(data)
                print(f"  beat {beat['n']:>3}  {name}  ({done}/{len(jobs)})")

    # Rebuilt from disk every run over every image beat, so deleting a file is
    # how you drop a frame you did not like, and --only never truncates it.
    # The chat/transfer mockup PNGs are images on the page too, so they get the
    # same treatment — the manifest is rebuilt from disk, never from memory.
    have = {}
    for b in script["beats"]:
        for v in range(VARIANTS):
            name = f"beat-{b['n']}.jpg" if v == 0 else f"beat-{b['n']}-{v + 1}.jpg"
            key = str(b["n"]) if v == 0 else f"{b['n']}-{v + 1}"
            if (b.get("footage") or b.get("module") in WANTS) and (OUT / name).exists():
                have[key] = f"footage/{name}"
    for mock in list(OUT.glob("chat-*.png")) + list(OUT.glob("transfer-*.png")):
        have[mock.stem] = f"footage/{mock.name}"
    if not args.dry:
        MANIFEST.write_text(json.dumps(have, indent=2) + "\n", encoding="utf8")
        total = sum(1 for b in script["beats"] if b.get("footage") or b.get("module") in WANTS)
        print(f"\n{MANIFEST.name} - {len(have)}/{total} image slots have imagery")
        print("  review video/public/footage/ before rendering: no faces, nothing evidential")


if __name__ == "__main__":
    main()
