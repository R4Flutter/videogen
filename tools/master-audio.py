"""The mastering stage the pipeline never had.

    python tools/master-audio.py [--check]

Two defects, one tool, because they are both "the audio asset is wrong on disk"
and neither is worth carrying into the renderer:

  1. Narration takes come out of Chatterbox at whatever level the model felt
     like. Measured across one episode they ranged over 4.5 dB of RMS and
     several peaked *above* 0 dBFS, which clips on encode. Remotion plays them
     at gain 1.0, so whatever is in the file is what ships.

  2. video/public/audio/music.wav is mastered as a standalone cue: it fades in
     over its first ~0.5s and out over its last ~0.6s. The Soundtrack loops it,
     so those two fades meet and the mix drops to near-silence for about a
     second and a half at every seam — at 31.5s, 63.5s, 95.5s, for as long as
     the episode runs.

Both fixes are idempotent: normalising to a target is a measure-then-scale, and
the bed is only cropped where it is actually below the silence floor. Running
this twice does nothing the second time, which is what lets it sit in the
episode script without anyone having to remember whether it has run.

`--check` measures and reports without writing, and exits non-zero if anything
is out of spec. That is the mode tools/check.mjs shells into.

No ffmpeg, no numpy: this is stdlib `wave`/`audioop` plus a float32 reader,
because a WAV gain stage does not need a media framework.
"""

import argparse
import math
import struct
import sys
from array import array
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VO = ROOT / "video/public/audio/vo"
BED = ROOT / "video/public/audio/music.wav"

# Where the narration sits. RMS rather than LUFS because a K-weighted meter is
# a dependency and this is a corrective gain stage, not a delivery meter — for
# speech, integrated LUFS lands roughly 3 dB above RMS, so -17 dBFS RMS puts a
# mostly-spoken episode near the -14 LUFS YouTube target.
#
# ponytail: RMS-as-LUFS. If a mix ever has to be certified rather than merely
# not-quiet, run one ffmpeg `loudnorm` pass over the render instead.
TARGET_RMS = -17.0
# True peak is not measured (that needs oversampling); -1.0 dBFS sample peak
# leaves the headroom an inter-sample peak would eat.
CEILING = -1.0
TOLERANCE = 1.0  # dB of drift --check will accept before failing

# A bed edge quieter than this is a fade, not music.
SILENCE = -46.0


# ------------------------------------------------------------------ wav io
def read(path: Path):
    """(mono float samples, sample rate, channels, original per-channel frames).

    Chatterbox writes float32 and the SFX pack is int16, so both have to load.
    `wave` refuses float32 outright, which is why this parses RIFF directly.
    """
    b = path.read_bytes()
    if b[:4] != b"RIFF" or b[8:12] != b"WAVE":
        raise SystemExit(f"{path.name} is not a RIFF WAVE")
    i, fmt, data = 12, None, None
    while i + 8 <= len(b):
        cid, size = b[i : i + 4], struct.unpack("<I", b[i + 4 : i + 8])[0]
        body = b[i + 8 : i + 8 + size]
        if cid == b"fmt ":
            fmt = struct.unpack("<HHIIHH", body[:16])
        elif cid == b"data":
            data = body
        i += 8 + size + (size & 1)
    if not fmt or data is None:
        raise SystemExit(f"{path.name} has no fmt/data chunk")
    tag, ch, sr, _, _, bits = fmt

    if tag == 3 and bits == 32:
        a = array("f")
        a.frombytes(data[: len(data) // 4 * 4])
        samples = a
    elif tag == 1 and bits == 16:
        raw = array("h")
        raw.frombytes(data[: len(data) // 2 * 2])
        samples = array("f", (x / 32768.0 for x in raw))
    else:
        raise SystemExit(f"{path.name}: unsupported format tag {tag} / {bits} bit")
    return samples, sr, ch


def write_float(path: Path, samples: array, sr: int, ch: int) -> None:
    """32-bit float, matching what Chatterbox already writes. Float keeps the
    gain stage lossless — an int16 round-trip on every run would slowly grind
    the takes down."""
    payload = samples.tobytes()
    head = struct.pack("<4sI4s", b"RIFF", 36 + len(payload), b"WAVE")
    head += struct.pack("<4sIHHIIHH", b"fmt ", 16, 3, ch, sr, sr * ch * 4, ch * 4, 32)
    head += struct.pack("<4sI", b"data", len(payload))
    path.write_bytes(head + payload)


def db(x: float) -> float:
    return 20 * math.log10(max(x, 1e-12))


def levels(s: array):
    peak = max((abs(x) for x in s), default=0.0)
    rms = math.sqrt(sum(x * x for x in s) / len(s)) if len(s) else 0.0
    return db(peak), db(rms)


# ------------------------------------------------------------------ stages
def limit(s: array, ceiling_lin: float) -> None:
    """Soft-knee limiter, in place.

    A hard clip on a peaky take is audible as a click; a tanh above the knee
    bends the last 25% of the range instead. Below the knee nothing is touched,
    so the body of the read keeps the level the normaliser just set.
    """
    knee = ceiling_lin * 0.75
    span = ceiling_lin - knee
    for i, x in enumerate(s):
        a = abs(x)
        if a > knee:
            s[i] = math.copysign(knee + span * math.tanh((a - knee) / span), x)


def normalize(path: Path, apply: bool) -> tuple[bool, str]:
    s, sr, ch = read(path)
    if not len(s):
        return True, f"{path.name}: empty"
    peak, rms = levels(s)
    ok = abs(rms - TARGET_RMS) <= TOLERANCE and peak <= CEILING + 0.05
    note = f"{path.name:14} peak {peak:6.1f}  rms {rms:6.1f}"
    if ok or not apply:
        return ok, note + ("" if ok else "  OUT OF SPEC")

    gain = 10 ** ((TARGET_RMS - rms) / 20)
    for i, x in enumerate(s):
        s[i] = x * gain
    limit(s, 10 ** (CEILING / 20))
    write_float(path, s, sr, ch)
    # Verified off disk, not off the buffer. A stage that reports success from
    # what it meant to write is a stage that can silently not have written.
    peak_after, after = levels(read(path)[0])
    good = abs(after - TARGET_RMS) <= TOLERANCE and peak_after <= CEILING + 0.05
    return good, note + f"  ->  peak {peak_after:6.1f}  rms {after:6.1f}" + (
        "" if good else "  STILL OUT OF SPEC"
    )


def edge_silence(s: array, sr: int, ch: int) -> tuple[float, float]:
    """Seconds of sub-floor audio at the head and tail, measured in 25ms blocks.

    Per-block rather than per-sample: a fade crosses zero constantly, so a
    sample-level search stops at the first non-zero sample and reports nothing.
    """
    floor = 10 ** (SILENCE / 20)
    block = max(1, int(sr * 0.025)) * ch
    n = len(s)

    def quiet(i: int) -> bool:
        chunk = s[i : i + block]
        if not len(chunk):
            return False
        return math.sqrt(sum(x * x for x in chunk) / len(chunk)) < floor

    head = 0
    while head + block <= n and quiet(head):
        head += block
    tail = n
    while tail - block >= head and quiet(tail - block):
        tail -= block
    return head / (sr * ch), (n - tail) / (sr * ch)


def debed(apply: bool) -> tuple[bool, str]:
    if not BED.exists():
        return True, "music.wav: absent"
    s, sr, ch = read(BED)
    head, tail = edge_silence(s, sr, ch)
    dur = len(s) / (sr * ch)
    ok = head < 0.05 and tail < 0.05
    note = f"{BED.name:14} {dur:5.2f}s  fade-in {head:.2f}s  fade-out {tail:.2f}s"
    if ok:
        return True, note + "  loops clean"
    if not apply:
        return False, note + "  LOOPS TO SILENCE"

    a = int(head * sr) * ch
    b = len(s) - int(tail * sr) * ch
    write_float(BED, s[a:b], sr, ch)
    return True, note + f"  ->  {(b - a) / (sr * ch):5.2f}s, fades cropped"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="report only, exit 1 if out of spec")
    args = ap.parse_args()
    apply = not args.check

    ok = True
    takes = sorted(VO.glob("beat-*.wav"), key=lambda p: int("".join(c for c in p.stem if c.isdigit())))
    for path in takes:
        good, note = normalize(path, apply)
        ok = ok and good
        print("  " + note)
    good, note = debed(apply)
    ok = ok and good
    print("  " + note)

    if not ok:
        print(
            f"\naudio out of spec — narration wants {TARGET_RMS} dBFS RMS under a "
            f"{CEILING} dBFS ceiling, the bed wants no fade on either end.\n"
            "run: python tools/master-audio.py",
            file=sys.stderr,
        )
        raise SystemExit(1)
    print(f"\nok — {len(takes)} takes at {TARGET_RMS} dBFS RMS, bed loops without a seam")


if __name__ == "__main__":
    main()
