// Derives a story's timeline in node: reads a story JSON, runs the same pure
// engine Remotion uses (src/mcd/data/timeline.ts + cues.ts), and writes the
// timeline + cue list to <story-id>.timeline.json for the Python tools
// (mcd-voice.py places narration, mcd-mux.py places music/SFX — neither ever
// hardcodes a frame number again).
//
//   node --experimental-strip-types --no-warnings tools/mcd-timeline.mjs \
//       video/src/mcd/stories/forexLamboBusinessStory.json
//
// With no story path, runs every registered story and prints a QC report.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTimeline } from "../video/src/mcd/data/timeline.ts";
import { sceneCues } from "../video/src/mcd/data/cues.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FPS = 30;

const storiesDir = join(root, "video/src/mcd/stories");
const STORIES = [
  join(root, "video/src/mcd/data/businessStory.json"),
  join(storiesDir, "appleBusinessStory.json"),
  join(storiesDir, "forexLamboBusinessStory.json"),
];

const run = (storyPath) => {
  const story = JSON.parse(readFileSync(storyPath, "utf8"));
  const timeline = buildTimeline(story, FPS);
  const scenes = timeline.scenes.map((tl, i) => {
    const scene = story.scenes[i];
    return {
      ...tl,
      cues: sceneCues(scene).map((c) => ({
        cue: c.cue,
        frame: tl.startFrame + Math.round(c.rel * tl.durationInFrames),
        sec: (tl.startFrame + Math.round(c.rel * tl.durationInFrames)) / FPS,
      })),
    };
  });
  const out = {
    storyId: story.id,
    fps: FPS,
    wpm: timeline.wpm,
    totalSeconds: timeline.totalSeconds,
    totalFrames: timeline.totalFrames,
    cutsPerMinute: timeline.cutsPerMinute,
    scenes,
    warnings: timeline.warnings,
  };
  const dst = join(dirname(storyPath), `${story.id}.timeline.json`);
  writeFileSync(dst, JSON.stringify(out, null, 2) + "\n", "utf8");
  return { path: storyPath, out };
};

const report = (result) => {
  const { out } = result;
  const line = (s) => console.log(`  ${s}`);
  console.log(`\n${out.storyId}  —  ${out.totalSeconds.toFixed(1)}s @ ${out.wpm} wpm, ${out.cutsPerMinute.toFixed(1)} cuts/min`);
  for (const s of out.scenes) {
    line(`${s.id.padEnd(10)} ${s.type.padEnd(8)} ${s.durationSec.toFixed(2)}s  (${s.startSec.toFixed(2)}-${(s.startSec + s.durationSec).toFixed(2)})  cues: ${s.cues.map((c) => c.cue).join(", ")}`);
  }
  for (const w of out.warnings) line(`QC ${w}`);
  if (!out.warnings.length) line("QC clean");
};

const main = () => {
  const arg = process.argv[2];
  if (arg) {
    const p = join(process.cwd(), arg);
    const result = run(p);
    writeFileSync(join(process.cwd(), "mcd-timeline.json"), JSON.stringify(result.out, null, 2) + "\n", "utf8");
    console.log(`[mcd-timeline] ${result.out.storyId} -> ${join(process.cwd(), "mcd-timeline.json")}`);
    report(result);
    return;
  }
  let failed = 0;
  for (const p of STORIES) {
    try {
      const result = run(p);
      report(result);
      if (result.out.warnings.length) failed++;
    } catch (err) {
      failed++;
      console.error(`[mcd-timeline] FAILED ${p}\n${err.message}`);
    }
  }
  if (failed) {
    console.error(`\n[mcd-timeline] ${failed} story(ies) produced QC warnings — fix the stories, not the engine.`);
    process.exitCode = 1;
  }
};

main();