"""script.json + voice.json -> a Vox-style picture under every 3-5s of narration.

    python tools/fetch-imagebed.py [--force] [--dry] [--slot 4.2] [--seed K] [--only N]

fetch-footage.py gives a beat that asked for a picture one picture. This gives
*every* beat a picture, and changes it on the clause, so a nine-second beat is
three images instead of one headline held for nine seconds. Output is
video/public/img/bed-<beat>-<slot>.jpg plus a timeline manifest at
video/src/imagebed.json that <ImageBed> in scam/elements.tsx reads.

The subject of each image is the narration actually spoken over it, so the bed
tracks the read instead of the storyboard. Idempotent: an image on disk is
skipped, so re-running after a script edit only fetches what moved.

Source is pollinations.ai — no key, no signup. Same as fetch-footage.py.
"""

import argparse
import json
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "video/src/script.json"
VOICE = ROOT / "video/src/voice.json"
OUT = ROOT / "video/public/img"
MANIFEST = ROOT / "video/src/imagebed.json"

API = "https://image.pollinations.ai/prompt/{}"
MODEL = "flux"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
# The free tier throttles by IP, not by key. Five in flight gets the whole batch
# 429'd and then the resolver starts failing; two with a gap between them walks
# through ninety images without a single retry. Slow and finished beats fast and
# empty — and every image is cached on disk, so this only ever runs once.
WORKERS = 2
PACE = 1.5  # seconds between request starts, across all workers
TIMEOUT = 180  # generation, not download: a cold queue can sit for a minute
SLOT = 4.2  # target seconds per image; the beat divides evenly into whole slots

# Appended to every prompt. A hundred images only read as one film if the style
# line never varies, and this one is tuned to the scam palette in theme.ts —
# cream paper, ink black, one burnt orange — so the bed sits under the page
# type instead of fighting it. No faces: nothing here is a real person.
BED_STYLE = (
    "editorial explainer illustration in the style of a Vox video, "
    "flat vector shapes with halftone grain, cream paper background, "
    "deep ink black linework, single burnt orange accent color, "
    "bold simple composition, generous negative space, "
    "no faces, no recognizable people, no text, no lettering, no logos, no watermark"
)

# Words that describe the edit rather than the frame. Narration rarely has
# them, but a beat that quotes its own storyboard shouldn't draw a caption.
DIRECTION = re.compile(r"\b(camera|cuts?|zoom|caption|on-screen|title card)\b", re.I)


def proper_names(vo: str) -> set[str]:
    """Capitalised words that aren't sentence-initial — treated as real people.

    Over-removal is the safe direction: losing "Ohio" from a prompt costs a
    detail, keeping a victim's surname hands it to an image generator.
    """
    out: set[str] = set()
    for sentence in re.split(r"(?<=[.?!])\s+", vo):
        for token in sentence.split()[1:]:
            word = token.strip(".\"',;:!?()")
            if len(word) > 2 and word[0].isupper() and not word.isupper():
                out.add(word.lower())
    return out


def prompt(clause: str, headline: str, named: set[str]) -> str | None:
    """The spoken clause, cleaned into something a diffusion model can draw."""
    clause = clause.replace("—", ", ").replace("–", ", ")
    clause = clause.encode("ascii", "ignore").decode()
    words = [
        w
        for w in clause.split()
        if w.strip(".\"',;:!?").lower() not in named and not DIRECTION.search(w)
    ]
    base = " ".join(words).strip(" .:,\"'")
    # A slot of "and every one of those" is four words of nothing. The beat's
    # on-screen headline is the concrete thing the beat is about, so it carries
    # the frame when the clause underneath it is connective tissue.
    if len(base) < 24 and headline:
        base = f"{headline.lower()}, {base}".strip(" ,")
    if len(base) < 12:
        return None
    return f"{base[:220]}, {BED_STYLE}"


def slots(start: float, end: float, target: float) -> list[tuple[float, float]]:
    """Split a beat into whole slots of roughly `target` seconds, never fewer
    than one. Even division keeps the cut on the beat, so an image never
    changes one frame before a page turn."""
    n = max(1, round((end - start) / target))
    step = (end - start) / n
    return [(start + i * step, start + (i + 1) * step) for i in range(n)]


_gate = threading.Lock()
_next = 0.0


def _wait_turn() -> None:
    """Hold every worker to one request start per PACE seconds."""
    global _next
    with _gate:
        delay = max(0.0, _next - time.monotonic())
        _next = time.monotonic() + delay + PACE
    if delay:
        time.sleep(delay)


def fetch(text: str, w: int, h: int, seed: int) -> bytes:
    _wait_turn()
    url = API.format(urllib.parse.quote(text, safe="")) + (
        f"?width={w}&height={h}&seed={seed}&model={MODEL}&nologo=true"
    )
    # Pollinations sits behind a filter that 403s urllib's default User-Agent.
    # Without this header every request in the batch fails identically.
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
        data = res.read()
    # Pollinations answers a failed generation with an HTML page, not an image.
    # Writing that to a .jpg gives a broken frame at render time and no clue why.
    if not data.startswith(b"\xff\xd8") or len(data) < 4096:
        raise ValueError(f"not a jpeg ({len(data)} bytes)")
    return data


def plan(script: dict, voice: dict, target: float) -> list[dict]:
    """The whole bed: one entry per slot, with the words spoken over it."""
    takes = {b["n"]: b for b in voice.get("beats", [])}
    out: list[dict] = []
    for beat in script["beats"]:
        named = proper_names(beat.get("vo", ""))
        words = takes.get(beat["n"], {}).get("words", [])
        for i, (a, b) in enumerate(slots(beat["start"], beat["end"], target), 1):
            # Word times in voice.json are relative to the beat's own start.
            said = " ".join(
                w["w"]
                for w in words
                if a <= beat["start"] + (w["start"] + w["end"]) / 2 < b
            )
            text = prompt(said or beat.get("vo", ""), beat.get("text", ""), named)
            if text is None:
                continue
            out.append(
                {
                    "n": beat["n"],
                    "slot": i,
                    "start": round(a, 3),
                    "end": round(b, 3),
                    "file": f"img/bed-{beat['n']}-{i}.jpg",
                    "prompt": text,
                }
            )
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-generate images that exist")
    ap.add_argument("--dry", action="store_true", help="print the plan, fetch nothing")
    ap.add_argument("--only", type=int, action="append", help="just this beat (repeatable)")
    ap.add_argument("--slot", type=float, default=SLOT, help="target seconds per image")
    ap.add_argument("--seed", type=int, default=0, help="offset every seed, to re-roll")
    args = ap.parse_args()

    script = json.loads(SCRIPT.read_text(encoding="utf8"))
    voice = json.loads(VOICE.read_text(encoding="utf8")) if VOICE.exists() else {}
    w, h = (1920, 1080) if script["width"] >= script["height"] else (1080, 1920)

    shots = plan(script, voice, args.slot)
    if args.only:
        shots = [s for s in shots if s["n"] in set(args.only)]
    OUT.mkdir(parents=True, exist_ok=True)

    if args.dry:
        for s in shots:
            print(f"  {s['start']:>7.2f}s  {s['file']:<22}  {s['prompt'][:88]}")
        print(f"\n{len(shots)} images, {args.slot}s apart")
        return

    jobs = [s for s in shots if args.force or not (ROOT / "video/public" / s["file"]).exists()]
    if jobs:
        print(f"generating {len(jobs)} image(s) via pollinations ({WORKERS} at a time)...")

        def one(shot):
            # Seed off the slot so a re-run reproduces the same picture and only
            # --seed changes it. An idempotent fetch you can't reproduce is a cache.
            seed = shot["n"] * 100 + shot["slot"] + args.seed
            last: Exception | None = None
            for attempt in range(4):  # the free tier drops requests under load
                try:
                    return shot, fetch(shot["prompt"], w, h, seed), None
                except (urllib.error.URLError, ValueError, OSError) as err:
                    last = err
                    time.sleep(10 * (attempt + 1))
            return shot, None, last

        done = 0
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            for future in as_completed(pool.submit(one, j) for j in jobs):
                shot, data, err = future.result()
                done += 1
                if err:
                    print(f"  {shot['file']}  FAILED: {err}", file=sys.stderr)
                    continue
                (ROOT / "video/public" / shot["file"]).write_bytes(data)
                print(f"  {shot['file']}  ({done}/{len(jobs)})")

    # Rebuilt from disk, so deleting an image is how you drop it from the bed,
    # and --only never truncates the manifest. A dropped slot leaves paper.
    have = [
        {k: s[k] for k in ("start", "end", "file")}
        for s in plan(script, voice, args.slot)
        if (ROOT / "video/public" / s["file"]).exists()
    ]
    MANIFEST.write_text(json.dumps(have, indent=1) + "\n", encoding="utf8")
    print(f"\n{MANIFEST.name} - {len(have)} images across {script['durationInSeconds']:.0f}s")


if __name__ == "__main__":
    main()
