"""Mux narration + music + SFX into a silent MCD render, story-driven.

Reads the derived timeline JSON (written by mcd-timeline.mjs from the story's
own narration + cues) and the voice plan (written by mcd-voice.py), then
places every beat and every SFX cue at the frame the engine computed — no
scene starts, no cue lists, no magic numbers live here.

    .venv/Scripts/python.exe tools/mcd-mux.py \
        --story video/src/mcd/stories/forexLamboBusinessStory.json \
        --video video/out/ForexLamboBusinessStory.mp4

Each beat is edge-trimmed, pause-clamped and atempo-fitted into its own scene
window (the engine's static-shot cap makes every window short, so a beat that
cannot fit warns instead of silently bleeding over the next scene). The mix
is two-pass linear loudnorm at -14 LUFS and muxed with -c:v copy.
"""
import argparse
import array
import json
import re
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BEATS = ROOT / "video/public/audio/mcd"
PLAN = BEATS / "mcd-voice-plan.json"
MUSIC = ROOT / "video/public/audio/music.wav"
SFX = ROOT / "video/public/audio"
WORK = Path(r"C:\Users\naikr\AppData\Local\Temp\opencode\mcd-mix")
WORK.mkdir(parents=True, exist_ok=True)

DEFAULT_STORY = ROOT / "video/src/mcd/stories/forexLamboBusinessStory.json"
FPS = 30
GAP = 0.12  # breath gap between beats after pause-clamping
MAX_ATEMPO = 1.6  # faster than this reads as chipmunk — warn instead

CUE_ASSET = {
    "whoosh": ("whoosh.wav", 0.45),
    "tick": ("tick.wav", 0.55),
    "impact": ("boom.wav", 0.65),
    "chart": ("shimmer.wav", 0.5),
    "money": ("pop.wav", 0.5),
    "transition": ("riser.wav", 0.4),
}

FFMPEG = r"C:\Users\naikr\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0-full_build\bin\ffmpeg.exe"


def run(*args: str, capture: bool = False) -> str | None:
    if capture:
        out = subprocess.run([FFMPEG, "-y", "-v", "error", *args],
                             capture_output=True, text=True)
        if out.returncode != 0:
            raise subprocess.CalledProcessError(out.returncode, out.args)
        return out.stderr
    subprocess.run([FFMPEG, "-y", "-v", "error", *args], check=True)
    return None


def probe(path: Path) -> float:
    out = subprocess.run(
        [FFMPEG, "-i", str(path), "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    for line in out.splitlines():
        if "Duration:" in line:
            h, m, s = line.split("Duration:")[1].split(",")[0].strip().split(":")
            return int(h) * 3600 + int(m) * 60 + float(s)
    raise SystemExit(f"cannot probe {path}")


def trim_beat(n: int, src: Path) -> Path:
    """Edge-trim + clamp internal pauses to <=0.15s, write beat-n.trim.wav.

    Done in Python (wave/array) because this ffmpeg build rejects
    `start_periods=-1` in silenceremove. Threshold -42 dB ~ 0.008 amplitude.
    """
    with wave.open(str(src), "rb") as w:
        assert w.getframerate() == 24000 and w.getnchannels() == 1 and w.getsampwidth() == 2
        s = array.array("h")
        s.frombytes(w.readframes(w.getnframes()))

    thr = int(0.008 * 32768)
    sr = 24000

    def quiet(i: int) -> bool:
        return abs(s[i]) < thr

    # Trim leading/trailing silence, keep 0.05s pad.
    i = 0
    while i < len(s) and quiet(i):
        i += 1
    j = len(s)
    while j > i and quiet(j - 1):
        j -= 1
    s = s[max(0, i - int(0.05 * sr)) : min(len(s), j + int(0.05 * sr))]

    # Clamp internal pauses: any run of silence >= 0.22s becomes 0.12s.
    out = array.array("h")
    i = 0
    while i < len(s):
        if quiet(i):
            j = i
            while j < len(s) and quiet(j):
                j += 1
            run_len = j - i
            if run_len >= int(0.22 * sr):
                out.extend(s[i : i + int(0.12 * sr)])
            else:
                out.extend(s[i:j])
            i = j
        else:
            out.append(s[i])
            i += 1

    dst = WORK / f"beat-{n}.trim.wav"
    with wave.open(str(dst), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(out.tobytes())
    return dst


def fit_beat(n: int, trimmed: Path, atempo: float) -> Path:
    dst = WORK / f"beat-{n}.fit.wav"
    run("-i", str(trimmed), "-af", f"atempo={atempo:.4f}", "-ar", "48000", "-ac", "2", str(dst))
    return dst


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--story", type=Path, default=DEFAULT_STORY, help="story JSON (default: forex lambo)")
    ap.add_argument("--video", type=Path, default=None, help="silent render to mux onto (default: video/out/<story-id>.mp4)")
    ap.add_argument("--out", type=Path, default=None, help="output path (default: video/out/<story-id>_viral.mp4)")
    ap.add_argument("--skip-voice", action="store_true", help="music + SFX only (narration already inside the render)")
    args = ap.parse_args()

    story = json.loads(args.story.read_text(encoding="utf8"))
    sid = story["id"]
    timeline = json.loads((args.story.parent / f"{sid}.timeline.json").read_text(encoding="utf8"))
    total = timeline["totalSeconds"]
    video = args.video or (ROOT / f"video/out/{sid}.mp4")
    out = args.out or (ROOT / f"video/out/{sid}_viral.mp4")

    if not video.exists():
        raise SystemExit(f"{video} not found — render the silent cut first")
    print(f"[mcd-mux] {sid}  video {probe(video):.2f}s  timeline {total:.2f}s")

    n_scenes = len(timeline["scenes"])
    windows = [(s["startSec"], s["durationSec"]) for s in timeline["scenes"]]

    # 1. Tighten each beat and fit it into its own scene window.
    trimmed, durs, atempos, delays = [], [], [], []
    for n in range(n_scenes):
        src = BEATS / f"beat-{n}.wav"
        if args.skip_voice or not src.exists():
            continue
        t = trim_beat(n, src)
        trimmed.append(t)
        raw = probe(t)
        durs.append(raw)
        start, window = windows[n]
        atempo = max(1.0, raw / max(0.5, window - 0.35))
        if atempo > MAX_ATEMPO:
            print(f"  WARNING beat {n} ({raw:.2f}s) cannot fit {window:.2f}s window — atempo {atempo:.2f}")
        atempos.append(min(MAX_ATEMPO, atempo))
        delays.append(start)
        print(f"  beat {n}: {raw:5.2f}s -> {raw / atempo:5.2f}s  in {window:.2f}s window (atempo {atempo:.3f})")

    fitted = [fit_beat(n, t, a) for n, (t, a) in enumerate(zip(trimmed, atempos))]

    # 2. SFX cues come from the timeline itself.
    cues = []
    for s in timeline["scenes"]:
        for c in s["cues"]:
            cues.append((c["sec"], c["cue"]))
    print(f"  {len(cues)} cues from timeline: {', '.join(f'{c[1]}@{c[0]:.2f}s' for c in cues[:8])}{'…' if len(cues) > 8 else ''}")

    # 3. Build the audio mix.
    inputs = []
    for f in fitted:
        inputs += ["-i", str(f)]
    inputs += ["-stream_loop", "-1", "-i", str(MUSIC)]
    assets = list(dict.fromkeys(CUE_ASSET[cue] for _, cue in cues))
    for name, _ in assets:
        inputs += ["-i", str(SFX / name)]

    n_voice = len(fitted)
    i_music = n_voice
    i_asset = {name: n_voice + 1 + i for i, (name, _) in enumerate(assets)}

    fc = []
    for i in range(n_voice):
        ms = int(delays[i] * 1000)
        fc.append(f"[{i}:a]aresample=48000,adelay={ms}|{ms}[v{i}]")
    voice_ins = "".join(f"[v{i}]" for i in range(n_voice))
    if n_voice:
        fc.append(f"{voice_ins}amix=inputs={n_voice}:normalize=0[voice]")
        fc.append("[voice]asplit[vout][vk]")
        fc.append("[vk]pan=mono|c0=c0[voicekey]")
    else:
        fc.append(f"[{i_music}:a]anull[duckedsrc]")

    # Viral bed: hot, bass-forward, sidechain-ducked under the voice so it
    # is loud in the gaps and never buries the narration. The key MUST come
    # from an asplit copy — feeding [voice] straight into the sidechain
    # corrupts the adelay'd frames and silences the later beats.
    fc.append(
        f"[{i_music}:a]atrim=0:{total},"
        f"bass=g=4:f=120,volume=0.55[dup]"
    )
    key = "[voicekey]" if n_voice else "[duckedsrc]"
    fc.append(f"[dup]{key}sidechaincompress=threshold=0.04:ratio=10:"
              "attack=120:release=700:makeup=1[ducked]")
    fc.append(f"[ducked]afade=t=in:st=0:d=0.6,afade=t=out:st="
              f"{total - 1.2}:d=1.2[music]")

    # One bus per asset, each cue delayed to its computed frame.
    sfx_buses = []
    for wav_name, vol in assets:
        idx = i_asset[wav_name]
        cue_key = next(k for k, v in CUE_ASSET.items() if v[0] == wav_name)
        placed = [c for c in cues if c[1] == cue_key]
        if not placed:
            continue
        outs = []
        for k, (sec, _) in enumerate(placed):
            ms = int(sec * 1000)
            outs.append(f"sfx{k}")
            fc.append(f"[{idx}:a]adelay={ms}|{ms},volume={vol}[sfx{k}]")
        ins = "".join(f"[{o}]" for o in outs)
        bus = f"bus_{wav_name}"
        fc.append(f"{ins}amix=inputs={len(outs)}:normalize=0[{bus}]")
        sfx_buses.append(bus)

    if n_voice:
        mix_ins = "[vout][music]" + "".join(f"[{b}]" for b in sfx_buses)
        n_mix = 2 + len(sfx_buses)
    else:
        mix_ins = "[music]" + "".join(f"[{b}]" for b in sfx_buses)
        n_mix = 1 + len(sfx_buses)
    fc.append(f"{mix_ins}amix=inputs={n_mix}:normalize=0[aout]")

    premix = WORK / "premix.wav"
    run(*inputs, "-filter_complex", ";".join(fc), "-map", "[aout]", "-ar", "48000", "-ac", "2", str(premix))
    print(f"  premix written: {premix}  ({probe(premix):.2f}s)")

    # 4. Normalize with two-pass linear loudnorm — single-pass dynamic mode
    #    pumps gain unevenly across the timeline; linear with measured values
    #    applies one constant gain and lands exactly on -14 LUFS.
    meas = subprocess.run(
        [FFMPEG, "-y", "-v", "info", "-i", str(premix),
         "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json",
         "-f", "null", "-"],
        capture_output=True, text=True,
    ).stderr
    vals = {}
    for m in re.finditer(r'"(\w+)"\s*:\s*"?(-?[\d.]+)"?', meas):
        vals[m.group(1)] = m.group(2)
    ln = ("loudnorm=I=-14:TP=-1.5:LRA=11:linear=true:"
          f"measured_I={vals['input_i']}:measured_TP={vals['input_tp']}:"
          f"measured_LRA={vals['input_lra']}:measured_thresh={vals['input_thresh']}")
    mix = WORK / "mix.wav"
    run("-i", str(premix), "-af", ln, "-ar", "48000", "-ac", "2", str(mix))
    print(f"  mix written: {mix}  ({probe(mix):.2f}s)")

    # 5. Mux audio into the existing video track.
    run("-i", str(video), "-i", str(mix), "-map", "0:v", "-map", "1:a",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(out))
    print(f"  done -> {out}")


if __name__ == "__main__":
    main()