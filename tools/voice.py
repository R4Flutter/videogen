"""script.json narration -> a directed Chatterbox read, one sentence at a time.

    .venv-tts/Scripts/python tools/voice.py [--voice ref.wav] [--takes 4]

Three things changed here, and they are the difference between free TTS and
paid TTS:

  1. **Per sentence, not per beat.** The DELIVERY/SCAM tables below still set
     each beat's centre of gravity — they were arrived at by listening and they
     are right. What they could not do is move *within* a beat, so the setup
     and the turn of one paragraph came out at identical energy. Direction is
     now planned per sentence by tools/voice_direction.py and applied as an
     offset from the module's own setting.

  2. **Best of N.** Generation ran one take at a fixed seed. That is exactly
     reproducible and gives you nothing to choose between. It now sweeps N
     seeds per sentence and keeps the highest-scoring take — monotone is the
     single most-named tell of machine narration, and a seed sweep is the one
     thing that reliably varies it. The winning seed is cached per sentence, so
     reproducibility survives: re-running reproduces the chosen take exactly
     without regenerating the losers.

  3. **Breath and drift.** Real breaths, sampled from the reference voice, are
     inserted before landing lines. And each take's median pitch is compared
     against the episode's, so the handful of takes that wandered can be
     re-rolled instead of re-reading the whole film.

With no reference, Chatterbox re-invents its speaker on every call — six beats
sound fine, seventy sound like five people. --voice defaults to
brand/narrator.wav (built by tools/make-ref-voice.py), so every take in every
episode inherits one timbre and one tempo unless you explicitly ask for
another.

Chatterbox pins torch==2.6.0, so it lives in its own venv and never touches the
interpreter that runs tools/align.py. Writes video/public/audio/vo/beat-N.wav
plus voice-plan.json (the direction each beat was read with); align.py turns
those takes into word timings and retimes the episode around them.
"""

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from voice_direction import direct, drift_report, score_take  # noqa: E402

# torch/chatterbox are imported inside main(): align.py borrows speakable() and
# runs on the interpreter that has no Chatterbox in it.

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "video/src/script.json"
OUT = ROOT / "video/public/audio/vo"
PLAN = OUT / "voice-plan.json"
TAKES = OUT / "take-cache.json"
REF = ROOT / "brand/narrator.wav"

#: How many seeds to sweep per sentence. Four is the knee of the curve: the
#: gain from 1→4 is large and obvious, 4→8 is marginal and doubles a CPU-bound
#: run that already takes an hour.
DEFAULT_TAKES = 4

# --------------------------------------------------------------- direction
# Chatterbox exposes exactly two performance dials, so delivery is those two
# plus the silence after the line. `exaggeration` is energy; `cfg` is pace, and
# lower is faster — they move together or an excited read comes out sluggish.
#
# A documentary narrator is not a shorts narrator. Everything here is lower
# energy and slower than a pitch: calm, controlled, curious. The performance is
# in where the reader slows down, not in how hard they push.
#
#   module            energy  pace   silence after
DELIVERY = {
    "caseOpen":  (0.42, 0.52, 0.45),  # the case, stated. No trailer voice.
    "chapter":   (0.38, 0.52, 0.40),
    "clock":     (0.40, 0.55, 0.45),  # a timestamp needs air around it
    "timeline":  (0.40, 0.52, 0.32),
    "map":       (0.40, 0.52, 0.30),
    "person":    (0.38, 0.50, 0.32),  # a person is described, not performed
    "evidence":  (0.46, 0.50, 0.38),
    "document":  (0.42, 0.52, 0.36),  # reading a record aloud: deliberate
    "redacted":  (0.44, 0.53, 0.40),
    "cctv":      (0.44, 0.50, 0.34),
    "phone":     (0.42, 0.50, 0.32),
    "quote":     (0.40, 0.54, 0.42),  # somebody else's words: slower, flatter
    "headline":  (0.42, 0.50, 0.34),
    "board":     (0.44, 0.50, 0.34),
    "compare":   (0.44, 0.50, 0.34),
    "reveal":    (0.52, 0.56, 0.60),  # slowest line in the film, then a hold
    "status":    (0.38, 0.54, 0.50),  # the outcome: restrained
    "archival":  (0.36, 0.54, 0.36),
    "statement": (0.40, 0.52, 0.32),
}

# The scam engine reads at the calm end of the room. This narrator is a friend
# explaining how a trick works over coffee — not a documentary on a chase — so
# everything sits slightly lower energy and slower than the crime read, with a
# beat more air after each line. The money and the chat are stated flat; only
# the hook/reveal words (kinetic) carry any push.
#
# Measured, not assumed: on the built-in voice, `cfg` barely moves the clock.
# Going 0.52 -> 0.70 changed a beat's length by under 3%, and the read still
# runs 5.5-6 syllables a second — brisk-conversational rather than the calm
# documentary register these numbers describe. The values below are the calm
# end of what the dial can reach; the actual pace lever is a reference voice
# (`voice.py --voice ref.wav`), which the read inherits its tempo from.
SCAM = {
    "chat":       (0.34, 0.66, 0.46),  # a conversation read aloud: soft, unhurried
    "transfer":   (0.32, 0.66, 0.46),  # money leaving: said flat, never thrilled
    "annotation": (0.36, 0.68, 0.42),
    "kinetic":    (0.46, 0.70, 0.55),  # the hook and the reveal carry the beat
    "chart":      (0.34, 0.66, 0.40),
    "icon":       (0.36, 0.68, 0.42),
    "footage":    (0.34, 0.68, 0.40),
    # The vox editorial modules. The trust list is read like a receipt: each
    # signal stated, then a held breath before the turn. The trace is the
    # quietest read in the video — the money's movement is the drama, not the
    # narrator's. The funnel counts down deliberately, like arithmetic.
    "trust":      (0.40, 0.66, 0.46),
    "trace":      (0.34, 0.64, 0.42),
    "funnel":     (0.38, 0.66, 0.40),
}
DEFAULT = (0.42, 0.52, 0.34)

# The narration is written to be read, not spoken: symbols have no pronunciation
# and a TTS model will either skip them or spell them out.
SPEAK = [
    (re.compile(r"\$\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|million|billion)\b", re.I), r"\1 \2 dollars"),
    (re.compile(r"\$\s*([\d,]+(?:\.\d+)?)"), r"\1 dollars"),
    (re.compile(r"(\d)%"), r"\1 percent"),
    (re.compile(r"(?<=\d),(?=\d)"), ""),  # 3,000 -> 3000, read as "three thousand"
    # A dash in a documentary line is a breath, not a hyphen. Chatterbox reads
    # the character; a comma is the pause the writing meant.
    (re.compile(r"\s+[—–]\s+"), ", "),
]


def speakable(text: str) -> str:
    for pattern, repl in SPEAK:
        text = pattern.sub(repl, text)
    return re.sub(r"\s+", " ", text).strip()


def trim(wav, sr: int, floor: float = 0.02, pad: float = 0.04):
    """Drop the lead-in and tail-off silence so a beat starts on its first word."""
    loud = (wav.abs().max(dim=0).values > floor).nonzero()
    if not len(loud):
        return wav
    edge = int(pad * sr)
    return wav[:, max(0, int(loud[0]) - edge) : min(wav.shape[-1], int(loud[-1]) + edge)]


def silence(seconds: float, sr: int, channels: int = 1):
    """A block of digital silence, for holds between sentences."""
    return torch.zeros(channels, max(0, int(seconds * sr)))


def breath_bank(ref_path, sr: int):
    """Real breaths, lifted from the reference clip.

    A synthesised breath sounds like noise; a sampled one sounds like the
    narrator. The reference wav has several — they are the quietest voiced
    stretches in it, the bits between sentences that are not silence. Take the
    three best and reuse them.

    The absence of breath is a subliminal tell that costs nothing to fix, and
    it is the reason a perfectly-read AI paragraph still feels airless.
    """
    if not ref_path:
        return []
    try:
        wav, wsr = ta.load(str(ref_path))
    except Exception:
        return []
    mono = wav.mean(dim=0)
    hop = max(1, int(0.02 * wsr))
    n = mono.shape[0] // hop
    if n < 20:
        return []
    frames = mono[: n * hop].reshape(n, hop)
    energy = frames.pow(2).mean(dim=1).sqrt()
    peak = float(energy.max())
    if peak <= 0:
        return []
    # A breath sits above the noise floor and well below speech.
    lo, hi = peak * 0.02, peak * 0.13
    runs, start = [], None
    for i in range(n):
        quiet = lo < float(energy[i]) < hi
        if quiet and start is None:
            start = i
        elif not quiet and start is not None:
            if 6 <= i - start <= 25:  # 120ms .. 500ms
                runs.append((start, i))
            start = None
    if not runs:
        return []
    out = []
    for s, e in runs[:6]:
        seg = mono[s * hop : e * hop].unsqueeze(0)
        if wsr != sr:
            seg = ta.functional.resample(seg, wsr, sr)
        out.append(seg)
    return out[:3]


def take_key(text: str, energy: float, pace: float, temperature: float, ref: str | None) -> str:
    """Identity of a sentence's read. Anything that changes the audio is in it,
    so a cached winning seed is only reused for an identical request."""
    h = hashlib.sha1()
    h.update(f"{text}|{energy:.3f}|{pace:.3f}|{temperature:.3f}|{ref or ''}".encode("utf8"))
    return h.hexdigest()[:16]


def best_take(model, text, ref, energy, pace, temperature, target_seconds, seeds, log=None):
    """Generate `len(seeds)` takes and keep the highest-scoring one.

    Returns (wav, seed, score). The scorer lives in voice_direction.py so it
    can be tested without a model; everything about *why* those five terms is
    documented there.
    """
    best = None
    for seed in seeds:
        torch.manual_seed(seed)
        wav = trim(
            model.generate(
                text,
                audio_prompt_path=ref,
                exaggeration=energy,
                cfg_weight=pace,
                temperature=temperature,
            ).cpu(),
            model.sr,
        )
        s = score_take(wav.mean(dim=0).numpy(), model.sr, target_seconds)
        if log:
            log(f"        seed {seed:<5} {s['total']:.3f}  f0 {s['f0_range']:.2f} var {s['rate_var']:.2f} clean {s['clean']:.2f} {s['seconds']:.2f}s")
        if best is None or s["total"] > best[2]["total"]:
            best = (wav, seed, s)
    return best


def main() -> None:
    global torch, ta, ChatterboxTTS
    import torch
    import torchaudio as ta
    from chatterbox.tts import ChatterboxTTS

    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", help="reference wav to clone (default: brand/narrator.wav)")
    # Left unset, each beat uses its own direction from DELIVERY above.
    ap.add_argument("--exaggeration", type=float, help="override energy for every beat")
    ap.add_argument("--cfg", type=float, help="override pace for every beat")
    ap.add_argument("--track", help="only read one cut: long or short")
    ap.add_argument("--temperature", type=float, default=0.75)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--takes", type=int, default=DEFAULT_TAKES,
                    help="seeds swept per sentence; 1 restores the old one-take behaviour")
    ap.add_argument("--no-breath", action="store_true", help="skip sampled breaths")
    ap.add_argument("--redo", type=str, default="",
                    help="comma-separated beat numbers to regenerate (use after a drift report)")
    ap.add_argument("--verbose", action="store_true", help="print every take's score")
    args = ap.parse_args()
    redo = {int(x) for x in args.redo.split(",") if x.strip().isdigit()}

    ref = args.voice or (str(REF) if REF.exists() else None)
    if ref:
        print(f"reference voice: {ref} — every take clones it")
    else:
        print(
            "no reference voice — every take re-invents the speaker. "
            "Run tools/make-ref-voice.py once to pin one."
        )

    script = json.loads(SCRIPT.read_text(encoding="utf8"))
    OUT.mkdir(parents=True, exist_ok=True)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"chatterbox on {device}")
    model = ChatterboxTTS.from_pretrained(device=device)

    cache = json.loads(TAKES.read_text(encoding="utf8")) if TAKES.exists() else {}
    breaths = [] if args.no_breath else breath_bank(ref, model.sr)
    print(f"breaths: {len(breaths)} sampled from the reference" if breaths else "breaths: none (reference had no usable gap)")

    plan = []
    done = 0
    beats_all = script["beats"]
    for beat in beats_all:
        if not beat["vo"] or (args.track and beat.get("track", "long") != args.track):
            continue
        wav_path = OUT / f"beat-{beat['n']}.wav"
        # Resume, not redo: a killed run picks up where it stopped instead of
        # burning another hour of CPU re-saying the beats it already said.
        # Same seed either way, so the resumed take is identical to a fresh one.
        if beat["n"] in redo and wav_path.exists():
            wav_path.unlink()
        if wav_path.exists():
            meta = ta.info(str(wav_path))
            secs = meta.num_frames / meta.sample_rate
            plan.append(
                {
                    "n": beat["n"],
                    "name": beat["name"],
                    "spoken": speakable(beat["vo"]),
                    "energy": SCAM.get(beat["module"], DELIVERY.get(beat["module"], DEFAULT))[0],
                    "pace": SCAM.get(beat["module"], DELIVERY.get(beat["module"], DEFAULT))[1],
                    "holdAfter": SCAM.get(beat["module"], DELIVERY.get(beat["module"], DEFAULT))[2],
                    "seconds": round(secs, 3),
                }
            )
            done += 1
            continue
        energy, pace, hold = SCAM.get(beat["module"], DELIVERY.get(beat["module"], DEFAULT))
        if args.exaggeration is not None:
            energy = args.exaggeration
        if args.cfg is not None:
            pace = args.cfg

        # The beat's own setting is the centre of gravity; the direction plan
        # moves each sentence around it.
        lines = direct(
            speakable(beat["vo"]),
            energy,
            pace,
            is_reveal=bool(beat.get("reveal")),
            is_last_beat=beat is beats_all[-1],
        )

        segments = []
        scores = []
        for li, line in enumerate(lines):
            key = take_key(line.text, line.energy, line.pace, args.temperature, ref)
            cached = cache.get(key)
            # A cached winner is regenerated at its own seed rather than stored
            # as audio: one seed is 8 bytes, one take is a megabyte, and the
            # generation is deterministic given the seed.
            seeds = [cached["seed"]] if cached else [args.seed + 1000 * k for k in range(max(1, args.takes))]
            wav, seed, s = best_take(
                model, line.text, ref, line.energy, line.pace, args.temperature,
                line.target_seconds, seeds, log=print if args.verbose else None,
            )
            cache[key] = {"seed": seed, "score": s["total"], "text": line.text[:60]}
            scores.append(s)

            # A breath belongs *before* the line it prepares, and only where the
            # direction asked for one.
            if line.breath and breaths and li > 0:
                segments.append(breaths[li % len(breaths)] * 0.5)
            segments.append(wav)
            if line.hold > 0:
                segments.append(silence(line.hold, model.sr, wav.shape[0]))

        wav = torch.cat(segments, dim=-1) if segments else silence(0.2, model.sr)
        ta.save(str(wav_path), wav, model.sr)

        secs = wav.shape[-1] / model.sr
        mean_score = sum(s["total"] for s in scores) / max(1, len(scores))
        f0s = [s.get("f0_median", 0.0) for s in scores if s.get("f0_median")]
        plan.append(
            {
                "n": beat["n"],
                "name": beat["name"],
                "spoken": " ".join(l.text for l in lines),
                "energy": energy,
                "pace": pace,
                "holdAfter": hold,
                "seconds": round(secs, 3),
                # New, additive: align.py reads holdAfter and ignores the rest.
                "lines": [
                    {"text": l.text, "direction": l.direction, "energy": l.energy,
                     "pace": l.pace, "hold": l.hold}
                    for l in lines
                ],
                "score": round(mean_score, 3),
                "f0_median": round(sum(f0s) / len(f0s), 1) if f0s else 0.0,
            }
        )
        directions = "/".join(l.direction[0] for l in lines)
        print(f"  beat {beat['n']}  {secs:5.2f}s  score {mean_score:.3f}  [{directions}]  {lines[0].text[:52]}")

    print(f"  resumed {done} existing take(s)")
    PLAN.write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf8")
    TAKES.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf8")

    # --- drift: which takes wandered away from the episode's own voice
    drifted = drift_report(plan)
    if drifted:
        print(f"\nDRIFT   {len(drifted)} take(s) more than 2σ from the episode's median pitch:")
        for t in drifted:
            print(f"  beat {t['n']:<4} f0 {t['f0_median']:6.1f} vs {t['episode_median']:6.1f}  (z {t['z']:+.2f})")
        print(f"  re-roll just these:  python tools/voice.py --redo {','.join(str(t['n']) for t in drifted)}")
    else:
        print("\nDRIFT   none — the narrator holds one voice across the episode")

    weak = sorted((p for p in plan if p.get("score")), key=lambda p: p["score"])[:3]
    if weak:
        print("WEAKEST reads (regenerate with --redo if they sound flat):")
        for p in weak:
            print(f"  beat {p['n']:<4} score {p['score']:.3f}  {p['name']}")

    print(f"\n{OUT} — now run: python tools/align.py")


if __name__ == "__main__":
    main()
