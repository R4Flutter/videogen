// Guards the story.txt -> script.json contract. Run after editing either a
// story or the parser:  node tools/check.mjs
//
// The fixtures are invented cases. They exist so these assertions mean
// something without a real case having to be correct first.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const parse = (name) => {
  const out = join(tmpdir(), `story-check-${process.pid}.json`);
  execFileSync(process.execPath, [
    join(root, "tools/parse-story.mjs"),
    join(root, name),
    out,
  ]);
  return JSON.parse(readFileSync(out, "utf8"));
};

const s = parse("tools/fixtures/story-demo.txt");
const long = s.beats.filter((b) => b.track === "long");
const short = s.beats.filter((b) => b.track === "short");

assert.equal(s.engine, "crime");
assert.equal(s.width, 1920, "a CrimeLong story renders 16:9");
assert.equal(s.height, 1080);
assert.equal(s.fps, 30);
assert.ok(long.length >= 8, `expected the sections to split into beats, got ${long.length}`);
assert.ok(short.length >= 2, "the SHORT section becomes its own track");

// Every beat is renderable: a module the engine has, narration to read, and a
// duration. A beat that fails any of these is a black frame in the middle of a
// ten-minute video.
const MODULES = new Set([
  "caseOpen", "chapter", "clock", "timeline", "map", "person", "evidence",
  "document", "redacted", "cctv", "phone", "quote", "headline", "board",
  "compare", "reveal", "status", "archival", "statement",
]);
for (const b of s.beats) {
  assert.ok(MODULES.has(b.module), `beat ${b.n}: unknown module ${b.module}`);
  assert.ok(b.vo.trim(), `beat ${b.n} has no narration`);
  assert.ok(b.end > b.start, `beat ${b.n} has no duration`);
  assert.ok(b.end - b.start < 20, `beat ${b.n} carries ${Math.round(b.end - b.start)}s on one visual`);
  assert.ok(b.intensity >= 0 && b.intensity <= 1, `beat ${b.n} intensity out of range`);
}

// Each track tiles its own timeline from zero, with no gap and no overlap. The
// vertical cut is a second telling, not the tail of the first.
for (const track of [long, short]) {
  track.reduce((prev, b) => {
    assert.equal(b.start, prev, `beat ${b.n} starts at ${b.start}, expected ${prev}`);
    return b.end;
  }, 0);
}

// The camera is semantic. A story never names a scale, and the engine only
// knows these words.
const INTENTS = new Set([
  "observe", "investigate", "follow", "search", "connect", "isolate", "reveal",
  "shock", "reflect",
]);
for (const b of s.beats) assert.ok(INTENTS.has(b.intent), `beat ${b.n}: ${b.intent}`);

// So is the sound. An episode names events, never filenames — swapping the SFX
// pack must not touch a story.
const EVENTS = new Set([
  "document", "map_pin", "timestamp", "cctv", "message", "phone", "evidence",
  "transition_soft", "transition_hard", "reveal_minor", "reveal_major",
  "tension_rise", "chapter",
]);
for (const b of s.beats) {
  for (const cue of b.sfx) assert.ok(EVENTS.has(cue), `beat ${b.n}: unknown sfx ${cue}`);
  assert.ok(b.sfx.length <= 2, `beat ${b.n} has ${b.sfx.length} accents — sfx punctuate, they don't score`);
}

// Nothing the pipeline can fetch is case material, so nothing may claim to be.
for (const b of s.beats) {
  assert.ok(
    ["illustrative", "reconstruction", "archival", "official", "public_record", "licensed", "unknown"].includes(b.provenance),
    `beat ${b.n}: ${b.provenance}`,
  );
}
assert.ok(
  s.beats.every((b) => b.provenance !== "official" || /source/i.test(b.source ?? "")),
  "a beat may not claim official provenance without a source",
);

// The section's on-screen lines land on the module that can read them: dated
// lines on the timeline, places on the map. The timeline is story memory, so a
// wrong row there stays wrong for the rest of the documentary.
const timelines = long.filter((b) => b.module === "timeline");
assert.ok(timelines.length, "the demo stages a timeline");
for (const b of timelines) {
  for (const row of b.data) {
    assert.match(row.label, /\d/, `timeline row "${row.label}" has no time in it`);
  }
}
assert.ok(
  timelines[timelines.length - 1].data.length >= timelines[0].data.length,
  "a later timeline must carry what the earlier one established",
);

const maps = long.filter((b) => b.module === "map");
assert.ok(maps.length && maps[0].data.length >= 2, "a map needs at least two places");

// A card builds across the beats that stage it rather than restarting on each.
const runs = long.filter((b) => b.module === "status");
assert.ok(runs.every((b) => b.accent <= b.data.length));

// The vertical cut starts on the story, not on a title card.
assert.notEqual(short[0].module, "caseOpen");

// Factuality: an unproven accusation with nobody's name on it does not render.
let refused = false;
try {
  parse("tools/fixtures/story-unattributed.txt");
} catch (err) {
  refused = /unattributed accusation/.test(String(err.stderr ?? err));
}
assert.ok(refused, "an unattributed accusation must fail the parse, not render");

// ---------------------------------------------------------------- vox engine
// The same guard for the second vocabulary, on a fixture the engine has never
// seen. The point of these is not that vox-demo.md renders — it is that nothing
// in the engine is wired to the story currently in video/script_vox.md.
const vox = (() => {
  const out = join(tmpdir(), `vox-check-${process.pid}.json`);
  execFileSync(process.execPath, [
    join(root, "tools/parse-script.mjs"),
    join(root, "tools/fixtures/vox-demo.md"),
    out,
  ]);
  return JSON.parse(readFileSync(out, "utf8"));
})();

assert.equal(vox.engine, "vox");
assert.equal(vox.width, 1080, "**Format: portrait** renders 9:16");

const VOX_MODULES = new Set([
  "kinetic", "doodle", "icon", "chart", "compare", "stat", "footage", "callout",
  "timeline", "quote", "trace", "trust", "funnel", "map", "collage",
]);
for (const b of vox.beats) {
  assert.ok(VOX_MODULES.has(b.module), `vox beat ${b.n}: unknown module ${b.module}`);
  assert.ok(b.vo.trim(), `vox beat ${b.n} has no narration`);
  assert.ok(b.end > b.start, `vox beat ${b.n} has no duration`);
}

// Every module states a caption policy. Without one, a module that prints its
// own headline also gets the whole narration printed under it — which is what
// made a ten-minute cut read as an animated transcript. A new module added
// without a row here inherits "subtitle" silently, so the table is asserted
// rather than trusted.
const scenes = readFileSync(join(root, "video/src/vox/scenes.tsx"), "utf8");
const policy = scenes.slice(scenes.indexOf("export const CAPTION"));
for (const m of VOX_MODULES) {
  assert.match(
    policy.slice(0, policy.indexOf("};")),
    new RegExp(`\\b${m}:\\s*"(none|subtitle)"`),
    `module ${m} has no caption policy in vox/scenes.tsx`,
  );
}

// No module invents its own vertical placement any more: the kicker, the
// headline and the caption band come from vox/layout.ts. `pad * 1.6` was the
// magic number every module used for "top of the page", and two modules using
// it with different assumptions about what came next is exactly how the funnel
// headline ended up printed through the FUNNEL kicker.
for (const file of readdirSync(join(root, "video/src/vox")).filter((f) => f.endsWith(".tsx"))) {
  const src = readFileSync(join(root, "video/src/vox", file), "utf8");
  assert.ok(
    !/top:\s*pad\s*\*\s*1\.6/.test(src),
    `${file} still positions off pad * 1.6 — use the band from vox/layout.ts`,
  );
}

// The layout maths itself: the grid is ordered, big numbers compact instead of
// overflowing, and a fitted string measures inside the width it was fitted to.
execFileSync(
  process.execPath,
  ["--experimental-strip-types", "--no-warnings", join(root, "tools/fixtures/layout-check.mts")],
  { stdio: "inherit" },
);

// Audio is checked by `npm run audio`, not here. It is deliberately a separate
// gate: this file guards the story -> script.json contract and runs *before* a
// take has been read, while the audio spec can only be true after voice.py has
// finished writing. Wiring it in here would fail the first step of every
// episode for being out of spec on narration that has not been recorded yet.

// A beat that lists places is a map, whatever its prose says — this is the rule
// that keeps "the money moves to Dubai" from staging as an abstract flow.
for (const b of vox.beats) {
  if (b.places?.length) assert.equal(b.module, "map", `beat ${b.n} named places but staged ${b.module}`);
}

// Places parse in both forms: a bare country to ink, and a labelled lat/lon pin.
// The comma inside "13.75,100.5" is the reason the row is semicolon-separated.
const countries = vox.beats.find((b) => b.places?.some((p) => p.lat === undefined));
assert.ok(countries, "the fixture inks at least one country");
const route = vox.beats.find((b) => (b.places ?? []).filter((p) => p.lat !== undefined).length >= 2);
assert.ok(route, "the fixture draws at least one route");
for (const p of route.places) {
  assert.ok(Number.isFinite(p.lat) && Number.isFinite(p.lon), `pin ${p.name} lost its coordinates`);
  assert.ok(Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180, `pin ${p.name} is off the planet`);
}

// Art direction and the turn cue belong to the script, not to a table keyed by
// beat number in a tool. These two rows are what make the engine story-agnostic.
assert.ok(
  vox.beats.some((b) => b.image_prompt?.length > 40),
  "an **Image Prompt:** row must reach script.json for fetch-footage.py",
);
assert.ok(
  vox.beats.some((b) => b.turn),
  "a **Turn:** row must reach script.json for the trust collapse",
);

// "circled" is how a storyboard writes it. It used to match nothing.
assert.equal(
  vox.beats.find((b) => /circled/i.test(b.motion ?? ""))?.shape,
  "circle",
  "Motion FX saying 'circled' must select the circle mark",
);

// ---------------------------------------------------------------- prompt sheet
// The images are made by hand now, so the prompt sheet is the pipeline's actual
// output for imagery. It must cover every slot the renderer will look for, and
// it must not hand a person a prompt that fights itself.
const { sheet, index } = (() => {
  const script = join(tmpdir(), `vox-check-${process.pid}.json`);
  // scene-prompts.mjs takes a *directory* and fills it with 01.md, 02.md, … plus
  // files.txt — ten prompts to a file. This used to hand it a path ending .md
  // and then read that path back, so the tool created a directory of that name
  // and the read died on EISDIR before a single assertion ran.
  const dir = join(tmpdir(), `vox-prompts-${process.pid}`);
  execFileSync(process.execPath, [join(root, "tools/scene-prompts.mjs"), script, dir]);
  const sheets = readdirSync(dir)
    .filter((f) => /^\d+\.md$/.test(f))
    .sort();
  return {
    // The assertions below treat the sheet as one stream of blocks, and a beat's
    // three framings can straddle a file boundary, so the batch is rejoined.
    sheet: sheets.map((f) => readFileSync(join(dir, f), "utf8").trim()).join("\n\n"),
    index: readFileSync(join(dir, "files.txt"), "utf8"),
  };
})();

// The sheet is pasted whole into a batch generator, so it must be prompts and
// nothing else: one line per image with the negative on the same line, blank
// line between. A heading or a filename in here becomes a prompt, and a line
// break inside a block makes a generator treat the negative as a second input.
const blocks = sheet.trim().split(/\n{2,}/);
for (const block of blocks) {
  assert.equal(
    block.split("\n").length,
    1,
    `a prompt block must be one line:\n${block.slice(0, 120)}`,
  );
  assert.ok(
    !/^#|^\*|^\||^-{3}/.test(block),
    `markup leaked into a prompt:\n${block.slice(0, 120)}`,
  );
  assert.match(
    block,
    / Negative prompt: \S/,
    "every prompt carries its negative prompt on the same line",
  );
}

const VARIANTS = 3;
const imageBeats = vox.beats.filter(
  (b) => b.image_prompt || b.footage || ["doodle", "footage", "callout", "collage"].includes(b.module),
);
assert.ok(imageBeats.length, "the fixture stages at least one photograph");
assert.equal(blocks.length, imageBeats.length * VARIANTS, "one prompt per image slot");

// A batch generator returns 1.png, 2.png, 3.png. The index is the only thing
// that says which of those is beat-2-2.jpg, and a mis-slotted image is a beat
// staging the wrong picture rather than an obvious error.
const listed = index.trim().split("\n");
assert.equal(listed.length, blocks.length, "the index covers every prompt, in order");
for (const b of imageBeats) {
  for (let v = 0; v < VARIANTS; v++) {
    const file = v === 0 ? `beat-${b.n}.jpg` : `beat-${b.n}-${v + 1}.jpg`;
    assert.ok(index.includes(` ${file} `), `the index is missing ${file}`);
  }
}

// Negations belong on the negative line, never in the positive prompt — a
// diffusion model reads "no text" as a vote for text. Authors write them by
// habit in an Image Prompt row, so the sheet has to strip them.
const positives = blocks.map((b) => b.split("\n")[0]);
for (const line of positives) {
  assert.ok(
    !/\bno (text|faces|people|lettering|signage)\b/i.test(line),
    `a positive prompt still carries a negation:\n${line.slice(0, 160)}`,
  );
}

// An authored prompt sets its own palette and its own empty zone. Appending the
// house style block on top gave one prompt two accent colours and two different
// negative-space instructions, which is one instruction the model averages away.
const authored = positives.filter((p) => /deep mustard/i.test(p));
assert.ok(authored.length, "the fixture has an authored Image Prompt beat");
for (const line of authored) {
  assert.ok(
    !/burnt-orange/i.test(line),
    "an authored prompt must keep its own accent, not gain a second one",
  );
}

console.log(
  `ok — ${long.length} beats + ${short.length} vertical, modules ${[...new Set(long.map((b) => b.module))].join("/")}\n` +
    `ok — vox ${vox.beats.length} beats, modules ${vox.beats.map((b) => b.module).join("/")}`,
);
