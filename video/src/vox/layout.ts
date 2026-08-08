// The composition grid, and the only place in the engine that knows how wide a
// piece of text actually is.
//
// Before this file, every module decided for itself where its kicker, headline,
// bars and captions went — and independently invented a font size from a
// character count. That is why the funnel headline printed through the FUNNEL
// kicker, why a ten-digit stat ran off the right edge, and why a caption landed
// on top of the thing it was captioning. None of those are artistic problems;
// they are two missing primitives.
//
//   1. a shared vertical grid, so two elements cannot claim the same band
//   2. real text measurement, so a size is derived from the words rather than
//      guessed from their length
//
// Everything here is a fraction of the canvas, so the same grid stages a 9:16
// short and a 16:9 essay without branching.
import { useVideoConfig } from "remotion";

/**
 * The bands, as fractions of canvas height. A module draws inside the bands it
 * asked for and nowhere else.
 *
 *   ┌────────────────────────────┐ 0.000  safe top
 *   │ KICKER                     │ 0.065
 *   │ HEADLINE                   │ 0.135
 *   │                            │
 *   │ PRIMARY VISUAL             │ 0.300
 *   │                            │
 *   │ ANNOTATION                 │ 0.790
 *   │ CAPTION                    │ 0.855
 *   └────────────────────────────┘ 0.945  safe bottom
 *
 * The caption band is reserved unconditionally, even on beats that carry no
 * caption. A grid that changes shape depending on what happens to be on the
 * page is not a grid — and a module cannot know whether the beat after it will
 * be captioned.
 */
export const BAND = {
  kicker: 0.065,
  headline: 0.135,
  primary: 0.3,
  annotation: 0.79,
  caption: 0.855,
  bottom: 0.945,
} as const;

export type Layout = {
  width: number;
  height: number;
  /** Side margin. Still width-relative: a margin is a horizontal measure. */
  pad: number;
  wide: boolean;
  /** Usable width between the margins. Nothing may be wider than this. */
  safeW: number;
  /** Absolute y for each band. */
  y: Record<keyof typeof BAND, number>;
  /** Height of the primary band — the room a module has for its visual. */
  primaryH: number;
};

export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  const pad = width * 0.075;
  const y = Object.fromEntries(
    Object.entries(BAND).map(([k, v]) => [k, height * v]),
  ) as Layout["y"];
  return {
    width,
    height,
    pad,
    wide: width > height,
    safeW: width - pad * 2,
    y,
    primaryH: y.annotation - y.primary,
  };
};

// ------------------------------------------------------------------ measuring
/**
 * One canvas, reused. Creating a 2d context per call is the kind of thing that
 * looks free until it runs sixty times a frame for eighteen thousand frames.
 */
let ctx: CanvasRenderingContext2D | null | undefined;

/**
 * Whether the real typeface has arrived.
 *
 * This is in the cache key, and that is not paranoia. `loadFont` holds the
 * render open until the webfont lands, but React has already rendered the tree
 * once against the fallback stack by then — and a cached fallback measurement
 * would survive into every frame that follows, silently sizing the whole video
 * off Segoe UI's metrics.
 */
const fontReady = () => {
  try {
    return typeof document !== "undefined" && document.fonts.check(`700 16px "Archivo"`);
  } catch {
    return false;
  }
};

const cache = new Map<string, number>();

export type TypeSpec = {
  size: number;
  weight: number;
  family: string;
  /** Per-character tracking in px, the way the modules already express it. */
  tracking?: number;
  upper?: boolean;
};

/**
 * The rendered advance width of one line, in px.
 *
 * Canvas `measureText` is the browser's own text engine — the same one that
 * will lay this string out — so this is measurement, not the 0.55em-per-glyph
 * approximation the modules used to run on.
 */
export const measure = (text: string, spec: TypeSpec): number => {
  const s = spec.upper ? text.toUpperCase() : text;
  const key = `${spec.size}|${spec.weight}|${spec.tracking ?? 0}|${fontReady()}|${s}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  if (ctx === undefined) {
    ctx = typeof document === "undefined"
      ? null
      : document.createElement("canvas").getContext("2d");
  }
  // No canvas at all (a test runner, a server pass): fall back to the old
  // estimate rather than crash. It is wrong, but it is wrong in the direction
  // that has always been shipping.
  const w = ctx
    ? ((ctx.font = `${spec.weight} ${spec.size}px ${spec.family}`),
      ctx.measureText(s).width + (spec.tracking ?? 0) * s.length)
    : s.length * spec.size * 0.58;
  cache.set(key, w);
  return w;
};

/**
 * The largest size at or below `max` that fits `text` on one line inside
 * `maxW`.
 *
 * One measurement, one division: glyph advances scale linearly with font size,
 * and so does px tracking, so the fitted size is exact rather than the result
 * of a binary search. `floor` stops a pathological string from shrinking to
 * nothing — past that point the answer is a different representation, not a
 * smaller type size, which is what `numberFormat` below is for.
 */
export const fit = (
  text: string,
  maxW: number,
  max: number,
  spec: Omit<TypeSpec, "size">,
  floor = 0.42,
): number => {
  const w = measure(text, { ...spec, size: max });
  if (w <= maxW || w <= 0) return max;
  return Math.max(max * floor, (max * maxW) / w);
};

/**
 * The largest size that fits `text` inside a `maxW` x `maxH` box, wrapping.
 *
 * Lines are estimated from total advance width rather than by laying the words
 * out — a headline is three to eight words, so the estimate is off by at most
 * one line, and one line of slack is cheaper than a wrapping engine.
 *
 * ponytail: estimated line count. If a headline ever needs to fill its box to
 * the pixel, break on words here instead.
 */
export const fitBlock = (
  text: string,
  maxW: number,
  maxH: number,
  max: number,
  spec: Omit<TypeSpec, "size">,
  lineHeight = 1.05,
): number => {
  const run = measure(text, { ...spec, size: max });
  const lines = Math.max(1, Math.ceil(run / maxW));
  const byHeight = maxH / (lines * lineHeight);
  // A single word cannot wrap, so it still has to fit the width on its own.
  const longest = text.split(/\s+/).reduce((a, b) => (a.length > b.length ? a : b), "");
  return Math.min(max, byHeight, fit(longest, maxW, max, spec));
};

// ------------------------------------------------------------------ numbers
/**
 * Pick a representation from the number the beat is going to land on, then
 * format every intermediate value the same way.
 *
 * Both halves matter. Choosing from the final value is what stops a rolling
 * counter changing shape mid-roll — `9,999` becoming `10K` on one frame reads
 * as a glitch. And choosing at all is the difference between `30,000,000`,
 * which does not fit any frame this engine draws, and `30M`, which does.
 *
 * Exact below a million, because that is the range where the digits are the
 * editorial point — `$9,171.49` is a number somebody lost, `$9.2K` is a
 * rounding of it — and because `fit` can always find a size for nine
 * characters. Above it, no size fits `25,557,729` on a page that also has to
 * hold a label, so the representation is what gives.
 *
 * A scaled value below 1 reverts to exact for that value alone. A funnel that
 * runs 100,000 -> 10 must not print its last row as `0.0001M`; the shape is
 * chosen for the series, but a row the shape would destroy keeps its digits.
 */
export const numberFormat = (final: number) => {
  const abs = Math.abs(final);
  const [div, unit] = abs >= 1e9 ? [1e9, "B"] : abs >= 1e6 ? [1e6, "M"] : [1, ""];
  const plain = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
  return (value: number, prefix = "", suffix = "") => {
    const v = value / div;
    if (!unit || (Math.abs(v) < 1 && value !== 0)) return prefix + plain.format(value) + suffix;
    return (
      prefix +
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: Math.abs(v) >= 100 ? 1 : 2,
      }).format(v) +
      unit +
      suffix
    );
  };
};
