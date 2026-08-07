// story.txt -> video/src/script.json  (the crime documentary episode)
//
//   node tools/parse-story.mjs story.txt video/src/script.json
//
// The story is written as a director's script: timed sections, each declaring
// the modules it stages, the camera, the audio and the sound events, plus the
// narration and what is on screen. This reads that and emits beats — one beat
// per visual, sized so a single module never has to carry more than about ten
// seconds of narration.
//
// The timecodes in the headings are the author's intent, not the cut. Beats are
// timed from the word count here and retimed by tools/align.py once a take
// exists: the voice is the clock.
//
// FORMAT
//   **Topic:** / **Format:** / **Resolution:** / **FPS:**     episode metadata
//
//   # 0:00–0:35 — SECTION NAME
//   **MODULE:** EVIDENCE_CARD → DOCUMENT → REVEAL
//   **CAMERA:** investigate            (semantic intent, never a scale)
//   **AUDIO:** tension                 (mood; "silence"/"drops" opens on silence)
//   **SFX:** evidence / document       (semantic events, never filenames)
//   **VISUAL DENSITY:** 2 → 4
//   **ICONS:** hard-drive: STORAGE, file-text: METADATA    (ICON_STEPS beats)
//   **MARK:** circle                   (hand-drawn: circle/box/underline/
//                                       highlight/strike/arrow — DOODLE works too)
//
//   ### NARRATION
//   what is said, one line per beat of breath
//
//   ### VISUAL
//   what is seen. **BOLD LINES** are what goes on screen — a row of them
//   becomes the rows of a timeline, a map, a person card or a case board,
//   and "LABEL — DETAIL" is read as exactly that.
//
// A section named SHORT (or VERTICAL) starts the 9:16 cut, which is a second
// telling of the same case rather than a crop of the first.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const [src = "story.txt", dst = "video/src/script.json"] = process.argv.slice(2);

// --------------------------------------------------------------- vocabulary
/**
 * What a script is allowed to name -> what the engine stages. The left side is
 * the plan's module vocabulary; several names are deliberately the same
 * component, because a call log, a text message and a tower ping are one visual
 * idea: a record with a time on it.
 */
const MODULE = {
  CASE_OPEN: "caseOpen",
  CHAPTER_CARD: "chapter",
  CLOCK: "clock",
  CALENDAR: "clock",
  TIMELINE: "timeline",
  LOCATION_MAP: "map",
  MAP_ROUTE: "map",
  PERSON_CARD: "person",
  EVIDENCE_CARD: "evidence",
  DOCUMENT: "document",
  METADATA: "document",
  REDACTED_DOCUMENT: "redacted",
  CCTV: "cctv",
  PHONE_PING: "phone",
  CALL_LOG: "phone",
  TEXT_MESSAGE: "phone",
  HEADLINE: "headline",
  QUOTE: "quote",
  CASE_BOARD: "board",
  CONNECTION_GRAPH: "board",
  SPLIT_COMPARE: "compare",
  ALIBI_COMPARE: "compare",
  DNA_COMPARE: "compare",
  ARCHIVAL: "archival",
  REVEAL: "reveal",
  CASE_STATUS: "status",
  STATEMENT: "statement",
  // The explainer layer — hand-drawn marks, icon cards, ink charts, one big
  // number, words landing as spoken. Same components the vox engine stages,
  // re-dressed in the crime palette by crime/scenes.tsx.
  KINETIC: "kinetic",
  ICON_STEPS: "icon",
  ICONS: "icon",
  CHART: "chart",
  STAT: "stat",
  BIG_NUMBER: "stat",
  COUNTER: "stat",
};

/** Modules that stage rows rather than a single line of type. */
const ROWS = new Set([
  "timeline",
  "map",
  "person",
  "evidence",
  "board",
  "phone",
  "status",
  "compare",
  "chart",
  "stat",
]);

/**
 * Which of a section's on-screen lines a module is allowed to take.
 *
 * A section storyboards its whole visual, and the modules inside it each want a
 * different part of that: the timeline wants the dated lines, the map wants the
 * places. Without this a victim's age lands on the timeline as an event — and
 * because the timeline is the engine's story memory, it stays there for the
 * rest of the documentary.
 */
const TEMPORAL =
  /\b(19|20)\d{2}\b|\b\d{1,2}:\d{2}\b|\b(january|february|march|april|may|june|july|august|september|october|november|december)\b|\b\d+\s+(years?|months?|days?|hours?|minutes?)\b/i;
// A stat or chart row is "NUMBER — WHAT IT COUNTS" (or the reverse). Requiring
// the dash is what keeps a bare "**1974**" — a calendar cue — from becoming the
// number the stat proclaims.
const MEASURED = (cue) => !cue.side && /\d/.test(cue.text) && /\s[—–-]\s/.test(cue.text);
const FITS = {
  timeline: (cue) => TEMPORAL.test(cue.text) && !cue.side,
  map: (cue) => !TEMPORAL.test(cue.text) && !cue.side,
  // A line the script filed under LEFT or RIGHT is one half of a comparison.
  // It means nothing on its own, so only the split frame may have it.
  compare: (cue) => Boolean(cue.side),
  stat: MEASURED,
  chart: MEASURED,
};
const unsided = (cue) => !cue.side;

/** Modules that put imagery on screen, and so need a search keyword. */
const NEEDS_IMAGE = new Set([
  "caseOpen",
  "person",
  "cctv",
  "statement",
  "archival",
  "headline",
  "status",
  "clock",
]);

const VISUAL_MODE = {
  caseOpen: "photo",
  chapter: "text",
  clock: "time",
  timeline: "timeline",
  map: "map",
  person: "photo",
  evidence: "diagram",
  document: "document",
  redacted: "document",
  cctv: "surveillance",
  phone: "communication",
  quote: "text",
  headline: "archival",
  board: "case_board",
  compare: "diagram",
  reveal: "text",
  status: "text",
  archival: "archival",
  statement: "photo",
  kinetic: "text",
  icon: "icons",
  chart: "chart",
  stat: "number",
};

/** Camera intentions the engine knows. A script writes intent; the engine owns
 *  the move. Anything else in a CAMERA line is matched by keyword below. */
const INTENTS = [
  "observe",
  "investigate",
  "follow",
  "search",
  "connect",
  "isolate",
  "reveal",
  "shock",
  "reflect",
];
const CAMERA_WORDS = [
  [/static|hold|locked/i, "observe"],
  [/pull.?out|pull.?back|widen/i, "reflect"],
  [/push|closer|in on/i, "investigate"],
  [/travel|follow|track/i, "follow"],
  [/pan|across/i, "search"],
];

const DEFAULT_INTENT = {
  caseOpen: "observe",
  chapter: "reflect",
  clock: "isolate",
  timeline: "search",
  map: "search",
  person: "observe",
  evidence: "investigate",
  document: "investigate",
  redacted: "investigate",
  cctv: "follow",
  phone: "search",
  quote: "reflect",
  headline: "observe",
  board: "connect",
  compare: "isolate",
  reveal: "reveal",
  status: "reflect",
  archival: "observe",
  statement: "observe",
  kinetic: "reveal",
  icon: "investigate",
  chart: "investigate",
  stat: "isolate",
};

/** Sound events the audio engine can resolve to files. Anything else a script
 *  writes ("floppy-drive mechanism") is a note to a sound designer, not a cue,
 *  and is dropped rather than guessed at. */
const SFX_EVENTS = new Set([
  "document",
  "map_pin",
  "timestamp",
  "cctv",
  "message",
  "phone",
  "evidence",
  "transition_soft",
  "transition_hard",
  "reveal_minor",
  "reveal_major",
  "tension_rise",
  "chapter",
]);
/** Words a script uses for a cue that already exists under another name. */
const SFX_ALIASES = {
  paper: "document",
  newspaper: "document",
  envelope: "document",
  file: "document",
  map: "map_pin",
  pin: "map_pin",
  clock: "timestamp",
  tick: "timestamp",
  text: "message",
  reveal: "reveal_major",
  rise: "tension_rise",
  riser: "tension_rise",
  drone: "tension_rise",
  transition: "transition_soft",
};

const DEFAULT_SFX = {
  caseOpen: ["tension_rise"],
  chapter: ["chapter"],
  clock: ["timestamp"],
  timeline: ["timestamp"],
  map: ["map_pin"],
  evidence: ["evidence"],
  document: ["document"],
  redacted: ["document"],
  cctv: ["cctv"],
  phone: ["message"],
  headline: ["document"],
  board: ["reveal_minor"],
  reveal: ["reveal_major"],
  archival: ["transition_soft"],
  icon: ["transition_soft"],
  chart: ["timestamp"],
  stat: ["reveal_minor"],
};

/** An AUDIO line is prose. This is the only place it becomes a number. */
const MOODS = [
  [/silen|drops? (completely|out)|no music|music cuts/i, 0.0],
  [/minimal|almost no|strip|reduce|remove layers|nearly silent/i, 0.18],
  [/aftermath|resolution|restrained|calm/i, 0.35],
  [/low|controlled|deliberate|observ/i, 0.42],
  [/pulse|investigat|builds?|returns?|gradual/i, 0.58],
  [/tension|rises?|danger/i, 0.72],
  [/impact|full|swell|reveal/i, 0.9],
];

const WPM = 145; // a documentary read, not a shorts read
const HOLD = 0.35; // the breath after a beat
/** How much narration one visual is allowed to carry. Past this the viewer is
 *  listening to a podcast with a photograph attached. Six seconds is the
 *  documentary end of the range — modules animate inside their own beat, so the
 *  frame changes more often than this, but the *subject* changes on this clock. */
const BEAT_SECONDS = 6;

// --------------------------------------------------------------- factuality
/**
 * Crime narration is about real people, and a sentence that states a crime as
 * fact has to say who established it.
 *
 * The bar moves with the case. Where the story establishes an adjudicated
 * outcome — a plea, a verdict, a sentence — stating what was proven is
 * reporting, and a missing attribution is a note. Where nothing has been
 * adjudicated anywhere in the file, an unattributed accusation is defamation
 * with a soundtrack, and the engine refuses to render it.
 */
const ACCUSE =
  /\b(killed|murdered|kidnapped|abducted|raped|stabbed|shot|strangled|stole|robbed|assaulted|defrauded|poisoned)\b/i;
const ATTRIBUTED =
  /\b(alleged\w*|accus\w+|charg\w+|prosecut\w+|police|investigators?|detectives?|according to|court|testif\w+|testimony|reportedly|said|claimed|convicted|pleaded|guilty|jury|verdict|indict\w+|suspect\w+|coroner|medical examiner|autopsy|admitted|confess\w+|witness\w*|sentenc\w+|authorities)\b/i;
const ADJUDICATED =
  /\b(pleaded guilty|pled guilty|found guilty|convicted|the verdict|was sentenced|sentenced him|sentenced her|life sentences?)\b/i;

const sentences = (text) => text.split(/(?<=[.?!])\s+/).filter(Boolean);

// --------------------------------------------------------------- helpers
const words = (text) => text.split(/\s+/).filter(Boolean).length;
const speech = (text) => (words(text) / WPM) * 60;

const clean = (s) =>
  s
    .replace(/\*\*/g, "")
    .replace(/^["“]|["”]$/g, "")
    .trim();

/** "**JOSEPH — 38**" -> {label, raw}. A cue with no dash is a label on its own. */
const asRow = (cue) => {
  const parts = cue.split(/\s+[—–]\s+|\s+-\s+/);
  const label = parts[0].trim();
  const raw = parts.slice(1).join(" — ").trim();
  return { label, raw, value: Number(raw.replace(/[^\d.-]/g, "")) || 0 };
};

const STOP = new Set(
  ("the a an and or but of to in on at for it its into over from with that this " +
    "then than as by is was were are be been being he she they his her their him " +
    "them we you i not no yes if so up down out off again very just only same " +
    "camera screen frame beat hold slowly appears enters shot cut music sfx text " +
    "large small left right center top bottom black white").split(/\s+/),
);

/** A search query for a beat that has to put imagery on screen. Built from what
 *  the script says is on screen, which is what the author actually wanted. */
const query = (text) => {
  const seen = new Set();
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w) && !seen.has(w) && seen.add(w))
    .slice(0, 4)
    .join(" ");
};

// --------------------------------------------------------------- read
const raw = readFileSync(src, "utf8").replace(/\r\n/g, "\n");

// The scam engine writes its story as beat tables — "### BEAT n — NAME" then a
// "| layer | content |" table per beat. The crime format never writes a BEAT
// heading, so the heading is the detection. The two stories are different
// contracts, and mixing their parsers in one file is how a scam episode ends
// up with a CAMERA line and a crime episode ends up with a chat row.
if (/^#{2,3}\s+BEAT\b/im.test(raw)) {
  parseScam(raw, src, dst);
  process.exit(0);
}

const lines = raw.split("\n");
const errors = [];
const warnings = [];
const meta = {};

/** "**Key:** value" or "Key: value", the two ways a script writes a field. */
const field = (line) => {
  const m = line.match(/^\s*(?:\*\*)?([A-Za-z][\w \-/]*?)(?:\*\*)?\s*:\s*\*{0,2}(.*?)\*{0,2}\s*$/);
  return m && m[2] !== "" ? [m[1].trim().toLowerCase(), m[2].trim()] : null;
};

// A section heading carries a timecode. Requiring one is what stops a bold
// title *inside* a VISUAL block ("# THE FLOPPY DISK") from being read as the
// start of a new section. A story with no timecodes at all falls back to plain
// headings.
const TIMED = /^#{1,3}\s+(\d{1,2}:\d{2})\s*[–—-]\s*(\d{1,2}:\d{2})\s*[—–-]?\s*(.*)$/;
const PLAIN = /^#{1,2}\s+(.+?)\s*$/;
const timed = lines.some((l) => TIMED.test(l));

const sections = [];
let current = null;
let block = "head";
for (const line of lines) {
  const at = line.match(TIMED);
  const plain = line.match(PLAIN);
  // The vertical cut is the one section that never carries a timecode: it is a
  // second telling of the case, so it has no place on the documentary's clock.
  const head = at ?? (!timed || /^(short|vertical)\b/i.test(plain?.[1] ?? "") ? plain : null);
  if (head) {
    const name = (at ? at[3] : head[1]).trim();
    current = { name, at: at ? at[1] : "", fields: {}, narration: [], visual: [] };
    sections.push(current);
    block = "head";
    continue;
  }
  const sub = line.match(/^###\s+(.+?)\s*$/);
  if (sub && current) {
    const name = sub[1].toUpperCase();
    block = name.startsWith("NARRAT") ? "narration" : name.startsWith("VISUAL") ? "visual" : "skip";
    continue;
  }
  // In a timed script a heading without a timecode is not a section: it is
  // either a title card drawn inside a VISUAL block or the engine notes at the
  // bottom of the file. Either way the section above it is finished, and
  // nothing below it belongs to that section.
  if (timed && /^#{1,2}\s+\S/.test(line)) {
    current = null;
    continue;
  }
  if (!current) {
    // Metadata is what stands above the first section. Anything that looks like
    // a field after that is a note to a human.
    const kv = sections.length ? null : field(line);
    if (kv) meta[kv[0]] = kv[1];
    continue;
  }
  if (block === "head") {
    const kv = field(line);
    if (kv) current.fields[kv[0]] = kv[1];
  } else if (block === "narration") current.narration.push(line);
  else if (block === "visual") current.visual.push(line);
}

// --------------------------------------------------------------- beats
const beats = [];
const memory = { timeline: [], board: [] };
let track = "long";
let n = 0;
// The vertical cut numbers above the documentary so one `n` never means two
// beats — every artifact downstream (beat-N.wav, beat-N.jpg, voice.json) is
// keyed by it. Set when the cut starts, because that is when the long track's
// length is finally known.
let shortN = 100;

/** The on-screen lines of a section, in order, with which side of a split they
 *  belong to. A heading inside a VISUAL block is a title card, so it counts. */
const cues = (visual) => {
  const out = [];
  let side = "";
  for (const line of visual) {
    const text = line.trim();
    if (/^LEFT:?$/i.test(text)) side = "left";
    else if (/^RIGHT:?$/i.test(text)) side = "right";
    else if (/^CENTER:?$/i.test(text)) side = "";
    const bold = text.match(/^\*\*(.+?)\*\*[.:]?$/) ?? text.match(/^#{1,3}\s+(.+?)$/);
    if (bold) {
      const value = clean(bold[1]);
      if (value && !/^(sfx|beat|hold|black|end)\b/i.test(value)) out.push({ text: value, side });
    }
  }
  return out;
};

for (const section of sections) {
  const narration = section.narration
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\*\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // Sections with no narration are the script's own notes to the engine — the
  // audio arc, the camera arc, the retention checklist. They are not beats.
  if (!narration) continue;

  if (/\b(short|vertical|9:16)\b/i.test(section.name) && track !== "short") {
    track = "short";
    shortN = (Math.floor(n / 100) + 1) * 100;
    memory.timeline = [];
    memory.board = [];
  }

  // "SHORT — THE ASK" names the cut for the writer; the slug on screen is the
  // chapter, and the cut is not one.
  const chapter = section.name
    .replace(/\(.*?\)/g, "")
    .replace(/^(short|vertical)\b\s*[—–:-]*\s*/i, "")
    .trim()
    .toUpperCase();

  // ---- what this section stages
  const named = (section.fields.module ?? "")
    .split(/→|->|\/|,|>/)
    .map((s) => s.trim().toUpperCase().replace(/\s+/g, "_"))
    .filter(Boolean);
  const staged = [];
  for (const name of named) {
    if (MODULE[name]) staged.push(MODULE[name]);
    else warnings.push(`section "${section.name}": unknown module ${name} — ignored`);
  }
  if (!staged.length) staged.push("statement");

  const intents = (section.fields.camera ?? "")
    .split(/→|->|\/|,/)
    .map((part) => {
      const word = part.trim().toLowerCase();
      return (
        INTENTS.find((i) => word.includes(i)) ??
        CAMERA_WORDS.find(([re]) => re.test(word))?.[1] ??
        ""
      );
    })
    .filter(Boolean);

  // "silence → low impact → resolution" is three states, not one. They are
  // spread across the section's beats the same way its modules are — a section
  // that drops the music for its reveal must not stay silent for a minute.
  const levels = (section.fields.audio ?? "")
    .split(/→|->|,|then/i)
    .map((part) => MOODS.find(([re]) => re.test(part))?.[1])
    .filter((x) => x !== undefined);

  const events = (section.fields.sfx ?? "")
    .split(/\/|,|→|->/)
    .map((part) => {
      const word = part.trim().toLowerCase().replace(/[\s-]+/g, "_");
      if (SFX_EVENTS.has(word)) return word;
      const alias = Object.keys(SFX_ALIASES).find((k) => word.includes(k));
      return alias ? SFX_ALIASES[alias] : "";
    })
    .filter(Boolean);

  // "hard-drive: STORAGE, file-text: METADATA" — lucide name, then the label.
  // Only icon beats carry them; anywhere else they would be dead weight in the
  // episode JSON.
  const icons = (section.fields.icons ?? "")
    .split(",")
    .map((part) => {
      const [icon, ...rest] = part.split(":");
      return { icon: icon.trim().toLowerCase(), label: rest.join(":").trim() };
    })
    .filter((x) => x.icon && x.label);

  // The hand-drawn annotation — "MARK: circle" (DOODLE accepted). One shape for
  // the section; the module that stages type decides where it lands.
  const shape = (section.fields.mark ?? section.fields.doodle ?? "")
    .trim()
    .toLowerCase();

  const density = Math.max(
    ...(section.fields["visual density"] ?? "3")
      .split(/[^\d]+/)
      .map(Number)
      .filter((x) => x >= 1 && x <= 5),
    1,
  );

  // ---- how many beats the section becomes
  // Never fewer than the modules it named, never so few that one visual has to
  // carry a minute of narration.
  const count = Math.max(staged.length, Math.ceil(speech(narration) / BEAT_SECONDS));
  const sentenceList = sentences(narration);
  const per = Math.ceil(sentenceList.length / count);
  const chunks = [];
  for (let i = 0; i < sentenceList.length; i += per) {
    chunks.push(sentenceList.slice(i, i + per).join(" "));
  }
  const marks = cues(section.visual);

  // Modules run in the order the script declared them, stretched across the
  // beats: "DOCUMENT → REVEAL" over four beats is doc, doc, reveal, reveal.
  const plan = chunks.map((_, i) =>
    staged[Math.min(staged.length - 1, Math.floor((i * staged.length) / chunks.length))],
  );

  // Where each run of one module starts, and how long it runs.
  const from = plan.map((_, i) => i);
  for (let i = 1; i < plan.length; i++) if (plan[i] === plan[i - 1]) from[i] = from[i - 1];
  const runs = {};
  plan.forEach((_, i) => (runs[from[i]] = i - from[i] + 1));

  chunks.forEach((vo, i) => {
    const module = plan[i];
    const pick = (list, fallback) =>
      list.length
        ? list[Math.min(list.length - 1, Math.floor((i * list.length) / chunks.length))]
        : fallback;
    const intent = pick(intents, DEFAULT_INTENT[module] ?? "observe");
    const level = pick(levels, undefined);

    // A composed object — a person card, a comparison, a board — is the whole
    // set of on-screen lines the section wrote, revealed across the beats that
    // stage it. A beat that carries one line takes the line at its position.
    const runLength = runs[from[i]];
    const step = i - from[i];

    let data = [];
    let accent = 0;
    let links;
    if (ROWS.has(module)) {
      let fit = marks.filter(FITS[module] ?? unsided);
      // A comparison in a section that never marked its sides still has to
      // compare something: fall back to every line it wrote.
      if (module === "compare" && !fit.length) fit = marks;
      // Rows arrive as the run progresses, so a card builds field by field
      // instead of restarting whole on every beat that stages it.
      const take = Math.ceil(((step + 1) * fit.length) / runLength);
      const had = Math.ceil((step * fit.length) / runLength);
      data = fit.slice(0, take).map((cue) => ({ ...asRow(cue.text), side: cue.side }));
      accent = had;
      if (module === "timeline" || module === "board") {
        const store = module === "timeline" ? memory.timeline : memory.board;
        const before = store.length;
        for (const row of data) if (!store.some((s) => s.label === row.label)) store.push(row);
        data = store.map((row) => ({ ...row }));
        accent = before;
      }
      if (module === "board") {
        // A board is built one link at a time, in the order it was written.
        links = data.slice(1).map((_, k) => [k, k + 1]);
      }
      // Nothing new on this beat: highlight nothing rather than the last row.
      accent = Math.min(accent, data.length);
    }

    const slice = marks.slice(
      Math.floor((i * marks.length) / chunks.length),
      Math.floor(((i + 1) * marks.length) / chunks.length),
    );
    const text = ROWS.has(module) ? "" : (slice[0]?.text ?? "");
    const look = [vo, section.visual.join(" ")].join(" ");
    const beat = {
      n: track === "short" ? ++shortN : ++n,
      name: chapter || module.toUpperCase(),
      chapter,
      module,
      vo,
      visual: section.visual.map((l) => l.trim()).filter(Boolean).slice(0, 6).join(" "),
      text,
      source: section.fields.source ?? "",
      footage: NEEDS_IMAGE.has(module) ? (section.fields.footage ?? query(look)) : "",
      // Nothing the pipeline can fetch is case material. A beat only claims
      // otherwise when the script says so.
      provenance: (section.fields.provenance ??
        (/reconstruction/i.test(section.visual.join(" ")) ? "reconstruction" : "illustrative")).toLowerCase(),
      intent,
      density,
      intensity: 0,
      // A beat the script silenced. The drop is what makes the next thing a
      // reveal, so it is a property of this beat and not of the module.
      silence: level === 0,
      sfx: (i === 0 && events.length ? events : (DEFAULT_SFX[module] ?? [])).slice(0, 2),
      data,
      accent,
      track,
    };
    if (links) beat.links = links;
    if (module === "icon" && icons.length) beat.icons = icons;
    if (shape) beat.shape = shape;
    beat.level = level;
    beats.push(beat);
  });

  // ---- factuality, once per section
  for (const sentence of sentenceList) {
    if (ACCUSE.test(sentence) && !ATTRIBUTED.test(sentence) && !/["“]/.test(sentence)) {
      const where = `"${sentence.trim()}" (${section.name})`;
      if (ADJUDICATED.test(raw)) warnings.push(`unattributed in an adjudicated case: ${where}`);
      else
        errors.push(
          `unattributed accusation: ${where}\n` +
            `      say who established it — "prosecutors said…", "police alleged…",\n` +
            `      "the jury found…" — or quote it. Nothing in this story records a\n` +
            `      plea, a verdict or a sentence, so the engine will not state it as fact.`,
        );
    }
  }
}

if (!beats.length) errors.push(`no "### NARRATION" blocks found in ${src}`);

// --------------------------------------------------------------- variation
// Past three beats in the same visual mode the frame has stopped changing, and
// it stops changing across section boundaries as often as inside them. The
// fourth becomes a statement — imagery under the line — which is a real
// editorial choice and not a fake twist.
//
// Modules that accumulate are exempt: a case board that keeps adding a link IS
// the change, and interrupting it throws away the only thing it was doing.
const BUILDS = new Set(["board", "timeline"]);

/** Fall back to imagery under the line. Used wherever a module turns out to
 *  have nothing to stage — the honest frame is a picture and the narration,
 *  not an information graphic with one entry on it. */
const toStatement = (beat) => {
  beat.text = beat.text || beat.data[beat.accent]?.label || beat.data[0]?.label || "";
  beat.module = "statement";
  beat.data = [];
  beat.accent = 0;
  beat.intent = "observe";
  beat.sfx = [];
  beat.footage = beat.footage || query(beat.vo);
  delete beat.links;
  delete beat.icons;
};

// A diagram of one thing is not a diagram. A timeline with a single entry, a
// map with a single pin or a comparison with a single side is a caption that
// has been given a chart's frame, and it reads as a mistake.
const NEEDS_TWO = new Set(["timeline", "map", "board", "compare", "chart"]);
for (const beat of beats) {
  if (NEEDS_TWO.has(beat.module) && beat.data.length < 2) toStatement(beat);
  // A stat with no number and an icon beat with no icons have nothing to stage.
  if (beat.module === "stat" && !beat.data.length) toStatement(beat);
  if (beat.module === "icon" && !(beat.icons ?? []).length) toStatement(beat);
}

// A beat the storyboard gave no line to still has to put something on the
// frame. The narration almost always contains the fact worth remembering — a
// time, a date, a count, an amount — so take that rather than leave the frame
// to the background.
const FACT = [
  /\b\d{1,2}:\d{2}\s?[ap]\.?m\.?/i,
  /\b\w+[- ](?:one|two|three|four|five|six|seven|eight|nine)?\s*(?:hundred|thousand)?\s*(?:minutes|hours|seconds)\b/i,
  /\$[\d,]+(?:\.\d+)?(?:\s?(?:million|billion|thousand))?/i,
  /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:,?\s*\d{4})?/i,
  /\b\d+\s+(?:minutes|hours|days|weeks|months|years|miles|feet|counts|murders|letters|victims)\b/i,
  /\b(?:19|20)\d{2}\b/,
];
for (const beat of beats) {
  // Rows are already something on the frame. Stamping a date over a card the
  // storyboard filled in is a second headline arguing with the first.
  if (beat.text || beat.data.length) continue;
  for (const re of FACT) {
    const hit = beat.vo.match(re);
    if (hit) {
      beat.text = hit[0].toUpperCase().replace(/\s+/g, " ").trim();
      break;
    }
  }
}

let same = 1;
for (let i = 1; i < beats.length; i++) {
  const beat = beats[i];
  const prev = beats[i - 1];
  if (beat.track !== prev.track || VISUAL_MODE[beat.module] !== VISUAL_MODE[prev.module]) {
    same = 1;
    continue;
  }
  same++;
  if (same > 3 && !BUILDS.has(beat.module)) {
    toStatement(beat);
    same = 1;
  }
}

// --------------------------------------------------------------- timing
const clock = { long: 0, short: 0 };
beats.forEach((beat, i) => {
  const key = beat.track;
  const dur = Math.max(1.6, speech(beat.vo) + HOLD);
  beat.start = Number(clock[key].toFixed(3));
  beat.end = Number((clock[key] + dur).toFixed(3));
  clock[key] = beat.end;
  // Tension is built across the whole episode, not per scene: the same module
  // sits louder at minute eight than it does at minute one. A script that
  // stated a level for the section overrides the curve.
  const arc = beats.length > 1 ? i / (beats.length - 1) : 0;
  const base = beat.level ?? Math.min(0.75, 0.3 + beat.density * 0.09);
  beat.intensity = Number(Math.min(1, base * (0.85 + arc * 0.3)).toFixed(2));
  delete beat.level;
});

// --------------------------------------------------------------- qc
const long = beats.filter((b) => b.track === "long");
const short = beats.filter((b) => b.track === "short");

// A documentary that stops changing shape stops being watched.
let run = 1;
for (let i = 1; i < long.length; i++) {
  run = VISUAL_MODE[long[i].module] === VISUAL_MODE[long[i - 1].module] ? run + 1 : 1;
  if (run >= 5 && !BUILDS.has(long[i].module)) {
    warnings.push(
      `beats ${long[i - run + 1].n}-${long[i].n} are all "${VISUAL_MODE[long[i].module]}" — the picture stops moving`,
    );
    run = 1;
  }
}

// Retention: something has to arrive on screen — a fact, a row, a reveal —
// every 45 seconds, or the middle of the documentary goes flat.
let lastEvent = 0;
for (const beat of long) {
  if (beat.text || beat.data.length || beat.module === "reveal") lastEvent = beat.end;
  else if (beat.end - lastEvent > 45) {
    warnings.push(
      `beat ${beat.n} (${beat.chapter}): ${Math.round(beat.end - lastEvent)}s with nothing new on screen`,
    );
    lastEvent = beat.end;
  }
}

if (long.length && !long.some((b) => b.module === "status")) {
  warnings.push("no CASE_STATUS beat — a documentary that ends without one leaves nothing");
}
if (short.length && (clock.short < 18 || clock.short > 75)) {
  warnings.push(`the vertical cut is ${Math.round(clock.short)}s — aim for 30-60`);
}
// The script's own timecodes are intent, not the cut, but a wild gap means the
// narration was written for a different runtime than the one it will get.
const planned = sections
  .map((s) => s.at)
  .filter(Boolean)
  .pop();
if (planned) {
  const [m, s] = planned.split(":").map(Number);
  const drift = Math.abs(clock.long - (m * 60 + s));
  if (drift > 120) {
    warnings.push(
      `narration runs ~${Math.round(clock.long / 60)} min against a script planned for ~${m} min`,
    );
  }
}

if (errors.length) {
  console.error(`\n${src} — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error("");
  process.exit(1);
}

// --------------------------------------------------------------- write
const size = (meta.resolution ?? "").match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/);
const vertical =
  /\b(short|vertical|portrait|9:16)\b/i.test(meta.format ?? "") ||
  (size ? Number(size[1]) < Number(size[2]) : false);

const out = {
  source: src,
  title: meta.topic ?? meta.title ?? "Untitled case",
  engine: "crime",
  fps: Number(meta.fps) || 30,
  width: size ? Number(size[1]) : vertical ? 1080 : 1920,
  height: size ? Number(size[2]) : vertical ? 1920 : 1080,
  case: {
    title: meta.topic ?? meta.title ?? "",
    question: meta["central question"] ?? meta.question ?? "",
    audience: meta.target ?? "",
    style: meta.style ?? "",
  },
  durationInSeconds: Number(clock.long.toFixed(3)),
  shortSeconds: Number(clock.short.toFixed(3)),
  beats,
};

writeFileSync(dst, JSON.stringify(out, null, 2));

// --------------------------------------------------------------- voice stub
// The engine reads word timings from voice.json. Until a take exists there is
// nothing to read, so write the script's own timing with the words spread
// evenly — the video still builds, it just has no narrator. tools/align.py
// overwrites this with what the recording actually did.
writeFileSync(
  join(dirname(dst), "voice.json"),
  JSON.stringify(
    {
      total: out.durationInSeconds,
      beats: beats.map((b) => {
        const list = b.vo.split(/\s+/).filter(Boolean);
        const step = (b.end - b.start) / Math.max(1, list.length);
        return {
          n: b.n,
          file: "",
          start: b.start,
          dur: Number((b.end - b.start).toFixed(3)),
          speech: Number((b.end - b.start).toFixed(3)),
          words: list.map((w, i) => ({
            w,
            start: Number((i * step).toFixed(3)),
            end: Number(((i + 1) * step).toFixed(3)),
          })),
        };
      }),
    },
    null,
    2,
  ),
);

for (const w of warnings) console.warn(`  ! ${w}`);
const mins = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
console.log(
  `\n${dst}\n  ${out.width}x${out.height} · ${mins(clock.long)} documentary` +
    (short.length ? ` + ${Math.round(clock.short)}s vertical cut` : "") +
    ` · ${long.length} beats · ${words(long.map((b) => b.vo).join(" "))} words\n  ` +
    long.map((b) => b.module).join(" → ") +
    (short.length ? `\n  short: ${short.map((b) => b.module).join(" → ")}` : ""),
);

// ================================================================ SCAM FORMAT
// The scam engine's story contract. One beat per table, no sections, no camera,
// no module to pick — the writer fills rows and the engine picks the visual:
//
//   ### BEAT 4 — THE HOOK (0:15–0:25)
//
//   | layer | content |
//   |---|---|
//   | **vo** | "It started with a single message." |
//   | **text** | IT STARTED WITH A MESSAGE |
//   | **chat** | whatsapp: Catherine: Hi! I saw your profile. How are you? · profile: anonymous silhouette · accent: orange |
//   | **transfer** | from: Margaret · to: HK Logistics Ltd · amount: $28,000 · status: SENT · money: green |
//   | **chart_data** | $28,000, $54,000, $87,000, $145,000, $220,000, $310,000, $400,000 |
//   | **icon** | message-circle: WHATSAPP, heart: ROMANCE, gift: GIFT |
//   | **doodle** | circle around "David" |
//   | **alert** | true |
//   | **kinetic_size** | huge |
//   | **image_prompt** | stack of cash on a wooden table |
//   | **sfx** | notification ping |
//   | **hold** | 3 |
//
// Rows are optional; the module picker takes the first present row of
// chat > chart_data > transfer > icon > doodle > image_prompt, and a beat with
// none of them is kinetic. The timecodes in the heading are the author's
// intent, not the cut — voice.json retimes the episode once a take exists.
function parseScam(raw, src, dst) {
  const lineList = raw.split("\n");
  const errors = [];
  const warnings = [];

  // Annotation boxes written by chat-mockup.py / transfer-mockup.py, read back
  // from the same public/footage directory the renderer serves the PNGs from.
  const sidecar = (name) => {
    try {
      return JSON.parse(readFileSync(join(dirname(dst), "..", "public/footage", name), "utf8"));
    } catch {
      return null;
    }
  };

  const field = (line) => {
    const m = line.match(/^\s*(?:\*\*)?([A-Za-z][\w \-/]*?)(?:\*\*)?\s*:\s*\*{0,2}(.*?)\*{0,2}\s*$/);
    return m && m[2] !== "" ? [m[1].trim().toLowerCase(), m[2].trim()] : null;
  };

  // "### BEAT 4 — THE HOOK (0:15–0:25)" -> {n, name, plan:[start,end]}
  const BEAT = /^#{2,3}\s+BEAT\s+(\d+)\s*[—–:-]?\s*(.*?)\s*(?:\((\d{1,2}):(\d{2})\s*[–—-]\s*(\d{1,2}):(\d{2})\))?\s*$/i;
  // "| **vo** | text |" — the layer name is the row's key.
  const ROW = /^\|\s*\*\*([a-z0-9_]+)\*\*\s*\|\s*(.*?)\s*\|\s*$/i;

  const meta = {};
  const beats = [];
  let current = null;

  for (const line of lineList) {
    if (line.startsWith("###") || line.startsWith("## ")) {
      const at = line.match(BEAT);
      if (at) {
        current = { n: Number(at[1]), name: at[2].trim().toUpperCase(), plan: at[4] ? [at[3] * 60 + Number(at[4]), at[5] * 60 + Number(at[6])] : null, rows: {} };
        if (beats.some((b) => b.n === current.n)) errors.push(`duplicate BEAT ${current.n}`);
        beats.push(current);
        continue;
      }
      if (line.startsWith("###")) {
        if (current) {
          current = null; // a stray heading ends the beat
          continue;
        }
      }
      continue;
    }
    if (line.startsWith("|---") || line.startsWith("| ---")) continue;
    const row = line.match(ROW);
    if (!row) {
      if (current) {
        const kv = field(line);
        if (kv) current.rows[kv[0]] = kv[1];
      } else {
        const kv = beats.length ? null : field(line);
        if (kv) meta[kv[0]] = kv[1];
      }
      continue;
    }
    if (!current) continue;
    current.rows[row[1].toLowerCase()] = row[2].trim();
  }

  if (!beats.length) errors.push(`no "### BEAT n — NAME" blocks found in ${src} (scam format)`);

  // ---------------------------------------------------------- module picking
  const shapeOf = (raw) => {
    const shape = (raw.match(/(circle|box|underline|strike|highlight|arrow)\b/i) ?? ["", "underline"])[1].toLowerCase();
    const quoted = raw.match(/"([^"]+)"/);
    const arr = raw.match(/\bfrom\s+"?([\w]+)"?\s+to\s+"?([\w]+)"?/i);
    if (arr) return { shape, from: arr[1].toLowerCase(), to: arr[2].toLowerCase() };
    if (quoted) return { shape, target: quoted[1].toLowerCase().replace(/\s+/g, " ") };
    const target = raw
      // "peak" is a target the chart module resolves, not a filler word — strip
      // it and "underline under the chart peak" resolves to nothing at all.
      .replace(/\b(circle|box|underline|strike|highlight|roughjs|arrow|around|under|underneath|over|on|the|entire|whole|last|first|chart|from|to)\b/gi, " ")
      .replace(/[^a-z0-9 ]+/gi, " ")
      .trim()
      .toLowerCase();
    return { shape, target };
  };

  const compact = (value) =>
    new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 0 }).format(value);

  // A row name is the writer's vocabulary; a module name is the renderer's, and
  // they are deliberately not the same words. Returning the row name here ships
  // a module the registry has never heard of, and the renderer's `?? kinetic`
  // fallback turns that into a plain text card without ever raising — the beat
  // silently becomes a caption of its own voiceover. Keys are in precedence
  // order (object key order is insertion order for string keys).
  const MODULE_OF = {
    chat: "chat",
    chart_data: "chart",
    transfer: "transfer",
    icon: "icon",
    doodle: "annotation",
    image_prompt: "footage",
  };
  // Must match SCAM_MODULES in video/src/scam/scenes.tsx. A module missing from
  // there renders blank, so the parser refuses to emit one.
  const SCAM_MODULES = new Set([
    "kinetic", "chat", "transfer", "chart", "annotation", "icon", "footage",
  ]);
  const pick = (rows) => {
    for (const row of Object.keys(MODULE_OF)) if (rows[row]) return MODULE_OF[row];
    return "kinetic";
  };

  // ---------------------------------------------------------------- timing
  // The scam narrator is calm and deliberate — slower than the documentary
  // read — so the clock starts at 120 WPM and the voice (align.py) corrects it.
  const WPM = 120;
  const HOLD = 0.45; // the breath after a line
  const SILENT = 3.0; // a beat with no vo gets a held frame, not a skip
  const speech = (text) => (words(text) / WPM) * 60;

  const sfxTable = [];

  // SFX events are written as the sound a beat needs, resolved to files the
  // pack actually has. Anything else is a note to a sound designer.
  const SFX_EVENTS = {
    ping: "pop", notification: "pop", message: "pop", pop: "pop",
    hit: "boom", slam: "boom", hard: "boom",
    warning: "stamp", tone: "stamp", alert: "stamp", stamp: "stamp",
    riser: "riser", tension: "riser", pad: "riser",
    scratch: "whoosh", whoosh: "whoosh", whoosh_up: "whoosh-up",
    shimmer: "shimmer", chime: "chime", tick: "tick",
  };
  const DEFAULT_SFX = { chat: ["pop"], transfer: ["shimmer"], chart: ["tick"] };

  let t = 0;
  for (const beat of beats) {
    const rows = beat.rows;
    const vo = (rows.vo ?? "").replace(/^["“]|["”]$/g, "").trim();
    const silent = !vo;
    const hold = Number(rows.hold) > 0 ? Number(rows.hold) : SILENT;
    const dur = silent ? hold : Math.max(1.6, speech(vo) + HOLD);
    beat.start = Number(t.toFixed(3));
    beat.end = Number((t + dur).toFixed(3));
    t += dur;

    const module = pick(rows);
    const icons = (rows.icon ?? "")
      .split(",")
      .map((part) => {
        const [icon, ...rest] = part.split(":");
        return { icon: icon.trim().toLowerCase(), label: rest.join(":").trim() };
      })
      .filter((x) => x.icon && x.label);
    const doodle = rows.doodle ? shapeOf(rows.doodle) : null;
    // Money is written the way money is written — "$28,000" — so a plain split
    // on "," cuts every amount into "$28" and "000" and the climbing line
    // becomes a sawtooth. Split on a comma only when it is not a thousands
    // separator (not followed by exactly three digits), or on an explicit "·".
    const data = (rows.chart_data ?? "")
      .split(/\s*·\s*|,(?!\d{3}(?:\D|$))/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((raw) => ({
        raw,
        label: compact(Number(raw.replace(/[^\d.-]/g, "")) || 0),
        value: Number(raw.replace(/[^\d.-]/g, "")) || 0,
      }));

    if (!SCAM_MODULES.has(module)) {
      errors.push(
        `beat ${beat.n} resolved to module "${module}", which the renderer does not have — ` +
          `it would render as a blank text card. Known: ${[...SCAM_MODULES].join(", ")}`,
      );
    }
    beat.module = module;
    beat.vo = vo;
    beat.track = "short";
    beat.visual = "NONE"; // the vox engine types on this; scam never stages vox
    if (rows.text) beat.text = rows.text.replace(/^["“]|["”]$/g, "").trim();
    if (rows.kinetic_size) beat.kinetic_size = rows.kinetic_size.toLowerCase();
    // The mockup tools write a PNG plus a sidecar of its annotation boxes, and
    // the renderer will not show a mockup it has no boxes for. Reading the
    // sidecars here makes script.json complete on every parse: without it,
    // re-running `npm run story` after an edit drops the boxes the tools had
    // merged in, and every chat and transfer beat silently renders as a blank
    // page until someone remembers to re-run the mockups.
    if (rows.chat) {
      beat.chat = rows.chat;
      const boxes = sidecar(`chat-${beat.n}.json`);
      if (boxes) beat.chat_boxes = boxes;
      else warnings.push(`beat ${beat.n} has a chat: row but no chat-${beat.n}.json — run chat-mockups, or it renders blank`);
    }
    if (rows.transfer) {
      beat.transfer = rows.transfer;
      const boxes = sidecar(`transfer-${beat.n}.json`);
      if (boxes) beat.transfer_boxes = boxes;
      else warnings.push(`beat ${beat.n} has a transfer: row but no transfer-${beat.n}.json — run transfer-mockups, or it renders blank`);
    }
    if (data.length) beat.data = data;
    if (icons.length) beat.icons = icons;
    if (doodle) beat.doodle = doodle;
    if (rows.alert && /^(true|yes|1)$/i.test(rows.alert)) beat.alert = true;
    if (rows.image_prompt) beat.footage = rows.image_prompt;
    if (rows.source) beat.source = rows.source;

    // one accent, maybe two — sfx punctuate, they don't score
    const named = (rows.sfx ?? "")
      .split(/[\/,]+|→|->/)
      .map((part) => {
        const word = part.trim().toLowerCase().replace(/\s+/g, "_");
        if (SFX_EVENTS[word]) return SFX_EVENTS[word];
        const key = Object.keys(SFX_EVENTS).find((k) => word.includes(k));
        return key ? SFX_EVENTS[key] : null;
      })
      .filter(Boolean);
    beat.sfx = (named.length ? named.slice(0, 2) : DEFAULT_SFX[module] ?? []).map((s) => `${s}.wav`);
    if (beat.sfx.length) sfxTable.push({ at: Number(beat.start.toFixed(3)), files: beat.sfx });

    if (beat.plan) {
      const drift = Math.abs(beat.plan[0] - beat.start);
      if (drift > 2.5) {
        warnings.push(
          `beat ${beat.n} planned at ${beat.plan[0]}s but reads at ${beat.start.toFixed(1)}s — the voice is the clock`,
        );
      }
    }
  }

  const total = t;
  const planned = (meta["target runtime"] ?? meta.runtime ?? "").match(/(\d{1,2}):(\d{2})|\b(\d{2,3})\s*s\b/i);
  if (planned) {
    const want = planned[1] ? planned[1] * 60 + Number(planned[2]) : Number(planned[3]);
    if (Math.abs(total - want) > want * 0.15) {
      warnings.push(`narration runs ${total.toFixed(0)}s against a target of ~${want}s`);
    }
  }

  if (errors.length) {
    console.error(`\n${src} — ${errors.length} problem(s):\n`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    console.error("");
    process.exit(1);
  }

  const size = (meta.resolution ?? "").match(/(\d{3,4})\s*[x×]\s*(\d{3,4})/);
  const vertical = /\b(short|vertical|portrait|9:16)\b/i.test(meta.format ?? "") || (size ? Number(size[1]) < Number(size[2]) : true);
  const out = {
    source: src,
    title: meta.topic ?? meta.title ?? "Untitled episode",
    engine: "scam",
    fps: Number(meta.fps) || 30,
    width: size ? Number(size[1]) : vertical ? 1080 : 1920,
    height: size ? Number(size[2]) : vertical ? 1920 : 1080,
    episode: {
      title: meta.title ?? meta.topic ?? "",
      description: meta.description ?? "",
      target: meta.target ?? "",
    },
    durationInSeconds: Number(total.toFixed(3)),
    beats,
    sfx: sfxTable,
  };

  writeFileSync(dst, JSON.stringify(out, null, 2));
  writeFileSync(
    join(dirname(dst), "voice.json"),
    JSON.stringify(
      {
        total: out.durationInSeconds,
        beats: beats.map((b) => {
          const list = b.vo.split(/\s+/).filter(Boolean);
          const step = list.length ? (b.end - b.start) / list.length : 0;
          return {
            n: b.n,
            file: "",
            start: b.start,
            dur: Number((b.end - b.start).toFixed(3)),
            speech: Number((b.end - b.start).toFixed(3)),
            words: list.map((w, i) => ({
              w,
              start: Number((i * step).toFixed(3)),
              end: Number(((i + 1) * step).toFixed(3)),
            })),
          };
        }),
      },
      null,
      2,
    ),
  );

  for (const w of warnings) console.warn(`  ! ${w}`);
  console.log(
    `\n${dst}\n  ${out.width}x${out.height} · ${total.toFixed(0)}s scam short · ${beats.length} beats · ` +
      `sfx ${sfxTable.map((c) => c.files[0]).join(", ")}\n  ${beats.map((b) => b.module).join(" → ")}`,
  );
}
