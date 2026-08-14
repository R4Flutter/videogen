import React, { useEffect } from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { Vignette } from "./components/Vignette";
import { SCENE_COMPONENTS } from "./scenes";
import { sceneCues } from "./data/cues";
import { FLASH_FRAMES } from "./data/timeline";
import { SceneProvider, StoryProvider } from "./StoryContext";
import { cueAt, resetAudioCues } from "./utils/audio";
import { COLORS, FONT } from "./theme";
import type { LoadedStory } from "./data/story";

// 3-frame solid flash between scenes. Registers as two hard cuts for the
// scene detector (scene → flash → next scene) and punches the transition.
const FlashCut: React.FC = () => (
  <AbsoluteFill
    style={{
      background: COLORS.gold,
      opacity: 0.92,
    }}
  />
);

// One engine, any story: every scene of the story's `scenes` array is staged
// here, at the frame the timeline engine computed from its narration, wrapped
// in a SceneProvider so the scene can read its own data + timing. Cues are
// registered from data/cues.ts — the same list the post-render mux reads.
export const McdVideo: React.FC<{ story: LoadedStory }> = ({ story }) => {
  const { width, height } = useVideoConfig();

  useEffect(() => {
    resetAudioCues();
    story.timeline.scenes.forEach((tl, i) => {
      const scene = story.scenes[i];
      for (const c of sceneCues(scene)) {
        cueAt(scene.id, c.cue, tl.startFrame + Math.round(c.rel * tl.durationInFrames));
      }
    });
  }, [story]);

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
        {story.timeline.scenes.map((tl, i) => {
          const scene = story.scenes[i];
          const Component = SCENE_COMPONENTS[scene.type as keyof typeof SCENE_COMPONENTS];
          const at = (p: number) => Math.round(p * tl.durationInFrames);
          return (
            <Sequence key={scene.id} from={tl.startFrame} durationInFrames={tl.durationInFrames}>
              <SceneProvider runtime={{ scene, data: scene.data, durationInFrames: tl.durationInFrames, at }}>
                <Component />
              </SceneProvider>
            </Sequence>
          );
        })}
        {story.timeline.scenes.slice(0, -1).map((tl) => (
          <Sequence
            key={`flash-${tl.id}`}
            from={tl.startFrame + tl.durationInFrames}
            durationInFrames={FLASH_FRAMES}
          >
            <FlashCut />
          </Sequence>
        ))}
        <Vignette />
      </AbsoluteFill>
    </StoryProvider>
  );
};
