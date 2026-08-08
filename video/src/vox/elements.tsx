// The Vox Kit: the visual vocabulary an explainer is built from, mirroring
// ../elements.tsx. Everything here sizes itself off the canvas rather than off
// 1080x1920 constants, so the same components stage a 9:16 short and a 16:9
// essay without branching.
import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Archivo";
import { icons } from "lucide-react";
import rough from "roughjs";
import { theme } from "../theme";
import footage from "../footage.json";

// Injects the @font-face rules. If the font server is unreachable the stack in
// theme.vox.font falls through to a local grotesk and the render still runs.
// Three weights, latin only: loading the whole family is 50+ requests per frame
// batch and none of the rest is ever set.
loadFont("normal", { weights: ["400", "700", "800"], subsets: ["latin"] });

const vox = theme.vox;

/** tools/fetch-footage.py writes this; `{}` until it has run. */
const FOOTAGE: Record<string, string> = footage;

/** Paper grain, drawn once into a data URI so it rasterises per render and not
 *  per frame — a live <feTurbulence> over the full canvas costs seconds. */
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">` +
    `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>` +
    `<feColorMatrix type="saturate" values="0"/></filter>` +
    `<rect width="180" height="180" filter="url(#g)" opacity="0.42"/></svg>`,
)}")`;

/**
 * Off-white page: grain, a warm centre, and a drift so no frame is static.
 *
 * The three layers move at different rates. That difference is the only thing
 * giving the page depth — the camera scales the foreground and leaves this
 * behind, so if the background moved as one slab it would read as a flat
 * backdrop sliding, which is worse than not moving at all.
 */
export const PaperBG: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 220) * 12;
  return (
    <AbsoluteFill style={{ backgroundColor: vox.paper }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% ${44 + drift / 6}%, #FFFDF7 0%, ${vox.paper} 55%, ${vox.paperDeep} 100%)`,
        }}
      />
      {/* Printer's guides. Faint enough to register as texture rather than as a
          grid — at this alpha you notice the depth, not the lines. */}
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, ${vox.rule} 0 1px, transparent 1px 148px)`,
          opacity: 0.16,
          transform: `translateX(${drift * 0.35}px)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: GRAIN,
          backgroundSize: "180px 180px",
          opacity: 0.5,
          mixBlendMode: "multiply",
          transform: `translate(${drift}px, ${-drift}px)`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Small uppercase editorial tag — the thing that makes a frame read as a page. */
export const Kicker: React.FC<{ text: string; enter?: number }> = ({ text, enter = 30 }) => {
  const { width } = useVideoConfig();
  const t = interpolate(enter, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (!text) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: width * 0.018,
        fontFamily: vox.font,
        fontSize: width * 0.026,
        fontWeight: 700,
        letterSpacing: width * 0.0045,
        textTransform: "uppercase",
        color: vox.accent,
        opacity: t,
      }}
    >
      <span style={{ width: width * 0.05 * t, height: 4, background: vox.accent }} />
      {text}
    </div>
  );
};

// ------------------------------------------------------------------ text
export type Word = { w: string; start: number; end: number };

/** A phrase holds `max` words, or fewer when the sentence ends first. */
const phrases = (words: Word[], max: number) => {
  const out: Word[][] = [];
  for (const word of words) {
    const last = out[out.length - 1];
    if (!last || last.length >= max || /[.?!,;:—]$/.test(last[last.length - 1].w)) {
      out.push([word]);
    } else {
      last.push(word);
    }
  }
  return out;
};

/**
 * Words land as they are spoken. `t` is seconds into the beat, taken straight
 * from voice.json — so the type is locked to the read, not to a frame guess.
 *
 * `hero` fills the frame and holds its last phrase; `caption` sits in the lower
 * third and clears when the beat stops talking.
 */
/**
 * The stressed word in money writing is the number. "You lost **2.6%**" — the
 * digits carry the sentence, so they carry the ink, in both the hero and the
 * caption. Non-global on purpose: a /g/ regex keeps lastIndex between calls and
 * would emphasise every other match.
 */
export const STRESS = /[\d$%]/;

/** The type is the same instrument in either vocabulary; only the ink changes.
 *  Passing a palette is how the crime engine borrows it without a second copy. */
export type Palette = { ink: string; accent: string; font: string };

export const KineticText: React.FC<{
  words: Word[];
  t: number;
  mode?: "hero" | "caption";
  emphasis?: RegExp;
  palette?: Palette;
}> = ({ words, t, mode = "caption", emphasis = STRESS, palette = vox }) => {
  const { fps, width } = useVideoConfig();
  const hero = mode === "hero";
  const groups = React.useMemo(() => phrases(words, hero ? 6 : 4), [words, hero]);
  if (!groups.length) return null;

  const active =
    groups.find((g) => t < g[g.length - 1].end) ?? (hero ? groups[groups.length - 1] : null);
  if (!active) return null;

  // Long phrases step down rather than wrap into a wall.
  const chars = active.reduce((n, word) => n + word.w.length + 1, 0);
  const size = hero
    ? width * (chars > 46 ? 0.088 : chars > 30 ? 0.108 : 0.132)
    : width * 0.048;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "baseline",
        columnGap: size * 0.24,
        rowGap: size * 0.06,
        fontFamily: palette.font,
        fontWeight: hero ? 800 : 700,
        fontSize: size,
        lineHeight: hero ? 0.95 : 1.2,
        letterSpacing: hero ? -size * 0.03 : -size * 0.012,
        textTransform: hero ? "uppercase" : "none",
        textAlign: "center",
        color: palette.ink,
      }}
    >
      {active.map((word, i) => {
        const enter = (t - word.start) * fps;
        // Un-spoken words hold their space rather than unmounting: the phrase
        // must not reflow under itself as each word lands.
        //
        // The hook word overshoots and settles; the caption does not. A caption
        // that bounces pulls the eye off the frame it is supposed to be
        // explaining, but a hook word that merely arrives has no weight, and
        // weight in the first second is the whole job.
        const s = spring({
          frame: enter,
          fps,
          config: hero
            ? { damping: 14, mass: 0.6, stiffness: 180 }
            : { damping: 200, mass: 0.5, stiffness: 220 },
          durationInFrames: hero ? 16 : 9,
        });
        const speaking = t >= word.start && t < word.end;
        const hit = emphasis ? emphasis.test(word.w) : false;
        // The spring runs past 1 on a hero word. Opacity must not.
        const lit = enter < 0 ? 0 : Math.min(1, Math.max(0, s));
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: lit,
              transform: hero
                ? `translateY(${interpolate(s, [0, 1], [size * 0.3, 0])}px) scale(${interpolate(
                    s,
                    [0, 1],
                    [0.92, 1],
                  )})`
                : `translateY(${interpolate(s, [0, 1], [size * 0.28, 0])}px)`,
              color:
                hit || (speaking && !hero) ? palette.accent : palette.ink,
            }}
          >
            {word.w}
          </span>
        );
      })}
    </div>
  );
};

// ------------------------------------------------------------------ ink
const gen = rough.generator();

export type Shape = "circle" | "box" | "underline" | "strike" | "arrow" | "highlight";

/** Deterministic jitter. A mark must land in the same place on every frame or it
 *  boils; Math.random would redraw it 30 times a second. */
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const strokes = (
  shape: Shape,
  x: number,
  y: number,
  w: number,
  h: number,
  seed: number,
  sw: number,
) => {
  const o = { seed, roughness: 1.6, bowing: 1.6, strokeWidth: sw, stroke: vox.accent };
  if (shape === "circle") return [gen.ellipse(x + w / 2, y + h / 2, w, h, o)];
  if (shape === "box") return [gen.rectangle(x, y, w, h, o)];
  // highlight is drawn by <Marker>, not stroked — but a script typo shouldn't
  // silently become an arrow across the frame.
  if (shape === "underline" || shape === "highlight")
    return [gen.linearPath([[x, y + h], [x + w, y + h]], o)];
  if (shape === "strike")
    return [gen.linearPath([[x, y + h / 2], [x + w, y + h / 2]], o)];
  // arrow: shaft first, then the head, so it draws the way a hand would
  const head = Math.min(w, h) * 0.32 || w * 0.18;
  return [
    gen.linearPath([[x, y + h], [x + w, y]], o),
    gen.linearPath(
      [[x + w - head, y + head * 0.25], [x + w, y], [x + w - head * 0.25, y + head]],
      o,
    ),
  ];
};

/**
 * The hand-drawn annotation — the one mark that makes an explainer feel authored
 * rather than generated. `progress` 0..1 draws it on; each stroke takes its own
 * slice, so an arrow's head arrives after its shaft.
 */
export const DrawIn: React.FC<{
  shape: Shape;
  x: number;
  y: number;
  w: number;
  h?: number;
  progress: number;
  color?: string;
  strokeWidth?: number;
  seed?: number;
}> = ({ shape, x, y, w, h, progress, color = vox.accent, strokeWidth, seed = 7 }) => {
  const { width, height } = useVideoConfig();
  const sw = strokeWidth ?? width * 0.008;
  const box = h ?? w * 0.5;
  const paths = React.useMemo(
    () => strokes(shape, x, y, w, box, seed, sw).flatMap((d) => gen.toPaths(d)),
    [shape, x, y, w, box, seed, sw],
  );
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", inset: 0, overflow: "visible" }}
    >
      {paths.map((p, i) => {
        const slice = interpolate(progress * paths.length - i, [0, 1], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - slice}
          />
        );
      })}
    </svg>
  );
};

/**
 * Highlighter. A band of ink laid over the words with a wobbly edge, swept on
 * left to right the way a hand drags a marker.
 *
 * It multiplies rather than covers, which is the whole reason it reads as
 * highlighter and not as a coloured rectangle sitting on top of the type: real
 * marker ink darkens what is under it and leaves the letterforms showing.
 */
export const Marker: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  progress: number;
  color?: string;
  seed?: number;
}> = ({ x, y, w, h, progress, color = vox.accent, seed = 5 }) => {
  const { width, height } = useVideoConfig();
  const d = React.useMemo(() => {
    const r = rng(seed);
    const n = 14;
    const top: string[] = [];
    const bottom: string[] = [];
    for (let i = 0; i <= n; i++) {
      const px = x + (w * i) / n;
      top.push(`${px.toFixed(1)},${(y + (r() - 0.5) * h * 0.18).toFixed(1)}`);
      bottom.push(`${px.toFixed(1)},${(y + h + (r() - 0.5) * h * 0.18).toFixed(1)}`);
    }
    // The nib rounds off where the stroke starts and stops.
    return `M ${top.join(" L ")} L ${bottom.reverse().join(" L ")} Z`;
  }, [x, y, w, h, seed]);

  // Per-instance, not per-seed: two markers sharing a seed would share a clip
  // path, and the second would sweep on with the first one's progress.
  const clip = `marker${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "visible",
        mixBlendMode: "multiply",
      }}
    >
      <defs>
        <clipPath id={clip}>
          <rect x={x - h * 0.2} y={y - h} width={Math.max(0, w * progress + h * 0.2)} height={h * 3} />
        </clipPath>
      </defs>
      <path d={d} fill={color} opacity={0.3} clipPath={`url(#${clip})`} />
    </svg>
  );
};

/**
 * A hand-drawn leader line from a label to the thing it names. Two strokes so
 * it draws elbow-first, the way you'd point at something on a page.
 */
export const Leader: React.FC<{
  from: [number, number];
  to: [number, number];
  progress: number;
  color?: string;
  seed?: number;
}> = ({ from, to, progress, color = vox.accent, seed = 3 }) => {
  const { width, height } = useVideoConfig();
  const sw = width * 0.005;
  const paths = React.useMemo(() => {
    const o = { seed, roughness: 1.4, bowing: 2.2, strokeWidth: sw, stroke: color };
    const elbow: [number, number] = [from[0] + (to[0] - from[0]) * 0.45, to[1]];
    return gen
      .toPaths(gen.linearPath([from, elbow, to], o))
      .map((p) => p.d);
  }, [from, to, seed, sw, color]);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ position: "absolute", inset: 0, overflow: "visible" }}
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - progress}
        />
      ))}
    </svg>
  );
};

/**
 * A clipping torn out and laid on the page — the device an explainer uses to
 * say "this is not me claiming it". Tilted a degree or two, because a thing
 * placed by hand is never square to the page.
 */
export const Clipping: React.FC<{
  quote: string;
  source?: string;
  progress: number;
  seed?: number;
}> = ({ quote, source, progress, seed = 2 }) => {
  const { width } = useVideoConfig();
  const tilt = (rng(seed)() - 0.5) * 3;
  const lift = interpolate(progress, [0, 1], [width * 0.05, 0]);
  const size = width * (quote.length > 90 ? 0.038 : quote.length > 50 ? 0.046 : 0.056);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        background: "#FBF9F4",
        padding: width * 0.055,
        borderLeft: `${width * 0.012}px solid ${vox.accent}`,
        boxShadow: `0 ${width * 0.02}px ${width * 0.05}px rgba(26,26,26,.18)`,
        transform: `rotate(${tilt}deg) translateY(${lift}px)`,
        opacity: progress,
      }}
    >
      <div
        style={{
          fontFamily: vox.font,
          fontWeight: 700,
          fontSize: size,
          lineHeight: 1.25,
          letterSpacing: -size * 0.015,
          color: vox.ink,
        }}
      >
        {quote}
      </div>
      {source ? (
        <div
          style={{
            marginTop: width * 0.03,
            fontFamily: vox.font,
            fontWeight: 700,
            fontSize: width * 0.026,
            letterSpacing: width * 0.003,
            textTransform: "uppercase",
            color: vox.muted,
          }}
        >
          — {source}
        </div>
      ) : null}
    </div>
  );
};

// ------------------------------------------------------------------ icons
const ICONS = icons as unknown as Record<
  string,
  React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>
>;

const pascal = (name: string) =>
  name
    .trim()
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

/**
 * Thin-stroke line icon. `stroke` is in lucide's 24-unit viewBox, not pixels —
 * scaling it with `size` is what turns an icon language into clip art.
 * An unknown name draws a circle rather than crashing the render, because a
 * script typo shouldn't cost an hour.
 */
export const LineIcon: React.FC<{
  name: string;
  size: number;
  color?: string;
  stroke?: number;
}> = ({ name, size, color = vox.ink, stroke = 1.5 }) => {
  const Icon = ICONS[pascal(name)] ?? ICONS.Circle;
  return <Icon size={size} color={color} strokeWidth={stroke} />;
};

// ------------------------------------------------------------------ charts
/**
 * Whatever the script wrote around a number. "$2260" carries a prefix, "0.4%" a
 * suffix — the unit is already in the script, so no module has to be told it a
 * second time.
 */
export const affix = (raw: string) => ({
  prefix: /^[^\d.-]+/.exec(raw)?.[0] ?? "",
  suffix: /[^\d.-]+$/.exec(raw)?.[0] ?? "",
});

export const num = (value: number, prefix = "", suffix = "") =>
  prefix +
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value) +
  suffix;

/**
 * A line drawn in ink on the page. Straight segments, not a smoothed curve —
 * a smoothed curve invents values between the points it was given.
 */
export const InkChart: React.FC<{
  data: number[];
  x: number;
  y: number;
  w: number;
  h: number;
  progress: number;
  labels?: string[];
  unit?: string;
  /** Ink for another room. The crime engine draws this chart on dark film,
   *  where vox's page ink is invisible. */
  colors?: { ink: string; accent: string; rule: string; muted: string; font: string };
}> = ({ data, x, y, w, h, progress, labels, unit = "", colors = vox }) => {
  const { width } = useVideoConfig();
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const top = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const px = data.length > 1 ? (i / (data.length - 1)) * w : w / 2;
    return [px, h - (v / top) * h * 0.92] as const;
  });
  const line = pts.map(([px, py], i) => `${i ? "L" : "M"}${px} ${py}`).join(" ");
  const sw = width * 0.009;

  // The head rides the line instead of hopping between vertices. Points are
  // evenly spaced in x, so walking the polyline by index lands the dot exactly
  // on the clip edge — the number is always the value at the pen tip.
  const span = Math.max(0, Math.min(1, progress)) * (pts.length - 1);
  const seg = Math.min(Math.floor(span), Math.max(0, pts.length - 2));
  const into = pts.length > 1 ? span - seg : 0;
  const lerp = (a: number, b: number) => a + (b - a) * into;
  const next = Math.min(seg + 1, pts.length - 1);
  const head: readonly [number, number] = [
    lerp(pts[seg][0], pts[next][0]),
    lerp(pts[seg][1], pts[next][1]),
  ];
  const headValue = lerp(data[seg], data[next]);
  // Labels light as the pen passes them, which is a step, not a slide.
  const headIndex = Math.min(pts.length - 1, Math.round(span));

  return (
    <svg
      width={w}
      height={h + width * 0.02}
      style={{ position: "absolute", left: x, top: y, overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`fill${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colors.accent} stopOpacity={0.22} />
          <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
        </linearGradient>
        <clipPath id={`clip${id}`}>
          <rect x={-sw} y={-h} width={progress * (w + sw * 2)} height={h * 3} />
        </clipPath>
      </defs>
      {/* baseline and ticks: the page's own ruled lines */}
      <line x1={0} y1={h} x2={w} y2={h} stroke={colors.ink} strokeWidth={sw * 0.5} />
      {pts.map(([px], i) => (
        <line
          key={i}
          x1={px}
          y1={h}
          x2={px}
          y2={h + width * 0.012}
          stroke={colors.rule}
          strokeWidth={sw * 0.4}
        />
      ))}
      <g clipPath={`url(#clip${id})`}>
        <path d={`${line} L ${w} ${h} L 0 ${h} Z`} fill={`url(#fill${id})`} />
        <path
          d={line}
          fill="none"
          stroke={colors.accent}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {progress > 0.02 ? (
        <>
          <circle cx={head[0]} cy={head[1]} r={sw * 1.1} fill={colors.accent} />
          {/* The value the line has reached. A zero-based axis is the honest
              one, and it makes a 20% fall look small — so state the number. */}
          <text
            x={Math.min(head[0], w - width * 0.08)}
            y={head[1] - width * 0.03}
            textAnchor={head[0] > w * 0.85 ? "end" : "middle"}
            fontFamily={colors.font}
            fontWeight={800}
            fontSize={width * 0.045}
            fill={colors.accent}
          >
            {num(headValue, unit)}
          </text>
        </>
      ) : null}
      {labels
        ? labels.map((label, i) =>
            i < pts.length ? (
              <text
                key={i}
                x={pts[i][0]}
                y={h + width * 0.052}
                textAnchor="middle"
                fontFamily={colors.font}
                fontWeight={700}
                fontSize={width * 0.026}
                fill={i <= headIndex ? colors.ink : colors.muted}
                opacity={i <= headIndex ? 1 : 0.4}
              >
                {label}
              </text>
            ) : null,
          )
        : null}
    </svg>
  );
};

// ------------------------------------------------------------------ footage
/** Whether tools/fetch-footage.py has a clip for this beat. Modules ask so they
 *  can pick a text colour that survives either background. */
export const hasFootage = (beat: number) => Boolean(FOOTAGE[String(beat)]);

/**
 * Every frame the fetcher produced for a beat, in order: `beat-3.jpg`,
 * `beat-3-2.jpg`, `beat-3-3.jpg`. The collage lays them out as separate
 * clippings, so it needs the whole set rather than the first one.
 *
 * Reads the manifest instead of guessing filenames — a beat that only got two
 * of its three variants must stage two cards, not one card and one broken image.
 */
export const beatFrames = (beat: number) =>
  Object.keys(FOOTAGE)
    .filter((k) => k === String(beat) || k.startsWith(`${beat}-`))
    .sort((a, b) => a.length - b.length || a.localeCompare(b))
    .map((k) => FOOTAGE[k]);

/**
 * A printer's dot screen. This is what makes a photograph sit *on* the page
 * rather than in a window cut through it — a Vox frame's archival never looks
 * like video playing behind paper, it looks like something that went through
 * the same press as the type.
 *
 * A CSS dot grid rather than an SVG filter on purpose: `feImage`-based halftones
 * re-rasterise the whole element every frame, and this composites on the GPU.
 */
export const Halftone: React.FC<{ size?: number; opacity?: number }> = ({
  size = 4,
  opacity = 0.34,
}) => (
  <AbsoluteFill
    style={{
      backgroundImage: `radial-gradient(${vox.ink} 22%, transparent 23%)`,
      backgroundSize: `${size}px ${size}px`,
      mixBlendMode: "multiply",
      opacity,
    }}
  />
);

/**
 * Archival clip, graded back towards the page so it sits with the ink instead
 * of fighting it. With no clip downloaded yet the beat still stages — it stays
 * a paper page, which is the honest fallback and still looks deliberate.
 */
export const ArchivalBG: React.FC<{ beat: number; progress: number }> = ({
  beat,
  progress,
}) => {
  const src = FOOTAGE[String(beat)];
  const scale = interpolate(progress, [0, 1], [1.12, 1.0]);
  if (!src) {
    return (
      <AbsoluteFill>
        <PaperBG />
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 65% 45% at 50% 46%, transparent 40%, ${vox.paperDeep} 100%)`,
            transform: `scale(${scale})`,
          }}
        />
      </AbsoluteFill>
    );
  }
  const grade = "saturate(0.5) contrast(1.08) brightness(0.96)";
  const fit = { width: "100%", height: "100%", objectFit: "cover" } as const;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        {/^.+\.mp4$/i.test(src) ? (
          // No loop: OffthreadVideo can't, so fetch-footage.py picks clips at
          // least as long as the beat instead.
          <OffthreadVideo src={staticFile(src)} muted style={{ ...fit, filter: grade }} />
        ) : (
          <Img src={staticFile(src)} style={{ ...fit, filter: grade }} />
        )}
      </AbsoluteFill>
      <AbsoluteFill
        style={{ backgroundColor: vox.paper, mixBlendMode: "soft-light", opacity: 0.55 }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 60% at 50% 48%, transparent 30%, ${vox.ink} 130%)`,
          opacity: 0.5,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: GRAIN,
          backgroundSize: "180px 180px",
          opacity: 0.35,
          mixBlendMode: "multiply",
        }}
      />
    </AbsoluteFill>
  );
};
