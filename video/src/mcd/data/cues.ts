// Scene-level sound-design cues, derived purely from the scene's own data and
// expressed as fractions (0..1) of the scene's duration. One source of truth:
// Video.tsx registers these in the audio registry, and tools/mcd-timeline.mjs
// serializes the same list into the timeline JSON for the post-render mux —
// so a mux never has to hardcode cue frames again.

import type { StoryScene } from "./storyTypes.ts";
import { CUE, type AudioCueName } from "../utils/audio.ts";
import { DEFAULT_WPM } from "./timeline.ts";

export type SceneCue = { rel: number; cue: AudioCueName };

const at = (rel: number): number => Math.min(1, Math.max(0, rel));

const REGION_WINDOW = {
  from: 12 / 180,
  span: 148 / 180,
  moneyOffset: 24 / 180,
};

export const sceneCues = (scene: StoryScene, wpm = DEFAULT_WPM): SceneCue[] => {
  const rel = at;

  // A deliberate hold (>= 1 s) is a punctuation beat: schedule a punch where
  // the hold starts so the mux lands an impact under the silence. Holds
  // shorter than a second are just breathing room, not beats.
  const hold = scene.hold ?? scene.edit?.holdSec ?? 0;
  const holdCue = (): SceneCue[] => {
    if (hold < 1) return [];
    const narrSec = (scene.narration.join(" ").split(/\s+/).filter(Boolean).length / wpm) * 60;
    const total = Math.max(0.1, narrSec + hold);
    return [{ rel: rel(Math.min(0.97, narrSec / total)), cue: CUE.impact }];
  };

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
        ...holdCue(),
      ];
    }

    case "model":
      return [
        { rel: rel(0), cue: CUE.whoosh },
        { rel: rel(0.95), cue: CUE.impact },
        ...holdCue(),
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
        ...holdCue(),
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
        ...holdCue(),
      ];

    case "document": {
      const d = scene.data;
      // One tick per statement row (they stagger in), one for the calendar's
      // circled day, one for a contract/filing page turn.
      const rows = d.rows;
      const rowTicks =
        d.docType === "statement" && rows
          ? rows.map((_, i): SceneCue => ({
              rel: rel(0.12 + i * Math.min(0.1, 0.5 / Math.max(1, rows.length))),
              cue: CUE.tick,
            }))
          : [{ rel: rel(0.35), cue: CUE.tick }];
      return [
        { rel: rel(0), cue: CUE.whoosh },
        ...rowTicks,
        { rel: rel(0.88), cue: CUE.impact },
        ...holdCue(),
      ];
    }

    case "svg":
      return [
        { rel: rel(0), cue: CUE.whoosh },
        { rel: rel(0.5), cue: CUE.impact },
        ...holdCue(),
      ];

    case "hero": {
      // The subject whooshes in, every beat lands an impact (high-importance
      // beats hit harder), and the hold punctuates.
      const beatImpacts = scene.data.beats
        .filter((b) => b.importance >= 0.35)
        .map((b): SceneCue => ({
          rel: rel(Math.min(0.97, b.at + 0.02)),
          cue: b.importance >= 0.8 ? CUE.impact : CUE.chart,
        }));
      return [
        { rel: rel(0), cue: CUE.whoosh },
        ...beatImpacts,
        ...holdCue(),
      ];
    }

    case "slide": {
      // The glide starts with a whoosh; mid-glide beats land impacts.
      const beatImpacts = (scene.data.beats ?? [])
        .filter((b) => b.importance >= 0.35)
        .map((b): SceneCue => ({
          rel: rel(Math.min(0.97, b.at + 0.02)),
          cue: b.importance >= 0.8 ? CUE.impact : CUE.chart,
        }));
      return [
        { rel: rel(0), cue: CUE.whoosh },
        ...beatImpacts,
        ...holdCue(),
      ];
    }

    case "broll": {
      // One whoosh per narration line — each asset lands with its line.
      const total = scene.data.lines.reduce((n, l) => n + l.text.split(/\s+/).filter(Boolean).length, 0);
      let acc = 0;
      const lineWhooshes = scene.data.lines.map((l): SceneCue => {
        const start = acc / Math.max(1, total);
        acc += l.text.split(/\s+/).filter(Boolean).length;
        return { rel: rel(Math.min(0.97, start)), cue: CUE.whoosh };
      });
      return [
        ...lineWhooshes,
        { rel: rel(0.97), cue: CUE.impact },
        ...holdCue(),
      ];
    }
  }
};