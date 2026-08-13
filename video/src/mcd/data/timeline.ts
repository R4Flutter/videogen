// Engine-level constants — the 7-beat documentary arc and its timeline.
// These do NOT change between stories; only the story content does.

import type { SceneId } from "./storyTypes";

// Visual on-screen length of each scene, in frames (30 FPS, 16:9, 1920×1080).
export const SCENE_FRAMES: Record<SceneId, number> = {
  hook: 150, // 5.0 s
  global: 255, // 8.5 s
  map: 270, // 9.0 s
  money: 285, // 9.5 s
  model: 345, // 11.5 s
  chart: 360, // 12.0 s
  finale: 375, // 12.5 s
};

// Crossfade overlap between consecutive scenes (-ish frames).
export const OVERLAP = 14;

// Absolute frame each scene's <Sequence> begins at (computed, not magic).
export const SCENE_START: Readonly<Record<SceneId, number>> = (() => {
  const out = { hook: 0, global: 0, map: 0, money: 0, model: 0, chart: 0, finale: 0 } as Record<SceneId, number>;
  let acc = 0;
  for (const id of Object.keys(SCENE_FRAMES) as SceneId[]) {
    out[id] = acc;
    acc += SCENE_FRAMES[id] - (id === "hook" ? 0 : OVERLAP);
  }
  return out;
})();

export const ABSOLUTE = {
  hookStart: 0,
  globalStart: SCENE_START.global,
  mapStart: SCENE_START.map,
  moneyStart: SCENE_START.money,
  modelStart: SCENE_START.model,
  chartStart: SCENE_START.chart,
  finaleStart: SCENE_START.finale,
};

export const TOTAL_FRAMES = ABSOLUTE.finaleStart + SCENE_FRAMES.finale;

export const VIDEO_CONFIG = {
  width: 1920,
  height: 1080,
  fps: 30,
};