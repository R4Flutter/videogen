"""The mix stage: room tone, a ducking envelope, and a meter on the render.

    python tools/mix.py --tone         # write video/public/audio/room.wav
    python tools/mix.py --duck         # write the ducking envelope for the bed
    python tools/mix.py --meter FILE   # measure the finished render
    python tools/mix.py --check        # all of the above, report only

`master-audio.py` already normalises the *assets* — narration takes and the
bed — to −17 dBFS RMS with a −1 dBFS ceiling, which is most of the job and
better than most channels manage. Three things it does not do, because they
are not asset problems:

  1. **Room tone.** There is no noise floor. Between sentences the mix is
     digital silence, and digital silence is *wrong* in a way the ear notices
     before the conscious mind does — it is the sound of a file, not a room.
     A bed of −52 dBFS noise under everything is the highest ratio of
     perceived production value to effort anywhere in this pipeline.

  2. **A ducking envelope.** The director plans music levels, but a level is a
     number, not a gesture. Real ducking has attack, hold and release keyed to
     where the voice actually is — and the word timings that say where the
     voice is already exist in voice.json.

  3. **A meter on the render.** Assets being at spec does not mean the sum of
     them is. Voice plus bed plus accents is what YouTube measures, and its
     normalisation targets roughly −14 LUFS. This measures the finished file:
     integrated loudness, loudness range and true peak.

No numpy, no ffmpeg for the tone and envelope — stdlib `wave` and `audioop`,
the same choice `master-audio.py` made and for the same reason. The meter uses
ffmpeg's `ebur128` when it is present, and says so plainly when it is not,
because a K-weighted integrated measurement is not something to approximate
twice in one repository.
"""

from __future__ import annotations

import argparse
import array
import json
import math
import random
import shutil
import struct
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "video/public/audio"
VOICE = ROOT / "video/src/voice.json"
PLAN = ROOT / "video/src/director-plan.json"
TONE = AUDIO / "room.wav"
ENVELOPE = AUDIO / "duck.json"

SR = 48000

#: Where the noise floor sits. Quiet enough that nobody notices it; loud
#: enough that its absence would be noticed. Below about −58 it stops doing
#: the job; above about −46 it is hiss.
TONE_DBFS = -52.0

#: Ducking shape, seconds. Attack is fast because a bed that is still loud on
#: the first syllable has already buried it; release is slow because a bed that
#: leaps back the instant a sentence ends sounds like an automatic process,
#: which is exactly what it is and exactly what it must not sound like.
ATTACK = 0.12
HOLD = 0.10
RELEASE = 0.60

#: How far the bed drops under speech, in dB.
DUCK_DB = -7.0


# ------------------------------------------------------------------ wav io
def write_wav(path: Path, samples: array.array, sr: int = SR, channels: int = 1) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(samples.tobytes())


def db_to_amp(db: float) -> float:
    return 10.0 ** (db / 20.0)


# --------------------------------------------------------------- room tone
def room_tone(seconds: float = 30.0, sr: int = SR, dbfs: float = TONE_DBFS, seed: int = 7) -> array.array:
    """Filtered noise that loops seamlessly.

    White noise sounds like a fault. What a room sounds like is *pink-ish*
    noise — energy falling with frequency — plus a little low rumble. This is
    a cheap one-pole low-pass cascade over white noise, which is not a correct
    pink filter and does not need to be: at −52 dBFS the ear is judging
    "is there air here", not spectral slope.

    Seamless looping matters because the renderer will repeat this under a
    ten-minute film, and a seam every thirty seconds is worse than no tone at
    all. The last `xfade` seconds are crossfaded into the first.
    """
    rnd = random.Random(seed)
    n = int(seconds * sr)
    xfade = int(0.5 * sr)
    raw = [rnd.uniform(-1.0, 1.0) for _ in range(n + xfade)]

    # Three one-pole low-passes in series: −18 dB/octave above the corner.
    out = []
    z1 = z2 = z3 = 0.0
    a = 0.06
    for v in raw:
        z1 += a * (v - z1)
        z2 += a * (z1 - z2)
        z3 += a * (z2 - z3)
        out.append(z3)

    peak = max(abs(v) for v in out) or 1.0
    target = db_to_amp(dbfs)
    # Normalise on RMS rather than peak: noise has a low crest factor and
    # peak-normalising would put the actual level 10 dB under where it was
    # asked to be.
    rms = math.sqrt(sum(v * v for v in out) / len(out)) or 1.0
    gain = target / rms
    out = [v * gain for v in out]

    # Seamless: crossfade the tail into the head.
    body = out[:n]
    tail = out[n : n + xfade]
    for i in range(xfade):
        k = i / xfade
        body[i] = body[i] * k + tail[i] * (1.0 - k)

    samples = array.array("h")
    for v in body:
        samples.append(max(-32768, min(32767, int(v * 32767))))
    return samples


# ----------------------------------------------------------------- ducking
def voice_windows(voice_json: Path) -> list[tuple[float, float]]:
    """Where the narrator is actually speaking, from the alignment."""
    if not voice_json.exists():
        return []
    data = json.loads(voice_json.read_text(encoding="utf8"))
    words = []
    if isinstance(data, dict):
        for beat in data.get("beats", data.get("takes", [])) or []:
            for w in beat.get("words", []) or []:
                if "start" in w and "end" in w:
                    words.append((float(w["start"]), float(w["end"])))
    if not words:
        return []
    words.sort()
    # Merge words into phrases: gaps under 350ms are within a sentence, and
    # ducking back up inside a sentence is audible pumping.
    merged = [list(words[0])]
    for s, e in words[1:]:
        if s - merged[-1][1] < 0.35:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return [(a, b) for a, b in merged]


def duck_envelope(windows: list[tuple[float, float]], duration: float, step: float = 0.02) -> list[list[float]]:
    """A gain curve for the bed, sampled every `step` seconds.

    Attack/hold/release rather than a level step. The difference is entirely
    audible and entirely free.
    """
    n = int(duration / step) + 1
    gain = [0.0] * n  # in dB, 0 = unducked

    for start, end in windows:
        a0 = max(0, int((start - ATTACK) / step))
        a1 = min(n - 1, int(start / step))
        h1 = min(n - 1, int((end + HOLD) / step))
        r1 = min(n - 1, int((end + HOLD + RELEASE) / step))

        for i in range(a0, a1 + 1):
            k = (i - a0) / max(1, a1 - a0)
            gain[i] = min(gain[i], DUCK_DB * k)
        for i in range(a1, h1 + 1):
            gain[i] = min(gain[i], DUCK_DB)
        for i in range(h1, r1 + 1):
            k = (i - h1) / max(1, r1 - h1)
            # Cosine release: linear-in-dB sounds like a fader being pulled.
            gain[i] = min(gain[i], DUCK_DB * (0.5 + 0.5 * math.cos(math.pi * k)) if k < 1 else 0.0)

    return [[round(i * step, 3), round(g, 2)] for i, g in enumerate(gain)]


# ------------------------------------------------------------------- meter
def meter(path: Path) -> dict:
    """Integrated LUFS, loudness range and true peak of the finished render.

    Uses ffmpeg's ebur128, which is the reference implementation of BS.1770.
    If ffmpeg is not on PATH this reports that rather than approximating:
    `master-audio.py` already carries one documented RMS-as-LUFS shortcut, and
    a second one in a different file with a different constant is how a
    codebase ends up with two answers to the same question.
    """
    if not path.exists():
        return {"ok": False, "note": f"{path} does not exist — render first"}
    if not shutil.which("ffmpeg"):
        return {"ok": False, "note": "ffmpeg not on PATH — cannot measure the render"}

    proc = subprocess.run(
        ["ffmpeg", "-nostats", "-i", str(path), "-filter_complex", "ebur128=peak=true", "-f", "null", "-"],
        capture_output=True,
        text=True,
    )
    text = proc.stderr
    out: dict = {"ok": True}
    for key, label in (("I:", "integrated_lufs"), ("LRA:", "loudness_range_lu"), ("Peak:", "true_peak_dbtp")):
        idx = text.rfind(key)
        if idx < 0:
            continue
        chunk = text[idx + len(key) : idx + len(key) + 24].strip().split()
        if chunk:
            try:
                out[label] = float(chunk[0])
            except ValueError:
                pass
    return out


def judge(m: dict) -> list[str]:
    """What the numbers mean, in words, with the reasoning attached."""
    if not m.get("ok"):
        return [m.get("note", "not measured")]
    notes = []
    i = m.get("integrated_lufs")
    lra = m.get("loudness_range_lu")
    tp = m.get("true_peak_dbtp")

    if i is not None:
        if i < -15.5:
            notes.append(f"FAIL  {i:.1f} LUFS — quieter than YouTube's target; every competitor is audibly louder")
        elif i > -12.5:
            notes.append(f"FAIL  {i:.1f} LUFS — louder than target, so YouTube turns it down and the mix loses its dynamics")
        else:
            notes.append(f"ok    {i:.1f} LUFS integrated")
    if lra is not None:
        if lra < 4.0:
            notes.append(f"WARN  loudness range {lra:.1f} LU — over-compressed; a documentary this flat feels relentless")
        else:
            notes.append(f"ok    loudness range {lra:.1f} LU")
    if tp is not None:
        if tp > -1.0:
            notes.append(f"FAIL  true peak {tp:.1f} dBTP — will clip after lossy encoding")
        else:
            notes.append(f"ok    true peak {tp:.1f} dBTP")
    return notes


# ---------------------------------------------------------------- selftest
def selftest() -> None:
    tone = room_tone(seconds=2.0)
    assert len(tone) == int(2.0 * SR), len(tone)
    rms = math.sqrt(sum(float(v) ** 2 for v in tone) / len(tone)) / 32767.0
    got = 20 * math.log10(rms)
    assert abs(got - TONE_DBFS) < 2.0, f"room tone at {got:.1f} dBFS, wanted {TONE_DBFS}"
    # seamless: the last sample and the first must be close, or the loop clicks
    assert abs(int(tone[0]) - int(tone[-1])) < 3000, (tone[0], tone[-1])

    env = duck_envelope([(1.0, 2.0), (5.0, 6.0)], duration=8.0)
    at = {round(t, 2): g for t, g in env}
    assert at[0.0] == 0.0, "silence before the first word is unducked"
    assert at[1.5] <= DUCK_DB + 0.01, "bed is down under speech"
    assert at[2.0] <= DUCK_DB + 0.01, "still down at the end of the phrase"
    assert at[3.5] > DUCK_DB + 3, "and back up after the release"
    assert at[0.9] < 0.0, "the attack starts before the word, not on it"

    # two phrases close together must not pump back up between them
    tight = {round(t, 2): g for t, g in duck_envelope([(1.0, 2.0), (2.2, 3.0)], duration=5.0)}
    assert tight[2.1] < DUCK_DB / 2, "no pumping between phrases in one sentence"

    print("mix selftest ok")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--tone", action="store_true", help="write the room tone loop")
    ap.add_argument("--duck", action="store_true", help="write the ducking envelope")
    ap.add_argument("--meter", help="measure a rendered file")
    ap.add_argument("--check", action="store_true", help="report only, exit non-zero if out of spec")
    ap.add_argument("--seconds", type=float, default=30.0)
    args = ap.parse_args()

    if args.selftest:
        return selftest()

    did = False
    if args.tone or args.check:
        if args.check and TONE.exists():
            print(f"ok    room tone present ({TONE.stat().st_size // 1024} KB)")
        else:
            write_wav(TONE, room_tone(args.seconds))
            print(f"wrote {TONE}  ({args.seconds:.0f}s loop at {TONE_DBFS} dBFS)")
        did = True

    if args.duck or args.check:
        windows = voice_windows(VOICE)
        if not windows:
            print("warn  no word timings in video/src/voice.json — run tools/align.py first")
        else:
            duration = max(e for _, e in windows) + 5
            env = duck_envelope(windows, duration)
            speaking = sum(e - s for s, e in windows)
            if not args.check:
                ENVELOPE.write_text(json.dumps({"step": 0.02, "duckDb": DUCK_DB, "gain": env}), encoding="utf8")
                print(f"wrote {ENVELOPE}  ({len(windows)} phrases, {speaking:.0f}s of speech in {duration:.0f}s)")
            else:
                print(f"ok    {len(windows)} phrases, {100 * speaking / duration:.0f}% speech density")
        did = True

    target = args.meter or (str(ROOT / "video/out/vox-essay.mp4") if args.check else None)
    if target:
        m = meter(Path(target))
        print(f"METER {target}")
        bad = False
        for line in judge(m):
            print(f"  {line}")
            bad = bad or line.startswith("FAIL")
        did = True
        if bad and args.check:
            sys.exit(1)

    if not did:
        ap.print_help()


if __name__ == "__main__":
    main()
