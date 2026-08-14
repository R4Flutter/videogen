// Scene-level sound-design cues, derived purely from the scene's own data and
// expressed as fractions (0..1) of the scene's duration. One source of truth:
// Video.tsx registers these in the audio registry, and tools/mcd-timeline.mjs
// serializes the same list into the timeline JSON for the post-render mux —
// so a mux never has to hardcode cue frames again.

import type { StoryScene } from "./storyTypes.ts";
import { CUE, type AudioCueName } from "../utils/audio.ts";

export type SceneCue = { rel: number; cue: AudioCueName };

const at = (rel: number): number => Math.min(1, Math.max(0, rel));

const REGION_WINDOW = {
  from: 12 / 180,
  span: 148 / 180,
  moneyOffset: 24 / 180,
};

export const sceneCues = (scene: StoryScene): SceneCue[] => {
  const rel = at;
  switch (scene.type) {
    case "hook":
      return [{ rel: rel(0), cue: CUE.whoosh }];

    case "global": {
      // Milestone ticks, mirroring the count milestones of the scene.
      const ticks = [0.047, 0.107, 0.193, 0.307, 0.44].map(
        (f): SceneCue => ({ rel: rel(f), cue: CUE.tick }),
      );
      return [{ rel: rel(0), cue: CUE.whoosh }, ...ticks];
    }

    case "map": {
      const n = Math.max(1, scene.data.regionOrder.length);
      const regionTicks = scene.data.regionOrder.map((_, i): SceneCue => ({
        rel: rel(REGION_WINDOW.from + i * (REGION_WINDOW.span / n)),
        cue: CUE.tick,
      }));
      const hubMoney = scene.data.hubs.map((h): SceneCue => {
        const idx = scene.data.regionOrder.indexOf(h.region);
        return {
          rel: rel(
            REGION_WINDOW.from +
              Math.max(0, idx) * (REGION_WINDOW.span / n) +
              REGION_WINDOW.moneyOffset,
          ),
          cue: CUE.money,
        };
      });
      return [{ rel: rel(0), cue: CUE.whoosh }, ...regionTicks, ...hubMoney];
    }

    case "money": {
      const steps = scene.data.steps
        .slice(1)
        .map((s): SceneCue => ({ rel: rel(s.at), cue: CUE.tick }));
      return [
        { rel: rel(0), cue: CUE.whoosh },
        ...steps,
        { rel: rel(0.97), cue: CUE.impact },
      ];
    }

    case "model":
      return [
        { rel: rel(0), cue: CUE.whoosh },
        { rel: rel(0.95), cue: CUE.impact },
      ];

    case "chart": {
      const bars = scene.data.data.map((_, i): SceneCue => ({
        rel: rel(0.11 + i * 0.038),
        cue: CUE.chart,
      }));
      return [
        { rel: rel(0), cue: CUE.whoosh },
        ...bars,
        { rel: rel(0.56), cue: CUE.impact },
      ];
    }

    case "finale":
      return [
        { rel: rel(0.08), cue: CUE.whoosh },
        { rel: rel(0.605), cue: CUE.transition },
        { rel: rel(0.69), cue: CUE.impact },
        { rel: rel(0.86), cue: CUE.impact },
      ];

    case "title":
      return [{ rel: rel(0), cue: CUE.whoosh }];

    case "reveal":
      return [
        { rel: rel(0), cue: CUE.whoosh },
        { rel: rel(0.45), cue: CUE.impact },
      ];
  }
};