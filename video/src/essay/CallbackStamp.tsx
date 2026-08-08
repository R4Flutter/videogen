// CallbackStamp: story memory made visible. When the plan says a beat
// references an earlier motif — the phone returns, the balance changed — a
// small paper chip names the return so the reference reads as *intended*
// rather than as a coincidence. One stamp per beat, ever.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import type { DirectorPlan } from "../director/types.ts";

const vox = theme.vox;

export const CallbackStamp: React.FC<{
  plan: DirectorPlan;
  beatN: number;
}> = ({ plan, beatN }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const t = frame / 30;

  const events = plan.memoryEvents.filter((e) => e.beat === beatN);
  if (!events.length) return null;
  const e = events[0];
  const motif = plan.storyMemory.find((m) => m.id === e.motifId);
  if (!motif) return null;

  const label =
    e.kind === "state_change" ? `${motif.label} — ${e.state}` : `${motif.label} returns`;

  const inT = interpolate(t, [1.2, 1.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outT = interpolate(t, [6.5, 7], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const op = Math.min(inT, outT);
  if (op <= 0) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: width * 0.13,
          left: width * 0.075,
          display: "flex",
          alignItems: "center",
          gap: width * 0.018,
          padding: `${width * 0.014}px ${width * 0.028}px`,
          background: "rgba(244,241,234,0.92)",
          border: `${width * 0.003}px solid ${vox.rule}`,
          borderLeft: `${width * 0.01}px solid ${vox.accent}`,
          boxShadow: `0 ${width * 0.008}px ${width * 0.024}px rgba(26,26,26,.16)`,
          transform: `rotate(-1.2deg)`,
          opacity: op,
          fontFamily: vox.font,
          fontWeight: 700,
          fontSize: width * 0.024,
          letterSpacing: width * 0.002,
          textTransform: "uppercase",
          color: vox.ink,
          maxWidth: width * 0.6,
        }}
      >
        <span style={{ color: vox.accent, fontWeight: 800 }}>↩</span>
        {label}
      </div>
    </AbsoluteFill>
  );
};
