import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_ARRIVE } from "../utils/easing";
import { progressive, springProgress, useSceneInOut } from "../utils/animation";
import { Camera2D } from "../components/Camera2D";
import { useDirector } from "../data/director";
import { Backdrop } from "../components/Backdrop";
import { useScene } from "../StoryContext";
import { COLORS, FONT, WEIGHT } from "../theme";

// Inline-SVG artwork scenes. The story carries the SVG string; this scene
// scales it to the frame, springs it in, and runs the director's camera +
// motion beats over it. Spec: the V2 engine's storyboard SVGs
// (engine/scenes/*.mjs) — 1920×1080 world, cream/ink/green/gold palette.

const VB_RE = /viewBox\s*=\s*["']([-\d.\s]+)["']/;

export const SvgScene: React.FC = () => {
  const { data, durationInFrames, at } = useScene("svg");
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const { opacity, scale } = useSceneInOut(frame, durationInFrames, {
    fadeIn: 8,
    entranceScale: 1.02,
  });
  const CAMERA = useDirector().keyframes;

  const artW = data.width ?? (portrait ? 900 : 1500);
  const artH = useMemo(() => {
    const m = VB_RE.exec(data.svg);
    if (!m) return Math.round(artW * 0.56);
    const raw = m[1];
    const [, , vbW, vbH] = raw.trim().split(/\s+/).map(Number);
    if (!vbW || !vbH) return Math.round(artW * 0.56);
    return Math.round((artW * vbH) / vbW);
  }, [data.svg, artW]);

  const artX = data.align === "left" ? 84 : data.align === "right" ? width - artW - 84 : (width - artW) / 2;
  const artY = portrait ? Math.round(430 + (data.caption ? 0 : 0)) : Math.round(150 + (data.caption ? 0 : 20));
  const captionY = artY + artH + (portrait ? 60 : 40);

  const artIn = springProgress(frame, fps, { delay: at(0.06), damping: 12, stiffness: 110, mass: 0.95 });
  const kickerP = progressive(frame, at(0.05), at(0.16) - at(0.05), EASE_ARRIVE);

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      <Backdrop scene="svg" />
      <Camera2D keyframes={CAMERA}>
        <div
          style={
            portrait
              ? {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 150,
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
              fontSize: portrait ? 26 : 24,
              letterSpacing: "0.34em",
              color: COLORS.textSecondary,
            }}
          >
            {data.kicker}
          </span>
        </div>

        <div
          style={{
            position: "absolute",
            left: artX,
            top: artY,
            width: artW,
            height: artH,
            opacity: Math.min(1, artIn * 1.6),
            transform: `scale(${0.92 + artIn * 0.08}) rotate(${(1 - artIn) * -4}deg)`,
            filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.18))",
            pointerEvents: "none",
          }}
          // The SVG string is preflight-validated (no scripts / event
          // handlers / external hrefs) in data/validators.ts — see svg.
          dangerouslySetInnerHTML={{ __html: data.svg }}
        />

        {data.caption ? (
          <span
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: captionY,
              fontFamily: FONT.body,
              fontSize: portrait ? 28 : 20,
              letterSpacing: "0.3em",
              color: COLORS.muted,
              textAlign: "center",
              opacity: progressive(frame, at(0.75), at(0.9) - at(0.75), EASE_ARRIVE),
            }}
          >
            {data.caption}
          </span>
        ) : null}
      </Camera2D>
    </AbsoluteFill>
  );
};