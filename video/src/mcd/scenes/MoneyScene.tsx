import React from "react";
import { AbsoluteFill, interpolateColors, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_ARRIVE } from "../utils/easing";
import { progressive, springProgress, useSceneInOut } from "../utils/animation";
import { Camera2D } from "../components/Camera2D";
import { useDirector } from "../data/director";
import { CountUp } from "../components/CountUp";
import { AnimatedBar } from "../components/AnimatedBar";
import { Backdrop } from "../components/Backdrop";
import { MoneyFlow, type MoneyStream } from "../components/MoneyFlow";
import { useScene } from "../StoryContext";
import { formatCompactMoney } from "../utils/format";
import { COLORS, FONT, WEIGHT, DISCLAIMER, withAlpha } from "../theme";

const STREAMS: MoneyStream[] = [
  { from: { x: -60, y: 980 }, c1: { x: 240, y: 760 }, c2: { x: 560, y: 600 }, to: { x: 905, y: 505 }, offset: 30, travel: 130 },
  { from: { x: 260, y: 1080 }, c1: { x: 420, y: 820 }, c2: { x: 700, y: 620 }, to: { x: 940, y: 505 }, offset: 62, travel: 130 },
  { from: { x: 1980, y: 980 }, c1: { x: 1720, y: 780 }, c2: { x: 1380, y: 640 }, to: { x: 1015, y: 505 }, offset: 44, travel: 130 },
  { from: { x: 1660, y: 1080 }, c1: { x: 1500, y: 860 }, c2: { x: 1240, y: 660 }, to: { x: 975, y: 505 }, offset: 78, travel: 130 },
];

export const MoneyScene: React.FC = () => {
  const { data, durationInFrames, at } = useScene("money");
  const REVENUE = data;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const { opacity, scale } = useSceneInOut(frame, durationInFrames);

  const { keyframes: CAM, keyframesPortrait: CAM_P } = useDirector();

  const steps = REVENUE.steps.map((s) => ({ value: s.value, frame: at(s.at) }));
  const finalValue = REVENUE.steps[REVENUE.steps.length - 1].value;

  const kickerP = progressive(frame, at(0.048), at(0.124) - at(0.048), EASE_ARRIVE);
  const overlineP = progressive(frame, at(0.071), at(0.157) - at(0.071), EASE_ARRIVE);
  const plusP = springProgress(frame, fps, { delay: at(0.7), damping: 14, stiffness: 160 });
  const color = interpolateColors(
    progressive(frame, at(0.648), at(0.8) - at(0.648)),
    [0, 1],
    [COLORS.textPrimary, COLORS.gold],
  );
  const ring = progressive(frame, at(0.09), at(0.757) - at(0.09));

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      <Backdrop scene="money" />
      <Camera2D keyframes={portrait ? CAM_P : CAM}>
        {/* Pulsing target rings behind the counter */}
        <div
          style={
            portrait
              ? {
                  position: "absolute",
                  left: 0,
                  top: 420,
                  width: 1080,
                  height: 607,
                  overflow: "hidden",
                }
              : {
                  position: "absolute",
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }
          }
        >
          {portrait ? (
            <div style={{ width: 1920, height: 1080, transform: "scale(0.5625)", transformOrigin: "top left" }}>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="900" height="460" viewBox="0 0 900 460" style={{ opacity: 0.5 * ring }}>
                  {[0, 1, 2].map((i) => (
                    <ellipse
                      key={i}
                      cx="450"
                      cy="210"
                      rx={420 - i * 130}
                      ry={210 - i * 62}
                      fill="none"
                      stroke={withAlpha(COLORS.gold, 0.35)}
                      strokeWidth={2.5}
                      strokeDasharray={`${30 + i * 20} 12`}
                      opacity={0.7 - i * 0.22}
                      transform={`rotate(${i % 2 === 0 ? 0 : 180} 450 210)`}
                    />
                  ))}
                </svg>
              </div>
              <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
                <MoneyFlow
                  streams={STREAMS}
                  perStream={9}
                  startFrame={0}
                  travel={130}
                  particleRadius={[5, 11]}
                  markerEvery={4}
                />
              </svg>
            </div>
          ) : (
            <>
              <svg width="900" height="460" viewBox="0 0 900 460" style={{ opacity: 0.5 * ring }}>
                {[0, 1, 2].map((i) => (
                  <ellipse
                    key={i}
                    cx="450"
                    cy="210"
                    rx={420 - i * 130}
                    ry={210 - i * 62}
                    fill="none"
                    stroke={withAlpha(COLORS.gold, 0.35)}
                    strokeWidth={2.5}
                    strokeDasharray={`${30 + i * 20} 12`}
                    opacity={0.7 - i * 0.22}
                    transform={`rotate(${i % 2 === 0 ? 0 : 180} 450 210)`}
                  />
                ))}
              </svg>

              {/* Money streams converging on the counter */}
              <svg
                width="1920"
                height="1080"
                viewBox="0 0 1920 1080"
                style={{ position: "absolute", inset: 0 }}
              >
                <MoneyFlow
                  streams={STREAMS}
                  perStream={9}
                  startFrame={0}
                  travel={130}
                  particleRadius={[5, 11]}
                  markerEvery={4}
                />
              </svg>
            </>
          )}
        </div>

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
                  top: 92,
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
            {REVENUE.kicker}
          </span>
        </div>

        {/* Overline */}
        <div
          style={
            portrait
              ? {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 300,
                  textAlign: "center",
                  fontFamily: FONT.headline,
                  fontWeight: WEIGHT.medium,
                  fontSize: 28,
                  letterSpacing: "0.42em",
                  color: COLORS.textSecondary,
                  opacity: overlineP,
                }
              : {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 208,
                  textAlign: "center",
                  fontFamily: FONT.headline,
                  fontWeight: WEIGHT.medium,
                  fontSize: 30,
                  letterSpacing: "0.42em",
                  color: COLORS.textSecondary,
                  opacity: overlineP,
                }
          }
        >
          {REVENUE.overline}
        </div>

        {/* The counter */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: portrait ? 560 : 246,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              fontFamily: FONT.headline,
              fontWeight: WEIGHT.black,
              fontSize: portrait ? 170 : 218,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color,
            }}
          >
            <CountUp value={finalValue} steps={steps} format={formatCompactMoney} />
            <span
              style={{
                marginLeft: 10,
                fontSize: portrait ? 96 : 120,
                transform: `scale(${0.5 + plusP * 0.6})`,
                opacity: Math.min(1, plusP),
              }}
            >
              +
            </span>
          </div>
        </div>

        {/* Revenue bar */}
        <div style={{ position: "absolute", left: portrait ? 100 : 210, right: portrait ? 100 : 210, top: portrait ? 1200 : 830 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontFamily: FONT.headline,
                fontWeight: WEIGHT.bold,
                fontSize: portrait ? 22 : 24,
                letterSpacing: "0.3em",
                color: COLORS.textSecondary,
              }}
            >
              {REVENUE.barLabel}
            </span>
            <span
              style={{
                fontFamily: FONT.headline,
                fontWeight: WEIGHT.black,
                fontSize: portrait ? 32 : 34,
                color: COLORS.gold,
              }}
            >
              {REVENUE.finalLabel}
            </span>
          </div>
          <AnimatedBar
            value={1}
            delay={at(REVENUE.barAt)}
            duration={Math.min(REVENUE.barDurationSec * fps, 110)}
            height={portrait ? 24 : 26}
            color={COLORS.gold}
          />
        </div>

        {/* Footnote */}
        <div
          style={
            portrait
              ? {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 160,
                  textAlign: "center",
                  fontFamily: FONT.body,
                  fontWeight: WEIGHT.regular,
                  fontSize: 16,
                  letterSpacing: "0.16em",
                  color: COLORS.muted,
                  opacity: progressive(frame, at(0.771), at(0.876) - at(0.771)),
                }
              : {
                  position: "absolute",
                  left: 210,
                  bottom: 40,
                  fontFamily: FONT.body,
                  fontWeight: WEIGHT.regular,
                  fontSize: 18,
                  letterSpacing: "0.16em",
                  color: COLORS.muted,
                  opacity: progressive(frame, at(0.771), at(0.876) - at(0.771)),
                }
          }
        >
          {DISCLAIMER}
        </div>
      </Camera2D>
    </AbsoluteFill>
  );
};
