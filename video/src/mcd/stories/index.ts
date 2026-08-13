// Registered stories. Every story here gets its own composition (id =
// story.id) staged by the same engine. Validation runs at import time.
import { loadStory } from "../data/story";
import type { BusinessStory } from "../data/storyTypes";
import mcdStory from "../data/businessStory.json";
import appleStory from "./appleBusinessStory.json";

export const STORY_LIST: BusinessStory[] = [
  loadStory(mcdStory, "data/businessStory.json"),
  loadStory(appleStory, "stories/appleBusinessStory.json"),
];

export const STORY_INDEX: Record<string, BusinessStory> = Object.fromEntries(
  STORY_LIST.map((s) => [s.id, s]),
);

export const defaultStory = (): BusinessStory => STORY_LIST[0];