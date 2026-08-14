// Per-type scene validators. Pure, so the same table can run at import time
// (loadStory) and from node tools. Each validator returns a description of
// the first problem, or null when the scene data is fine.

import type { SceneDataByType, SceneEdit, SceneType } from "./storyTypes";

export type Validator<T> = (data: T) => string | null;

const EDIT_MOVES = new Set([
  "pushIn", "pullOut", "panLeft", "panRight", "panUp", "panDown", "drift", "static", "punch", "orbit",
]);

// Optional per-scene `edit` metadata (camera override etc.).
export const validateEdit = (edit: unknown): string | null => {
  if (edit === undefined || edit === null) return null;
  if (typeof edit !== "object") return "edit must be an object";
  const e = edit as SceneEdit;
  if (e.camera !== undefined && !EDIT_MOVES.has(e.camera)) {
    return `edit.camera "${e.camera}" is not a known camera move`;
  }
  if (e.intensity !== undefined && (typeof e.intensity !== "number" || e.intensity < 0 || e.intensity > 1)) {
    return "edit.intensity must be 0..1";
  }
  if (e.maxSec !== undefined && (typeof e.maxSec !== "number" || e.maxSec <= 0)) {
    return "edit.maxSec must be a positive number of seconds";
  }
  if (e.holdSec !== undefined && (typeof e.holdSec !== "number" || e.holdSec < 0)) {
    return "edit.holdSec must be a non-negative number of seconds";
  }
  return null;
};

const need = (v: unknown, what: string): string | null =>
  v === undefined || v === null || v === "" ? `missing "${what}"` : null;

const needArr = (v: unknown, min: number, what: string): string | null => {
  if (!Array.isArray(v) || v.length < min) return `"${what}" needs >= ${min} entries`;
  return null;
};

const check = <T>(data: T, checks: Array<[unknown, string]>): string | null => {
  for (const [v, what] of checks) {
    const bad = need(v, what);
    if (bad) return bad;
  }
  return null;
};

export const SCENE_VALIDATORS: {
  [T in SceneType]: Validator<SceneDataByType[T]>;
} = {
  hook: (d) =>
    check(d, [
      [d.kicker, "kicker"],
      [d.lines, "lines"],
    ]),

  global: (d) => {
    if (typeof d.finalCount !== "number" || d.finalCount <= 0) return "finalCount must be > 0";
    return check(d, [
      [d.headline, "headline"],
      [d.kicker, "kicker"],
    ]);
  },

  map: (d) => {
    if (needArr(d.regionOrder, 1, "regionOrder")) return needArr(d.regionOrder, 1, "regionOrder");
    if (!Array.isArray(d.hubOrigin?.cell) || d.hubOrigin.cell.length !== 2) return "hubOrigin.cell must be [x, y]";
    if (needArr(d.hubs, 1, "hubs")) return needArr(d.hubs, 1, "hubs");
    return check(d, [
      [d.title?.kicker, "title.kicker"],
      [d.title?.lines, "title.lines"],
    ]);
  },

  money: (d) => {
    if (needArr(d.steps, 2, "steps")) return needArr(d.steps, 2, "steps");
    if (d.steps.some((s) => typeof s.value !== "number" || typeof s.at !== "number")) {
      return "steps[] need numeric value and at (0..1 fraction)";
    }
    return check(d, [
      [d.finalLabel, "finalLabel"],
      [d.overline, "overline"],
    ]);
  },

  model: (d) => {
    if (needArr(d.nodes, 2, "nodes")) return needArr(d.nodes, 2, "nodes");
    if (d.nodes.some((n) => !n.title || !n.sub || !n.role)) return "nodes[] need title / sub / role";
    if (needArr(d.flowNotes, d.nodes.length - 1, "flowNotes")) {
      return `"flowNotes" must be nodes.length - 1 (${d.nodes.length - 1})`;
    }
    return null;
  },

  chart: (d) => {
    if (needArr(d.data, 2, "data")) return needArr(d.data, 2, "data");
    if (d.data.some((p) => typeof p.value !== "number")) return "data[].value must be numeric";
    return check(d, [
      [d.kicker, "kicker"],
      [d.insightKicker, "insightKicker"],
      [d.insight, "insight"],
    ]);
  },

  finale: (d) => {
    if (needArr(d.line1?.lines, 1, "line1.lines")) return needArr(d.line1?.lines, 1, "line1.lines");
    if (needArr(d.line2?.lines, 1, "line2.lines")) return needArr(d.line2?.lines, 1, "line2.lines");
    return need(d.footer, "footer");
  },

  title: (d) =>
    check(d, [
      [d.kicker, "kicker"],
      [d.lines, "lines"],
    ]),

  reveal: (d) =>
    check(d, [
      [d.kicker, "kicker"],
      [d.lines, "lines"],
    ]),

  document: (d) => {
    const KINDS = ["statement", "contract", "calendar", "filing"];
    if (!KINDS.includes(d.docType)) {
      return `docType must be one of ${KINDS.join(", ")}`;
    }
    const missing = check(d, [
      [d.kicker, "kicker"],
    ]);
    if (missing) return missing;
    if (d.docType === "statement") {
      const rows = d.rows ?? [];
      if (needArr(rows, 1, "rows")) return needArr(rows, 1, "rows");
      if (rows.some((r) => !r.name || !r.amount)) return "rows[] need name and amount";
    } else if (d.docType === "calendar") {
      if (need(d.month, "month")) return need(d.month, "month");
      if (typeof d.day !== "number" || d.day < 1 || d.day > 31) return "day must be 1..31";
    } else {
      if (needArr(d.body, 1, "body")) return needArr(d.body, 1, "body");
    }
    return null;
  },

  svg: (d) => {
    if (typeof d.svg !== "string" || !d.svg.includes("<svg")) return "svg must be an inline SVG string";
    if (/<script|on\w+\s*=|xlink:href|href\s*=\s*["'](?:https?:|data:)/i.test(d.svg)) {
      return "svg must not contain scripts, event handlers or external hrefs";
    }
    const missing = check(d, [
      [d.kicker, "kicker"],
    ]);
    if (missing) return missing;
    return null;
  },

  hero: (d) => {
    if (!d.subject || typeof d.subject !== "object") return "subject is required";
    if (typeof d.subject.width !== "number" || d.subject.width <= 0) {
      return "subject.width must be a positive number";
    }
    if (!d.subject.entrance || !d.subject.entrance.type) return "subject.entrance.type is required";
    const s = d.subject;
    if (!SEMANTIC_POSITIONS.has(s.position)) {
      return `subject.position "${s.position}" is not a semantic position`;
    }
    if (s.custom && s.custom.unit !== undefined && !["px", "fraction"].includes(s.custom.unit)) {
      return 'subject.custom.unit must be "px" or "fraction"';
    }
    if (s.effects) {
      for (const e of s.effects) {
        if (!HERO_EFFECTS.has(e)) return `subject.effects "${e}" is not a known effect`;
      }
    }
    for (const [i, layer] of (d.subjects ?? []).entries()) {
      if (!layer.entrance || !layer.entrance.type) return `subjects[${i}].entrance.type is required`;
      if (layer.position !== "subject" && !SEMANTIC_POSITIONS.has(layer.position)) {
        return `subjects[${i}].position "${layer.position}" is not a semantic position or "subject"`;
      }
      if (layer.position === "subject" && !layer.custom) {
        return `subjects[${i}].position "subject" needs custom {x, y} fractions of the subject box`;
      }
      if (layer.custom && layer.custom.unit !== undefined && !["px", "fraction"].includes(layer.custom.unit)) {
        return `subjects[${i}].custom.unit must be "px" or "fraction"`;
      }
      if (layer.width !== undefined && layer.relativeWidth !== undefined) {
        return `subjects[${i}] should set width or relativeWidth, not both`;
      }
    }
    const texts = d.texts ?? [];
    for (const t of texts) {
      if (!t.text || typeof t.text !== "string") return "texts[].text is required";
      if (!SEMANTIC_POSITIONS.has(t.position)) {
        return `texts[] position "${t.position}" is not a semantic position`;
      }
      if (!t.anim || !t.anim.type) return "texts[].anim.type is required";
      if (!HERO_MOTIONS.has(t.anim.type)) {
        return `texts[].anim.type "${t.anim.type}" is not a known animation`;
      }
    }
    if (!Array.isArray(d.beats) || d.beats.length === 0) return "beats[] needs at least one entry";
    for (const b of d.beats) {
      if (!b.name || typeof b.name !== "string") return "beats[].name is required";
      if (typeof b.at !== "number" || b.at < 0 || b.at > 1) return "beats[].at must be a 0..1 fraction";
      if (typeof b.importance !== "number" || b.importance < 0 || b.importance > 1) {
        return "beats[].importance must be 0..1";
      }
    }
    if (!d.camera || !d.camera.move) return "camera.move is required";
    if (!CAMERA_MOVES.has(d.camera.move)) return `camera.move "${d.camera.move}" is not a known camera move`;
    if (typeof d.camera.intensity !== "number" || d.camera.intensity < 0 || d.camera.intensity > 1) {
      return "camera.intensity must be 0..1";
    }
    const missing = check(d, [
      [d.kicker, "kicker"],
    ]);
    if (missing) return missing;
    return null;
  },

  slide: (d) => {
    if (!d.subject || typeof d.subject !== "object") return "subject is required";
    if (!["ltr", "rtl"].includes(d.subject.direction)) {
      return 'subject.direction must be "ltr" or "rtl"';
    }
    const texts = d.texts ?? [];
    for (const t of texts) {
      if (!t.text || typeof t.text !== "string") return "texts[].text is required";
      if (!SEMANTIC_POSITIONS.has(t.position)) {
        return `texts[] position "${t.position}" is not a semantic position`;
      }
      if (!t.anim || !t.anim.type) return "texts[].anim.type is required";
      if (!HERO_MOTIONS.has(t.anim.type)) {
        return `texts[].anim.type "${t.anim.type}" is not a known animation`;
      }
    }
    for (const b of d.beats ?? []) {
      if (!b.name || typeof b.name !== "string") return "beats[].name is required";
      if (typeof b.at !== "number" || b.at < 0 || b.at > 1) return "beats[].at must be a 0..1 fraction";
      if (typeof b.importance !== "number" || b.importance < 0 || b.importance > 1) {
        return "beats[].importance must be 0..1";
      }
    }
    return check(d, [[d.kicker, "kicker"]]);
  },

  broll: (d) => {
    if (!Array.isArray(d.lines) || d.lines.length === 0) return "lines[] needs at least one entry";
    for (const [i, l] of d.lines.entries()) {
      if (!l.text || typeof l.text !== "string") return `lines[${i}].text is required`;
      if (l.direction !== undefined && !["ltr", "rtl"].includes(l.direction)) {
        return `lines[${i}].direction must be "ltr" or "rtl"`;
      }
    }
    return check(d, [[d.kicker, "kicker"]]);
  },
};

const SEMANTIC_POSITIONS = new Set([
  "center",
  "upper_center",
  "lower_center",
  "left",
  "right",
  "upper_left",
  "upper_right",
  "lower_left",
  "lower_right",
  "left_center",
  "right_center",
  "custom",
]);

const HERO_MOTIONS = new Set([
  "slide_left", "slide_right", "slide_up", "slide_down",
  "fly_in", "slam_in", "pop_in", "spring_in", "scale_in", "zoom_in",
  "fade_in", "rotate_in", "drift_in", "mask_reveal",
  "word_pop", "character_reveal", "type_on", "slam", "scale_pop",
  "fade_up", "fade_down", "split_reveal", "underline_reveal",
  "highlight", "counter",
]);

const HERO_EFFECTS = new Set(["speed_lines", "subtle_shadow"]);

const CAMERA_MOVES = new Set([
  "push_in", "pull_out", "pan_left", "pan_right", "vertical_pan",
  "micro_shake", "whip_pan", "parallax", "dolly",
]);