// story.txt -> video/src/script.json  (the infographic explainer episode)
//
//   node tools/parse-info.mjs info.txt video/src/script.json
//
// The same director's-script contract as parse-story.mjs, with the
// infographic vocabulary: every section names the modules it stages
// (title, chapter, travel, counter, bars, icons, call) and the VISUAL's
// **BOLD LINES** become data rows. Timing is word-count based here and
// corrected by tools/align.py once a take exists — the voice is the clock.
//
// FORMAT
//   **Topic:** / **Format:** / **Resolution:** / **FPS:** / **Target runtime:**
//
//   # 0:00–0:35 — SECTION NAME
//   **MODULES:** title → travel → counter
//   **AUDIO:** builds                 (mood; "silence" opens on silence)
//   **SFX:** tick / transition       (semantic events, never filenames)
//
//   ### NARRATION
//   what is said, one line per beat of breath
//
//   ### VISUAL
//   what is seen. **BOLD LINES** are what goes on screen — a row of them
//   becomes the rows of a travel board ("NAME — CITY"), a counter
//   ("NUMBER — LABEL"), or a title card's chips.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const [src = "info.txt", dst = "video/src/script.json"] = process.argv.slice(2);

// --------------------------------------------------------------- vocabulary
const MODULE = {
  TITLE: "title",
  COLD_OPEN: "title",
  CHAPTER_CARD: "chapter",
  TRAVEL: "travel",
  PROCESSION: "travel",
  COUNTER: "counter",
  BIG_NUMBER: "counter",
  STAT: "counter",
  BARS: "bars",
  BAR_CHART: "bars",
  ICONS: "icons",
  ICON_STEPS: "icons",
  CALL: "call",
  KINETIC: "call",
};

const ROWS = new Set(["travel", "counter", "bars"]);

const FITS = {
  travel: (cue) => !!cue.raw && /[A-Za-z]/.test(cue.raw), // NAME — CITY
  counter: (cue) => /\d/.test(cue.text) && /\s[—–-]\s/.test(cue.text),
  bars: (cue) => /\d/.test(cue.text) && /\s[—–-]\s/.test(cue.text),
};

const DEFAULT_SFX = {
  title: ["transition_soft"],
  chapter: ["chapter"],
  travel: ["tick"],
  counter: ["tick"],
  bars: ["tick"],
  icons: ["pop"],
  call: ["reveal_minor"],
};

const MOODS = [
  [/silen|drops? (completely|out)|no music|music cuts/i, 0.0],
  [/minimal|almost no|nearly silent|quiet/i, 0.18],
  [/aftermath|resolution|restrained|calm/i, 0.35],
  [/low|controlled|deliberate/i, 0.42],
  [/pulse|builds?|returns?|gradual/i, 0.58],
  [/tension|rises?|energy/i, 0.72],
  [/impact|full|swell|reveal/i, 0.9],
];

const WPM = 185; // an infographic read: brisk, bright, not breathless
const HOLD = 0.22; // the breath after a beat

const words = (text) => text.split(/\s+/).filter(Boolean).length;
const speech = (text) => (words(text) / WPM) * 60;

const clean = (s) =>
  s
    .replace(/\*\*/g, "")
    .replace(/^["“]|["”]$/g, "")
    .trim();

const asRow = (cue) => {
  const parts = cue.split(/\s+[—–]\s+|\s+-\s+/);
  const label = parts[0].trim();
  const raw = parts.slice(1).join(" — ").trim();
  return { label, raw, value: Number(raw.replace(/[^\d.-]/g, "")) || 0 };
};

// --------------------------------------------------------------- read
const raw = readFileSync(src, "utf8").replace(/\r\n/g, "\n");
const lines = raw.split("\n");
const errors = [];
const warnings = [];
const meta = {};

const field = (line) => {
  const m = line.match(/^\s*(?:\*\*)?([A-Za-z][\w \-/]*?)(?:\*\*)?\s*:\s*\*{0,2}(.*?)\*{0,2}\s*$/);
  return m && m[2] !== "" ? [m[1].trim().toLowerCase(), m[2].trim()] : null;
};

const TIMED = /^#{1,3}\s+(\d{1,2}:\d{2})\s*[–—-]\s*(\d{1,2}:\d{2})\s*[—–-]?\s*(.*)$/;

const sections = [];
let current = null;
let block = "head";
for (const line of lines) {
  const head = line.match(TIMED);
  if (head) {
    current = { name: head[3].trim(), fields: {}, narration: [], visual: [] };
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
  if (!current) {
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
const memory = { travel: [], counter: [], bars: [] };
let n = 0;

const cues = (visual) => {
  const out = [];
  for (const line of visual) {
    const text = line.trim();
    const bold = text.match(/^\*\*(.+?)\*\*[.:]?$/) ?? text.match(/^#{1,3}\s+(.+?)$/);
    if (bold) {
      const value = clean(bold[1]);
      if (value && !/^(sfx|beat|hold|black|end)\b/i.test(value)) out.push({ text: value });
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
  if (!narration) continue;

  const named = (section.fields.module ?? section.fields.modules ?? "title")
    .split(/→|->|\/|,|>/)
    .map((s) => s.trim().toUpperCase().replace(/\s+/g, "_"))
    .filter(Boolean);
  const staged = [];
  for (const name of named) {
    if (MODULE[name]) staged.push(MODULE[name]);
    else warnings.push(`section "${section.name}": unknown module ${name} — ignored`);
  }
  if (!staged.length) staged.push("call");

  const chapter = section.name.replace(/\(.*?\)/g, "").trim().toUpperCase();
  const marks = cues(section.visual);

  for (const module of staged) {
    const beat = {
      n: ++n,
      name: chapter,
      chapter,
      module,
      vo: narration,
      text: "",
      // The vox/essay engines type on this field; keeping the shape shared
      // keeps one script.json valid for every engine in the bundle.
      visual: section.visual.map((l) => l.trim()).filter(Boolean).slice(0, 6).join(" "),
      sfx: DEFAULT_SFX[module] ?? [],
      intensity: 0,
      track: "long",
    };

    let data = [];
    let accent = 0;
    if (ROWS.has(module)) {
      const fit = marks.filter(FITS[module] ?? (() => true));
      data = fit.map((cue) => asRow(cue.text));
      if (module === "travel" || module === "counter" || module === "bars") {
        const store = memory[module];
        const before = store.length;
        for (const row of data) {
          if (!store.some((s) => s.label === row.label && s.raw === row.raw)) store.push(row);
        }
        data = store.map((row) => ({ ...row }));
        accent = before;
      }
    }
    beat.data = data;
    beat.accent = accent;
    beat.cues = marks.map((m) => m.text);

    if (!data.length) {
      beat.text = marks[0]?.text ?? ""; // a lone bold line is the headline
    }

    const level = (section.fields.audio ?? "")
      .split(/→|->|,|then/i)
      .map((part) => MOODS.find(([re]) => re.test(part))?.[1])
      .filter((x) => x !== undefined)[0];
    if (level !== undefined) beat.level = level;
    if (module === "call" && beat.text) beat.text = beat.text.toUpperCase();
    beats.push(beat);
  }
}

if (!beats.length) errors.push(`no "### NARRATION" blocks found in ${src}`);

// --------------------------------------------------------------- timing
let clock = 0;
beats.forEach((beat) => {
  const dur = Math.max(1.6, speech(beat.vo) + HOLD);
  beat.start = Number(clock.toFixed(3));
  beat.end = Number((clock + dur).toFixed(3));
  clock = beat.end;
  const arc = beats.length > 1 ? beats.indexOf(beat) / (beats.length - 1) : 0;
  const base = beat.level ?? Math.min(0.75, 0.3 + (beat.data?.length ?? 1) * 0.09);
  beat.intensity = Number(Math.min(1, base * (0.85 + arc * 0.3)).toFixed(2));
  delete beat.level;
});

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
  title: meta.topic ?? meta.title ?? "Untitled explainer",
  engine: "info",
  fps: Number(meta.fps) || 30,
  width: size ? Number(size[1]) : vertical ? 1080 : 1920,
  height: size ? Number(size[2]) : vertical ? 1920 : 1080,
  episode: {
    title: meta.title ?? meta.topic ?? "",
    description: meta.description ?? "",
    target: meta.target ?? "",
  },
  durationInSeconds: Number(clock.toFixed(3)),
  beats,
  sfx: beats
    .filter((b) => b.sfx?.length)
    .map((b) => ({ at: Number(b.start.toFixed(3)), files: b.sfx })),
};

writeFileSync(dst, JSON.stringify(out, null, 2));
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
  `\n${dst}\n  ${out.width}x${out.height} · ${mins(clock)} explainer · ${beats.length} beats · ` +
    `${words(beats.map((b) => b.vo).join(" "))} words\n  ${beats.map((b) => b.module).join(" → ")}`,
);