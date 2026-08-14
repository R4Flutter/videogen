// Subject artwork renderer. The scene passes an asset ID; the registry
// resolves it to a path and metadata. With the file present it renders the
// image; without one it draws a flat-vector editorial fallback so a story is
// testable before its assets arrive. The fallback is generic — a "hero
// subject" silhouette — and the planner picks the asset by ID, never a
// hardcoded path inside a scene.

import React, { useState } from "react";
import { Img } from "remotion";
import { COLORS } from "../mcd/theme";
import { resolveAsset } from "./assetRegistry";

export type SubjectArtworkProps = {
  // Asset registry ID, e.g. "subjects/lambo".
  asset?: string;
  // Display width in px — height derives from the asset's aspect ratio.
  width: number;
  // Fallback silhouette color.
  color?: string;
  style?: React.CSSProperties;
};

// A flat-vector supercar silhouette (side profile, facing right) — the
// editorial identity: charcoal body, minimal detail, no gradients.
const VehicleFallback: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 900 300" style={{ width: "100%", height: "100%", display: "block" }} aria-hidden>
    <path
      d="M 60 210 L 130 150 Q 160 120 210 118 L 330 112 Q 380 80 470 78 Q 560 76 620 110 L 700 120 Q 760 124 790 150 L 830 176 Q 858 192 848 210 L 60 210 Z"
      fill={color}
    />
    <path
      d="M 300 118 Q 340 96 400 94 L 480 92 Q 540 94 600 112 L 480 116 L 300 118 Z"
      fill={COLORS.panel}
    />
    <path d="M 120 176 L 830 176 L 828 192 L 122 192 Z" fill={COLORS.red} />
    <circle cx="260" cy="216" r="46" fill={color} />
    <circle cx="260" cy="216" r="22" fill={COLORS.panel} />
    <circle cx="660" cy="216" r="46" fill={color} />
    <circle cx="660" cy="216" r="22" fill={COLORS.panel} />
    <path d="M 840 178 Q 850 172 848 164 L 846 160 L 840 162 Z" fill={COLORS.panel} />
  </svg>
);

// Flat-vector empty gym: rows of equipment receding into a dark space,
// one distant figure. The cold open of the Planet Fitness story.
const GymFallback: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 900 420" style={{ width: "100%", height: "100%", display: "block" }} aria-hidden>
    <rect x="0" y="0" width="900" height="420" fill={COLORS.bg} />
    {/* back wall */}
    <rect x="60" y="60" width="780" height="300" rx="8" fill={COLORS.panel} />
    {/* ceiling lights */}
    <rect x="110" y="86" width="160" height="10" rx="5" fill={COLORS.dot} />
    <rect x="370" y="86" width="160" height="10" rx="5" fill={COLORS.dot} />
    <rect x="630" y="86" width="160" height="10" rx="5" fill={COLORS.dot} />
    {/* mirror line */}
    <rect x="80" y="200" width="740" height="8" rx="4" fill={COLORS.dot} />
    {/* treadmills */}
    {[0, 1, 2, 3].map((i) => {
      const x = 110 + i * 180;
      return (
        <g key={i}>
          <rect x={x} y={260} width="120" height="40" rx="6" fill={color} opacity={0.82 - i * 0.1} />
          <rect x={x + 14} y={268} width="92" height="8" rx="4" fill={COLORS.dot} />
          <rect x={x + 40} y="220" width="40" height="46" rx="6" fill={color} opacity={0.82 - i * 0.1} />
        </g>
      );
    })}
    {/* distant figure on the far treadmill */}
    <circle cx="185" cy="228" r="9" fill={color} opacity="0.6" />
    {/* floor line */}
    <rect x="60" y="360" width="780" height="4" rx="2" fill={COLORS.dot} />
  </svg>
);

const ObjectFallback: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 600 600" style={{ width: "100%", height: "100%", display: "block" }} aria-hidden>
    <rect x="120" y="120" width="360" height="360" rx="40" fill={color} />
    <rect x="180" y="180" width="240" height="240" rx="20" fill={COLORS.panel} />
  </svg>
);

export const SubjectArtwork: React.FC<SubjectArtworkProps> = ({ asset, width, color, style }) => {
  const record = resolveAsset(asset);
  const [failed, setFailed] = useState(false);
  const fallbackColor = color ?? COLORS.textPrimary;

  if (record && !failed) {
    const height = (width * record.height) / record.width;
    return (
      <Img
        src={`/${record.path}`}
        onError={() => setFailed(true)}
        style={{
          width,
          height: record.transparent ? height : undefined,
          maxHeight: "100%",
          objectFit: record.transparent ? "contain" : "cover",
          borderRadius: record.transparent ? undefined : 12,
          ...style,
        }}
      />
    );
  }

  const kind = record?.kind ?? "object";
  const aspect = kind === "vehicle" ? 3 : record ? record.width / record.height : 1;
  const height = width / aspect;

  return (
    <div style={{ width, height, ...style }}>
      {kind === "vehicle" ? (
        <VehicleFallback color={fallbackColor} />
      ) : asset === "subjects/empty-gym" ? (
        <GymFallback color={fallbackColor} />
      ) : (
        <ObjectFallback color={fallbackColor} />
      )}
    </div>
  );
};