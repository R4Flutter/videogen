"""video/public/footage/ -> video/src/footage.json. Images come from you.

    python tools/fetch-footage.py [--commons] [--dry] [--only N] [--force]

This tool does not generate images and does not call an image model. It scans
the footage folder, works out which slot each file fills, and writes the
manifest the engines read. Drop a picture in, run it, the picture is in the
video; delete a picture, run it, the beat stages without it.

The images themselves are made from `video/prompts/`:

    npm run prompts     # script.json -> one detailed prompt per image slot
    ...generate them wherever you like, save under the printed filename...
    npm run footage     # scan the folder, rebuild the manifest

Generation used to happen here, through pollinations.ai. It was removed: their
free tier now serves one small model and caps output at 576x1024 whatever you
ask for, which is an upscale on a 1080-wide card. A prompt sheet and a good
generator beats an automated pipeline into a weak one.

`--commons` is optional and off by default. It fills any *still empty* slot on a
beat with a `**Footage:**` row from Wikimedia Commons: no key, no signup, no
quota worth the name, 3000-5000px originals. It never overwrites a file you put
there. Commons is an encyclopedia rather than a stock library — excellent on
objects, places, machines and documents, useless on app screenshots and modern
UI, and for those the mockup tools (chat-mockup.py, transfer-mockup.py) draw the
interface instead of hunting for a photograph of one.

Photographs taken from Commons carry attribution into video/src/credits.json.
Most of Commons is CC-BY: that file is a licence obligation, not a nicety.

Nothing here is case material. Whatever you generate, the engine tags these
frames illustrative — so the batch still gets looked at before a render.
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

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "video/src/script.json"
OUT = ROOT / "video/public/footage"
MANIFEST = ROOT / "video/src/footage.json"
# CC-BY is most of Commons and attribution is a licence condition, not a
# courtesy. Every stock frame records who made it so the credit can be pasted
# into the video description.
CREDITS = ROOT / "video/src/credits.json"
# Written by tools/scene-prompts.mjs: which prompt, in order, becomes which
# slot. --import reads it rather than re-deriving the order.
INDEX = ROOT / "video/prompts/files.txt"

# Wikimedia asks for a descriptive agent that identifies the tool. Sending a
# browser string to their API is how a project gets blocked.
WIKI_API = "https://commons.wikimedia.org/w/api.php"
WIKI_UA = "crime-doc-pipeline/1.0 (educational documentary; local render tool)"
# Commons downloads are plain file GETs and tolerate a couple.
STOCK_WORKERS = 2
BACKOFF = 8  # seconds to wait after a 429 before the retry round
# Anything smaller is a thumbnail, and a thumbnail upscaled to a 1080-wide card
# is worse than no picture.
MIN_STOCK_PX = 1100

# Modules that stage a photograph behind (or as) the frame. The scam engine's
# chat/transfer beats own their imagery — chat-mockup.py and transfer-mockup.py
# draw it — but they stay in the list so a beat with no mockup yet still counts
# as an image slot instead of quietly going missing from the report. Must match
# WANTS in tools/scene-prompts.mjs, which writes a prompt for every slot here.
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

# Frames per beat. The collage lays each one out as its own clipping, and a beat
# that holds for eight seconds on one picture dies on screen. Must match
# VARIANTS in tools/scene-prompts.mjs, which writes the prompt for each slot.
VARIANTS = 3

# The mockup tools render these themselves; a generated photo is only the
# fallback when the mockup is missing, so it never counts toward the imagery
# budget the manifest reports.
MOCKUP_OWNED = {"chat", "transfer"}

# Words that would make an image model draw the crime rather than the room it
# happened in. PART 8 of the plan is a hard rule, and a style suffix asking nicely
# at the end of a prompt is not the place to enforce it — the words never go.
CHARGED = re.compile(
    r"\b(kill\w*|murder\w*|strangl\w*|rape\w*|stab\w*|shot|shoot\w*|victims?|"
    r"bod(y|ies)|corpse|blood\w*|child\w*|kids?|girls?|boys?|famil(y|ies))\b",
    re.I,
)


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


def adopt(folder: Path, dry: bool) -> None:
    """A batch generator's `1.png, 2.png, ...` -> `beat-2.jpg, beat-2-2.jpg, ...`.

    The order comes from prompts/files.txt rather than being recomputed
    here. That file is written by the same pass that wrote the prompts, so it is
    the only thing that actually knows which prompt produced which image — a
    second guess at the ordering is how image three ends up on beat five.
    """
    if not INDEX.exists():
        sys.exit(f"{INDEX} not found - run `npm run prompts` first")
    slots = [
        line.split()[1]
        for line in INDEX.read_text(encoding="utf8").splitlines()
        if len(line.split()) > 1
    ]
    # Sorted by the leading number, numerically: a plain sort puts 10 before 2
    # and silently shifts every image after the ninth onto the wrong beat.
    made = sorted(
        (f for f in folder.iterdir() if f.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}),
        key=lambda f: (int(m.group()) if (m := re.search(r"\d+", f.stem)) else 0, f.name),
    )
    if not made:
        sys.exit(f"no images in {folder}")
    if len(made) != len(slots):
        print(f"  {len(made)} image(s) for {len(slots)} slot(s) - pairing in order, "
              f"the shorter list wins", file=sys.stderr)

    OUT.mkdir(parents=True, exist_ok=True)
    for src, name in zip(made, slots):
        print(f"  {src.name}  ->  {name}")
        if not dry:
            # Copied, not moved: a re-import after a bad pairing needs the batch
            # folder to still be there.
            (OUT / name).write_bytes(src.read_bytes())
    print(f"{'would import' if dry else 'imported'} {min(len(made), len(slots))} image(s)\n")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--commons", action="store_true",
                    help="fill still-empty slots from Wikimedia Commons")
    ap.add_argument("--force", action="store_true",
                    help="with --commons, replace slots that already have a file")
    ap.add_argument("--dry", action="store_true", help="report only, write nothing")
    ap.add_argument("--only", type=int, action="append", help="just this beat (repeatable)")
    ap.add_argument("--import", dest="batch", metavar="DIR",
                    help="copy a batch generator's numbered output into slot names")
    args = ap.parse_args()

    if args.batch:
        adopt(Path(args.batch), args.dry)

    script = json.loads(SCRIPT.read_text(encoding="utf8"))
    # Every beat that puts a picture on the page. A mockup-owned beat is listed
    # too: chat-mockup.py draws its own frame, but a beat with no mockup yet
    # still counts as an image slot rather than silently going missing.
    beats = [
        b
        for b in script["beats"]
        if b.get("image_prompt")
        or b.get("footage")
        or (b.get("module") in WANTS and b.get("module") not in MOCKUP_OWNED)
    ]
    if args.only:
        beats = [b for b in beats if b["n"] in set(args.only)]
    OUT.mkdir(parents=True, exist_ok=True)

    def slot(n: int, v: int) -> str:
        return f"beat-{n}.jpg" if v == 0 else f"beat-{n}-{v + 1}.jpg"

    # What the script asked for against what is actually on disk. This is the
    # whole job now: the pipeline no longer has an opinion about where a picture
    # came from, only whether one is there.
    empty = []
    for beat in beats:
        here = [v for v in range(VARIANTS) if (OUT / slot(beat["n"], v)).exists()]
        gaps = [v for v in range(VARIANTS) if v not in here]
        mark = "ok " if not gaps else "   "
        print(f"  {mark}beat {beat['n']:>3}  {len(here)}/{VARIANTS}  {beat['module']}")
        for v in (range(VARIANTS) if args.force else gaps):
            empty.append((beat, v))

    credits = []
    # Commons is opt-in. The default run must never write an image file: an
    # author who generated a frame from video/prompts/ and dropped it in would
    # not expect a scan to replace it with a stock photograph.
    wanted = [(b, v) for b, v in empty if b.get("footage")]
    if args.commons and wanted and not args.dry:
        jobs = []
        for beat in {b["n"]: b for b, _ in wanted}.values():
            slots = [v for b, v in wanted if b["n"] == beat["n"]]
            try:
                hits = stock(beat["footage"], len(slots))
            except Exception as err:  # noqa: BLE001 - any network shape is a miss
                print(f"  beat {beat['n']:>3}  commons search failed: {err}", file=sys.stderr)
                continue
            jobs += list(zip([beat] * len(hits), slots, hits))

        if jobs:
            print(f"\nfetching {len(jobs)} photograph(s) from Wikimedia Commons...")

            def grab(job):
                beat, v, hit = job
                try:
                    return beat, v, hit, download(hit["url"]), None
                except Exception as err:  # noqa: BLE001
                    return beat, v, hit, None, err

            with ThreadPoolExecutor(max_workers=STOCK_WORKERS) as pool:
                for future in as_completed(pool.submit(grab, j) for j in jobs):
                    beat, v, hit, data, err = future.result()
                    if err:
                        print(f"  beat {beat['n']:>3}  FAILED: {err}", file=sys.stderr)
                        continue
                    name = slot(beat["n"], v)
                    (OUT / name).write_bytes(data)
                    credits.append(
                        {"file": name, **{k: hit[k] for k in ("title", "artist", "license", "source")}}
                    )
                    print(
                        f"  beat {beat['n']:>3}  {name}  {hit['px']}  "
                        f"{_say(hit['license'])}  {_say(hit['title'][:44])}"
                    )
    elif empty and not args.commons:
        print(f"\n{len(empty)} empty slot(s). Prompts for them are in video/prompts/")
        print("  (npm run prompts to regenerate it). --commons fills the ones with")
        print("  a Footage row from Wikimedia Commons instead.")

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
