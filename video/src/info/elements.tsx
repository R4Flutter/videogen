// The Info Kit: the flat 2D vocabulary an infographic explainer is built from.
//
// Nothing here knows about an episode. Modules in ./scenes.tsx compose these
// into beats, and the episode JSON only names a module — so a second explainer
// is a second info.txt, never a second component.
//
// The look is flat on purpose: deep navy board, one electric accent, figures
// as circles and capsules. No gradient pretending to be light — every chart
// card that goes viral is flat, and the flatness is the brand.
import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Archivo";
import { theme } from "../theme";

// Injects the @font-face rules; falls back to a stack if the font server is
// unreachable, and the render still runs.
loadFont("normal", { weights: ["400", "700", "800"], subsets: ["latin"] });

const c = theme.info;

/** Canvas-derived layout. `u` is one thousandth of the mean edge, so a figure
 *  is the same physical size in 16:9 and 9:16. */
export const useStage = () => {
  const { width, height } = useVideoConfig();
  return {
    width,
    height,
    wide: width > height,
    pad: width * 0.07,
    u: (width + height) / 2000,
  };
};

/** A clamped interpolate — the engine's single easing helper. */
export const ease = (
  frame: number,
  a: number,
  b: number,
  out: readonly [number, number] = [0, 1],
) =>
  interpolate(frame, [a, b], out, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** The room: navy board, a dotted field, a pool of panel light. Dots drift so
 *  no frame is ever mathematically still. */
const DOTS = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52"><circle cx="3" cy="3" r="1.6" fill="#20304F"/></svg>`,
)}")`;

export const InfoBG: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 210) * 14;
  return (
    <AbsoluteFill style={{ backgroundColor: c.board }}>
      <AbsoluteFill
        style={{
          backgroundImage: DOTS,
          backgroundSize: "52px 52px",
          opacity: 0.55,
          transform: `translate(${drift * 0.4}px, ${drift * -0.3}px)`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 62% 52% at 50% 46%, #162540 0%, transparent 72%)",
        }}
      />
    </AbsoluteFill>
  );
};

/** Small mono kicker with a rule — the thing that makes a frame read as a
 *  chart card rather than a document. */
export const Kicker: React.FC<{ text: string; enter?: number; color?: string }> = ({
  text,
  enter = 0,
  color = c.accent,
}) => {
  const { u } = useStage();
  const t = ease(enter, 0, 10);
  if (!text) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: u * 14,
        fontFamily: c.mono,
        fontSize: u * 16,
        fontWeight: 700,
        letterSpacing: u * 4,
        textTransform: "uppercase",
        color,
        opacity: t,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: u * 36 * t, height: u * 2.5, background: color }} />
      {text}
    </div>
  );
};

/** The flat figure: circle head, capsule body. The human cast of an
 *  infographic — never a face, always distinguishable by colour. */
export const Figure: React.FC<{
  x: number;
  y: number;
  color: string;
  s?: number;
  bob?: boolean;
}> = ({ x, y, color, s = 1, bob = true }) => {
  const frame = useCurrentFrame();
  const b = bob ? Math.sin(frame / (9 / s)) * 5 * s : 0;
  const { u } = useStage();
  const w = 46 * u * s;
  const h = 210 * u * s;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y - h,
        width: w,
        height: h + Math.abs(b),
        transform: `translateX(-50%)`,
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 100 210" style={{ overflow: "visible" }}>
        <g transform={`translate(0 ${b})`}>
          <circle cx="50" cy="32" r="27" fill={color} />
          <rect x="27" y="64" width="46" height="88" rx="21" fill={color} />
          <rect x="13" y="154" width="27" height="38" rx="13" fill={color} />
          <rect x="60" y="154" width="27" height="38" rx="13" fill={color} />
        </g>
      </svg>
    </div>
  );
};

/** The boss: a figure, a tie, a podium line, and the red everything centres
 *  on. Boss colour is reserved for the boss. */
export const BossFigure: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1.15 }) => {
  const frame = useCurrentFrame();
  const { u } = useStage();
  const b = Math.sin(frame / 13) * 3 * s;
  const w = 54 * u * s;
  const h = 232 * u * s;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w * 2.2,
        height: h + 40 * u,
        transform: "translate(-50%, -100%)",
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 110 240" style={{ overflow: "visible" }}>
        <g transform={`translate(0 ${b})`}>
          <circle cx="55" cy="36" r="30" fill={c.boss} />
          <circle cx="55" cy="36" r="12" fill={c.board} />
          <rect x="29" y="70" width="52" height="96" rx="23" fill={c.boss} />
          {/* the tie — the one detail that marks authority */}
          <polygon points="55,74 60,92 55,112 50,92" fill={c.board} />
          <rect x="13" y="170" width="31" height="42" rx="14" fill={c.boss} />
          <rect x="66" y="170" width="31" height="42" rx="14" fill={c.boss} />
        </g>
      </svg>
    </div>
  );
};

/** A city pin: pulse in place, label beside it. */
export const Pin: React.FC<{
  x: number;
  y: number;
  label: string;
  enter: number;
  color?: string;
}> = ({ x, y, label, enter, color = c.dim }) => {
  const { u } = useStage();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = spring({ frame: enter, fps, config: { damping: 14, mass: 0.6, stiffness: 190 } });
  const pulse = (Math.sin(frame / 22) + 1) / 2;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%,-50%) scale(${0.4 + t * 0.6})`,
        opacity: Math.min(1, t),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: u * 8,
      }}
    >
      <div style={{ position: "relative", width: u * 24, height: u * 24 }}>
        <div
          style={{
            position: "absolute",
            inset: -u * 8,
            borderRadius: "50%",
            background: color,
            opacity: 0.25 * pulse,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: color,
            border: `${u * 2.5}px solid ${c.board}`,
          }}
        />
      </div>
      <span
        style={{
          fontFamily: c.mono,
          fontSize: u * 16,
          fontWeight: 700,
          letterSpacing: u * 1.5,
          whiteSpace: "nowrap",
          color: c.text,
        }}
      >
        {label.toUpperCase()}
      </span>
    </div>
  );
};

/** A travelling name tag — rides along the path under the figure. */
export const NameTag: React.FC<{
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
}> = ({ x, y, text, color, t }) => {
  const { u } = useStage();
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, 12px)",
        opacity: ease(t, 0, 8),
        background: c.panel,
        border: `${u * 1.5}px solid ${color}`,
        borderRadius: u * 8,
        padding: `${u * 5}px ${u * 12}px`,
        fontFamily: c.mono,
        fontSize: u * 15,
        fontWeight: 700,
        letterSpacing: u * 1.5,
        whiteSpace: "nowrap",
        color: c.ink,
      }}
    >
      {text.toUpperCase()}
    </div>
  );
};

/** Quadratic bezier point. */
export const qbez = (
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  t: number,
): [number, number] => {
  const k = 1 - t;
  return [
    k * k * p0[0] + 2 * k * t * p1[0] + t * t * p2[0],
    k * k * p0[1] + 2 * k * t * p1[1] + t * t * p2[1],
  ];
};

/** A path between two points with a perpendicular bulge — the arc that makes a
 *  trip read as a trip. Draws in with `progress` (dashoffset) and is stubbed
 *  with a dot at the moving end. */
export const Path: React.FC<{
  from: [number, number];
  to: [number, number];
  progress: number;
  color?: string;
  bulge?: number;
  width?: number;
}> = ({ from, to, progress, color = c.accent, bulge = 0.16, width = 5 }) => {
  const { u } = useStage();
  const mx = (from[0] + to[0]) / 2;
  const my = (from[1] + to[1]) / 2;
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
  const len = Math.hypot(dx, dy) || 1;
  const perp: [number, number] = [(-dy / len) * (len * bulge), (dx / len) * (len * bulge)];
  const ctrl: [number, number] = [mx + perp[0], my + perp[1]];
  const d = `M ${from[0]} ${from[1]} Q ${ctrl[0]} ${ctrl[1]} ${to[0]} ${to[1]}`;
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={u * width * 0.18}
        strokeLinecap="round"
        opacity={0.5}
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={u * width * 0.18}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - progress}
      />
    </svg>
  );
};

/** The rolling number — the infographic's signature. Rolls to the spoken
 *  value; `digits` sets how it reads as it climbs. */
export const CounterRoll: React.FC<{
  value: number;
  label: string;
  progress: number;
  color?: string;
  big?: boolean;
  suffix?: string;
}> = ({ value, label, progress, color = c.accent, big = true, suffix = "" }) => {
  const { u } = useStage();
  const eased = Easing.out(Easing.cubic)(Math.max(0, Math.min(1, progress)));
  const shown = Math.round(value * eased);
  const size = big ? u * 92 : u * 48;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: u * 8 }}>
      <div
        style={{
          fontFamily: c.font,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 0.95,
          letterSpacing: -size * 0.03,
          color,
        }}
      >
        {shown.toLocaleString()}
        {suffix}
      </div>
      <div
        style={{
          fontFamily: c.mono,
          fontSize: u * 18,
          fontWeight: 700,
          letterSpacing: u * 3,
          textTransform: "uppercase",
          color: c.dim,
        }}
      >
        {label}
      </div>
    </div>
  );
};

/** A chip — one fact on the title card. */
export const Chip: React.FC<{ text: string; enter: number; color?: string }> = ({
  text,
  enter,
  color = c.panelLine,
}) => {
  const { u } = useStage();
  const t = spring({ frame: enter, fps: useVideoConfig().fps, config: { damping: 16, mass: 0.5, stiffness: 200 } });
  return (
    <div
      style={{
        background: c.panel,
        border: `${u * 1.5}px solid ${color}`,
        borderRadius: u * 12,
        padding: `${u * 10}px ${u * 22}px`,
        fontFamily: c.mono,
        fontSize: u * 18,
        fontWeight: 700,
        letterSpacing: u * 2,
        whiteSpace: "nowrap",
        color: c.ink,
        opacity: Math.min(1, t),
        transform: `translateY(${interpolate(t, [0, 1], [u * 16, 0])}px)`,
      }}
    >
      {text.toUpperCase()}
    </div>
  );
};

/** The five travelling colours, in order of appearance. */
export const CAST = ["#FFC53D", "#3DDC97", "#4FB3FF", "#C792EA", "#FF8A5C"];