"""Insert Vox editorial-collage image_prompt rows into story.txt AND patch
script.json in place (module -> footage + footage field) without re-parsing,
so the real aligned voice timings survive. Kept in tools/ so a future
`npm run story` reproduces the same script.json from story.txt alone.

    python tools/add-images.py
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STORY = ROOT / "story.txt"
SCRIPT = ROOT / "video/src/script.json"

# beat n -> editorial collage prompt (art-directed per beat, Vox style system).
# No faces, no real names, no banned direction words, nothing that reads as
# evidence. The fetch tool appends the STYLE_LOCK collage tail.
PROMPTS = {
    2: "editorial collage of a suburban front door ajar with a doorbell camera, a torn envelope of folded cash on the doorstep, a paper house silhouette",
    3: "cut-paper collage of an open front doorway with a hand passing folded cash, torn paper edges, a clock",
    4: "editorial collage of two interlocking paper gears, a telephone receiver and a banknote joined by arrows",
    5: "cut-paper collage of a long row of office desks with telephone headsets, a whiteboard, a torn world map fragment",
    6: "editorial collage of a paper assembly line: a script page, a telephone and a banknote linked by arrows along a dotted conveyor",
    7: "cut-paper collage of a dense grid of dots with a single orange-red dot standing out, a magnifying glass, a torn paper corner",
    8: "editorial collage of a telephone wearing a paper mask, a blank name tag, a red arrow",
    9: "cut-paper collage of a maze of arrows converging on a single banknote, a padlock, a torn receipt",
    10: "editorial collage of a dartboard with a telephone receiver as the dart, printed data lists, a map with pins",
    11: "cut-paper collage of a rotary landline telephone on a kitchen counter, a torn calendar page with a circled date, a clock",
    12: "editorial collage of a telephone receiver and paper speech bubbles, a torn envelope",
    13: "cut-paper collage of a paper speech bubble being filled in by a hand, a name tag, a telephone",
    14: "editorial collage of a judge's gavel, a telephone, a robe silhouette, a torn legal form",
    15: "cut-paper collage of a torn envelope with cash spilling out, a downward arrow, a bank receipt fragment",
    16: "editorial collage of a delivery van silhouette, a cardboard package, a dotted route map",
    17: "cut-paper collage of a paper chain of linked envelopes and banknotes, gears, arrows",
    18: "editorial collage of a duffel bag with cash, a golden coin, an arrow into a laptop",
    19: "cut-paper collage of a bank building silhouette with a warning triangle, a torn receipt, a magnifying glass",
    20: "editorial collage of a dark highway at night with light trails, a telephone with a dead battery, a server rack",
    21: "cut-paper collage of two paper machines, one shaped like a heart and one like a telephone, interlocking gears",
    22: "editorial collage of a smartphone with a question mark speech bubble, a torn envelope, a heart",
    23: "cut-paper collage of two paper speech bubbles, a telephone receiver, a heart",
    24: "editorial collage of a smartphone cutout and a rising paper bar chart, a coin",
    25: "cut-paper collage of a padlock, a torn checkmark seal, a smartphone, a shield",
    26: "editorial collage of a bank deposit slip fragment with a rising arrow, coins",
    27: "cut-paper collage of a calendar page, an envelope arriving along a dotted route, a clock",
    28: "editorial collage of a stack of torn receipts growing taller, arrows, a banknote",
    29: "cut-paper collage of a climbing paper line chart, dollar bills, a calendar fragment",
    31: "editorial collage of a towering paper bar chart built of stacked dollar bills, a globe, a folder",
    32: "cut-paper collage of three arrows crossing a world map, a clock, a chain of envelopes",
    33: "editorial collage of a telephone blueprint with measurement marks, a target reticle, a shield",
    34: "cut-paper collage of a giant paper question mark standing like a wall, a ringing telephone, paper blocks",
    35: "editorial collage of a hand pressing a telephone receiver down, a return arrow, a paper note",
    37: "cut-paper collage of a paper folder, a megaphone, a heart, an envelope with a stamp",
}

# Beats that keep their own artifact module (chat/transfer/chart mockups) but
# get a collage background behind it. Everything else with a prompt becomes a
# full-frame footage scene.
ARTIFACT = {12, 15, 16, 23, 24, 26, 28, 29}

# ---------------------------------------------------------------- story.txt
lines = STORY.read_text(encoding="utf8").splitlines(keepends=True)
out: list[str] = []
i = 0
inserted = 0
while i < len(lines):
    out.append(lines[i])
    m = re.match(r"###\s+BEAT\s+(\d+)\b", lines[i])
    if m and int(m.group(1)) in PROMPTS:
        n = int(m.group(1))
        # find the end of this beat's rows: next ###/## heading or EOF
        j = i + 1
        while j < len(lines) and not re.match(r"^#{2,3}\s", lines[j]):
            j += 1
        prompt = PROMPTS[n]
        if any("image_prompt" in l for l in lines[i:j]):
            i = j
            continue
        out.extend([f"| **image_prompt** | {prompt} |\n", "\n"])
        inserted += 1
        i = j
        continue
    i += 1
STORY.write_text("".join(out), encoding="utf8")
print(f"story.txt: inserted {inserted} image_prompt rows")

# -------------------------------------------------------------- script.json
script = json.loads(SCRIPT.read_text(encoding="utf8"))
changed = 0
for b in script["beats"]:
    if b["n"] not in PROMPTS:
        continue
    if b.get("footage") == PROMPTS[b["n"]]:
        continue
    b["footage"] = PROMPTS[b["n"]]
    if b["n"] not in ARTIFACT:
        b["module"] = "footage"
    changed += 1
SCRIPT.write_text(json.dumps(script, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
print(f"script.json: patched {changed} beats (module + footage)")
