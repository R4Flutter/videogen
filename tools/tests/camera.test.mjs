// The 2.5D invariants. Run: node --experimental-strip-types --test tools/tests/camera.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cameraState,
  depthTransform,
  handheld,
  MAX_ANCHOR_REACH,
  MAX_PUSH,
  overscanFor,
} from "../../video/src/editorial/camera-math.ts";

const W = 1920;
const H = 1080;
const INTENTS = ["establish", "focus", "push", "pull", "pan", "compare", "reveal", "settle"];
const STEPS = Array.from({ length: 21 }, (_, i) => i / 20);
const SEEDS = [0, 1, 2, 3, 7, 11, 40];
/** Every depth anything in the renderer actually stands on. */
const DEPTHS = [0.25, 0.6, 0.95, 1, 1.5];

const each = (fn) => {
  for (const intent of INTENTS)
    for (const p of STEPS) for (const seed of SEEDS) fn(cameraState(intent, p, W, H, null, seed), `${intent} @${p} seed ${seed}`);
};

test("no full-bleed layer ever exposes a canvas edge", () => {
  // The one hard rule: a layer under 1.0 with nothing behind it shows blank
  // canvas along an edge. Background planes shrink under the camera by design,
  // so their standing overscan has to cover the deepest push exactly.
  each((cam, where) => {
    assert.ok(cam.scale >= 1, `${where} base -> ${cam.scale}`);
    for (const d of DEPTHS)
      assert.ok(depthTransform(cam, d).scale >= 1 - 1e-12, `${where} depth ${d}`);
  });
});

test("the subject plane stays inside the tightest safe margin", () => {
  // 0.945 is the bottom band, so 5.5% of the short axis is all there is. The
  // type is set on depth 1 and takes the camera exactly, so this is the check
  // that says the headline is still on screen.
  each((cam, where) => {
    if (cam.ox === 50 && cam.oy === 50) return; // focus solves its own framing
    const reach = Math.max(cam.ox, 100 - cam.ox, cam.oy, 100 - cam.oy) / 100;
    assert.ok(reach <= MAX_ANCHOR_REACH + 1e-12, `${where} anchor reach ${reach}`);
    const crop = (depthTransform(cam, 1).scale * cam.scale - 1) * reach;
    assert.ok(crop <= 0.055, `${where} crops ${(crop * 100).toFixed(2)}%`);
  });
});

/** What a plane at `depth` is scaled by in total: the base camera its parent
 *  applied, times its own share on top. */
const total = (intent, p, d, seed = 1) => {
  const cam = cameraState(intent, p, W, H, null, seed);
  return depthTransform(cam, d).scale * cam.scale;
};

test("depth is monotonic — nearer planes travel further across the beat", () => {
  // Measured as travel and not as an instant, because parallax *is* the rate
  // difference. Every plane happens to coincide at full push — the standing
  // overscan is sized to bottom out at exactly 1.0 there — so a single-frame
  // comparison reports zero depth on a system that has plenty.
  const travel = (d) => total("push", 1, d) - total("push", 0, d);
  const [page, mid, subject] = [0.25, 0.6, 1].map(travel);
  assert.ok(subject > mid && mid > page, `${page} ${mid} ${subject}`);
  // The background does not merely lag — it widens while the subject narrows,
  // which is the dolly cue rather than a slow zoom on everything.
  assert.ok(page < subject / 2, `page travelled ${page} vs subject ${subject}`);
});

test("the separation the eye can actually see clears 1.5% of frame width", () => {
  // Why the old system read as flat: three layers drifting on their own sines
  // separated by ~0.6% of width across a beat, under the visual threshold.
  const cam = cameraState("push", 1, W, H, null, 1);
  const reach = (W * Math.max(cam.ox, 100 - cam.ox)) / 100;
  const travel = (d) => (total("push", 1, d) - total("push", 0, d)) * reach;
  const sep = Math.abs(travel(1) - travel(0.25));
  assert.ok(sep / W > 0.015, `separation ${((sep / W) * 100).toFixed(2)}% of width`);
});

test("the depth response saturates at MAX_PUSH however hard the base scales", () => {
  // overscanFor is the exact reciprocal of MAX_PUSH, so a plane that fell away
  // harder than MAX_PUSH would under-overscan and expose its edge. `focus` runs
  // to 1.45, so the damping in depthTransform is what holds this — not the
  // intents happening to stay small.
  each((cam, where) => {
    const fell = 1 - depthTransform(cam, 0).scale / overscanFor(0);
    assert.ok(fell <= MAX_PUSH + 1e-12, `${where} fell ${fell}`);
  });
});

test("focus parks its target in the middle of the frame", () => {
  const t = { x: 100, y: 100, w: 400, h: 300 };
  const cam = cameraState("focus", 1, W, H, t);
  assert.equal(cam.ox, 50); // the translate below solves for a centred origin
  assert.equal(cam.oy, 50);
  const cx = (t.x + t.w / 2 - W / 2) * cam.scale + W / 2 + cam.tx;
  const cy = (t.y + t.h / 2 - H / 2) * cam.scale + H / 2 + cam.ty;
  assert.ok(Math.abs(cx - W / 2) < 0.5, `x ${cx}`);
  assert.ok(Math.abs(cy - H / 2) < 0.5, `y ${cy}`);
});

test("handheld is felt, not seen, and never repeats on a short period", () => {
  const at = (f) => handheld(f, 5, W, H);
  for (let f = 0; f < 900; f++) {
    const h = at(f);
    assert.ok(Math.abs(h.x) < W * 0.004, `x ${h.x} @${f}`);
    assert.ok(Math.abs(h.y) < H * 0.004, `y ${h.y} @${f}`);
    assert.ok(Math.abs(h.rotate) < 0.1);
  }
  assert.notEqual(at(0).x, at(97).x); // not on the first sine's period
});

test("deterministic — same beat, same frame, same framing", () => {
  const a = cameraState("reveal", 0.4, W, H, null, 11);
  const b = cameraState("reveal", 0.4, W, H, null, 11);
  assert.deepEqual(a, b);
  assert.deepEqual(handheld(120, 11, W, H), handheld(120, 11, W, H));
});
