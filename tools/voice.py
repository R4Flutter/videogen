"""script.json narration -> one directed Chatterbox take per beat.

    .venv-tts/Scripts/python tools/voice.py [--voice ref.wav]

Chatterbox pins torch==2.6.0, so it lives in its own venv and never touches the
interpreter that runs tools/align.py. Writes video/public/audio/vo/beat-N.wav
plus voice-plan.json (the direction each beat was read with); align.py turns
those takes into word timings and retimes the episode around them.
"""

import argparse
import json
import re
from pathlib import Path

# torch/chatterbox are imported inside main(): align.py borrows speakable() and
# runs on the interpreter that has no Chatterbox in it.

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "video/src/script.json"
OUT = ROOT / "video/public/audio/vo"
PLAN = OUT / "voice-plan.json"

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


def main() -> None:
    global torch, ta, ChatterboxTTS
    import torch
    import torchaudio as ta
    from chatterbox.tts import ChatterboxTTS

    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", help="reference wav to clone (7-20s of clean speech)")
    # Left unset, each beat uses its own direction from DELIVERY above.
    ap.add_argument("--exaggeration", type=float, help="override energy for every beat")
    ap.add_argument("--cfg", type=float, help="override pace for every beat")
    ap.add_argument("--track", help="only read one cut: long or short")
    ap.add_argument("--temperature", type=float, default=0.75)
    ap.add_argument("--seed", type=int, default=7)
    args = ap.parse_args()

    script = json.loads(SCRIPT.read_text(encoding="utf8"))
    OUT.mkdir(parents=True, exist_ok=True)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"chatterbox on {device}")
    model = ChatterboxTTS.from_pretrained(device=device)

    plan = []
    for beat in script["beats"]:
        if not beat["vo"] or (args.track and beat.get("track", "long") != args.track):
            continue
        energy, pace, hold = SCAM.get(beat["module"], DELIVERY.get(beat["module"], DEFAULT))
        if args.exaggeration is not None:
            energy = args.exaggeration
        if args.cfg is not None:
            pace = args.cfg
        text = speakable(beat["vo"])

        # Same seed every beat, so re-running the pipeline gives the same read.
        torch.manual_seed(args.seed)
        wav = trim(
            model.generate(
                text,
                audio_prompt_path=args.voice,
                exaggeration=energy,
                cfg_weight=pace,
                temperature=args.temperature,
            ).cpu(),
            model.sr,
        )
        ta.save(str(OUT / f"beat-{beat['n']}.wav"), wav, model.sr)

        secs = wav.shape[-1] / model.sr
        plan.append(
            {
                "n": beat["n"],
                "name": beat["name"],
                "spoken": text,
                "energy": energy,
                "pace": pace,
                "holdAfter": hold,
                "seconds": round(secs, 3),
            }
        )
        print(f"  beat {beat['n']}  {secs:5.2f}s  e{energy} p{pace}  {text}")

    PLAN.write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf8")
    print(f"\n{OUT} — now run: python tools/align.py")


if __name__ == "__main__":
    main()
