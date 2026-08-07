// The shared core: the parts of a composition that don't care what the visual
// language is. Narration playback, a music bed that gets out of the way of the
// voice, the sfx track, and a camera move per beat.
//
// Nothing here reads script.json. Every composition passes its own track in,
// which is what lets one file serve a 9:16 explainer and a 16:9 documentary
// that live in the same episode.
import React from "react";
import {
  Audio,
  Easing,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type Word = { w: string; start: number; end: number };
/** One recorded beat, as tools/align.py wrote it. */
export type Take = {
  n: number;
  file: string;
  start: number;
  dur: number;
  words: Word[];
};

const ramp = (x: number, from: [number, number], to: [number, number]) =>
  interpolate(x, from, to, { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** How far under the voice the bed drops. Not to zero: a bed that vanishes on
 *  every line is a bed that is switching on and off for ten minutes. */
const DUCK = 0.42;

/** The end of the last word — where speech actually stops, which is earlier
 *  than where the beat stops. */
const spoken = (take: Take) =>
  take.words.length ? take.start + take.words[take.words.length - 1].end : take.start;

/**
 * Push or pull per beat, plus an optional impact shake.
 *
 * `move` names the move for the beat at index i — a module table for the vox
 * page, a semantic camera intent for the documentary. The camera itself is the
 * same instrument either way.
 */
export const useCamera = (
  beats: { start: number; end: number }[],
  move: (i: number) => [number, number],
  impact = -1,
  strength = 0,
) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const i = Math.max(
    0,
    beats.findIndex((b) => frame >= b.start * fps && frame < b.end * fps),
  );
  const beat = beats[i] ?? { start: 0, end: 1 };
  const [from, to] = move(i);
  const scale = interpolate(frame, [beat.start * fps, beat.end * fps], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });
  const hit = frame - Math.round(impact * fps);
  const shake =
    strength > 0 && hit > 0 && hit < 14 ? Math.sin(hit * 2.4) * (14 - hit) * strength : 0;
  return { scale, shake };
};

/**
 * Narration takes, one continuous music bed, and the sfx accents.
 *
 * The bed is a single looped source for the whole episode, its level driven by
 * `bed(t)`. That is deliberate: music that restarts at every scene tells the
 * viewer the video is a sequence of clips, and ten minutes of that is what
 * makes long-form generated video unwatchable.
 */
export const Soundtrack: React.FC<{
  takes: Take[];
  total: number;
  cues?: { at: number; files: string[] }[];
  /** Bed level 0..1 before ducking. Flat 0.4 if the composition has no opinion. */
  bed?: (t: number) => number;
  music?: string;
}> = ({ takes, total, cues = [], bed, music = "audio/music.wav" }) => {
  const { fps } = useVideoConfig();
  const voiced = takes.filter((t) => t.file && t.words.length > 0);
  const speech = voiced.map((t) => [t.start, spoken(t)] as const);

  return (
    <>
      {voiced.map((take) => (
        <Sequence key={`vo${take.n}`} from={Math.round(take.start * fps)}>
          <Audio src={staticFile(`audio/${take.file}`)} />
        </Sequence>
      ))}

      <Audio
        src={staticFile(music)}
        loop // the episode runs as long as the read does; the bed has to keep up
        volume={(f) => {
          const t = f / fps;
          const level = bed ? bed(t) : 0.4;
          const edges = ramp(t, [0, 1.5], [0, 1]) * ramp(t, [total - 1.2, total], [1, 0]);
          // Under speech, and easing back out of the way either side of it.
          const duck = Math.min(
            1,
            ...speech.map(([a, b]) =>
              t < a ? ramp(t, [a - 0.3, a], [1, DUCK])
              : t > b ? ramp(t, [b, b + 0.5], [DUCK, 1])
              : DUCK,
            ),
          );
          return Math.max(0, level * edges * duck);
        }}
      />

      {cues.flatMap((cue) =>
        cue.files.map((file) => (
          <Sequence key={`${cue.at}-${file}`} from={Math.round(cue.at * fps)}>
            {/* accents, not events — the voice is the loudest thing here */}
            <Audio src={staticFile(`audio/${file}`)} volume={0.45} />
          </Sequence>
        )),
      )}
    </>
  );
};
