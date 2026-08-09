"""Per-sentence performance direction, and the scorer that picks a take.

    python tools/voice_direction.py --selftest

`voice.py` directs the read per *module*: every sentence in a beat is generated
at one energy and one pace. That is why the setup and the turn inside a single
beat sound identical, and it is the loudest remaining tell that the narrator is
not a person. A human reader changes gear mid-paragraph — they slow into the
number, they lean on the "but", they drop under the last clause. None of that is
a dial setting; it is a *plan*, and this module is the plan.

Three things live here, all of them free of torch so they can be tested without
a model:

  1. **Direction** — split a beat into sentences and give each one a role, from
     its own language plus its position in the beat.
  2. **Pace** — a words-per-minute target per sentence, realised as inserted
     pauses rather than as a dial, because the measured note in `voice.py` is
     correct: on the built-in voice `cfg` barely moves the clock.
  3. **Take scoring** — the metric that makes best-of-N worth doing. Free TTS
     beats paid TTS when you generate five and keep the best, and "the best"
     has to be a number or the whole idea collapses into listening to 900 takes.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path

# --------------------------------------------------------------- direction

#: The five registers a documentary narrator actually uses, as (energy, pace)
#: offsets *from the beat's module setting* rather than absolute values.
#:
#: Offsets, not absolutes, because `voice.py`'s DELIVERY/SCAM tables are the
#: result of real listening and should keep deciding the beat's centre of
#: gravity. What was missing was movement around that centre — so `land` is
#: "this beat, but leaned into", not "0.6 regardless of what this beat is".
#:
#: The ranges are deliberately narrower than the Chatterbox docs' dramatic
#: settings (exaggeration≈0.7, cfg≈0.3). Those are right for a trailer. A
#: documentary narrator who hits 0.7 sounds like an advert, and the existing
#: tables already know it.
DIRECTIONS: dict[str, tuple[float, float]] = {
    #            d_energy  d_pace   (pace is cfg_weight: lower = more expressive)
    "flat":     (-0.06,  +0.04),  # mechanism, arithmetic, a list of facts
    "neutral":  ( 0.00,   0.00),  # the module's own setting, untouched
    "lean_in":  (+0.06,  -0.04),  # the turn, the "but", the setup to a reveal
    "land":     (+0.12,  -0.08),  # the reveal line itself. The slowest, heaviest
    "soft":     (-0.04,  +0.02),  # the reflect beat, the last line
}

#: Words per minute per direction. The pace lever is silence, not the dial:
#: slowing down is how a human signals importance, and the way to do it here is
#: to put air around the sentence.
WPM: dict[str, float] = {
    "flat": 168.0,
    "neutral": 155.0,
    "lean_in": 145.0,
    "land": 118.0,
    "soft": 138.0,
}

_LAND = re.compile(
    r"\b(turns out|actually|in fact|the truth|never was|was never|isn'?t|wasn'?t|"
    r"none of it|all of it|nobody|no one ever|the whole thing)\b",
    re.I,
)
_LEAN = re.compile(r"^\s*(but|however|except|and yet|then|so)\b|\b(until|before)\b", re.I)
_FLAT = re.compile(r"\b(percent|dollars?|per cent|rate|fee|balance|deposit|withdraw)\b", re.I)

#: A sentinel that cannot occur in a script, used to park decimal points while
#: splitting on sentence punctuation.
_DOT = "\x01"


def sentences(text: str) -> list[str]:
    """Split into sentences without cutting "$1.2 billion" in half."""
    parked = re.sub(r"(\d)\.(\d)", rf"\1{_DOT}\2", text)
    out = []
    for chunk in re.split(r"(?<=[.!?])\s+", parked):
        s = chunk.replace(_DOT, ".").strip()
        if s:
            out.append(s)
    return out


@dataclass
class Line:
    """One sentence, with the direction it should be read at."""

    index: int
    text: str
    direction: str
    energy: float
    pace: float
    #: Seconds of silence after this sentence. This is the real pace lever.
    hold: float
    #: Target read length in seconds, from the direction's wpm. Used by the
    #: take scorer to reject a take that galloped.
    target_seconds: float
    #: Whether to place a breath *before* this sentence.
    breath: bool


def direct(vo: str, base_energy: float, base_pace: float, is_reveal: bool = False,
           is_last_beat: bool = False) -> list[Line]:
    """Turn one beat's narration into a directed read.

    The rules, in priority order:
      · a sentence carrying reveal language *lands*, and only one per beat does
        — two reveals in a paragraph is two reveals nobody hears;
      · a sentence opening on a contrast word *leans in*;
      · a sentence that is mostly numbers goes *flat*, because a number read
        with emotion sounds like a sales pitch;
      · the last sentence of the film goes *soft*;
      · everything else is the module's own setting.
    """
    lines: list[Line] = []
    parts = sentences(vo)
    landed = False

    for i, s in enumerate(parts):
        last_of_beat = i == len(parts) - 1

        if not landed and (_LAND.search(s) or (is_reveal and last_of_beat)):
            d = "land"
            landed = True
        elif _LEAN.search(s):
            d = "lean_in"
        elif _FLAT.search(s) and not _LAND.search(s):
            d = "flat"
        elif is_last_beat and last_of_beat:
            d = "soft"
        else:
            d = "neutral"

        de, dp = DIRECTIONS[d]
        words = max(1, len(s.split()))
        target = words / (WPM[d] / 60.0)

        # A held sentence earns air after it; a flat one runs on into the next.
        hold = {"land": 0.85, "lean_in": 0.30, "soft": 0.55, "neutral": 0.22, "flat": 0.14}[d]
        # No trailing hold on the final sentence of a beat — the beat's own
        # holdAfter already covers the gap, and stacking them reads as a stall.
        if last_of_beat:
            hold = 0.0

        lines.append(
            Line(
                index=i,
                text=s,
                direction=d,
                energy=round(min(0.85, max(0.15, base_energy + de)), 3),
                pace=round(min(0.90, max(0.20, base_pace + dp)), 3),
                hold=hold,
                target_seconds=round(target, 2),
                # Breathe before a landing line and at the head of a long beat.
                breath=(d == "land" and i > 0) or (i > 0 and i % 3 == 0),
            )
        )
    return lines


# ------------------------------------------------------------ take scoring

def _rms(xs) -> float:
    if not len(xs):
        return 0.0
    return math.sqrt(sum(float(x) * float(x) for x in xs) / len(xs))


def score_take(samples, sr: int, target_seconds: float) -> dict:
    """Score one take. Higher is better.

    The five terms, and why each one is here:

      f0_range     Pitch variance. Monotone is *the* named tell of cheap AI
                   narration, and it is the one thing a seed sweep reliably
                   varies. Weighted highest for that reason.
      rate_var     Does the pace change within the take? A read at constant
                   syllable rate is a machine reading, even at a good pitch.
      clean        Clipping, dropouts and truncation. A take that ends
                   mid-word scores zero here however lovely it sounded.
      pauses       Did the model honour the punctuation? Chatterbox sometimes
                   runs two sentences together, which destroys the direction.
      length       Distance from the directed target, so `land` actually lands
                   slow instead of merely being labelled slow.

    Returns the component scores as well as the total, because when a whole
    episode scores badly you need to know which term collapsed.
    """
    try:
        import numpy as np
    except ImportError:  # pragma: no cover - numpy ships with torch
        return {"total": 0.0, "note": "numpy unavailable"}

    import numpy as np

    x = np.asarray(samples, dtype=np.float64).flatten()
    if x.size == 0:
        return {"total": 0.0, "f0_range": 0, "rate_var": 0, "clean": 0, "pauses": 0, "length": 0}

    seconds = x.size / sr
    peak = float(np.max(np.abs(x))) if x.size else 0.0

    # --- clean: clipping and an abrupt tail
    clipped = float(np.mean(np.abs(x) > 0.985))
    tail = x[-int(0.05 * sr):] if x.size > int(0.05 * sr) else x
    # A take that ends loud ended mid-word.
    tail_energy = _rms(tail) / (peak + 1e-9)
    clean = max(0.0, 1.0 - clipped * 40.0 - max(0.0, tail_energy - 0.25) * 1.5)

    # --- frame energies, 20ms hop
    hop = max(1, int(0.02 * sr))
    frames = x[: (x.size // hop) * hop].reshape(-1, hop)
    energy = np.sqrt((frames ** 2).mean(axis=1)) + 1e-9
    voiced = energy > (energy.max() * 0.08)

    # --- pauses: silent runs of 120ms+ inside the take
    gaps, run = [], 0
    for v in voiced:
        if not v:
            run += 1
        else:
            if run:
                gaps.append(run * hop / sr)
            run = 0
    real_gaps = [g for g in gaps if g >= 0.12]
    # One pause per ~12 words is natural speech. Zero means it gabbled.
    pauses = min(1.0, len(real_gaps) / 2.0) if seconds > 2.5 else 1.0

    # --- f0 range via autocorrelation on decimated, voiced audio
    f0s = _pitch_track(x, sr)
    if len(f0s) >= 6:
        lo, hi = np.percentile(f0s, 10), np.percentile(f0s, 90)
        semitones = 12.0 * math.log2(max(hi, 1.0) / max(lo, 1.0))
        # 2 semitones is flat; 8+ is expressive. A documentary read wants ~4-7.
        f0_range = min(1.0, max(0.0, (semitones - 1.5) / 6.0))
    else:
        f0_range = 0.3

    # --- rate variance: how much frame energy moves. A constant-rate read has
    #     a narrow distribution; a read that changes gear has a wide one.
    e_db = 20.0 * np.log10(energy)
    rate_var = min(1.0, float(np.std(e_db)) / 12.0)

    # --- length
    length = 1.0 - min(1.0, abs(seconds - target_seconds) / max(1.5, target_seconds * 0.6)) if target_seconds > 0 else 1.0

    total = 0.34 * f0_range + 0.20 * rate_var + 0.22 * clean + 0.12 * pauses + 0.12 * length

    return {
        "total": round(float(total), 4),
        "f0_range": round(float(f0_range), 3),
        "rate_var": round(float(rate_var), 3),
        "clean": round(float(clean), 3),
        "pauses": round(float(pauses), 3),
        "length": round(float(length), 3),
        "seconds": round(float(seconds), 3),
        "f0_median": round(float(np.median(f0s)), 1) if len(f0s) else 0.0,
    }


def _pitch_track(x, sr: int, fmin: float = 70.0, fmax: float = 320.0) -> list:
    """Autocorrelation pitch, on audio decimated to 8 kHz.

    Decimation is what makes this affordable: at 24 kHz the lag search for a
    70 Hz floor is 343 samples per frame, and a six-second take is tens of
    millions of multiplies in a loop nobody wants to wait for. At 8 kHz the
    same search is 114 lags, which numpy does without noticing.
    """
    import numpy as np

    factor = max(1, int(round(sr / 8000)))
    y = np.asarray(x[::factor], dtype=np.float64)
    fs = sr / factor
    win = int(0.032 * fs)
    hop = int(0.010 * fs)
    if y.size < win * 2:
        return []

    lag_min = int(fs / fmax)
    lag_max = int(fs / fmin)
    out = []
    for start in range(0, y.size - win, hop):
        frame = y[start : start + win]
        frame = frame - frame.mean()
        e = float(np.dot(frame, frame))
        if e < 1e-6:
            continue
        ac = np.correlate(frame, frame, mode="full")[win - 1 :]
        seg = ac[lag_min : min(lag_max, ac.size)]
        if seg.size < 3:
            continue
        lag = int(np.argmax(seg)) + lag_min
        # Reject frames where the periodicity is weak — unvoiced audio has a
        # flat autocorrelation and would otherwise contribute random pitches
        # that inflate the range score exactly where it should be low.
        if ac[lag] / (ac[0] + 1e-9) < 0.35:
            continue
        out.append(fs / lag)
    return out


# ------------------------------------------------------------ drift monitor

def drift_report(takes: list[dict], sigma: float = 2.0) -> list[dict]:
    """Which takes have wandered away from the episode's own voice.

    One reference clip across ~180 chunks is not enough to hold timbre: the
    model drifts, and by the back half of a ten-minute film the narrator is
    audibly a slightly different person. Regenerating everything is expensive
    and pointless — the fix is to find the outliers and re-roll only those.

    Compares each take's median f0 against the episode median. A take more
    than `sigma` deviations out is flagged.
    """
    vals = [t.get("f0_median", 0.0) for t in takes if t.get("f0_median")]
    if len(vals) < 8:
        return []
    mean = sum(vals) / len(vals)
    var = sum((v - mean) ** 2 for v in vals) / len(vals)
    sd = math.sqrt(var)
    if sd < 1e-6:
        return []
    out = []
    for t in takes:
        f0 = t.get("f0_median", 0.0)
        if not f0:
            continue
        z = (f0 - mean) / sd
        if abs(z) > sigma:
            out.append({**t, "z": round(z, 2), "episode_median": round(mean, 1)})
    return out


# ------------------------------------------------------------------ selftest

def selftest() -> None:
    """python tools/voice_direction.py --selftest — the logic worth breaking."""
    # --- sentence splitting keeps decimals whole
    s = sentences("The rate was 0.4 percent. The basket rose 3.1 percent.")
    assert s == ["The rate was 0.4 percent.", "The basket rose 3.1 percent."], s

    # --- direction: one land per beat, not three
    lines = direct(
        "They paid on time. But the money never left the building. "
        "It turns out the payout was your own deposit. It turns out nobody was paying anyone.",
        0.40,
        0.66,
    )
    assert [l.direction for l in lines][:3] == ["neutral", "lean_in", "land"], [l.direction for l in lines]
    assert sum(1 for l in lines if l.direction == "land") == 1, "only one landing per beat"

    # --- offsets move around the module's setting, not away from it
    assert all(0.15 <= l.energy <= 0.85 for l in lines)
    assert all(0.20 <= l.pace <= 0.90 for l in lines)
    land = next(l for l in lines if l.direction == "land")
    neutral = next(l for l in lines if l.direction == "neutral")
    assert land.energy > neutral.energy and land.pace < neutral.pace
    assert land.target_seconds / max(1, len(land.text.split())) > neutral.target_seconds / max(
        1, len(neutral.text.split())
    ), "a landing line is read slower per word"

    # --- numbers read flat
    flat = direct("The bank pays 0.4 percent on the balance.", 0.40, 0.66)
    assert flat[0].direction == "flat", flat[0].direction

    # --- the last line of the film goes soft
    soft = direct("Now you know what to look for.", 0.40, 0.66, is_last_beat=True)
    assert soft[-1].direction == "soft", soft[-1].direction

    # --- holds: the last sentence of a beat never carries its own tail
    assert lines[-1].hold == 0.0

    # --- scoring: a monotone tone must lose to a varied one
    try:
        import numpy as np

        sr = 24000
        t = np.arange(sr * 3) / sr
        flat_tone = 0.2 * np.sin(2 * np.pi * 120 * t)
        varied = 0.2 * np.sin(2 * np.pi * (100 + 45 * np.sin(2 * np.pi * 0.7 * t)) * t)
        a = score_take(flat_tone, sr, 3.0)
        b = score_take(varied, sr, 3.0)
        assert b["f0_range"] > a["f0_range"], (a, b)

        # a clipped take must lose on `clean`
        clipped = np.clip(varied * 12, -1, 1)
        c = score_take(clipped, sr, 3.0)
        assert c["clean"] < b["clean"], (b, c)

        # --- drift: an outlier is found, a tight set is not
        tight = [{"n": i, "f0_median": 120 + (i % 3)} for i in range(20)]
        assert drift_report(tight) == []
        wandered = tight + [{"n": 99, "f0_median": 190}]
        flagged = drift_report(wandered)
        assert any(t["n"] == 99 for t in flagged), flagged
    except ImportError:
        print("  (numpy unavailable — scorer tests skipped)")

    print("voice_direction selftest ok")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--script", default="video/src/script.json")
    ap.add_argument("--beat", type=int, help="print the directed read for one beat")
    args = ap.parse_args()

    if args.selftest:
        selftest()
        return

    root = Path(__file__).resolve().parent.parent
    script = json.loads((root / args.script).read_text(encoding="utf8"))
    beats = script["beats"]
    chosen = [b for b in beats if args.beat is None or b["n"] == args.beat]

    for b in chosen:
        if not b.get("vo"):
            continue
        lines = direct(
            b["vo"],
            0.40,
            0.66,
            is_reveal=bool(b.get("reveal")),
            is_last_beat=b is beats[-1],
        )
        print(f"beat {b['n']}  {b['name']}")
        for l in lines:
            print(f"  {l.direction:8} e{l.energy:<5} p{l.pace:<5} +{l.hold:.2f}s  {l.text[:70]}")
        if args.beat is None and b["n"] > 4:
            print("  …")
            break


if __name__ == "__main__":
    main()
