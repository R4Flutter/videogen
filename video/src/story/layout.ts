// Semantic layout engine. Scenes never name pixels — they name positions
// ("upper_center", "left_center", ...) and the layout engine resolves them
// into coordinates that work on any aspect ratio. Portrait and landscape
// are recomposed, not scaled: the position tables differ per aspect so a
// 9:16 Short doesn't look like a squeezed 16:9 frame.

import { DESIGN } from "./design";

export type Aspect = "portrait" | "landscape" | "square";

export type SemanticPosition =
  | "center"
  | "upper_center"
  | "lower_center"
  | "left"
  | "right"
  | "upper_left"
  | "upper_right"
  | "lower_left"
  | "lower_right"
  | "left_center"
  | "right_center"
  | "custom";

export type CustomPosition = { x: number; y: number; unit?: "px" | "fraction" };

// Position tables in fractions of the canvas, relative to the element's own
// anchor (default: center of the element box).
const POSITIONS: Record<Aspect, Record<SemanticPosition, [number, number]>> = {
  portrait: {
    center: [0.5, 0.5],
    upper_center: [0.5, 0.31],
    lower_center: [0.5, 0.74],
    left: [0.24, 0.5],
    right: [0.76, 0.5],
    upper_left: [0.24, 0.31],
    upper_right: [0.76, 0.31],
    lower_left: [0.24, 0.74],
    lower_right: [0.76, 0.74],
    left_center: [0.24, 0.5],
    right_center: [0.76, 0.5],
    custom: [0.5, 0.5],
  },
  landscape: {
    center: [0.5, 0.5],
    upper_center: [0.5, 0.24],
    lower_center: [0.5, 0.78],
    left: [0.24, 0.5],
    right: [0.76, 0.5],
    upper_left: [0.24, 0.24],
    upper_right: [0.76, 0.24],
    lower_left: [0.24, 0.78],
    lower_right: [0.76, 0.78],
    left_center: [0.24, 0.5],
    right_center: [0.76, 0.5],
    custom: [0.5, 0.5],
  },
  square: {
    center: [0.5, 0.5],
    upper_center: [0.5, 0.28],
    lower_center: [0.5, 0.76],
    left: [0.25, 0.5],
    right: [0.75, 0.5],
    upper_left: [0.25, 0.28],
    upper_right: [0.75, 0.28],
    lower_left: [0.25, 0.76],
    lower_right: [0.75, 0.76],
    left_center: [0.25, 0.5],
    right_center: [0.75, 0.5],
    custom: [0.5, 0.5],
  },
};

export const aspectOf = (width: number, height: number): Aspect => {
  if (height > width) return "portrait";
  if (width > height) return "landscape";
  return "square";
};

export type SafeZone = { top: number; bottom: number; left: number; right: number };

export const safeZone = (width: number, height: number): SafeZone => {
  const s = DESIGN.safe[aspectOf(width, height)];
  return {
    top: s.top * height,
    bottom: s.bottom * height,
    left: s.left * width,
    right: s.right * width,
  };
};

// Canvas-relative x/y for a position, without anchor math (the caller applies
// its own alignment). The anchor is applied by the caller via transform.
// `custom` reads explicit x/y (px or canvas fractions).
export const positionPoint = (
  position: SemanticPosition,
  custom: CustomPosition | undefined,
  width: number,
  height: number,
): { x: number; y: number } => {
  const [fx, fy] =
    position === "custom" && custom
      ? custom.unit === "px"
        ? [custom.x / width, custom.y / height]
        : [custom.x, custom.y]
      : POSITIONS[aspectOf(width, height)][position];
  return { x: fx * width, y: fy * height };
};

// Typographic scale: a fraction of the canvas short edge, so "0.14" reads as
// a huge headline on both a 1080-wide Short and a 1080-tall landscape.
export const typeScale = (width: number, height: number, fraction: number): number =>
  Math.round(fraction * Math.min(width, height));

// The shared per-aspect layout context used across scenes.
export type Layout = {
  aspect: Aspect;
  width: number;
  height: number;
  safe: SafeZone;
  shortEdge: number;
  type: (fraction: number) => number;
  point: (position: SemanticPosition, custom?: CustomPosition) => { x: number; y: number };
};

export const useLayout = (width: number, height: number): Layout => {
  const safe = safeZone(width, height);
  return {
    aspect: aspectOf(width, height),
    width,
    height,
    safe,
    shortEdge: Math.min(width, height),
    type: (fraction: number) => typeScale(width, height, fraction),
    point: (position, custom) => positionPoint(position, custom, width, height),
  };
};

export const SEMANTIC_POSITIONS: readonly SemanticPosition[] = [
  "center",
  "upper_center",
  "lower_center",
  "left",
  "right",
  "upper_left",
  "upper_right",
  "lower_left",
  "lower_right",
  "left_center",
  "right_center",
  "custom",
];