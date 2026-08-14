import React, { memo } from "react";
import { COLORS, withAlpha } from "../theme";
import type { NodeRole } from "../data/storyTypes";

type Props = {
  role: NodeRole;
  size?: number;
  style?: React.CSSProperties;
  // Role-tinted rounded plate behind the glyph (used by card chips).
  plate?: boolean;
};

// Role-tint for the plate and detail accents. Kept semantic, not decorative:
// money/factory read gold, people/brand read the accent red, the rest stay ink.
const TINT: Record<NodeRole, { plate: string; accent: string; body: string }> = {
  customer: { plate: "red", accent: COLORS.red, body: COLORS.textPrimary },
  store: { plate: "gold", accent: COLORS.gold, body: COLORS.textPrimary },
  partner: { plate: "ink", accent: COLORS.red, body: COLORS.textPrimary },
  brand: { plate: "red", accent: COLORS.gold, body: COLORS.textPrimary },
  supplier: { plate: "ink", accent: COLORS.red, body: COLORS.textPrimary },
  cash: { plate: "gold", accent: COLORS.gold, body: COLORS.textPrimary },
  factory: { plate: "ink", accent: COLORS.gold, body: COLORS.textPrimary },
  tech: { plate: "gold", accent: COLORS.red, body: COLORS.textPrimary },
  device: { plate: "ink", accent: COLORS.red, body: COLORS.textPrimary },
  cloud: { plate: "ink", accent: COLORS.red, body: COLORS.textPrimary },
  people: { plate: "red", accent: COLORS.red, body: COLORS.textPrimary },
  platform: { plate: "gold", accent: COLORS.gold, body: COLORS.textPrimary },
};

const plateFill = (tone: string): string => {
  if (tone === "red") return withAlpha(COLORS.red, 0.1);
  if (tone === "gold") return withAlpha(COLORS.gold, 0.12);
  return withAlpha(COLORS.textPrimary, 0.06);
};

// Editorial flat-vector glyph library for business-model nodes. Filled, layered
// two-tone marks (ink body + accent detail) on a role-tinted plate — consistent
// weight, rounded caps, one accent per glyph. Add roles here when a story needs
// a new one.
export const NodeIcon: React.FC<Props> = memo(({ role, size = 76, style, plate = true }) => {
  const tint = TINT[role] ?? TINT.platform;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style} aria-hidden>
      {plate ? <rect x="4" y="4" width="92" height="92" rx="24" fill={plateFill(tint.plate)} /> : null}
      {role === "customer" ? (
        // Person: filled silhouette, accent chest badge
        <g>
          <circle cx="50" cy="32" r="15" fill={tint.body} />
          <path
            d="M 21 84 Q 20 60 50 60 Q 80 60 79 84 Q 74 90 64 90 L 36 90 Q 26 90 21 84 Z"
            fill={tint.body}
          />
          <circle cx="50" cy="70" r="7" fill={tint.accent} />
        </g>
      ) : role === "store" ? (
        // Storefront: filled body, striped awning, door
        <g>
          <rect x="16" y="42" width="68" height="42" rx="7" fill={tint.body} />
          <path d="M 16 42 L 84 42 L 84 52 L 16 52 Z" fill={tint.accent} />
          <path d="M 22 34 L 50 22 L 78 34 L 78 42 L 22 42 Z" fill={tint.body} />
          <rect x="42" y="58" width="16" height="26" rx="4" fill={COLORS.panel} />
          <rect x="32" y="56" width="7" height="9" rx="2" fill={COLORS.panel} />
          <rect x="61" y="56" width="7" height="9" rx="2" fill={COLORS.panel} />
        </g>
      ) : role === "partner" ? (
        // Linked rings: two partners joined by a link
        <g>
          <circle cx="36" cy="52" r="17" fill={tint.body} />
          <circle cx="64" cy="52" r="17" fill={withAlpha(tint.accent, 0.9)} />
          <circle cx="36" cy="52" r="6" fill={COLORS.bg} />
          <circle cx="64" cy="52" r="6" fill={COLORS.bg} />
          <rect x="46" y="44" width="8" height="16" rx="3" fill={COLORS.panel} />
        </g>
      ) : role === "brand" ? (
        // Brand mark: filled crown with ink band and gem
        <g>
          <path
            d="M 20 38 L 30 56 L 44 32 L 50 46 L 56 32 L 70 56 L 80 38 L 80 66 Q 80 74 72 74 L 28 74 Q 20 74 20 66 Z"
            fill={tint.accent}
          />
          <rect x="24" y="74" width="52" height="9" rx="4.5" fill={tint.body} />
          <circle cx="50" cy="50" r="3.4" fill={COLORS.bg} />
        </g>
      ) : role === "supplier" ? (
        // Truck: filled cab + box + wheels
        <g>
          <path d="M 14 46 L 46 46 L 46 72 L 14 72 Q 10 72 10 68 L 10 50 Q 10 46 14 46 Z" fill={tint.body} />
          <path d="M 50 46 L 66 46 Q 76 46 80 54 L 84 60 L 84 68 Q 84 72 80 72 L 50 72 Z" fill={tint.accent} />
          <circle cx="30" cy="72" r="8" fill={tint.body} />
          <circle cx="30" cy="72" r="3.4" fill={COLORS.panel} />
          <circle cx="68" cy="72" r="8" fill={tint.body} />
          <circle cx="68" cy="72" r="3.4" fill={COLORS.panel} />
          <rect x="54" y="34" width="22" height="9" rx="4.5" fill={tint.accent} />
        </g>
      ) : role === "cash" ? (
        // Coin stack: gold rims + face with $
        <g>
          <ellipse cx="50" cy="28" rx="21" ry="7.5" fill={tint.accent} />
          <path
            d="M 29 28 L 29 58 Q 29 66 50 66 Q 71 66 71 58 L 71 28 Z"
            fill={tint.accent}
          />
          <path d="M 29 40 L 71 40 M 29 52 L 71 52" stroke={withAlpha(COLORS.textPrimary, 0.25)} strokeWidth="2" />
          <text
            x="50"
            y="51"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="24"
            fontWeight={900}
            fill={COLORS.bg}
          >
            $
          </text>
        </g>
      ) : role === "factory" ? (
        // Factory: filled silhouette, gold windows
        <g>
          <path
            d="M 14 74 L 14 40 L 30 52 L 44 36 L 44 74 Z M 48 54 L 64 66 L 78 44 L 78 74 Z"
            fill={tint.body}
          />
          <path d="M 56 26 L 56 14 M 72 26 L 72 14" stroke={tint.body} strokeWidth="5" strokeLinecap="round" />
          <path d="M 46 26 L 46 18 M 62 22 L 62 14" stroke={tint.accent} strokeWidth="5" strokeLinecap="round" />
          <rect x="20" y="54" width="9" height="8" rx="2" fill={tint.accent} />
          <rect x="52" y="60" width="9" height="8" rx="2" fill={tint.accent} />
        </g>
      ) : role === "tech" ? (
        // Chip: filled die + gold core + pins
        <g>
          <rect x="26" y="26" width="48" height="48" rx="9" fill={tint.body} />
          <rect x="38" y="38" width="24" height="24" rx="5" fill={tint.accent} />
          <path d="M 42 26 L 42 16 M 50 26 L 50 16 M 58 26 L 58 16" stroke={tint.body} strokeWidth="4" strokeLinecap="round" />
          <path d="M 42 74 L 42 84 M 50 74 L 50 84 M 58 74 L 58 84" stroke={tint.body} strokeWidth="4" strokeLinecap="round" />
          <path d="M 26 42 L 16 42 M 26 50 L 16 50 M 26 58 L 16 58" stroke={tint.body} strokeWidth="4" strokeLinecap="round" />
          <path d="M 74 42 L 84 42 M 74 50 L 84 50 M 74 58 L 84 58" stroke={tint.body} strokeWidth="4" strokeLinecap="round" />
        </g>
      ) : role === "device" ? (
        // Phone: filled body, accent camera + screen notch
        <g>
          <rect x="28" y="12" width="44" height="76" rx="12" fill={tint.body} />
          <rect x="36" y="22" width="28" height="6" rx="3" fill={tint.accent} />
          <circle cx="50" cy="78" r="3.6" fill={tint.accent} />
        </g>
      ) : role === "cloud" ? (
        // Cloud: filled puff + accent underline
        <g>
          <path
            d="M 30 70 Q 20 70 20 60 Q 20 47 34 46 Q 36 30 54 32 Q 72 34 74 48 Q 84 48 84 60 Q 84 70 72 70 Z"
            fill={tint.body}
          />
          <path d="M 34 82 Q 30 82 30 76 Q 30 70 34 70 M 66 82 Q 70 82 70 76 Q 70 70 66 70" fill="none" stroke={tint.accent} strokeWidth="5" strokeLinecap="round" />
        </g>
      ) : role === "people" ? (
        // Group: three filled figures, varied scale
        <g>
          <circle cx="33" cy="36" r="11" fill={tint.body} />
          <path d="M 16 84 Q 16 64 33 64 Q 50 64 50 84 Z" fill={tint.body} />
          <circle cx="66" cy="33" r="9" fill={withAlpha(tint.body, 0.75)} />
          <path d="M 52 84 Q 52 66 66 66 Q 80 66 80 84 Z" fill={withAlpha(tint.body, 0.75)} />
          <circle cx="50" cy="30" r="6" fill={tint.accent} />
        </g>
      ) : (
        // platform (default): stacked layers, top accent
        <g>
          <rect x="14" y="20" width="72" height="19" rx="6" fill={tint.accent} />
          <rect x="20" y="43" width="60" height="19" rx="6" fill={withAlpha(tint.body, 0.85)} />
          <rect x="26" y="66" width="48" height="19" rx="6" fill={withAlpha(tint.body, 0.55)} />
        </g>
      )}
    </svg>
  );
});
NodeIcon.displayName = "NodeIcon";
