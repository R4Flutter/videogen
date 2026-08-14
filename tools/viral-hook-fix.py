"""Regenerate beats 1 + 7 of the forex-lambo narration for the viral hook fix.

The scorecard failed HOOK_PROMISE: no payoff phrase in the first 30s. The
highest-lift hook style in the mined corpus is bold_claim + "the truth about"
(The INSANE Truth About IKEA 30.4x, CRAZY Truth About McDonald's 36.8x,
Rockefeller 97.3x). Beat 1 is rewritten to that pattern; beat 7 loses its
trailing clause so the total narration still fits the 43.6s cut.

Same dials as lambo-voice-edge.py: pace -> edge rate %, energy -> pitch Hz,
24 kHz mono, trims silence, folds the plan back into lambo-voice-plan.json.
"""
import array
import asyncio
import json
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "video/public/audio/lambo"
PLAN = OUT / "lambo-voice-plan.json"
SAMPLE_RATE = 24000
VOICE = "en-US-GuyNeural"
FFMPEG = r"C:\Users\naikr\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0-full_build\bin\ffmpeg.exe"

NEW = {
    1: {
        "name": "THE HOOK",
        "energy": 0.8, "pace": 0.58, "holdAfter": 0.5,
        "lines": [
            ("The truth about the 18-year-old who bought a Lamborghini "
             "from a 500 dollar trading account.", "land", 0.85, 0.5, 0.0),
        ],
    },
    7: {
        "name": "THE REAL LESSON",
        "energy": 0.62, "pace": 0.55, "holdAfter": 0.6,
        "lines": [
            ("So what's the real lesson?", "lean_in", 0.68, 0.51, 0.3),
            ("Hype is not a business.", "neutral", 0.62, 0.55, 0.22),
            ("Verify before you trade.", "lean_in", 0.68, 0.51, 0.3),
            ("A Lamborghini is never a strategy.", "land", 0.74, 0.47, 0.0),
        ],
    },
}


def rate_for(pace: float) -> str:
    return f"{round((0.60 - pace) * 100):+d}%"


def pitch_for(energy: float) -> str:
    return f"{round((energy - 0.42) * 100):+d}Hz"


def trim(pcm: bytes, floor: float = 0.02, pad: float = 0.04) -> bytes:
    samples = array.array("h")
    samples.frombytes(pcm)
    n = len(samples)
    start = next((i for i, s in enumerate(samples) if abs(s) / 32768 > floor), 0)
    end = next((i for i in range(n - 1, -1, -1) if abs(samples[i]) / 32768 > floor), n - 1)
    pad_n = int(pad * SAMPLE_RATE)
    return samples[max(0, start - pad_n) : min(n, end + pad_n)].tobytes()


async def synth(text: str) -> bytes:
    import edge_tts

    tmp = OUT / ".line.mp3"
    rate = rate_for(0.52)
    pitch = pitch_for(0.6)
    comm = edge_tts.Communicate(text, VOICE, rate=rate, pitch=pitch)
    await comm.save(str(tmp))
    raw = subprocess.run(
        [FFMPEG, "-y", "-v", "error", "-i", str(tmp), "-ar", str(SAMPLE_RATE),
         "-ac", "1", "-f", "s16le", "-"],
        check=True, capture_output=True,
    ).stdout
    tmp.unlink(missing_ok=True)
    return trim(raw)


async def main() -> None:
    for n, spec in NEW.items():
        chunks = []
        secs = 0.0
        plan_lines = []
        for text, direction, energy, pace, hold in spec["lines"]:
            pcm = await synth(text)
            chunks.append(pcm)
            d = len(pcm) / 2 / SAMPLE_RATE
            secs += d
            if hold > 0:
                chunks.append(b"\x00\x00" * int(hold * SAMPLE_RATE))
                secs += hold
            plan_lines.append({"text": text, "direction": direction,
                               "energy": energy, "pace": pace, "hold": hold})
            print(f"  beat {n}: {d:5.2f}s  {text[:60]}")
        with wave.open(str(OUT / f"beat-{n}.wav"), "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SAMPLE_RATE)
            w.writeframes(b"".join(chunks))
        print(f"  beat {n} total {secs:.2f}s")

        plan = json.loads(PLAN.read_text(encoding="utf8"))
        for p in plan:
            if p["n"] == n:
                p.update({
                    "name": spec["name"],
                    "spoken": " ".join(l[0] for l in spec["lines"]),
                    "energy": spec["energy"], "pace": spec["pace"],
                    "holdAfter": spec["holdAfter"],
                    "seconds": round(secs, 3), "engine": "edge-tts",
                    "lines": plan_lines,
                })
        PLAN.write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf8")
    print("done — run tools/viral-mux-lambo.py to rebuild the mix")


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    asyncio.run(main())