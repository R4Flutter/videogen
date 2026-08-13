import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { spring } from "remotion";
import { COLORS } from "../theme";

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

// A bar that grows to `value` with spring settle (subtle overshoot).
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
        ...style,
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: radius,
          background: color,
          transform: `scale${reverse ? "Y" : "X"}(${scale})`,
          transformOrigin: reverse ? "center bottom" : "left center",
        }}
      />
    </div>
  );
};