import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { Hook } from "./scenes/Hook";
import { GlobalScale } from "./scenes/GlobalScale";
import { WorldMapScene } from "./scenes/WorldMapScene";
import { MoneyScene } from "./scenes/MoneyScene";
import { BusinessModel } from "./scenes/BusinessModel";
import { DataStory } from "./scenes/DataStory";
import { Finale } from "./scenes/Finale";
import { Vignette } from "./components/Vignette";
import { ABSOLUTE, OVERLAP, SCENE_FRAMES } from "./data/story";
import type { SceneId } from "./data/storyTypes";
import { StoryProvider } from "./StoryContext";
import { COLORS, FONT } from "./theme";
import type { BusinessStory } from "./data/storyTypes";

const S: Record<SceneId, { from: number; duration: number }> = {
  hook: { from: ABSOLUTE.hookStart, duration: SCENE_FRAMES.hook + OVERLAP },
  global: { from: ABSOLUTE.globalStart, duration: SCENE_FRAMES.global + OVERLAP },
  map: { from: ABSOLUTE.mapStart, duration: SCENE_FRAMES.map + OVERLAP },
  money: { from: ABSOLUTE.moneyStart, duration: SCENE_FRAMES.money + OVERLAP },
  model: { from: ABSOLUTE.modelStart, duration: SCENE_FRAMES.model + OVERLAP },
  chart: { from: ABSOLUTE.chartStart, duration: SCENE_FRAMES.chart + OVERLAP },
  finale: { from: ABSOLUTE.finaleStart, duration: SCENE_FRAMES.finale },
};

// One video, seven scenes, one engine — the story (data + hero + theme) is
// supplied per composition via <StoryProvider>.
export const McdVideo: React.FC<{ story: BusinessStory }> = ({ story }) => {
  const { width, height } = useVideoConfig();
  return (
    <StoryProvider story={story}>
      <AbsoluteFill
        style={{
          background: COLORS.bg,
          width,
          height,
          fontFamily: FONT.body,
          color: COLORS.textPrimary,
          overflow: "hidden",
        }}
      >
        <Sequence from={S.hook.from} durationInFrames={S.hook.duration}>
          <Hook />
        </Sequence>
        <Sequence from={S.global.from} durationInFrames={S.global.duration}>
          <GlobalScale />
        </Sequence>
        <Sequence from={S.map.from} durationInFrames={S.map.duration}>
          <WorldMapScene />
        </Sequence>
        <Sequence from={S.money.from} durationInFrames={S.money.duration}>
          <MoneyScene />
        </Sequence>
        <Sequence from={S.model.from} durationInFrames={S.model.duration}>
          <BusinessModel />
        </Sequence>
        <Sequence from={S.chart.from} durationInFrames={S.chart.duration}>
          <DataStory />
        </Sequence>
        <Sequence from={S.finale.from} durationInFrames={S.finale.duration}>
          <Finale />
        </Sequence>
        <Vignette />
      </AbsoluteFill>
    </StoryProvider>
  );
};