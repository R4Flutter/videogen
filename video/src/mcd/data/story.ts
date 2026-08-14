// Loads + validates a story object and attaches its computed timeline. The
// validation runs at import time for every registered story, so a broken
// story.json fails the build loudly.

import { buildTimeline, type StoryTimeline } from "./timeline.ts";
import { SCENE_VALIDATORS } from "./validators.ts";
import type { BusinessStory, SceneType } from "./storyTypes.ts";

export type LoadedStory = BusinessStory & { timeline: StoryTimeline };

export const loadStory = (raw: unknown, src: string): LoadedStory => {
  if (!raw || typeof raw !== "object") {
    throw new Error(`[story] ${src}: story must be an object`);
  }
  const s = raw as Partial<BusinessStory>;
  const fail = (field: string) =>
    new Error(`[story] ${src}: missing or invalid "${field}"`);

  if (typeof s.id !== "string" || !s.id) throw fail("id");
  if (typeof s.title !== "string" || !s.title) throw fail("title");
  if (typeof s.brand !== "string" || !s.brand) throw fail("brand");

  if (!s.hero || typeof s.hero.width !== "number" || typeof s.hero.height !== "number") {
    throw fail("hero.width / hero.height");
  }

  if (!s.theme || typeof s.theme.accent !== "string" || typeof s.theme.accentSecondary !== "string") {
    throw fail("theme.accent / theme.accentSecondary");
  }

  if (s.wpm !== undefined && (typeof s.wpm !== "number" || s.wpm <= 0)) throw fail("wpm");

  // The arc comes from the story, so the scenes array is the story.
  if (!Array.isArray(s.scenes) || s.scenes.length === 0) {
    throw fail("scenes (a story needs at least one scene)");
  }
  const seen = new Set<string>();
  s.scenes.forEach((scene, i) => {
    if (!scene || typeof scene.id !== "string" || !scene.id) throw fail(`scenes[${i}].id`);
    if (seen.has(scene.id)) throw fail(`scenes[${i}].id ("${scene.id}" staged twice)`);
    seen.add(scene.id);
    const type = scene.type as SceneType;
    if (!(type in SCENE_VALIDATORS)) {
      throw fail(`scenes[${i}].type (unknown scene type "${String(scene.type)}")`);
    }
    if (!Array.isArray(scene.narration) || scene.narration.length === 0 || !scene.narration.some((n) => n.trim())) {
      throw fail(`scenes[${i}].narration (every scene must have narration — it drives the duration)`);
    }
    const problem = SCENE_VALIDATORS[type](scene.data as never);
    if (problem) throw new Error(`[story] ${src}: scene "${scene.id}" (${type}): ${problem}`);
  });

  const story = s as BusinessStory;
  return { ...story, timeline: buildTimeline(story) };
};

export { buildTimeline, FLASH_FRAMES, MAX_SCENE_SEC, DEFAULT_WPM } from "./timeline.ts";
export type { StoryTimeline } from "./timeline";
export type { BusinessStory, StoryLine, RegionId, NodeRole, StoryScene, SceneType } from "./storyTypes";
