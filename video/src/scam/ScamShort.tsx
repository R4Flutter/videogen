// The scam composition. Same contract as VoxShort — read script.json, stage
// it, retime to the voice — with the scam vocabulary and two registers:
// a 9:16 short (the lane nobody owns) and a 16:9 long cut of the same beats.
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import script from "../script.json";
import voice from "../voice.json";
import { Soundtrack, useCamera } from "../staging";
import { theme } from "../theme";
import { hasFootage, HAS_BED, ImageBed, KineticText, PaperBG } from "./elements";
import { SCAM_ARCHIVAL, SCAM_MODULES, ScamBeat } from "./scenes";

const scam = theme.scam;

/** A page drifts; it does not punch. Slightly deeper on the money shots. */
const CAMERA: Record<string, [number, number]> = {
  kinetic: [1.0, 1.04],
  annotation: [1.0, 1.04],
  icon: [1.0, 1.02],
  chart: [1.02, 1.0],
  chat: [1.02, 1.0],
  transfer: [1.02, 1.0],
  footage: [1.06, 1.0],
};

const BEATS: ScamBeat[] = script.beats;

const SFX = (script as { sfx?: { at: number; files: string[] }[] }).sfx ?? [];

/** Frames the outgoing page overlaps the incoming one. */
const TURN = 9;

/**
 * A page turn, same as the vox engine's: the outgoing beat lifts while the
 * incoming one rises into its place. A huge kinetic beat turns onto black —
 * the hook and the payoff open on nothing, not on paper.
 */
const Turn: React.FC<{
  dur: number;
  first: boolean;
  last: boolean;
  opaque: boolean;
  dark: boolean;
  children: React.ReactNode;
}> = ({ dur, first, last, opaque, dark, children }) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const io = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const soft = Easing.bezier(0.22, 1, 0.36, 1);

  // The opening beat turns onto nothing, so a turn-in leaves frame 0 blank —
  // and frame 0 is the still the feed shows before anyone presses play. The
  // hook is already on screen; only the beats after it turn.
  const enter = first ? 1 : interpolate(frame, [0, TURN], [0, 1], { ...io, easing: soft });
  const exit = last
    ? 0
    : interpolate(frame, [dur, dur + TURN], [0, 1], { ...io, easing: Easing.linear });

  return (
    <AbsoluteFill
      style={{
        opacity: enter * (1 - exit),
        transform: `translateY(${
          (1 - enter) * height * 0.035 - exit * height * 0.025
        }px)`,
      }}
    >
      {/* With an image bed running underneath, a page draws no ground of its
          own — an opaque PaperBG per beat would bury it. The dark hook and
          payoff still darken, but to a wash, so the picture reads through. */}
      {opaque ? null : dark ? (
        <AbsoluteFill
          style={{ backgroundColor: HAS_BED ? "rgba(5,5,5,0.8)" : "#050505" }}
        />
      ) : HAS_BED ? null : (
        <PaperBG />
      )}
      {children}
    </AbsoluteFill>
  );
};

/** The reveal lands on the beat the whole video was built for. */
const IMPACT = BEATS.length ? BEATS[BEATS.length - 1].start : 0;

/**
 * Narration on the page. The chat/transfer beats carry their icon chips in the
 * lower band, so on those beats the caption sits above the band; everywhere
 * else it owns the bottom of the frame as usual. Wide canvases keep it clear
 * of the icons column on the right.
 */
const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const wide = width > height;

  const take = voice.beats.find(
    (b) =>
      b.words.length > 0 &&
      t >= b.start &&
      t < b.start + b.words[b.words.length - 1].end,
  );
  if (!take) return null;
  const beat = BEATS.find((b) => b.n === take.n);
  if (!beat || beat.module === "kinetic") return null;
  // Any beat with a collage behind it — the footage scenes and now the
  // chat/transfer/chart beats, which layer their mockup over the image — gets
  // the paper pill so the narration survives the busy backdrop.
  const dark = hasFootage(beat.n);
  const icons = (beat.icons ?? []).length > 0;

  return (
    <div
      style={{
        position: "absolute",
        left: width * 0.075,
        right: wide ? width * 0.52 : width * 0.075,
        // Only the vertical cut stacks chips under the narration; on a wide cut
        // they sit in the other column, so lifting the caption leaves a hole.
        bottom: icons && !wide ? height * 0.17 : height * 0.1,
        display: "flex",
        justifyContent: wide ? "flex-start" : "center",
      }}
    >
      <div
        style={
          dark
            ? {
                background: scam.paper,
                padding: `${width * 0.022}px ${width * 0.032}px`,
                boxShadow: `0 ${width * 0.014}px ${width * 0.04}px rgba(0,0,0,.35)`,
              }
            : undefined
        }
      >
        <KineticText words={take.words} t={t - take.start} mode="caption" />
      </div>
    </div>
  );
};

export const ScamDoc: React.FC<{ cut?: "short" | "long" }> = () => {
  const { fps } = useVideoConfig();
  const { scale } = useCamera(
    BEATS,
    (i) => CAMERA[BEATS[i].module] ?? [1, 1],
    IMPACT,
    0,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: scam.paper }}>
      <PaperBG />
      {/* Under every page, above the paper. It does not turn with the beats —
          the pictures are the one continuous thing in the film. */}
      {HAS_BED ? <ImageBed /> : null}
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        {BEATS.map((beat, i) => {
          const Scene = SCAM_MODULES[beat.module] ?? SCAM_MODULES.kinetic;
          const dur = Math.round((beat.end - beat.start) * fps);
          const take = voice.beats.find((b) => b.n === beat.n);
          const last = i === BEATS.length - 1;
          const dark = beat.module === "kinetic" && beat.kinetic_size === "huge";
          return (
            <Sequence
              key={beat.n}
              name={`${beat.n}. ${beat.name}`}
              from={Math.round(beat.start * fps)}
              durationInFrames={last ? dur : dur + TURN}
            >
              <Turn
                dur={dur}
                first={i === 0}
                last={last}
                opaque={SCAM_ARCHIVAL.has(beat.module)}
                dark={dark}
              >
                <Scene dur={dur} beat={beat} words={take ? take.words : []} />
              </Turn>
            </Sequence>
          );
        })}
      </AbsoluteFill>

      <Captions />
      <Soundtrack
        takes={voice.beats}
        total={script.durationInSeconds}
        cues={SFX}
        // the bed lifts into the closing statement; on the silent payoff it
        // holds at a whisper — the plan calls for no music on the final image
        bed={(t) => {
          const silent = BEATS.find((b) => !b.vo && t >= b.start && t < b.end);
          if (silent) return 0.05;
          return interpolate(t, [IMPACT - 1, IMPACT], [0.38, 0.55], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
        }}
      />
    </AbsoluteFill>
  );
};
