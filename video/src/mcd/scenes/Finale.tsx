import React, { useMemo } from "react";
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
import { Backdrop } from "../components/Backdrop";
import { useScene, useStory } from "../StoryContext";
import { formatCompactMoney } from "../utils/format";
import { COLORS, FONT, WEIGHT, withAlpha } from "../theme";
import type { RegionId, StoryLine } from "../data/storyTypes";

const WALL_FADE_OUT = 0.605;
const WALL_FADE_DUR = 0.071;

// Mini business-model chain geometry (screen coords).
const CHAIN = { x: 1330, y: 640, cardW: 250, cardH: 62, step: 96 };

// Portrait chain — centered, stacked down the middle of the tall canvas.
const CHAIN_P = { x: 390, y: 1060, cardW: 300, cardH: 56, step: 76 };

export const Finale: React.FC = () => {
  const story = useStory();
  const { data, durationInFrames, at } = useScene("finale");
  const FINALE = data;
  // The montage re-stages pieces the story already told — the revenue steps
  // and the model chain — so the finale reads them from those scenes instead
  // of duplicating the data here.
  const moneyScene = story.scenes.find((s) => s.type === "money");
  const modelScene = story.scenes.find((s) => s.type === "model");
  const mapScene = story.scenes.find((s) => s.type === "map");
  const REVENUE_STEPS =
    moneyScene?.type === "money" ? moneyScene.data.steps : [{ value: 0, at: 0 }];
  const MODEL_NODES = modelScene?.type === "model" ? modelScene.data.nodes : [];
  const REGIONS = (mapScene?.type === "map" ? mapScene.data.regionOrder : []) as RegionId[];
  const MAP_HUBS = mapScene?.type === "map" ? mapScene.data.hubs : [];
  const MAP_ORIGIN = mapScene?.type === "map" ? mapScene.data.hubOrigin : undefined;
  const MAP_LABELS = mapScene?.type === "map" ? mapScene.data.regionLabel : {};
  const MAP_LABEL_CELLS = mapScene?.type === "map" ? mapScene.data.regionLabelCell : {};

  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const chain = portrait ? CHAIN_P : CHAIN;
  const { opacity, scale } = useSceneInOut(frame, durationInFrames, {
    fadeIn: 8,
    entranceScale: 1.03,
  });

  const CAMERA = useMemo<CameraKeyframe[]>(
    () => [
      { frame: 0, camera: { x: 1500, y: 572, scale: 1.38 }, easing: EASE_ARRIVE },
      { frame: at(0.267), camera: { x: 960, y: 540, scale: 1.04 }, easing: EASE_ARRIVE },
      { frame: at(0.8), camera: { x: 960, y: 540, scale: 1.02 } },
      { frame: at(0.99), camera: { x: 960, y: 540, scale: 0.9 }, easing: EASE_ARRIVE },
    ],
    [at],
  );
  const CAMERA_P = useMemo<CameraKeyframe[]>(
    () => [
      { frame: 0, camera: { x: 540, y: 960, scale: 1.18 }, easing: EASE_ARRIVE },
      { frame: at(0.267), camera: { x: 540, y: 960, scale: 1 }, easing: EASE_ARRIVE },
      { frame: at(0.8), camera: { x: 540, y: 960, scale: 1 } },
      { frame: at(0.99), camera: { x: 540, y: 960, scale: 0.94 }, easing: EASE_ARRIVE },
    ],
    [at],
  );

  const wallP = progressive(frame, 0, at(0.105), EASE_ARRIVE);
  const wallOut = progressive(frame, at(WALL_FADE_OUT), at(WALL_FADE_OUT + WALL_FADE_DUR) - at(WALL_FADE_OUT));
  const wallOpacity = Math.min(wallP * 2, 1) * (1 - wallOut);

  const mapP = progressive(frame, at(0.038), at(0.157) - at(0.038));
  const revenueP = springProgress(frame, fps, { delay: at(0.057), damping: 14, stiffness: 150 });
  const iconsP = progressive(frame, at(0.081), at(0.186) - at(0.081));
  const chainP = progressive(frame, at(0.1), at(0.219) - at(0.1));

  const footerP = progressive(frame, at(0.895), at(0.976) - at(0.895));

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      <Backdrop scene="finale" />
      <Camera2D keyframes={portrait ? CAMERA_P : CAMERA}>
        <div style={{ position: "absolute", inset: 0, opacity: wallOpacity }}>
          {/* Mini world map */}
          {portrait ? (
            <div style={{ position: "absolute", left: 195, top: 190, opacity: mapP }}>
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
                  hubOrigin={MAP_ORIGIN}
                  hubs={MAP_HUBS}
                  regionLabel={MAP_LABELS}
                  regionLabelCell={MAP_LABEL_CELLS}
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
          ) : (
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
                  hubOrigin={MAP_ORIGIN}
                  hubs={MAP_HUBS}
                  regionLabel={MAP_LABELS}
                  regionLabelCell={MAP_LABEL_CELLS}
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
          )}

          {/* Revenue */}
          <div
            style={
              portrait
                ? {
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 660,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    opacity: Math.min(1, revenueP * 1.8),
                    transform: `scale(${0.9 + 0.1 * Math.min(1, revenueP)})`,
                  }
                : {
                    position: "absolute",
                    left: 1040,
                    top: 160,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    opacity: Math.min(1, revenueP * 1.8),
                    transform: `scale(${0.9 + 0.1 * Math.min(1, revenueP)})`,
                  }
            }
          >
            <span
              style={{
                fontFamily: FONT.headline,
                fontWeight: WEIGHT.bold,
                fontSize: portrait ? 22 : 24,
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
                fontSize: portrait ? 130 : 146,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                color: COLORS.gold,
              }}
            >
              <CountUp
                value={REVENUE_STEPS[REVENUE_STEPS.length - 1].value}
                steps={REVENUE_STEPS.map((s) => ({
                  value: s.value,
                  frame: at(s.at * 0.5 + 0.076),
                }))}
                format={formatCompactMoney}
              />
              <span style={{ fontSize: portrait ? 74 : 82 }}>+</span>
            </span>
          </div>

          {/* Icon strip */}
          <div
            style={
              portrait
                ? {
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 920,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 24,
                    opacity: iconsP,
                  }
                : {
                    position: "absolute",
                    left: 96,
                    top: 780,
                    display: "flex",
                    alignItems: "center",
                    gap: 26,
                    opacity: iconsP,
                  }
            }
          >
            {MODEL_NODES.slice(0, 10).map((node, i) => {
              const p = springProgress(frame, fps, {
                delay: at(0.162 + i * 0.014),
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
                  <NodeIcon role={node.role} size={portrait ? 60 : 72} />
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
          <div style={{ position: "absolute", left: chain.x, top: chain.y, opacity: chainP }}>
            {MODEL_NODES.slice(0, 4).map((node, i) => {
              const p = springProgress(frame, fps, {
                delay: at(0.2 + i * 0.038),
                damping: 15,
                stiffness: 200,
              });
              return (
                <div
                  key={node.title}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: i * chain.step,
                    width: chain.cardW,
                    height: chain.cardH,
                    borderRadius: 14,
                    background: COLORS.panel,
                    border: `1px solid ${COLORS.line}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: FONT.headline,
                    fontWeight: WEIGHT.bold,
                    fontSize: portrait ? 20 : 23,
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
                top: 4 * chain.step + 6,
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
          <svg
            width={portrait ? 1080 : 1920}
            height={portrait ? 1920 : 1080}
            viewBox={portrait ? "0 0 1080 1920" : "0 0 1920 1080"}
            style={{ position: "absolute", inset: 0 }}
          >
            {portrait ? (
              <>
                <AnimatedPath d="M 540 660 L 540 460" color={withAlpha(COLORS.textPrimary, 0.28)} strokeWidth={2} delay={at(0.162)} duration={at(0.105)} />
                <AnimatedPath d="M 540 1050 L 540 920" color={withAlpha(COLORS.gold, 0.38)} strokeWidth={2} delay={at(0.238)} duration={at(0.105)} />
              </>
            ) : (
              <>
                <AnimatedPath d="M 700 520 L 1080 330" color={withAlpha(COLORS.textPrimary, 0.28)} strokeWidth={2} delay={at(0.162)} duration={at(0.105)} />
                <AnimatedPath d="M 620 820 L 1180 380" color={withAlpha(COLORS.gold, 0.38)} strokeWidth={2} delay={at(0.238)} duration={at(0.105)} />
                <AnimatedPath d="M 1330 600 L 1200 400" color={withAlpha(COLORS.textPrimary, 0.28)} strokeWidth={2} delay={at(0.319)} duration={at(0.105)} />
              </>
            )}
            <FlowArrow
              from={{ x: chain.x + chain.cardW / 2, y: chain.y + chain.cardH }}
              to={{ x: chain.x + chain.cardW / 2, y: chain.y + chain.step - 14 }}
              color={COLORS.gold}
              strokeWidth={3}
              duration={at(0.071)}
              delay={at(0.257)}
              headSize={12}
            />
            <FlowArrow
              from={{ x: chain.x + chain.cardW / 2, y: chain.y + chain.step + chain.cardH }}
              to={{ x: chain.x + chain.cardW / 2, y: chain.y + 2 * chain.step - 14 }}
              color={COLORS.gold}
              strokeWidth={3}
              duration={at(0.071)}
              delay={at(0.281)}
              headSize={12}
            />
            <FlowArrow
              from={{ x: chain.x + chain.cardW / 2, y: chain.y + 2 * chain.step + chain.cardH }}
              to={{ x: chain.x + chain.cardW / 2, y: chain.y + 3 * chain.step - 14 }}
              color={COLORS.gold}
              strokeWidth={3}
              duration={at(0.071)}
              delay={at(0.31)}
              headSize={12}
            />
            <MoneyFlow
              streams={[
                {
                  from: { x: chain.x + chain.cardW / 2, y: chain.y + chain.cardH + 6 },
                  to: { x: chain.x + chain.cardW / 2, y: chain.y + 3 * chain.step - 6 },
                  offset: at(0.319),
                  travel: at(0.148),
                },
              ]}
              perStream={7}
              startFrame={0}
              travel={at(0.148)}
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
          delay={at(0.662)}
          variant="fade"
          style={{
            fontSize: portrait ? 20 : 22,
            letterSpacing: "0.5em",
            color: COLORS.red,
            marginBottom: 42,
            fontWeight: 600,
          }}
        />
        <AnimatedText
          lines={FINALE.line1.lines}
          delay={at(0.686)}
          lineStagger={7}
          wordStagger={2}
          style={{
            fontSize: portrait ? 84 : 94,
            lineHeight: 1.14,
            letterSpacing: "-0.01em",
          }}
        />
        <div style={{ height: portrait ? 44 : 56 }} />
        <AnimatedText
          lines={FINALE.line2.lines}
          delay={at(0.857)}
          wordStagger={1}
          style={{
            fontSize: portrait ? 58 : 148,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        />
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: portrait ? 150 : 52,
          textAlign: "center",
          fontFamily: FONT.body,
          fontWeight: WEIGHT.regular,
          fontSize: portrait ? 15 : 17,
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