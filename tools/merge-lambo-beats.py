"""Merge the parallel beats-5,6,7 renders into the main lambo run.

Run AFTER both lambo-voice.py processes have exited (or just the main one,
when the parallel beats came from lambo-voice-edge.py):

    .venv-tts/Scripts/python tools/merge-lambo-beats.py

- copies beat-5/6/7.wav from the isolated temp out into the real out dir
  (skipped when the beats were written by lambo-voice-edge.py directly)
- merges lambo-voice-plan.json (detailed edge/parallel entries win for 5,6,7)
- unions lambo-take-cache.json (seeds from both runs kept)
"""
import json
import shutil
from pathlib import Path

ROOT = Path(r"C:\Users\naikr\videogen")
REAL = ROOT / "video/public/audio/lambo"
TEMP = Path(r"C:\Users\naikr\AppData\Local\Temp\opencode\lambo-vo-5-7")
EDGE = REAL / "lambo-voice-plan.edge.json"
BEATS = {5, 6, 7}

def load(p: Path) -> dict | list:
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding="utf8"))

copied = 0
for n in BEATS:
    src = TEMP / f"beat-{n}.wav"
    if src.exists():
        shutil.copy2(src, REAL / f"beat-{n}.wav")
        copied += 1
        print(f"beat-{n}.wav <- parallel run")
if copied == 0:
    print("no parallel wavs — beats 5/6/7 came from lambo-voice-edge.py")

real_plan = load(REAL / "lambo-voice-plan.json")
edge_plan = load(EDGE)
if isinstance(real_plan, list) and isinstance(edge_plan, list):
    merged = {p["n"]: p for p in real_plan}
    for p in edge_plan:
        merged[p["n"]] = p
    (REAL / "lambo-voice-plan.json").write_text(
        json.dumps([merged[k] for k in sorted(merged)], indent=2, ensure_ascii=False), encoding="utf8")
    print(f"voice-plan.json merged ({len(merged)} beats; edge entries win for {sorted(BEATS)})")
    EDGE.unlink(missing_ok=True)
else:
    print("plan merge skipped (edge plan missing)")

real_cache = load(REAL / "lambo-take-cache.json")
temp_cache = load(TEMP / "lambo-take-cache.json")
if isinstance(real_cache, dict) and isinstance(temp_cache, dict):
    real_cache.update(temp_cache)
    (REAL / "lambo-take-cache.json").write_text(
        json.dumps(real_cache, indent=2, ensure_ascii=False), encoding="utf8")
    print(f"take-cache.json unioned ({len(real_cache)} keys)")

print("done — next: python tools/align.py")