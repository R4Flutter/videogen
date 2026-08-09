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
import { fit, fitBlock, measure, numberFormat, useLayout } from "./layout";
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
  isClip,
  Kicker,
  KineticText,
  Leader,
  LineIcon,
  Marker,
  Shape,
  useParallax,
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

/** Page margins as a fraction of the canvas, so 9:16 and 16:9 both breathe.
 *  Kept as the modules' handle on the canvas; the vertical grid now comes from
 *  `useLayout` in ./layout, which is the thing that stops two elements landing
 *  in the same band. */
export const useMargin = () => {
  const { width, height } = useVideoConfig();
  return { width, height, pad: width * 0.075, wide: width > height };
};

/**
 * How much narration a module wants printed over it.
 *
 * This table is the caption policy, and its absence was one of the loudest
 * defects in the ten-minute cut: a Stat printed `48`, and the caption track
 * printed "forty-eight, a supervisor appears" underneath it, and both were
 * saying the same thing at the same time. A module that already sets the
 * sentence in type does not want it a second time.
 *
 *   none      — the module prints the words itself
 *   subtitle  — a picture is carrying the beat; the words go in the caption band
 *
 * Two modes, not five, because two is what the defect needed. A `lower_third`
 * or an `emphasis` variant can join when a module actually asks for one.
 */
export const CAPTION: Record<string, "none" | "subtitle"> = {
  kinetic: "none", // the words already fill the frame
  chart: "none",
  compare: "none",
  stat: "none",
  timeline: "none",
  funnel: "none",
  trust: "none",
  trace: "none",
  icon: "none",
  quote: "none", // a pull-quote read aloud under itself is the same words twice
  collage: "subtitle",
  doodle: "subtitle",
  footage: "subtitle",
  callout: "subtitle",
  map: "subtitle",
};

const Stage: React.FC<{ children: React.ReactNode; align?: "center" | "flex-start" }> = ({
  children,
  align = "center",
}) => {
  const { pad, height, y } = useLayout();
  return (
    <AbsoluteFill
      style={{
        padding: pad,
        paddingTop: y.headline,
        // The caption band, reserved in every module so nothing has to know
        // whether this beat happens to be captioned. Height-relative: the old
        // `pad * 2.6` is 11% of a portrait frame and 35% of a landscape one,
        // which is why landscape beats staged into a squashed middle.
        paddingBottom: height - y.annotation,
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

/**
 * Kicker and headline, stacked, occupying exactly the two bands named after
 * them.
 *
 * Every module used to build this pair by hand, which is how the funnel ended
 * up positioning its kicker absolutely at the top of the page and its headline
 * in the normal flow — two elements, two coordinate systems, one collision. One
 * component owning both is the fix, and it fits the headline by measurement so
 * a long one steps down instead of running into the band below.
 */
export const PageHead: React.FC<{
  kicker: string;
  headline?: string;
  frame: number;
  /** Fraction of the safe width the headline may use. A module staging a plate
   *  in the right two thirds passes a smaller number. */
  span?: number;
  upper?: boolean;
}> = ({ kicker, headline, frame, span = 1, upper = false }) => {
  const { width, pad, safeW, y } = useLayout();
  const maxW = safeW * span;
  const size = headline
    ? fitBlock(upper ? headline.toUpperCase() : headline, maxW, y.primary - y.headline, width * 0.068, {
        weight: 800,
        family: vox.font,
        tracking: -width * 0.002,
      })
    : 0;

  return (
    <>
      <div style={{ position: "absolute", left: pad, top: y.kicker }}>
        <Kicker text={kicker} enter={frame - 4} />
      </div>
      {headline ? (
        <div
          style={{
            position: "absolute",
            left: pad,
            top: y.headline,
            width: maxW,
            fontFamily: vox.font,
            fontWeight: 800,
            fontSize: size,
            lineHeight: 1.05,
            letterSpacing: -size * 0.03,
            textTransform: upper ? "uppercase" : "none",
            color: vox.ink,
            opacity: ease(frame, 2, 16),
          }}
        >
          {headline}
        </div>
      ) : null}
    </>
  );
};

/** The hook and the payoff: the words fill the page and land as they're said. */
export const Kinetic: React.FC<VoxSceneProps> = ({ beat, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      <PageHead kicker={beat.name} frame={frame} />
      <Stage>
        <KineticText words={words} t={frame / fps} mode="hero" />
      </Stage>
    </>
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
  const { width, height, pad, wide, y: band } = useLayout();
  // Only a moving clip covers the page and forces white type. A still is a
  // plate pasted onto paper, so the headline stays ink and moves out of the
  // plate's way instead of being printed across the middle of it.
  const clip = isClip(beat.n);
  const plate = hasFootage(beat.n) && !clip;
  const headline = (beat.text || beat.name).toUpperCase();
  // Landscape puts the headline in the left third the prompt sheet keeps clear;
  // portrait puts it in the reserved top fifth, above the plate.
  const maxW = plate && wide ? width * 0.29 - pad * 0.4 : width - pad * 2;
  const spec = { weight: 800, family: vox.font, tracking: 0 } as const;
  // Measured, not counted. The old rule picked one of four sizes from a
  // character count and then estimated the block back at 0.55em/glyph — two
  // guesses whose errors compounded, which is how a hand-drawn circle ended up
  // half a word away from the words it was drawn around.
  const size = fitBlock(
    headline,
    maxW,
    plate && !wide ? height * 0.16 : height * 0.3,
    width * (plate ? (wide ? 0.062 : 0.088) : 0.11),
    spec,
  );
  const runW = measure(headline, { ...spec, size });
  const lines = Math.max(1, Math.ceil(runW / maxW));
  const blockW = Math.min(maxW, runW);
  const blockH = lines * size;
  const top = plate
    ? wide
      ? height * 0.44 - blockH / 2
      : height * 0.085
    : height * 0.46 - blockH / 2;
  const left = plate ? pad : (width - blockW) / 2;

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

  // The type *is* the subject plane, so it takes the camera exactly and nothing
  // more — which is what keeps it inside the grid. The photograph behind it is
  // at 0.6 and falls away under a push, so the headline reads as printed on
  // glass over the frame rather than baked into it. Separation without the type
  // ever leaving its margins.
  const ink = useParallax(beat.n, 1);

  return (
    <>
      <ArchivalBG beat={beat.n} progress={ease(frame, 0, dur)} />
      <AbsoluteFill style={ink.style}>
      <div style={{ position: "absolute", left: pad, top: band.kicker }}>
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
          // Ranged left against the plate, centred on a bare page. The mark is
          // drawn at `left`/`blockW`, so the two have to agree or a circle
          // lands next to the words it was meant to go round.
          textAlign: plate ? "left" : "center",
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
      </AbsoluteFill>
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
  // Every card carries the same size, set by the longest label, or a three-card
  // row reads as three different typographic weights.
  const labelSize = steps.reduce(
    (small, step) =>
      Math.min(
        small,
        fitBlock(step.label, (wide ? width / steps.length : width) * 0.7, width * 0.14,
          width * (wide ? 0.03 : 0.042), { weight: 700, family: vox.font }, 1.15),
      ),
    width * (wide ? 0.03 : 0.042),
  );

  return (
    <>
    <PageHead kicker={beat.name} frame={frame} />
    <Stage align="flex-start">
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
                  fontSize: labelSize,
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
    </>
  );
};

/** The number that carries the argument, drawn on the page. */
export const Chart: React.FC<VoxSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { width, pad, safeW, y, primaryH } = useLayout();
  const rows = beat.data && beat.data.length ? beat.data : [];
  if (!rows.length) return <Kinetic dur={dur} beat={beat} words={[]} />;
  // The axis labels and the pen readout hang below the plot, so the plot itself
  // only gets the part of the band that is left after them.
  const h = primaryH - width * 0.09;
  const progress = ease(frame, 12, dur - 10);
  // The headline already names the unit ("$10,000, SITTING STILL"), so the
  // readout reuses it rather than asking the script for it twice.
  const unit = /^[^\w\s]/.exec(beat.text ?? "")?.[0] ?? "";

  return (
    <>
      <PageHead kicker={beat.name} headline={beat.text} frame={frame} />
      <InkChart
        data={rows.map((r) => r.value)}
        labels={rows.map((r) => r.label)}
        unit={unit}
        x={pad}
        y={y.primary}
        w={safeW}
        h={h}
        progress={progress}
      />
    </>
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
  const { width, pad, safeW, y: band, primaryH } = useLayout();
  const rows = beat.data && beat.data.length ? beat.data : [];
  const barH = Math.min(width * 0.062, primaryH / Math.max(2, rows.length * 2.6));
  const step = barH * 2.4;
  const first = band.primary + barH;
  // Both bars have landed by here; the gap can only be drawn once they have.
  const settled = 48 + (rows.length - 1) * 14;
  if (!rows.length) return <Kinetic dur={dur} beat={beat} words={[]} />;

  const top = Math.max(...rows.map((r) => r.value), 1);
  const fmt = numberFormat(top);
  const spec = { weight: 800, family: vox.font } as const;
  // The longest bar stops short of the margin so its value always has somewhere
  // to sit — and how far short is measured off the widest number this beat will
  // actually print, not guessed at a flat 24%. A four-character value should not
  // cost the chart a quarter of its width, and a nine-character one used to
  // overrun the margin even though it had been "allowed for".
  const valueW = Math.max(
    ...rows.map((r) => {
      const { prefix, suffix } = affix(r.raw ?? "");
      return measure(fmt(r.value, prefix, suffix), { ...spec, size: barH * 0.72 });
    }),
  );
  const track = Math.max(safeW * 0.45, safeW - valueW - width * 0.03);
  const ends = rows.map((r) => (r.value / top) * track);
  const longest = ends.indexOf(Math.max(...ends));
  // Two bars the same length have no gap between them, and a zero-width box
  // with "The gap" centred in it is a two-line word stacked on the bar end.
  // The mark only exists when there is a distance to mark.
  const gap =
    rows.length === 2 && Math.abs(ends[0] - ends[1]) > width * 0.06
      ? {
          from: Math.min(ends[0], ends[1]),
          to: Math.max(ends[0], ends[1]),
          y: first + longest * step,
        }
      : null;

  return (
    <>
      <PageHead kicker={beat.name} headline={beat.text} frame={frame} />

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
                // Clear of the gap box, which reaches above the bar it marks —
                // and clear of the bar itself by the label's own line height,
                // which a short bar no longer guarantees on its own.
                top: y - Math.max(barH * 1.02, width * 0.032 * 1.35),
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
              {fmt(row.value * grow, prefix, suffix)}
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
  const { width, pad, safeW, y: band, primaryH } = useLayout();
  const row = beat.data && beat.data.length ? beat.data[0] : null;
  if (!row) return <Kinetic dur={dur} beat={beat} words={[]} />;

  const { prefix, suffix } = affix(row.raw ?? "");
  const roll = ease(frame, 10, dur * 0.5);
  // Representation first, size second. This module used to do neither: it
  // picked a font size from the character count and never checked the result,
  // which is how `25,557,729` and `9,171.4` ended up running off the right edge
  // of a finished video. `numberFormat` decides from the value the roll lands
  // on — so `30,000,000` is `30M` from the first frame, not on the frame it
  // crosses a threshold — and `fit` then measures what that actually costs.
  const fmt = numberFormat(row.value);
  const shown = fmt(row.value * roll, prefix, suffix);
  const spec = {
    weight: 800,
    family: vox.font,
    tracking: -width * 0.24 * 0.035,
  } as const;
  // Sized off the final string, not the rolling one, or the number grows a size
  // step every time the counter gains a digit.
  const size = Math.min(
    primaryH * 0.6,
    fit(fmt(row.value, prefix, suffix), safeW, width * 0.24, spec),
  );
  const runW = Math.min(safeW, measure(shown, { ...spec, size }));
  const top = band.primary + (primaryH - size * 1.9) / 2;

  return (
    <>
      <PageHead kicker={beat.name} frame={frame} />
      <div
        style={{
          position: "absolute",
          left: pad,
          top,
          width: safeW,
          textAlign: "center",
          fontFamily: vox.font,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: -size * 0.035,
          color: vox.accent,
          // Tabular figures, or every rolling digit shifts the whole number.
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {shown}
      </div>
      <div
        style={{
          position: "absolute",
          left: pad,
          top: top + size * 1.35,
          width: safeW,
          textAlign: "center",
          fontFamily: vox.font,
          fontWeight: 700,
          fontSize: fit(row.label, safeW, width * 0.044, {
            weight: 700,
            family: vox.font,
            tracking: width * 0.0012,
            upper: true,
          }),
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
        x={(width - runW) / 2}
        y={top}
        w={runW}
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
  const { width, height, pad, wide, y: band } = useLayout();
  // Only a moving clip darkens the frame enough to need the paper card behind
  // the label. Over a still on paper, that card is a white box on white paper.
  const clip = isClip(beat.n);
  const label = (beat.text || beat.name).toUpperCase();

  // The ring lands on the plate, so it follows where EditorialStill puts it:
  // right-of-centre in landscape, the middle band in portrait.
  const cx = width * (wide ? 0.655 : 0.5);
  const cy = height * (wide ? 0.44 : 0.42);
  const rx = width * (wide ? 0.17 : 0.25);
  const ry = rx * 0.74;

  const labelW = width * (wide ? 0.3 : 0.46);
  const labelX = pad;
  // Above the annotation band, not floating at an arbitrary 58%: a label at
  // 62% of a landscape frame with a leader line running down from it is a label
  // that meets the caption card.
  const labelY = band.annotation - height * (wide ? 0.16 : 0.2);
  const size = fitBlock(label, labelW, height * 0.14, width * (wide ? 0.032 : 0.058), {
    weight: 800,
    family: vox.font,
  });

  return (
    <>
      <ArchivalBG beat={beat.n} progress={ease(frame, 0, dur)} />
      <div style={{ position: "absolute", left: pad, top: band.kicker }}>
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
  const { width, pad, y: band, primaryH, wide } = useLayout();
  const rows = beat.data && beat.data.length ? beat.data : [];
  if (rows.length < 2) return <Kinetic dur={dur} beat={beat} words={[]} />;

  const lo = Math.min(...rows.map((r) => r.value));
  const hi = Math.max(...rows.map((r) => r.value));
  // All-equal values would divide by zero; fall back to even spacing.
  const at = (v: number) => (hi === lo ? 0.5 : (v - lo) / (hi - lo));
  const fmt = numberFormat(hi);

  const run = ease(frame, 10, Math.max(28, dur * 0.45));
  const axis = width * 0.006;
  const dot = width * 0.022;

  const x0 = wide ? pad * 1.6 : pad + width * 0.09;
  // Landscape hangs the labels above the axis, so the axis sits low in its own
  // band rather than in the middle of the page; portrait runs down the band.
  const y0 = wide ? band.primary + primaryH * 0.6 : band.primary;
  const len = wide ? width - pad * 3.2 : primaryH * 0.94;

  return (
    <>
      <PageHead kicker={beat.name} headline={beat.text} frame={frame} />

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
                top: wide ? y0 - primaryH * 0.42 : y0 + pos - width * 0.026,
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
                {fmt(row.value, prefix, suffix)}
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
    <>
      <PageHead kicker={beat.name} frame={frame} />
      <Stage align="flex-start">
        <Clipping
          quote={quote}
          source={beat.source}
          seed={beat.n * 5}
          progress={ease(frame, 6, 24)}
        />
      </Stage>
    </>
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
