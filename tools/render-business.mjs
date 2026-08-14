// Renders a business story by id. Usage:
//   node ../tools/render-business.mjs <storyId> [outPath]
// Validates every registered story first (fails loudly), derives the story's
// timeline JSON (the same engine Remotion uses), then renders the requested
// composition. With no id, lists the registered stories.
//
// After the render: run mcd-voice.py (takes + narration mix), then
// mcd-mux.py to lay music/SFX over the silent cut — both read the timeline
// JSON this script writes.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const videoDir = join(root, "video");

const storyJsonPaths = () => {
  const paths = [join(videoDir, "src", "mcd", "data", "businessStory.json")];
  const storiesDir = join(videoDir, "src", "mcd", "stories");
  if (existsSync(storiesDir)) {
    for (const f of readdirSync(storiesDir)) {
      if (f.endsWith(".json")) paths.push(join(storiesDir, f));
    }
  }
  return paths;
};

const stories = () => {
  const out = [];
  for (const p of storyJsonPaths()) {
    try {
      const s = JSON.parse(readFileSync(p, "utf8"));
      out.push({ id: s.id, path: p });
    } catch {
      // a story that does not parse fails loudly in the validate step
    }
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
};

const validate = (): void => {
  execSync("npx tsc --noEmit", { cwd: videoDir, stdio: "inherit" });
};

const deriveTimeline = (storyPath: string): void => {
  execSync(
    `node --experimental-strip-types --no-warnings tools/mcd-timeline.mjs ${storyPath}`,
    { cwd: videoDir, stdio: "inherit" },
  );
};

const main = () => {
  const id = process.argv[2];
  if (!id) {
    console.log("Registered stories:");
    for (const s of stories()) console.log(`  ${s.id}`);
    process.exit(0);
  }
  const entry = stories().find((s) => s.id === id);
  if (!entry) {
    console.error(`[render-business] unknown story "${id}". Registered: ${stories().map((s) => s.id).join(", ")}`);
    process.exit(1);
  }
  validate();
  deriveTimeline(entry.path);
  const out = process.argv[3] ?? join(videoDir, "out", `${id}.mp4`);
  console.log(`[render-business] rendering ${id} -> ${out}`);
  execSync(`npx remotion render ${id} ${out}`, { cwd: videoDir, stdio: "inherit" });
  console.log(`[render-business] done: ${out}`);
  console.log(`[render-business] next: voice takes + narration mix, then mcd-mux.py --story ${entry.path}`);
};

main();
