// The money-flow trace. The signature scam frame: the money leaves the victim,
// passes through the platform, and lands with the scammer — one line, a token
// that rides it, and nodes that light as it passes. The viewer is never asked
// to read a diagram; they watch the money move, which is the whole argument.
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useSemanticCamera } from "../editorial/camera";
import { theme } from "../theme";
import { DrawIn, Kicker } from "./elements";
import { useMargin, VoxSceneProps } from "./scenes";

export const Trace: React.FC<VoxSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height, pad, wide } = useMargin();
  const vox = theme.vox;
  const { transform } = useSemanticCamera("focus", dur, {
    x: wide ? pad : pad,
    y: wide ? height * 0.12 : height * 0.2,
    w: wide ? width - pad * 2 : width - pad * 2,
    h: wide ? height * 0.55 : height * 0.52,
  });
  const rows = beat.data && beat.data.length ? beat.data : [];
  if (rows.length < 2) return null;

  // The token arrives at the end and holds there: the destination is the
  // point of the frame, not the journey.
  const easeP = interpolate(frame, [10, Math.max(20, dur - 24)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Path geometry. Node i sits at fraction i/(n-1) along the road.
  const n = rows.length;
  const at = (i: number) => (n > 1 ? i / (n - 1) : 0);
  const x0 = wide ? pad * 1.6 : width * 0.42;
  const y0 = wide ? height * 0.42 : height * 0.3;
  const len = wide ? width - pad * 3.2 : height * 0.42;
  const dot = width * 0.02;
  const axis = width * 0.005;

  const token: [number, number] = wide ? [x0 + easeP * len, y0] : [x0, y0 + easeP * len];
  const amountSize = width * 0.05;

  return (
    <AbsoluteFill style={{ transform, fontFamily: vox.font }}>
      <div style={{ position: "absolute", left: pad, top: pad * 1.6 }}>
        <Kicker text={beat.name} enter={frame - 4} />
      </div>

      {/* The road: a ruled line that draws as the token advances. */}
      <div
        style={{
          position: "absolute",
          left: wide ? x0 : x0 - axis / 2,
          top: wide ? y0 - axis / 2 : y0,
          width: wide ? len * easeP : axis,
          height: wide ? axis : len * easeP,
          background: vox.muted,
        }}
      />

      {/* Nodes: the dot lands, then the label lights when the money passes. */}
      {rows.map((row, i) => {
        const f = at(i);
        const lit = easeP >= f;
        const s = spring({
          frame: frame - 12 - i * 6,
          fps,
          config: { damping: 200, mass: 0.6, stiffness: 190 },
          durationInFrames: 14,
        });
        const last = i === n - 1;
        const px = wide ? x0 + f * len : x0;
        const py = wide ? y0 : y0 + f * len;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: px - dot / 2,
                top: py - dot / 2,
                width: dot,
                height: dot,
                borderRadius: dot,
                background: lit ? (last ? vox.accent : vox.ink) : vox.rule,
                transform: `scale(${s})`,
              }}
            />
            <div
              style={{
                position: "absolute",
                ...(wide
                  ? { left: px + dot, top: py + height * 0.035, textAlign: "left" }
                  : { right: width - px + dot, top: py - width * 0.032, textAlign: "right" }),
                width: wide ? width * 0.24 : width - px - dot - pad,
                fontWeight: 800,
                fontSize: width * (wide ? 0.026 : 0.036),
                lineHeight: 1.1,
                letterSpacing: -width * 0.0008,
                color: lit ? (last ? vox.accent : vox.ink) : vox.muted,
                opacity: lit ? 1 : 0.5,
              }}
            >
              {row.label}
            </div>
          </React.Fragment>
        );
      })}

      {/* The money, riding the road. */}
      <div
        style={{
          position: "absolute",
          left: token[0] - (wide ? amountSize * 0.5 : amountSize * 1.1),
          top: token[1] - (wide ? height * 0.07 : amountSize * 1.15),
          whiteSpace: "nowrap",
          fontWeight: 800,
          fontSize: amountSize,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: -amountSize * 0.02,
          color: vox.accent,
          opacity: easeP > 0 ? 1 : 0,
        }}
      >
        {beat.text}
      </div>
      <div
        style={{
          position: "absolute",
          left: token[0] - dot * 1.2,
          top: token[1] - dot * 1.2,
          width: dot * 2.4,
          height: dot * 2.4,
          borderRadius: dot * 2.4,
          background: vox.accent,
          boxShadow: `0 0 0 ${width * 0.004}px ${vox.paper}`,
          opacity: easeP > 0 ? 1 : 0,
        }}
      />

      {/* Arrival: the destination gets boxed, because "gone" is the payoff. */}
      {easeP > 0.94 ? (
        <DrawIn
          shape="box"
          x={(wide ? x0 + len : x0) - dot * 1.6}
          y={(wide ? y0 : y0 + len) - dot * 1.6}
          w={dot * 4.2}
          h={dot * 4.2}
          seed={beat.n * 17}
          progress={interpolate(easeP, [0.94, 1], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        />
      ) : null}
    </AbsoluteFill>
  );
};
