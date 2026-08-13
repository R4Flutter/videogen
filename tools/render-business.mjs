// Renders a business story by id. Usage:
//   node ../tools/render-business.mjs <storyId> [outPath]
// Validates every registered story first (fails loudly), then renders the
// requested composition. With no id, lists the registered stories.
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const storiesDir = join(root, "src", "mcd", "stories");

const listStories = () => {
  const files = existsSync(storiesDir)
    ? readFileSync(join(storiesDir, "index.ts"), "utf8")
    : "";
  const ids = [...files.matchAll(/from "\.\/([a-zA-Z0-9-]+)BusinessStory\.json"/g)]
    .map((m) => m[1])
    .sort();
  return ids;
};

const validate = (): void => {
  execSync("npx tsc --noEmit", { cwd: root, stdio: "inherit" });
};

const main = () => {
  const id = process.argv[2];
  if (!id) {
    console.log("Registered stories:");
    for (const s of listStories()) console.log(`  ${s}BusinessStory`);
    process.exit(0);
  }
  const ids = listStories();
  const exact = ids.map((s) => `${s}BusinessStory`);
  if (!exact.includes(id)) {
    console.error(`[render-business] unknown story "${id}". Registered: ${exact.join(", ")}`);
    process.exit(1);
  }
  validate();
  const out = process.argv[3] ?? join(root, "out", `${id}.mp4`);
  console.log(`[render-business] rendering ${id} -> ${out}`);
  execSync(`npx remotion render ${id} ${out}`, { cwd: root, stdio: "inherit" });
  console.log(`[render-business] done: ${out}`);
};

main();