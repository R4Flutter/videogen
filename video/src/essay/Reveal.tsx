// Reveal: the progressive-disclosure wrapper. A beat's plan names a reveal
// mode and a set of triggers; this component realises the modes the modules
// can't do themselves (MASK wipes, HIDDEN_THEN_REVEAL holds) and renders the
// editorial stamps — the "?" and "REVEAL" notations — at their trigger times.
// Modes the modules already stage natively (SEQUENTIAL, PROGRESSIVE,
// DRAW_ON, COUNTER_REVEAL, LAYERED) pass through untouched: two systems
// animating one element is how frames get noisy.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import type { DirectedBeat, RevealMode, RevealTrigger } from "../director/types.ts";

const vox = theme.vox;

/** Modules that stage their own progressive behaviour. */
const SELF_STAGED = new Set<RevealMode>([
  "SEQUENTIAL",
  "PROGRESSIVE",
  "DRAW_ON",
  "COUNTER_REVEAL",
  "LAYERED",
  "FOCUS",
  "ZOOM_REVEAL",
]);

export const Reveal: React.FC<{
  beat: DirectedBeat;
  module: string;
  children: React.ReactNode;
}> = ({ beat, module, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const dur = beat.end - beat.start;
  const mode = beat.motion.reveal.mode;

  // The "?" and "REVEAL" stamps ride on top of the beat, not instead of it.
  const stamps = beat.motion.reveal.triggers.filter(
    (tr) => tr.kind === "question" || tr.kind === "reveal",
  );

  let style: React.CSSProperties = {};
  let content = children;

  if (mode === "HIDDEN_THEN_REVEAL") {
    // Content held back until the beat's plan says land it.
    const holdUntil = beat.motion.reveal.holdUntil - beat.start;
    const inT = interpolate(t, [holdUntil, holdUntil + 0.7], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: undefined,
    });
    style = { opacity: inT };
  } else if (mode === "MASK" && !SELF_STAGED.has(mode) && module !== "kinetic") {
    // The whole stage wipes in as a block. Kinetic words land word-by-word
    // already; a block wipe over them would fight the phrasing.
    const sweep = interpolate(t, [0, Math.min(2.4, dur * 0.4)], [100, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    style = { clipPath: `inset(0 ${sweep}% 0 0)` };
  }

  return (
    <AbsoluteFill style={style}>
      {content}
      <Stamps triggers={stamps} start={beat.start} dur={dur} />
    </AbsoluteFill>
  );
};

/** The editorial stamps: "?" opens a question, "REVEAL" lands the answer.
 *  Paper chips in the accent, sized off the canvas like everything else. */
const Stamps: React.FC<{ triggers: RevealTrigger[]; start: number; dur: number }> = ({
  triggers,
  start,
  dur,
}) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const t = frame / 30; // fps-agnostic enough for a chip that lives 2s
  if (!triggers.length) return null;

  const chip = (tr: RevealTrigger, label: string) => {
    const local = tr.at - start;
    const inT = interpolate(t, [local, local + 0.35], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const outT = interpolate(t, [local + 1.7, local + 2.2], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const op = Math.min(inT, outT);
    if (op <= 0) return null;
    return (
      <div
        key={`${tr.kind}-${tr.at}`}
        style={{
          position: "absolute",
          top: width * 0.13,
          right: width * 0.075,
          display: "flex",
          alignItems: "center",
          gap: width * 0.02,
          padding: `${width * 0.018}px ${width * 0.034}px`,
          background:
            tr.kind === "reveal" ? vox.accent : "rgba(244,241,234,0.9)",
          border: `${width * 0.0035}px solid ${
            tr.kind === "reveal" ? vox.accent : vox.rule
          }`,
          boxShadow: `0 ${width * 0.01}px ${width * 0.03}px rgba(26,26,26,.18)`,
          transform: `rotate(${tr.kind === "reveal" ? 1.5 : -1.5}deg)`,
          opacity: op,
          fontFamily: vox.font,
          fontWeight: 800,
          fontSize: width * 0.028,
          letterSpacing: width * 0.003,
          textTransform: "uppercase",
          color: tr.kind === "reveal" ? vox.paper : vox.accent,
          maxWidth: width * 0.55,
        }}
      >
        <span style={{ fontSize: width * 0.036 }}>{tr.kind === "question" ? "?" : "!"}</span>
        {label}
      </div>
    );
  };

  return (
    <>
      {triggers.map((tr) =>
        chip(tr, tr.kind === "question" ? (tr.label ?? "WHAT?") : "THE REVEAL"),
      )}
    </>
  );
};
