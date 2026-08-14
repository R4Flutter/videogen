// Story preflight — the hard gate before any render.
//
// A structural mistake in a story costs a full render cycle (1-4 h) plus a
// TTS run, so this runs inside render-business.mjs BEFORE tsc and refuses
// to start: every check is a numbered hard failure (or a named warning that
// must be read, not ignored).
//
//   node --experimental-strip-types tools/story-preflight.mjs \
//       video/src/mcd/stories/companySellsNothingStory.json
//
// With no path: preflights every registered story and fails if any one
// fails. Exit code 0 = safe to render, 1 = fix the story first.
//
// Checks:
//   1. JSON parses; id / title / brand / theme / hero present.
//   2. Scene count matches the story's declaredSceneCount (when set).
//   3. Every scene: unique id, known type, narration (1-2 lines), a camera
//      move, and valid per-type data (the engine's own validators).
//   4. Narration fit: narration + hold must fit the scene's applied cap
//      (8 s, edit.maxSec, or the long-form cap). A scene that cannot hold
//      its own narration is a reword-first signal, not a stretch-at-mux.
//   5. Assets: hero.src and backdrops paths exist under video/public.
//   6. Runtime: the derived timeline must land near the story's targetSec
//      (when declared); a cut under 60% of target is a failed render.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTimeline } from "../video/src/mcd/data/timeline.ts";
import { sceneCues } from "../video/src/mcd/data/cues.ts";
import { SCENE_VALIDATORS, validateEdit } from "../video/src/mcd/data/validators.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "video", "public");
const FPS = 30;
const MAX_NARRATION_LINES = 2;

const storyFiles = () => {
  const out = [join(root, "video/src/mcd/data/businessStory.json")];
  const dir = join(root, "video/src/mcd/stories");
  for (const f of readdirSync(dir)) {
    if (f.endsWith(".json") && !f.endsWith(".timeline.json")) out.push(join(dir, f));
  }
  return out;
};

const words = (text) => text.join(" ").split(/\s+/).filter(Boolean).length;

const checkAsset = (src) => {
  if (!src) return null;
  const p = join(publicDir, src.replace(/^\//, ""));
  return existsSync(p) ? null : `asset "${src}" not found under video/public (want ${p})`;
};

const run = (storyPath) => {
  const errors = [];
  const warnings = [];

  let raw;
  try {
    raw = JSON.parse(readFileSync(storyPath, "utf8"));
  } catch (err) {
    return { storyPath, errors: [`story JSON does not parse: ${err.message}`], warnings: [] };
  }
  const s = raw;
  const where = `[${s.id ?? storyPath}]`;

  // 1. Story envelope ------------------------------------------------------
  const need = (v, what) => {
    if (v === undefined || v === null || v === "") errors.push(`${where} missing "${what}"`);
  };
  need(s.id, "id");
  need(s.title, "title");
  need(s.brand, "brand");
  need(s.hero?.width, "hero.width");
  need(s.hero?.height, "hero.height");
  need(s.theme?.accent, "theme.accent");
  need(s.theme?.accentSecondary, "theme.accentSecondary");

  if (s.longForm !== undefined && typeof s.longForm !== "boolean") {
    errors.push(`${where} longForm must be a boolean`);
  }
  if (s.targetSec !== undefined && (typeof s.targetSec !== "number" || s.targetSec <= 0)) {
    errors.push(`${where} targetSec must be a positive number of seconds`);
  }

  // 2. Scene count ---------------------------------------------------------
  if (!Array.isArray(s.scenes) || s.scenes.length === 0) {
    errors.push(`${where} scenes[] is empty or missing`);
  }
  if (typeof s.declaredSceneCount === "number" && s.scenes.length !== s.declaredSceneCount) {
    errors.push(
      `${where} declared ${s.declaredSceneCount} scenes but the story stages ` +
        `${s.scenes.length} — an act may be missing`,
    );
  }

  const capFor = (scene, longForm, startSec) => {
    const modeMax = longForm ? 25 : 8;
    let cap = longForm && startSec >= 180 ? 25 : 8;
    if (scene.edit?.maxSec !== undefined) {
      cap = Math.max(cap, Math.min(modeMax, scene.edit.maxSec));
    }
    return cap;
  };

  // The engine's own timeline (also used for the runtime check below) gives
  // the real start times — the progressive long-form cap keys off them.
  let timeline = null;
  if (Array.isArray(s.scenes) && s.scenes.length && !errors.length) {
    try {
      timeline = buildTimeline(s, FPS);
    } catch (err) {
      errors.push(`${where} timeline engine threw: ${err.message}`);
    }
  }

  // 3-5. Per-scene checks --------------------------------------------------
  const seen = new Set();
  s.scenes.forEach((scene, i) => {
    const tag = `${where} scene ${i + 1} "${scene.id ?? "(no id)"}"`;

    if (!scene || typeof scene.id !== "string" || !scene.id) {
      errors.push(`${tag}: missing id`);
      return;
    }
    if (seen.has(scene.id)) {
      errors.push(`${tag}: staged twice`);
    }
    seen.add(scene.id);

    const type = scene.type;
    if (typeof type !== "string" || !(type in SCENE_VALIDATORS)) {
      errors.push(`${tag}: unknown scene type "${String(type)}"`);
      return;
    }
    if (!scene.edit?.camera) {
      warnings.push(
        `${tag}: no edit.camera — the director's deterministic pickMove will assign one ` +
          `(pin one per scene when the story needs a specific move)`,
      );
    }
    const editProblem = validateEdit(scene.edit);
    if (editProblem) errors.push(`${tag}: ${editProblem}`);

    const narr = scene.narration;
    if (!Array.isArray(narr) || narr.length === 0 || !narr.some((n) => n.trim())) {
      errors.push(`${tag}: narration missing — narration drives the duration`);
    } else if (narr.length > MAX_NARRATION_LINES) {
      warnings.push(
        `${tag}: ${narr.length} narration lines — more than the ${MAX_NARRATION_LINES}-line readability rule`,
      );
    }

    const problem = SCENE_VALIDATORS[type]?.(scene.data);
    if (problem) errors.push(`${tag}: ${problem}`);

    // 4. Narration fit: the narration + hold must fit the scene's own cap.
    //    A scene that cannot hold its words is a reword-first signal — the
    //    mux can only stretch so far before a take sounds stretched.
    if (Array.isArray(narr) && narr.some((n) => n.trim()) && s.wpm) {
      const narrSec = (words(narr) / s.wpm) * 60;
      const hold = scene.hold ?? scene.edit?.holdSec ?? 0.5;
      const startSec = timeline?.scenes[i]?.startSec ?? 0;
      const cap = capFor(scene, s.longForm === true, startSec);
      const window = Math.min(cap, narrSec + hold);
      if (narrSec > window + 0.05) {
        errors.push(
          `${tag}: narration needs ${narrSec.toFixed(2)}s at ${s.wpm} wpm but the ` +
            `${cap}s cap (window ${window.toFixed(2)}s incl. ${hold}s hold) cannot fit it — ` +
            `re-word the narration (or raise edit.maxSec / story.longForm)`,
        );
      } else if (narrSec > cap) {
        warnings.push(
          `${tag}: narration needs ${narrSec.toFixed(2)}s in a ${cap}s cap — the take will ` +
            `be atempo-fitted close to the limit`,
        );
      }
    }

    try {
      sceneCues(scene, s.wpm);
    } catch (err) {
      errors.push(`${tag}: cue grammar threw: ${err.message}`);
    }
  });

  // 5. Assets --------------------------------------------------------------
  if (typeof s.hero?.src === "string") {
    const bad = checkAsset(s.hero.src);
    if (bad) errors.push(`${where} ${bad}`);
  }
  for (const [sceneType, src] of Object.entries(s.backdrops ?? {})) {
    const bad = checkAsset(src);
    if (bad) errors.push(`${where} backdrops.${sceneType}: ${bad}`);
  }

  // 6. Runtime vs the script's target --------------------------------------
  if (timeline) {
    if (typeof s.targetSec === "number") {
      const ratio = timeline.totalSeconds / s.targetSec;
      if (ratio < 0.6) {
        errors.push(
          `${where} runtime ${timeline.totalSeconds.toFixed(0)}s is ${(ratio * 100).toFixed(0)}% of the ` +
            `${s.targetSec}s target — the script's runtime is unreachable; the cut would ` +
            `drop whole acts`,
        );
      } else if (Math.abs(timeline.totalSeconds - s.targetSec) / s.targetSec > 0.12) {
        warnings.push(
          `${where} runtime ${timeline.totalSeconds.toFixed(0)}s drifts ` +
            `${(Math.abs(timeline.totalSeconds - s.targetSec) / s.targetSec * 100).toFixed(0)}% from the ` +
            `${s.targetSec}s target`,
        );
      }
    }
    for (const w of timeline.warnings) {
      errors.push(`${where} timeline: ${w}`);
    }
    for (const n of timeline.notices) {
      warnings.push(`${where} ${n}`);
    }
  }

  return { storyPath, errors, warnings };
};

const main = () => {
  const arg = process.argv[2];
  const targets = arg ? [join(process.cwd(), arg)] : storyFiles();
  let failed = 0;

  for (const p of targets) {
    const { storyPath, errors, warnings } = run(p);
    const label = storyPath.replace(/^.*[\\/]/, "");
    for (const w of warnings) console.log(`  note ${w}`);
    if (errors.length) {
      failed++;
      console.error(`FAIL ${label}`);
      errors.forEach((e, i) => console.error(`  ${i + 1}. ${e}`));
    } else {
      console.log(`OK   ${label}${warnings.length ? ` (${warnings.length} notes)` : ""}`);
    }
  }
  if (failed) {
    console.error(`\n[story-preflight] ${failed} story(ies) failed — fix the story, not the engine.`);
    process.exitCode = 1;
  } else {
    console.log(`[story-preflight] all ${targets.length} story(ies) passed — render is safe to start.`);
  }
};

main();
