import React, { useId } from "react";

// Subtle cinematic vignette + top/bottom grade. Pure vector, single node.
export const Vignette: React.FC = () => {
  const id = useId();
  return (
    <svg
      width="1920"
      height="1080"
      viewBox="0 0 1920 1080"
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <defs>
        {/* Ink vignette for the cream paper — much softer than the old
            cinematic black, so the paper stays light in the corners. */}
        <radialGradient id={`vig-${id}`} cx="50%" cy="50%" r="72%">
          <stop offset="58%" stopColor="#1A1A1A" stopOpacity="0" />
          <stop offset="100%" stopColor="#1A1A1A" stopOpacity="0.16" />
        </radialGradient>
        <linearGradient id={`vig-top-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1A1A1A" stopOpacity="0.1" />
          <stop offset="0.14" stopColor="#1A1A1A" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`vig-bot-${id}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#1A1A1A" stopOpacity="0.12" />
          <stop offset="0.12" stopColor="#1A1A1A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="1920" height="1080" fill={`url(#vig-${id})`} />
      <rect width="1920" height="1080" fill={`url(#vig-top-${id})`} />
      <rect width="1920" height="1080" fill={`url(#vig-bot-${id})`} />
    </svg>
  );
};