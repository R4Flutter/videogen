// Guards the story-driven timeline engine: durations come from narration at
// the story's wpm, every scene is clamped to the static-shot cap, flash gaps
// separate scenes, and retention promises get QC-checked.
//
//   node --experimental-strip-types --test tools/tests/mcd-timeline.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTimeline } from "../../video/src/mcd/data/timeline.ts";
import { sceneCues } from "../../video/src/mcd/data/cues.ts";
import { loadStory } from "../../video/src/mcd/data/story.ts";

const FPS = 30;
const videoSrc = join(dirname(fileURLToPath(import.meta.url)), "../../video/src/mcd");

const story = (scenes, extra = {}) => ({
  id: "TestStory",
  title: "Test",
  brand: "Test",
  wpm: 170,
  hero: { kind: "phone", width: 420, height: 640 },
  theme: { accent: "#000000", accentSecondary: "#111111" },
  scenes,
  ...extra,
});

const scene = (type, narration, data, extra = {}) => ({
  id: type,
  type,
  narration,
  data,
  ...extra,
});

test("duration derives from narration words at the story wpm", () => {
  const tl = buildTimeline(story([scene("hook", ["one two three four five"], { kicker: "K", lines: ["X"] })]), FPS);
  // 5 words at 170 wpm = 1.76s, + 0.5s default hold = 2.26s
  assert.ok(Math.abs(tl.scenes[0].durationSec - 2.26) < 0.01);
  assert.ok(Math.abs(tl.scenes[0].durationInFrames - 2.26 * FPS) < 1);
});

test("a slow wpm lengthens every scene", () => {
  const slow = buildTimeline(story([scene("hook", ["one two three"], { kicker: "K", lines: ["X"] })], { wpm: 165 }), FPS);
  const fast = buildTimeline(story([scene("hook", ["one two three"], { kicker: "K", lines: ["X"] })], { wpm: 180 }), FPS);
  assert.ok(slow.scenes[0].durationSec > fast.scenes[0].durationSec);
});

test("no static shot exceeds the 8s cap, and it warns", () => {
  const tl = buildTimeline(story([scene("map", ["a b c d e f g h i j k l m n o p q r s t u v w x"], { regionOrder: ["x"], hubOrigin: { name: "h", cell: [1, 1] }, hubs: [], title: { kicker: "K", lines: ["L"] } })]), FPS);
  assert.ok(tl.scenes[0].durationSec <= 8);
  assert.ok(tl.warnings.some((w) => /static-shot cap/.test(w)));
});

test("flash gaps separate scenes and totalFrames counts them", () => {
  const tl = buildTimeline(
    story([
      scene("hook", ["one two"], { kicker: "K", lines: ["X"] }),
      scene("finale", ["one two"], { montage: { mapLabel: "M", revenueLabel: "R", businessLabel: "B", networkLabel: "N" }, line1: { kicker: "K", lines: ["L"] }, line2: { lines: ["L2"] }, footer: "F" }),
    ]),
    FPS,
  );
  const [a, b] = tl.scenes;
  assert.equal(b.startFrame, a.startFrame + a.durationInFrames + 3);
  assert.equal(tl.totalFrames, b.startFrame + b.durationInFrames);
});

test("cuts/min is reported and out-of-band pacing warns", () => {
  const tl = buildTimeline(story([scene("hook", ["one two"], { kicker: "K", lines: ["X"] })]), FPS);
  assert.ok(tl.cutsPerMinute > 24);
  assert.ok(tl.warnings.some((w) => /cuts\/min/.test(w)));
});

test("retention devices must have a boundary within 4% of the promise", () => {
  const ok = buildTimeline(
    story([scene("hook", ["one two"], { kicker: "K", lines: ["X"] }), scene("finale", ["one two three"], { montage: { mapLabel: "M", revenueLabel: "R", businessLabel: "B", networkLabel: "N" }, line1: { kicker: "K", lines: ["L"] }, line2: { lines: ["L2"] }, footer: "F" })], {
      retention: [{ device: "reversal", at: 0.5 }],
    }),
    FPS,
  );
  assert.equal(ok.warnings.filter((w) => /retention device/.test(w)).length, 0);

  const bad = buildTimeline(
    story([scene("hook", ["one two"], { kicker: "K", lines: ["X"] }), scene("finale", ["one two three"], { montage: { mapLabel: "M", revenueLabel: "R", businessLabel: "B", networkLabel: "N" }, line1: { kicker: "K", lines: ["L"] }, line2: { lines: ["L2"] }, footer: "F" })], {
      retention: [{ device: "reveal", at: 0.2 }],
    }),
    FPS,
  );
  assert.ok(bad.warnings.some((w) => /retention device "reveal"/.test(w)));
});

test("every registered story passes its own QC clean", () => {
  const storyFiles = [join(videoSrc, "data", "businessStory.json")];
  const storiesDir = join(videoSrc, "stories");
  for (const f of readdirSync(storiesDir)) {
    if (f.endsWith(".json") && !f.endsWith(".timeline.json")) storyFiles.push(join(storiesDir, f));
  }
  for (const p of storyFiles) {
    const s = JSON.parse(readFileSync(p, "utf8"));
    const tl = buildTimeline(s, FPS);
    assert.equal(
      tl.warnings.length,
      0,
      `${s.id} should be QC clean, got: ${tl.warnings.join("; ")}`,
    );
    for (const sc of s.scenes) {
      sceneCues(sc); // no throw = every scene knows its cue grammar
    }
  }
});

test("scenes read per-type data and cues are fractions that fit inside the scene", () => {
  const hook = scene("hook", ["one two three"], { kicker: "K", lines: ["X"] });
  const money = scene("money", ["one two three four"], {
    kicker: "K",
    steps: [
      { value: 0, at: 0 },
      { value: 100, at: 0.5 },
    ],
    finalLabel: "100",
    overline: "O",
    barLabel: "B",
    barAt: 0.3,
    barDurationSec: 3,
  });
  assert.deepEqual(sceneCues(hook).map((c) => c.cue), ["whoosh"]);
  const moneyCues = sceneCues(money);
  assert.ok(moneyCues.every((c) => c.rel >= 0 && c.rel <= 1));
  assert.ok(moneyCues.some((c) => c.cue === "tick" && c.rel === 0.5));
});

test("loadStory attaches the timeline and validates scene data", () => {
  const loaded = loadStory(
    story([scene("model", ["one two"], { kicker: "K", nodes: [{ title: "A", sub: "s", role: "customer" }, { title: "B", sub: "s", role: "brand" }], flowNotes: ["F"], payoffOverline: "O", payoffValue: "V", payoffNote: "N" })]),
    "test",
  );
  assert.equal(loaded.timeline.scenes.length, 1);
  assert.throws(() => {
    loadStory(story([scene("chart", ["one two"], { kicker: "K", data: [{ label: "A", value: 1 }], insightKicker: "I", insight: "I" })]), "test");
  }, /chart/);
});
