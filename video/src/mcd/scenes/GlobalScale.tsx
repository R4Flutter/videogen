import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_OUT_QUINT, EASE_ARRIVE } from "../utils/easing";
import { progressive, springProgress, useSceneInOut } from "../utils/animation";
import { useCamera2D, type CameraKeyframe } from "../components/Camera2D";
import { IconGrid } from "../components/IconGrid";
import { CountUp } from "../components/CountUp";
import { useScene } from "../StoryContext";
import { COLORS, FONT, WEIGHT } from "../theme";

// Milestone ticks, timed as fractions of the scene (mirrored by the cues).
const MILESTONES = [
  { label: "1", at: 0.047, dur: 0.1 },
  { label: "10", at: 0.107, dur: 0.1 },
  { label: "100", at: 0.193, dur: 0.1 },
  { label: "1,000", at: 0.307, dur: 0.1 },
  { label: "10,000", at: 0.44, dur: 0.1 },
];

export const GlobalScale: React.FC = () => {
  const { data, durationInFrames, at } = useScene("global");
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const { opacity, scale } = useSceneInOut(frame, durationInFrames);

  const CAMERA = useMemo<CameraKeyframe[]>(
    () => [
      { frame: 0, camera: { x: 960, y: 540, scale: 3.1 }, easing: EASE_ARRIVE },
      { frame: at(0.66), camera: { x: 960, y: 540, scale: 0.345 }, easing: EASE_OUT_QUINT },
      { frame: at(0.927), camera: { x: 960, y: 540, scale: 0.345 } },
    ],
    [at],
  );
  // Portrait: the field zooms out less far so the glyphs keep filling the
  // taller canvas (scale 0.55 ≈ world height 3490 vs the 1600 field).
  const CAMERA_P = useMemo<CameraKeyframe[]>(
    () => [
      { frame: 0, camera: { x: 540, y: 960, scale: 3.1 }, easing: EASE_ARRIVE },
      { frame: at(0.66), camera: { x: 540, y: 960, scale: 0.55 }, easing: EASE_OUT_QUINT },
      { frame: at(0.927), camera: { x: 540, y: 960, scale: 0.55 } },
    ],
    [at],
  );
  const camera = useCamera2D(portrait ? CAMERA_P : CAMERA);

  const COUNT_STEPS = [
    { value: 1, frame: at(0.007) },
    { value: 10, frame: at(0.06) },
    { value: 100, frame: at(0.127) },
    { value: 1000, frame: at(0.227) },
    { value: 10000, frame: at(0.373) },
    { value: data.finalCount, frame: at(0.58) },
  ];

  // Quantity on screen multiplies 1 → finalCount while the camera zooms out.
  const count = progressive(frame, at(0.007), at(0.587) - at(0.007), EASE_OUT_QUINT) * data.finalCount;

  const g = springProgress(frame, fps, { delay: at(0.373), damping: 16, stiffness: 140 });
  const wordP = progressive(frame, at(0.453), at(0.573) - at(0.453), EASE_ARRIVE);
  const kickerP = progressive(frame, at(0.08), at(0.167) - at(0.08), EASE_ARRIVE);

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      {/* IconGrid draws its own camera transform on the canvas — keep it out
          of Camera2D so the zoom isn't applied twice. */}
      <IconGrid count={count} camera={camera} portrait={portrait} />

      {/* Kicker — pinned to screen, not to the zooming field */}
      <div
        style={{
          position: "absolute",
          left: portrait ? 0 : 84,
          right: portrait ? 0 : undefined,
          top: portrait ? 190 : 92,
          display: "flex",
          alignItems: "center",
          justifyContent: portrait ? "center" : undefined,
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
          {data.kicker}
        </span>
      </div>

      {/* Milestone chips */}
      {MILESTONES.map((m) => {
        const p = progressive(frame, at(m.at), at(m.at + m.dur) - at(m.at));
        const out = progressive(frame, at(m.at + m.dur + 0.2), at(m.at + m.dur + 0.293) - at(m.at + m.dur + 0.2));
        const vis = Math.max(0, Math.min(1, p * 2)) * (1 - out);
        if (vis <= 0) return null;
        return (
          <div
            key={m.label}
            style={{
              position: "absolute",
              right: portrait ? 100 : 130,
              top: portrait ? 880 : 330,
              fontFamily: FONT.headline,
              fontWeight: WEIGHT.black,
              fontSize: portrait ? 88 : 74,
              color: COLORS.textSecondary,
              opacity: vis,
              transform: `translateY(${(1 - vis) * 24}px)`,
            }}
          >
            {m.label}
          </div>
        );
      })}

      {/* Headline: finalCount + headline */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: portrait ? 260 : 108,
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
            fontSize: portrait ? 150 : 190,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          <CountUp
            value={data.finalCount}
            steps={COUNT_STEPS}
            format={(v) => Math.round(v).toLocaleString("en-US")}
          />
          <span style={{ fontSize: portrait ? 0.5 * 150 : 0.55 * 190 }}>+</span>
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: FONT.headline,
            fontWeight: WEIGHT.bold,
            fontSize: portrait ? 44 : 46,
            letterSpacing: "0.34em",
            color: COLORS.textPrimary,
            opacity: wordP,
            transform: `translateY(${(1 - wordP) * 18}px)`,
          }}
        >
          {data.headline}
        </div>
      </div>
    </AbsoluteFill>
  );
};
