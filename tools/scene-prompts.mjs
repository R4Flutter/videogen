// script.json -> video/prompts/01.md, 02.md, ...
//
//   node tools/scene-prompts.mjs [video/src/script.json] [video/prompts]
//
// One detailed, ready-to-paste image prompt per image slot the video needs, ten
// prompts to a file. Generate them wherever you like, save each one under the
// filename printed above it into video/public/footage/, and the renderer picks
// it up — no generator is called here or anywhere else in the pipeline.
//
// Nothing in this file knows what the episode is about. Every prompt is built
// from the beat's own rows, so a new scam story produces a new prompt sheet
// with no code change. The one thing an author can override is the subject
// itself, by writing an `| **Image Prompt:** |` row on the beat.
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [src = "video/src/script.json", dst = "video/prompts"] = process.argv.slice(2);
const script = JSON.parse(readFileSync(src, "utf8"));

/** Prompts to a file. Ten is a batch someone can actually sit and generate. */
const PER_FILE = 10;

// Keep in step with WANTS in tools/fetch-footage.py — these are the modules
// that put a photograph on the page. Every other module draws itself.
const WANTS = new Set([
  "doodle", "footage", "callout", "collage",
  "caseOpen", "cctv", "statement", "archival", "headline", "person", "clock", "status",
]);

/** Slots per beat. Matches VARIANTS in fetch-footage.py: the collage lays each
 *  one out as its own clipping, and a scene that holds for eight seconds needs
 *  more than one frame or it dies on screen. */
const VARIANTS = 3;

// A storyboard sentence about the edit, the sound or the on-screen type is not
// a thing in the frame. Mirrors DIRECTION in tools/fetch-footage.py.
const DIRECTION =
  /\b(camera|cuts?|music|sfx|audio|beat|hold|frame|shot|zoom|push(es)?|pull(s)?|pan(s)?|silence|hum|drone|types?|title|caption|text|screen|split|left|right|cent(er|re)|graphic|card|enters?|slams?|appears?|surfaces?|large|small|visuali[sz]ation|diagram|overlay|vs\.?)\b/i;

// Words that would have someone generate the crime rather than the room it
// happened in. Mirrors CHARGED in tools/fetch-footage.py — if you change one,
// change both. A prompt sheet is read by a person, but handing that person a
// sentence describing a killing is still the pipeline's fault.
const CHARGED =
  /\b(kill\w*|murder\w*|strangl\w*|rape\w*|stab\w*|shot|shoot\w*|victims?|bod(y|ies)|corpse|blood\w*|child\w*|kids?|girls?|boys?|famil(y|ies))\b/i;

/**
 * Three framings of one subject. A collage of three near-identical photographs
 * is one photograph printed three times — the variation has to be designed in,
 * and "same thing again with a different seed" does not produce it.
 */
const FRAMINGS = [
  {
    tag: "establishing",
    how:
      "The hero occupies roughly 70 percent of the frame, seen straight-on at eye " +
      "level and placed slightly left of centre, whole and uncropped, its silhouette " +
      "unbroken and fully separated from the ground. The right third of the frame is " +
      "deliberately empty",
  },
  {
    tag: "detail",
    how:
      "A tight macro crop of one part of the same subject, close enough that surface, " +
      "material, wear and edge texture read clearly, filling the lower two thirds; " +
      "shallow implied depth but everything in focus. The upper third is empty",
  },
  {
    tag: "context",
    how:
      "The same subject seen from a low oblique three-quarter angle and further back, " +
      "small in a wide field, one long shadow anchoring it to the ground so the space " +
      "around it carries the frame. The upper half is empty",
  },
];

/** Where the engine will print its own type, so the picture has to leave it
 *  clear. Portrait runs the headline high and the caption low. */
const RESERVED = script.height > script.width
  ? "the top fifth and the bottom quarter"
  : "the left third and the bottom fifth";

const ASPECT = script.height > script.width
  ? `${script.width}x${script.height} vertical 9:16`
  : `${script.width}x${script.height} horizontal 16:9`;

/** The house look, in the language an image model responds to. This is the same
 *  page the renderer draws: off-white paper, charcoal photography, one accent. */
const STYLE =
  "Elite editorial documentary visual journalism in the house style of a printed " +
  "explainer: a warm off-white uncoated paper ground (#F4F1EA), the subject rendered " +
  "as a crisp charcoal (#1A1A1A) grayscale photographic cut-out with hard clean " +
  "edges, and exactly one flat burnt-orange (#D2543A) accent — a solid shape, band " +
  "or field sitting behind or beside the hero, never a gradient and never more than " +
  "one. Flat frontal editorial perspective, magazine-grid composition, generous " +
  "margins, strong single focal point, decisive figure-ground separation. Even " +
  "diffuse studio light, no dramatic key, no colour cast; deep blacks, clean paper " +
  "whites, and a narrow mid-grey range so it prints like ink. Finished with a fine " +
  "screenprint halftone dot, light archival paper grain and a barely-visible " +
  "misregistration offset on the accent, as though it came off the same press as the " +
  "type. Every element isolated against clean negative space, on its own plane, with " +
  "nothing bleeding off the subject, so a motion designer can cut it out and move it " +
  "independently on a parallax layer.";

/** Sent as the negative prompt, not written into the sentence above. A diffusion
 *  model does not parse negation: "no text" in a positive prompt is a vote for
 *  text. Printed once at the top of the sheet rather than under every prompt. */
const NEGATIVE =
  "text, lettering, words, captions, labels, signage, logo, watermark, signature, " +
  "face, portrait, crowd, cartoon, anime, 3d render, glossy, cinematic lighting, " +
  "lens flare, bokeh, vignette, gradient, clutter, arrows, charts, collage frame, " +
  "low quality, blurry, jpeg artifacts, deformed, extra limbs";

/**
 * What is actually in this frame, in the author's own words where they gave
 * them. Order matters: an `Image Prompt` row is art direction and is trusted
 * whole, a `Footage` row names a thing, and the `Visual` line is a storyboard
 * sentence written for a human that has to have its direction stripped first.
 */
const subject = (beat) => {
  if (beat.image_prompt) return { text: beat.image_prompt, from: "Image Prompt" };
  if (beat.footage) return { text: beat.footage, from: "Footage" };

  // Bold runs are the on-screen type; the engine sets that itself, in the right
  // font, and a picture with the headline baked into it cannot be re-cut.
  const visual = (beat.visual ?? "")
    .replace(/\*\*.+?\*\*/g, " ")
    .replace(/[—–]/g, ", ");
  const kept = visual
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s && !DIRECTION.test(s));
  return kept.length ? { text: kept.join(" "), from: "Visual" } : null;
};

/** Names in the narration are real people — a victim, an investigator, someone
 *  convicted. None of them is a subject to hand to an image generator, so
 *  anything capitalised mid-sentence goes. Over-removal is the safe direction. */
const scrub = (text, vo) => {
  const named = new Set(
    (vo.match(/\b[A-Z][a-z]{2,}/g) ?? []).map((w) => w.toLowerCase()),
  );
  return text
    .split(/\s+/)
    .filter((w) => {
      const bare = w.toLowerCase().replace(/[^a-z]/g, "");
      return bare && !named.has(bare) && !CHARGED.test(w);
    })
    .join(" ")
    .replace(/\s+([,.])/g, "$1")
    .trim();
};

const sentence = (s) => {
  const t = s.trim().replace(/[.,;:]+$/, "");
  return t ? t[0].toUpperCase() + t.slice(1) + "." : "";
};

/**
 * Drop the "no faces, no text, no lettering" clauses an author writes by habit.
 * They belong in the negative prompt at the top of the sheet — in a positive
 * prompt a model reads them as three more votes for faces, text and lettering.
 */
const denegate = (text) =>
  text
    .split(/(?<=[.?!])\s+/)
    .map((s) =>
      s
        .split(/,\s*/)
        .filter((c) => !/^\s*(no|without|avoid|not)\b/i.test(c))
        .join(", "),
    )
    .map((s) => s.trim())
    .filter((s) => s.replace(/[.\s]/g, "").length > 2)
    .join(" ")
    .replace(/\s+([,.])/g, "$1");

/** Whether the author already said where the type goes. If they did, the sheet
 *  must not overrule them with a different zone — two negative-space
 *  instructions in one prompt is one instruction the model averages away. */
const framesItself = (text) =>
  /negative space|empty|blank|clear|reserved|sparse/i.test(text);

// ---------------------------------------------------------------- build
const shots = [];
for (const beat of script.beats) {
  if (!(beat.image_prompt || beat.footage || WANTS.has(beat.module))) continue;
  const found = subject(beat);
  if (!found) continue;
  const clean = scrub(found.text, beat.vo ?? "");
  if (clean.length < 12) continue;

  // An authored Image Prompt is already a composition, in a palette and a
  // framing its writer chose. Appending the house style block to it produced
  // two accent colours and two different negative-space zones in one prompt —
  // so an authored beat keeps its own art direction and only gets what it is
  // actually missing.
  const authored = found.from === "Image Prompt";
  const body = authored ? denegate(clean) : clean;

  for (let v = 0; v < VARIANTS; v++) {
    const file = v === 0 ? `beat-${beat.n}.jpg` : `beat-${beat.n}-${v + 1}.jpg`;
    const framing = FRAMINGS[v % FRAMINGS.length];
    let prompt;
    if (authored) {
      prompt = sentence(body);
      if (v > 0) {
        prompt += ` Reframe this same scene: ${framing.how[0].toLowerCase()}${framing.how.slice(1)}.`;
      }
      if (!framesItself(body)) prompt += ` Leave ${RESERVED} of the frame clear for typography.`;
    } else {
      prompt =
        `${sentence(body)} ${framing.how}, reserved for typography. ` +
        `${STYLE} Leave ${RESERVED} of the frame clear.`;
    }
    shots.push({ beat, file, from: found.from, tag: framing.tag, prompt });
  }
}

// ---------------------------------------------------------------- write
// Ten prompts to a file, each one headed by the filename it has to be saved as.
// The images are generated by hand, one at a time, so the slot has to travel
// with the prompt — a sheet of anonymous prompts means guessing afterwards which
// picture was beat 4, and a mis-slotted image is a beat that stages the wrong
// photograph rather than an obvious error.
mkdirSync(dst, { recursive: true });
// A rerun after the script shrank must not leave the previous run's extra pages
// lying next to the new ones, both looking current.
for (const f of readdirSync(dst)) {
  if (/^\d+\.md$/.test(f)) rmSync(join(dst, f));
}

const pad = String(shots.length).length;
const pages = [];
for (let i = 0; i < shots.length; i += PER_FILE) {
  const page = String(pages.length + 1).padStart(2, "0");
  // A prompt and its negative on the same line, then a blank line, then the
  // next block. Nothing else in the file: a heading or a filename sitting above
  // a prompt gets pasted into the generator with it, and a line break inside
  // the block makes a generator treat the negative as a second input. One
  // line per image is one paste per image. Which slot each prompt fills lives
  // in files.txt, in this same order.
  writeFileSync(
    join(dst, `${page}.md`),
    shots
      .slice(i, i + PER_FILE)
      .map((s) => `${s.prompt} Negative prompt: ${NEGATIVE}\n`)
      .join("\n"),
  );
  pages.push(`${page}.md`);
}

// Which prompt makes which file, in order — for `fetch-footage.py --import`,
// which slots a batch generator's 1.png, 2.png, 3.png without re-deriving it.
const index = join(dst, "files.txt");
writeFileSync(
  index,
  shots
    .map(
      (s, i) =>
        `${String(i + 1).padStart(pad)}  ${s.file.padEnd(16)}  ` +
        `beat ${s.beat.n} ${s.beat.name} (${s.tag})`,
    )
    .join("\n") + (shots.length ? "\n" : ""),
);

// The beats that stage without a photograph. Reported to the console rather
// than written into either file: an author needs to know the difference between
// "this beat draws itself" and "this beat was skipped", but the prompt file has
// to stay pasteable.
const drawn = script.beats.filter((b) => !shots.some((s) => s.beat.n === b.n));

console.log(
  `${dst}/\n  ${shots.length} prompts · ${pages.length} files (${pages.join(", ")}) · ` +
    `${new Set(shots.map((s) => s.beat.n)).size} beats · ${ASPECT}\n` +
    `${index}\n  which prompt becomes which file, in order\n` +
    (drawn.length
      ? `\nno image needed (these draw themselves):\n` +
        drawn.map((b) => `  beat ${b.n} ${b.name} — ${b.module}`).join("\n") +
        `\n  add a **Footage:** or **Image Prompt:** row to put a picture on one.`
      : ""),
);
