// Registered stories. Every story here gets its own composition (id =
// story.id) staged by the same engine. Validation runs at import time, and
// each story carries its computed narration-driven timeline.
import { loadStory } from "../data/story";
import type { LoadedStory } from "../data/story";
import mcdStory from "../data/businessStory.json";
import appleStory from "./appleBusinessStory.json";
import forexLamboStory from "./forexLamboBusinessStory.json";

export const STORY_LIST: LoadedStory[] = [
  loadStory(mcdStory, "data/businessStory.json"),
  loadStory(appleStory, "stories/appleBusinessStory.json"),
  loadStory(forexLamboStory, "stories/forexLamboBusinessStory.json"),
];

export const STORY_INDEX: Record<string, LoadedStory> = Object.fromEntries(
  STORY_LIST.map((s) => [s.id, s]),
);

export const defaultStory = (): LoadedStory => STORY_LIST[0];