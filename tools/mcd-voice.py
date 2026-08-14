"""A Chatterbox read of a business story's scenes -> video/public/audio/mcd.

    .venv-tts/Scripts/python tools/mcd-voice.py [--story src/mcd/stories/forexLamboBusinessStory.json]

One take per scene, best-of-N seeds, reference voice brand/narrator.wav,
breaths before landing lines — the same machinery as tools/voice.py, minus
the beat/script.json coupling. Reads the story's own narration (scenes[].narration
drives the durations via the timeline engine) and the derived timeline JSON
(written by mcd-timeline.mjs), so nothing here knows a frame number. Writes
video/public/audio/mcd/beat-N.wav, a plan manifest, and a single mixed
narration.wav placed at each scene's start time so the render step can mux
it straight onto the video.

    --mix off        generate the takes but skip the mixed track
    --redo 2,5       regenerate specific scenes
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from voice import (  # noqa: E402
    DEFAULT_TAKES,
    breath_bank,
    silence,
    speakable,
    take_key,
    trim,
)
from voice_direction import direct  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "video/public/audio/mcd"
MIXED = OUT / "narration.wav"
PLAN = OUT / "mcd-voice-plan.json"
TAKES = OUT / "mcd-take-cache.json"
REF = ROOT / "brand/narrator.wav"

DEFAULT_STORY = ROOT / "video/src/mcd/stories/forexLamboBusinessStory.json"


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
    from chatterbox.models.s3tokenizer.s3tokenizer import S3Tokenizer as _Tok

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


def main() -> None:
    import torch
    import torchaudio as ta
    from chatterbox.tts import ChatterboxTTS

    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", help=f"reference wav to clone (default: {REF})")
    ap.add_argument("--story", type=Path, default=DEFAULT_STORY,
                    help="story JSON whose scenes[].narration is read (default: forex lambo)")
    ap.add_argument("--timeline", type=Path, default=None,
                    help="derived timeline JSON (default: <story-dir>/<story-id>.timeline.json)")
    ap.add_argument("--takes", type=int, default=DEFAULT_TAKES)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--temperature", type=float, default=0.75)
    ap.add_argument("--redo", type=str, default="", help="comma-separated scene indexes to regenerate")
    ap.add_argument("--mix", type=str, default="on", choices=["on", "off"])
    ap.add_argument("--verbose", action="store_true")
    ap.add_argument("--device", type=str, default="cpu", choices=["cpu", "cuda", "dml"],
                    help="inference device (default: cpu; dml is experimental on AMD)")
    args = ap.parse_args()

    redo = {int(x) for x in args.redo.split(",") if x.strip().isdigit()}
    ref = args.voice or (str(REF) if REF.exists() else None)
    print(f"reference voice: {ref}" if ref else "no reference voice")

    story = json.loads(args.story.read_text(encoding="utf8"))
    scenes = story["scenes"]
    timeline_path = args.timeline or (args.story.parent / f"{story['id']}.timeline.json")
    timeline = json.loads(timeline_path.read_text(encoding="utf8"))
    total_seconds = timeline["totalSeconds"]
    starts = [s["startSec"] for s in timeline["scenes"]]
    print(f"story: {story['id']} — {len(scenes)} scenes, {total_seconds:.1f}s timeline")
    for w in timeline.get("warnings", []):
        print(f"  QC {w}")

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
    model.sr

    cache = json.loads(TAKES.read_text(encoding="utf8")) if TAKES.exists() else {}
    breaths = breath_bank(ref, model.sr)
    print(f"breaths: {len(breaths)} sampled from the reference" if breaths else "breaths: none")

    OUT.mkdir(parents=True, exist_ok=True)
    plan = []
    segments_by_scene = {}

    for i, scene in enumerate(scenes):
        wav_path = OUT / f"beat-{i}.wav"
        start_sec = starts[i]
        if i in redo and wav_path.exists():
            wav_path.unlink()
        if wav_path.exists():
            meta = ta.info(str(wav_path))
            secs = meta.num_frames / meta.sample_rate
            print(f"  scene {i} ({scene['id']})  {secs:5.2f}s  resumed")
            plan.append({"index": i, "scene": scene["id"], "startSec": start_sec, "seconds": round(secs, 3)})
            continue

        spoken = speakable(" ".join(scene["narration"]))
        is_last = i == len(scenes) - 1
        directed = direct(
            spoken,
            scene.get("energy", 0.42),
            scene.get("pace", 0.52),
            is_reveal=scene["type"] in ("hook", "finale"),
            is_last_beat=is_last,
        )

        parts = []
        for li, d in enumerate(directed):
            key = take_key(d.text, d.energy, d.pace, args.temperature, ref)
            cached = cache.get(key)
            seeds = [cached["seed"]] if cached else [args.seed + 1000 * k for k in range(max(1, args.takes))]
            best = None
            for seed in seeds:
                torch.manual_seed(seed)
                wav = trim(
                    model.generate(
                        d.text,
                        audio_prompt_path=ref,
                        exaggeration=d.energy,
                        cfg_weight=d.pace,
                        temperature=args.temperature,
                    ).cpu(),
                    model.sr,
                )
                from voice_direction import score_take  # noqa: PLC0415

                s = score_take(wav.mean(dim=0).numpy(), model.sr, d.target_seconds)
                if args.verbose:
                    print(f"        seed {seed:<5} {s['total']:.3f}  {s['seconds']:.2f}s")
                if best is None or s["total"] > best[2]["total"]:
                    best = (wav, seed, s)
            wav, seed, s = best
            cache[key] = {"seed": seed, "score": s["total"], "text": d.text[:60]}

            if d.breath and breaths and li > 0:
                parts.append(breaths[li % len(breaths)] * 0.5)
            parts.append(wav)
            if d.hold > 0:
                parts.append(silence(d.hold, model.sr, wav.shape[0]))

        wav = torch.cat(parts, dim=-1) if parts else silence(0.2, model.sr)
        ta.save(str(wav_path), wav, model.sr)
        secs = wav.shape[-1] / model.sr
        plan.append({"index": i, "scene": scene["id"], "startSec": start_sec, "seconds": round(secs, 3)})
        print(f"  scene {i} ({scene['id']})  {secs:5.2f}s  {directed[0].text[:52]}")

    PLAN.write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf8")
    TAKES.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf8")

    if args.mix == "off":
        return

    sr = model.sr
    total = int(total_seconds * sr)
    mixed = torch.zeros(1, total)
    for p in plan:
        wav = ta.load(str(OUT / f"beat-{p['index']}.wav"))[0]
        start = int(p["startSec"] * sr)
        end = min(total, start + wav.shape[-1])
        if start < total:
            mixed[:, start:end] = wav[:, : end - start]
    ta.save(str(MIXED), mixed, sr)
    print(f"\n{MIXED}  {MIXED.stat().st_size / 1e6:.1f}MB — mix ready, mux onto the render with ffmpeg")


if __name__ == "__main__":
    main()