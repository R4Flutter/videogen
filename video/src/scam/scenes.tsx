// The scam modules. Five of them, each already proven in the vox kit — the
// work here is the two mockup modules (chat, transfer) that stage the PNGs
// chat-mockup.py and transfer-mockup.py draw, and the doodle resolution that
// aims a hand-drawn mark at the right part of that image.
//
// The director (script.json) picks the module: the first present row of
// chat > chart_data > transfer > icon > doodle > image_prompt, else kinetic.
import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";
import {
  AlertKicker,
  ArchivalBG,
  DrawIn,
  fitMockup,
  hasFootage,
  hasFootage2,
  InkChart,
  Kicker,
  KineticText,
  LineIcon,
  mapBox,
  MoneyAmount,
  Shape,
  useUnit,
  Word,
} from "./elements";

const scam = theme.scam;

export type ScamBeat = {
  n: number;
  name: string;
  start: number;
  end: number;
  module: string;
  vo: string;
  text?: string;
  kinetic_size?: string;
  chat?: string;
  transfer?: string;
  data?: { label: string; value: number; raw: string }[];
  icons?: { icon: string; label: string }[];
  doodle?: { shape: string; target?: string; from?: string; to?: string };
  alert?: boolean;
  footage?: string;
  source?: string;
  chat_boxes?: ChatBoxes;
  transfer_boxes?: TransferBoxes;
};

export type Box = { x: number; y: number; w: number; h: number };
export type ChatBoxes = {
  name: Box;
  nameText: string;
  bubbles: (Box & { speaker: string; mine: boolean })[];
  last: Box | null;
};
export type TransferBoxes = { from: Box; to: Box; amount: Box; status: Box };

export type ScamSceneProps = { dur: number; beat: ScamBeat; words: Word[] };

/**
 * A wide frame is two columns: type on the left, the artifact (chat, bank
 * screen, chart) on the right. COLUMN is where the type column ends — it has to
 * agree with the caption gutter in ScamShort, or the narration runs under the
 * artifact. A vertical frame stacks the same content instead and ignores this.
 */
export const COLUMN = 0.48;

const ease = (frame: number, a: number, b: number, out: readonly [number, number] = [0, 1]) =>
  interpolate(frame, [a, b], out, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1, 0.36, 1),
  });

const useMargin = () => {
  const { width, height } = useVideoConfig();
  // `unit` is the short-edge measure every type size is calibrated against —
  // see useUnit. Margins stay on `width` (they really are horizontal); type and
  // vertical offsets take `unit`, or a wide cut runs its headline off the page.
  return { width, height, unit: useUnit(), pad: width * 0.075, wide: width > height };
};

const Stage: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pad, height } = useMargin();
  return (
    <AbsoluteFill
      style={{
        padding: pad,
        // The caption band, reserved off the frame's own height. Measured off
        // width it took a third of a 16:9 page and squeezed the hero into a
        // strip too short to hold it.
        paddingBottom: height * 0.19,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: pad * 0.7,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the marks
/** A beat's doodle as a drawn mark. `box` is the target in canvas units. */
const Mark: React.FC<{
  beat: ScamBeat;
  box: Box | null;
  progress: number;
  color?: string;
}> = ({ beat, box, progress, color }) => {
  const shape = (beat.doodle?.shape ?? "underline") as Shape;
  if (!box) return null;
  // A ring drawn tight to a text box cuts its own corners through the glyphs it
  // is supposed to be pointing at. Enclosing marks get room to breathe; an
  // underline or a strike is meant to touch, so it gets none.
  const enclosing = shape === "circle" || shape === "box";
  const mx = enclosing ? box.w * 0.05 : 0;
  const my = enclosing ? box.h * 0.24 : 0;
  return (
    <DrawIn
      shape={shape}
      x={box.x - mx}
      y={box.y - my}
      w={box.w + mx * 2}
      h={box.h + my * 2}
      seed={beat.n * 13}
      color={color ?? (beat.alert ? scam.alert : scam.accent)}
      progress={progress}
    />
  );
};

/** The words the `text` row named, timed evenly across the beat — for a hook
 *  that must hit on the number itself, not on whatever the read says first.
 *  `secs` is seconds, not frames: KineticText clocks its words against t. */
const textWords = (text: string, secs: number) => {
  const list = text.split(/\s+/).filter(Boolean);
  const step = list.length ? secs / list.length : secs;
  return list.map((w, i) => ({ w, start: i * step, end: (i + 1) * step }));
};

/** Resolve a doodle target inside a mockup's boxes (mockup pixel units). */
const resolveChatBox = (beat: ScamBeat, boxes?: ChatBoxes): Box | null => {
  const d = beat.doodle;
  if (!d) return null;
  if (d.target === "bubble") return boxes?.last ?? null;
  if (d.target === "name") return boxes?.name ?? null;
  if (!boxes) return null;
  if (boxes.nameText && d.target === boxes.nameText.toLowerCase()) return boxes.name;
  const hit = boxes.bubbles.find((b) => b.speaker.toLowerCase() === d.target);
  return hit ?? null;
};

const resolveTransferBox = (beat: ScamBeat, boxes?: TransferBoxes): Box | null => {
  const d = beat.doodle;
  if (!d || !boxes) return null;
  if (d.from === "from") return boxes.from;
  if (d.from === "to") return boxes.to;
  if (d.target === "amount" || d.target === "bubble") return boxes.amount;
  if (d.target === "status") return boxes.status;
  if (d.target === "to") return boxes.to;
  return boxes.amount;
};

/**
 * The span an arrow should cover between two fields. Bank rows stack
 * vertically, so the common case is a drop from the bottom of one card to the
 * top of the next — measuring the horizontal gap there yields a negative width
 * and the arrow collapses. Route down the shared centre when the boxes overlap
 * horizontally, and across when they genuinely sit side by side.
 */
const arrowBox = (from: Box, to: Box): Box => {
  const gap = to.x - (from.x + from.w);
  if (gap > 8) {
    return {
      x: from.x + from.w,
      y: from.y + from.h * 0.5,
      w: gap,
      h: to.y + to.h * 0.5 - (from.y + from.h * 0.5),
    };
  }
  const cx = (from.x + from.w * 0.5 + (to.x + to.w * 0.5)) * 0.5;
  return {
    x: cx,
    y: from.y + from.h,
    w: 1,
    h: Math.max(10, to.y - (from.y + from.h)),
  };
};

// ------------------------------------------------------------------ kinetic
/** The hook, the reveal, the payoff. Words slam in as they're said — except on
 *  the huge beats, where the `text` row IS the frame and lands on its own
 *  clock ("four hundred thousand dollars" on the number, not on the sentence).
 */
export const Kinetic: React.FC<ScamSceneProps> = ({ dur, beat, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const huge = beat.kinetic_size === "huge";
  const text = beat.text ?? "";
  // On black, a pure amount is money green and everything else is white —
  // the colour grammar of the whole niche in one frame.
  const money = huge ? /^\$([\d,]+)$/.exec(text) : null;
  const ink = money ? scam.moneyLift : "#FFFFFF";
  // A number that is merely stated is a still frame for the length of the read,
  // and a still frame in the first six seconds is where a short loses the
  // thumb. It counts up instead, landing before the line finishes so the amount
  // is on screen and settled while the sentence lands around it.
  // Not from zero: frame 0 is the feed preview, and "$0" is the one number that
  // stops nobody. It opens already large and climbs from there.
  const run = ease(frame, 0, Math.max(20, dur * 0.45), [0.16, 1]);
  const show = money
    ? [
        {
          w: `$${Math.round(Number(money[1].replace(/,/g, "")) * run).toLocaleString("en-US")}`,
          // Six frames of head start: the spring is most of the way up by
          // frame 0, so the amount settles on screen instead of arriving to an
          // audience that has already seen a black frame.
          start: -6 / fps,
          end: dur / fps,
        },
      ]
    : huge
      ? // Half the beat, not all of it. Spread over the whole thing, a sentence
        // hero lands its last word while the read is already two sentences past
        // it — and on the silent payoff, "GONE" arrived with a second left on
        // the clock. It completes early and holds, which is what a closing
        // frame is for.
        textWords(text, (words.length ? words[words.length - 1].end : dur / fps) * 0.5)
      : words;
  return (
    <>
      {huge ? <AbsoluteFill style={{ backgroundColor: "#050505" }} /> : null}
      <Stage>
        {/* A huge beat is the frame the whole video was built for. A production
            label over it ("THE HOOK") tells the viewer they are being sold. */}
        {huge ? null : <Kicker text={beat.name} enter={frame - 4} />}
        <KineticText
          words={show}
          t={frame / fps}
          mode="hero"
          palette={huge ? { ink, accent: ink, font: scam.font } : undefined}
        />
        {/* Sound-off is the default way this gets watched. Without the line
            under it the hook is a number with no sentence behind it. Captions
            skips the kinetic beats, so the beat carries its own. */}
        {huge && words.length ? (
          <KineticText
            words={words}
            t={frame / fps}
            mode="caption"
            palette={{ ink: "#EDE9E0", accent: ink, font: scam.font }}
          />
        ) : null}
      </Stage>
    </>
  );
};

// ------------------------------------------------------------------- mockups
/** The band under a mockup where the icon chips land. `full` centres the chips
 *  across the whole frame — used by the footage scene, where there is no
 *  artifact column to nestle under. */
const IconBand: React.FC<{
  icons: { icon: string; label: string }[];
  full?: boolean;
}> = ({ icons, full = false }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const wide = width > height;
  // Chips scale to the column they sit in, not to the frame. Measured against a
  // 1920-wide canvas they swell to nearly twice their vertical-cut size, and a
  // third chip wraps off the bottom of the band.
  const unit = wide ? width * (1 - COLUMN) : width;
  const pad = unit * 0.075;
  const glyph = unit * 0.05;
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "nowrap",
        justifyContent: "center",
        alignItems: "center",
        gap: pad * 0.4,
        // AbsoluteFill pins all four edges, and CSS resolves top+height before
        // bottom (and left+width before right) — so without releasing the
        // opposite edge the band pins to the top of the frame and collides with
        // the kicker and headline instead of sitting in its own band.
        top: "auto",
        bottom: height * 0.05,
        height: height * 0.1,
        // Wide frames run two columns: type on the left, the artifact (mockup or
        // chart) on the right. The chips take the empty strip under the
        // artifact — the left column already carries the headline and the
        // narration, and the chips landed on both of them there. Full-frame
        // beats centre the chips edge to edge instead.
        ...(wide && !full ? { left: width * COLUMN, right: "auto", width: unit } : {}),
      }}
    >
      {icons.map((step, i) => {
        const s = spring({
          frame: frame - 8 - i * 6,
          fps,
          config: { damping: 200, mass: 0.6, stiffness: 190 },
          durationInFrames: 14,
        });
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: pad * 0.35,
              padding: `${pad * 0.28}px ${pad * 0.5}px`,
              background: scam.paper,
              border: `${unit * 0.0035}px solid ${scam.rule}`,
              borderRadius: unit * 0.03,
              boxShadow: `0 ${unit * 0.012}px ${unit * 0.03}px rgba(26,26,26,.12)`,
              opacity: s,
              whiteSpace: "nowrap",
              transform: `translateY(${interpolate(s, [0, 1], [unit * 0.02, 0])}px)`,
            }}
          >
            <LineIcon name={step.icon} size={glyph} color={scam.accent} />
            <span
              style={{
                fontFamily: scam.font,
                fontWeight: 700,
                fontSize: unit * 0.03,
                letterSpacing: -unit * 0.0004,
                color: scam.ink,
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * A phone screen laid on the page. The PNG is the artifact — the message, the
 * bubble, the profile silhouette — and the doodle circles the exact bubble the
 * script named. On the alert beat the frame tints red and the RED FLAG lands.
 */
export const Chat: React.FC<ScamSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const pad = width * 0.075;
  const wide = width > height;
  const icons = beat.icons ?? [];
  const hasIcons = icons.length > 0;
  const clip = hasFootage(beat.n);

  const mockH = hasIcons ? 0.58 : 0.68;
  const fit = fitMockup(width, height, 1080, 1920, wide ? 0.4 : 0.72, mockH);
  const headline = beat.text;
  const headH = headline
    ? width * (wide ? 0.05 : 0.062) * (headline.length > 26 ? 1.9 : 1.1)
    : 0;
  const rect = {
    // Wide: the artifact owns the right column. Centred (as it was) it sits on
    // top of the headline, which is what cut "HONG KONG" in half.
    x: wide ? width * COLUMN + (width * (1 - COLUMN) - fit.w) / 2 : fit.x,
    y: wide ? (height - fit.h) / 2 : pad * 1.3 + (headline ? width * 0.13 + headH : width * 0.05),
    w: fit.w,
    h: fit.h,
  };
  const target = resolveChatBox(beat, beat.chat_boxes);
  const box = target && rect ? mapBox(target, rect, 1080, 1920) : null;

  return (
    <>
      {hasFootage(beat.n) ? (
        <ArchivalBG beat={beat.n} progress={ease(frame, 0, dur)} />
      ) : null}
      <div style={{ position: "absolute", left: pad, top: pad * 1.2 }}>
        <Kicker text={beat.name} enter={frame - 4} />
        {headline ? (
          <div
            style={{
              marginTop: pad * 0.3,
              maxWidth: (wide ? width * COLUMN : width) - pad * 2,
              fontFamily: scam.font,
              fontWeight: 800,
              fontSize: width * (wide ? 0.05 : 0.062),
              lineHeight: 1.05,
              letterSpacing: -width * 0.002,
              color: clip ? scam.paper : scam.ink,
              textShadow: clip
                ? `0 ${width * 0.006}px ${width * 0.03}px rgba(0,0,0,.55)`
                : "none",
              opacity: ease(frame, 2, 16),
            }}
          >
            {headline}
          </div>
        ) : null}
      </div>

      {beat.alert ? <AlertKicker enter={Math.round(dur * 0.18)} /> : null}

      {beat.chat_boxes ? (
        <Img
          src={staticFile(`footage/chat-${beat.n}.png`)}
          style={{
            position: "absolute",
            left: rect.x,
            top: rect.y,
            width: rect.w,
            height: rect.h,
            boxShadow: `0 ${width * 0.018}px ${width * 0.05}px rgba(26,26,26,.22)`,
          }}
        />
      ) : null}

      {/* the alert tint: the page leans red for exactly this beat */}
      {beat.alert && beat.chat_boxes ? (
        <AbsoluteFill
          style={{
            // A vignette that leans red, not a red frame. At full strength the
            // wash flattens the paper and drags the phone's contrast down with
            // it — the beat should feel like the room cooling, and the RED FLAG
            // kicker is what actually says "here".
            background: `radial-gradient(ellipse 78% 62% at 50% 45%, transparent 46%, ${scam.alert} 128%)`,
            opacity: ease(frame, 2, dur * 0.3, [0, 0.34]),
            mixBlendMode: "multiply",
          }}
        />
      ) : null}

      {box ? (
        <Mark beat={beat} box={box} progress={ease(frame, dur * 0.3, dur * 0.62)} />
      ) : headline && beat.doodle ? (
        // Nothing in the mockup to point at, so the mark goes on the headline.
        // It has to be measured off the same numbers the headline is set with:
        // the block is left-aligned at `pad`, and a centred guess drew the
        // underline across the middle of the glyphs as a strike-through.
        <Mark
          beat={beat}
          box={(() => {
            const fz = width * (wide ? 0.05 : 0.062);
            return {
              x: pad,
              // Under the kicker, then the headline's own top margin. An
              // underline that forgets the kicker lands mid-glyph and reads as
              // a strike — the opposite of what the script asked for.
              y: pad * 1.2 + width * 0.026 * 1.25 + pad * 0.3,
              w: Math.min(
                (wide ? width * COLUMN : width) - pad * 2,
                headline.length * fz * 0.55,
              ),
              h: fz * (1.05 * (headline.length > 26 ? 2 : 1) + 0.12),
            };
          })()}
          progress={ease(frame, dur * 0.3, dur * 0.62)}
        />
      ) : null}

      {hasIcons ? <IconBand icons={icons} /> : null}
    </>
  );
};

/** The bank screen. The amount is the point, so the doodle goes to the money. */
export const Transfer: React.FC<ScamSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const pad = width * 0.075;
  const wide = width > height;
  const icons = beat.icons ?? [];
  const hasIcons = icons.length > 0;
  const clip = hasFootage(beat.n);

  const fit = fitMockup(width, height, 1080, 1920, wide ? 0.4 : 0.72, hasIcons ? 0.58 : 0.68);
  const headline = beat.text;
  const headH = headline
    ? width * (wide ? 0.05 : 0.062) * (headline.length > 26 ? 1.9 : 1.1)
    : 0;
  const rect = {
    // Wide: the artifact owns the right column. Centred (as it was) it sits on
    // top of the headline, which is what cut "HONG KONG" in half.
    x: wide ? width * COLUMN + (width * (1 - COLUMN) - fit.w) / 2 : fit.x,
    y: wide ? (height - fit.h) / 2 : pad * 1.3 + (headline ? width * 0.13 + headH : width * 0.05),
    w: fit.w,
    h: fit.h,
  };

  const d = beat.doodle;
  // "arrow from X to Y" names two fields of the bank screen. Both ends have to
  // read their own side of the doodle — testing `d.from` for the destination
  // too (as this once did) leaves the tail null, so the arrow never resolves
  // and the mark silently falls back to circling the source field instead.
  const side = (key?: string) =>
    key && beat.transfer_boxes && key in beat.transfer_boxes
      ? mapBox(beat.transfer_boxes[key as keyof TransferBoxes] as Box, rect, 1080, 1920)
      : null;
  const fromBox = side(d?.from);
  const toBox = side(d?.to);
  const arrow = fromBox && toBox ? arrowBox(fromBox, toBox) : null;
  const resolved = beat.transfer_boxes ? resolveTransferBox(beat, beat.transfer_boxes) : null;
  const box = arrow ?? (resolved ? mapBox(resolved, rect, 1080, 1920) : null);

  return (
    <>
      {clip ? <ArchivalBG beat={beat.n} progress={ease(frame, 0, dur)} /> : null}
      <div style={{ position: "absolute", left: pad, top: pad * 1.2 }}>
        <Kicker text={beat.name} enter={frame - 4} />
        {headline ? (
          <div
            style={{
              marginTop: pad * 0.3,
              maxWidth: (wide ? width * COLUMN : width) - pad * 2,
              fontFamily: scam.font,
              fontWeight: 800,
              fontSize: width * (wide ? 0.05 : 0.062),
              lineHeight: 1.05,
              letterSpacing: -width * 0.002,
              color: clip ? scam.paper : scam.ink,
              textShadow: clip
                ? `0 ${width * 0.006}px ${width * 0.03}px rgba(0,0,0,.55)`
                : "none",
              opacity: ease(frame, 2, 16),
            }}
          >
            {headline}
          </div>
        ) : null}
      </div>

      {beat.transfer_boxes ? (
        <Img
          src={staticFile(`footage/transfer-${beat.n}.png`)}
          style={{
            position: "absolute",
            left: rect.x,
            top: rect.y,
            width: rect.w,
            height: rect.h,
            boxShadow: `0 ${width * 0.018}px ${width * 0.05}px rgba(26,26,26,.22)`,
          }}
        />
      ) : null}

      {box ? (
        <Mark beat={beat} box={box} progress={ease(frame, dur * 0.3, dur * 0.62)} />
      ) : null}

      {hasIcons ? <IconBand icons={icons} /> : null}
    </>
  );
};

// ------------------------------------------------------------------- charts
/** The scale beat: the money leaving, drawn as one climbing ink line. */
export const Chart: React.FC<ScamSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { width, height, unit, pad } = useMargin();
  const rows = beat.data && beat.data.length ? beat.data : [];
  const icons = beat.icons ?? [];
  const wide = width > height;
  // The chart is this frame's artifact, so on a wide cut it lives in the right
  // column beside the type, not across the whole page underneath it.
  const w = wide ? width * (1 - COLUMN) - pad * 2 : width - pad * 2;
  const left = wide ? width * COLUMN + pad : pad;
  const h = height * (wide ? 0.34 : 0.27);
  const progress = ease(frame, 12, dur - 10);
  const currency = /^[^\w\s]/.exec(beat.text ?? "")?.[0] ?? "";

  // The peak underline marks the last point — the one that beats you. Mark
  // draws in canvas space, so this has to be offset by the chart's own origin;
  // in chart-local units it lands somewhere up and to the left of the line.
  const chartTop = wide ? (height - h) / 2 : height * 0.42;
  const peak = {
    x: left + w - w * 0.11,
    y: chartTop + h + unit * 0.05,
    w: w * 0.11,
    h: unit * 0.02,
  };
  const isPeak = beat.doodle?.target === "peak";
  const clip = hasFootage(beat.n);

  return (
    <>
      {clip ? <ArchivalBG beat={beat.n} progress={ease(frame, 0, dur)} /> : null}
      <div
        style={{
          position: "absolute",
          left: pad,
          top: pad * 1.2,
          width: (wide ? width * COLUMN : width) - pad * 2,
        }}
      >
        <Kicker text={beat.name} enter={frame - 4} />
        {beat.text ? (
          <div
            style={{
              marginTop: pad * 0.3,
              fontFamily: scam.font,
              fontWeight: 800,
              fontSize: unit * (beat.text.length > 24 ? 0.05 : 0.062),
              lineHeight: 1.05,
              letterSpacing: -width * 0.002,
              color: clip ? scam.paper : scam.ink,
              textShadow: clip
                ? `0 ${width * 0.006}px ${width * 0.03}px rgba(0,0,0,.55)`
                : "none",
              opacity: ease(frame, 2, 16),
            }}
          >
            <MoneyAmount
              text={beat.text}
              size={unit * (beat.text.length > 24 ? 0.05 : 0.062)}
            />
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: "absolute",
          left,
          top: chartTop,
          width: w,
          height: h + unit * 0.08,
        }}
      >
        <InkChart
          data={rows.map((r) => r.value)}
          labels={rows.map((r) => r.label)}
          unit={currency}
          x={0}
          y={0}
          w={w}
          h={h}
          progress={progress}
          colors={scam}
        />
      </div>
      {isPeak ? (
        <Mark
          beat={beat}
          box={peak}
          progress={ease(frame, dur * 0.72, dur * 0.92)}
          color={scam.money}
        />
      ) : null}
      {icons.length ? <IconBand icons={icons} /> : null}
    </>
  );
};

// ---------------------------------------------------------------- annotation
/** Only a doodle and the line it marks: the hand of the author, nothing else. */
export const Annotation: React.FC<ScamSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { width, height, unit, pad } = useMargin();
  const headline = (beat.text ?? beat.name).toUpperCase();
  const size = unit * (headline.length > 24 ? 0.09 : 0.12);
  const runW = headline.length * size * 0.55;
  const blockW = Math.min(width - pad * 2, runW);
  const blockH = Math.ceil(runW / (width - pad * 2)) * size * 1.05;
  // Centred on the page rather than parked at a fixed depth. 0.42 of the width
  // put the headline 800px down a 1080-tall frame, which is off the bottom.
  const top = (height - blockH) / 2;
  const left = (width - blockW) / 2;
  const box =
    beat.doodle?.shape === "underline"
      ? { x: left, y: top + blockH + size * 0.1, w: blockW, h: size * 0.1 }
      : { x: left - pad * 0.35, y: top - size * 0.2, w: blockW + pad * 0.7, h: blockH + size * 0.4 };

  return (
    <Stage>
      <Kicker text={beat.name} enter={frame - 4} />
      <div
        style={{
          position: "absolute",
          left,
          top,
          width: blockW,
          fontFamily: scam.font,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.05,
          letterSpacing: -size * 0.03,
          textAlign: "center",
          color: scam.ink,
          opacity: ease(frame, 2, 16),
        }}
      >
        {headline}
      </div>
      <Mark beat={beat} box={box} progress={ease(frame, dur * 0.28, dur * 0.62)} />
    </Stage>
  );
};

// ---------------------------------------------------------------------- icon
/** Icon cards. With a line to land (beat.text + doodle) it becomes the lesson:
 *  one glyph, the words, a hand-drawn circle around them. */
export const IconSteps: React.FC<ScamSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height, unit, pad } = useMargin();
  const steps = beat.icons ?? [];
  if (!steps.length) return <Kinetic dur={dur} beat={beat} words={[]} />;
  const lesson = Boolean(beat.text && beat.doodle);

  if (lesson) {
    const text = (beat.text ?? "").toUpperCase();
    // Uppercase Archivo ExtraBold runs closer to 0.62em a glyph than the 0.55
    // this was sized with. Under-measuring wrapped "HANG UP." onto two lines
    // while the circle below was still drawn for one, so the mark cut the
    // second line in half. Shrink to fit and never wrap: one line is the shape
    // the circle is drawn around.
    const runEm = 0.62;
    const size = Math.min(
      unit * (text.length > 10 ? 0.11 : 0.14),
      (width - pad * 2) / Math.max(1, text.length * runEm),
    );
    const runW = text.length * size * runEm;
    const blockW = Math.min(width - pad * 2, runW);
    const top = height * 0.52;
    const left = (width - blockW) / 2;
    const circle = { x: left - pad * 0.35, y: top - size * 0.25, w: blockW + pad * 0.7, h: size * 1.5 };
    return (
      <>
        <div style={{ position: "absolute", left: pad, top: pad * 1.2 }}>
          <Kicker text={beat.name} enter={frame - 4} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: height * 0.3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: pad * 0.4,
          }}
        >
          <LineIcon name={steps[0].icon} size={unit * 0.17} color={scam.accent} stroke={1.6} />
          <span
            style={{
              fontFamily: scam.font,
              fontWeight: 700,
              fontSize: unit * 0.042,
              letterSpacing: unit * 0.004,
              textTransform: "uppercase",
              color: scam.muted,
            }}
          >
            {steps[0].label}
          </span>
        </div>
        <div
          style={{
            position: "absolute",
            left,
            top,
            width: blockW,
            textAlign: "center",
            whiteSpace: "nowrap",
            fontFamily: scam.font,
            fontWeight: 800,
            fontSize: size,
            lineHeight: 1,
            letterSpacing: -size * 0.03,
            color: scam.ink,
            opacity: ease(frame, 8, 22),
          }}
        >
          {text}
        </div>
        <Mark beat={beat} box={circle} progress={ease(frame, dur * 0.34, dur * 0.68)} />
      </>
    );
  }

  const glyph = unit * 0.09;
  return (
    <Stage>
      <Kicker text={beat.name} enter={frame - 4} />
      <div
        style={{
          display: "flex",
          flexDirection: width > height ? "row" : "column",
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
                flexDirection: width > height ? "column" : "row",
                alignItems: "center",
                gap: pad * 0.45,
                padding: pad * 0.45,
                background: scam.paper,
                border: `${width * 0.0035}px solid ${scam.rule}`,
                boxShadow: `0 ${width * 0.012}px ${width * 0.03}px rgba(26,26,26,.10)`,
                clipPath: `inset(0 ${Math.max(0, (1 - s) * 100)}% 0 0)`,
                transform: `translateY(${interpolate(s, [0, 1], [width * 0.012, 0])}px)`,
              }}
            >
              <LineIcon name={step.icon} size={glyph} color={scam.accent} />
              <span
                style={{
                  fontFamily: scam.font,
                  fontWeight: 700,
                  fontSize: unit * 0.04,
                  lineHeight: 1.15,
                  color: scam.ink,
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

// ------------------------------------------------------------------ footage
/** A generated collage under the line — the editorial-image beats. Two frames
 *  per beat are fetched, and this scene crossfades between them mid-beat so the
 *  picture changes on the same rhythm a professional explainer holds. */
export const Footage: React.FC<ScamSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { width, height, unit, pad } = useMargin();
  const clip = hasFootage(beat.n);
  const clip2 = hasFootage2(beat.n);
  // The second frame takes over just past halfway and settles in before the
  // beat ends; the crossfade itself is fast enough to read as a cut.
  const cut = dur * 0.55;
  const blend = clip2 ? ease(frame, cut, cut + Math.min(12, dur * 0.12)) : 0;
  const headline = (beat.text || beat.name).toUpperCase();
  const size = unit * (headline.length > 30 ? 0.086 : 0.11);
  const maxW = width - pad * 2;
  const runW = headline.length * size * 0.55;
  const lines = Math.max(1, Math.ceil(runW / maxW));
  const blockH = lines * size;
  const top = height * 0.46 - blockH / 2;
  const box: Box = {
    x: pad,
    y: top - size * 0.18,
    w: maxW,
    h: blockH + size * 0.36,
  };
  const icons = (beat.icons ?? []).filter((s) => s.icon && s.label);

  return (
    <>
      <ArchivalBG beat={beat.n} progress={ease(frame, 0, cut)} />
      {clip2 ? (
        <div style={{ opacity: blend, width: "100%", height: "100%" }}>
          <ArchivalBG beat={beat.n} variant={1} progress={ease(frame, cut, dur)} />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: pad, top: pad * 1.6 }}>
        <Kicker text={beat.name} enter={frame - 4} />
      </div>
      <Mark beat={beat} box={box} progress={ease(frame, dur * 0.34, dur * 0.66)} />
      <div
        style={{
          position: "absolute",
          left: pad,
          top,
          width: maxW,
          textAlign: "center",
          fontFamily: scam.font,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: -size * 0.03,
          color: clip ? scam.paper : scam.ink,
          textShadow: clip ? `0 ${size * 0.06}px ${size * 0.3}px rgba(0,0,0,.55)` : "none",
          opacity: ease(frame, 2, 16),
        }}
      >
        {headline}
      </div>
      {icons.length ? (
        <div style={{ opacity: clip2 ? Math.min(1, blend + 0.4) : 1 }}>
          <IconBand icons={icons} full />
        </div>
      ) : null}
    </>
  );
};

export const SCAM_MODULES: Record<string, React.FC<ScamSceneProps>> = {
  kinetic: Kinetic,
  chat: Chat,
  transfer: Transfer,
  chart: Chart,
  annotation: Annotation,
  icon: IconSteps,
  footage: Footage,
};

/** Modules that fill the frame themselves — nothing of the page behind shows. */
export const SCAM_ARCHIVAL = new Set(["footage"]);
