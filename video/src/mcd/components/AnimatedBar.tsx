import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { spring } from "remotion";
import { COLORS, withAlpha } from "../theme";

type Props = {
  value: number; // 0..1 target
  delay?: number;
  duration?: number;
  color?: string;
  fillColor?: string;
  height?: number;
  radius?: number;
  reverse?: boolean;
  style?: React.CSSProperties;
};

// A bar that grows to `value` with spring settle (subtle overshoot), filled
// with a vertical sheen + top highlight so the paper palette reads as printed
// ink rather than flat UI.
export const AnimatedBar: React.FC<Props> = ({
  value,
  delay = 0,
  duration = 60,
  color = COLORS.gold,
  fillColor = COLORS.panel,
  height = 24,
  radius = height / 2,
  reverse = false,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({
    frame,
    fps,
    delay,
    durationInFrames: duration,
    config: { damping: 15, stiffness: 110, mass: 0.9 },
  });
  const scale = Math.min(1.08, p) * value;
  return (
    <div
      style={{
        height,
        borderRadius: radius,
        background: fillColor,
        overflow: "hidden",
        boxShadow: `inset 0 0 0 1px ${withAlpha(COLORS.textPrimary, 0.08)}`,
        ...style,
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: radius,
          background: `linear-gradient(180deg, ${withAlpha("#FFFFFF", 0.3)} 0%, ${withAlpha("#FFFFFF", 0.04)} 42%, ${color} 100%)`,
          transform: `scale${reverse ? "Y" : "X"}(${scale})`,
          transformOrigin: reverse ? "center bottom" : "left center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 2,
            left: 4,
            right: 4,
            height: Math.max(2, height * 0.13),
            borderRadius: radius,
            background: withAlpha("#FFFFFF", 0.45),
          }}
        />
      </div>
    </div>
  );
};