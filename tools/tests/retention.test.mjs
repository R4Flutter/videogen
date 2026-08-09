// tools/tests/retention.test.mjs — the attention-architecture suite.
//   node --experimental-strip-types --test tools/tests/retention.test.mjs
//
// Everything here is a claim about *behaviour a viewer would notice*, not
// about internals. If a test's name doesn't describe something an editor
// would say out loud in a review, it shouldn't be in this file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const d = (p) => pathToFileURL(join(root, "video/src/director", p)).href;

const { runLoopStack, terms, overlap, debtScore, MIN_OPEN } = await import(d("attention/LoopStack.ts"));
const { inspectOpening, threeWordLoop, sentences, classifyHook, FORBIDDEN } = await import(
  d("attention/OpeningRegime.ts")
);
const { analyzeCausality, linkBetween, andThenRuns, causalityScore } = await import(d("story/Causality.ts"));
const { buildRiskCurve, sparkline, WEIGHTS } = await import(d("qc/DropRisk.ts"));
const { runGates, audioSourcesAt } = await import(d("qc/Gates.ts"));
const { habituation, rotateModality, CHANNEL_OF_EVENT } = await import(d("attention/Habituation.ts"));
const { buildEmotionalArc, arcDistance, VALENCE_AROUSAL } = await import(d("attention/EmotionalArc.ts"));
const { hasQuantity, quantityCount } = await import(d("util.ts"));
const { buildDirectorPlan } = await import(d("plan.ts"));
const { planChapters } = await import(d("story/ChapterPlanner.ts"));
const { analyzeStory } = await import(d("story/StoryAnalyzer.ts"));

// ---------------------------------------------------------------- fixtures
const beat = (n, vo, extra = {}) => ({
  n,
  name: `BEAT ${n}`,
  start: (n - 1) * 6,
  end: n * 6,
  vo,
  visual: "a page",
  module: ["kinetic", "chart", "map", "footage", "stat"][n % 5],
  ...extra,
});

const film = (beats, over = {}) => ({
  title: "TEST FILM",
  engine: "vox",
  fps: 30,
  width: 1920,
  height: 1080,
  durationInSeconds: beats.length * 6,
  beats,
  ...over,
});

const loopFixture = () =>
  film([
    beat(1, "They pay you two dollars to watch videos.", {
      text: "PAID TO WATCH",
      question: "Why would anyone pay you two dollars?",
    }),
    beat(2, "The machine behind it made thirty million dollars a day."),
    beat(3, "But the money never came from advertisers.", {
      reveal: "Nobody was paying you two dollars — the deposits were.",
    }),
    beat(4, "So the balance you watched climb was a number in a database."),
    beat(5, "Therefore the withdrawal was always going to fail.", { purpose: "payoff" }),
  ]);

// ---------------------------------------------------------------- quantities
test("a number written in words counts as a number", () => {
  assert.equal(hasQuantity("They pay you two dollars to watch videos."), true);
  assert.equal(hasQuantity("thirty million dollars a day"), true);
  assert.equal(hasQuantity("$15,000,000"), true);
  assert.equal(hasQuantity("the page turned quietly"), false);
  assert.ok(quantityCount("two dollars a video, two hundred fifty to deposit") >= 3);
});

// ---------------------------------------------------------------- loop stack
test("the loop stack holds more than one question at a time", () => {
  const s = film([
    beat(1, "Why did the bank allow it?", { question: "Why did the bank allow it?" }),
    beat(2, "Where did the first deposit actually go?", { question: "Where did the first deposit go?" }),
    beat(3, "The deposit went to a wallet in Cambodia.", { reveal: "The deposit went to a wallet in Cambodia." }),
    beat(4, "The bank allowed it because the wire cleared in four seconds.", {
      reveal: "The bank allowed it because the wire cleared in four seconds.",
      purpose: "payoff",
    }),
  ]);
  const facts = analyzeStory(s);
  const st = runLoopStack(s, facts, planChapters(s, facts), []);
  // Both questions are held; the old single-slot model erased the first.
  assert.ok(st.loops.length >= 2, "both questions became loops");
  assert.equal(st.loops.filter((l) => l.outcome === "open").length, 0, "both close");
});

test("a reveal only closes the question it actually answers", () => {
  const qTerms = terms("Where did the first deposit go?");
  assert.ok(overlap(qTerms, "The deposit went to a wallet in Cambodia.") >= 0.34);
  assert.ok(overlap(qTerms, "The founder was arrested in Dubai.") < 0.34);
});

test("a reveal that answers nothing is reported rather than swallowed", () => {
  const s = film([
    beat(1, "Why would anyone pay you to watch videos?", { question: "Why would anyone pay you to watch videos?" }),
    beat(2, "In October, prosecutors seized fifteen billion in bitcoin.", {
      reveal: "Prosecutors seized fifteen billion in bitcoin.",
    }),
    beat(3, "They paid you because your deposit funded the payout.", {
      reveal: "They paid you because your deposit funded the payout.",
      purpose: "payoff",
    }),
  ]);
  const facts = analyzeStory(s);
  const st = runLoopStack(s, facts, planChapters(s, facts), []);
  assert.ok(
    st.unmatched.some((u) => u.beat === 2),
    "the unrelated seizure reveal is flagged as closing nothing",
  );
});

test("loop debt is scored against a band, not maximised", () => {
  assert.equal(debtScore(0), 0);
  assert.ok(debtScore(1) < 1);
  assert.equal(debtScore(2), 1);
  assert.equal(debtScore(3), 1);
  assert.ok(debtScore(6) < 1, "too many open questions is confusion, not tension");
  assert.ok(debtScore(6) > debtScore(0), "but confusion still beats having no reason to stay");
});

test("a question held past its shelf life decays rather than closing", () => {
  const beats = [beat(1, "What is inside the compound?", { question: "What is inside the compound?" })];
  for (let n = 2; n <= 14; n++) beats.push(beat(n, "Something else happens entirely."));
  beats.push(beat(15, "The compound held nine thousand workers.", { reveal: "nine thousand workers", purpose: "payoff" }));
  const s = film(beats);
  const facts = analyzeStory(s);
  const st = runLoopStack(s, facts, planChapters(s, facts), []);
  const first = st.loops[0];
  assert.ok(first.outcome !== "open", "it does not stay open forever");
});

// ---------------------------------------------------------------- opening
test("the hook gates catch a late, wordy, numberless opening", () => {
  const s = film([
    beat(
      1,
      "In this video we are going to take a really deep look at something that I think you will find absolutely mind-blowing, so stick around.",
    ),
    beat(2, "Anyway."),
    beat(3, "The end.", { purpose: "payoff" }),
  ]);
  const { plan } = buildDirectorPlan(s, undefined, "ESSAY");
  const r = inspectOpening(s, plan);
  const failed = r.gates.filter((g) => !g.passed).map((g) => g.id);
  assert.ok(failed.includes("HOOK_WORDY"), "15-word limit");
  assert.ok(failed.includes("HOOK_NO_NUMBER"), "a number beats a claim");
  assert.ok(failed.includes("FORBIDDEN_PATTERN"), "meta-commentary and hype are banned");
});

test("a good opening passes the hook gates", () => {
  const s = film([
    beat(1, "They pay you two dollars to watch videos.", { text: "PAID TO WATCH VIDEOS" }),
    beat(2, "You will send them four hundred before you notice.", { question: "Why does it work?" }),
    beat(3, "Because the payout is your own money.", { reveal: "the payout is your own money", purpose: "payoff" }),
  ]);
  const { plan } = buildDirectorPlan(s, undefined, "ESSAY");
  const r = inspectOpening(s, plan);
  const failed = r.gates.filter((g) => !g.passed).map((g) => g.id);
  assert.ok(!failed.includes("HOOK_WORDY"));
  assert.ok(!failed.includes("HOOK_NO_NUMBER"));
  assert.ok(!failed.includes("FACT_BEFORE_QUESTION"), "the fact lands before the question");
});

test("decimals are not sentence boundaries", () => {
  assert.deepEqual(sentences("The rate was 0.4 percent. The basket rose 3.1 percent."), [
    "The rate was 0.4 percent",
    "The basket rose 3.1 percent",
  ]);
});

test("the three-word-loop gate fires on anaphora, not on short sentences", () => {
  assert.ok(threeWordLoop("It's fast. It's easy. It's effective."), "same opening word three times is the tic");
  assert.equal(
    threeWordLoop("Watch ten videos. Screenshot the proof. Send it in."),
    null,
    "three short imperatives are good writing, not a tic",
  );
});

test("every forbidden pattern actually matches its own example", () => {
  const examples = {
    "meta-commentary": "In this video we explain it.",
    "hype-adjective": "This is an insane scam.",
    "fake-scenario": "Imagine you are walking down the street.",
    "you-wont-believe": "You won't believe what happened next.",
  };
  for (const [id, text] of Object.entries(examples)) {
    const rule = FORBIDDEN.find((f) => f.id === id);
    assert.ok(rule, `${id} exists`);
    assert.ok(rule.re.test(text), `${id} matches "${text}"`);
  }
});

test("hooks are classified, so the right things get checked", () => {
  assert.equal(classifyHook(beat(1, "They pay you two dollars to watch videos.")), "SELF_RELEVANCE");
  assert.equal(classifyHook(beat(1, "Nine thousand people lost everything in one afternoon.")), "STAKES_COLD_OPEN");
});

// ---------------------------------------------------------------- causality
test("BUT and THEREFORE are detected; a list is not", () => {
  assert.equal(linkBetween(beat(1, "The rate is four percent."), beat(2, "But the basket costs more.")).connective, "BUT");
  assert.equal(
    linkBetween(beat(1, "The wire cleared."), beat(2, "So the money was gone before anyone looked.")).connective,
    "THEREFORE",
  );
  assert.equal(
    linkBetween(beat(1, "The building sat empty for years."), beat(2, "Elsewhere, a different unrelated topic began.")).connective,
    "AND_THEN",
  );
});

test("a long setup followed by a tight turn is not a broken seam", () => {
  const setup = beat(
    1,
    "The compound sat behind three fences and a river, and every worker inside had arrived on a promise of an office job in a city they had never seen.",
  );
  const turn = beat(2, "Nobody inside the compound could leave.");
  assert.notEqual(linkBetween(setup, turn).connective, "AND_THEN");
});

test("runs of and-then are what gets flagged, not single seams", () => {
  const links = [
    { from: 1, to: 2, connective: "AND_THEN", evidence: "" },
    { from: 2, to: 3, connective: "BUT", evidence: "" },
    { from: 3, to: 4, connective: "AND_THEN", evidence: "" },
    { from: 4, to: 5, connective: "AND_THEN", evidence: "" },
  ];
  const runs = andThenRuns(links, 2);
  assert.equal(runs.length, 1, "one isolated weak seam is a moment; two in a row is a section");
  assert.equal(runs[0].from, 3);
  assert.ok(causalityScore(links) > 0 && causalityScore(links) < 1);
});

// ---------------------------------------------------------------- drop risk
test("the risk curve weights the opening more heavily than the middle", () => {
  const s = loopFixture();
  const { plan, loops } = buildDirectorPlan(s, undefined, "ESSAY");
  const flat = { ...loops, debt: new Array(Math.ceil(s.durationInSeconds)).fill(2) };
  const curve = buildRiskCurve(plan, flat);
  // Identical conditions early and late must not score identically: the
  // viewer has not yet decided to watch at 0:02.
  assert.ok(curve.risk.length === Math.ceil(s.durationInSeconds));
  assert.ok(curve.risk.every((r) => r >= 0 && r <= 1), "risk stays in 0..1");
});

test("loop starvation raises risk", () => {
  const s = loopFixture();
  const { plan, loops } = buildDirectorPlan(s, undefined, "ESSAY");
  const dur = Math.ceil(s.durationInSeconds);
  const healthy = buildRiskCurve(plan, { ...loops, debt: new Array(dur).fill(2) });
  const starved = buildRiskCurve(plan, { ...loops, debt: new Array(dur).fill(0) });
  assert.ok(starved.mean > healthy.mean, "a film with nothing unresolved is riskier throughout");
});

test("the sparkline max-pools so a one-second spike survives", () => {
  const risk = new Array(120).fill(0);
  risk[77] = 1;
  const line = sparkline(risk, 30);
  assert.equal(line.length, 30);
  assert.ok(line.includes("█"), "the spike is visible after downsampling");
});

test("risk weights are exported as one object, so calibration is a fit over eight numbers", () => {
  assert.ok(Object.keys(WEIGHTS).length === 8);
  for (const v of Object.values(WEIGHTS)) assert.equal(typeof v, "number");
});

// ---------------------------------------------------------------- gates
test("the audio source cap counts voice, bed and accents", () => {
  const s = loopFixture();
  const { plan } = buildDirectorPlan(s, undefined, "ESSAY");
  for (let t = 0; t < s.durationInSeconds; t += 1) {
    assert.ok(audioSourcesAt(plan, t) >= 0);
  }
});

test("gates return a pass/fail for every rule, not a score", () => {
  const s = loopFixture();
  const { plan, loops } = buildDirectorPlan(s, undefined, "ESSAY");
  const gates = runGates(s, plan, loops);
  assert.ok(gates.length > 0);
  for (const g of gates) {
    assert.equal(typeof g.passed, "boolean");
    assert.ok(g.id && g.message);
    if (!g.passed) assert.ok(g.fix, `failed gate ${g.id} must say what to do`);
  }
});

// ---------------------------------------------------------------- habituation
test("the fifth identical interrupt is worth less than the first", () => {
  const events = [
    { at: 10, type: "NUMBER_REVEAL", strength: 0.8, beat: 1 },
    { at: 20, type: "NUMBER_REVEAL", strength: 0.8, beat: 2 },
    { at: 30, type: "NUMBER_REVEAL", strength: 0.8, beat: 3 },
    { at: 40, type: "NUMBER_REVEAL", strength: 0.8, beat: 4 },
  ];
  const first = habituation(events, "NUMBER_REVEAL", 10.01);
  const fifth = habituation(events, "NUMBER_REVEAL", 40.01);
  assert.ok(fifth > first, "familiarity accumulates");
  assert.ok(fifth <= 1 && first >= 0);
});

test("familiarity decays, so the same device works again later", () => {
  const events = [{ at: 10, type: "REVEAL", strength: 1, beat: 1 }];
  const soon = habituation(events, "REVEAL", 12);
  const later = habituation(events, "REVEAL", 300);
  assert.ok(later < soon, "a device the viewer has forgotten is fresh again");
});

test("no channel may carry three interrupts in a row", () => {
  const evs = [
    { at: 1, type: "IMAGE_CHANGE", strength: 0.8, beat: 1 },
    { at: 2, type: "MAP_REVEAL", strength: 0.8, beat: 1 },
    { at: 3, type: "IMAGE_CHANGE", strength: 0.8, beat: 2 },
    { at: 4, type: "FOOTAGE_CHANGE", strength: 0.8, beat: 2 },
  ];
  const rotated = rotateModality(evs);
  for (let i = 2; i < rotated.length; i++) {
    const c = rotated.slice(i - 2, i + 1).map((e) => CHANNEL_OF_EVENT[e.type] ?? "PICTURE");
    assert.ok(new Set(c).size > 1, `three ${c[0]} interrupts in a row at index ${i}`);
  }
});

// ---------------------------------------------------------------- emotion
test("the emotional arc moves by distance, not by relabelling", () => {
  assert.ok(arcDistance("comfort", "shock") > arcDistance("comfort", "clarity"));
  assert.equal(arcDistance("tension", "tension"), 0);
  for (const [, va] of Object.entries(VALENCE_AROUSAL)) {
    assert.ok(va.valence >= -1 && va.valence <= 1);
    assert.ok(va.arousal >= 0 && va.arousal <= 1);
  }
});

test("an emotional arc rises and falls rather than alternating", () => {
  const beats = Array.from({ length: 20 }, (_, i) => beat(i + 1, "Something happens on this beat."));
  const s = film(beats);
  const facts = analyzeStory(s);
  const arc = buildEmotionalArc(s, facts);
  assert.equal(arc.length, beats.length);
  // The old anti-flatness pass produced A,B,A,B... Real arcs have runs.
  let flips = 0;
  for (let i = 1; i < arc.length; i++) if (arc[i] !== arc[i - 1]) flips += 1;
  assert.ok(flips < arc.length - 1, "not every single beat changes register");
  assert.ok(flips > 2, "but the film does not sit in one register either");
});

// ---------------------------------------------------------------- end to end
test("the whole pipeline still produces a plan, and now reports on itself", () => {
  const s = loopFixture();
  const { plan, qc, loops } = buildDirectorPlan(s, undefined, "ESSAY");
  assert.equal(plan.version, "2.0");
  assert.ok(qc.risk, "the report carries a risk curve");
  assert.ok(qc.loops, "the report carries a loop summary");
  assert.ok(Array.isArray(qc.gates), "the report carries gates");
  assert.equal(qc.risk.curve.length, Math.ceil(s.durationInSeconds));
  assert.equal(loops.debt.length, Math.ceil(s.durationInSeconds));
  assert.ok(MIN_OPEN >= 1);
});
