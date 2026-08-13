import React, { memo } from "react";
import { COLORS } from "../theme";
import type { NodeRole } from "../data/storyTypes";

type Props = {
  role: NodeRole;
  size?: number;
  style?: React.CSSProperties;
};

// Stroke-glyph library for business-model nodes. Each role draws in the
// current story's accents — add roles here when a story needs a new one.
export const NodeIcon: React.FC<Props> = memo(({ role, size = 76, style }) => {
  const stroke = COLORS.textPrimary;
  const accent = COLORS.red;
  const gold = COLORS.gold;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style} aria-hidden>
      {role === "customer" ? (
        // Person
        <g fill="none" stroke={stroke} strokeWidth="7" strokeLinecap="round">
          <circle cx="50" cy="36" r="20" />
          <path d="M 18 86 Q 20 62 50 60 Q 80 62 82 86 Z" strokeLinejoin="round" />
        </g>
      ) : role === "store" ? (
        // Storefront with sign
        <g fill="none" stroke={stroke} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="14" y="30" width="72" height="58" rx="9" />
          <path d="M 14 44 L 50 20 L 86 44" />
          <rect x="38" y="56" width="24" height="32" rx="3" fill={stroke} opacity="0.9" stroke="none" />
        </g>
      ) : role === "partner" ? (
        // Handshake-ish link
        <g fill="none" stroke={stroke} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="34" cy="50" r="18" />
          <circle cx="66" cy="50" r="18" />
          <path d="M 42 62 L 58 62 M 46 68 L 54 68" />
        </g>
      ) : role === "brand" ? (
        // Crown / mark
        <g fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 18 62 L 18 36 L 34 50 L 50 30 L 66 50 L 82 36 L 82 62 Z" />
          <rect x="24" y="68" width="52" height="10" rx="4" fill={accent} stroke="none" opacity="0.9" />
        </g>
      ) : role === "supplier" ? (
        // Truck
        <g fill="none" stroke={stroke} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          <rect x="12" y="38" width="52" height="30" rx="6" />
          <path d="M 64 44 L 82 44 L 86 58 L 64 58 Z" />
          <circle cx="32" cy="72" r="8" fill={stroke} stroke="none" opacity="0.9" />
          <circle cx="72" cy="72" r="8" fill={stroke} stroke="none" opacity="0.9" />
        </g>
      ) : role === "cash" ? (
        // Coin stack
        <g fill="none" stroke={gold} strokeWidth="6" strokeLinecap="round">
          <ellipse cx="50" cy="28" rx="22" ry="8" />
          <rect x="28" y="28" width="44" height="34" rx="8" />
          <path d="M 28 40 L 72 40 M 28 52 L 72 52" opacity="0.6" />
        </g>
      ) : role === "factory" ? (
        // Factory
        <g fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 14 78 L 14 46 L 30 58 L 44 40 L 44 78 Z M 44 50 L 60 62 L 74 46 L 74 78 Z" />
          <circle cx="24" cy="30" r="4" fill={accent} stroke="none" />
          <circle cx="40" cy="24" r="4" fill={accent} stroke="none" />
          <circle cx="56" cy="30" r="4" fill={accent} stroke="none" />
          <circle cx="72" cy="24" r="4" fill={accent} stroke="none" />
        </g>
      ) : role === "tech" ? (
        // Chip
        <g fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round">
          <rect x="26" y="26" width="48" height="48" rx="8" />
          <path d="M 42 26 L 42 14 M 58 26 L 58 14 M 42 86 L 42 74 M 58 86 L 58 74" />
          <path d="M 26 42 L 14 42 M 26 58 L 14 58 M 86 42 L 74 42 M 86 58 L 74 58" />
          <rect x="38" y="38" width="24" height="24" rx="4" fill={accent} stroke="none" opacity="0.9" />
        </g>
      ) : role === "device" ? (
        // Phone
        <g fill="none" stroke={stroke} strokeWidth="7" strokeLinecap="round">
          <rect x="28" y="12" width="44" height="76" rx="10" />
          <circle cx="50" cy="78" r="4" fill={accent} stroke="none" />
          <path d="M 40 24 L 60 24" />
        </g>
      ) : role === "cloud" ? (
        // Cloud
        <g fill="none" stroke={stroke} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 30 68 Q 22 68 22 58 Q 22 46 36 46 Q 38 32 54 34 Q 70 34 72 48 Q 82 48 82 58 Q 82 68 72 68 Z" />
          <path d="M 30 84 Q 18 84 18 72 M 70 84 Q 82 84 82 72" />
        </g>
      ) : role === "people" ? (
        // Group
        <g fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="32" cy="36" r="12" />
          <circle cx="64" cy="32" r="10" />
          <path d="M 12 82 Q 14 62 32 60 Q 50 62 52 82 Z" />
          <path d="M 52 76 Q 56 62 68 60 Q 82 64 84 80" opacity="0.8" />
        </g>
      ) : (
        // platform (default): stacked layers
        <g fill="none" stroke={gold} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="14" y="22" width="72" height="18" rx="5" />
          <rect x="20" y="44" width="60" height="18" rx="5" opacity="0.8" />
          <rect x="26" y="66" width="48" height="18" rx="5" opacity="0.6" />
        </g>
      )}
    </svg>
  );
});
NodeIcon.displayName = "NodeIcon";