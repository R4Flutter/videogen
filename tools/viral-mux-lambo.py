"""Mux narration + music + SFX into the silent forex-lambo-short render.

The portrait short was rendered without an audio track (media analyzer shows
-70 LUFS / silent). The narration beats, voice plan, music bed and SFX all
exist — this tool places them on the 7-scene timeline, tightens the beats so
the narration lands inside 43.6s, mixes at -14 LUFS, and muxes the audio into
the existing video track (no re-render).

    .venv/Scripts/python.exe tools/viral-mux-lambo.py [--out out/forex-lambo-short_viral.mp4]
"""
import argparse
import array
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VIDEO = ROOT / "video/out/forex-lambo-short.mp4"
BEATS = ROOT / "video/public/audio/lambo"
MUSIC = ROOT / "video/public/audio/music.wav"
SFX = ROOT / "video/public/audio"
WORK = Path(r"C:\Users\naikr\AppData\Local\Temp\opencode\lambo-mix")
WORK.mkdir(parents=True, exist_ok=True)

FPS = 30
VIDEO_END = 43.6          # 1308 frames / 30
NARRATION_END = 43.3      # land the last word ~0.3s before the video ends
GAP = 0.12                # breath gap between beats after pause-clamping

# Scene starts (frames from src/mcd/data/timeline.ts, flash cut = 3 frames).
SCENE_STARTS = [0, 123, 276, 459, 672, 885, 1098]
CUT_SECONDS = [s / FPS for s in SCENE_STARTS[1:]]  # flash cuts: 4.1..36.6

# Every cue the scene code registers (src/mcd/scenes/*.tsx), as
# (absolute_frame, cue_name). Mapping to assets:
#   whoosh -> whoosh.wav (scene entry)   tick -> tick.wav (counters/milestones)
#   impact -> boom.wav (payoff hits)     chart -> shimmer.wav (bar growth)
#   money  -> pop.wav (hub streams)      transition -> riser.wav (finale wall)
CUES = [
    # GlobalScale (start 123): whoosh + milestone ticks at 7/16/29/46/66
    (123, "whoosh"), (130, "tick"), (139, "tick"), (152, "tick"),
    (169, "tick"), (189, "tick"),
    # WorldMapScene (start 276): whoosh + region ticks at from=12+i*24.67
    (276, "whoosh"), (288, "tick"), (313, "tick"), (337, "tick"),
    (362, "tick"), (386, "tick"), (411, "tick"),
    (312, "money"), (337, "money"), (361, "money"),
    (386, "money"), (410, "money"), (435, "money"),
    # MoneyScene (start 459): whoosh + revenue ticks at steps 0/24/48/78/110/140/192
    (459, "whoosh"), (459, "tick"), (487, "tick"), (511, "tick"),
    (541, "tick"), (573, "tick"), (603, "tick"), (655, "tick"),
    (663, "impact"),
    # BusinessModel (start 672): whoosh + impact
    (672, "whoosh"), (924, "impact"),
    # DataStory (start 885): whoosh + chart ticks at 23/31/39 + impact
    (885, "whoosh"), (908, "chart"), (916, "chart"), (924, "chart"),
    (1002, "impact"),
    # Finale (start 1098): whoosh at 17, riser into wall fade at 127, impacts
    (1115, "whoosh"), (1225, "transition"), (1242, "impact"), (1279, "impact"),
]

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
            run = j - i
            if run >= int(0.22 * sr):
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
    ap.add_argument("--out", default=str(ROOT / "video/out/forex-lambo-short_viral.mp4"))
    args = ap.parse_args()

    if not VIDEO.exists():
        raise SystemExit(f"{VIDEO} not found — render the portrait short first")
    print(f"[viral-mux] {VIDEO.name}  video length {probe(VIDEO):.2f}s")

    # 1. Tighten each beat.
    trimmed, durs = [], []
    for n in range(1, 8):
        src = BEATS / f"beat-{n}.wav"
        if not src.exists():
            raise SystemExit(f"missing narration beat {src}")
        t = trim_beat(n, src)
        trimmed.append(t)
        durs.append(probe(t))
        print(f"  beat {n}: {probe(src):5.2f}s -> {durs[-1]:5.2f}s")

    # 2. Fit: narration runs back-to-back (voice over visuals, like the
    #    outliers), so only the total matters. atempo ~3% is inaudible.
    total_raw = sum(durs) + GAP * (len(durs) - 1)
    atempo = max(1.0, total_raw / NARRATION_END)
    print(f"  narration {total_raw:.2f}s -> {NARRATION_END:.2f}s  (atempo {atempo:.3f})")

    fitted, cum = [], 0.0
    delays = []
    for n, (t, d) in enumerate(zip(trimmed, durs), 1):
        f = fit_beat(n, t, atempo)
        fitted.append(f)
        delays.append(cum)
        cum += d / atempo + GAP
    print(f"  narration ends {cum - GAP:.2f}s  (video {VIDEO_END:.2f}s)")

    # 3. Build the audio mix.
    inputs = []
    for f in fitted:
        inputs += ["-i", str(f)]
    inputs += ["-stream_loop", "-1", "-i", str(MUSIC)]
    for name in ("whoosh.wav", "boom.wav", "riser.wav"):
        inputs += ["-i", str(SFX / name)]

    n_voice = len(fitted)
    i_music, i_whoosh, i_boom, i_riser = n_voice, n_voice + 1, n_voice + 2, n_voice + 3

    fc = []
    for i in range(n_voice):
        fc.append(f"[{i}:a]aresample=48000,adelay={int(delays[i] * 1000)}|{int(delays[i] * 1000)}[v{i}]")
    voice_ins = "".join(f"[v{i}]" for i in range(n_voice))
    fc.append(f"{voice_ins}amix=inputs={n_voice}:normalize=0[voice]")
    fc.append("[voice]asplit[vout][vk]")
    fc.append("[vk]pan=mono|c0=c0[voicekey]")

    # Viral bed: hot, bass-forward, sidechain-ducked under the voice so it
    # is loud in the gaps and never buries the narration. Note: the key MUST
    # come from an asplit copy — feeding [voice] straight into the sidechain
    # corrupts the adelay'd frames and silences beats 2..7.
    fc.append(
        f"[{i_music}:a]atrim=0:{VIDEO_END},"
        f"bass=g=4:f=120,volume=0.55[dup]"
    )
    fc.append("[dup][voicekey]sidechaincompress=threshold=0.04:ratio=10:"
              "attack=120:release=700:makeup=1[ducked]")
    fc.append("[ducked]afade=t=in:st=0:d=0.6,afade=t=out:st="
              f"{VIDEO_END - 1.2}:d=1.2[music]")
    for k, s in enumerate(CUT_SECONDS):
        fc.append(f"[{i_whoosh}:a]adelay={int(s * 1000)}|{int(s * 1000)},volume=0.45[wh{k}]")
    whoosh_ins = "".join(f"[wh{k}]" for k in range(len(CUT_SECONDS)))
    fc.append(f"{whoosh_ins}amix=inputs={len(CUT_SECONDS)}:normalize=0[whoosh]")
    fc.append(f"[{i_boom}:a]adelay=36600|36600,volume=0.65[boom]")
    fc.append(f"[{i_riser}:a]adelay=33800|33800,volume=0.4[riser]")

    fc.append("[vout][music][whoosh][boom][riser]amix=inputs=5:normalize=0[aout]")

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
    import re
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
    out = Path(args.out)
    run("-i", str(VIDEO), "-i", str(mix), "-map", "0:v", "-map", "1:a",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", str(out))
    print(f"  done -> {out}")


if __name__ == "__main__":
    main()