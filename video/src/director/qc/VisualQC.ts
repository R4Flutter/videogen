// VisualQC: variety, density and competition. A frame that is doing too much
// loses its viewer even when every element is good alone; a film that stages
// every beat the same way is wallpaper.
import type { DirectorPlan, QcFinding } from "../types.ts";
import { clamp } from "../util.ts";

export const runVisualQC = (plan: DirectorPlan): { findings: QcFinding[]; score: number } => {
  const findings: QcFinding[] = [];
  let score = 10;

  const flag = (f: QcFinding) => {
    findings.push(f);
    score -= f.level === "warn" ? 1.1 : 0.4;
  };

  // 1. High information + high complexity + full captions = competition.
  for (const b of plan.beats) {
    const dense = b.attention.informationDensity >= 0.7;
    const busy =
      b.visual.module === "chart" ||
      b.visual.module === "compare" ||
      b.visual.module === "timeline" ||
      b.visual.module === "funnel" ||
      b.visual.module === "map";
    if (dense && busy && b.visual.captionMode === "FULL") {
      flag({
        at: b.start,
        beat: b.n,
        level: "info",
        rule: "dense-frame",
        message: `${b.visual.module} with FULL captions while information density is high`,
      });
    }
    // The novelty budget is a hard line: camera + module + captions all loud.
    if (b.motion.camera.intent === "push" && b.visual.captionMode === "FULL" && b.visual.module !== "kinetic") {
      flag({
        at: b.start,
        beat: b.n,
        level: "info",
        rule: "camera-caption-conflict",
        message: "pushing camera under full captions",
      });
    }
  }

  // 2. Visual variety: how many distinct modules the film uses.
  const distinct = new Set(plan.beats.map((b) => b.visual.module)).size;
  if (distinct < 4 && plan.beats.length >= 8) {
    flag({ at: -1, level: "warn", rule: "low-variety", message: `only ${distinct} distinct modules in a ${plan.beats.length}-beat film` });
  }

  // 3. Rest: does the film ever breathe?
  const rests = plan.beats.filter((b) => b.visual.rest).length;
  if (plan.project.durationInSeconds > 240 && rests === 0) {
    flag({ at: -1, level: "info", rule: "no-rest", message: "no rest beat in a 4+ minute film" });
  }

  // 4. Progressive disclosure: long complex beats without a reveal plan.
  for (const b of plan.beats) {
    const dur = b.end - b.start;
    const complex = ["chart", "compare", "timeline", "funnel", "map", "trust", "trace"].includes(b.visual.module);
    if (complex && dur >= 12 && b.motion.reveal.triggers.length === 0) {
      flag({
        at: b.start,
        beat: b.n,
        level: "info",
        rule: "flat-disclosure",
        message: `${Math.round(dur)}s on ${b.visual.module} with no staged reveal`,
      });
    }
  }

  // 5. Metaphor misuse: a metaphor on a beat that names concrete evidence.
  for (const b of plan.beats) {
    if (b.visual.metaphor && b.visual.module === "quote") {
      flag({ at: b.start, beat: b.n, level: "warn", rule: "metaphor-vs-evidence", message: "metaphor staged where a citation is the evidence" });
    }
  }

  return { findings, score: Number(clamp(score, 0, 10).toFixed(1)) };
};
