import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE_ARRIVE } from "../utils/easing";
import { progressive, useSceneInOut } from "../utils/animation";
import { Camera2D } from "../components/Camera2D";
import { useDirector } from "../data/director";
import { AnimatedText } from "../components/AnimatedText";
import { Backdrop } from "../components/Backdrop";
import { useScene } from "../StoryContext";
import { COLORS, FONT, WEIGHT } from "../theme";

// Generic chapter card: kicker + headline in the center. A story stages one
// to split a longer piece into numbered parts — the same language as the
// scene kickers, at the scale of a full scene.

export const TitleCard: React.FC = () => {
  const { data, durationInFrames, at } = useScene("title");
  const frame = useCurrentFrame();
  const { opacity, scale } = useSceneInOut(frame, durationInFrames, {
    fadeIn: 8,
    entranceScale: 1.03,
  });

  const CAMERA = useDirector().keyframes;

  const kickerP = progressive(frame, at(0.1), at(0.25) - at(0.1), EASE_ARRIVE);
  const ruleP = progressive(frame, at(0.18), at(0.3) - at(0.18));

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      <Backdrop scene="title" />
      <Camera2D keyframes={CAMERA}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 34,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: kickerP,
              transform: `translateX(${(1 - kickerP) * -14}px)`,
            }}
          >
            <div
              style={{
                width: 42,
                height: 5,
                borderRadius: 3,
                background: COLORS.red,
                transform: `scaleX(${kickerP})`,
                transformOrigin: "left center",
              }}
            />
            <span
              style={{
                fontFamily: FONT.headline,
                fontWeight: WEIGHT.bold,
                fontSize: 26,
                letterSpacing: "0.34em",
                color: COLORS.textSecondary,
              }}
            >
              {data.kicker}
            </span>
          </div>

          <AnimatedText
            lines={data.lines}
            delay={at(0.2)}
            lineStagger={9}
            wordStagger={3}
            align="center"
            style={{
              fontSize: 96,
              lineHeight: 1.14,
              letterSpacing: "-0.01em",
              textAlign: "center",
            }}
          />

          <svg width="520" height="40" viewBox="0 0 520 40" style={{ opacity: ruleP }}>
            <line
              x1="0"
              y1="20"
              x2="520"
              y2="20"
              stroke={COLORS.gold}
              strokeWidth="6"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray={1}
              strokeDashoffset={1 - ruleP}
            />
          </svg>
        </div>
      </Camera2D>
    </AbsoluteFill>
  );
};
