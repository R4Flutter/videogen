// The money-flow trace. The signature scam frame: the money leaves the victim,
// passes through the platform, and lands with the scammer — one line, a token
// that rides it, and nodes that light as it passes. The viewer is never asked
// to read a diagram; they watch the money move, which is the whole argument.
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraRig } from "../editorial/camera";
import { theme } from "../theme";
import { DrawIn } from "./elements";
import { fit, useLayout } from "./layout";
import { PageHead, VoxSceneProps } from "./scenes";

export const Trace: React.FC<VoxSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height, pad, safeW, wide, y: band, primaryH } = useLayout();
  const vox = theme.vox;
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
  // The money rides the middle of the primary band in landscape and runs down
  // it in portrait — either way it starts below the headline, which is what
  // the old fixed 42%/30% could not promise once a headline wrapped to two
  // lines.
  const y0 = wide ? band.primary + primaryH * 0.45 : band.primary + primaryH * 0.08;
  const len = wide ? width - pad * 3.2 : primaryH * 0.8;
  const dot = width * 0.02;
  const axis = width * 0.005;

  const token: [number, number] = wide ? [x0 + easeP * len, y0] : [x0, y0 + easeP * len];
  // What rides the token is an *amount*, and an amount has digits in it. A
  // script that writes a sentence on the Text row ("The payment clears") was
  // getting it printed at the token's position in accent 800 — a headline
  // dragged across the diagram, through the node labels it crossed. A sentence
  // is a headline, so it goes where headlines go.
  const money = /\d/.test(beat.text ?? "");
  const amount = money ? (beat.text as string) : "";
  // The amount travels with the token, so it may never be wider than the room
  // left beside the road at the far end of the run.
  const amountSize = fit(amount, safeW * 0.3, width * 0.05, {
    weight: 800,
    family: vox.font,
  });

  return (
    <CameraRig
      intent="focus"
      dur={dur}
      target={{ x: pad, y: band.primary, w: safeW, h: primaryH }}
      seed={beat.n}
      style={{ fontFamily: vox.font }}
    >
      <PageHead kicker={beat.name} headline={money ? undefined : beat.text} frame={frame} />

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
          opacity: easeP > 0 && amount ? 1 : 0,
        }}
      >
        {amount}
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
    </CameraRig>
  );
};
