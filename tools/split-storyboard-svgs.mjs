// Splits the storyboard HTML into one standalone SVG per scene.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "video/out/vectors/company-sells-nothing-storyboard.html"), "utf8");

const svgs = html.match(/<svg[\s\S]*?<\/svg>/g);
const caps = [...html.matchAll(/<div class="cap"><b>([^<]+)<\/b>/g)].map((m) => m[1]);

const dir = join(root, "video/out/vectors/svg");
mkdirSync(dir, { recursive: true });

svgs.forEach((svg, i) => {
  const name = (caps[i] ?? `scene-${i + 1}`)
    .replace(/[^\w\- ]+/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  writeFileSync(join(dir, `${String(i + 1).padStart(2, "0")}-${name}.svg`), svg);
});

console.log(`wrote ${svgs.length} SVGs to ${dir}`);
