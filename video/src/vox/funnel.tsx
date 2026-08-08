// The scam funnel. Volume staged as geometry: a hundred thousand targets
// narrow to five locked accounts, each bar dropping in order and carrying its
// count. The last bar is the argument, so it carries the accent — and the
// counts are tabular, because a rolling digit that shifts the whole number
// makes the funnel look like it is guessing.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { useSemanticCamera } from "../editorial/camera";
import { theme } from "../theme";
import { Kicker, num } from "./elements";
import { useMargin, VoxSceneProps } from "./scenes";

export const Funnel: React.FC<VoxSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { width, height, pad } = useMargin();
  const vox = theme.vox;
  const { transform } = useSemanticCamera("reveal", dur);
  const rows = beat.data && beat.data.length ? beat.data : [];
  if (rows.length < 2) return null;

  const top = Math.max(...rows.map((r) => r.value), 1);
  const track = width - pad * 2;
  const barH = height * 0.055;
  const step = barH * 2.3;
  const first = height * 0.44;

  return (
    <AbsoluteFill style={{ transform, fontFamily: vox.font }}>
      <div style={{ position: "absolute", left: pad, top: pad * 1.6 }}>
        <Kicker text={beat.name} enter={frame - 4} />
      </div>
      {beat.text ? (
        <div
          style={{
            marginTop: pad * 0.4,
            width: width - pad * 2,
            fontWeight: 800,
            fontSize: width * 0.058,
            lineHeight: 1.05,
            letterSpacing: -width * 0.002,
            color: vox.ink,
            opacity: interpolate(frame, [2, 16], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {beat.text}
        </div>
      ) : null}

      {rows.map((row, i) => {
        // Even the smallest bar stays readable; a funnel that shrinks to
        // nothing is a funnel that admits five victims.
        const frac = Math.max(row.value / top, 0.07);
        const grow = interpolate(frame, [14 + i * 12, 42 + i * 12], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const w = track * frac * grow;
        const y = first + i * step;
        const last = i === rows.length - 1;
        const fill = last ? vox.accent : vox.ink;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: pad,
                top: y - barH * 1.02,
                fontWeight: 700,
                fontSize: width * 0.03,
                letterSpacing: width * 0.001,
                textTransform: "uppercase",
                color: last ? vox.accent : vox.muted,
                opacity: grow,
              }}
            >
              {row.label}
            </div>
            <div
              style={{
                position: "absolute",
                left: pad,
                top: y,
                width: w,
                height: barH,
                background: fill,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: pad + w + width * 0.022,
                top: y,
                height: barH,
                display: "flex",
                alignItems: "center",
                fontWeight: 800,
                fontSize: barH * 0.72,
                lineHeight: 1,
                color: fill,
                opacity: grow,
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {num(row.value * grow)}
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
