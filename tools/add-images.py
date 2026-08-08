"""Insert Vox editorial-collage image_prompt rows into story.txt AND patch
script.json in place (module -> footage + footage field) without re-parsing,
so the real aligned voice timings survive. Kept in tools/ so a future
`npm run story` reproduces the same script.json from story.txt alone.

    python tools/add-images.py
"""

import json
import re
from pathlib import Path

from vox_prompts import PROMPTS

ROOT = Path(__file__).resolve().parent.parent
STORY = ROOT / "story.txt"
SCRIPT = ROOT / "video/src/script.json"

# Beats that keep their own artifact module (chat/transfer/chart mockups) but
# get a collage background behind it. Everything else with a prompt becomes a
# full-frame footage scene.
ARTIFACT = {12, 15, 16, 23, 24, 26, 28, 29}

# ---------------------------------------------------------------- story.txt
lines = STORY.read_text(encoding="utf8").splitlines(keepends=True)
i = 0
inserted = 0
updated = 0
while i < len(lines):
    m = re.match(r"###\s+BEAT\s+(\d+)\b", lines[i])
    if m and int(m.group(1)) in PROMPTS:
        n = int(m.group(1))
        prompt = PROMPTS[n]
        # find this beat's image_prompt row (before the next heading)
        k = i + 1
        row = None
        while k < len(lines) and not re.match(r"^#{2,3}\s", lines[k]):
            if "image_prompt" in lines[k]:
                row = k
                break
            k += 1
        if row is not None:
            # a re-run rewrites the row, so an art-director pass propagates
            lines[row] = f"| **image_prompt** | {prompt} |\n"
            updated += 1
        else:
            lines.insert(i + 1, f"| **image_prompt** | {prompt} |\n")
            lines.insert(i + 2, "\n")
            inserted += 1
    i += 1
STORY.write_text("".join(lines), encoding="utf8")
print(f"story.txt: inserted {inserted} rows, updated {updated} rows")

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
