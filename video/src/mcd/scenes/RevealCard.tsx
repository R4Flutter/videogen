import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_ARRIVE } from "../utils/easing";
import { progressive, springProgress, useSceneInOut } from "../utils/animation";
import { Camera2D, type CameraKeyframe } from "../components/Camera2D";
import { AnimatedText } from "../components/AnimatedText";
import { Backdrop } from "../components/Backdrop";
import { useScene } from "../StoryContext";
import { COLORS, FONT, WEIGHT, withAlpha } from "../theme";

// Generic reveal card: a big value pops in with an impact spring, then the
// statement lands beneath it. For moments where one number IS the scene.

export const RevealCard: React.FC = () => {
  const { data, durationInFrames, at } = useScene("reveal");
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { opacity, scale } = useSceneInOut(frame, durationInFrames, {
    fadeIn: 8,
    entranceScale: 1.03,
  });

  const CAMERA: CameraKeyframe[] = [
    { frame: 0, camera: { x: 960, y: 540, scale: 1.08 }, easing: EASE_ARRIVE },
    { frame: at(0.4), camera: { x: 960, y: 540, scale: 1 }, easing: EASE_ARRIVE },
    { frame: at(0.95), camera: { x: 960, y: 540, scale: 1 } },
  ];

  const kickerP = progressive(frame, at(0.08), at(0.2) - at(0.08), EASE_ARRIVE);
  const valueP = springProgress(frame, fps, { delay: at(0.3), damping: 12, stiffness: 160 });
  const linesP = progressive(frame, at(0.55), at(0.75) - at(0.55), EASE_ARRIVE);

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      <Backdrop scene="reveal" />
      <Camera2D keyframes={CAMERA}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 28,
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

          {data.value ? (
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                opacity: Math.min(1, valueP * 1.4),
                transform: `scale(${0.7 + valueP * 0.3})`,
              }}
            >
              <span
                style={{
                  fontFamily: FONT.headline,
                  fontWeight: WEIGHT.black,
                  fontSize: 200,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  color: COLORS.gold,
                  textShadow: `0 0 70px ${withAlpha(COLORS.gold, 0.35)}`,
                }}
              >
                {data.value}
              </span>
              {data.suffix ? (
                <span
                  style={{
                    fontFamily: FONT.headline,
                    fontWeight: WEIGHT.black,
                    fontSize: 110,
                    lineHeight: 1,
                    color: COLORS.gold,
                  }}
                >
                  {data.suffix}
                </span>
              ) : null}
            </div>
          ) : null}

          <AnimatedText
            lines={data.lines}
            delay={at(0.6)}
            lineStagger={8}
            wordStagger={2}
            align="center"
            style={{
              fontSize: data.value ? 56 : 92,
              lineHeight: 1.16,
              letterSpacing: "-0.01em",
              textAlign: "center",
            }}
          />

          {data.note ? (
            <span
              style={{
                fontFamily: FONT.body,
                fontWeight: 400,
                fontSize: 18,
                letterSpacing: "0.28em",
                color: COLORS.muted,
                opacity: linesP,
              }}
            >
              {data.note}
            </span>
          ) : null}
        </div>
      </Camera2D>
    </AbsoluteFill>
  );
};
