"""video/src/lambo/script.json -> per-beat wavs via edge-tts (free, no clone).

    C:/Users/naikr/yt_scrapper/.venv/Scripts/python.exe tools/lambo-voice-edge.py --redo 5,6,7

Replacement for tools/lambo-voice.py when Chatterbox/CPU is too slow: the same
per-sentence direction plan (tools/voice_direction.py) is mapped onto Edge's
dials — pace -> rate %, energy -> pitch Hz — and beats are written to
video/public/audio/lambo/beat-N.wav as 24 kHz mono (matching Chatterbox output
so align.py and the mix treat every beat alike).

The detailed plan entries go to lambo-voice-plan.edge.json next to the wavs;
tools/merge-lambo-beats.py folds them into the canonical
lambo-voice-plan.json once the Chatterbox run has exited.

    --redo 5,6,7   regenerate specific beats
    --voice NAME   edge-tts voice (default en-US-GuyNeural)
"""
import argparse
import json
import re
import subprocess
import sys
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from voice_direction import direct  # noqa: E402

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "video/src/lambo/script.json"
OUT_DIR = ROOT / "video/public/audio/lambo"
EDGE_PLAN = OUT_DIR / "lambo-voice-plan.edge.json"
SAMPLE_RATE = 24000
VOICE = "en-US-GuyNeural"

DELIVERY = {
    "caseOpen":  (0.42, 0.52, 0.45),
    "chapter":   (0.38, 0.52, 0.40),
    "clock":     (0.40, 0.55, 0.45),
    "timeline":  (0.40, 0.52, 0.32),
    "map":       (0.40, 0.52, 0.30),
    "person":    (0.38, 0.50, 0.32),
    "evidence":  (0.46, 0.50, 0.38),
    "document":  (0.42, 0.52, 0.36),
    "redacted":  (0.44, 0.53, 0.40),
    "cctv":      (0.44, 0.50, 0.34),
    "phone":     (0.42, 0.50, 0.32),
    "quote":     (0.40, 0.54, 0.42),
    "headline":  (0.42, 0.50, 0.34),
    "board":     (0.44, 0.50, 0.34),
    "compare":   (0.44, 0.50, 0.34),
    "reveal":    (0.52, 0.56, 0.60),
    "status":    (0.38, 0.54, 0.50),
    "archival":  (0.36, 0.54, 0.36),
    "statement": (0.40, 0.52, 0.32),
}
SCAM = {
    "chat":       (0.34, 0.66, 0.46),
    "transfer":   (0.32, 0.66, 0.46),
    "annotation": (0.36, 0.68, 0.42),
    "kinetic":    (0.46, 0.70, 0.55),
    "chart":      (0.34, 0.66, 0.40),
    "icon":       (0.36, 0.68, 0.42),
    "footage":    (0.34, 0.68, 0.40),
    "trust":      (0.40, 0.66, 0.46),
    "trace":      (0.34, 0.64, 0.42),
    "funnel":     (0.38, 0.66, 0.40),
}
DEFAULT = (0.42, 0.52, 0.34)

SPEAK = [
    (re.compile(r"\$\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|million|billion)\b", re.I), r"\1 \2 dollars"),
    (re.compile(r"\$\s*([\d,]+(?:\.\d+)?)"), r"\1 dollars"),
    (re.compile(r"(\d)%"), r"\1 percent"),
(re.compile(r"(?<=\d),(?=\d)"), ""),
    (re.compile(r"(?<=\d),\s+"), " "),  # "$500, turned" -> "500 turned"
    (re.compile(r"\s+[—–]\s+"), ", "),
]


def speakable(text: str) -> str:
    for pattern, repl in SPEAK:
        text = pattern.sub(repl, text)
    return re.sub(r"\s+", " ", text).strip()


def rate_for(pace: float) -> str:
    """Chatterbox pace (lower = faster) -> edge rate %. 0.60 is neutral."""
    return f"{round((0.60 - pace) * 100):+d}%"


def pitch_for(energy: float) -> str:
    """Chatterbox energy -> edge pitch Hz. 0.42 is neutral."""
    return f"{round((energy - 0.42) * 100):+d}Hz"


def trim(pcm: bytes, floor: float = 0.02, pad: float = 0.04) -> bytes:
    import array

    samples = array.array("h")
    samples.frombytes(pcm)
    n = len(samples)
    start = next((i for i, s in enumerate(samples) if abs(s) / 32768 > floor), 0)
    end = next((i for i in range(n - 1, -1, -1) if abs(samples[i]) / 32768 > floor), n - 1)
    pad_n = int(pad * SAMPLE_RATE)
    return samples[max(0, start - pad_n) : min(n, end + pad_n)].tobytes()


async def synth(text: str, voice: str) -> bytes:
    """edge-tts line -> 24 kHz mono 16-bit PCM, trimmed."""
    tmp = out_dir / ".edge-line.mp3"
    comm = edge_tts.Communicate(text, voice)
    await comm.save(str(tmp))
    raw = subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(tmp), "-ar", str(SAMPLE_RATE),
         "-ac", "1", "-f", "s16le", "-"],
        check=True, capture_output=True,
    ).stdout
    tmp.unlink(missing_ok=True)
    return trim(raw)


async def main() -> None:
    import asyncio

    ap = argparse.ArgumentParser()
    ap.add_argument("--redo", type=str, default="",
                    help="comma-separated beat numbers to regenerate")
    ap.add_argument("--voice", type=str, default=VOICE,
                    help=f"edge-tts voice (default {VOICE})")
    ap.add_argument("--out-dir", type=str, default="",
                    help="write wavs + edge plan here instead of video/public/audio/lambo")
    args = ap.parse_args()
    redo = {int(x) for x in args.redo.split(",") if x.strip().isdigit()}
    out_dir = Path(args.out_dir) if args.out_dir else OUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)

    script = json.loads(SCRIPT.read_text(encoding="utf8"))
    print(f"edge-tts voice: {args.voice} — beats {sorted(redo)}")

    beats_all = script["beats"]
    plan = []
    for beat in beats_all:
        if beat["n"] not in redo or not beat["vo"]:
            continue
        wav_path = out_dir / f"beat-{beat['n']}.wav"
        wav_path.unlink(missing_ok=True)

        energy, pace, hold = (
            beat.get("energy", SCAM.get(beat["module"], DELIVERY.get(beat["module"], DEFAULT))[0]),
            beat.get("pace", SCAM.get(beat["module"], DELIVERY.get(beat["module"], DEFAULT))[1]),
            beat.get("holdAfter", SCAM.get(beat["module"], DELIVERY.get(beat["module"], DEFAULT))[2]),
        )
        lines = direct(
            speakable(beat["vo"]),
            energy,
            pace,
            is_reveal=bool(beat.get("reveal")),
            is_last_beat=beat is beats_all[-1],
)

        chunks = []
        secs_total = 0.0
        for li, line in enumerate(lines):
            text = f"{line.text}{'!' if line.direction[0] == 'k' else ''}"
            rate = rate_for(line.pace)
            pitch = pitch_for(line.energy)
            tmp = OUT_DIR / ".edge-line.mp3"
            comm = edge_tts.Communicate(text, args.voice, rate=rate, pitch=pitch)
            await comm.save(str(tmp))
            raw = subprocess.run(
                ["ffmpeg", "-y", "-v", "error", "-i", str(tmp), "-ar", str(SAMPLE_RATE),
                 "-ac", "1", "-f", "s16le", "-"],
                check=True, capture_output=True,
            ).stdout
            tmp.unlink(missing_ok=True)
            pcm = trim(raw)
            chunks.append(pcm)
            secs_total += len(pcm) / 2 / SAMPLE_RATE
            if line.hold > 0:
                chunks.append(b"\x00\x00" * int(line.hold * SAMPLE_RATE))
                secs_total += line.hold
            print(f"    line {li + 1}/{len(lines)}  {len(pcm) / 2 / SAMPLE_RATE:5.2f}s  [{line.direction[0]}] {line.text[:52]}")

        with wave.open(str(wav_path), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SAMPLE_RATE)
            w.writeframes(b"".join(chunks))

        plan.append({
            "n": beat["n"],
            "name": beat["name"],
            "spoken": " ".join(l.text for l in lines),
            "energy": energy,
            "pace": pace,
            "holdAfter": hold,
            "seconds": round(secs_total, 3),
            "engine": "edge-tts",
            "lines": [
                {"text": l.text, "direction": l.direction, "energy": l.energy,
                 "pace": l.pace, "hold": l.hold}
                for l in lines
            ],
        })
        print(f"  beat {beat['n']}  {secs_total:5.2f}s  [{beat['name']}]")

    if plan:
        (out_dir / "lambo-voice-plan.edge.json").write_text(
            json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf8")
    print(f"\n{out_dir} — edge beats written; merge with tools/merge-lambo-beats.py once the CPU run exits")


if __name__ == "__main__":
    import asyncio

    asyncio.run(main())
