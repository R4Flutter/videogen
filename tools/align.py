"""Narration wavs -> word timings, and the episode retimed to fit them.

    python tools/align.py

Reads video/public/audio/vo/beat-N.wav, transcribes each with word timestamps,
maps those timings back onto the *scripted* words (so captions keep the spelling
the script wrote), then rewrites video/src/script.json so every beat sits where
the voice actually put it.

The script's timecodes are the author's intent. This is the cut: the voice is
the clock, and camera, music, sfx and text all conform to it.

Runs on the normal interpreter — faster-whisper uses CTranslate2, not torch, so
it stays clear of the Chatterbox venv.
"""

import argparse
import difflib
import json
import re
import sys
from pathlib import Path

# faster-whisper is imported inside main(): --selftest exercises the timing
# logic and must run anywhere, including where the model is not installed.
sys.path.insert(0, str(Path(__file__).resolve().parent))
from voice import speakable  # same normalisation the TTS was fed

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "video/src/script.json"
VOICE = ROOT / "video/src/voice.json"
VO = ROOT / "video/public/audio/vo"
PLAN = VO / "voice-plan.json"

HOLD = 0.35  # silence after a beat when voice-plan.json has no direction for it
MIN_BEAT = 1.2

norm = lambda w: re.sub(r"[^\w%]", "", w).lower()


def spoken_tokens(vo: str):
    """Every token the model was asked to say, tagged with the written word it
    came from — "$25,000" is one word on screen but three in the mouth."""
    toks, owners = [], []
    for i, word in enumerate(vo.split()):
        for tok in speakable(word).split():
            if norm(tok):
                toks.append(norm(tok))
                owners.append(i)
    return toks, owners


def word_times(vo: str, heard):
    """Scripted words, timed by what the recording actually says.

    `heard` is whisper's [(token, start, end)]. Aligning on the token stream
    rather than trusting equal counts means a dropped or merged word shifts the
    words around it instead of desynchronising the rest of the beat.
    """
    written = vo.split()
    toks, owners = spoken_tokens(vo)
    hw = [norm(w) for w, _, _ in heard]

    spans: dict[int, list[float]] = {}
    matcher = difflib.SequenceMatcher(None, toks, hw, autojunk=False)
    for a, b, size in matcher.get_matching_blocks():
        for k in range(size):
            owner = owners[a + k]
            _, start, end = heard[b + k]
            span = spans.setdefault(owner, [start, end])
            span[0] = min(span[0], start)
            span[1] = max(span[1], end)

    if not spans:  # nothing matched: fall back to an even split of the clip
        total = heard[-1][2] if heard else 0.0
        step = total / max(1, len(written))
        return [
            {"w": w, "start": i * step, "end": (i + 1) * step}
            for i, w in enumerate(written)
        ]

    # Words whisper never matched (a swallowed "a", an odd contraction) split the
    # gap between their timed neighbours rather than each guessing on its own.
    known = sorted(spans)
    out = []
    for i, w in enumerate(written):
        if i in spans:
            start, end = spans[i]
        else:
            before = max((j for j in known if j < i), default=None)
            after = min((j for j in known if j > i), default=None)
            a = spans[before][1] if before is not None else 0.0
            b = spans[after][0] if after is not None else spans[known[-1]][1]
            lo = before if before is not None else -1
            hi = after if after is not None else len(written)
            start = a + (b - a) * (i - lo) / (hi - lo)
            end = a + (b - a) * (i + 1 - lo) / (hi - lo)
        out.append({"w": w, "start": round(start, 3), "end": round(max(end, start + 0.05), 3)})

    # Monotonic: a caption that jumps backwards flickers.
    for i in range(1, len(out)):
        out[i]["start"] = max(out[i]["start"], out[i - 1]["start"])
        out[i]["end"] = max(out[i]["end"], out[i]["start"] + 0.05)
    return out


def selftest() -> None:
    """python tools/align.py --selftest — the logic worth breaking."""
    vo = "At 2:17 a.m. the phone moved for the last time."
    heard = [(w, i * 0.4, i * 0.4 + 0.35) for i, w in enumerate(speakable(vo).split())]
    words = word_times(vo, heard)
    assert [w["w"] for w in words] == vo.split(), "captions must keep the written words"
    assert all(a["start"] <= b["start"] for a, b in zip(words, words[1:])), "monotonic"

    # A word whisper never heard still gets time, between its neighbours.
    gapped = word_times(vo, [h for i, h in enumerate(heard) if i != 4])
    assert len(gapped) == len(vo.split())
    assert all(w["end"] > w["start"] for w in gapped)

    # Nothing recognised at all: fall back to an even split rather than crash.
    assert len(word_times(vo, [("zzz", 0.0, 2.0)])) == len(vo.split())

    # A written word the model says as several tokens owns all of their time.
    money = word_times("It cost $25,000 total.", [
        ("It", 0.0, 0.2), ("cost", 0.2, 0.5), ("25000", 0.5, 1.1),
        ("dollars", 1.1, 1.6), ("total", 1.6, 2.0),
    ])
    at = {w["w"]: (w["start"], w["end"]) for w in money}
    assert at["$25,000"] == (0.5, 1.6), at["$25,000"]
    print("ok — word timing survives dropped, merged and unheard words")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="base.en")
    ap.add_argument("--track", help="only retime one cut: long or short")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()
    if args.selftest:
        return selftest()

    from faster_whisper import WhisperModel

    script = json.loads(SCRIPT.read_text(encoding="utf8"))
    hold = (
        {p["n"]: p["holdAfter"] for p in json.loads(PLAN.read_text(encoding="utf8"))}
        if PLAN.exists()
        else {}
    )
    model = WhisperModel(args.model, device="cpu", compute_type="int8")

    kept = (
        {t["n"]: t for t in json.loads(VOICE.read_text(encoding="utf8"))["beats"]}
        if args.track and VOICE.exists()
        else {}
    )
    takes = []
    # The two cuts are two timelines. A vertical cut starts at zero, not at the
    # end of the documentary.
    clock = {"long": 0.0, "short": 0.0}
    for beat in script["beats"]:
        key = beat.get("track", "long")
        # A cut nobody recorded keeps the timing the script gave it, so the
        # vertical can be re-voiced without re-reading the documentary. Its take
        # is carried over rather than dropped: voice.json is both cuts.
        if args.track and key != args.track:
            if beat["n"] in kept:
                takes.append(kept[beat["n"]])
            continue
        path = VO / f"beat-{beat['n']}.wav"

        if not beat["vo"]:
            # A silent beat — a chapter card, a held frame. It keeps the length
            # the script gave it and has no words to time.
            dur = max(MIN_BEAT, round(beat["end"] - beat["start"], 3))
            take = {"n": beat["n"], "file": "", "dur": dur, "speech": 0.0, "words": []}
        else:
            if not path.exists():
                raise SystemExit(f"missing {path} — run tools/voice.py first")
            segments, info = model.transcribe(
                str(path), word_timestamps=True, initial_prompt=speakable(beat["vo"])
            )
            heard = [
                (w.word.strip(), w.start, w.end) for s in segments for w in (s.words or [])
            ]
            words = word_times(beat["vo"], heard)
            speech = words[-1]["end"] if words else info.duration
            dur = max(MIN_BEAT, round(speech + hold.get(beat["n"], HOLD), 3))
            take = {
                "n": beat["n"],
                "file": f"vo/{path.name}",
                "dur": dur,
                "speech": round(speech, 3),
                "words": words,
            }
            print(f"  beat {beat['n']:>3}  {speech:5.2f}s speech  {len(words)} words")

        take["start"] = round(clock[key], 3)
        beat["start"] = take["start"]
        beat["end"] = round(clock[key] + take["dur"], 3)
        clock[key] = beat["end"]
        takes.append(take)

    if args.track != "short":
        # An episode with no long cut at all — the scam engine reads only the
        # vertical — has one timeline, and its runtime IS the episode runtime.
        # Writing clock["long"] there zeroes the composition to a single frame.
        script["durationInSeconds"] = round(clock["long"] or clock["short"], 3)
    if args.track != "long":
        script["shortSeconds"] = round(clock["short"], 3)

    SCRIPT.write_text(json.dumps(script, indent=2, ensure_ascii=False), encoding="utf8")
    VOICE.write_text(
        json.dumps(
            {
                "total": script["durationInSeconds"],
                "shortTotal": script["shortSeconds"],
                "beats": takes,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf8",
    )
    mins = f"{int(clock['long'] // 60)}:{round(clock['long'] % 60):02d}"
    print(f"\n{mins} documentary — {VOICE.name} written, script.json retimed")


if __name__ == "__main__":
    main()
