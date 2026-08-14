// engine/qa/screenshot.mjs — render each V2 SVG to a PNG via headless Edge.
// Usage: node engine/qa/screenshot.mjs [scene numbers...]  (default: all 54)
// Output: video/out/vectors-v2/shots/NN-title.png

import { mkdirSync, writeFileSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { SCENES } from "../scenes/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SHOTS = join(root, "video/out/vectors-v2/shots");
mkdirSync(SHOTS, { recursive: true });

const EDGE = ["C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"]
  .find((p) => existsSync(p));

if (!EDGE) { console.error("Edge not found"); process.exit(1); }

const want = process.argv.slice(2).map(Number).filter(Boolean);
const targets = want.length ? SCENES.filter((s) => want.includes(s.num)) : SCENES;

const svgWrap = (inner) =>
  `<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

const renderOne = (scene, i) =>
  new Promise((resolve) => {
    const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800;900&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>html,body{margin:0;padding:0;background:#000}</style></head>
<body>${svgWrap(scene.build())}</body></html>`;
    const htmlPath = join(SHOTS, `_tmp-${scene.num}.html`);
    const pngPath = join(SHOTS, `${String(scene.num).padStart(2, "0")}-${scene.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.png`);
    writeFileSync(htmlPath, html);
    const child = spawn(EDGE, [
      "--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
      `--window-size=1920,1080`, `--screenshot=${pngPath}`, `file:///${htmlPath.replace(/\\/g, "/")}`,
    ], { stdio: "ignore" });
    child.on("exit", () => {
      try { unlinkSync(htmlPath); } catch {}
      resolve();
    });
    setTimeout(resolve, 20000);
  });

const main = async () => {
  for (let i = 0; i < targets.length; i++) {
    await renderOne(targets[i], i);
    process.stdout.write(`\r${i + 1}/${targets.length} rendered`);
  }
  console.log(`\ndone → ${SHOTS}`);
};
main();