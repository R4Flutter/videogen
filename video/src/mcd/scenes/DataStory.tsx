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
import { SCENE_FRAMES, ABSOLUTE } from "../data/story";
import { useStory } from "../StoryContext";
import { cueAt } from "../utils/audio";
import { COLORS, FONT, WEIGHT, withAlpha } from "../theme";

const PLOT = { left: 170, right: 1750, top: 300, baseline: 800 };

const CAMERA: CameraKeyframe[] = [
  { frame: 0, camera: { x: 960, y: 540, scale: 1 }, easing: EASE_ARRIVE },
  { frame: 40, camera: { x: 960, y: 540, scale: 1 }, easing: EASE_ARRIVE },
  { frame: 268, camera: { x: 1500, y: 572, scale: 1.38 }, easing: EASE_ARRIVE },
  { frame: 322, camera: { x: 1500, y: 572, scale: 1.38 } },
];

export const DataStory: React.FC = () => {
  const story = useStory();
  const CHART = story.chart;
  const REVENUE_BY_YEAR = story.chart.data;
  const MAX_REV = Math.max(...REVENUE_BY_YEAR.map((d) => d.value)) * 1.18;
  const LAST = REVENUE_BY_YEAR.length - 1;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { opacity, scale } = useSceneInOut(frame, SCENE_FRAMES.chart);

  cueAt("chart", "whoosh", ABSOLUTE.chartStart);
  REVENUE_BY_YEAR.forEach((_, i) =>
    cueAt("chart", "chart", ABSOLUTE.chartStart + 40 + i * 14),
  );
  cueAt("chart", "impact", ABSOLUTE.chartStart + 200);

  const kickerP = progressive(frame, 12, 22, EASE_ARRIVE);

  const barW = (REVENUE_BY_YEAR.length * 250 - 250) / REVENUE_BY_YEAR.length;
  const gap = (PLOT.right - PLOT.left - barW * REVENUE_BY_YEAR.length) / (REVENUE_BY_YEAR.length + 1);
  const xOf = (i: number) => PLOT.left + gap + i * (barW + gap);

  const axisP = progressive(frame, 20, 30);
  const insightP = springProgress(frame, fps, { delay: 196, damping: 15, stiffness: 150 });

  const insights = useMemo(() => {
    const kicker = progressive(frame, 198, 30, EASE_ARRIVE);
    const text = progressive(frame, 210, 34, EASE_ARRIVE);
    return { kicker, text };
  }, [frame]);

  const annotation = progressive(frame, 300, 36, EASE_ARRIVE);

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
            {CHART.kicker}
          </span>
        </div>

        {/* Gridlines */}
        <svg
          width="1920"
          height="1080"
          viewBox="0 0 1920 1080"
          style={{ position: "absolute", inset: 0 }}
        >
          {[0.25, 0.5, 0.75].map((f) => {
            const y = PLOT.baseline - (PLOT.baseline - PLOT.top) * f;
            return (
              <line
                key={f}
                x1={PLOT.left}
                y1={y}
                x2={PLOT.right}
                y2={y}
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="1.5"
                strokeDasharray="4 10"
                opacity={axisP}
              />
            );
          })}
          <line
            x1={PLOT.left}
            y1={PLOT.baseline}
            x2={PLOT.right}
            y2={PLOT.baseline}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="2.5"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - axisP}
          />
        </svg>

        {/* Bars */}
        <svg
          width="1920"
          height="1080"
          viewBox="0 0 1920 1080"
          style={{ position: "absolute", inset: 0 }}
        >
          {REVENUE_BY_YEAR.map((d, i) => {
            const isLast = i === LAST;
            const p = springProgress(frame, fps, {
              delay: 40 + i * 14,
              durationInFrames: 86,
              damping: 14.5,
              stiffness: 120,
            });
            const h = ((d.value / MAX_REV) * (PLOT.baseline - PLOT.top)) * Math.min(1.05, p);
            const x = xOf(i);
            const labelP = progressive(frame, 40 + i * 14 + 78, 26);
            const yearP = progressive(frame, 40 + i * 14 + 10, 20);
            const color = isLast
              ? interpolateColors(progressive(frame, 180, 30), [0, 1], [withAlpha(COLORS.gold, 0.35), COLORS.gold])
              : "#565D6C";
            return (
              <g key={d.label}>
                <rect
                  x={x}
                  y={PLOT.baseline - h}
                  width={barW}
                  height={h}
                  rx={14}
                  fill={color}
                  opacity={isLast ? 1 : 0.85}
                />
                {isLast ? (
                  <rect
                    x={x - 5}
                    y={PLOT.baseline - h - 5}
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
                    y={PLOT.baseline - h - 22}
                    textAnchor="middle"
                    fontFamily={FONT.headline}
                    fontWeight={WEIGHT.black}
                    fontSize={34}
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
                  y={PLOT.baseline + 44}
                  textAnchor="middle"
                  fontFamily={FONT.headline}
                  fontWeight={WEIGHT.medium}
                  fontSize={26}
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
              d={`M ${PLOT.right - 250} 185 L ${xOf(LAST) + barW} ${PLOT.baseline - ((REVENUE_BY_YEAR[LAST].value / MAX_REV) * (PLOT.baseline - PLOT.top))}`}
              color={withAlpha(COLORS.gold, 0.6)}
              strokeWidth={2.5}
              duration={26}
              delay={200}
            />
            <rect
              x={PLOT.right - 250}
              y={110}
              width={360}
              height={84}
              rx={14}
              fill={COLORS.panel}
              stroke={COLORS.lineStrong}
              opacity={insightP}
            />
            <text
              x={PLOT.right - 250 + 24}
              y={148}
              fontFamily={FONT.headline}
              fontWeight={WEIGHT.bold}
              fontSize={20}
              letterSpacing="0.3em"
              fill={COLORS.gold}
              opacity={insights.kicker}
            >
              {CHART.insightKicker}
            </text>
            <text
              x={PLOT.right - 250 + 24}
              y={180}
              fontFamily={FONT.headline}
              fontWeight={WEIGHT.black}
              fontSize={30}
              fill={COLORS.textPrimary}
              opacity={insights.text}
            >
              {CHART.insight}
            </text>
          </g>
        </svg>

        {/* Bottom annotation */}
        <div
          style={{
            position: "absolute",
            left: 170,
            bottom: 44,
            fontFamily: FONT.body,
            fontWeight: WEIGHT.regular,
            fontSize: 17,
            letterSpacing: "0.14em",
            color: COLORS.muted,
            opacity: annotation,
          }}
        >
          {CHART.annotationNote}
        </div>
      </Camera2D>
    </AbsoluteFill>
  );
};