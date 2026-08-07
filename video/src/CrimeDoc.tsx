// The crime composition. Reads the episode, stages one module per beat, and
// gets out of the way. No case-specific JSX lives here — CrimeLong and
// CrimeShort are this same component over two tracks of the same episode.
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import script from "./script.json";
import voice from "./voice.json";
import { Soundtrack, Take, useCamera } from "./staging";
import { theme } from "./theme";
import { KineticText } from "./vox/elements";
import { CRIME_SFX, CRIME_TYPE, FilmBG } from "./crime/elements";
import {
  CRIME_CAMERA,
  CRIME_MODULES,
  CrimeBeat,
  Statement,
} from "./crime/scenes";

const c = theme.crime;

const BEATS = script.beats as unknown as CrimeBeat[];
const TAKES = voice.beats as unknown as Take[];

/** Frames the outgoing beat overlaps the incoming one. Short: this is a cut
 *  softened at the seam, not a transition — a documentary that dissolves
 *  between every shot reads as a slideshow with a filter on it. */
const DISSOLVE = 5;

const track = (name: string) =>
  BEATS.filter((b) => (b.track ?? "long") === name);

/** Seconds of the track, taken from the last beat rather than a header, so a
 *  retimed episode can never render past its own audio. */
const runtime = (beats: CrimeBeat[]) =>
  beats.length ? beats[beats.length - 1].end : 1;

/**
 * A hard cut with a five-frame seam. The outgoing beat is held open past its
 * own end so the two overlap; modules still animate against `dur`, so nothing
 * downstream has to know the seam exists.
 *
 * A reveal cuts clean. Fading into the moment the story turns on is the one
 * place where softening the edit costs the edit its point.
 */
const Cut: React.FC<{
  dur: number;
  last: boolean;
  hard: boolean;
  children: React.ReactNode;
}> = ({ dur, last, hard, children }) => {
  const frame = useCurrentFrame();
  const io = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const enter = hard ? 1 : interpolate(frame, [0, DISSOLVE], [0, 1], io);
  // The exit runs in the held-open window past `dur`: the next beat starts at
  // `dur` with enter=0, so an exit that finished at `dur` would leave a frame
  // with neither beat on it.
  const exit = last ? 0 : interpolate(frame, [dur, dur + DISSOLVE], [0, 1], io);
  return <AbsoluteFill style={{ opacity: enter * (1 - exit) }}>{children}</AbsoluteFill>;
};

/**
 * Narration on screen, word by word, for the vertical cut only.
 *
 * CrimeLong deliberately has no caption track: a documentary that prints every
 * sentence it speaks has nothing left to emphasise, and the modules already put
 * the fact that matters on the frame. Shorts are watched muted, so they get the
 * full read.
 */
const Captions: React.FC<{ takes: Take[] }> = ({ takes }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const take = takes.find(
    (b) =>
      b.words.length > 0 &&
      t >= b.start &&
      t < b.start + b.words[b.words.length - 1].end,
  );
  if (!take) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: width * 0.07,
        right: width * 0.07,
        bottom: height * 0.11,
        display: "flex",
        justifyContent: "center",
        textShadow: "0 6px 30px rgba(0,0,0,.85)",
      }}
    >
      <KineticText
        words={take.words}
        t={t - take.start}
        mode="caption"
        palette={CRIME_TYPE}
      />
    </div>
  );
};

/**
 * The audio director. Every beat carries a mood intensity; the bed follows it,
 * crossfading over a second so the score moves with the story instead of with
 * the edit. A reveal opens on silence — the drop is what marks it as one.
 */
const useBed = (beats: CrimeBeat[]) =>
  React.useMemo(() => {
    const levels = beats.map((b) => 0.12 + (b.intensity ?? 0.5) * 0.36);
    return (t: number) => {
      const i = beats.findIndex((b) => t >= b.start && t < b.end);
      if (i < 0) return levels[levels.length - 1] ?? 0.3;
      const beat = beats[i];
      // The drop in front of a reveal. 550ms of nothing, which is long enough
      // to be heard as a decision and short enough not to read as a fault.
      if ((beat.silence || beat.module === "reveal") && t < beat.start + 0.55) return 0;
      const from = i > 0 ? levels[i - 1] : levels[0];
      return interpolate(t, [beat.start, beat.start + 1.1], [from, levels[i]], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    };
  }, [beats]);

export const CrimeDoc: React.FC<{ cut?: "long" | "short" }> = ({ cut = "long" }) => {
  const { fps, width, height } = useVideoConfig();
  const beats = React.useMemo(() => track(cut), [cut]);
  const takes = React.useMemo(() => {
    const mine = new Set(beats.map((b) => b.n));
    return TAKES.filter((t) => mine.has(t.n));
  }, [beats]);

  const { scale } = useCamera(beats, (i) => {
    const beat = beats[i];
    return CRIME_CAMERA[beat?.intent ?? "observe"] ?? [1, 1.02];
  });

  const cues = React.useMemo(
    () =>
      beats.flatMap((b) =>
        (b.sfx ?? [])
          .map((name, i) => ({ at: b.start + i * 0.16, files: CRIME_SFX[name] ?? [] }))
          .filter((cue) => cue.files.length),
      ),
    [beats],
  );
  const bed = useBed(beats);

  return (
    <AbsoluteFill style={{ backgroundColor: c.ink }}>
      <FilmBG />
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        {beats.map((beat, i) => {
          const Scene = CRIME_MODULES[beat.module] ?? Statement;
          const dur = Math.max(1, Math.round((beat.end - beat.start) * fps));
          const take = takes.find((t) => t.n === beat.n);
          const last = i === beats.length - 1;
          return (
            <Sequence
              key={beat.n}
              name={`${beat.n}. ${beat.name}`}
              from={Math.round(beat.start * fps)}
              durationInFrames={last ? dur : dur + DISSOLVE}
            >
              <Cut
                dur={dur}
                last={last}
                hard={beat.module === "reveal" || beat.intent === "shock"}
              >
                <Scene dur={dur} beat={beat} words={take ? take.words : []} />
              </Cut>
            </Sequence>
          );
        })}
      </AbsoluteFill>

      {width < height ? <Captions takes={takes} /> : null}

      <Soundtrack takes={takes} total={runtime(beats)} cues={cues} bed={bed} />
    </AbsoluteFill>
  );
};

export const CRIME_TRACKS = {
  long: track("long"),
  short: track("short"),
  runtime,
};
