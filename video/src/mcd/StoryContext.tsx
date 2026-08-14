import React, { createContext, useContext, useMemo } from "react";
import { applyTheme } from "./theme";
import type { BusinessStory, SceneDataByType, SceneType, StoryScene } from "./data/storyTypes";

const StoryContext = createContext<BusinessStory | null>(null);

// Supplies the active story to every scene. Theme is applied during the
// provider's render — before any scene reads COLORS — so each page load is
// deterministically themed for its composition.
export const StoryProvider: React.FC<{
  story: BusinessStory;
  children: React.ReactNode;
}> = ({ story, children }) => {
  applyTheme(story.theme);
  return <StoryContext.Provider value={story}>{children}</StoryContext.Provider>;
};

export const useStory = (): BusinessStory => {
  const story = useContext(StoryContext);
  if (!story) {
    throw new Error("[story] useStory() must be used inside <StoryProvider>");
  }
  return story;
};

// ------------------------------------------------------------ scene context

// A scene at render time: its data, its duration (derived from its narration
// by the timeline engine) and `at(p)` — the scene-local frame at fraction p
// of the scene (0..1). Scenes express every animation keyframe as a fraction
// and call at(p), so the engine owns all timing.
export type SceneRuntime<T extends SceneType = SceneType> = {
  scene: StoryScene & { type: T };
  data: SceneDataByType[T];
  durationInFrames: number;
  at: (p: number) => number;
};

const SceneContext = createContext<SceneRuntime | null>(null);

export const SceneProvider: React.FC<{
  runtime: SceneRuntime;
  children: React.ReactNode;
}> = ({ runtime, children }) => (
  <SceneContext.Provider value={runtime}>{children}</SceneContext.Provider>
);

export const useScene = <T extends SceneType = SceneType>(type?: T): SceneRuntime<T> => {
  const runtime = useContext(SceneContext);
  if (!runtime) {
    throw new Error("[story] useScene() must be used inside <SceneProvider>");
  }
  if (type !== undefined && runtime.scene.type !== type) {
    throw new Error(
      `[story] useScene<"${type}">() received a "${runtime.scene.type}" scene — ` +
        `scene components may only be staged for their own type`,
    );
  }
  return runtime as SceneRuntime<T>;
};

// Convenience: the fraction → frame mapper for use outside the provider
// (e.g. in scene sub-components that receive a runtime prop).
export const useAt = (durationInFrames: number): ((p: number) => number) =>
  useMemo(
    () => (p: number) => Math.round(p * durationInFrames),
    [durationInFrames],
  );
