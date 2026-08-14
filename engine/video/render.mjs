// engine/video/render.mjs — render the V2 storyboard to a single MP4.
//
// Pipeline:
//   1. compute per-scene durations from section timecodes + cap hints
//   2. ensure 1920x1080 PNG frames exist (uses engine/qa/screenshot.mjs logic)
//   3. encode one clip per scene (zoompan on "push in" beats, static otherwise)
//   4. concat all clips → video/out/vectors-v2/video/company-sells-nothing-storyboard.mp4

import { mkdirSync, writeFileSync, existsSync, readFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { SECTIONS, SCENES } from "../scenes/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SHOTS = join(root, "video/out/vectors-v2/shots");
const CLIPS = join(root, "video/out/vectors-v2/clips");
const OUT_DIR = join(root, "video/out/vectors-v2/video");
mkdirSync(CLIPS, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const FPS = 30;

// section timecodes (in seconds) — from the storyboard header
const SECTION_TC = [0, 40, 95, 390, 725, 915, 1055, 1154]; // ends at 19:14

// scenes that explicitly say "push in" / "slow scroll" / "zoom"
const ZOOM_BEATS = new Set([8, 39, 48, 53]);

const holdHint = (cap) => {
  let m = cap.match(/hold (\d+(?:\.\d+)?) ?s/i);
  if (!m) m = cap.match(/(\d+(?:\.\d+)?)-second beat/i);
  if (!m) m = cap.match(/(\d+(?:\.\d+)?) seconds? of/i);
  return m ? parseFloat(m[1]) : 0;
};

// per-scene durations that sum exactly to each section's timecode span
const computeDurations = () => {
  const perScene = [];
  SECTIONS.forEach((section, si) => {
    const start = SECTION_TC[si], end = SECTION_TC[si + 1];
    const span = end - start;
    const n = section.scenes.length;
    const base = span / n;
    // explicit holds get at least their hint, others share the rest
    const hints = section.scenes.map((s) => holdHint(s.cap));
    const hinted = hints.map((h) => Math.max(h, base * 0.75));
    const sumH = hinted.reduce((a, b) => a + b, 0);
    const scale = span / sumH;
    section.scenes.forEach((scene, i) => {
      perScene.push({ scene, dur: +(hinted[i] * scale).toFixed(2) });
    });
  });
  const total = perScene.reduce((a, p) => a + p.dur, 0);
  console.log(`total duration: ${(total / 60).toFixed(1)} min (target 19:14)`);
  return perScene;
};

// render a PNG frame for each scene (idempotent)
const ensureFrames = () => {
  const EDGE = ["C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"]
    .find((p) => existsSync(p));
  if (!EDGE) throw new Error("Edge not found for frame rendering");

  const svgWrap = (inner) =>
    `<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

  for (const scene of SCENES) {
    const png = join(SHOTS, `${String(scene.num).padStart(2, "0")}-${scene.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.png`);
    if (existsSync(png)) continue;
    const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800;900&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>html,body{margin:0;padding:0;background:#000}</style></head>
<body>${svgWrap(scene.build())}</body></html>`;
    const htmlPath = join(SHOTS, `_tmp-${scene.num}.html`);
    writeFileSync(htmlPath, html);
    const r = spawnSync(EDGE, [
      "--headless", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
      `--window-size=1920,1080`, `--screenshot=${png}`, `file:///${htmlPath.replace(/\\/g, "/")}`,
    ], { stdio: "ignore", timeout: 30000 });
    try { unlinkSync(htmlPath); } catch {}
    if (!existsSync(png)) throw new Error(`failed to render scene ${scene.num}`);
    process.stdout.write(`.`);
  }
  console.log(`\nframes ready: ${SCENES.length}`);
};

const shotName = (scene) =>
  join(SHOTS, `${String(scene.num).padStart(2, "0")}-${scene.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}.png`);

const encodeClips = (plan) => {
  for (const { scene, dur } of plan) {
    const png = shotName(scene);
    const clip = join(CLIPS, `clip-${String(scene.num).padStart(2, "0")}.mp4`);
    if (existsSync(clip)) continue;
    const frames = Math.round(dur * FPS);
    let vf = "";
    let args;
    if (ZOOM_BEATS.has(scene.num)) {
      // slow push-in: zoom 1.0 → ~1.12 over the scene (single-image zoompan)
      vf = `zoompan=z='1+0.12*on/${frames}':d=${frames}:s=1920x1080:fps=${FPS}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`;
      args = [
        "-y", "-i", png, "-vf", vf,
        "-t", dur.toFixed(2),
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-an", clip,
      ];
    } else {
      vf = `scale=1920:1080`;
      args = [
        "-y", "-loop", "1", "-t", dur.toFixed(2), "-i", png,
        "-vf", vf, "-r", FPS,
        "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
        "-an", clip,
      ];
    }
    const r = spawnSync("ffmpeg", args, { stdio: "ignore", timeout: 600000 });
    if (r.status !== 0) throw new Error(`ffmpeg failed on scene ${scene.num}`);
    process.stdout.write(`.`);
  }
  console.log(`\nclips ready: ${plan.length}`);
};

const concat = (plan) => {
  const listPath = join(CLIPS, "concat.txt");
  writeFileSync(listPath, plan.map(({ scene }) =>
    `file 'clip-${String(scene.num).padStart(2, "0")}.mp4'`).join("\n"));
  const out = join(OUT_DIR, "company-sells-nothing-storyboard.mp4");
  const r = spawnSync("ffmpeg", [
    "-y", "-f", "concat", "-safe", "0", "-i", listPath,
    "-c", "copy", "-movflags", "+faststart", out,
  ], { stdio: "ignore", timeout: 300000 });
  if (r.status !== 0) throw new Error("concat failed");
  console.log(`\nMP4 written: ${out}`);
};

const main = () => {
  const plan = computeDurations();
  ensureFrames();
  encodeClips(plan);
  concat(plan);
};
main();