"""script.json -> stills in video/public/footage/, free and unkeyed.

    python tools/fetch-footage.py [--force] [--dry] [--only N] [--seed K]

VARIANTS images per beat whose module puts a picture on screen, named
beat-N.jpg, plus a manifest at video/src/footage.json that the engines read.
Idempotent: a beat whose image is on disk is skipped, so re-running after a
script edit only fetches what changed. `--dry` prints the routing and fetches
nothing.

Two sources, and the script already says which one it wants:

  **Footage:**       a thing that exists   -> Wikimedia Commons, photographed
  **Image Prompt:**  something staged      -> pollinations.ai, generated

Commons needs no key and no signup, has no quota worth the name, and serves
3000-5000px originals. The generator is the fallback: pollinations' anonymous
tier now offers one small model and caps output at 576px, so for anything that
exists in the world a real photograph beats a generated one on every axis,
including honesty. The generator keeps the beats Commons cannot do — the
abstract ones, and the staged editorial compositions an author art-directs.

Commons is an encyclopedia, not a stock library. It is excellent on objects,
places, machines and documents, and useless on app screenshots and modern UI —
for those use the mockup tools (chat-mockup.py, transfer-mockup.py), which draw
the interface rather than hunting for a photograph of one.

Photographs carry attribution into video/src/credits.json. Most of Commons is
CC-BY: that file is a licence obligation, not a nicety.

The prompt is the storyboard the author already wrote. VISUAL lines are written
for a human ("Camera pushes closer. Music cuts."), so direction is stripped and
what is left is what is actually in the frame.

Nothing generated here is case material. STYLE/NEGATIVE forbid faces and forbid
anything that reads as evidence, and the engine tags every one of these frames
illustrative — but generation is not deterministic, so the batch still gets
looked at. Re-roll a bad one with:  --only 7 --force --seed 91
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from vox_prompts import CURATED_FOR, PROMPTS as CURATED

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "video/src/script.json"
OUT = ROOT / "video/public/footage"
MANIFEST = ROOT / "video/src/footage.json"
# CC-BY is most of Commons and attribution is a licence condition, not a
# courtesy. Every stock frame records who made it so the credit can be pasted
# into the video description.
CREDITS = ROOT / "video/src/credits.json"

API = "https://image.pollinations.ai/prompt/{}"
MODELS_API = "https://image.pollinations.ai/models"
# Resolved at run time. It used to be hardcoded to "flux", which pollinations
# retired — the service silently served whatever its default was, so the whole
# pipeline had quietly been running on a model nobody chose.
MODEL = "sana"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
# Wikimedia asks for a descriptive agent that identifies the tool. Sending a
# browser string to their API is how a project gets blocked.
WIKI_API = "https://commons.wikimedia.org/w/api.php"
WIKI_UA = "crime-doc-pipeline/1.0 (educational documentary; local render tool)"
# Generation runs one request at a time. Measured, not guessed: four concurrent
# requests returned one image anonymously and two with a token, and even two
# lanes with a token still lost a slot to 429 — which is a beat staging two
# clippings instead of three. Serial takes longer and finishes 3/3.
WORKERS = 1
# Commons downloads are plain file GETs and tolerate a couple.
STOCK_WORKERS = 2
TIMEOUT = 180  # generation, not download: a cold queue can sit for a minute
BACKOFF = 8  # seconds to wait after a 429/500 before the retry round
# Anything smaller is a thumbnail, and a thumbnail upscaled to a 1080-wide card
# is worse than no picture.
MIN_STOCK_PX = 1100

# The Vox master image style suffix, appended to every prompt. The first two
# clauses are the legal line: no real person's face, nothing that reads as
# evidence. Then the world-class editorial documentary system: archival
# photography and crisp cutouts on flat geometric information graphics, the
# 70/20/10 palette (off-white paper / charcoal / one accent), magazine-grid
# composition with one hero and reserved negative space. The engine draws its
# own type, so the "no text" clause stays; the negative constraints forbid the
# generic-AI tells.
#
# Positive only. Everything this style must NOT contain lives in NEGATIVE and is
# sent as `negative_prompt` — a diffusion model does not parse negation, so
# "no text, no lettering, no watermark" in the positive prompt is three more
# votes for text, lettering and a watermark. Roughly 40% of the old suffix was
# negations, which is most of why the results looked the way they did.
#
# Short, too. The old suffix was 877 characters of style on top of the author's
# art direction; past a couple of hundred characters the model averages the
# whole thing into mush instead of following the front of it.
STYLE = (
    "editorial documentary illustration, flat frontal perspective, "
    "warm off-white paper ground, charcoal grayscale photographic subject, "
    "one mustard yellow accent shape, magazine grid composition, "
    "generous negative space, screenprint texture, high contrast, crisp edges"
)

NEGATIVE = (
    "text, lettering, words, captions, labels, signage, logo, watermark, signature, "
    "face, portrait, crowd, cartoon, anime, 3d render, glossy, cinematic lighting, "
    "lens flare, bokeh, gradient, clutter, arrows, charts, low quality, blurry, "
    "jpeg artifacts, deformed, extra limbs"
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
    # The vox modules that put a photograph on the page. `collage` needs the
    # whole variant set, not just the first frame — it lays each one out as a
    # separate clipping.
    "doodle",
    "callout",
    "collage",
}

# A second frame of the same beat, seeded differently, so the scene can crossfade
# between two collages mid-beat — the image changes every few seconds, which is
# the pace a professional explainer holds. Seed offset must not collide with the
# retry offset (attempt * 1000) or with the --seed re-roll space.
VARIANTS = 3
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
# happened in. PART 8 of the plan is a hard rule, and a style suffix asking nicely
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

    Art direction is taken in the order it can be trusted:

      1. the beat's own `**Image Prompt:**` row, written in the script — the
         only place hand art-direction belongs, because it travels with the
         story that owns it;
      2. the curated table, but only for the one script it was written against
         (see CURATED_FOR) — keyed by beat number alone it would paint the
         previous documentary's beat 2 onto every new story's beat 2;
      3. the storyboard's own Visual/Footage rows, stripped of direction.

    1 and 2 are art-directed (left/right/scale/negative-space are intentional
    there) so only the CHARGED safety net applies to them.
    """
    curated = beat.get("image_prompt") or (
        CURATED.get(beat["n"], "") if beat.get("_curated_ok") else ""
    )
    if curated:
        base = curated
        # Defensive net only: the curated prompts are hand-checked, but the
        # charge words never go through even by accident.
        words = [
            w for w in re.split(r"[\s,:;]+", base) if not CHARGED.search(w)
        ]
        base = " ".join(words).strip(" .:,")
        return f"{base}, {STYLE}" if len(base) >= 12 else None

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
    return f"{base}, {STYLE}" if len(base) >= 12 else None


def token() -> str:
    """The pollinations API token, from the environment or a gitignored .env.

    Measured, so nobody has to wonder what it bought: it does **not** raise
    image quality. With and without it the service returns the same `sana`
    model, the same 576x1024 cap, and byte-identical output for a given seed.
    What it buys is throughput — four concurrent requests got one image
    anonymously and two with the token — which means fewer slots lost to 429
    and a beat that stages the number of clippings it asked for.

    Never inline the value here. A token in the source is a token in the git
    history, and deleting it later does not remove it from the history.
    """
    if os.environ.get("POLLINATIONS_TOKEN"):
        return os.environ["POLLINATIONS_TOKEN"]
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf8").splitlines():
            key, _, value = line.partition("=")
            if key.strip() == "POLLINATIONS_TOKEN":
                return value.strip().strip("\"'")
    return ""


def _headers() -> dict:
    """Pollinations 403s urllib's default User-Agent, so one is always sent. The
    token goes in the header rather than the query string: a `?token=` lands in
    every proxy and server log it passes through."""
    head = {"User-Agent": UA}
    if token():
        head["Authorization"] = f"Bearer {token()}"
    return head


def pick_model() -> str:
    """Whatever the service actually serves today, preferring the strongest.

    Hardcoding a model name is how this pipeline spent months asking for `flux`
    after it was retired and silently getting the house default instead.
    """
    try:
        req = urllib.request.Request(MODELS_API, headers=_headers())
        with urllib.request.urlopen(req, timeout=30) as res:
            available = json.loads(res.read())
        names = [m["name"] if isinstance(m, dict) else m for m in available]
    except Exception:
        return MODEL
    for want in ("flux", "flux-dev", "turbo", "seedream", "sana"):
        if want in names:
            return want
    return names[0] if names else MODEL


def fetch(text: str, portrait: bool, seed: int, model: str) -> bytes:
    w, h = (1080, 1920) if portrait else (1920, 1080)
    query = {
        "width": w,
        "height": h,
        "seed": seed,
        "model": model,
        "nologo": "true",
        # The place negation belongs. In the positive prompt "no text" is a vote
        # for text; here it is subtracted.
        "negative_prompt": NEGATIVE,
    }
    url = API.format(urllib.parse.quote(text, safe="")) + "?" + urllib.parse.urlencode(query)
    req = urllib.request.Request(url, headers=_headers())
    with urllib.request.urlopen(req, timeout=TIMEOUT) as res:
        data = res.read()
    # Pollinations answers a failed generation with a page, not an image. Writing
    # that to beat-7.jpg gives you a broken frame at render time and no clue why.
    if not data.startswith(b"\xff\xd8") or len(data) < 4096:
        raise ValueError(f"not a jpeg ({len(data)} bytes)")
    return data


# ---------------------------------------------------------------- stock
# Wikimedia Commons: no key, no signup, no quota worth the name, and originals
# in the 3000-5000px range. The generator is a weak free model capped at 576px
# on the anonymous tier, so for anything that exists in the world — an ATM, a
# server rack, a fence, a phone in a hand — a real photograph beats a generated
# one on every axis that matters, including honesty.
#
# It is bad at abstractions. "Trust", "a funnel of victims" and "1974 Wichita"
# return an unrelated photograph with total confidence, which is why the
# generator stays for beats that art-direct themselves with an Image Prompt.
STOPWORDS = {
    "a", "an", "the", "of", "in", "on", "at", "to", "and", "or", "with", "for",
    "from", "by", "as", "is", "are", "its", "it", "one", "two", "into", "over",
}

# Words that describe the photograph rather than its subject. They stay in the
# query — Commons indexes them — but they cannot be what makes a result count as
# a match, or "bank statement paper closeup" matches a closeup of dogwood.
GENERIC = {
    "closeup", "close", "view", "shot", "photo", "photograph", "image", "picture",
    "angle", "detail", "macro", "background", "foreground", "scene", "looking",
}


def _stem(word: str) -> str:
    """Enough morphology to match "ATMs" to "atm" and "containers" to
    "container". A real stemmer is a dependency for two characters of value."""
    return word[:-1] if len(word) > 3 and word.endswith("s") else word


def _plain(html: str) -> str:
    """Commons returns the artist as an <a> tag more often than as a name."""
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html or "")).strip()


def _say(text: str) -> str:
    """Console-safe. Commons titles are worldwide — "ATM on Nádražní street" —
    and a Windows console is cp1252, so printing the title verbatim raises
    UnicodeEncodeError *after* the image downloaded and lost the whole run.
    The file on disk and credits.json keep the real characters."""
    return text.encode("ascii", "replace").decode()


def stock(terms: str, want: int) -> list[dict]:
    """Up to `want` Commons photographs for a Footage row, best first.

    A Footage row is written for a human — "phone screen grid of short videos,
    finger tapping" — and Commons' search treats every one of those words as a
    requirement, so the whole phrase matches nothing. It is really two subjects
    separated by a comma, so each clause is searched on its own and the results
    are pooled; a clause that finds nothing is retried on its most distinctive
    two words alone.
    """
    found: dict[str, dict] = {}
    for clause in [c.strip() for c in terms.split(",") if c.strip()] or [terms]:
        # The bar is set by what the author actually asked for, once. Deriving it
        # from the relaxed query instead lowered it as the query got shorter, so
        # the fallback pass for "call centre desks headsets" searched two words
        # and then accepted anything with "headset" in the name — which is how a
        # scam explainer ends up illustrated with an Apple Vision Pro.
        subject = _subject(clause)
        for attempt in (clause, _core(clause)):
            if not attempt:
                continue
            for hit in _search(attempt, want, subject):
                found.setdefault(hit["title"], hit)
            if len(found) >= want:
                return list(found.values())[:want]
    return list(found.values())[:want]


def _subject(terms: str) -> tuple[set[str], int]:
    """The words a result's title must share, and how many of them it takes.

    One shared word is coincidence when the query is specific — "night" alone
    matched a town hall for "atm machine night street". Two is a subject.
    """
    words = {
        _stem(w)
        for w in re.findall(r"[a-z]{3,}", terms.lower())
        if w not in STOPWORDS and w not in GENERIC
    }
    return words, (2 if len(words) >= 3 else 1)


def _core(clause: str) -> str:
    """The two longest content words. Commons indexes filenames and captions, so
    a short, concrete query outperforms a descriptive one every time."""
    words = [w for w in re.findall(r"[a-z]{3,}", clause.lower()) if w not in STOPWORDS]
    return " ".join(sorted(words, key=len, reverse=True)[:2])


def _search(terms: str, want: int, subject: tuple[set[str], int]) -> list[dict]:
    """One Commons query, filtered two ways because Commons always returns
    *something*: a resolution floor, and a requirement that the file's own title
    name the subject. Without the second, a search for "call centre office"
    confidently returns a 1928 labour demonstration."""
    want_words, need = subject
    query = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f"filetype:bitmap {terms}",
        "gsrlimit": max(want * 5, 15),
        "gsrnamespace": 6,
        "prop": "imageinfo",
        "iiprop": "url|size|extmetadata",
        "iiurlwidth": 1920,
        "format": "json",
    }
    req = urllib.request.Request(
        f"{WIKI_API}?{urllib.parse.urlencode(query)}", headers={"User-Agent": WIKI_UA}
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            data = json.loads(res.read())
    except urllib.error.HTTPError as err:
        # Commons throttles a burst of searches. A relaxation pass is worth one
        # wait; a beat is not worth stalling the whole run over.
        if err.code != 429:
            raise
        time.sleep(BACKOFF)
        with urllib.request.urlopen(req, timeout=60) as res:
            data = json.loads(res.read())
    finally:
        # Four queries a beat across a dozen beats is a burst by their reckoning.
        time.sleep(0.4)

    out = []
    for page in (data.get("query", {}).get("pages") or {}).values():
        info = (page.get("imageinfo") or [{}])[0]
        title = page.get("title", "")[5:]  # drop the "File:" prefix
        if min(info.get("width", 0), info.get("height", 0)) < MIN_STOCK_PX:
            continue
        # The filename has to actually name the subject. This is the difference
        # between a photograph of the thing and a photograph of something else
        # entirely, and Commons will hand you the second one without hesitating.
        have_words = {_stem(w) for w in re.findall(r"[a-z]{3,}", title.lower())}
        if want_words and len(want_words & have_words) < need:
            continue
        if CHARGED.search(title):
            continue
        meta = info.get("extmetadata", {})
        out.append(
            {
                "url": info.get("thumburl") or info.get("url"),
                "title": title,
                "artist": _plain(meta.get("Artist", {}).get("value", "")) or "unknown",
                "license": meta.get("LicenseShortName", {}).get("value", "") or "see source",
                "source": info.get("descriptionurl", ""),
                "px": f"{info.get('width')}x{info.get('height')}",
            }
        )
        if len(out) >= want:
            break
    return out


def download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": WIKI_UA})
    for attempt in (0, 1, 2):
        try:
            with urllib.request.urlopen(req, timeout=120) as res:
                data = res.read()
            if len(data) < 4096:
                raise ValueError(f"truncated download ({len(data)} bytes)")
            return data
        except urllib.error.HTTPError as err:
            # upload.wikimedia.org throttles a burst the same way the API does,
            # and a 429 on the third variant left the beat one clipping short.
            if err.code not in (429, 503) or attempt == 2:
                raise
            time.sleep(BACKOFF * (attempt + 1))
    raise RuntimeError("unreachable")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-generate images that exist")
    ap.add_argument("--dry", action="store_true", help="print the prompts, fetch nothing")
    ap.add_argument("--only", type=int, action="append", help="just this beat (repeatable)")
    ap.add_argument("--seed", type=int, default=0, help="offset every seed, to re-roll")
    args = ap.parse_args()

    script = json.loads(SCRIPT.read_text(encoding="utf8"))
    # The curated table is one story's art direction, keyed by that story's beat
    # numbers. Applying it to a different script is not a fallback, it is the
    # wrong picture with no error — so it only unlocks for the script it was
    # written against. Every other story art-directs in its own `**Image
    # Prompt:**` rows, or gets a prompt built from its storyboard.
    curated_ok = Path(script.get("source", "")).name == CURATED_FOR
    if not curated_ok and CURATED:
        print(f"curated prompts are for {CURATED_FOR}; this is "
              f"{Path(script.get('source', '?')).name} - using each beat's own art direction")
    # Any beat whose author wrote an image_prompt row gets a collage — even the
    # chat/transfer beats, which layer their mockup over the image. A module in
    # WANTS with no footage field (crime-engine legacy) still fetches its
    # generic b-roll. Mockup-owned modules fetch nothing of their own, but the
    # chat/transfer beats here all carry a footage field, so the mockup-owned
    # gate only keeps beats that never asked for an image.
    beats = [
        b
        for b in script["beats"]
        if b.get("image_prompt")
        or b.get("footage")
        or (b.get("module") in WANTS and b.get("module") not in MOCKUP_OWNED)
    ]
    for b in beats:
        b["_curated_ok"] = curated_ok
    if args.only:
        beats = [b for b in beats if b["n"] in set(args.only)]
    OUT.mkdir(parents=True, exist_ok=True)

    def slot(n: int, v: int) -> str:
        return f"beat-{n}.jpg" if v == 0 else f"beat-{n}-{v + 1}.jpg"

    # Which source a beat gets. The split is the one the script already makes:
    # `**Footage:**` names a thing that exists, so photograph it; `**Image
    # Prompt:**` is art direction for something staged, so draw it. An author
    # picks by choosing which row to write, and never has to know a model name.
    stock_jobs, draw_jobs, credits = [], [], []
    for beat in beats:
        text = prompt(beat)
        use_stock = bool(beat.get("footage")) and not (
            beat.get("image_prompt") or (beat.get("_curated_ok") and beat["n"] in CURATED)
        )
        if args.dry:
            how = f"stock: {beat['footage']}" if use_stock else (text[:90] if text else "(no subject)")
            print(f"  beat {beat['n']:>3}  [{'commons' if use_stock else 'generate'}] {how}")
            continue

        missing = [v for v in range(VARIANTS) if args.force or not (OUT / slot(beat["n"], v)).exists()]
        for v in set(range(VARIANTS)) - set(missing):
            print(f"  beat {beat['n']:>3}  have {slot(beat['n'], v)}")
        if not missing:
            continue

        if use_stock:
            try:
                hits = stock(beat["footage"], len(missing))
            except Exception as err:  # noqa: BLE001 - any network shape means fall back
                print(f"  beat {beat['n']:>3}  commons search failed ({err}); generating", file=sys.stderr)
                hits = []
            for v, hit in zip(missing, hits):
                stock_jobs.append((beat, v, hit))
            # Commons ran out of usable matches — the rest of the slots are drawn
            # rather than left empty.
            missing = missing[len(hits):]
            if hits:
                continue
        if text is None:
            continue
        for v in missing:
            # The seed is the beat number (plus a per-variant offset), so a
            # re-run reproduces the same pictures and only --seed changes them.
            # An idempotent fetch you can't reproduce is just a cache.
            draw_jobs.append((beat, v, text, beat["n"] + v * VARIANT_SEED + args.seed))

    if not args.dry and stock_jobs:
        print(f"\nfetching {len(stock_jobs)} photograph(s) from Wikimedia Commons...")

        def grab(job):
            beat, v, hit = job
            try:
                return beat, v, hit, download(hit["url"]), None
            except Exception as err:  # noqa: BLE001
                return beat, v, hit, None, err

        with ThreadPoolExecutor(max_workers=STOCK_WORKERS) as pool:
            for future in as_completed(pool.submit(grab, j) for j in stock_jobs):
                beat, v, hit, data, err = future.result()
                if err:
                    print(f"  beat {beat['n']:>3}  FAILED: {err}", file=sys.stderr)
                    continue
                name = slot(beat["n"], v)
                (OUT / name).write_bytes(data)
                credits.append({"file": name, **{k: hit[k] for k in ("title", "artist", "license", "source")}})
                print(
                    f"  beat {beat['n']:>3}  {name}  {hit['px']}  "
                    f"{_say(hit['license'])}  {_say(hit['title'][:44])}"
                )

    if not args.dry and draw_jobs:
        model = pick_model()
        print(
            f"\ngenerating {len(draw_jobs)} image(s) via pollinations "
            f"({model}, one at a time, {'token' if token() else 'anonymous'})..."
        )

        def one(job):
            beat, v, text, seed = job
            # Orientation comes from the composition, not from a beat flag — a
            # `track: short` beat is a beat of the short cut, not a portrait
            # frame. On a 16:9 canvas every image is 16:9.
            portrait = script["height"] > script["width"]
            # The free tier drops a request now and then, and rate-limits the
            # moment the queue breathes too fast — wait between the two attempts
            # so the retry round starts from a calm queue.
            for attempt in (0, 1, 2):
                try:
                    return beat, v, fetch(text, portrait, seed + attempt * 1000, model), None
                except urllib.error.HTTPError as err:
                    if err.code in (429, 500, 503):
                        time.sleep(BACKOFF * (attempt + 1))
                    last = err
                except (urllib.error.URLError, ValueError, OSError) as err:
                    last = err
            return beat, v, None, last

        done = 0
        with ThreadPoolExecutor(max_workers=WORKERS) as pool:
            for future in as_completed(pool.submit(one, j) for j in draw_jobs):
                beat, v, data, err = future.result()
                done += 1
                if err:
                    print(f"  beat {beat['n']:>3}  FAILED: {err}", file=sys.stderr)
                    continue
                name = slot(beat["n"], v)
                (OUT / name).write_bytes(data)
                print(f"  beat {beat['n']:>3}  {name}  ({done}/{len(draw_jobs)})")

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
        # Slots, not beats: every image beat asks for VARIANTS frames, so
        # counting beats reported "2/1 slots have imagery" and read as a bug.
        wanted = sum(
            1
            for b in script["beats"]
            if b.get("image_prompt") or b.get("footage") or b.get("module") in WANTS
        )
        print(f"\n{MANIFEST.name} - {len(have)}/{wanted * VARIANTS} image slots have imagery")

        # Attribution, merged rather than rewritten: --only 7 must not drop the
        # credit for beat 3. Keyed by filename, so re-fetching a slot replaces
        # exactly that credit and a deleted image drops out on the next run.
        if credits:
            prior = {}
            if CREDITS.exists():
                try:
                    prior = {c["file"]: c for c in json.loads(CREDITS.read_text(encoding="utf8"))}
                except (ValueError, KeyError):
                    prior = {}
            prior.update({c["file"]: c for c in credits})
            live = [c for f, c in sorted(prior.items()) if (OUT / f).exists()]
            CREDITS.write_text(json.dumps(live, indent=2) + "\n", encoding="utf8")
            print(f"{CREDITS.name} - {len(live)} photograph(s) to credit. Most of Commons is")
            print("  CC-BY: paste these into the video description before publishing.")

        print("  review video/public/footage/ before rendering: no faces, nothing evidential")


if __name__ == "__main__":
    main()
