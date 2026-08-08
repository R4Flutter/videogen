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

/** Frames each transition kind takes to land. Hard cuts overlap one frame so
 *  a frame boundary never flashes black. */
const HARD_FRAMES = 1;
const WHIP_FRAMES = 7;
const WIPE_FRAMES = 10;
const MATCH_FRAMES = 8;
const COLOR_FRAMES = 12;
const EXIT_FRAMES: Record<TransitionKind, number> = {
  hard: HARD_FRAMES,
  whip: WHIP_FRAMES,
  doc: HARD_FRAMES,
  dir: HARD_FRAMES,
  match: HARD_FRAMES,
  color: HARD_FRAMES,
};

type TransitionKind = "hard" | "whip" | "doc" | "dir" | "match" | "color";

/**
 * Vox transition decision engine. Every cut is chosen from the relationship
 * between the outgoing beat and the incoming one, never at random:
 *  - a huge kinetic beat opens a section      -> COLOR CARD
 *  - an alert beat snaps the escalation       -> WHIP SLIDE
 *  - chat/transfer screens are the same kind
 *    of evidence                              -> DOCUMENT WIPE
 *  - the chart hands off to collages          -> DIRECTIONAL WIPE (time forward)
 *  - one collage after another                -> GRAPHIC MATCH
 *  - everything else                          -> HARD CUT
 */
const transitionFor = (prev: ScamBeat | undefined, next: ScamBeat): TransitionKind => {
  if (!prev) return "hard";
  if (next.module === "kinetic" && next.kinetic_size === "huge") return "color";
  if (prev.module === "kinetic") return "hard";
  if (prev.alert || next.alert) return "whip";
  if (
    (prev.module === "chat" || prev.module === "transfer") &&
    (next.module === "chat" || next.module === "transfer")
  ) {
    return "doc";
  }
  if (prev.module === "chart" && next.module === "footage") return "dir";
  if (prev.module === "footage" && next.module === "footage") return "match";
  return "hard";
};

const TRANS: TransitionKind[] = BEATS.map((b, i) => transitionFor(BEATS[i - 1], b));

/**
 * A beat card. How it arrives and leaves is chosen by the transition engine —
 * the same decision both sides read, so an exit and its entrance agree. The
 * paper ground follows the same rules as the vox engine's turn: an opaque
 * beat fills the frame itself, a dark hook washes black, an image bed running
 * underneath draws no page at all.
 */
const BeatCard: React.FC<{
  dur: number;
  first: boolean;
  last: boolean;
  opaque: boolean;
  dark: boolean;
  enter: TransitionKind;
  exit: TransitionKind;
  children: React.ReactNode;
}> = ({ dur, first, last, opaque, dark, enter, exit, children }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const io = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const soft = Easing.bezier(0.22, 1, 0.36, 1);

  // ---- entrance -----------------------------------------------------------
  // The opening beat is already on screen: frame 0 is the still the feed
  // shows before anyone presses play.
  let opacity = 1;
  let translateX = 0;
  let scale = 1;
  let clip = 1; // 1 = fully revealed, 0 = fully clipped
  let card = 0; // color-card scaleX: 1 covers the screen, 0 has revealed
  if (!first) {
    switch (enter) {
      case "hard":
        break;
      case "whip": {
        const p = interpolate(frame, [0, WHIP_FRAMES], [0, 1], { ...io, easing: soft });
        opacity = p;
        translateX = (1 - p) * width * 0.18;
        break;
      }
      case "doc":
      case "dir": {
        // A document or direction wipe: the new scene is revealed left to
        // right, the way a panel slides across the desk.
        clip = interpolate(frame, [0, WIPE_FRAMES], [0, 1], { ...io, easing: soft });
        break;
      }
      case "match": {
        // Graphic match: the incoming collage settles over the outgoing one,
        // sharing the same screen position so the cut reads as continuity.
        const p = interpolate(frame, [0, MATCH_FRAMES], [0, 1], { ...io, easing: soft });
        opacity = Math.min(1, p * 1.35);
        scale = 1 + (1 - p) * 0.02;
        break;
      }
      case "color": {
        card = interpolate(frame, [0, COLOR_FRAMES], [1, 0], { ...io, easing: soft });
        break;
      }
    }
  }

  // ---- exit ---------------------------------------------------------------
  let exitOpacity = 1;
  let exitX = 0;
  if (!last) {
    switch (exit) {
      case "whip": {
        const p = interpolate(frame, [dur, dur + WHIP_FRAMES], [0, 1], {
          ...io,
          easing: Easing.linear,
        });
        exitOpacity = 1 - p;
        exitX = p * width * 0.18;
        break;
      }
      default:
        break; // the incoming beat carries the wipe; this one ends clean
    }
  }

  return (
    <AbsoluteFill
      style={{
        opacity: opacity * exitOpacity,
        transform: `translateX(${translateX + exitX}px) scale(${scale})`,
        transformOrigin: "left center",
        clipPath: clip < 1 ? `inset(0 ${(1 - clip) * 100}% 0 0)` : undefined,
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
      {/* The color card: a full-screen accent sheet sits over the previous
          scene, then sweeps off to reveal this one. */}
      {!first && enter === "color" ? (
        <AbsoluteFill
          style={{
            backgroundColor: scam.accent,
            transform: `scaleX(${card})`,
            transformOrigin: "left center",
          }}
        />
      ) : null}
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
              durationInFrames={last ? dur : dur + EXIT_FRAMES[TRANS[i + 1]]}
            >
              <BeatCard
                dur={dur}
                first={i === 0}
                last={last}
                opaque={SCAM_ARCHIVAL.has(beat.module)}
                dark={dark}
                enter={TRANS[i]}
                exit={TRANS[i + 1]}
              >
                <Scene dur={dur} beat={beat} words={take ? take.words : []} />
              </BeatCard>
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
