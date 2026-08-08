// tools/tests/editorial.test.mjs — the editorial-brain test suite.
//   node --experimental-strip-types --test tools/tests/editorial.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ai = join(root, "video/src/director/ai");

const { applyDecision, runDecisions, emptyState } = await import(
  pathToFileURL(join(ai, "ViewerState.ts")).href
);
const { extractJson, validateResponse, validateRevision } = await import(
  pathToFileURL(join(ai, "EditorialValidator.ts")).href
);
const { decisionsToOverlay, applyRevision, attachViewerStates } = await import(
  pathToFileURL(join(ai, "index.ts")).href
);
const { buildDirectorPlan } = await import(
  pathToFileURL(join(root, "video/src/director/plan.ts")).href
);
const { runRetentionQC } = await import(
  pathToFileURL(join(root, "video/src/director/qc/RetentionQC.ts")).href
);

const fixtureScript = () => ({
  title: "TEST FILM",
  engine: "vox",
  fps: 30,
  width: 1920,
  height: 1080,
  durationInSeconds: 40,
  beats: Array.from({ length: 8 }, (_, i) => {
    const n = i + 1;
    return {
      n,
      name: `beat ${n}`,
      start: (n - 1) * 5,
      end: n * 5,
      vo: `Narration for beat ${n}.`,
      visual: `visual ${n}`,
    };
  }),
});

// ---------------------------------------------------------------- viewer state
test("viewer state accumulates knowledge and tracks open questions", () => {
  const s1 = applyDecision(emptyState(), {
    beatId: "1",
    question: "Why does the platform pay?",
  });
  assert.ok(s1.openQuestions.includes("Why does the platform pay?"));
  assert.ok(s1.doesNotKnow.includes("Why does the platform pay?"));

  const s2 = applyDecision(s1, {
    beatId: "2",
    reveal: "The payment builds trust artificially.",
  });
  assert.ok(!s2.openQuestions.includes("Why does the platform pay?"));
  assert.ok(s2.resolvedQuestions.includes("Why does the platform pay?"));
  assert.ok(s2.knows.includes("The payment builds trust artificially."));
});

test("viewer state: reveal without question lands as new knowledge", () => {
  const s = applyDecision(emptyState(), {
    beatId: "1",
    reveal: "The app harvests the contact list.",
  });
  assert.ok(s.knows.includes("The app harvests the contact list."));
  assert.equal(s.openQuestions.length, 0);
});

test("viewer state: unresolved questions survive the whole film", () => {
  const end = runDecisions([
    { beatId: "1", reveal: "Only the top earners see the fees." },
    { beatId: "3", question: "Who runs the platform?" },
  ]);
  assert.ok(end.openQuestions.includes("Who runs the platform?"));
  assert.ok(end.knows.includes("Only the top earners see the fees."));
});

test("curiosity chain: question → nextQuestion advances across beats", () => {
  const end = runDecisions([
    { beatId: "1", question: "How do they recruit victims?" },
    { beatId: "2", reveal: "Through fake job listings.", nextQuestion: "Who writes the listings?" },
    { beatId: "3", reveal: "A shell company.", consequence: "The shell vanishes by the end of the month." },
  ]);
  assert.ok(end.knows.includes("A shell company."));
  assert.ok(end.knows.includes("The shell vanishes by the end of the month."));
  assert.ok(!end.openQuestions.includes("How do they recruit victims?"));
});

// ---------------------------------------------------------------- validator
test("extractJson repairs fenced and prose-wrapped JSON", () => {
  const v = extractJson('Here you go:\n```json\n{"a":1}\n```\nThanks!');
  assert.deepEqual(v, { a: 1 });
  assert.equal(extractJson("no json here"), null);
});

test("validateResponse rejects unknown beatIds and drops them", () => {
  const script = fixtureScript();
  const r = validateResponse(
    JSON.stringify({ macro: { chapters: [] }, sequences: [], beats: [{ beatId: "beat_99", purpose: "hook" }] }),
    script,
  );
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => e.includes('unknown beatId "beat_99"')));
});

test("validateResponse falls back for unsupported module and camera", () => {
  const script = fixtureScript();
  const r = validateResponse(
    JSON.stringify({
      macro: { chapters: [] },
      sequences: [],
      beats: [
        { beatId: "1", visual: { module: "hologram", purpose: "EXPLAIN", reason: "x" }, motion: { camera: "whip" } },
      ],
    }),
    script,
  );
  assert.ok(r.ok, r.errors.join("; "));
  assert.ok(r.fixed.some((f) => f.includes('unsupported module "hologram"')));
  assert.ok(r.fixed.some((f) => f.includes('unsupported camera "whip" → "settle"')));
  assert.equal(r.value.beats[0].visual.module, "trace");
  assert.equal(r.value.beats[0].motion.camera, "settle");
});

test("validateResponse rejects invalid emotion and out-of-range jcut", () => {
  const script = fixtureScript();
  const r = validateResponse(
    JSON.stringify({
      macro: { chapters: [] },
      sequences: [],
      beats: [
        { beatId: "1", emotion: { from: "bliss", to: "tension", intensity: 4 }, audio: { jcut: 99 } },
      ],
    }),
    script,
  );
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => e.includes('invalid emotion {from:bliss')));
});

test("validateResponse honors author notes over brain decisions", () => {
  const script = fixtureScript();
  script.beats[0].camera = "pan";
  const r = validateResponse(
    JSON.stringify({
      macro: { chapters: [] },
      sequences: [],
      beats: [{ beatId: "1", motion: { camera: "focus" } }],
    }),
    script,
  );
  assert.ok(r.ok);
  assert.equal(r.value.beats[0].motion?.camera, undefined);
});

// ---------------------------------------------------------------- overlay
test("decisionsToOverlay maps decisions onto script fields only where free", () => {
  const script = fixtureScript();
  script.beats[0].emotion = "anger"; // author note
  const { overlay, locked } = decisionsToOverlay(script, {
    macro: { chapters: [{ startBeat: 1, title: "ONE", purpose: "HOOK" }] },
    sequences: [],
    beats: [
      {
        beatId: "1",
        purpose: "hook",
        emotion: { from: "curiosity", to: "tension", intensity: 0.8 },
        visual: { module: "trust", purpose: "REVEAL", reason: "Show the mechanism." },
        motion: { camera: "reveal", reveal: "MASK" },
        audio: { music: "drop", silence: "PRE_REVEAL_SILENCE" },
        attention: { strategy: "delayed_reveal", event: "REVEAL", reason: "Hold then land." },
        locked: true,
      },
      { beatId: "2", visual: { module: "trace", purpose: "EXPLAIN", reason: "Money path." } },
    ],
  });
  assert.ok(locked.includes(1));
  const b1 = overlay.beats[1];
  assert.equal(b1.purpose, "hook");
  assert.equal(b1.emotion, undefined); // author "anger" wins — brain emotion not written
  assert.equal(b1.module, "trust");
  assert.equal(b1.visualPurpose, "REVEAL");
  assert.equal(b1.camera, "reveal");
  assert.equal(b1.silence, "PRE_REVEAL_SILENCE");
  assert.equal(b1.attentionStrategy, "delayed_reveal");
  const b2 = overlay.beats[2];
  assert.equal(b2.module, "trace");
  assert.equal(overlay.chapters.length, 1);
});

test("applyRevision touches only the listed beats and preserves the rest", () => {
  const base = { beats: { 1: { module: "kinetic" }, 2: { module: "stat" } } };
  const next = applyRevision(base, {
    revision: { reason: "kinetic overuse", changes: [{ beatId: "2", visual: { module: "collage", purpose: "HUMANIZE", reason: "faces" } }] },
  });
  assert.deepEqual(next.beats[1], { module: "kinetic" });
  assert.equal(next.beats[2].module, "collage");
});

test("validateRevision rejects changes to locked beats", () => {
  const script = fixtureScript();
  const r = validateRevision(
    JSON.stringify({ revision: { reason: "x", changes: [{ beatId: "3", visual: { module: "collage", purpose: "REVEAL", reason: "y" } }] } }),
    script,
    [3],
  );
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => e.includes("locked beat 3")));
});

test("attachViewerStates projects deterministic snapshots per sequence", () => {
  const plan = { sequences: [{ beatRange: [1, 3] }, { beatRange: [4, 6] }] };
  attachViewerStates(plan, { macro: { chapters: [] }, sequences: [], beats: [] }, [
    { beatId: "1", question: "Q1" },
    { beatId: "4", reveal: "A4" },
  ]);
  assert.ok(plan.sequences[0].viewerState.openQuestions.includes("Q1"));
  assert.ok(plan.sequences[1].viewerState.knows.includes("A4"));
});

// ---------------------------------------------------------------- long-form
test("long-form: the real 68-beat script plans multi-chapter with critic QC", () => {
  const script = JSON.parse(readFileSync(join(root, "video/src/script.json"), "utf8"));
  assert.ok(script.beats.length >= 60, "fixture must be long-form");
  const { plan, issues } = buildDirectorPlan(script, undefined, "ESSAY");
  assert.equal(issues.length, 0, issues.map((i) => i.message).join("; "));
  assert.ok(plan.chapters.length >= 2, "needs chapters");
  assert.ok(plan.sequences.length >= 5, "needs sequences");
  assert.ok(plan.beats.length >= 60);

  const report = runRetentionQC(plan);
  assert.ok(report.findings.every((f) => f.severity), "every finding is a critic note");
  assert.ok(report.findings.every((f) => f.fix), "every finding suggests a fix");
  assert.ok(plan.storyMemory.some((m) => m.central), "a central motif exists for the payoff");
});
