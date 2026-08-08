// The vox composition. Same job as FinanceShort — read script.json, stage it —
// with a second vocabulary. No episode-specific JSX lives here either.
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import script from "./script.json";
import voice from "./voice.json";
import { Soundtrack, useCamera } from "./staging";
import { theme } from "./theme";
import { hasFootage, KineticText, PaperBG } from "./vox/elements";
import { ARCHIVAL, VOX_MODULES, VoxBeat } from "./vox/scenes";

const vox = theme.vox;

/** A page drifts; it does not punch. The moves here are half a finance move. */
const CAMERA: Record<string, [number, number]> = {
  kinetic: [1.0, 1.03],
  doodle: [1.0, 1.04],
  icon: [1.0, 1.02],
  chart: [1.02, 1.0],
  compare: [1.0, 1.025],
  stat: [1.05, 1.0],
  footage: [1.06, 1.0],
  collage: [1.0, 1.03],
  // The editorial modules drive their own camera from inside the beat, so the
  // page itself stays still — two cameras on one frame fight.
  trace: [1.0, 1.0],
  trust: [1.0, 1.0],
  funnel: [1.0, 1.0],
  map: [1.0, 1.0],
};

const BEATS: VoxBeat[] = script.beats;

/** A crime episode has no overlay/sfx tables of its own — the accents live on
 *  the beat — so the vox composition reads them defensively. */
const SFX = (script as { sfx?: { at: number; files: string[] }[] }).sfx ?? [];

/** Frames the outgoing page overlaps the incoming one. Short enough to still
 *  read as a cut, long enough that the eye is carried rather than jolted. */
const TURN = 9;

/**
 * A page turn. The outgoing beat lifts and clears while the incoming one rises
 * into its place — the two overlap, so at no point is the frame empty.
 *
 * The move is small on purpose. A page that slides its full height reads as a
 * slideshow transition; a page that shifts a few percent reads as paper being
 * moved, which is the only thing this engine is pretending to be.
 */
export const Turn: React.FC<{
  dur: number;
  last: boolean;
  opaque: boolean;
  children: React.ReactNode;
}> = ({ dur, last, opaque, children }) => {
  const frame = useCurrentFrame();
  const { height } = useVideoConfig();
  const io = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const soft = Easing.bezier(0.22, 1, 0.36, 1);

  const enter = interpolate(frame, [0, TURN], [0, 1], { ...io, easing: soft });
  // The exit runs in the held-open window *past* `dur`, not in the last frames
  // before it. The next beat's sequence starts at `dur` with enter=0, so an exit
  // that finished at `dur` left both pages invisible on the same frame and every
  // cut flashed to bare paper.
  //
  // The final beat holds: fading the payoff out is throwing away the line the
  // whole video was built to land.
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
      {/* A module that stages straight onto the page has nothing of its own to
          hide the beat underneath. Without this, a text beat arriving over an
          archival beat spends the whole turn with footage showing through it. */}
      {opaque ? null : <PaperBG />}
      {children}
    </AbsoluteFill>
  );
};

/** An essay lands on its closing statement, so the bed swells into the last
 *  beat rather than onto a single word. */
const IMPACT = BEATS.length ? BEATS[BEATS.length - 1].start : 0;

/**
 * Narration on the page. Over the modules that darken the frame it sits on a
 * paper card — black-on-white over footage is the Vox caption, and it's the
 * only thing that stays legible on an archival clip.
 */
const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;

  const take = voice.beats.find(
    (b) =>
      b.words.length > 0 &&
      t >= b.start &&
      t < b.start + b.words[b.words.length - 1].end,
  );
  if (!take) return null;
  const beat = BEATS.find((b) => b.n === take.n);
  // A kinetic beat already has these words filling the frame.
  if (!beat || beat.module === "kinetic") return null;
  // The card exists to survive a dark background, and the background is only
  // dark when a clip actually downloaded.
  const dark = ARCHIVAL.has(beat.module) && hasFootage(beat.n);

  return (
    <div
      style={{
        position: "absolute",
        left: width * 0.075,
        right: width * 0.075,
        bottom: height * 0.1,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={
          dark
            ? {
                background: vox.paper,
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

export const VoxShort: React.FC = () => {
  const { fps } = useVideoConfig();
  // No shake: a shaking page reads as a mistake, not as impact.
  const { scale } = useCamera(
    BEATS,
    (i) => CAMERA[BEATS[i].module] ?? [1, 1],
    IMPACT,
    0,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: vox.paper }}>
      <PaperBG />
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        {BEATS.map((beat, i) => {
          const Scene = VOX_MODULES[beat.module] ?? VOX_MODULES.kinetic;
          const dur = Math.round((beat.end - beat.start) * fps);
          const take = voice.beats.find((b) => b.n === beat.n);
          const last = i === BEATS.length - 1;
          // The beat is held open past its own end so its exit overlaps the next
          // beat's entrance. Modules still animate against `dur`, so nothing
          // downstream has to know the turn exists.
          return (
            <Sequence
              key={beat.n}
              name={`${beat.n}. ${beat.name}`}
              from={Math.round(beat.start * fps)}
              durationInFrames={last ? dur : dur + TURN}
            >
              <Turn dur={dur} last={last} opaque={ARCHIVAL.has(beat.module)}>
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
        // the bed lifts into the closing statement rather than onto a word
        bed={(t) =>
          interpolate(t, [IMPACT - 1, IMPACT], [0.4, 0.58], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
    </AbsoluteFill>
  );
};
