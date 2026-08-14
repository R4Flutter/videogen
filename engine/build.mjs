// engine/build.mjs — generate the V2 storyboard HTML (same document format
// as V1: header, h2 sections, .grid, .card, .cap) + split standalone SVGs.

import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SECTIONS, SCENE_COUNT } from "./scenes/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "video/out/vectors-v2");
const SVG_DIR = join(OUT, "svg");

const W = 1920, H = 1080;

// full svg wrapper — semantic id per scene, self-contained
const svgWrap = (id, inner) =>
  `<svg viewBox="0 0 ${W} ${H}" id="scene-${id}" xmlns="http://www.w3.org/2000/svg" role="img">${inner}</svg>`;

const cap = (scene) =>
  `<div class="cap"><b>${scene.num}. ${scene.title}</b><span>${scene.cap}</span></div>`;

const card = (scene) => `<div class="card">${svgWrap(scene.num, scene.build())}${cap(scene)}</div>`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>The Company That Sells You Nothing — vector storyboard (V2)</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800;900&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  body { margin: 0; background: #F4F1EA; color: #1A1A1A; font-family: 'Archivo', Arial, Helvetica, sans-serif; }
  header { padding: 28px 32px 12px; border-bottom: 3px solid #1A1A1A; }
  header h1 { margin: 0; font-size: 26px; letter-spacing: -0.5px; }
  header p { margin: 6px 0 0; color: #55524C; font-size: 13px; }
  h2 { margin: 34px 28px 12px; font-size: 15px; text-transform: uppercase; letter-spacing: 2px; color: #16A34A; border-bottom: 1px solid #C8C2B6; padding-bottom: 6px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 18px; padding: 0 28px 40px; }
  .card { background: #fff; border: 1px solid #D8D2C6; border-radius: 8px; overflow: hidden; }
  .card svg { display: block; width: 100%; height: auto; }
  .cap { padding: 8px 12px 10px; font-size: 12.5px; }
  .cap b { display: block; font-size: 13px; margin-bottom: 2px; }
  .cap span { color: #55524C; }
  .k { color: #16A34A; }
</style>
</head>
<body>
<header>
  <h1>THE COMPANY THAT SELLS YOU NOTHING</h1>
  <p>Full-script vector storyboard · V2 engine · house palette cream <span class="k">#F4F1EA</span> / ink #1A1A1A / green #16A34A / gold #F5C518 · every <span class="k">[VISUAL]</span> beat, engine-generated editorial vectors · Archivo + IBM Plex Mono · 19:14 runtime, 170 wpm</p>
</header>
${SECTIONS.map((s) => `<h2>${esc(s.heading)}</h2>\n<div class="grid">\n${s.scenes.map(card).join("\n")}\n</div>`).join("\n")}
<footer style="padding: 8px 28px 30px; font-size: 12px; color: #8A867E; border-top: 1px solid #C8C2B6;">
  Full-script vector storyboard (V2) · The Company That Sells You Nothing · house style: cream paper / ink linework / green accent / gold highlight · engine-generated, no raster assets required.
</footer>
</body>
</html>`;

mkdirSync(OUT, { recursive: true });
mkdirSync(SVG_DIR, { recursive: true });

writeFileSync(join(OUT, "company-sells-nothing-storyboard.html"), html);

// standalone SVGs, mirroring V1 naming: NN-{kebab-title}.svg
const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
let written = 0;
for (const section of SECTIONS) {
  for (const scene of section.scenes) {
    const name = `${String(scene.num).padStart(2, "0")}-${scene.num}-${kebab(scene.title)}.svg`;
    writeFileSync(join(SVG_DIR, name), svgWrap(scene.num, scene.build()) + "\n");
    written++;
  }
}

console.log(`V2 storyboard written to video/out/vectors-v2/company-sells-nothing-storyboard.html`);
console.log(`${written} standalone SVGs written to video/out/vectors-v2/svg/`);
console.log(`scene count: ${SCENE_COUNT}`);

// quick structural sanity: every svg parses, has viewBox, no external refs
import { parse } from "./qa/structural.mjs";
const { errors } = parse(html);
if (errors.length) {
  console.error("STRUCTURAL ERRORS:", errors);
  process.exit(1);
}
console.log("structural check: PASS");