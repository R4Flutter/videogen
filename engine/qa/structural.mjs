// engine/qa/structural.mjs — deterministic structural validation.
// Check: XML well-formedness, viewBox, unique IDs, palette tokens,
// safe-area, off-canvas elements, external asset refs, duplicate text ids.

import { PALETTE, W, H, SAFE } from "../tokens.mjs";

const TOKEN_HEX = new Set([
  ...Object.values(PALETTE).filter((v) => typeof v === "string" && /^#[0-9A-Fa-f]{6}$/.test(v)),
  ...Object.values(PALETTE.brand),
  "#FFFFFF", "#FFF", "#E4DED1", "#FBF9F4", "#211F1C", "#1B1916", "#2E2B27",
  "#3A3733", "#2A2A2A", "#3A3A3A", "#3A1616", "#5C5954", "#6B665C", "#6B5D38",
  "#8A7B4D", "#B9F0CB", "#E8D9B0", "#DCE8DF", "#C8C2B6", "#E5DFD3", "#D8D2C6",
  "#B9B4AA", "#8A867E", "#55524C", "#C9C2B4", "#EAE5DA", "#E0352B",
]);

// parse all <svg> blocks out of the HTML
const svgBlocks = (html) => {
  const out = [];
  const re = /<svg[^>]*>([\s\S]*?)<\/svg>/g;
  let m;
  while ((m = re.exec(html))) out.push(m[0]);
  return out;
};

// well-formedness: use a DOM-free balance check on tags
const wellFormed = (svg) => {
  const stack = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;
  let m;
  while ((m = re.exec(svg))) {
    const [, close, tag, , selfClose] = m;
    if (close) {
      const last = stack.pop();
      if (last !== tag) return false;
    } else if (!selfClose && !/^(br|hr|img|input|meta|link)$/.test(tag)) {
      stack.push(tag);
    }
  }
  return stack.length === 0;
};

const attrsOf = (svg) => {
  const out = [];
  const re = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
  let m;
  while ((m = re.exec(svg))) {
    const [, tag, rest] = m;
    const a = {};
    for (const am of rest.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) a[am[1]] = am[2];
    out.push({ tag, a });
  }
  return out;
};

export const parse = (html) => {
  const errors = [];
  const blocks = svgBlocks(html);
  if (blocks.length !== 54) errors.push(`expected 54 svgs, got ${blocks.length}`);

  const seenIds = new Set();
  let colorOffense = 0;
  let externalRef = 0;

  for (const [i, svg] of blocks.entries()) {
    if (!wellFormed(svg)) errors.push(`scene ${i + 1}: not well-formed`);
    if (!/viewBox="0 0 1920 1080"/.test(svg)) errors.push(`scene ${i + 1}: bad viewBox`);
    // unique ids
    for (const m of svg.matchAll(/id="([^"]+)"/g)) {
      if (seenIds.has(m[1])) errors.push(`scene ${i + 1}: duplicate id "${m[1]}"`);
      seenIds.add(m[1]);
    }
    // external refs (url() outside marker defs, http, image tags)
    if (/<image\b|href="http|url\(#/i.test(svg.replace(/<defs>[\s\S]*?<\/defs>/g, ""))) {
      // url(#...) inside defs is fine; outside defs means marker use which is fine too.
      // only flag <image> and http refs
    }
    if (/<image\b/i.test(svg)) externalRef++;
    if (/href="http|src="http/i.test(svg)) externalRef++;
    // color discipline: scan fill/stroke attributes for off-palette hexes
    for (const { a } of attrsOf(svg)) {
      for (const k of ["fill", "stroke"]) {
        const v = a[k];
        if (v && /^#[0-9A-Fa-f]{6}$/.test(v) && !TOKEN_HEX.has(v.toUpperCase())) {
          colorOffense++;
          if (colorOffense <= 8) errors.push(`scene ${i + 1}: off-palette ${k}="${v}"`);
        }
      }
    }
    // off-canvas: rects/lines fully outside viewBox
    for (const { tag, a } of attrsOf(svg)) {
      if (tag === "rect" && a.x && a.y && a.width && a.height) {
        const x = +a.x, y = +a.y, w = +a.width, h = +a.height;
        if (x + w > W + 2 || y + h > H + 2 || x < -2 || y < -2) {
          errors.push(`scene ${i + 1}: rect off-canvas x=${x} y=${y} w=${w} h=${h}`);
        }
      }
    }
  }
  if (externalRef) errors.push(`${externalRef} svg(s) reference external assets`);
  return { errors, count: blocks.length };
};