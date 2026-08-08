// EssaySoundtrack: the essay's audio mix. The plan's audio events drive it —
// a music level per beat, silence carved out for the punches, sfx on their
// moments — and the voice comes in at its plan-assigned audioStart so J-cuts
// actually lead. Same instruments as the short form, directed instead of
// constant.
import React from "react";
import { Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import type { DirectorPlan } from "../director/types.ts";
import { wordsForBeat } from "./Captions.tsx";
import script from "../script.json";
import voice from "../voice.json";

const duck = (frame: number, fps: number) => {
  const DUCK = 0.42;
  if (frame < 0) return 1;
  const t = frame / fps;
  const inWord = script.beats.some((b) => {
    const words = wordsForBeat(b);
    const ms = (t - b.start) * 1000;
    return words.some((w) => ms >= w.start * 1000 - 60 && ms < w.end * 1000 + 60);
  });
  return inWord ? DUCK : 1;
};

/** A level curve from the plan's knots: music_level events raise/lower the
 *  bed, silence windows drop it to 0 (with a short ramp so it never clicks). */
const buildCurve = (plan: DirectorPlan) => {
  const knots: { at: number; value: number }[] = [];
  for (const e of plan.audioEvents) {
    if (e.kind === "music_level") knots.push({ at: e.at, value: e.value ?? 0.5 });
  }
  for (const b of plan.beats) {
    for (const s of b.audio.silence) {
      const after = [...knots].reverse().find((k) => k.at <= s.at + s.dur);
      knots.push({ at: s.at - 0.12, value: after?.value ?? 0.5 });
      knots.push({ at: s.at, value: 0 });
      knots.push({ at: s.at + s.dur, value: 0 });
      knots.push({ at: s.at + s.dur + 0.12, value: after?.value ?? 0.5 });
    }
  }
  knots.sort((a, b) => a.at - b.at);
  return (t: number) => {
    if (!knots.length) return 0.5;
    if (t <= knots[0].at) return knots[0].value;
    for (let i = 0; i < knots.length - 1; i++) {
      const a = knots[i];
      const b = knots[i + 1];
      if (t >= a.at && t <= b.at) {
        const p = (t - a.at) / Math.max(0.0001, b.at - a.at);
        return a.value + (b.value - a.value) * p;
      }
    }
    return knots[knots.length - 1].value;
  };
};

export const EssaySoundtrack: React.FC<{ plan: DirectorPlan }> = ({ plan }) => {
  const { fps } = useVideoConfig();
  const level = buildCurve(plan);

  const cues = plan.audioEvents
    .filter((e) => e.kind === "sfx")
    .map((e) => ({ at: e.at, files: [e.label] }));

  return (
    <>
      {plan.beats.map((b) => (
        <Sequence
          key={b.n}
          from={Math.round(b.audioStart * fps)}
          durationInFrames={Math.round((b.end - b.audioStart) * fps)}
        >
          <Audio
            src={staticFile(
              `audio/${voice.beats.find((t) => t.n === b.n)?.file ?? `vo/beat-${b.n}.wav`}`,
            )}
            volume={0.95}
          />
        </Sequence>
      ))}
      {cues.map((cue) => (
        <Sequence key={`${cue.at}-${cue.files[0]}`} from={Math.round(cue.at * fps)}>
          <Audio src={staticFile(`audio/${cue.files[0]}.wav`)} volume={0.5} />
        </Sequence>
      ))}
      <Sequence>
        <Audio
          src={staticFile("audio/music.wav")}
          volume={(f) => 0.35 * duck(f, fps) * level(f / fps)}
          loop
        />
      </Sequence>
    </>
  );
};
