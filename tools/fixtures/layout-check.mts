// The runnable half of the layout contract. tools/check.mjs shells into this
// with --experimental-strip-types, because the logic worth breaking lives in a
// .ts file that the rest of the checker cannot import.
//
// Everything here is a pure function of numbers and strings — no canvas, no
// DOM. `measure` falls back to a per-glyph estimate outside a browser, which is
// exactly what these assertions want: the estimate is the pessimistic path, so
// a fit that holds here holds when the real font engine is doing the measuring.
import assert from "node:assert/strict";
import { BAND, fit, fitBlock, measure, numberFormat } from "../../video/src/vox/layout.ts";

// ------------------------------------------------------------------- the grid
// Bands run top to bottom and never overlap. Two bands out of order is two
// modules staging into the same strip of the page, which is the whole class of
// defect this file exists to prevent.
const order = ["kicker", "headline", "primary", "annotation", "caption", "bottom"] as const;
for (let i = 1; i < order.length; i++) {
  assert.ok(
    BAND[order[i]] > BAND[order[i - 1]],
    `band ${order[i]} (${BAND[order[i]]}) must sit below ${order[i - 1]}`,
  );
}
assert.ok(BAND.bottom <= 1, "the page ends at the bottom of the canvas");
assert.ok(BAND.primary - BAND.headline > 0.1, "the headline band has room for two lines");

// ------------------------------------------------------------------- numbers
// The stat overflow, as a table. Left column is what the script hands over,
// right column is what may appear on the page.
const money = numberFormat(9171.49);
assert.equal(money(9171.49, "$"), "$9,171.49", "exact below a million: the digits are the point");
assert.equal(numberFormat(30_000_000)(30_000_000), "30M");
assert.equal(numberFormat(1_250_000)(1_250_000), "1.25M");
assert.equal(numberFormat(25_557_729)(25_557_729), "25.56M");
assert.equal(numberFormat(123_600)(123_600), "123,600");
assert.equal(numberFormat(100_000)(100_000), "100,000");

// A rolling counter keeps one shape for the whole roll once it is off the
// ground. `999,999` turning into `1M` on a single frame is the glitch this
// rule exists to stop.
const roll = numberFormat(2_400_000);
for (const v of [1_000_000, 1_999_999, 2_400_000]) {
  assert.match(roll(v), /M$/, `${v} changed representation mid-roll: ${roll(v)}`);
}
// A series that spans orders of magnitude does not destroy its own small rows:
// a funnel running 100,000 -> 10 may not print the last one as 0.00001M.
const funnel = numberFormat(30_000_000);
assert.equal(funnel(10), "10", "a value the series scale would erase keeps its digits");
// Zero is the exception to that exception: a roll starts at zero, and `0` on
// one frame becoming `0.5M` on the next is the shape change the rule forbids.
assert.equal(funnel(0), "0M", "a roll holds its unit from the first frame");
// And a small number never gains a unit it did not earn.
assert.equal(numberFormat(48)(48), "48");

// ------------------------------------------------------------------- fitting
const spec = { weight: 800, family: "Archivo" };
// The defect, stated as an assertion: the widest thing a stat can print, at the
// size the module asks for, inside the width the page has.
const safeW = 1920 * 0.85;
for (const text of ["$9,171.49", "30M", "100,000", "25.56M", "$1,000,000"]) {
  const size = fit(text, safeW, 1920 * 0.24, spec);
  assert.ok(
    measure(text, { ...spec, size }) <= safeW + 0.5,
    `${text} still overruns the page at ${size.toFixed(1)}px`,
  );
  assert.ok(size > 0, `${text} fitted to nothing`);
}
// Something that already fits is left alone — a fitter that shrinks everything
// is a fitter that has quietly rescaled the whole video.
assert.equal(fit("30M", safeW, 100, spec), 100, "a short string keeps its size");

// A headline fits its box in both directions. The long one has to come back
// smaller than the short one, or the block fitter is not reading height.
const box = { w: 1920 * 0.85, h: 1080 * (BAND.primary - BAND.headline) };
const short = fitBlock("THE FUNNEL", box.w, box.h, 130, spec);
const long = fitBlock(
  "A HUNDRED THOUSAND TARGETS NARROW TO FIVE LOCKED ACCOUNTS IN UNDER A WEEK",
  box.w,
  box.h,
  130,
  spec,
);
assert.ok(long < short, "a long headline must step down");
assert.ok(long > 0, "a long headline must still be typeset");
// One unbreakable word cannot wrap, so it has to fit the width on its own.
const word = fitBlock("INDISTINGUISHABLE", box.w, box.h, 400, spec);
assert.ok(
  measure("INDISTINGUISHABLE", { ...spec, size: word }) <= box.w + 0.5,
  "a single long word must fit the safe width",
);

console.log("ok — layout grid ordered, numbers bounded, text fits the page");
