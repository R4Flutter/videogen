"""video/src/lambo/script.json -> a directed Chatterbox read, one sentence at a time.

    .venv-tts/Scripts/python tools/lambo-voice.py

"The Lambo Houdini Kid" — the forex-Lamborghini reel. Same machinery as
tools/voice.py (best-of-N seeds, per-sentence direction, sampled breaths,
drift re-rolls), two differences:

  1. **All beats, both tracks.** voice.py filters on --track; this reel's
     narration is seven scenes and every one of them gets read, no filter.

  2. **Per-beat dials in the script.** Each beat carries its own energy,
     pace and holdAfter (the values the reel was written to) and they win
     over the module tables, which only fill in when a beat omits them.

Writes video/public/audio/lambo/beat-N.wav plus lambo-voice-plan.json (the
direction each beat was read with) and lambo-take-cache.json (winning seeds).

    --redo 2,5       regenerate specific beats
    --takes 1        one take per sentence (restores old behaviour)
    --voice ref.wav  clone a different reference (default brand/narrator.wav)
"""

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from voice_direction import direct, drift_report, score_take  # noqa: E402

# torch/chatterbox are imported inside main() so this module stays importable
# on interpreters without Chatterbox.

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "video/src/lambo/script.json"
OUT = ROOT / "video/public/audio/lambo"
PLAN = OUT / "lambo-voice-plan.json"
TAKES = OUT / "lambo-take-cache.json"
REF = ROOT / "brand/narrator.wav"

#: How many seeds to sweep per sentence. Four is the knee of the curve.
DEFAULT_TAKES = 4

# --------------------------------------------------------------- direction
# Chatterbox exposes exactly two performance dials, so delivery is those two
# plus the silence after the line. `exaggeration` is energy; `cfg` is pace,
# and lower is faster — they move together or an excited read comes out
# sluggish. These tables are the fallback; a beat's own energy/pace/holdAfter
# in the script wins when present.
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
    """Real breaths, lifted from the reference clip. The three quietest
    voiced stretches of the reference, reused before landing lines."""
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
    lo, hi = peak * 0.02, peak * 0.13
    runs, start = [], None
    for i in range(n):
        quiet = lo < float(energy[i]) < hi
        if quiet and start is None:
            start = i
        elif not quiet and start is not None:
            if 6 <= i - start <= 25:
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


def _dml_patch() -> None:
    """DirectML (AMD) cannot run stft/istft or complex tensors at all — the
    driver hard-crashes on ComplexFloat. Those spectral ops get routed to CPU
    with their results moved back; everything else stays on the GPU."""
    import torch

    orig_stft = torch.stft
    orig_istft = torch.istft

    def _cpu(fn):
        def wrapped(*args, **kwargs):
            x = kwargs.get("input") if "input" in kwargs else (args[0] if args else None)
            dev = getattr(x, "device", None)
            if dev is not None and dev.type == "privateuseone":
                x = x.cpu()
                if "input" in kwargs:
                    kwargs["input"] = x
                else:
                    args = (x,) + args[1:]
                for k in ("window", "length"):
                    w = kwargs.get(k)
                    if w is not None and getattr(w, "device", None) is not None:
                        kwargs[k] = w.cpu()
                return fn(*args, **kwargs)  # complex result stays on CPU
            return fn(*args, **kwargs)

        return wrapped

    torch.stft = _cpu(orig_stft)
    torch.istft = _cpu(orig_istft)

    from torchaudio import transforms as _ta_t

    def _safe_resampler(src_sr, dst_sr, device):
        inner = _ta_t.Resample(src_sr, dst_sr).cpu()

        def apply(wav):
            dev = wav.device
            return inner(wav.cpu()).to(dev)

        return apply

    from chatterbox.models.s3gen import s3gen as _s3gen_mod

    _s3gen_mod.get_resampler = _safe_resampler

    # conds.pt ships CUDA-stored; torch 2.4 weights_only ignores map_location
    # for CUDA storages. It is a trusted HF file, so plain torch.load is fine.
    from chatterbox.tts import Conditionals as _Conditionals, T3Cond as _T3Cond

    def _load_conds(cls, fpath, map_location="cpu"):
        if map_location is None:
            map_location = torch.device("cpu")
        kwargs = torch.load(fpath, map_location=map_location, weights_only=False)
        return cls(_T3Cond(**kwargs["t3"]), kwargs["gen"])

    _Conditionals.load = classmethod(_load_conds)

    # S3 tokenizer: log-mel on CPU, result back to the model device.
    from chatterbox.models.s3tokenizer.s3tokenizer import S3Tokenizer as _Tok, S3_HOP

    def _tok_mel(self, audio, padding=0):
        dev = audio.device
        audio = audio.cpu()
        if padding > 0:
            audio = torch.nn.functional.pad(audio, (0, padding))
        spec = torch.stft(audio, self.n_fft, S3_HOP,
                          window=self.window.cpu(), return_complex=True)
        magnitudes = spec[..., :-1].abs() ** 2
        mel = self._mel_filters.cpu() @ magnitudes
        log_spec = torch.clamp(mel, min=1e-10).log10()
        log_spec = torch.maximum(log_spec, log_spec.max() - 8.0)
        return ((log_spec + 4.0) / 4.0).to(dev)

    _Tok.log_mel_spectrogram = _tok_mel

    # Matcha-style 24k mel: same CPU detour.
    from chatterbox.models.s3gen.utils import mel as _mel_mod

    _orig_mel = _mel_mod.mel_spectrogram

    def _mel_safe(y, *a, **k):
        if isinstance(y, torch.Tensor) and y.device.type == "privateuseone":
            dev = y.device
            return _orig_mel(y.cpu(), *a, **k).to(dev)
        return _orig_mel(y, *a, **k)

    _mel_mod.mel_spectrogram = _mel_safe

    # Vocoder source module: stft/istft chain on CPU.
    from chatterbox.models.s3gen.hifigan import SourceModuleHnNSF as _SrcMod

    def _src_stft(self, x):
        dev = x.device
        spec = torch.stft(x.cpu(), self.istft_params["n_fft"],
                          self.istft_params["hop_len"], self.istft_params["n_fft"],
                          window=self.stft_window.cpu(), return_complex=True)
        spec = torch.view_as_real(spec)
        return spec[..., 0].to(dev), spec[..., 1].to(dev)

    def _src_istft(self, magnitude, phase):
        dev = magnitude.device
        magnitude, phase = magnitude.cpu(), phase.cpu()
        magnitude = torch.clip(magnitude, max=1e2)
        real = magnitude * torch.cos(phase)
        img = magnitude * torch.sin(phase)
        out = torch.istft(torch.complex(real, img), self.istft_params["n_fft"],
                          self.istft_params["hop_len"], self.istft_params["n_fft"],
                          window=self.stft_window.cpu())
        return out.to(dev)

    _SrcMod._stft = _src_stft
    _SrcMod._istft = _src_istft


def take_key(text: str, energy: float, pace: float, temperature: float, ref: str | None) -> str:
    """Identity of a sentence's read. Anything that changes the audio is in it,
    so a cached winning seed is only reused for an identical request."""
    h = hashlib.sha1()
    h.update(f"{text}|{energy:.3f}|{pace:.3f}|{temperature:.3f}|{ref or ''}".encode("utf8"))
    return h.hexdigest()[:16]


def best_take(model, text, ref, energy, pace, temperature, target_seconds, seeds, log=None):
    """Generate `len(seeds)` takes and keep the highest-scoring one."""
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
    global torch, ta, ChatterboxTTS, OUT, PLAN, TAKES
    import torch
    import torchaudio as ta
    from chatterbox.tts import ChatterboxTTS

    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", help="reference wav to clone (default: brand/narrator.wav)")
    ap.add_argument("--exaggeration", type=float, help="override energy for every beat")
    ap.add_argument("--cfg", type=float, help="override pace for every beat")
    ap.add_argument("--temperature", type=float, default=0.75)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--takes", type=int, default=DEFAULT_TAKES,
                    help="seeds swept per sentence; 1 restores the old one-take behaviour")
    ap.add_argument("--no-breath", action="store_true", help="skip sampled breaths")
    ap.add_argument("--redo", type=str, default="",
                    help="comma-separated beat numbers to regenerate (use after a drift report)")
    ap.add_argument("--out-dir", type=str, default="",
                    help="write beats + plan/cache here instead of video/public/audio/lambo (parallel runs)")
    ap.add_argument("--verbose", action="store_true", help="print every take's score")
    ap.add_argument("--device", type=str, default="cpu", choices=["cpu", "cuda", "dml"],
                    help="inference device (default: cpu; dml runs the AMD GPU via DirectML)")
    args = ap.parse_args()
    redo = {int(x) for x in args.redo.split(",") if x.strip().isdigit()}
    if args.out_dir:
        OUT = Path(args.out_dir)
        PLAN = OUT / "lambo-voice-plan.json"
        TAKES = OUT / "lambo-take-cache.json"

    ref = args.voice or (str(REF) if REF.exists() else None)
    print(f"reference voice: {ref} — every take clones it" if ref else "no reference voice")

    script = json.loads(SCRIPT.read_text(encoding="utf8"))
    print(f"script: {script['title']} — {sum(1 for b in script['beats'] if b['vo'])} voiced beats, all of them")
    OUT.mkdir(parents=True, exist_ok=True)

    if args.device == "cpu":
        device = "cpu"
    elif args.device == "cuda":
        if not torch.cuda.is_available():
            raise SystemExit("--device cuda but torch.cuda.is_available() is False")
        device = "cuda"
    else:
        try:
            import torch_directml  # AMD GPUs on Windows

            device = torch_directml.device()
            _dml_patch()
        except ImportError:
            raise SystemExit("--device dml but torch-directml is not installed") from None
    print(f"chatterbox on {device}")

    if device != "cpu":
        # conds.pt was saved on CUDA; with a non-CUDA backend chatterbox
        # leaves map_location=None and torch.load tries to deserialize onto
        # cuda. Load onto CPU, then .to(device) in from_local moves it.
        from chatterbox import tts as chatterbox_tts  # noqa: PLC0415

        _orig_load = chatterbox_tts.Conditionals.load

        def _load_conds(cls, fpath, map_location="cpu"):
            return _orig_load(fpath, map_location="cpu")

        chatterbox_tts.Conditionals.load = classmethod(_load_conds)
    model = ChatterboxTTS.from_pretrained(device=device)

    cache = json.loads(TAKES.read_text(encoding="utf8")) if TAKES.exists() else {}
    breaths = [] if args.no_breath else breath_bank(ref, model.sr)
    print(f"breaths: {len(breaths)} sampled from the reference" if breaths else "breaths: none (reference had no usable gap)")

    plan = []
    done = 0
    beats_all = script["beats"]
    for beat in beats_all:
        if not beat["vo"]:
            continue
        wav_path = OUT / f"beat-{beat['n']}.wav"
        # Resume, not redo: a killed run picks up where it stopped instead of
        # burning another hour of CPU re-saying the beats it already said.
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
                    "energy": beat.get("energy", SCAM.get(beat["module"], DELIVERY.get(beat["module"], DEFAULT))[0]),
                    "pace": beat.get("pace", SCAM.get(beat["module"], DELIVERY.get(beat["module"], DEFAULT))[1]),
                    "holdAfter": beat.get("holdAfter", SCAM.get(beat["module"], DELIVERY.get(beat["module"], DEFAULT))[2]),
                    "seconds": round(secs, 3),
                }
            )
            done += 1
            continue

        # The beat's own dials win; the module tables fill in the gaps; the
        # command line overrides both.
        energy, pace, hold = (
            beat.get("energy", SCAM.get(beat["module"], DELIVERY.get(beat["module"], DEFAULT))[0]),
            beat.get("pace", SCAM.get(beat["module"], DELIVERY.get(beat["module"], DEFAULT))[1]),
            beat.get("holdAfter", SCAM.get(beat["module"], DELIVERY.get(beat["module"], DEFAULT))[2]),
        )
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
        print(f"  re-roll just these:  python tools/lambo-voice.py --redo {','.join(str(t['n']) for t in drifted)}")
    else:
        print("\nDRIFT   none — the narrator holds one voice across the episode")

    weak = sorted((p for p in plan if p.get("score")), key=lambda p: p["score"])[:3]
    if weak:
        print("WEAKEST reads (regenerate with --redo if they sound flat):")
        for p in weak:
            print(f"  beat {p['n']:<4} score {p['score']:.3f}  {p['name']}")

    print(f"\n{OUT} — all {len(plan)} beats read")


if __name__ == "__main__":
    main()
