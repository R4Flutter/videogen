// Per-type scene validators. Pure, so the same table can run at import time
// (loadStory) and from node tools. Each validator returns a description of
// the first problem, or null when the scene data is fine.

import type { SceneDataByType, SceneType } from "./storyTypes";

export type Validator<T> = (data: T) => string | null;

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
};