import React, { memo } from "react";
import { COLORS } from "../theme";

type Props = {
  size?: number;
  muted?: boolean;
  style?: React.CSSProperties;
};

// Stylized fast-food restaurant glyph (placeholder vector asset).
// Pure SVG, no animation — animate it from the parent.
export const RestaurantIcon: React.FC<Props> = memo(
  ({ size = 64, muted = false, style }) => {
    const body = muted ? "#2A2F38" : COLORS.red;
    const gold = muted ? COLORS.steel : COLORS.gold;
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" style={style} aria-hidden>
        <rect x="14" y="30" width="72" height="64" rx="9" fill={body} />
        <rect x="22" y="22" width="56" height="10" rx="4.5" fill={gold} />
        <path
          d="M 33 47 L 41 56 L 50 47 L 59 56 L 67 47"
          fill="none"
          stroke={gold}
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="41" y="70" width="18" height="24" rx="4" fill="#0C0D10" opacity="0.82" />
      </svg>
    );
  },
);
RestaurantIcon.displayName = "RestaurantIcon";