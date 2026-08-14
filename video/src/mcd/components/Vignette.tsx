import React, { useId } from "react";

// Subtle cinematic vignette + top/bottom grade + fine paper grain. Pure
// vector, single node. The grain is what stops flat shapes from reading as
// UI stickers: every scene in every story sits on textured paper.
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
        {/* Fine paper grain: high-frequency turbulence, near-invisible,
            multiply-blended so shadows deepen slightly on the paper. */}
        <filter id={`grain-${id}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect width="1920" height="1080" fill={`url(#vig-${id})`} />
      <rect width="1920" height="1080" fill={`url(#vig-top-${id})`} />
      <rect width="1920" height="1080" fill={`url(#vig-bot-${id})`} />
      <rect width="1920" height="1080" filter={`url(#grain-${id})`} opacity="0.05" style={{ mixBlendMode: "multiply" }} />
    </svg>
  );
};