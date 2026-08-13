import React, { createContext, useContext } from "react";
import { applyTheme } from "./theme";
import type { BusinessStory } from "./data/storyTypes";

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