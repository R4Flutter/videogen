import React, { useMemo } from "react";
import { AbsoluteFill, interpolateColors, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_ARRIVE } from "../utils/easing";
import {
  progressive,
  springProgress,
  useSceneInOut,
} from "../utils/animation";
import { Camera2D, type CameraKeyframe } from "../components/Camera2D";
import { AnimatedPath } from "../components/AnimatedPath";
import { Backdrop } from "../components/Backdrop";
import { useScene } from "../StoryContext";
import { COLORS, FONT, WEIGHT, withAlpha } from "../theme";

const PLOT = { left: 170, right: 1750, top: 300, baseline: 800 };

// Portrait plot: taller, sits below the kicker in the upper third.
const PLOT_P = { left: 90, right: 990, top: 460, baseline: 1350 };

export const DataStory: React.FC = () => {
  const { data, durationInFrames, at } = useScene("chart");
  const CHART = data;
  const REVENUE_BY_YEAR = data.data;
  const MAX_REV = Math.max(...REVENUE_BY_YEAR.map((d) => d.value)) * 1.18;
  const LAST = REVENUE_BY_YEAR.length - 1;

  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const plot = portrait ? PLOT_P : PLOT;
  const { opacity, scale } = useSceneInOut(frame, durationInFrames);

  const CAMERA = useMemo<CameraKeyframe[]>(
    () => [
      { frame: 0, camera: { x: 960, y: 540, scale: 1 }, easing: EASE_ARRIVE },
      { frame: at(0.11), camera: { x: 960, y: 540, scale: 1 }, easing: EASE_ARRIVE },
      { frame: at(0.743), camera: { x: 1500, y: 572, scale: 1.38 }, easing: EASE_ARRIVE },
      { frame: at(0.895), camera: { x: 1500, y: 572, scale: 1.38 } },
    ],
    [at],
  );
  const CAMERA_P = useMemo<CameraKeyframe[]>(
    () => [
      { frame: 0, camera: { x: 540, y: 960, scale: 1 }, easing: EASE_ARRIVE },
      { frame: at(0.11), camera: { x: 540, y: 960, scale: 1 }, easing: EASE_ARRIVE },
      { frame: at(0.743), camera: { x: 540, y: 960, scale: 1.12 }, easing: EASE_ARRIVE },
      { frame: at(0.895), camera: { x: 540, y: 960, scale: 1.12 } },
    ],
    [at],
  );

  const kickerP = progressive(frame, at(0.033), at(0.095) - at(0.033), EASE_ARRIVE);

  const barW = (REVENUE_BY_YEAR.length * 250 - 250) / REVENUE_BY_YEAR.length;
  const gap = (plot.right - plot.left - barW * REVENUE_BY_YEAR.length) / (REVENUE_BY_YEAR.length + 1);
  const xOf = (i: number) => plot.left + gap + i * (barW + gap);

  const axisP = progressive(frame, at(0.057), at(0.138) - at(0.057));
  const insightP = springProgress(frame, fps, { delay: at(0.543), damping: 15, stiffness: 150 });

  const insights = useMemo(() => {
    const kicker = progressive(frame, at(0.548), at(0.629) - at(0.548), EASE_ARRIVE);
    const text = progressive(frame, at(0.581), at(0.676) - at(0.581), EASE_ARRIVE);
    return { kicker, text };
  }, [frame, at]);

  const annotation = progressive(frame, at(0.833), at(0.933) - at(0.833), EASE_ARRIVE);

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      <Backdrop scene="chart" />
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
            {CHART.kicker}
          </span>
        </div>

        {/* Gridlines */}
        <svg
          width={portrait ? 1080 : 1920}
          height={portrait ? 1920 : 1080}
          viewBox={portrait ? "0 0 1080 1920" : "0 0 1920 1080"}
          style={{ position: "absolute", inset: 0 }}
        >
          {[0.25, 0.5, 0.75].map((f) => {
            const y = plot.baseline - (plot.baseline - plot.top) * f;
            return (
              <line
                key={f}
                x1={plot.left}
                y1={y}
                x2={plot.right}
                y2={y}
                stroke={withAlpha(COLORS.textPrimary, 0.07)}
                strokeWidth="1.5"
                strokeDasharray="4 10"
                opacity={axisP}
              />
            );
          })}
          <line
            x1={plot.left}
            y1={plot.baseline}
            x2={plot.right}
            y2={plot.baseline}
            stroke={withAlpha(COLORS.textPrimary, 0.22)}
            strokeWidth="2.5"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - axisP}
          />
        </svg>

        {/* Bars */}
        <svg
          width={portrait ? 1080 : 1920}
          height={portrait ? 1920 : 1080}
          viewBox={portrait ? "0 0 1080 1920" : "0 0 1920 1080"}
          style={{ position: "absolute", inset: 0 }}
        >
          {REVENUE_BY_YEAR.map((d, i) => {
            const isLast = i === LAST;
            const p = springProgress(frame, fps, {
              delay: at(0.11 + i * 0.038),
              durationInFrames: at(0.238),
              damping: 14.5,
              stiffness: 120,
            });
            const h = ((d.value / MAX_REV) * (plot.baseline - plot.top)) * Math.min(1.05, p);
            const x = xOf(i);
            const labelP = progressive(frame, at(0.11 + i * 0.038 + 0.214), at(0.071));
            const yearP = progressive(frame, at(0.11 + i * 0.038 + 0.029), at(0.057));
            const color = isLast
              ? interpolateColors(progressive(frame, at(0.5), at(0.581) - at(0.5)), [0, 1], [withAlpha(COLORS.gold, 0.35), COLORS.gold])
              : "#8A857C";
            return (
              <g key={d.label}>
                <rect
                  x={x}
                  y={plot.baseline - h}
                  width={barW}
                  height={h}
                  rx={14}
                  fill={color}
                  opacity={isLast ? 1 : 0.85}
                />
                {isLast ? (
                  <rect
                    x={x - 5}
                    y={plot.baseline - h - 5}
                    width={barW + 10}
                    height={h + 10}
                    rx={18}
                    fill="none"
                    stroke={COLORS.gold}
                    strokeWidth="2.5"
                    opacity={0.5 * insightP}
                  />
                ) : null}
                {labelP > 0 ? (
                  <text
                    x={x + barW / 2}
                    y={plot.baseline - h - 22}
                    textAnchor="middle"
                    fontFamily={FONT.headline}
                    fontWeight={WEIGHT.black}
                    fontSize={portrait ? 32 : 34}
                    fill={isLast ? COLORS.gold : COLORS.textPrimary}
                    opacity={labelP}
                    transform={`translateY(${(1 - labelP) * 14}px)`}
                  >
                    {d.value.toFixed(1)}
                    {CHART.valueSuffix}
                  </text>
                ) : null}
                <text
                  x={x + barW / 2}
                  y={plot.baseline + 44}
                  textAnchor="middle"
                  fontFamily={FONT.headline}
                  fontWeight={WEIGHT.medium}
                  fontSize={portrait ? 26 : 26}
                  letterSpacing="0.1em"
                  fill={isLast ? COLORS.textPrimary : COLORS.textSecondary}
                  opacity={yearP}
                >
                  {d.label}
                </text>
              </g>
            );
          })}

          {/* Insight annotation on the final bar */}
          <g opacity={insightP} transform={`translateY(${(1 - insightP) * 16}px)`}>
            <AnimatedPath
              d={`M ${portrait ? plot.right - 230 : PLOT.right - 250} 185 L ${xOf(LAST) + barW} ${plot.baseline - ((REVENUE_BY_YEAR[LAST].value / MAX_REV) * (plot.baseline - plot.top))}`}
              color={withAlpha(COLORS.gold, 0.6)}
              strokeWidth={2.5}
              duration={at(0.071)}
              delay={at(0.557)}
            />
            <rect
              x={portrait ? plot.right - 230 : PLOT.right - 250}
              y={portrait ? 320 : 110}
              width={portrait ? 320 : 360}
              height={portrait ? 96 : 84}
              rx={14}
              fill={COLORS.panel}
              stroke={COLORS.lineStrong}
              opacity={insightP}
            />
            <text
              x={(portrait ? plot.right - 230 : PLOT.right - 250) + 24}
              y={portrait ? 356 : 148}
              fontFamily={FONT.headline}
              fontWeight={WEIGHT.bold}
              fontSize={portrait ? 19 : 20}
              letterSpacing="0.3em"
              fill={COLORS.gold}
              opacity={insights.kicker}
            >
              {CHART.insightKicker}
            </text>
            <text
              x={(portrait ? plot.right - 230 : PLOT.right - 250) + 24}
              y={portrait ? 394 : 180}
              fontFamily={FONT.headline}
              fontWeight={WEIGHT.black}
              fontSize={portrait ? 26 : 30}
              fill={COLORS.textPrimary}
              opacity={insights.text}
            >
              {CHART.insight}
            </text>
          </g>
        </svg>

        {/* Bottom annotation */}
        <div
          style={
            portrait
              ? {
                  position: "absolute",
                  left: 90,
                  right: 90,
                  bottom: 170,
                  textAlign: "center",
                  fontFamily: FONT.body,
                  fontWeight: WEIGHT.regular,
                  fontSize: 16,
                  letterSpacing: "0.14em",
                  color: COLORS.muted,
                  opacity: annotation,
                }
              : {
                  position: "absolute",
                  left: 170,
                  bottom: 44,
                  fontFamily: FONT.body,
                  fontWeight: WEIGHT.regular,
                  fontSize: 17,
                  letterSpacing: "0.14em",
                  color: COLORS.muted,
                  opacity: annotation,
                }
          }
        >
          {CHART.annotationNote}
        </div>
      </Camera2D>
    </AbsoluteFill>
  );
};
