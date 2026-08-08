"""Synthesise brand/narrator.wav — the one voice every episode clones.

    .venv-tts/Scripts/python tools/make-ref-voice.py

Chatterbox re-invents its speaker on every call when no reference prompt is
given. One clean take, saved here, becomes the timbre and tempo every other
take inherits: voice.py defaults --voice to this file. Deterministic — same
seed, same file — so re-running the pipeline can never drift the speaker.
Re-run this only when you actually want a new narrator.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "brand"
REF = OUT / "narrator.wav"

# Neutral, measured, ~15 s. The reference is a voiceprint first and a prosody
# sample second, so it reads like the documentary this channel makes rather
# than like an advertisement — every take inherits this tempo.
TEXT = (
    "A two dollar task becomes a two hundred fifty dollar lesson. "
    "Not because of money, because of trust, built one small payment at a "
    "time. The platform pays on time. The balance grows. Support answers in "
    "minutes. None of it is real, and this is how it works."
)


def main() -> None:
    import torch
    import torchaudio as ta
    from chatterbox.tts import ChatterboxTTS

    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from voice import trim

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"chatterbox on {device}")
    model = ChatterboxTTS.from_pretrained(device=device)

    torch.manual_seed(7)
    wav = trim(
        model.generate(TEXT, exaggeration=0.42, cfg_weight=0.52, temperature=0.75).cpu(),
        model.sr,
    )

    OUT.mkdir(parents=True, exist_ok=True)
    ta.save(str(REF), wav, model.sr)
    print(f"{REF}  {wav.shape[-1] / model.sr:.2f}s  — every take now clones this voice")


if __name__ == "__main__":
    main()
