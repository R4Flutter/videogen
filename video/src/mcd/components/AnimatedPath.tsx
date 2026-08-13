import React, { useId } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { progressive, springProgress } from "../utils/animation";
import { COLORS } from "../theme";

type Props = {
  d: string;
  color?: string;
  strokeWidth?: number;
  duration?: number;
  delay?: number;
  opacity?: number;
  glow?: number;
  springy?: boolean;
  linecap?: "round" | "butt";
};

// Draws an SVG path in over `duration` frames using pathLength dash-offset.
// `springy` gives the line a fast draw + soft settle.
export const AnimatedPath: React.FC<Props> = ({
  d,
  color = COLORS.gold,
  strokeWidth = 3,
  duration = 48,
  delay = 0,
  opacity = 1,
  glow = 0,
  springy = false,
  linecap = "round",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const id = useId();
  const p = springy
    ? springProgress(frame, fps, { delay, durationInFrames: duration })
    : progressive(frame, delay, duration);
  const dash = Math.max(0, Math.min(1, p));
  const vis = Math.max(0, Math.min(1, p * 5));
  return (
    <g>
      {glow > 0 ? (
        <defs>
          <filter id={`plume-${id}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation={glow} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      ) : null}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap={linecap}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - dash}
        opacity={opacity * vis}
        style={glow > 0 ? { filter: `url(#plume-${id})` } : undefined}
      />
    </g>
  );
};