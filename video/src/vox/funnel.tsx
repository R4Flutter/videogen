// The scam funnel. Volume staged as geometry: a hundred thousand targets
// narrow to five locked accounts, each bar dropping in order and carrying its
// count. The last bar is the argument, so it carries the accent — and the
// counts are tabular, because a rolling digit that shifts the whole number
// makes the funnel look like it is guessing.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CameraRig } from "../editorial/camera";
import { theme } from "../theme";
import { measure, numberFormat, useLayout } from "./layout";
import { PageHead, VoxSceneProps } from "./scenes";

export const Funnel: React.FC<VoxSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { width, pad, safeW, y: band, primaryH } = useLayout();
  const vox = theme.vox;
  const rows = beat.data && beat.data.length ? beat.data : [];
  if (rows.length < 2) return null;

  const top = Math.max(...rows.map((r) => r.value), 1);
  const barH = Math.min(width * 0.058, primaryH / (rows.length * 2.5));
  const step = barH * 2.3;
  const first = band.primary + barH;
  const fmt = numberFormat(top);
  // The bug this module was the poster child for. `track` used to be the whole
  // safe width, and the count was then printed at `pad + track + 2.2%` — which
  // is past the right margin by construction, so the largest bar in every
  // funnel pushed its own number off the canvas. The bars now share the width
  // with the widest number the beat will print.
  const valueW = Math.max(
    ...rows.map((r) =>
      measure(fmt(r.value), { size: barH * 0.72, weight: 800, family: vox.font }),
    ),
  );
  const track = Math.max(safeW * 0.45, safeW - valueW - width * 0.03);

  return (
    <CameraRig intent="reveal" dur={dur} seed={beat.n} style={{ fontFamily: vox.font }}>
      <PageHead kicker={beat.name} headline={beat.text} frame={frame} />

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
                // Clear of the bar by the label's own line, not by the bar's
                // height. Those were the same number until the bars started
                // sizing themselves to the band, and then every label sat a
                // third of the way into the bar it names.
                top: y - width * 0.03 * 1.35,
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
              {fmt(row.value * grow)}
            </div>
          </React.Fragment>
        );
      })}
    </CameraRig>
  );
};
