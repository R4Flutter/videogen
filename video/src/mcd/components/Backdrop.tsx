import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SceneType } from "../data/storyTypes";
import { useStory } from "../StoryContext";
import { COLORS } from "../theme";

// Fullscreen photo backdrop behind a scene's vector graphics. A slow
// ken-burns drift (subtle zoom + pan) keeps it alive without fighting the
// camera moves, and a cream wash keeps the ink text readable over it.
export const Backdrop: React.FC<{ scene: SceneType }> = ({ scene }) => {
  const story = useStory();
  const src = story.backdrops?.[scene];
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  if (!src) {
    return null;
  }

  const t = durationInFrames > 1 ? frame / durationInFrames : 0;
  const scale = interpolate(t, [0, 1], [1.08, 1.16], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const panX = interpolate(t, [0, 1], [0, 12], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const panY = interpolate(t, [0, 1], [0, -8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img
        src={staticFile(`/${src.replace(/^\//, "")}`)}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
        }}
      />
      <AbsoluteFill style={{ background: COLORS.bg, opacity: 0.62 }} />
    </AbsoluteFill>
  );
};
