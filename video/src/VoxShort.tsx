// The vox composition. Same job as FinanceShort — read script.json, stage it —
// with a second vocabulary. No episode-specific JSX lives here either.
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
import { Soundtrack, useCamera } from "./staging";
import { theme } from "./theme";
import { isClip, KineticText, PaperBG } from "./vox/elements";
import { BAND } from "./vox/layout";
import { ARCHIVAL, CAPTION, VOX_MODULES, VoxBeat } from "./vox/scenes";
import { TURN, Turn, turnKind } from "./vox/transitions";

const vox = theme.vox;

/** A page drifts; it does not punch. The moves here are half a finance move. */
const CAMERA: Record<string, [number, number]> = {
  kinetic: [1.0, 1.03],
  icon: [1.0, 1.02],
  chart: [1.02, 1.0],
  compare: [1.0, 1.025],
  stat: [1.05, 1.0],
  // The editorial modules drive their own camera from inside the beat, so the
  // page itself stays still — two cameras on one frame fight.
  //
  // The picture modules are in this list now, and that is the fix for the
  // thing that made every generated image look like a slideshow: they used to
  // get a page-wide ramp here *and* a 1.16 -> 1.02 ramp inside ArchivalBG. Two
  // zooms multiplied together is a Ken Burns pan, and it drowned the parallax
  // completely — you cannot see three planes separate while the whole frame is
  // scaling through them. EditorialStill translates and never scales, so this
  // has to be 1.0 or there is nothing to see.
  doodle: [1.0, 1.0],
  footage: [1.0, 1.0],
  callout: [1.0, 1.0],
  collage: [1.0, 1.0],
  trace: [1.0, 1.0],
  trust: [1.0, 1.0],
  funnel: [1.0, 1.0],
  map: [1.0, 1.0],
};

const BEATS: VoxBeat[] = script.beats;

/** A crime episode has no overlay/sfx tables of its own — the accents live on
 *  the beat — so the vox composition reads them defensively. */
const SFX = (script as { sfx?: { at: number; files: string[] }[] }).sfx ?? [];

/** An essay lands on its closing statement, so the bed swells into the last
 *  beat rather than onto a single word. */
const IMPACT = BEATS.length ? BEATS[BEATS.length - 1].start : 0;

/**
 * Narration on the page. Over the modules that darken the frame it sits on a
 * paper card — black-on-white over footage is the Vox caption, and it's the
 * only thing that stays legible on an archival clip.
 *
 * What it does *not* do any more is print over a module that is already setting
 * the sentence in type. `CAPTION` in vox/scenes decides; a chart, a stat, a
 * funnel and a trust list all answer "none", because the frame they draw is the
 * sentence. Printing both was the single biggest reason the ten-minute cut read
 * as an animated transcript rather than as an edit.
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
  // An unknown module captions, because a new module with no policy yet is
  // better subtitled than silent.
  if (!beat || CAPTION[beat.module] === "none") return null;
  // The card exists to survive a dark background, and the background is only
  // dark when a *moving* clip actually downloaded. A still now stages as a
  // plate on the page, which leaves the paper showing — a white card printed
  // over paper is a white rectangle for no reason.
  const dark = ARCHIVAL.has(beat.module) && isClip(beat.n);

  return (
    <div
      style={{
        position: "absolute",
        left: width * 0.075,
        right: width * 0.075,
        // The caption band from the grid, not a hand-picked 10% — the same
        // number every module reserves space against.
        top: height * BAND.caption,
        height: height * (BAND.bottom - BAND.caption),
        display: "flex",
        alignItems: "center",
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
              <Turn
                dur={dur}
                last={last}
                opaque={ARCHIVAL.has(beat.module)}
                // Both sides of a cut derive the move from the same boundary, so
                // the page leaving and the page arriving agree without either
                // being handed the other's beat.
                kind={turnKind(i, beat.module)}
                exitKind={last ? "lift" : turnKind(i + 1, BEATS[i + 1].module)}
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
