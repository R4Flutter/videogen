import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_OUT_QUINT, EASE_ARRIVE } from "../utils/easing";
import { progressive, springProgress, useSceneInOut } from "../utils/animation";
import { useCamera2D, type CameraKeyframe } from "../components/Camera2D";
import { IconGrid } from "../components/IconGrid";
import { CountUp } from "../components/CountUp";
import { SCENE_FRAMES, ABSOLUTE } from "../data/story";
import { useStory } from "../StoryContext";
import { cueAt } from "../utils/audio";
import { COLORS, FONT, WEIGHT } from "../theme";

const CAMERA: CameraKeyframe[] = [
  { frame: 0, camera: { x: 960, y: 540, scale: 3.1 }, easing: EASE_ARRIVE },
  { frame: 168, camera: { x: 960, y: 540, scale: 0.345 }, easing: EASE_OUT_QUINT },
  { frame: 236, camera: { x: 960, y: 540, scale: 0.345 } },
];

const MILESTONES = [
  { label: "1", at: 12, dur: 26 },
  { label: "10", at: 28, dur: 26 },
  { label: "100", at: 50, dur: 26 },
  { label: "1,000", at: 78, dur: 26 },
  { label: "10,000", at: 112, dur: 26 },
];

export const GlobalScale: React.FC = () => {
  const story = useStory();
  const GLOBAL_SCALE = story.globalScale;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { opacity, scale } = useSceneInOut(frame, SCENE_FRAMES.global);
  const camera = useCamera2D(CAMERA);

  const COUNT_STEPS = [
    { value: 1, frame: 2 },
    { value: 10, frame: 16 },
    { value: 100, frame: 32 },
    { value: 1000, frame: 58 },
    { value: 10000, frame: 96 },
    { value: GLOBAL_SCALE.finalCount, frame: 148 },
  ];

  cueAt("global", "whoosh", ABSOLUTE.globalStart);
  MILESTONES.forEach((m) => cueAt("global", "tick", ABSOLUTE.globalStart + m.at));

  // Quantity on screen multiplies 1 → 40,400 while the camera zooms out.
  const count = progressive(frame, 2, 150, EASE_OUT_QUINT) * GLOBAL_SCALE.finalCount;

  const g = springProgress(frame, fps, { delay: 96, damping: 16, stiffness: 140 });
  const wordP = progressive(frame, 116, 30, EASE_ARRIVE);
  const kickerP = progressive(frame, 20, 22, EASE_ARRIVE);

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      {/* IconGrid draws its own camera transform on the canvas — keep it out
          of Camera2D so the zoom isn't applied twice. */}
      <IconGrid count={count} camera={camera} />

      {/* Kicker — pinned to screen, not to the zooming field */}
      <div
        style={{
          position: "absolute",
          left: 84,
          top: 92,
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
          {GLOBAL_SCALE.kicker}
        </span>
      </div>

      {/* Milestone chips */}
      {MILESTONES.map((m) => {
        const p = progressive(frame, m.at, m.dur);
        const out = progressive(frame, m.at + m.dur + 30, 14);
        const vis = Math.max(0, Math.min(1, p * 2)) * (1 - out);
        if (vis <= 0) return null;
        return (
          <div
            key={m.label}
            style={{
              position: "absolute",
              right: 130,
              top: 330,
              fontFamily: FONT.headline,
              fontWeight: WEIGHT.black,
              fontSize: 74,
              color: COLORS.textSecondary,
              opacity: vis,
              transform: `translateY(${(1 - vis) * 24}px)`,
            }}
          >
            {m.label}
          </div>
        );
      })}

      {/* Headline: 40,000+ LOCATIONS */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 108,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
          opacity: g,
          transform: `scale(${0.94 + g * 0.06})`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 6,
            fontFamily: FONT.headline,
            fontWeight: WEIGHT.black,
            color: COLORS.gold,
            fontSize: 190,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          <CountUp
            value={GLOBAL_SCALE.finalCount}
            steps={COUNT_STEPS}
            format={(v) => Math.round(v).toLocaleString("en-US")}
          />
          <span style={{ fontSize: 0.55 * 190 }}>+</span>
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: FONT.headline,
            fontWeight: WEIGHT.bold,
            fontSize: 46,
            letterSpacing: "0.34em",
            color: COLORS.textPrimary,
            opacity: wordP,
            transform: `translateY(${(1 - wordP) * 18}px)`,
          }}
        >
          {GLOBAL_SCALE.headline}
        </div>
      </div>
    </AbsoluteFill>
  );
};