import React from "react";
import { COLORS } from "../theme";

type Props = {
  width: number;
  height: number;
  style?: React.CSSProperties;
};

// Vector "iPhone"-style device hero: titanium frame, notch, dark screen with
// the story's accent bloom. No external asset, crisp at any scale.
export const PhoneHero: React.FC<Props> = ({ width, height, style }) => {
  const w = 320;
  const h = 640;
  const scale = Math.min(width / w, height / h);
  const screen = "#101216";
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <svg
        width={w * scale}
        height={h * scale}
        viewBox={`0 0 ${w} ${h}`}
        style={{ filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.5))" }}
        aria-hidden
      >
        {/* Body */}
        <rect x="28" y="8" width="264" height="624" rx="48" fill="#2A2D33" />
        <rect x="36" y="16" width="248" height="608" rx="40" fill={screen} />
        {/* Notch / Dynamic Island */}
        <rect x="122" y="34" width="76" height="26" rx="13" fill="#0B0C0F" />
        {/* Screen accent bloom */}
        <circle cx="160" cy="360" r="190" fill={COLORS.goldDim} />
        <rect x="52" y="460" width="70" height="10" rx="5" fill={COLORS.lineStrong} />
        <rect x="52" y="484" width="118" height="10" rx="5" fill={COLORS.line} />
        <rect x="52" y="508" width="96" height="10" rx="5" fill={COLORS.line} />
        <circle cx="160" cy="180" r="26" fill={COLORS.gold} opacity="0.9" />
        <rect x="52" y="240" width="216" height="4" rx="2" fill={COLORS.lineStrong} />
        {/* Camera ring */}
        <circle cx="232" cy="44" r="5" fill={COLORS.steel} />
      </svg>
    </div>
  );
};