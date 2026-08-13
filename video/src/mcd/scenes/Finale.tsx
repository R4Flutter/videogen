import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_ARRIVE } from "../utils/easing";
import {
  progressive,
  springProgress,
  useSceneInOut,
} from "../utils/animation";
import { Camera2D, type CameraKeyframe } from "../components/Camera2D";
import { AnimatedText } from "../components/AnimatedText";
import { AnimatedPath } from "../components/AnimatedPath";
import { CountUp } from "../components/CountUp";
import { NodeIcon } from "../components/NodeIcon";
import { WorldMap } from "../components/WorldMap";
import { MoneyFlow } from "../components/MoneyFlow";
import { FlowArrow } from "../components/FlowArrow";
import { SCENE_FRAMES, ABSOLUTE } from "../data/story";
import { useStory } from "../StoryContext";
import { cueAt } from "../utils/audio";
import { formatCompactMoney } from "../utils/format";
import { COLORS, FONT, WEIGHT, withAlpha } from "../theme";
import type { RegionId, StoryLine } from "../data/storyTypes";

const CAMERA: CameraKeyframe[] = [
  { frame: 0, camera: { x: 1500, y: 572, scale: 1.38 }, easing: EASE_ARRIVE },
  { frame: 100, camera: { x: 960, y: 540, scale: 1.04 }, easing: EASE_ARRIVE },
  { frame: 300, camera: { x: 960, y: 540, scale: 1.02 } },
  { frame: 372, camera: { x: 960, y: 540, scale: 0.9 }, easing: EASE_ARRIVE },
];

const WALL_FADE_OUT = 226;
const WALL_FADE_DUR = 26;

// Mini business-model chain geometry (screen coords).
const CHAIN = { x: 1330, y: 640, cardW: 250, cardH: 62, step: 96 };

export const Finale: React.FC = () => {
  const story = useStory();
  const FINALE = story.finale;
  const REVENUE = story.revenue;
  const REGIONS = story.map.regionOrder as RegionId[];
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { opacity, scale } = useSceneInOut(frame, SCENE_FRAMES.finale, {
    fadeIn: 8,
    entranceScale: 1.03,
  });

  cueAt("finale", "whoosh", ABSOLUTE.finaleStart + 30);
  cueAt("finale", "transition", ABSOLUTE.finaleStart + WALL_FADE_OUT);
  cueAt("finale", "impact", ABSOLUTE.finaleStart + 258);
  cueAt("finale", "impact", ABSOLUTE.finaleStart + 324);

  const wallP = progressive(frame, 0, 40, EASE_ARRIVE);
  const wallOut = progressive(frame, WALL_FADE_OUT, WALL_FADE_DUR);
  const wallOpacity = Math.min(wallP * 2, 1) * (1 - wallOut);

  const mapP = progressive(frame, 14, 44);
  const revenueP = springProgress(frame, fps, { delay: 22, damping: 14, stiffness: 150 });
  const iconsP = progressive(frame, 30, 40);
  const chainP = progressive(frame, 38, 44);

  const footerP = progressive(frame, 336, 30);

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      <Camera2D keyframes={CAMERA}>
        <div style={{ position: "absolute", inset: 0, opacity: wallOpacity }}>
          {/* Mini world map */}
          <div style={{ position: "absolute", left: 96, top: 130, opacity: mapP }}>
            <div
              style={{
                width: 1920,
                height: 1080,
                transform: "scale(0.36)",
                transformOrigin: "top left",
                overflow: "hidden",
              }}
            >
              <WorldMap
                regionProgress={
                  Object.fromEntries(REGIONS.map((r) => [r, 1])) as Partial<Record<RegionId, number>>
                }
                arcProgress={[1, 1, 1, 1, 1]}
              />
            </div>
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 402,
                fontFamily: FONT.headline,
                fontWeight: WEIGHT.bold,
                fontSize: 24,
                letterSpacing: "0.32em",
                color: COLORS.textSecondary,
              }}
            >
              {FINALE.montage.mapLabel}
            </span>
          </div>

          {/* Revenue */}
          <div
            style={{
              position: "absolute",
              left: 1040,
              top: 160,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              opacity: Math.min(1, revenueP * 1.8),
              transform: `scale(${0.9 + 0.1 * Math.min(1, revenueP)})`,
            }}
          >
            <span
              style={{
                fontFamily: FONT.headline,
                fontWeight: WEIGHT.bold,
                fontSize: 24,
                letterSpacing: "0.36em",
                color: COLORS.textSecondary,
              }}
            >
              {FINALE.montage.revenueLabel} · ILLUSTRATIVE
            </span>
            <span
              style={{
                display: "flex",
                alignItems: "baseline",
                fontFamily: FONT.headline,
                fontWeight: WEIGHT.black,
                fontSize: 146,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: COLORS.gold,
              }}
            >
              <CountUp
                value={REVENUE.steps[REVENUE.steps.length - 1].value}
                steps={REVENUE.steps.map((s) => ({ value: s.value, frame: s.frame * 0.5 + 16 }))}
                format={formatCompactMoney}
              />
              <span style={{ fontSize: 82 }}>+</span>
            </span>
          </div>

          {/* Restaurant strip */}
          <div
            style={{
              position: "absolute",
              left: 96,
              top: 780,
              display: "flex",
              alignItems: "center",
              gap: 26,
              opacity: iconsP,
            }}
          >
            {story.businessModel.nodes.slice(0, 10).map((node, i) => {
              const p = springProgress(frame, fps, {
                delay: 34 + i * 3,
                damping: 15,
                stiffness: 170,
              });
              return (
                <div
                  key={node.title}
                  style={{
                    opacity: Math.min(1, p * 1.9),
                    transform: `translateY(${(1 - Math.min(1, p)) * 30}px) scale(${0.8 + 0.2 * Math.min(1, p)})`,
                  }}
                >
                  <NodeIcon role={node.role} size={72} />
                </div>
              );
            })}
            <span
              style={{
                marginLeft: 18,
                fontFamily: FONT.headline,
                fontWeight: WEIGHT.bold,
                fontSize: 24,
                letterSpacing: "0.32em",
                color: COLORS.textSecondary,
              }}
            >
              {FINALE.montage.networkLabel}
            </span>
          </div>

          {/* Mini business-model chain */}
          <div style={{ position: "absolute", left: CHAIN.x, top: CHAIN.y, opacity: chainP }}>
            {story.businessModel.nodes.slice(0, 4).map((node, i) => {
              const p = springProgress(frame, fps, {
                delay: 42 + i * 8,
                damping: 15,
                stiffness: 200,
              });
              return (
                <div
                  key={node.title}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: i * CHAIN.step,
                    width: CHAIN.cardW,
                    height: CHAIN.cardH,
                    borderRadius: 14,
                    background: COLORS.panel,
                    border: `1px solid ${COLORS.line}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT.headline,
                    fontWeight: WEIGHT.bold,
                    fontSize: 23,
                    letterSpacing: "0.14em",
                    color: i === 3 ? COLORS.gold : COLORS.textPrimary,
                    opacity: Math.min(1, p * 2),
                    transform: `scale(${0.85 + 0.15 * Math.min(1, p)})`,
                  }}
                >
                  {node.title}
                </div>
              );
            })}
            <span
              style={{
                position: "absolute",
                left: 0,
                top: 4 * CHAIN.step + 6,
                fontFamily: FONT.headline,
                fontWeight: WEIGHT.bold,
                fontSize: 22,
                letterSpacing: "0.3em",
                color: COLORS.textSecondary,
              }}
            >
              {FINALE.montage.businessLabel}
            </span>
          </div>

          {/* Connectors + chain arrows + chain particles (one SVG world) */}
          <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
            <AnimatedPath d="M 700 520 L 1080 330" color="rgba(255,255,255,0.28)" strokeWidth={2} delay={60} duration={40} />
            <AnimatedPath d="M 620 820 L 1180 380" color={withAlpha(COLORS.gold, 0.38)} strokeWidth={2} delay={90} duration={40} />
            <AnimatedPath d="M 1330 600 L 1200 400" color="rgba(255,255,255,0.28)" strokeWidth={2} delay={120} duration={40} />
            <FlowArrow
              from={{ x: CHAIN.x + CHAIN.cardW / 2, y: CHAIN.y + CHAIN.cardH }}
              to={{ x: CHAIN.x + CHAIN.cardW / 2, y: CHAIN.y + CHAIN.step - 14 }}
              color={COLORS.gold}
              strokeWidth={3}
              duration={26}
              delay={96}
              headSize={12}
            />
            <FlowArrow
              from={{ x: CHAIN.x + CHAIN.cardW / 2, y: CHAIN.y + CHAIN.step + CHAIN.cardH }}
              to={{ x: CHAIN.x + CHAIN.cardW / 2, y: CHAIN.y + 2 * CHAIN.step - 14 }}
              color={COLORS.gold}
              strokeWidth={3}
              duration={26}
              delay={106}
              headSize={12}
            />
            <FlowArrow
              from={{ x: CHAIN.x + CHAIN.cardW / 2, y: CHAIN.y + 2 * CHAIN.step + CHAIN.cardH }}
              to={{ x: CHAIN.x + CHAIN.cardW / 2, y: CHAIN.y + 3 * CHAIN.step - 14 }}
              color={COLORS.gold}
              strokeWidth={3}
              duration={26}
              delay={116}
              headSize={12}
            />
            <MoneyFlow
              streams={[
                {
                  from: { x: CHAIN.x + CHAIN.cardW / 2, y: CHAIN.y + CHAIN.cardH + 6 },
                  to: { x: CHAIN.x + CHAIN.cardW / 2, y: CHAIN.y + 3 * CHAIN.step - 6 },
                  offset: 120,
                  travel: 55,
                },
              ]}
              perStream={7}
              startFrame={0}
              travel={55}
              particleRadius={[4, 7]}
              markerEvery={4}
            />
          </svg>
        </div>
      </Camera2D>

      {/* ——— Final statement ———————————————————————————————————— */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
        }}
      >
        <AnimatedText
          lines={[{ text: FINALE.line1.kicker, accent: true }] as StoryLine}
          delay={248}
          variant="fade"
          style={{
            fontSize: 22,
            letterSpacing: "0.5em",
            color: COLORS.red,
            marginBottom: 42,
            fontWeight: 600,
          }}
        />
        <AnimatedText
          lines={FINALE.line1.lines}
          delay={258}
          lineStagger={12}
          wordStagger={3}
          style={{ fontSize: 94, lineHeight: 1.14, letterSpacing: "-0.01em" }}
        />
        <div style={{ height: 56 }} />
        <AnimatedText
          lines={FINALE.line2.lines}
          delay={322}
          wordStagger={2}
          style={{ fontSize: 148, lineHeight: 1, letterSpacing: "-0.02em" }}
        />
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 52,
          textAlign: "center",
          fontFamily: FONT.body,
          fontWeight: WEIGHT.regular,
          fontSize: 17,
          letterSpacing: "0.3em",
          color: COLORS.muted,
          opacity: footerP,
        }}
      >
        {FINALE.footer}
      </div>
    </AbsoluteFill>
  );
};