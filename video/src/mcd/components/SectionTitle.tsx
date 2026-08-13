import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { springProgress } from "../utils/animation";
import { AnimatedText } from "./AnimatedText";
import { COLORS, FONT, WEIGHT } from "../theme";
import type { StoryLine } from "../data/storyTypes";

type Props = {
  kicker: string;
  lines: StoryLine[];
  delay?: number;
  align?: "left" | "center";
  kickerColor?: string;
  style?: React.CSSProperties;
};

// Editorial section header: small red kicker + red rule, then the title.
export const SectionTitle: React.FC<Props> = ({
  kicker,
  lines,
  delay = 0,
  align = "left",
  kickerColor = COLORS.red,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rule = springProgress(frame, fps, { delay, durationInFrames: 26, damping: 20 });
  const x = align === "center" ? 0 : 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        gap: 18,
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          transform: `translateX(${-12 + 12 * Math.min(1, rule)}px)`,
          opacity: Math.max(0, Math.min(1, rule)),
        }}
      >
        <div
          style={{
            width: 46,
            height: 5,
            borderRadius: 3,
            background: kickerColor,
            transform: `scaleX(${rule})`,
            transformOrigin: "left center",
          }}
        />
        <span
          style={{
            fontFamily: FONT.headline,
            fontWeight: WEIGHT.bold,
            fontSize: 30,
            letterSpacing: "0.32em",
            color: COLORS.textSecondary,
          }}
        >
          {kicker}
        </span>
      </div>
      <AnimatedText
        lines={lines}
        delay={delay + 8}
        lineStagger={9}
        wordStagger={2}
        align={align}
        style={{ fontSize: 88, lineHeight: 1.06, ...(x ? {} : {}) }}
      />
    </div>
  );
};