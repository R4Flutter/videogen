// tools/review.mjs — the eye. The engine looks at its own frames.
//
//   node --experimental-strip-types tools/review.mjs [--frames dir] [--sample 1]
//   node --experimental-strip-types tools/review.mjs --render   (renders stills first)
//
// Every QC check in this repository reads the *plan*. None of them has ever
// read a pixel. That is a real gap and not a subtle one: a human editor watches
// the cut, and the single most common way an automated video fails is that a
// caption sits on a light patch of a photograph and nobody ever looked.
//
// This samples one frame per beat plus every reveal frame, and runs the checks
// that are actually measurable on an image. Nothing here is taste:
//
//   contrast     WCAG-style luminance ratio between caption pixels and the
//                background they land on. Legibility is a *persuasion*
//                concern, not an aesthetic one — processing fluency raises
//                perceived truth, so an unreadable frame is a less believed
//                frame.
//   safe area    content inside the title-safe box, so nothing is clipped by
//                a phone's rounded corners or a TV's overscan.
//   stasis       perceptual distance between consecutive samples. Two frames
//                that are nearly identical are a stretch where nothing is
//                happening, which is what the drop-risk curve calls visual
//                stasis and what a viewer calls boring.
//   thumbnail    downscale to 320×180 and check the frame still resolves.
//                If the hero frame doesn't read at thumbnail size it cannot
//                be the thumbnail, and the thumbnail is half the outcome.
//
// PNG decoding is done here rather than with a dependency: Remotion writes
// non-interlaced RGBA/RGB PNGs, zlib is in Node's stdlib, and adding an image
// library to a repo that has carefully avoided one would be rude.
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inflateSync } from "node:zlib";
import { execFileSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : d;
};
const hasFlag = (n) => process.argv.includes(n);

/** Resolve against the repo root unless the caller gave an absolute path. */
const resolve = (p) => (p.startsWith("/") || /^[A-Za-z]:[\\/]/.test(p) ? p : join(root, p));

const FRAMES = resolve(arg("--frames", "video/out/frames"));
const PLAN = resolve(arg("--plan", "video/src/director-plan.json"));

// ------------------------------------------------------------------ png
/** Minimal PNG reader: IHDR + IDAT, non-interlaced, 8-bit RGB/RGBA/grey. */
const readPng = (path) => {
  const buf = readFileSync(path);
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error(`${path} is not a PNG`);
  let off = 8;
  let width = 0, height = 0, depth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      depth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  if (depth !== 8 || interlace !== 0) throw new Error(`${path}: only 8-bit non-interlaced PNG supported`);
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new Error(`${path}: unsupported colour type ${colorType}`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= channels ? prev[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  return { width, height, channels, data: out };
};

// ------------------------------------------------------------------ colour
/** Relative luminance, sRGB → linear, per WCAG. */
const luminance = (r, g, b) => {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};

const contrastRatio = (l1, l2) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

const px = (img, x, y) => {
  const i = (y * img.width + x) * img.channels;
  const d = img.data;
  if (img.channels === 1) return [d[i], d[i], d[i]];
  if (img.channels === 2) return [d[i], d[i], d[i]];
  return [d[i], d[i + 1], d[i + 2]];
};

// ------------------------------------------------------------------ checks
/**
 * Text legibility, without knowing where the text is.
 *
 * Finding glyphs in a bitmap properly needs OCR. What we can do instead is
 * find the frame's high-frequency regions — text is by far the highest-
 * frequency content in a Vox-style frame — and measure the local contrast
 * there. A tile whose detail sits on a background it barely differs from is a
 * tile a viewer has to work to read, whatever is written on it.
 */
const legibility = (img, tile = 48) => {
  const cols = Math.floor(img.width / tile);
  const rows = Math.floor(img.height / tile);
  const worst = { ratio: Infinity, x: 0, y: 0 };
  let textyTiles = 0;

  const step = 2;
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      let min = 1, max = 0, sum = 0, n = 0, edges = 0, pairs = 0;
      let prevRow = null;
      for (let y = ty * tile; y < (ty + 1) * tile; y += step) {
        const row = [];
        for (let x = tx * tile; x < (tx + 1) * tile; x += step) {
          const [r, g, b] = px(img, x, y);
          const l = luminance(r, g, b);
          row.push(l);
          if (l < min) min = l;
          if (l > max) max = l;
          sum += l;
          n++;
        }
        // Text is defined by how *often* luminance reverses across a tile,
        // not by how far it travels. Keying detection off spread was a
        // circular test: low-contrast text has, by definition, low spread, so
        // the one case the check exists to catch was the one case it could
        // never see. Counting sign changes finds the glyph edges whatever
        // their amplitude, and the amplitude is then what gets *reported*.
        for (let i = 1; i < row.length; i++) {
          pairs++;
          if (Math.abs(row[i] - row[i - 1]) > 0.012) edges++;
        }
        if (prevRow) {
          for (let i = 0; i < row.length && i < prevRow.length; i++) {
            pairs++;
            if (Math.abs(row[i] - prevRow[i]) > 0.012) edges++;
          }
        }
        prevRow = row;
      }
      if (!n || !pairs) continue;
      const mean = sum / n;
      const density = edges / pairs;
      // 8%–75% of adjacent samples differing is the signature of type or fine
      // graphic detail. Below that it is a flat field; above it is grain or
      // dense photography, where a contrast ratio is not a meaningful number.
      const texty = density > 0.08 && density < 0.75 && mean > 0.02 && mean < 0.98;
      if (!texty) continue;
      textyTiles++;
      const ratio = contrastRatio(max, min);
      if (ratio < worst.ratio) {
        worst.ratio = ratio;
        worst.x = tx * tile;
        worst.y = ty * tile;
      }
    }
  }
  return { worst: worst.ratio === Infinity ? null : worst, detailTiles: textyTiles };
};

/** Content outside the title-safe box (inner 90%). */
const safeArea = (img, margin = 0.05) => {
  const mx = Math.floor(img.width * margin);
  const my = Math.floor(img.height * margin);
  // Compare the border band's variance against the frame's. A border that is
  // as busy as the middle has content in it.
  let borderSpread = 0, n = 0;
  const sample = (x, y) => {
    const [r, g, b] = px(img, x, y);
    return luminance(r, g, b);
  };
  for (let x = 0; x < img.width; x += 7) {
    for (const y of [2, my - 2, img.height - my + 2, img.height - 3]) {
      if (y < 0 || y >= img.height) continue;
      const l = sample(x, y);
      borderSpread += l;
      n++;
    }
  }
  const mean = n ? borderSpread / n : 0;
  let variance = 0;
  for (let x = 0; x < img.width; x += 7) {
    const l = sample(x, Math.max(0, my - 2));
    variance += (l - mean) ** 2;
  }
  return { edgeVariance: Number((variance / Math.max(1, img.width / 7)).toFixed(4)), mx, my };
};

/** Perceptual distance between two frames, 0..1. Downsampled to a 16×9 grid
 *  of mean luminance — enough to notice "the frame changed", blind to grain. */
const fingerprint = (img) => {
  const gw = 16, gh = 9;
  const out = [];
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let sum = 0, n = 0;
      const x0 = Math.floor((gx * img.width) / gw);
      const x1 = Math.floor(((gx + 1) * img.width) / gw);
      const y0 = Math.floor((gy * img.height) / gh);
      const y1 = Math.floor(((gy + 1) * img.height) / gh);
      for (let y = y0; y < y1; y += 4) {
        for (let x = x0; x < x1; x += 4) {
          const [r, g, b] = px(img, x, y);
          sum += luminance(r, g, b);
          n++;
        }
      }
      out.push(n ? sum / n : 0);
    }
  }
  return out;
};

const distance = (a, b) =>
  Number((a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length).toFixed(4));

/** Does the frame still read at thumbnail size? A frame whose entire
 *  information is fine type collapses to grey mush at 320×180. */
const thumbnailReadable = (img) => {
  const fp = fingerprint(img);
  const mean = fp.reduce((a, b) => a + b, 0) / fp.length;
  const spread = Math.sqrt(fp.reduce((s, v) => s + (v - mean) ** 2, 0) / fp.length);
  return Number(spread.toFixed(4));
};

// ------------------------------------------------------------------ main
const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.round(s % 60)).padStart(2, "0")}`;

if (hasFlag("--render")) {
  const plan = JSON.parse(readFileSync(PLAN, "utf8"));
  mkdirSync(FRAMES, { recursive: true });
  const fps = plan.project.fps;
  // One frame per beat, at 40% through it — past the entrance animation, before
  // the exit. Plus every reveal, which is where the frame is doing the most.
  const times = plan.beats.map((b) => b.start + (b.end - b.start) * 0.4);
  console.log(`rendering ${times.length} stills…`);
  for (const [i, t] of times.entries()) {
    const f = Math.round(t * fps);
    execFileSync(
      "npx",
      ["remotion", "still", "VoxEssay", join(FRAMES, `f${String(i).padStart(3, "0")}-${f}.png`), "--frame", String(f)],
      { cwd: join(root, "video"), stdio: "inherit" },
    );
  }
}

if (!existsSync(FRAMES)) {
  console.error(`no frames at ${FRAMES}`);
  console.error(`run:  node --experimental-strip-types tools/review.mjs --render`);
  process.exit(1);
}

const files = readdirSync(FRAMES).filter((f) => f.endsWith(".png")).sort();
if (!files.length) {
  console.error(`${FRAMES} has no PNGs`);
  process.exit(1);
}

const plan = existsSync(PLAN) ? JSON.parse(readFileSync(PLAN, "utf8")) : null;
const fps = plan?.project.fps ?? 30;

console.log(`REVIEW     ${files.length} frames from ${FRAMES}`);
const findings = [];
let prev = null;
const report = [];

for (const file of files) {
  const frameNo = Number(file.match(/-(\d+)\.png$/)?.[1] ?? 0);
  const t = frameNo / fps;
  let img;
  try {
    img = readPng(join(FRAMES, file));
  } catch (e) {
    findings.push({ at: t, level: "warn", rule: "unreadable", message: `${file}: ${e.message}` });
    continue;
  }

  const leg = legibility(img);
  const safe = safeArea(img);
  const fp = fingerprint(img);
  const thumb = thumbnailReadable(img);
  const d = prev ? distance(prev, fp) : null;
  prev = fp;

  report.push({ file, t, contrast: leg.worst?.ratio ?? null, detail: leg.detailTiles, thumb, delta: d });

  // WCAG AA for large text is 3:1; body text is 4.5:1. Captions on video are
  // large, moving and often over photography, so 3:1 is the floor and
  // anything under it is a caption a phone viewer will not read.
  if (leg.worst && leg.worst.ratio < 3) {
    findings.push({
      at: t,
      level: "warn",
      rule: "low-contrast",
      message: `${file}: detail at ${leg.worst.x},${leg.worst.y} has ${leg.worst.ratio.toFixed(1)}:1 contrast (AA large text wants 3:1)`,
    });
  }
  if (leg.detailTiles === 0) {
    findings.push({ at: t, level: "info", rule: "empty-frame", message: `${file}: no legible detail anywhere in the frame` });
  }
  if (thumb < 0.045) {
    findings.push({
      at: t,
      level: "info",
      rule: "thumbnail-mush",
      message: `${file}: collapses to a flat field at thumbnail size (spread ${thumb})`,
    });
  }
  if (d !== null && d < 0.012) {
    findings.push({
      at: t,
      level: "warn",
      rule: "visual-stasis",
      message: `${file}: perceptually identical to the previous sample (Δ ${d}) — nothing changed between these beats`,
    });
  }
  if (safe.edgeVariance > 0.08) {
    findings.push({ at: t, level: "info", rule: "edge-content", message: `${file}: busy content in the title-safe margin` });
  }
}

const warns = findings.filter((f) => f.level === "warn");
const contrasts = report.map((r) => r.contrast).filter((x) => x !== null);
const deltas = report.map((r) => r.delta).filter((x) => x !== null);

console.log(
  `  contrast   worst ${contrasts.length ? Math.min(...contrasts).toFixed(1) : "—"}:1 · median ${
    contrasts.length ? contrasts.sort((a, b) => a - b)[Math.floor(contrasts.length / 2)].toFixed(1) : "—"
  }:1`,
);
console.log(
  `  change     median Δ ${deltas.length ? (deltas.slice().sort((a, b) => a - b)[Math.floor(deltas.length / 2)]).toFixed(3) : "—"} between samples`,
);
console.log(`  findings   ${findings.length} (${warns.length} warn)`);
for (const f of findings.slice(0, 25)) console.log(`  ${f.level === "warn" ? "WARN" : "info"} ${fmt(f.at)} ${f.rule} — ${f.message}`);
if (findings.length > 25) console.log(`  … ${findings.length - 25} more`);

const outPath = join(root, "video/out/review.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify({ frames: report, findings }, null, 2));
console.log(`WROTE      ${outPath}`);

if (warns.length && !hasFlag("--no-gate")) process.exit(2);
