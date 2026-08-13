import { interpolate, spring } from "remotion";
import { EASE_IN_OUT, EASE_OUT } from "./easing";

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

export type SpringOpts = {
  delay?: number;
  durationInFrames?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
};

// Pure spring math — safe to call inside loops, callbacks and memo calcs.
export const springProgress = (
  frame: number,
  fps: number,
  opts: SpringOpts = {},
): number => {
  const {
    delay = 0,
    durationInFrames,
    damping = 18,
    stiffness = 190,
    mass = 0.9,
  } = opts;
  return spring({
    frame,
    fps,
    delay,
    durationInFrames,
    config: { damping, stiffness, mass },
  });
};

// Eased progress along one segment (0..1), clamped on both ends. Pure — safe
// anywhere, not just at component top level.
export const progressive = (
  frame: number,
  delay: number,
  duration: number,
  easing: (t: number) => number = EASE_IN_OUT,
): number =>
  interpolate(frame, [delay, delay + duration], [0, 1], {
    easing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

// Scene gatekeeper: entrance fade + scale settle, exit fade before unmount.
// Negative frames (scene mounted early for a crossfade overlap) read as 0.
export const useSceneInOut = (
  frame: number,
  durationInFrames: number,
  opts?: { fadeIn?: number; fadeOut?: number; entranceScale?: number },
): { opacity: number; scale: number } => {
  const { fadeIn = 16, fadeOut = 14, entranceScale = 1.05 } = opts ?? {};
  const opacityIn = interpolate(frame, [0, fadeIn], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outStart = durationInFrames - fadeOut;
  const opacityOut = interpolate(frame, [outStart, durationInFrames], [1, 0], {
    easing: EASE_IN_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scaleIn = interpolate(frame, [0, fadeIn], [entranceScale, 1], {
    easing: EASE_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scaleOut = interpolate(frame, [outStart, durationInFrames], [1, 1.03], {
    easing: EASE_IN_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { opacity: clamp01(opacityIn * opacityOut), scale: scaleIn * scaleOut };
};