import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { EASE_IN_OUT } from "../utils/easing";
import { clamp01 } from "../utils/animation";

export type CountStep = { value: number; frame: number };

type Props = {
  // Final value when `steps` is absent.
  value: number;
  steps?: CountStep[];
  delay?: number;
  duration?: number;
  format?: (v: number) => string;
  style?: React.CSSProperties;
};

// An animated number counter.
// * steps   -> jumps between milestones with eased acceleration/deceleration
// * no steps-> runs 0 → value once
export const CountUp: React.FC<Props> = ({
  value,
  steps,
  delay = 0,
  duration = 48,
  format = (v) => String(Math.round(v)),
  style,
}) => {
  const frame = useCurrentFrame();
  const display = useMemo(() => {
    if (steps && steps.length >= 2) {
      if (frame <= steps[0].frame) return steps[0].value;
      for (let i = 0; i < steps.length - 1; i++) {
        const a = steps[i];
        const b = steps[i + 1];
        if (frame <= b.frame) {
          return interpolate(frame, [a.frame, b.frame], [a.value, b.value], {
            easing: EASE_IN_OUT,
          });
        }
      }
      return steps[steps.length - 1].value;
    }
    const p = clamp01(
      interpolate(frame, [delay, delay + duration], [0, 1], { easing: EASE_IN_OUT }),
    );
    return value * p;
  }, [frame, value, steps, delay, duration]);

  return (
    <div
      style={{
        fontVariantNumeric: "tabular-nums",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {format(display)}
    </div>
  );
};