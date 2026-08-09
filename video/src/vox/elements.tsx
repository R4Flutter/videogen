// The Vox Kit: the visual vocabulary an explainer is built from, mirroring
// ../elements.tsx. Everything here sizes itself off the canvas rather than off
// 1080x1920 constants, so the same components stage a 9:16 short and a 16:9
// essay without branching.
import React from "react";
import {
  AbsoluteFill,
  Easing,
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
import { useDepth } from "../editorial/camera.ts";
import footage from "../footage.json";
import { BAND, fitBlock, numberFormat } from "./layout";

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
  const { fps, width, height } = useVideoConfig();
  const hero = mode === "hero";
  const groups = React.useMemo(() => phrases(words, hero ? 6 : 4), [words, hero]);
  if (!groups.length) return null;

  const active =
    groups.find((g) => t < g[g.length - 1].end) ?? (hero ? groups[groups.length - 1] : null);
  if (!active) return null;

  // Long phrases step down rather than wrap into a wall — and then get measured,
  // because the step-down is a guess from character count and a phrase of six
  // wide words at 0.088 still overruns the page it is set on.
  const chars = active.reduce((n, word) => n + word.w.length + 1, 0);
  const line = active.map((w) => w.w).join(" ");
  const stepped = hero
    ? width * (chars > 46 ? 0.088 : chars > 30 ? 0.108 : 0.132)
    : width * 0.048;
  const size = fitBlock(
    hero ? line.toUpperCase() : line,
    width * 0.85,
    // The hero owns the middle of the page; a caption owns one band of it.
    hero ? height * 0.46 : height * (BAND.bottom - BAND.caption),
    stepped,
    {
      weight: hero ? 800 : 700,
      family: palette.font,
      tracking: hero ? -stepped * 0.03 : -stepped * 0.012,
    },
    hero ? 0.95 : 1.2,
  );

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
  // The pen's readout is printed inside the plot, so a seven-figure series has
  // to compact or it runs into the next label. Chosen from the top of the
  // series, so every readout on this chart is the same shape.
  const fmt = numberFormat(top);
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
            {fmt(headValue, unit)}
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
                // The end labels range in rather than centring. A centred label
                // on the first point puts half of itself left of the plot, which
                // on a chart drawn at the page margin is half of itself off the
                // canvas — which is exactly where "Earned so far" was going.
                textAnchor={i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle"}
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
/**
 * A layer at `depth`, under whatever camera the enclosing CameraRig is running.
 *
 * Depth is distance from the lens: **1 is the subject plane** — the type, the
 * thing the beat is about — and it takes the camera exactly. Below 1 sits
 * behind the subject and takes less of the move, which is where the depth comes
 * from. Above 1 is in front, which only a vignette or a glare ever is.
 *
 * Two motions come out of this and only one of them is new. The drift is the
 * old free-running sine, kept: it is what stops a held frame from freezing.
 * The camera response is the part that was missing — the rig's push arrives at
 * each plane scaled by that plane's depth, so the page falls away behind the
 * picture and the picture falls away behind the type. That rate difference *is*
 * the depth. Without it, three layers under one shared scale are one slab with
 * a zoom on it, however hard each one wobbles.
 *
 * Outside a rig the camera reads identity and this degrades to pure drift.
 */
export const useParallax = (seed: number, depth: number) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const d = depth;
  // Drift scales with depth too — nearer things wander more than far ones — and
  // the seeded sign keeps neighbouring beats from all drifting in lockstep.
  const amp = width * 0.009 * d * (seed % 2 ? -1 : 1);
  const x = Math.sin((frame + seed * 17) / 190) * amp;
  const y = Math.cos((frame + seed * 11) / 240) * amp * 0.6;
  const cam = useDepth(d);
  return {
    x,
    y,
    /** Ready to drop straight into `style`: drift and camera response together.
     *  Layers that only need the offset can still read `x`/`y`, but they lose
     *  the camera and go flat again — prefer this. */
    style: {
      transform: `translate(${x}px, ${y}px) ${cam.transform}`,
      transformOrigin: cam.transformOrigin,
    } as const,
    /** Same thing for a layer that is a sub-box of the canvas rather than a
     *  full-bleed one: percentage origins would resolve against the box and
     *  aim the scale at the wrong point on the page. `extra` goes on first, so
     *  a plate's own arrival slide still reads as a slide. */
    box: (left: number, top: number, extra = "") =>
      ({
        transform: `${extra} translate(${x}px, ${y}px) ${cam.transform}`,
        transformOrigin: `${cam.anchor.x - left}px ${cam.anchor.y - top}px`,
      }) as const,
  };
};

/** Whether tools/fetch-footage.py has anything at all for this beat. Modules ask
 *  so they can stage the frame differently when there is a picture in it. */
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
 * Whether this beat's pictures are *moving* ones.
 *
 * The distinction the engine was missing. A video clip fills and darkens the
 * frame, so the type goes white and the page is covered. A still does not: it
 * gets pasted onto the page, the page stays visible, and the type stays ink.
 * Sending both down the same path is what made every generated image render as
 * a full-bleed photograph with a slow zoom on it.
 */
export const isClip = (beat: number) =>
  beatFrames(beat).some((src) => /\.(mp4|webm|mov)$/i.test(src));

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

/** Where the plate sits, as fractions of the canvas. Both leave the zone
 *  scene-prompts.mjs already reserves for type — the left third and the bottom
 *  fifth in landscape, the top fifth and the bottom quarter in portrait — so
 *  the picture lands in the space its own prompt was written to leave empty. */
const PLATE = {
  wide: { x: 0.37, y: 0.1, w: 0.57, h: 0.72 },
  tall: { x: 0.06, y: 0.215, w: 0.88, h: 0.5 },
};

/** The curve a page arrives on in transitions.tsx. Reused so a plate landing
 *  and a page turning are recognisably the same hand. */
const SETTLE = Easing.bezier(0.22, 1, 0.36, 1);
const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/**
 * A still, staged as a printed plate on the page.
 *
 * This is the frame the engine was missing, and its absence is why generated
 * images came out as a slow zoom. Every still used to go through the clip path
 * below: full-bleed `cover`, graded dark, scaled 1.16 -> 1.02 across the beat.
 * Three things went wrong at once. `cover` crops away the negative space the
 * prompt sheet reserved for type. The paper wash and vignette bury the page,
 * which is the entire brand. And a scale ramp on a flat rectangle **is** a
 * zoom — there is nothing behind it to move against, so no amount of drift
 * reads as parallax.
 *
 * Here the page stays the page and the picture is pasted onto it: paper on the
 * far plane, a printed panel on the middle one, the picture on the near one.
 * They translate at 1 : 0.38 : 0.12 and **nothing scales**. The depth is the
 * rate difference — the same rule PaperBG has always run on.
 */
export const EditorialStill: React.FC<{ beat: number; progress: number }> = ({
  beat,
  progress,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const srcs = beatFrames(beat);

  // Three planes behind the type, measured back from the subject. The picture
  // is what the beat is about so it sits nearly on the subject plane; the
  // printer's rule is a shade behind it; the page is furthest back and barely
  // takes the camera at all.
  //
  // The old depths were 1.6 : 0.5 : 0.12 against a drift-only amplitude of
  // width * 0.013, which separated the picture from the page by roughly 0.6% of
  // frame width across a whole beat — measurable, and invisible. Parallax has to
  // clear about 1.5% before the eye reads it as depth rather than as drift.
  // These clear it, and most of the separation now comes from the camera rather
  // than the drift: under a `push` the page falls away behind a picture that
  // holds its size, which is what a lens does to a thing lying on a desk.
  const near = useParallax(beat, 0.95);
  const mid = useParallax(beat + 3, 0.6);
  const far = useParallax(beat + 7, 0.25);

  const box = width > height ? PLATE.wide : PLATE.tall;
  const L = width * box.x;
  const T = height * box.y;
  const W = width * box.w;
  const H = height * box.h;
  // Deterministic, not random: a tilt resampled per frame is a clipping
  // vibrating on the table. Same rule the collage already follows.
  const tilt = (((beat * 7) % 5) - 2) * 0.45;
  const panel = interpolate(frame, [0, 11], [0, 1], { ...CLAMP, easing: SETTLE });
  const seg = 1 / Math.max(1, srcs.length);

  return (
    <AbsoluteFill>
      {/* far — the page, barely moving */}
      <AbsoluteFill style={far.style}>
        <PaperBG />
      </AbsoluteFill>

      {/* mid — the baseline the picture stands on, drawn left to right as the
          beat opens. A printer's guide, not an accent: the accent is already in
          the picture, and two of them breaks the one-colour-one-job rule.

          There was a filled panel here and it was a mistake worth recording.
          `darken` keys the picture against whatever is painted *under* it, so a
          panel darker than the paper became the thing the picture's ground
          matched — the cut-out stopped working and every plate rendered as a
          grey block. The picture has to sit on the page itself or not sit at
          all, which is also the more honest Vox frame: a cut-out floats, it is
          not mounted.

          No picture on disk yet: the beat stays a bare page rather than a rule
          waiting for one. That is the honest fallback, and it is exactly what
          the old full-bleed path got wrong — it staged an *empty* slot as a
          zooming vignette, which is the "it only zooms in and out" you get
          whenever footage.json is missing the beat. */}
      {srcs.length === 0 ? null : (
        <div
          style={{
            position: "absolute",
            left: L,
            top: T + H,
            width: W,
            height: Math.max(1, height * 0.0022),
            background: vox.rule,
            ...mid.style,
            clipPath: `inset(0 ${(1 - panel) * 100}% 0 0)`,
          }}
        />
      )}

      {srcs.map((src, i) => {
        // Each still owns a slice of the beat and arrives into it. The one
        // before it leaves the other way, so the swap is two things moving past
        // each other on the page — not one photograph dissolving into another.
        const t = (progress - i * seg) / seg;
        if (t < -0.2 || t > 1.3) return null;
        const dir = (beat + i) % 2 ? -1 : 1;
        const arrive = interpolate(t, [0, 0.18], [0, 1], { ...CLAMP, easing: SETTLE });
        // The leave window is the *next* still's arrive window, in the same
        // progress space — a slot ends at t=1 and the one after it begins its
        // own t=0 there, so [1, 1.18] here is exactly [0, 0.18] there. Timed any
        // earlier and the two do not overlap: the outgoing picture is already at
        // zero while the incoming one is still half-faded, and the beat blinks
        // to bare paper in the middle of itself.
        const leave =
          i === srcs.length - 1
            ? 0
            : interpolate(t, [1, 1.18], [0, 1], { ...CLAMP, easing: SETTLE });
        const dx = ((1 - arrive) - leave) * width * 0.055 * dir;
        const dy = (1 - arrive) * height * 0.02;
        const opacity = arrive * (1 - leave);
        if (opacity <= 0) return null;

        // The picture and its dot screen are siblings sharing one transform,
        // deliberately: wrapping them in a transformed parent would give the
        // group its own stacking context, and `mix-blend-mode` only ever blends
        // within the group it is painted into. Isolated, `darken` blends the
        // picture against nothing and the paper ground stays a visible rectangle.
        const place = {
          position: "absolute",
          left: L,
          top: T,
          width: W,
          height: H,
          opacity,
          ...near.box(L, T, `translate(${dx}px, ${dy}px) rotate(${tilt}deg)`),
        } as const;

        return (
          <React.Fragment key={src}>
            <Img
              src={staticFile(src)}
              style={{
                ...place,
                objectFit: "contain",
                // Sat on the rule rather than floating above it. `contain`
                // centres by default, which leaves a cut-out hovering in a box
                // it has no visible relationship to.
                objectPosition: "center bottom",
                // The generated ground *is* the page colour — #F4F1EA, straight
                // off the prompt sheet's style line — so `darken` keeps whichever
                // of picture and page is darker and the ground disappears into
                // the paper. A free cut-out, no preprocessing, for any .jpg the
                // sheet produced. A .png is assumed to carry real alpha already
                // (tools/cutout.py) and is composited normally.
                mixBlendMode: /\.png$/i.test(src) ? "normal" : "darken",
                // brightness lifts the ground clear of the page's warm centre so
                // `darken` cannot dirty the paper it lands on. 1.06 clips a flat
                // generated ground to white outright; measured against the sheet's
                // own output, 1.03 left about a 2% warm cast at the page edges.
                //
                // It is an approximation and it has a limit: where the generator
                // *shaded* the ground instead of keeping it flat, no blend can
                // key it and a faint haze survives. `tools/plate.py` is the real
                // answer — it alpha-keys the ground and writes a .png, which the
                // test above then composites normally with no blend at all.
                filter: "saturate(0.94) contrast(1.05) brightness(1.06)",
              }}
            />
            <div
              style={{
                ...place,
                opacity: opacity * 0.3,
                backgroundImage: `radial-gradient(${vox.ink} 22%, transparent 23%)`,
                backgroundSize: "4px 4px",
                mixBlendMode: "multiply",
              }}
            />
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Archival *clip*, graded back towards the page so it sits with the ink instead
 * of fighting it. Full-bleed, because a moving picture that is only part of the
 * frame is a video window, and a video window is not something this page does.
 *
 * A beat has three framings, not one. Holding a single frame for eight seconds
 * kills the beat however well it pans, so they divide the beat between them and
 * each cross-fades in over the last — establishing, then detail, then context,
 * which is the order the prompt sheet writes them in.
 */
const ClipBG: React.FC<{ beat: number; progress: number }> = ({
  beat,
  progress,
}) => {
  const { width } = useVideoConfig();
  const srcs = beatFrames(beat);
  // The photograph sits behind the type that will be printed over it, so it
  // falls away under a push while the headline holds — which is exactly the
  // relationship the old `-0.34` counter-drift was reaching for by hand.
  const near = useParallax(beat, 0.6);
  // The light on it is glass in *front* of the lens, the one thing in this file
  // that legitimately sits nearer than the subject: it slides across the picture
  // under the same camera instead of being painted onto it. That rate difference
  // is the whole illusion, and a vignette has no edges to crop.
  const far = useParallax(beat + 3, 1.5);
  // The floor is 1.06 and not 1.02: this layer pans itself as well as taking the
  // camera's pan, and 2% of overscan is 1% a side, which the two together clear.
  const scale = interpolate(progress, [0, 1], [1.18, 1.06]);
  const pan = interpolate(progress, [0, 1], [0, width * 0.03 * (beat % 2 ? -1 : 1)]);
  if (!srcs.length) {
    return (
      <AbsoluteFill>
        <PaperBG />
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse 65% 45% at 50% 46%, transparent 40%, ${vox.paperDeep} 100%)`,
            ...far.style,
            transform: `scale(${scale}) ${far.style.transform}`,
          }}
        />
      </AbsoluteFill>
    );
  }
  const grade = "saturate(0.5) contrast(1.08) brightness(0.96)";
  const fit = { width: "100%", height: "100%", objectFit: "cover" } as const;
  const seg = 1 / srcs.length;
  return (
    <AbsoluteFill>
      {srcs.map((src, i) => {
        // Each still covers the frame, so a later one arriving at full opacity
        // hides the one under it — no fade-out is needed, and not writing one
        // means two layers can never both be half-transparent over bare paper.
        const opacity =
          i === 0
            ? 1
            : interpolate(progress, [i * seg - 0.07, i * seg], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
        if (opacity <= 0) return null;
        // Its own move, run against its own slice of the beat rather than the
        // whole thing, and panning the other way from its neighbour: three
        // stills all drifting left at the same rate reads as one long photo.
        const t = interpolate(progress, [i * seg, (i + 1) * seg], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const dir = (beat + i) % 2 ? -1 : 1;
        return (
          <AbsoluteFill
            key={src}
            style={{
              opacity,
              transformOrigin: near.style.transformOrigin,
              transform:
                `translate(${pan * dir + t * width * 0.035 * dir}px, 0px) ` +
                `scale(${interpolate(t, [0, 1], [1.18, 1.06])}) ` +
                near.style.transform,
            }}
          >
            {/^.+\.mp4$/i.test(src) ? (
              // No loop: OffthreadVideo can't, so fetch-footage.py picks clips
              // at least as long as the beat instead.
              <OffthreadVideo src={staticFile(src)} muted style={{ ...fit, filter: grade }} />
            ) : (
              <Img src={staticFile(src)} style={{ ...fit, filter: grade }} />
            )}
          </AbsoluteFill>
        );
      })}
      <AbsoluteFill
        style={{ backgroundColor: vox.paper, mixBlendMode: "soft-light", opacity: 0.55 }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 60% at 50% 48%, transparent 30%, ${vox.ink} 130%)`,
          opacity: 0.5,
          ...far.style,
          transform: `scale(1.06) ${far.style.transform}`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: GRAIN,
          backgroundSize: "180px 180px",
          opacity: 0.35,
          mixBlendMode: "multiply",
          // Locked. Grain is the page's own texture, so it rides the base camera
          // with everything else and takes no depth of its own — a print texture
          // that slides against the print it is on is a dirty sensor, not depth.
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * What a beat's pictures actually are decides how they are staged, and the
 * modules don't have to care which they got.
 *
 * A dispatcher rather than a branch inside one component on purpose: both
 * halves call hooks, and a conditional return above them is the rules-of-hooks
 * violation eslint would (correctly) refuse.
 */
export const ArchivalBG: React.FC<{ beat: number; progress: number }> = ({
  beat,
  progress,
}) =>
  isClip(beat) ? (
    <ClipBG beat={beat} progress={progress} />
  ) : (
    <EditorialStill beat={beat} progress={progress} />
  );
