import React, { useMemo } from "react";
import { angleBetween, linePath, polarPoint, type Pt } from "../utils/geometry";
import { AnimatedPath } from "./AnimatedPath";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { progressive, springProgress } from "../utils/animation";
import { COLORS } from "../theme";

type Props = {
  from: Pt;
  to: Pt;
  color?: string;
  strokeWidth?: number;
  duration?: number;
  delay?: number;
  headSize?: number;
  glow?: number;
  springy?: boolean;
  style?: React.CSSProperties;
};

// A straight arrow: line draws in, head pops at the end.
export const FlowArrow: React.FC<Props> = ({
  from,
  to,
  color = COLORS.gold,
  strokeWidth = 4,
  duration = 40,
  delay = 0,
  headSize = 16,
  glow = 0,
  springy = false,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = useMemo(() => {
    const ang = angleBetween(from, to);
    const back = polarPoint(to, ang + 180, headSize * 0.95);
    const p1 = polarPoint(back, ang - 90, headSize * 0.5);
    const p2 = polarPoint(back, ang + 90, headSize * 0.5);
    return { p1, p2, ang };
  }, [from, to, headSize]);

  const headP = springy
    ? springProgress(frame, fps, { delay: delay + duration * 0.75, durationInFrames: Math.max(4, duration * 0.3) })
    : progressive(frame, delay + duration * 0.75, Math.max(4, duration * 0.3));

  return (
    <g style={style}>
      <AnimatedPath
        d={linePath(from, to)}
        color={color}
        strokeWidth={strokeWidth}
        duration={duration}
        delay={delay}
        glow={glow}
        springy={springy}
      />
      <polygon
        points={`${to.x},${to.y} ${head.p1.x},${head.p1.y} ${head.p2.x},${head.p2.y}`}
        fill={color}
        opacity={Math.max(0, Math.min(1, headP * 2.5))}
        style={glow > 0 ? { filter: `blur(${glow}px)` } : undefined}
      />
    </g>
  );
};