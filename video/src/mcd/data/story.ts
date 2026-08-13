// Loads + validates a story object. The validation runs at import time for
// every registered story, so a broken story.json fails the build loudly.

import type { BusinessStory } from "./storyTypes";

export const loadStory = (raw: unknown, src: string): BusinessStory => {
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
  if (s.hero.src !== undefined && typeof s.hero.src !== "string") throw fail("hero.src");

  if (!s.theme || typeof s.theme.accent !== "string" || typeof s.theme.accentSecondary !== "string") {
    throw fail("theme.accent / theme.accentSecondary");
  }

  if (!s.globalScale || typeof s.globalScale.finalCount !== "number" || s.globalScale.finalCount <= 0) {
    throw fail("globalScale.finalCount");
  }
  if (!s.globalScale.headline || !s.globalScale.kicker) throw fail("globalScale.headline / kicker");

  if (!s.map || !Array.isArray(s.map.regionOrder) || s.map.regionOrder.length === 0) {
    throw fail("map.regionOrder");
  }
  if (!s.map.hubOrigin || !Array.isArray(s.map.hubOrigin.cell)) throw fail("map.hubOrigin");
  if (!Array.isArray(s.map.hubs) || s.map.hubs.length === 0) throw fail("map.hubs");
  if (!s.map.title || !s.map.title.kicker) throw fail("map.title");

  if (!s.revenue || !Array.isArray(s.revenue.steps) || s.revenue.steps.length < 2) {
    throw fail("revenue.steps");
  }
  if (!s.revenue.finalLabel || !s.revenue.overline) throw fail("revenue.finalLabel / overline");

  if (!s.businessModel || !Array.isArray(s.businessModel.nodes) || s.businessModel.nodes.length < 2) {
    throw fail("businessModel.nodes");
  }
  if (s.businessModel.nodes.some((n) => !n.title || !n.sub || !n.role)) {
    throw fail("businessModel.nodes[].title / sub / role");
  }
  if (!Array.isArray(s.businessModel.flowNotes) || s.businessModel.flowNotes.length !== s.businessModel.nodes.length - 1) {
    throw fail("businessModel.flowNotes (must be nodes.length - 1)");
  }

  if (!s.chart || !Array.isArray(s.chart.data) || s.chart.data.length < 2) {
    throw fail("chart.data");
  }
  if (s.chart.data.some((d) => typeof d.value !== "number")) {
    throw fail("chart.data[].value");
  }

  if (!s.finale || !s.finale.line1 || !s.finale.line2 || !s.finale.footer) {
    throw fail("finale.line1 / line2 / footer");
  }

  return s as BusinessStory;
};

export { SCENE_FRAMES, OVERLAP, ABSOLUTE, TOTAL_FRAMES, VIDEO_CONFIG } from "./timeline";
export type { BusinessStory, StoryLine, RegionId, NodeRole } from "./storyTypes";