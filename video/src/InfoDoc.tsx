// The infographic composition. Reads the episode, stages one module per beat,
// and gets out of the way. No explainer-specific JSX lives here — an info
// episode writes beats with module names, and the registry in info/scenes.tsx
// stages them.
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
import { INFO_MODULES, InfoBeat } from "./info/scenes";
import { InfoBG } from "./info/elements";

const BEATS = script.beats as unknown as InfoBeat[];
const TAKES = voice.beats as unknown as Take[];

/** Frames the outgoing beat overlaps the incoming one. */
const DISSOLVE = 5;

const track = (name: string) => BEATS.filter((b) => (b.track ?? "long") === name);

const runtime = (beats: InfoBeat[]) =>
  beats.length ? beats[beats.length - 1].end : 1;

const Cut: React.FC<{
  dur: number;
  last: boolean;
  hard: boolean;
  children: React.ReactNode;
}> = ({ dur, last, hard, children }) => {
  const frame = useCurrentFrame();
  const io = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const enter = hard ? 1 : interpolate(frame, [0, DISSOLVE], [0, 1], io);
  const exit = last ? 0 : interpolate(frame, [dur, dur + DISSOLVE], [0, 1], io);
  return <AbsoluteFill style={{ opacity: enter * (1 - exit) }}>{children}</AbsoluteFill>;
};

const useBed = (beats: InfoBeat[]) =>
  React.useMemo(() => {
    const levels = beats.map((b) => 0.12 + (b.intensity ?? 0.5) * 0.36);
    return (t: number) => {
      const i = beats.findIndex((b) => t >= b.start && t < b.end);
      if (i < 0) return levels[levels.length - 1] ?? 0.3;
      const beat = beats[i];
      const from = i > 0 ? levels[i - 1] : levels[0];
      return interpolate(t, [beat.start, beat.start + 1.1], [from, levels[i]], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
    };
  }, [beats]);

/** The sfx names the infographic engine knows, mapped to files the pack has. */
const INFO_SFX: Record<string, string> = {
  tick: "tick.wav",
  pop: "pop.wav",
  whoosh: "whoosh.wav",
  transition_soft: "whoosh.wav",
  transition_hard: "boom.wav",
  chapter: "chime.wav",
  reveal_minor: "pop.wav",
  reveal_major: "boom.wav",
  timestamp: "tick.wav",
};

export const InfoDoc: React.FC = () => {
  const { fps } = useVideoConfig();
  const beats = React.useMemo(() => track("long"), []);
  const takes = React.useMemo(() => {
    const mine = new Set(beats.map((b) => b.n));
    return TAKES.filter((t) => t.n !== undefined && mine.has(t.n));
  }, [beats]);

  const { scale } = useCamera(beats, () => [1, 1.02]);

  const cues = React.useMemo(
    () =>
      beats.flatMap((b) =>
        (b.sfx ?? [])
          .map((name, i) => {
            const file = INFO_SFX[name] ?? "";
            return file ? { at: b.start + i * 0.16, files: [file] } : null;
          })
          .filter((cue) => cue !== null),
      ),
    [beats],
  );
  const bed = useBed(beats);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0B1220" }}>
      <InfoBG />
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        {beats.map((beat, i) => {
          const Scene = INFO_MODULES[beat.module] ?? INFO_MODULES["call"];
          const dur = Math.max(1, Math.round((beat.end - beat.start) * fps));
          const last = i === beats.length - 1;
          return (
            <Sequence
              key={beat.n}
              name={`${beat.n}. ${beat.name}`}
              from={Math.round(beat.start * fps)}
              durationInFrames={last ? dur : dur + DISSOLVE}
            >
              <Cut dur={dur} last={last} hard={beat.module === "call"}>
                <Scene dur={dur} beat={beat} />
              </Cut>
            </Sequence>
          );
        })}
      </AbsoluteFill>

      <Soundtrack takes={takes} total={runtime(beats)} cues={cues} bed={bed} />
    </AbsoluteFill>
  );
};

export const INFO_TRACKS = {
  long: track("long"),
  runtime,
};