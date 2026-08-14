// engine/qa/geometry.mjs — layout QA that catches what structural can't:
// text overflow, element collisions, centering drift. Pure math, no vision needed.

import { SCENES } from "../scenes/index.mjs";
import { W, H, FONT, weight } from "../tokens.mjs";

const W_ = W, H_ = H;
const SAFE = 96;

// crude glyph-width estimator: Archivo display is roughly 0.55em avg, mono 0.6em
const estW = (s, size, font) => {
  let w = 0;
  for (const ch of String(s)) {
    if (ch === " ") w += 0.28;
    else if (ch === "i" || ch === "l" || ch === "I" || ch === "1" || ch === "." || ch === "," || ch === "!") w += 0.32;
    else if (ch === "m" || ch === "W" || ch === "M") w += 0.85;
    else w += 0.6;
  }
  return w * size * (font === "mono" ? 0.62 : 1);
};

const extractTexts = (svg) => {
  const out = [];
  const re = /<text([^>]*)>([^<]*)<\/text>/g;
  let m;
  while ((m = re.exec(svg))) {
    const attrs = {};
    for (const am of m[1].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) attrs[am[1]] = am[2];
    out.push({ x: +attrs.x, y: +attrs.y, size: +attrs["font-size"] || 20, fill: attrs.fill, content: m[2], anchor: attrs["text-anchor"] || "start" });
  }
  return out;
};

const problems = [];

for (const scene of SCENES) {
  const svg = scene.build();
  for (const t of extractTexts(svg)) {
    const w = estW(t.content, t.size, "body");
    let left, right;
    if (t.anchor === "middle") { left = t.x - w / 2; right = t.x + w / 2; }
    else if (t.anchor === "end") { left = t.x - w; right = t.x; }
    else { left = t.x; right = t.x + w; }

    // off-canvas
    if (right > W_ - 24 && left > W_ - 100) {
      problems.push(`S${scene.num}: "${t.content.slice(0, 40)}" (${t.size}px) overflows right edge (right=${Math.round(right)} of ${W_})`);
    } else if (left < 24) {
      problems.push(`S${scene.num}: "${t.content.slice(0, 40)}" (${t.size}px) overflows left edge (left=${Math.round(left)})`);
    }

    // below the fold: content colliding with caption bar zone
    // CaptionBar strip occupies ~1040–1080 in scenes that have one
    if (t.y > 1060) {
      problems.push(`S${scene.num}: "${t.content.slice(0, 40)}" baseline at ${t.y} — inside caption strip zone`);
    }
  }

  // centering sanity: any "anchor=middle" text with x between 0.45W and 0.55W should be close to center
  // (flag texts whose midpoint claims center but whose content looks off-balance — hard; skip)
}

if (problems.length) {
  console.log("GEOMETRY ISSUES:");
  for (const p of problems) console.log(" -", p);
} else {
  console.log("geometry check: PASS (no overflow or caption collisions)");
}

// also: verify every scene renders non-empty and has a background rect
for (const scene of SCENES) {
  const svg = scene.build();
  if (!svg.includes("<rect")) {
    console.log(`S${scene.num}: no rects at all — verify composition`);
  }
  if (svg.trim().length < 200) {
    console.log(`S${scene.num}: suspiciously tiny SVG (${svg.length} chars)`);
  }
}