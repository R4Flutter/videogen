// How one page becomes the next. The engine used to own exactly one move — the
// page lifts, the next page rises — and a 90-second video made of one move is a
// slideshow no matter how good the pages are.
//
// Seven moves, picked by what the incoming beat *is* rather than at random:
// words slam, photographs are whipped onto, paper slides. Nothing here knows
// what the episode is about.
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";
import { PaperBG } from "./elements";
import { ARCHIVAL } from "./scenes";

const vox = theme.vox;

/** Frames the outgoing page overlaps the incoming one. Short enough to still
 *  read as a cut, long enough that the eye is carried rather than jolted. */
export const TURN = 9;

export type TurnKind = "lift" | "slide" | "push" | "wipe" | "punch" | "whip" | "screen";

/** One side of a turn. `t` runs 0→1 as the page arrives (`in`) or leaves (`out`),
 *  so a move is two small style functions and never a state machine. */
type Side = (t: number, w: number, h: number) => React.CSSProperties;

/**
 * The moves are small on purpose. A page that slides its full height reads as a
 * PowerPoint transition; a page that shifts a few percent reads as paper being
 * moved, which is the only thing this engine is pretending to be. `push` is the
 * one exception — it travels the full frame, which is why it never also fades:
 * a page shoved off the desk is opaque the whole way.
 *
 * They are smaller than they were, and that is a bug fix rather than taste. A
 * turn translates the *whole* page, including whatever is sitting closest to
 * the margin, so a 3.5% lift on a headline that ends 2% from the edge crops the
 * headline for nine frames. Nothing but `push` now travels more than 1.5%, and
 * the movement that used to come from the translate comes from a scale instead
 * — a scale about the centre cannot walk content off an edge the way a
 * translate can.
 */
const MOVES: Record<TurnKind, { in: Side; out: Side }> = {
  // the default page turn: lifted off, the next one rising into its place
  lift: {
    in: (t, _w, h) => ({
      opacity: t,
      transform: `translateY(${(1 - t) * h * 0.012}px) scale(${0.985 + t * 0.015})`,
    }),
    out: (t, _w, h) => ({
      opacity: 1 - t,
      transform: `translateY(${-t * h * 0.01}px) scale(${1 - t * 0.012})`,
    }),
  },
  // paper slid sideways off the desk
  slide: {
    in: (t, w) => ({
      opacity: Math.min(1, t * 1.6),
      transform: `translateX(${(1 - t) * w * 0.035}px)`,
    }),
    out: (t, w) => ({ opacity: 1 - t, transform: `translateX(${-t * w * 0.025}px)` }),
  },
  // the hard one: the incoming page physically shoves the old one out of frame
  push: {
    in: (t, w) => ({ transform: `translateX(${(1 - t) * w}px)` }),
    out: (t, w) => ({ transform: `translateX(${-t * w * 0.92}px)` }),
  },
  // an ink wipe, left to right, with the accent edge riding the boundary
  wipe: {
    in: (t) => ({ clipPath: `inset(0 ${(1 - t) * 100}% 0 0)` }),
    out: (t) => ({ opacity: 1 - t * 0.4, transform: `scale(${1 - t * 0.015})` }),
  },
  // a cut with weight behind it — for the beats that land a line, not explain one
  punch: {
    in: (t) => ({ opacity: Math.min(1, t * 2), transform: `scale(${1.035 - t * 0.035})` }),
    out: (t) => ({ opacity: 1 - t, transform: `scale(${1 - t * 0.03})` }),
  },
  // a camera thrown onto the next thing. Reserved for photographs: a whip onto
  // flat type looks like a mistake, onto an archival frame it looks shot.
  // ponytail: full-frame blur, but only ever on TURN frames per cut — if the
  // render slows, drop the filter and keep the translate.
  whip: {
    in: (t, w) => ({
      opacity: Math.min(1, t * 1.8),
      transform: `translateX(${-(1 - t) * w * 0.025}px)`,
      filter: `blur(${(1 - t) * w * 0.016}px)`,
    }),
    out: (t, w) => ({
      opacity: 1 - t,
      transform: `translateX(${t * w * 0.02}px)`,
      filter: `blur(${t * w * 0.014}px)`,
    }),
  },
  // the print dissolve: one page screened through the other
  screen: {
    in: (t) => ({ opacity: t * t, transform: `scale(${1.03 - t * 0.03})` }),
    out: (t) => ({ opacity: 1 - t }),
  },
};

/** Paper moves, in rotation, so no two consecutive cuts are the same move. */
const PAPER: TurnKind[] = ["lift", "wipe", "slide", "push", "screen"];

/**
 * Which move happens at the boundary *into* beat `i`. A pure function of the
 * boundary, so the outgoing page and the incoming page independently agree on
 * what is happening between them without either being told.
 */
export const turnKind = (i: number, module: string): TurnKind =>
  module === "kinetic"
    ? "punch"
    : ARCHIVAL.has(module) || module === "collage"
      ? "whip"
      : PAPER[i % PAPER.length];

/** The accent edge that rides an ink wipe. Without it a wipe is just a page
 *  appearing in slices; with it, something is drawing the new page on. */
const WipeEdge: React.FC<{ t: number }> = ({ t }) => {
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        left: `${t * 100}%`,
        width: width * 0.006,
        background: vox.accent,
        opacity: 1 - t * 0.3,
      }}
    />
  );
};

/**
 * A page turn. The outgoing beat clears while the incoming one arrives — the two
 * overlap, so at no point is the frame empty.
 *
 * The two sides are separate elements rather than one merged style: enter and
 * exit each want the transform, and nesting composes them for free.
 */
export const Turn: React.FC<{
  dur: number;
  last: boolean;
  opaque: boolean;
  /** the move this page arrives on */
  kind: TurnKind;
  /** the move the *next* page arrives on — this page leaves to match */
  exitKind: TurnKind;
  children: React.ReactNode;
}> = ({ dur, last, opaque, kind, exitKind, children }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const io = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

  const enter = interpolate(frame, [0, TURN], [0, 1], {
    ...io,
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });
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
    <AbsoluteFill style={MOVES[exitKind].out(exit, width, height)}>
      <AbsoluteFill style={MOVES[kind].in(enter, width, height)}>
        {/* A module that stages straight onto the page has nothing of its own to
            hide the beat underneath. Without this, a text beat arriving over an
            archival beat spends the whole turn with footage showing through it. */}
        {opaque ? null : <PaperBG />}
        {children}
      </AbsoluteFill>
      {kind === "wipe" && enter > 0 && enter < 1 ? <WipeEdge t={enter} /> : null}
    </AbsoluteFill>
  );
};
