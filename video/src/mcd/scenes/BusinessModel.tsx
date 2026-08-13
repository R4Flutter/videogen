import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_ARRIVE } from "../utils/easing";
import {
  progressive,
  springProgress,
  useSceneInOut,
} from "../utils/animation";
import { Camera2D, type CameraKeyframe } from "../components/Camera2D";
import { MoneyFlow, type MoneyStream } from "../components/MoneyFlow";
import { FlowArrow } from "../components/FlowArrow";
import { NodeIcon } from "../components/NodeIcon";
import { ABSOLUTE, SCENE_FRAMES } from "../data/story";
import { useStory } from "../StoryContext";
import { cueAt } from "../utils/audio";
import { COLORS, FONT, WEIGHT, withAlpha } from "../theme";

const CAMERA: CameraKeyframe[] = [
  { frame: 0, camera: { x: 960, y: 540, scale: 1.06 }, easing: EASE_ARRIVE },
  { frame: 48, camera: { x: 960, y: 540, scale: 1 }, easing: EASE_ARRIVE },
  { frame: 310, camera: { x: 960, y: 540, scale: 1 } },
];

const CARD_X = 560;
const CARD_W = 800;
const CARD_H = 132;
const CARD_Y = [150, 358, 566, 774];

export const BusinessModel: React.FC = () => {
  const story = useStory();
  const BUSINESS_MODEL = story.businessModel;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { opacity, scale } = useSceneInOut(frame, SCENE_FRAMES.model);

  cueAt("model", "whoosh", ABSOLUTE.modelStart);
  cueAt("model", "impact", ABSOLUTE.modelStart + 252);

  const kickerP = progressive(frame, 12, 22, EASE_ARRIVE);

  // Arrow windows (money flows top → down after the nodes settle).
  const ARROWS = [92, 178, 264];

  const payoff = springProgress(frame, fps, { delay: 268, damping: 13, stiffness: 150 });

  const streams = ARROWS.map(
    (a, i): MoneyStream => ({
      from: { x: 960, y: CARD_Y[i] + CARD_H + 4 },
      to: { x: 960, y: CARD_Y[i + 1] - 4 },
      offset: a + 14,
      travel: 60,
    }),
  );

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      <Camera2D keyframes={CAMERA}>
        {/* Kicker */}
        <div
          style={{
            position: "absolute",
            left: 84,
            top: 84,
            display: "flex",
            alignItems: "center",
            gap: 14,
            opacity: kickerP,
            transform: `translateX(${(1 - kickerP) * -16}px)`,
          }}
        >
          <div style={{ width: 42, height: 5, borderRadius: 3, background: COLORS.red }} />
          <span
            style={{
              fontFamily: FONT.headline,
              fontWeight: WEIGHT.bold,
              fontSize: 26,
              letterSpacing: "0.34em",
              color: COLORS.textSecondary,
            }}
          >
            {BUSINESS_MODEL.kicker}
          </span>
        </div>

        {/* Nodes: cards pop in top → bottom */}
        {BUSINESS_MODEL.nodes.map((node, i) => {
          const p = springProgress(frame, fps, {
            delay: 30 + i * 26,
            durationInFrames: 44,
            damping: 15,
            stiffness: 160,
          });
          const y = CARD_Y[i];
          return (
            <div
              key={node.title}
              style={{
                position: "absolute",
                left: CARD_X,
                top: y,
                width: CARD_W,
                height: CARD_H,
                background: COLORS.panel,
                border: `1px solid ${COLORS.line}`,
                borderRadius: 22,
                display: "flex",
                alignItems: "center",
                gap: 34,
                padding: "0 38px",
                opacity: Math.min(1, p * 1.7),
                transform: `translateY(${(1 - p) * 60}px) scale(${0.92 + 0.08 * Math.min(1, p)})`,
                boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
              }}
            >
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                {<NodeIcon role={node.role} size={76} />}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span
                  style={{
                    fontFamily: FONT.headline,
                    fontWeight: WEIGHT.black,
                    fontSize: 42,
                    letterSpacing: "0.02em",
                    color: i === 3 ? COLORS.gold : COLORS.textPrimary,
                  }}
                >
                  {node.title}
                </span>
                <span
                  style={{
                    fontFamily: FONT.body,
                    fontWeight: WEIGHT.medium,
                    fontSize: 22,
                    letterSpacing: "0.22em",
                    color: COLORS.textSecondary,
                  }}
                >
                  {node.sub}
                </span>
              </div>
            </div>
          );
        })}

        {/* Flow arrows + notes + money (one SVG world) */}
        <svg
          width="1920"
          height="1080"
          viewBox="0 0 1920 1080"
          style={{ position: "absolute", inset: 0 }}
        >
          {ARROWS.map((a, i) => {
            const fromY = CARD_Y[i] + CARD_H;
            const toY = CARD_Y[i + 1];
            const fade = progressive(frame, a + 30, 16);
            return (
              <g key={a}>
                <FlowArrow
                  from={{ x: 960, y: fromY + 18 }}
                  to={{ x: 960, y: toY - 18 }}
                  color={COLORS.gold}
                  strokeWidth={5}
                  duration={34}
                  delay={a}
                  springy
                  glow={6}
                  headSize={20}
                />
                <foreignObject x={1010} y={fromY + 12} width={700} height={60}>
                  <div
                    style={{
                      fontFamily: FONT.headline,
                      fontWeight: WEIGHT.bold,
                      fontSize: 24,
                      letterSpacing: "0.26em",
                      color: COLORS.textSecondary,
                      opacity: fade,
                      transform: `translateY(${(1 - fade) * 10}px)`,
                    }}
                  >
                    {BUSINESS_MODEL.flowNotes[i]}
                  </div>
                </foreignObject>
              </g>
            );
          })}

          {/* Money flowing down the chain */}
          <MoneyFlow streams={streams} perStream={6} startFrame={0} travel={60} particleRadius={[4, 8]} markerEvery={3} />
        </svg>

        {/* Payoff: money reaches McDonald's */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 940,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            opacity: Math.min(1, payoff),
            transform: `scale(${0.8 + payoff * 0.24})`,
          }}
        >
          <span
            style={{
              fontFamily: FONT.headline,
              fontWeight: WEIGHT.bold,
              fontSize: 24,
              letterSpacing: "0.4em",
              color: COLORS.textSecondary,
            }}
          >
            {BUSINESS_MODEL.payoffOverline}
          </span>
          <span
            style={{
              fontFamily: FONT.headline,
              fontWeight: WEIGHT.black,
              fontSize: 120,
              lineHeight: 1,
              letterSpacing: "-0.01em",
              color: COLORS.gold,
              textShadow: `0 0 60px ${withAlpha(COLORS.gold, 0.35)}`,
            }}
          >
            {BUSINESS_MODEL.payoffValue}
          </span>
          <span
            style={{
              fontFamily: FONT.body,
              fontWeight: WEIGHT.medium,
              fontSize: 20,
              letterSpacing: "0.3em",
              color: COLORS.muted,
            }}
          >
            {BUSINESS_MODEL.payoffNote}
          </span>
        </div>
      </Camera2D>
    </AbsoluteFill>
  );
};