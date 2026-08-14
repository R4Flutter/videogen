// The motion engine. Every animation is a pure function of (frame, params)
// returning a transform — content says WHAT, motion says HOW, and no scene
// ever hardcodes animation values. All functions are deterministic and safe
// to call from useMemo / loops.

import { interpolate, spring } from "remotion";
import { EASE_IN_OUT, EASE_OUT_BACK, EASE_OUT_QUINT } from "../mcd/utils/easing";
import { PERSONALITIES } from "./design";
import type { Personality, PersonalitySpec } from "./design";

export type { Personality } from "./design";

export type Transform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  // Velocity (0..1, relative to the animation's max) — for motion blur
  // and speed-line effects driven off the same curve as the movement.
  velocity: number;
  // Optional motion blur amount (px) during fast movement.
  blur?: number;
  // Optional mask reveal progress (0..1) for mask_reveal / mask_exit.
  maskW?: number;
};

export const IDENTITY: Transform = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, velocity: 0 };

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

// ------------------------------------------------------------------ springs

export type SpringParams = {
  fps: number;
  delay?: number;
  durationInFrames?: number;
  damping?: number;
  stiffness?: number;
  mass?: number;
};

// Raw spring progress (0 → ~1, may overshoot > 1 with low damping). Pure.
export const springProgress = (
  frame: number,
  { fps, delay = 0, durationInFrames, damping = 18, stiffness = 190, mass = 0.9 }: SpringParams,
): number =>
  spring({
    frame,
    fps,
    delay,
    durationInFrames,
    config: { damping, stiffness, mass },
  });

// Spring progress normalized to 0..1 (overshoot folded in) with its peak
// velocity for effects.
export const springPose = (
  frame: number,
  params: SpringParams & { personality?: Personality },
): { progress: number; velocity: number } => {
  const spec: PersonalitySpec = params.personality
    ? PERSONALITIES[params.personality]
    : { damping: 18, stiffness: 190, mass: 0.9, overshoot: 0 };
  const raw = springProgress(frame, {
    ...params,
    damping: params.damping ?? spec.damping,
    stiffness: params.stiffness ?? spec.stiffness,
    mass: params.mass ?? spec.mass,
  });
  const next = springProgress(frame + 1, {
    ...params,
    damping: params.damping ?? spec.damping,
    stiffness: params.stiffness ?? spec.stiffness,
    mass: params.mass ?? spec.mass,
  });
  const velocity = clamp01(Math.abs(next - raw) * 14);
  const progress = clamp01(raw);
  return { progress, velocity };
};

// ----------------------------------------------------------------- entrances

export type EntranceType =
  | "slide_left"
  | "slide_right"
  | "slide_up"
  | "slide_down"
  | "fly_in"
  | "slam_in"
  | "pop_in"
  | "spring_in"
  | "scale_in"
  | "zoom_in"
  | "fade_in"
  | "rotate_in"
  | "drift_in"
  | "mask_reveal";

export type EntranceParams = {
  frame: number;
  fps: number;
  // How far the slide travels (px). Scenes pass a canvas-proportional value.
  distance: number;
  durationInFrames?: number;
  personality?: Personality;
  overshoot?: boolean;
  delay?: number;
  blur?: number;
  rotation?: number;
};

// Slides with a spring so the element accelerates in, passes the target
// slightly, and settles — the physically convincing "arrive" the spec wants.
const slide = (sign: number, p: EntranceParams): Transform => {
  const { frame, fps, distance, personality = "snappy", overshoot = true, delay = 0 } = p;
  const spec = PERSONALITIES[personality];
  const raw = spring({
    frame,
    fps,
    delay,
    config: { damping: spec.damping, stiffness: spec.stiffness, mass: spec.mass },
  });
  const travel = overshoot ? raw : clamp01(raw);
  const x = -sign * (1 - travel) * distance;
  const velocity = clamp01(Math.abs(spring({ frame: frame + 1, fps, delay, config: { damping: spec.damping, stiffness: spec.stiffness, mass: spec.mass } }) - raw) * 14);
  const blur = p.blur ? (velocity > 0.06 ? velocity * p.blur : 0) : 0;
  return { x, y: 0, scale: 1, rotation: 0, opacity: 1, velocity, blur };
};

export const ENTRANCES: Record<
  EntranceType,
  (p: EntranceParams) => Transform
> = {
  slide_left: (p) => slide(1, p),
  slide_right: (p) => slide(-1, p),
  slide_up: (p) => {
    const t = slide(1, { ...p, distance: p.distance * 0.8 });
    return { ...t, x: 0, y: -t.x, rotation: 0 };
  },
  slide_down: (p) => {
    const t = slide(-1, { ...p, distance: p.distance * 0.8 });
    return { ...t, x: 0, y: -t.x, rotation: 0 };
  },
  // Fast diagonal burst — reads as a vehicle or object at full speed.
  fly_in: (p) => {
    const t = slide(1, { ...p, personality: p.personality ?? "aggressive", distance: p.distance * 1.25 });
    return { ...t, y: t.x * 0.22, rotation: (1 - clamp01(travelOf(p))) * 3 };
  },
  // Scale slam with back-easing + slight rotation settle. The headline pop.
  slam_in: (p) => {
    const { frame, delay = 0, durationInFrames = 16, personality = "aggressive" } = p;
    const dur = durationInFrames;
    const t = clamp01(interpolate(frame, [delay, delay + dur], [0, 1], {
      easing: EASE_OUT_BACK,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }));
    const spec = PERSONALITIES[personality];
    const rot = interpolate(t, [0, 1], [-4, 0]);
    const scale = interpolate(t, [0, 1], [2.4, 1], { easing: EASE_OUT_BACK });
    const next = clamp01(interpolate(frame + 1, [delay, delay + dur], [0, 1], {
      easing: EASE_OUT_BACK,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }));
    void spec;
    return { x: 0, y: 0, scale, rotation: rot, opacity: clamp01(t * 1.5), velocity: clamp01(Math.abs(next - t) * 10) };
  },
  // Quick pop from small to natural size — good for cards and labels.
  pop_in: (p) => {
    const { frame, fps, delay = 0, personality = "snappy" } = p;
    const raw = spring({
      frame,
      fps,
      delay,
      config: { damping: 14, stiffness: 300, mass: 0.7 },
    });
    void personality;
    const scale = 0.5 + raw * 0.5;
    return { x: 0, y: 0, scale, rotation: 0, opacity: clamp01(raw * 1.8), velocity: clamp01(Math.abs(spring({ frame: frame + 1, fps, delay, config: { damping: 14, stiffness: 300, mass: 0.7 } }) - raw) * 14) };
  },
  spring_in: (p) => {
    const t = springPose(p.frame, { ...p, personality: p.personality ?? "elastic" });
    return { x: 0, y: 0, scale: 0.8 + t.progress * 0.2, rotation: 0, opacity: 1, velocity: t.velocity };
  },
  scale_in: (p) => {
    const t = springPose(p.frame, { ...p, personality: p.personality ?? "snappy" });
    return { x: 0, y: 0, scale: 0.6 + t.progress * 0.4, rotation: 0, opacity: 1, velocity: t.velocity };
  },
  // Zoom from far away — opacity + scale from large, like a lens racking in.
  zoom_in: (p) => {
    const t = springPose(p.frame, { ...p, personality: p.personality ?? "cinematic" });
    return { x: 0, y: 0, scale: 1.5 - t.progress * 0.5, rotation: 0, opacity: clamp01(t.progress * 2.2), velocity: t.velocity };
  },
  fade_in: (p) => {
    const t = springPose(p.frame, { ...p, personality: p.personality ?? "soft" });
    return { x: 0, y: 0, scale: 1, rotation: 0, opacity: t.progress, velocity: t.velocity };
  },
  rotate_in: (p) => {
    const { frame, fps, delay = 0, rotation = 14, personality = "soft" } = p;
    const t = springPose(frame, { fps, delay, personality });
    return { x: 0, y: 0, scale: 0.94 + t.progress * 0.06, rotation: (1 - t.progress) * rotation, opacity: t.progress, velocity: t.velocity };
  },
  // Gentle drift from below with a soft settle — a quiet arrival.
  drift_in: (p) => {
    const t = springPose(p.frame, { ...p, personality: p.personality ?? "cinematic" });
    return { x: 0, y: (1 - t.progress) * p.distance * 0.3, scale: 0.96 + t.progress * 0.04, rotation: 0, opacity: t.progress, velocity: t.velocity };
  },
  // Width reveal from the center outward — mask-style, no transform skew.
  mask_reveal: (p) => {
    const t = springPose(p.frame, { ...p, personality: p.personality ?? "snappy" });
    return { x: 0, y: 0, scale: 1, rotation: 0, opacity: t.progress, velocity: t.velocity, maskW: t.progress };
  },
};

const travelOf = (p: EntranceParams): number => {
  const spec = PERSONALITIES[p.personality ?? "aggressive"];
  return spring({
    frame: p.frame,
    fps: p.fps,
    delay: p.delay ?? 0,
    config: { damping: spec.damping, stiffness: spec.stiffness, mass: spec.mass },
  });
};

// -------------------------------------------------------------------- exits

export type ExitType =
  | "slide_left"
  | "slide_right"
  | "slide_up"
  | "slide_down"
  | "scale_out"
  | "fade_out"
  | "zoom_out"
  | "mask_exit";

export type ExitParams = {
  frame: number;
  fps: number;
  sceneEnd: number;
  distance: number;
  durationInFrames?: number;
  personality?: Personality;
};

const exitAt = (sceneEnd: number, dur: number): number => Math.max(0, sceneEnd - dur);

export const EXITS: Record<ExitType, (p: ExitParams) => Transform> = {
  slide_left: (p) => {
    const d = p.durationInFrames ?? 16;
    const t = clamp01(interpolate(p.frame, [exitAt(p.sceneEnd, d), p.sceneEnd], [0, 1], { easing: EASE_IN_OUT, extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    return { x: -t * p.distance, y: 0, scale: 1, rotation: 0, opacity: 1, velocity: t };
  },
  slide_right: (p) => {
    const d = p.durationInFrames ?? 16;
    const t = clamp01(interpolate(p.frame, [exitAt(p.sceneEnd, d), p.sceneEnd], [0, 1], { easing: EASE_IN_OUT, extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    return { x: t * p.distance, y: 0, scale: 1, rotation: 0, opacity: 1, velocity: t };
  },
  slide_up: (p) => {
    const d = p.durationInFrames ?? 16;
    const t = clamp01(interpolate(p.frame, [exitAt(p.sceneEnd, d), p.sceneEnd], [0, 1], { easing: EASE_IN_OUT, extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    return { x: 0, y: -t * p.distance * 0.7, scale: 1, rotation: 0, opacity: 1, velocity: t };
  },
  slide_down: (p) => {
    const d = p.durationInFrames ?? 16;
    const t = clamp01(interpolate(p.frame, [exitAt(p.sceneEnd, d), p.sceneEnd], [0, 1], { easing: EASE_IN_OUT, extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    return { x: 0, y: t * p.distance * 0.7, scale: 1, rotation: 0, opacity: 1, velocity: t };
  },
  scale_out: (p) => {
    const d = p.durationInFrames ?? 16;
    const t = clamp01(interpolate(p.frame, [exitAt(p.sceneEnd, d), p.sceneEnd], [0, 1], { easing: EASE_IN_OUT, extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    return { x: 0, y: 0, scale: 1 - t * 0.25, rotation: 0, opacity: 1 - t, velocity: t };
  },
  fade_out: (p) => {
    const d = p.durationInFrames ?? 16;
    const t = clamp01(interpolate(p.frame, [exitAt(p.sceneEnd, d), p.sceneEnd], [0, 1], { easing: EASE_IN_OUT, extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    return { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 - t, velocity: t };
  },
  zoom_out: (p) => {
    const d = p.durationInFrames ?? 16;
    const t = clamp01(interpolate(p.frame, [exitAt(p.sceneEnd, d), p.sceneEnd], [0, 1], { easing: EASE_OUT_QUINT, extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    return { x: 0, y: 0, scale: 1 + t * 0.3, rotation: 0, opacity: 1 - t * t, velocity: t };
  },
  mask_exit: (p) => {
    const d = p.durationInFrames ?? 16;
    const t = clamp01(interpolate(p.frame, [exitAt(p.sceneEnd, d), p.sceneEnd], [0, 1], { easing: EASE_IN_OUT, extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    return { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, velocity: t, maskW: 1 - t };
  },
};

// ------------------------------------------------------------------ camera

export type CameraMoveType =
  | "push_in"
  | "pull_out"
  | "pan_left"
  | "pan_right"
  | "vertical_pan"
  | "micro_shake"
  | "whip_pan"
  | "parallax"
  | "dolly";

export type CameraParams = {
  frame: number;
  fps: number;
  durationInFrames: number;
  width: number;
  height: number;
  move: CameraMoveType;
  intensity: number; // 0..1
  // Optional beat impacts: { at: frame, strength: 0..1 } — a punch + shake.
  impacts?: { at: number; strength: number }[];
};

export type CameraPose = { x: number; y: number; scale: number; rotation: number; blur: number };

// Camera moves return a pose as offsets/zoom around the canvas center.
export const cameraPose = (p: CameraParams): CameraPose => {
  const { frame, durationInFrames, width, height, move, intensity } = p;
  const cx = width / 2;
  const cy = height / 2;
  const t = clamp01(frame / Math.max(1, durationInFrames));
  const zoom = 0.06 + intensity * 0.1;
  const travel = (0.04 + intensity * 0.09) * width;
  const verticalTravel = (0.05 + intensity * 0.1) * height;

  let pose: CameraPose = { x: cx, y: cy, scale: 1, rotation: 0, blur: 0 };

  switch (move) {
    case "push_in":
      pose = { x: cx, y: cy, scale: 1 + t * zoom, rotation: 0, blur: 0 };
      break;
    case "pull_out":
      pose = { x: cx, y: cy, scale: 1 + (1 - t) * zoom, rotation: 0, blur: 0 };
      break;
    case "pan_left":
      pose = { x: cx + (1 - t) * travel, y: cy, scale: 1.04, rotation: 0, blur: 0 };
      break;
    case "pan_right":
      pose = { x: cx - (1 - t) * travel, y: cy, scale: 1.04, rotation: 0, blur: 0 };
      break;
    case "vertical_pan":
      pose = { x: cx, y: cy + (1 - t) * verticalTravel, scale: 1.05, rotation: 0, blur: 0 };
      break;
    case "micro_shake": {
      const shake = Math.sin(frame * 0.9) * (0.6 + intensity * 1.2);
      const decay = clamp01(1 - t * 1.4);
      pose = { x: cx + shake * decay * 4, y: cy + Math.cos(frame * 1.3) * decay * 3, scale: 1 + t * zoom * 0.4, rotation: Math.sin(frame * 1.7) * decay * 0.3, blur: 0 };
      break;
    }
    case "whip_pan": {
      const p0 = 1 - clamp01(frame / Math.max(1, durationInFrames * 0.16));
      const blur = clamp01(p0) * (8 + intensity * 16);
      pose = { x: cx - p0 * travel * 2, y: cy, scale: 1, rotation: 0, blur };
      break;
    }
    case "parallax": {
      const drift = (t - 0.5) * travel * 0.4;
      pose = { x: cx + drift, y: cy, scale: 1.06, rotation: 0, blur: 0 };
      break;
    }
    case "dolly":
      pose = { x: cx, y: cy, scale: 1 - (1 - t) * zoom * 0.6, rotation: 0, blur: 0 };
      break;
  }

  // Beat impacts: a quick punch in + settle, with a tiny shake.
  for (const imp of p.impacts ?? []) {
    const local = frame - imp.at;
    if (local >= 0 && local < 18) {
      const k = clamp01(local / 10);
      const punch = (1 - k) * imp.strength * 0.05;
      pose.scale *= 1 + punch;
      pose.rotation += Math.sin(local * 1.4) * (1 - k) * imp.strength * 0.22;
      pose.x += Math.sin(local * 2.1) * (1 - k) * imp.strength * 5;
    }
  }

  return pose;
};

// ------------------------------------------------------------------- easing

export { EASE_ARRIVE, EASE_IN_OUT, EASE_OUT_BACK, EASE_OUT_QUINT } from "../mcd/utils/easing";