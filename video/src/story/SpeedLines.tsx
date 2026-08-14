// Speed-line effect: the classic "fast thing" language. Density + stretch
// follow the subject's velocity (0..1), so lines scream during the entrance
// and melt away as it settles — motion conveyed by the same curve that moves
// the object, never on its own timer. All geometry is container-relative
// (percentages), so the effect works at any size.

import React, { useMemo } from "react";

export type SpeedLinesProps = {
  // 0..1 — the subject's current velocity; drives opacity and stretch.
  velocity: number;
  color?: string;
  count?: number;
  // Renders only lines that pass through the middle band (a horizontal
  // smear for sideways motion) when true.
  horizontal?: boolean;
};

const seeded = (seed: number) => {
  let s = seed;
  return (): number => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

export const SpeedLines: React.FC<SpeedLinesProps> = ({
  velocity,
  color = "#1A1A1A",
  count = 14,
  horizontal = true,
}) => {
  const lines = useMemo(() => {
    const rand = seeded(7);
    const out: Array<{
      top: number;
      width: number;
      left: number;
      opacity: number;
    }> = [];
    for (let i = 0; i < count; i++) {
      out.push({
        // Cluster lines near the vertical center so the smear reads as
        // belonging to the subject; a few far ones suggest distance.
        top: 22 + rand() * 56,
        width: 14 + rand() * 34,
        left: -5 + rand() * 10,
        opacity: 0.25 + rand() * 0.55,
      });
    }
    return out;
  }, [count]);

  if (velocity <= 0.015) return null;

  const stretch = 1 + velocity * 2.2;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${l.left}%`,
            top: `${l.top}%`,
            width: `${l.width * stretch}%`,
            height: Math.max(2, l.width * 0.06),
            borderRadius: 2,
            background: color,
            opacity: l.opacity * velocity,
            transform: horizontal ? undefined : "rotate(90deg)",
            transformOrigin: "center",
          }}
        />
      ))}
    </div>
  );
};