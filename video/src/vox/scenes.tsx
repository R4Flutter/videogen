// One module per beat, same contract as ../scenes.tsx: the director
// (script.json) picks which one runs when, and each owns its staging. A vox
// script never writes JSX — it writes a beat with a module name.
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";
import { Collage } from "./collage";
import { Funnel } from "./funnel";
import { MapScene } from "./map";
import { Trace } from "./trace";
import { Trust } from "./trust";
import {
  affix,
  ArchivalBG,
  Clipping,
  DrawIn,
  hasFootage,
  InkChart,
  Kicker,
  KineticText,
  Leader,
  LineIcon,
  Marker,
  num,
  Shape,
  Word,
} from "./elements";

const vox = theme.vox;

/** What a vox beat carries beyond the fields every engine has. All optional:
 *  a beat that says nothing extra still stages. */
export type VoxBeat = {
  n: number;
  name: string;
  start: number;
  end: number;
  module: string;
  vo: string;
  visual: string;
  /** The Motion FX line, verbatim. Modules read it for staging hints the shape
   *  vocabulary doesn't cover — `map` looks for "globe" in it. */
  motion?: string;
  text?: string;
  shape?: string;
  source?: string;
  icons?: { icon: string; label: string }[];
  data?: { label: string; value: number; raw?: string }[];
  /** `map` only. A bare name is a country to ink in; one with coordinates is a
   *  pin to drop. Two or more pins draw a route between them. */
  places?: { name: string; lat?: number; lon?: number }[];
  /** The phrase a mid-beat reversal lands on, for modules that collapse
   *  (`trust`). Named by the script, because every story turns on its own line. */
  turn?: string;
};

export type VoxSceneProps = { dur: number; beat: VoxBeat; words: Word[] };

const ease = (frame: number, a: number, b: number, out: readonly [number, number] = [0, 1]) =>
  interpolate(frame, [a, b], out, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });

/** Page margins as a fraction of the canvas, so 9:16 and 16:9 both breathe. */
export const useMargin = () => {
  const { width, height } = useVideoConfig();
  return { width, height, pad: width * 0.075, wide: width > height };
};

const Stage: React.FC<{ children: React.ReactNode; align?: "center" | "flex-start" }> = ({
  children,
  align = "center",
}) => {
  const { pad } = useMargin();
  return (
    <AbsoluteFill
      style={{
        padding: pad,
        // room the caption card lives in, reserved in every module so nothing
        // has to know whether this beat is captioned
        paddingBottom: pad * 2.6,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: align,
        gap: pad * 0.7,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** The hook and the payoff: the words fill the page and land as they're said. */
export const Kinetic: React.FC<VoxSceneProps> = ({ beat, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Stage>
      <Kicker text={beat.name} enter={frame - 4} />
      <KineticText words={words} t={frame / fps} mode="hero" />
    </Stage>
  );
};

/**
 * Archival clip under a headline, optionally with the one hand-drawn mark that
 * says a person made this. The mark draws while the line is being spoken.
 *
 * The headline is placed absolutely rather than by flexbox: there are no text
 * metrics at render time, so the only way the mark can land on the words is if
 * the block it encloses is a box this component decided the size of.
 */
const Plate: React.FC<VoxSceneProps & { mark: boolean }> = ({ dur, beat, mark }) => {
  const frame = useCurrentFrame();
  const { width, height, pad } = useMargin();
  const clip = hasFootage(beat.n);
  const headline = (beat.text || beat.name).toUpperCase();
  const size = width * (headline.length > 30 ? 0.086 : 0.11);
  const maxW = width - pad * 2;
  // Uppercase Archivo 800 runs about 0.55em per glyph. Close enough for a
  // hand-drawn mark, which is forgiving by design.
  const runW = headline.length * size * 0.55;
  const lines = Math.max(1, Math.ceil(runW / maxW));
  const blockW = Math.min(maxW, runW);
  const blockH = lines * size;
  const top = height * 0.46 - blockH / 2;
  const left = (width - blockW) / 2;

  const shape = (beat.shape || "underline") as Shape;
  const box =
    shape === "circle" || shape === "box"
      ? {
          x: left - pad * 0.35,
          y: top - size * 0.2,
          w: blockW + pad * 0.7,
          h: blockH + size * 0.4,
        }
      : { x: left, y: top, w: blockW, h: blockH + size * 0.06 };

  return (
    <>
      <ArchivalBG beat={beat.n} progress={ease(frame, 0, dur)} />
      <div style={{ position: "absolute", left: pad, top: pad * 1.6 }}>
        <Kicker text={beat.name} enter={frame - 4} />
      </div>
      <div
        style={{
          position: "absolute",
          left: pad,
          top,
          width: maxW,
          fontFamily: vox.font,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: -size * 0.03,
          textAlign: "center",
          color: clip ? vox.paper : vox.ink,
          textShadow: clip ? `0 ${size * 0.06}px ${size * 0.3}px rgba(0,0,0,.55)` : "none",
          opacity: ease(frame, 2, 16),
        }}
      >
        {headline}
      </div>
      {mark ? (
        shape === "highlight" ? (
          <Marker
            x={box.x}
            y={box.y}
            w={box.w}
            h={box.h}
            seed={beat.n * 13}
            progress={ease(frame, dur * 0.28, dur * 0.58)}
          />
        ) : (
          <DrawIn
            shape={shape}
            x={box.x}
            y={box.y}
            w={box.w}
            h={box.h}
            seed={beat.n * 13}
            progress={ease(frame, dur * 0.28, dur * 0.62)}
          />
        )
      ) : null}
    </>
  );
};

/** The pivot: the phrase that turns the argument, circled by hand. */
export const Doodle: React.FC<VoxSceneProps> = (props) => <Plate {...props} mark />;

/**
 * Full-bleed archival under a headline. The caption track carries the words.
 *
 * It marks only when the script asked for one — "a marker highlights the phrase"
 * in Motion FX should draw, while a plain clip beat stays clean.
 */
export const Footage: React.FC<VoxSceneProps> = (props) => (
  <Plate {...props} mark={Boolean(props.beat.shape)} />
);

/** Mechanism steps as icon cards — the "here is how it actually works" frame. */
export const IconSteps: React.FC<VoxSceneProps> = ({ beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, wide, pad } = useMargin();
  const steps = beat.icons && beat.icons.length ? beat.icons : [];
  if (!steps.length) return <Kinetic dur={0} beat={beat} words={[]} />;
  const glyph = width * (wide ? 0.07 : 0.115);

  return (
    <Stage align="flex-start">
      <Kicker text={beat.name} enter={frame - 4} />
      <div
        style={{
          display: "flex",
          flexDirection: wide ? "row" : "column",
          gap: pad * 0.55,
          width: "100%",
        }}
      >
        {steps.map((step, i) => {
          const s = spring({
            frame: frame - 8 - i * 7,
            fps,
            config: { damping: 200, mass: 0.6, stiffness: 190 },
            durationInFrames: 14,
          });
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: wide ? "column" : "row",
                alignItems: wide ? "flex-start" : "center",
                gap: pad * 0.45,
                padding: pad * 0.45,
                background: vox.paper,
                border: `${width * 0.0035}px solid ${vox.rule}`,
                boxShadow: `0 ${width * 0.012}px ${width * 0.03}px rgba(26,26,26,.10)`,
                // Wiped in rather than faded up: a card that fades looks like a
                // card loading, a card that wipes looks like a card being laid
                // down. The shadow gets clipped with it, which is correct — the
                // half that isn't on the page yet casts nothing.
                clipPath: `inset(0 ${Math.max(0, (1 - s) * 100)}% 0 0)`,
                transform: `translateY(${interpolate(s, [0, 1], [width * 0.012, 0])}px)`,
              }}
            >
              <LineIcon name={step.icon} size={glyph} color={vox.accent} />
              <div
                style={{
                  fontFamily: vox.font,
                  fontWeight: 700,
                  fontSize: width * (wide ? 0.03 : 0.042),
                  lineHeight: 1.15,
                  letterSpacing: -width * 0.0006,
                  color: vox.ink,
                }}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

/** The number that carries the argument, drawn on the page. */
export const Chart: React.FC<VoxSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { width, height, pad } = useMargin();
  const rows = beat.data && beat.data.length ? beat.data : [];
  if (!rows.length) return <Kinetic dur={dur} beat={beat} words={[]} />;
  const w = width - pad * 2;
  const h = height * 0.3;
  const progress = ease(frame, 12, dur - 10);
  // The headline already names the unit ("$10,000, SITTING STILL"), so the
  // readout reuses it rather than asking the script for it twice.
  const unit = /^[^\w\s]/.exec(beat.text ?? "")?.[0] ?? "";

  return (
    <Stage align="flex-start">
      <Kicker text={beat.name} enter={frame - 4} />
      {beat.text ? (
        <div
          style={{
            fontFamily: vox.font,
            fontWeight: 800,
            fontSize: width * 0.062,
            lineHeight: 1.05,
            letterSpacing: -width * 0.0018,
            color: vox.ink,
            opacity: ease(frame, 2, 16),
          }}
        >
          {beat.text}
        </div>
      ) : null}
      <div style={{ position: "relative", width: w, height: h + width * 0.08 }}>
        <InkChart
          data={rows.map((r) => r.value)}
          labels={rows.map((r) => r.label)}
          unit={unit}
          x={0}
          y={0}
          w={w}
          h={h}
          progress={progress}
        />
      </div>
    </Stage>
  );
};

/**
 * Two quantities, same axis, growing at once. This is the whole argument of an
 * explainer in one frame — and when there are exactly two, the gap between them
 * gets boxed by hand, because the gap is the point and nobody reads it off two
 * bar ends on their own.
 */
export const Compare: React.FC<VoxSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { width, height, pad } = useMargin();
  const rows = beat.data && beat.data.length ? beat.data : [];
  const w = width - pad * 2;
  const barH = height * 0.055;
  const step = barH * 2.4;
  const first = height * 0.4;
  // The longest bar stops short of the margin so its value always has somewhere
  // to sit — no bar ever has to hide its own number.
  const track = w * 0.76;
  const top = Math.max(...rows.map((r) => r.value), 1);
  // Both bars have landed by here; the gap can only be drawn once they have.
  const settled = 48 + (rows.length - 1) * 14;
  if (!rows.length) return <Kinetic dur={dur} beat={beat} words={[]} />;

  const ends = rows.map((r) => (r.value / top) * track);
  const longest = ends.indexOf(Math.max(...ends));
  const gap =
    rows.length === 2
      ? {
          from: Math.min(ends[0], ends[1]),
          to: Math.max(ends[0], ends[1]),
          y: first + longest * step,
        }
      : null;
  const headline = beat.text ?? "";

  return (
    <>
      <div style={{ position: "absolute", left: pad, top: pad * 1.6, width: w }}>
        <Kicker text={beat.name} enter={frame - 4} />
        {headline ? (
          <div
            style={{
              marginTop: pad * 0.4,
              fontFamily: vox.font,
              fontWeight: 800,
              fontSize: width * (headline.length > 20 ? 0.058 : 0.072),
              lineHeight: 1.05,
              letterSpacing: -width * 0.002,
              color: vox.ink,
              opacity: ease(frame, 2, 16),
            }}
          >
            {headline}
          </div>
        ) : null}
      </div>

      {rows.map((row, i) => {
        const grow = ease(frame, 18 + i * 14, 48 + i * 14);
        const y = first + i * step;
        const { prefix, suffix } = affix(row.raw ?? "");
        // The last quantity is the one that beats you, so it carries the ink.
        const fill = i === rows.length - 1 ? vox.accent : vox.muted;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: pad,
                // clear of the gap box, which reaches above the bar it marks
                top: y - barH * 1.02,
                fontFamily: vox.font,
                fontWeight: 700,
                fontSize: width * 0.032,
                letterSpacing: width * 0.001,
                textTransform: "uppercase",
                color: vox.muted,
                opacity: ease(frame, 12 + i * 14, 26 + i * 14),
              }}
            >
              {row.label}
            </div>
            <div
              style={{
                position: "absolute",
                left: pad,
                top: y,
                width: ends[i] * grow,
                height: barH,
                background: fill,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: pad + ends[i] * grow + width * 0.022,
                top: y,
                height: barH,
                display: "flex",
                alignItems: "center",
                fontFamily: vox.font,
                fontWeight: 800,
                fontSize: barH * 0.72,
                lineHeight: 1,
                color: fill,
                opacity: grow,
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {num(row.value * grow, prefix, suffix)}
            </div>
          </React.Fragment>
        );
      })}

      {/* The stretch of the longer bar the shorter one never reached. That
          distance is the argument, and nobody reads it off two bar ends. */}
      {gap ? (
        <>
          <DrawIn
            shape="box"
            x={pad + gap.from}
            y={gap.y - barH * 0.22}
            w={gap.to - gap.from}
            h={barH * 1.44}
            seed={beat.n * 17}
            progress={ease(frame, settled, settled + 26)}
          />
          <div
            style={{
              position: "absolute",
              left: pad + gap.from,
              top: gap.y + barH * 1.42,
              width: gap.to - gap.from,
              textAlign: "center",
              fontFamily: vox.font,
              fontWeight: 800,
              fontSize: width * 0.034,
              letterSpacing: width * 0.001,
              textTransform: "uppercase",
              color: vox.accent,
              opacity: ease(frame, settled + 18, settled + 34),
            }}
          >
            The gap
          </div>
        </>
      ) : null}
    </>
  );
};

/** One number, alone on the page, arriving digit by digit. The cost stated. */
export const Stat: React.FC<VoxSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { width, height, pad } = useMargin();
  const row = beat.data && beat.data.length ? beat.data[0] : null;
  if (!row) return <Kinetic dur={dur} beat={beat} words={[]} />;

  const { prefix, suffix } = affix(row.raw ?? "");
  const roll = ease(frame, 10, dur * 0.5);
  const shown = num(row.value * roll, prefix, suffix);
  const size = width * (shown.length > 8 ? 0.18 : 0.24);
  const runW = shown.length * size * 0.56;
  const top = height * 0.44 - size * 0.5;

  return (
    <>
      <div style={{ position: "absolute", left: pad, top: pad * 1.6 }}>
        <Kicker text={beat.name} enter={frame - 4} />
      </div>
      <div
        style={{
          position: "absolute",
          left: pad,
          top,
          width: width - pad * 2,
          textAlign: "center",
          fontFamily: vox.font,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: -size * 0.035,
          color: vox.accent,
          // Tabular figures, or every rolling digit shifts the whole number.
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {shown}
      </div>
      <div
        style={{
          position: "absolute",
          left: pad,
          top: top + size * 1.35,
          width: width - pad * 2,
          textAlign: "center",
          fontFamily: vox.font,
          fontWeight: 700,
          fontSize: width * 0.044,
          letterSpacing: width * 0.0012,
          textTransform: "uppercase",
          color: vox.ink,
          opacity: ease(frame, dur * 0.45, dur * 0.6),
        }}
      >
        {row.label}
      </div>
      <DrawIn
        shape="underline"
        x={(width - Math.min(width - pad * 2, runW)) / 2}
        y={top}
        w={Math.min(width - pad * 2, runW)}
        h={size * 1.08}
        seed={beat.n * 23}
        progress={ease(frame, dur * 0.52, dur * 0.75)}
      />
    </>
  );
};

/**
 * Point at the thing and name it. A ring lands on the part of the frame that
 * matters, then a line runs from a label to the ring — drawn in that order,
 * because the eye has to be sent somewhere before it is told what it found.
 */
export const Callout: React.FC<VoxSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { width, height, pad, wide } = useMargin();
  const clip = hasFootage(beat.n);
  const label = (beat.text || beat.name).toUpperCase();

  const cx = width * (wide ? 0.62 : 0.56);
  const cy = height * (wide ? 0.44 : 0.34);
  const rx = width * (wide ? 0.17 : 0.25);
  const ry = rx * 0.74;

  const labelW = width * (wide ? 0.3 : 0.46);
  const labelX = pad;
  const labelY = height * (wide ? 0.62 : 0.58);
  const size = width * (wide ? 0.032 : label.length > 22 ? 0.046 : 0.058);

  return (
    <>
      <ArchivalBG beat={beat.n} progress={ease(frame, 0, dur)} />
      <div style={{ position: "absolute", left: pad, top: pad * 1.6 }}>
        <Kicker text={beat.name} enter={frame - 4} />
      </div>

      <DrawIn
        shape="circle"
        x={cx - rx}
        y={cy - ry}
        w={rx * 2}
        h={ry * 2}
        seed={beat.n * 13}
        progress={ease(frame, 8, 32)}
      />
      <Leader
        from={[labelX + labelW * 0.55, labelY]}
        to={[cx - rx * 0.78, cy + ry * 0.74]}
        seed={beat.n * 7}
        progress={ease(frame, 30, 54)}
      />

      <div
        style={{
          position: "absolute",
          left: labelX,
          top: labelY,
          width: labelW,
          padding: clip ? pad * 0.4 : 0,
          background: clip ? vox.paper : "transparent",
          boxShadow: clip ? `0 ${width * 0.012}px ${width * 0.03}px rgba(0,0,0,.3)` : "none",
          fontFamily: vox.font,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.06,
          letterSpacing: -size * 0.025,
          color: vox.ink,
          opacity: ease(frame, 44, 60),
        }}
      >
        {label}
      </div>
    </>
  );
};

/**
 * Events on an axis. Portrait runs it down the page and landscape across —
 * a horizontal timeline in 9:16 gives every label about four characters of room,
 * which is not a timeline, it's a row of dots.
 *
 * `data` here means something different from the chart modules: `value` is the
 * position in time, `label` is what happened. Positions are true to scale, so
 * an uneven span looks uneven.
 */
export const Timeline: React.FC<VoxSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { width, height, pad, wide } = useMargin();
  const rows = beat.data && beat.data.length ? beat.data : [];
  if (rows.length < 2) return <Kinetic dur={dur} beat={beat} words={[]} />;

  const lo = Math.min(...rows.map((r) => r.value));
  const hi = Math.max(...rows.map((r) => r.value));
  // All-equal values would divide by zero; fall back to even spacing.
  const at = (v: number) => (hi === lo ? 0.5 : (v - lo) / (hi - lo));

  const run = ease(frame, 10, Math.max(28, dur * 0.45));
  const axis = width * 0.006;
  const dot = width * 0.022;

  const x0 = wide ? pad * 1.6 : pad + width * 0.09;
  const y0 = wide ? height * 0.52 : height * 0.26;
  const len = wide ? width - pad * 3.2 : height * 0.46;

  return (
    <>
      <div style={{ position: "absolute", left: pad, top: pad * 1.6 }}>
        <Kicker text={beat.name} enter={frame - 4} />
        {beat.text ? (
          <div
            style={{
              marginTop: pad * 0.4,
              width: width - pad * 2,
              fontFamily: vox.font,
              fontWeight: 800,
              fontSize: width * 0.058,
              lineHeight: 1.05,
              letterSpacing: -width * 0.002,
              color: vox.ink,
              opacity: ease(frame, 2, 16),
            }}
          >
            {beat.text}
          </div>
        ) : null}
      </div>

      {/* the axis, drawn in the direction time runs */}
      <div
        style={{
          position: "absolute",
          left: x0,
          top: y0,
          width: wide ? len * run : axis,
          height: wide ? axis : len * run,
          background: vox.ink,
        }}
      />

      {rows.map((row, i) => {
        const p = at(row.value);
        // A marker cannot arrive before the axis has reached it.
        const lands = ease(frame, 10 + p * 26, 26 + p * 26);
        const pos = p * len;
        const { prefix, suffix } = affix(row.raw ?? "");
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: wide ? x0 + pos - dot / 2 : x0 + axis / 2 - dot / 2,
                top: wide ? y0 + axis / 2 - dot / 2 : y0 + pos - dot / 2,
                width: dot,
                height: dot,
                borderRadius: dot,
                background: i === rows.length - 1 ? vox.accent : vox.ink,
                transform: `scale(${lands})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: wide ? x0 + pos - width * 0.09 : x0 + dot * 1.6,
                top: wide ? y0 - height * 0.075 : y0 + pos - width * 0.026,
                width: wide ? width * 0.18 : width - pad * 2 - width * 0.14,
                textAlign: wide ? "center" : "left",
                fontFamily: vox.font,
                fontWeight: 800,
                fontSize: width * (wide ? 0.026 : 0.038),
                lineHeight: 1.1,
                color: i === rows.length - 1 ? vox.accent : vox.ink,
                opacity: lands,
              }}
            >
              <span style={{ color: vox.muted }}>
                {num(row.value, prefix, suffix)}
              </span>
              <br />
              {row.label}
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

/**
 * Somebody else's words, torn out and laid on the page. This is the module that
 * makes a money video citable instead of assertable — the number came from the
 * BLS, and the frame should say so rather than the description.
 */
export const Quote: React.FC<VoxSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const quote = beat.text || beat.vo;
  if (!quote) return <Kinetic dur={dur} beat={beat} words={[]} />;

  return (
    <Stage align="flex-start">
      <Kicker text={beat.name} enter={frame - 4} />
      <Clipping
        quote={quote}
        source={beat.source}
        seed={beat.n * 5}
        progress={ease(frame, 6, 24)}
      />
    </Stage>
  );
};

export const VOX_MODULES: Record<string, React.FC<VoxSceneProps>> = {
  kinetic: Kinetic,
  doodle: Doodle,
  icon: IconSteps,
  chart: Chart,
  compare: Compare,
  stat: Stat,
  footage: Footage,
  callout: Callout,
  timeline: Timeline,
  quote: Quote,
  trace: Trace,
  trust: Trust,
  funnel: Funnel,
  map: MapScene,
  collage: Collage,
};

/**
 * Modules that stage ArchivalBG. Two things follow from it and both used to be
 * listed separately, which is how `callout` ended up in one list and not the
 * other: these modules fill the frame themselves (so no page goes under them),
 * and they darken it (so the caption needs a paper card).
 */
export const ARCHIVAL = new Set(["doodle", "footage", "callout"]);
