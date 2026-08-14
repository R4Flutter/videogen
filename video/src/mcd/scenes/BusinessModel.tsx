import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_ARRIVE } from "../utils/easing";
import {
  progressive,
  springProgress,
  useSceneInOut,
} from "../utils/animation";
import { Camera2D } from "../components/Camera2D";
import { useDirector } from "../data/director";
import { MoneyFlow, type MoneyStream } from "../components/MoneyFlow";
import { FlowArrow } from "../components/FlowArrow";
import { NodeIcon } from "../components/NodeIcon";
import { Backdrop } from "../components/Backdrop";
import { useScene } from "../StoryContext";
import { COLORS, FONT, WEIGHT, withAlpha } from "../theme";

const CARD_X = 560;
const CARD_W = 800;
const CARD_H = 132;
const CARD_Y = [150, 358, 566, 774];

// Portrait: full-width cards stacked down the tall canvas, payoff at bottom.
const CARD_X_P = 90;
const CARD_W_P = 900;
const CARD_H_P = 128;
const CARD_Y_P = [340, 560, 780, 1000];

export const BusinessModel: React.FC = () => {
  const { data, durationInFrames, at } = useScene("model");
  const BUSINESS_MODEL = data;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const { opacity, scale } = useSceneInOut(frame, durationInFrames);

  const cx = portrait ? CARD_X_P + CARD_W_P / 2 : 960;
  const cy = portrait ? CARD_Y_P : CARD_Y;
  const cardX = portrait ? CARD_X_P : CARD_X;
  const cardW = portrait ? CARD_W_P : CARD_W;
  const cardH = portrait ? CARD_H_P : CARD_H;

  const { keyframes: CAMERA, keyframesPortrait: CAMERA_P } = useDirector();

  const kickerP = progressive(frame, at(0.033), at(0.095) - at(0.033), EASE_ARRIVE);

  // Arrow windows (money flows top → down after the nodes settle).
  const ARROWS = [at(0.267), at(0.514), at(0.767)];

  const payoff = springProgress(frame, fps, { delay: at(0.776), damping: 13, stiffness: 150 });

  const streams = ARROWS.map(
    (a, i): MoneyStream => ({
      from: { x: cx, y: cy[i] + cardH + 4 },
      to: { x: cx, y: cy[i + 1] - 4 },
      offset: a + at(0.067),
      travel: at(0.286),
    }),
  );

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      <Backdrop scene="model" />
      <Camera2D keyframes={portrait ? CAMERA_P : CAMERA}>
        {/* Kicker */}
        <div
          style={
            portrait
              ? {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 180,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                  opacity: kickerP,
                  transform: `translateX(${(1 - kickerP) * -16}px)`,
                }
              : {
                  position: "absolute",
                  left: 84,
                  top: 84,
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  opacity: kickerP,
                  transform: `translateX(${(1 - kickerP) * -16}px)`,
                }
          }
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
            delay: at(0.086 + i * 0.076),
            durationInFrames: at(0.129),
            damping: 15,
            stiffness: 160,
          });
          const y = cy[i];
          return (
            <div
              key={node.title}
              style={{
                position: "absolute",
                left: cardX,
                top: y,
                width: cardW,
                height: cardH,
                background: COLORS.panel,
                border: `1px solid ${COLORS.line}`,
                borderRadius: 22,
                display: "flex",
                alignItems: "center",
                gap: portrait ? 28 : 34,
                padding: portrait ? "0 30px" : "0 38px",
                opacity: Math.min(1, p * 1.7),
                transform: `translateY(${(1 - p) * 60}px) scale(${0.92 + 0.08 * Math.min(1, p)})`,
                boxShadow: "0 30px 60px rgba(0,0,0,0.35)",
              }}
            >
              <div
                style={{
                  width: portrait ? 84 : 96,
                  height: portrait ? 84 : 96,
                  borderRadius: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: withAlpha(COLORS.textPrimary, 0.03),
                  boxShadow: `inset 0 0 0 1px ${withAlpha(COLORS.textPrimary, 0.06)}`,
                }}
              >
                {<NodeIcon role={node.role} size={portrait ? 66 : 76} />}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span
                  style={{
                    fontFamily: FONT.headline,
                    fontWeight: WEIGHT.black,
                    fontSize: portrait ? 40 : 42,
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
                    fontSize: portrait ? 21 : 22,
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
          width={portrait ? 1080 : 1920}
          height={portrait ? 1920 : 1080}
          viewBox={portrait ? "0 0 1080 1920" : "0 0 1920 1080"}
          style={{ position: "absolute", inset: 0 }}
        >
          {ARROWS.map((a, i) => {
            const fromY = cy[i] + cardH;
            const toY = cy[i + 1];
            const fade = progressive(frame, a + at(0.143), at(0.076));
            return (
              <g key={a}>
                <FlowArrow
                  from={{ x: cx, y: fromY + 18 }}
                  to={{ x: cx, y: toY - 18 }}
                  color={COLORS.gold}
                  strokeWidth={portrait ? 5 : 5}
                  duration={at(0.162)}
                  delay={a}
                  springy
                  glow={6}
                  headSize={portrait ? 18 : 20}
                />
                <foreignObject x={portrait ? cx + 60 : 1010} y={fromY + 12} width={portrait ? 380 : 700} height={60}>
                  <div
                    style={{
                      fontFamily: FONT.headline,
                      fontWeight: WEIGHT.bold,
                      fontSize: portrait ? 22 : 24,
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
          <MoneyFlow streams={streams} perStream={6} startFrame={0} travel={at(0.286)} particleRadius={[4, 8]} markerEvery={3} />
        </svg>

        {/* Payoff: money reaches the brand */}
        <div
          style={
            portrait
              ? {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 1330,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  opacity: Math.min(1, payoff),
                  transform: `scale(${0.8 + payoff * 0.24})`,
                }
              : {
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
                }
          }
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
              fontSize: portrait ? 100 : 120,
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
