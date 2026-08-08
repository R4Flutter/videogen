// script.md -> video/src/script.json
//
//   node tools/parse-script.mjs script.md video/src/script.json
//
// Reads the three timed tracks a script already contains:
//   section 2  BEAT blocks      -> what is on screen (module + narration)
//   section 4  TEXT TIMING      -> the big overlay track
//   section 5  SOUND DESIGN     -> the sfx track
// Anything the script does not say is inferred from its own keywords, so a new
// script.md in the same shape needs zero code changes.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const [src = "script.md", dst = "video/src/script.json"] = process.argv.slice(2);
const md = readFileSync(src, "utf8");

const secs = (mmss) => {
  const [m, s] = mmss.split(":").map(Number);
  return m * 60 + s;
};
const clean = (s) => s.replace(/\*\*/g, "").replace(/^["“]|["”]$/g, "").trim();

// ---------------------------------------------------------------- engine
// A script picks its own vocabulary. "**Style:** Vox deep dive" stages through
// VoxShort; anything else stages through FinanceShort. Everything downstream
// (voice, align, sfx, camera) is engine-agnostic and reads the same file.
const engine = /^\s*>?\s*(?:\*\*)?style(?:\*\*)?\s*:.*\bvox\b/im.test(md)
  ? "vox"
  : "finance";
const landscape = /^\s*>?\s*(?:\*\*)?format(?:\*\*)?\s*:.*\b(landscape|16:9)\b/im.test(md);

// ---------------------------------------------------------------- beats
const BEAT_RE =
  /^###\s+BEAT\s+(\d+)\s+—\s+(.+?)\s+\((\d+:\d+)[–-](\d+:\d+)\)\s*$/gm;

// First match wins, so the most specific visual goes first.
const MODULES = {
  finance: [
    [/thumbs up|calms|looks at the viewer/i, "outro"],
    [/climb|on top of|towers|payoff/i, "payoff"],
    [/mountain|mound|mountain grows/i, "mountain"],
    [/overflow|badge|jar fills/i, "jarFill"],
    [/chart|rising line|line draws/i, "investChart"],
    [/stack|calendar/i, "coinStack"],
    [/coin drops|empty jar/i, "coinDrop"],
  ],
  vox: [
    // Deliberately narrow. These run before the older rules, so anything loose
    // here silently steals beats that used to stage as doodle or chart.
    // Narrow on purpose. The reliable signal that a beat is a map is that it
    // named places, and that is checked before this table runs — these only
    // catch a beat that describes a map without listing anything on it.
    [/\bmaps?\b|\bglobe\b|\batlas\b/i, "map"],
    // "clipping" belongs to quote, below: a torn clipping with a source line is
    // a citation, not a photo wall.
    [/collage|montage|scrapbook|photo wall|several photos|pinned/i, "collage"],
    [/\bquote\b|clipping|\bcited?\b|according to|source card|report says/i, "quote"],
    [/\btimeline\b|year by year|decade by decade|chronolog/i, "timeline"],
    [/\bcallout\b|leader line|calls? out\b|\bpointer\b/i, "callout"],
    [/compare|against each other|side by side|bars?\b|\brace\b|\bracing\b/i, "compare"],
    [/stat\b|big number|one number|single number|counts? (up|down)/i, "stat"],
    [/chart|graph|curve|plotted|line draws/i, "chart"],
    // The editorial scam modules. These read the frame as evidence, so their
    // keywords have to beat the generic ones below ("trace" before "footage",
    // or a money flow becomes a pretty clip).
    [/\bflow\b|trace|travels|node to node|follows? the money|moves to/i, "trace"],
    [/\btrust\b|signals? (check|build)|looks? (real|legitimate)|verified/i, "trust"],
    [/\bfunnel\b|narrows?|targets.*victims/i, "funnel"],
    [/icons?\b|step cards?|cards?\b/i, "icon"],
    [/circl|underline|annotat|arrow|scribble|doodle|highlight|marked/i, "doodle"],
    [/footage|archival|b-?roll|clip|photo|image/i, "footage"],
    [/words?\b|headline|kinetic|phrase/i, "kinetic"],
  ],
};
const FALLBACK = { finance: "coinDrop", vox: "kinetic" };

// "wallet: Spend less, trending-up: Invest it" -> [[key, value], ...]. Commas
// inside a number are digit grouping, not a separator.
const pairs = (s) =>
  (s ?? "")
    .replace(/(?<=\d),(?=\d{3}\b)/g, "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const i = part.indexOf(":");
      return i < 0 ? [part, ""] : [part.slice(0, i).trim(), part.slice(i + 1).trim()];
    });

const SHAPES = [
  // The trust module's collapse: "everything freezes and flips to fake" is a
  // shape, not a mark — it decides whether the beat turns, not what it draws.
  [/flip|freeze|collapses?|turns? (fake|red)/i, "flip"],
  // highlight goes first: "highlights the phrase" also matches nothing else,
  // but "marker box" should still be a box.
  [/highlight|marker|swipes? over/i, "highlight"],
  // circl\w* not circles?\b: "circled" is how a storyboard actually writes it,
  // and \b after the optional s refuses to match past the d.
  [/circl\w*|ring\b/i, "circle"],
  [/box|rectangle|frame/i, "box"],
  [/arrow|points? at/i, "arrow"],
  [/strike|crosses? out/i, "strike"],
];

const beats = [];
for (const m of md.matchAll(BEAT_RE)) {
  const block = md.slice(m.index + m[0].length).split(/\n### |\n## /)[0];
  const rows = {};
  for (const r of block.matchAll(/^\|\s*\*\*(.+?)\*\*\s*\|\s*(.+?)\s*\|\s*$/gm)) {
    rows[r[1].toLowerCase()] = clean(r[2]);
  }
  const visual = rows["visual"] ?? "";
  const motion = rows["motion fx"] ?? "";
  const beat = {
    n: Number(m[1]),
    name: m[2],
    start: secs(m[3]),
    end: secs(m[4]),
    vo: rows["audio"] ?? "",
    visual,
    motion,
    module:
      rows["module"] ??
      // A beat that listed places is a map. This beats the keyword table
      // because it is a fact about the beat rather than a guess about its
      // prose: "the money moves to Dubai" reads as a trace to the keywords and
      // as a map to anyone who has seen the frame.
      (engine === "vox" && rows["places"]
        ? "map"
        : (MODULES[engine].find(([re]) => re.test(visual))?.[1] ?? FALLBACK[engine])),
  };

  if (engine === "vox") {
    // What a vox module stages beyond the narration. Every one is optional —
    // a beat that declares none of them still renders.
    beat.text = rows["on-screen text"] ?? "";
    // Empty means "the script never asked for a mark". The renderer defaults to
    // an underline where a mark is required, and a module that only marks on
    // request can tell the two cases apart.
    beat.shape = SHAPES.find(([re]) => re.test(`${motion} ${visual}`))?.[1] ?? "";
    beat.icons = pairs(rows["icons"]).map(([icon, label]) => ({ icon, label }));
    // `raw` keeps whatever the script wrote around the number ("$2260", "0.4%")
    // so a module can re-render it grouped without being told the unit twice.
    beat.data = pairs(rows["data"]).map(([label, value]) => ({
      label,
      raw: value,
      value: Number(value.replace(/[^\d.-]/g, "")) || 0,
    }));
    // Who said it. The quote module prints this under the clipping; every other
    // module ignores it, so a script can carry a citation without using one.
    beat.source = rows["source"] ?? "";
    // Search terms for tools/fetch-footage.py, not read by the renderer.
    beat.footage = rows["footage"] ?? "";
    // Art direction, written by the author, owned by the story. This is the only
    // place a hand-written image prompt belongs: a prompt table keyed by beat
    // number lives outside the script and silently paints the previous story's
    // beat 2 onto this one's. Optional — a beat without it gets a prompt built
    // from its own Visual/Footage rows.
    beat.image_prompt = rows["image prompt"] ?? "";
    // Places for the `map` module: "India; Cambodia @ 12.5,104.9; Dubai @ 25.2,55.3".
    // Semicolons, because a lat,lon pair already owns the comma. A bare name is
    // a country to ink in; a name with coordinates is a pin to drop.
    beat.places = (rows["places"] ?? "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((entry) => {
        const [name, at] = entry.split("@").map((s) => s.trim());
        const [lat, lon] = (at ?? "").split(",").map((v) => Number(v.trim()));
        return at && Number.isFinite(lat) && Number.isFinite(lon)
          ? { name, lat, lon }
          : { name };
      });
    // The word the beat turns on, for modules that collapse mid-beat (`trust`).
    // Named by the script so the turn isn't a hardcoded English word.
    beat.turn = rows["turn"] ?? "";
    // The editorial director's hand-written rows. Every one is optional; the
    // director (video/src/director) fills what the script leaves blank and an
    // author's note always beats a guess. They travel on the beat so the
    // renderer never needs a second file to know what a beat is for.
    beat.purpose = rows["purpose"] ?? "";
    beat.chapter = rows["chapter"] ?? "";
    beat.sequence = rows["sequence"] ?? "";
    beat.question = rows["question"] ?? "";
    beat.reveal = rows["reveal"] ?? "";
    beat.emotion = rows["emotion"] ?? "";
    if (rows["rest"] !== undefined) {
      beat.rest = /^(true|yes|1)$/i.test(rows["rest"]) ? true : false;
    }
    beat.captionMode = rows["caption mode"] ?? "";
    beat.revealMode = rows["reveal mode"] ?? "";
    beat.camera = rows["camera"] ?? "";
    beat.music = rows["music"] ?? "";
    beat.silence = rows["silence"] ?? "";
    const jcut = Number(rows["j-cut"] ?? rows["jcut"] ?? "");
    if (Number.isFinite(jcut) && jcut !== 0) beat.jcut = jcut;
    const lcut = Number(rows["l-cut"] ?? rows["lcut"] ?? "");
    if (Number.isFinite(lcut) && lcut !== 0) beat.lcut = lcut;
    beat.sfx = rows["sfx"] ?? "";
    beat.callback = rows["callback"] ?? "";
  }
  beats.push(beat);
}
if (!beats.length) throw new Error(`no "### BEAT n — NAME (m:ss–m:ss)" blocks in ${src}`);

// ---------------------------------------------------------------- overlay text
const ANIMS = [
  [/slam|punch/i, "slam"],
  [/count.?up/i, "count"],
  [/type/i, "type"],
  [/wipe/i, "wipe"],
  [/pop/i, "pop"],
  [/fade|line by line/i, "fade"],
];

// Cells of every "| m:ss | ... |" row under a heading. Row-at-a-time because a
// single regex lets \s* swallow the newline and pair two rows into one match.
const table = (heading) => {
  const start = md.indexOf(heading);
  if (start < 0) return [];
  return md
    .slice(start)
    .split(/\n---/)[0]
    .split("\n")
    .filter((line) => /^\|\s*\d+:\d+\s*\|/.test(line))
    .map((line) =>
      line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()),
    );
};

const texts = table("## 4. TEXT TIMING TABLE").map((c) => ({
  at: secs(c[0]),
  text: clean(c[1]),
  anim: ANIMS.find(([re]) => re.test(c[2] ?? ""))?.[1] ?? "pop",
}));

// ---------------------------------------------------------------- sfx
const SOUNDS = [
  [/deep boom/i, ["boom.wav", "shimmer.wav"]],
  [/rising whoosh|rising tone/i, ["whoosh-up.wav"]],
  [/rapid coin drops|stacking/i, ["coin-soft.wav"]],
  [/notification|follow/i, ["pop.wav"]],
  [/rolling digits|chime/i, ["chime.wav"]],
  [/coin clink|clink/i, ["coin.wav"]],
  [/whoosh/i, ["whoosh.wav"]],
  [/warm|calm/i, ["chime-warm.wav"]],
];

const sfx = [];
for (const c of table("## 5. SOUND DESIGN")) {
  const at = secs(c[0]);
  const files = new Set();
  for (const part of c[1].split(/[,+]/)) {
    const hit = SOUNDS.find(([re]) => re.test(part));
    if (hit) hit[1].forEach((f) => files.add(f));
  }
  if (files.size) sfx.push({ at, files: [...files] });
}

const meta = md.match(/\*\*Caption Hook:\*\*\s*"?(.+?)"?\s*$/m);
const out = {
  source: src,
  title: (md.match(/^#\s+(.+)$/m)?.[1] ?? "video").trim(),
  engine,
  fps: 30,
  width: landscape ? 1920 : 1080,
  height: landscape ? 1080 : 1920,
  durationInSeconds: Math.max(...beats.map((b) => b.end)),
  caption: meta?.[1] ?? "",
  beats,
  texts,
  sfx,
};

writeFileSync(dst, JSON.stringify(out, null, 2));

// ---------------------------------------------------------------- voice stub
// The engine reads word timings from voice.json. Until a take exists there is
// nothing to read, so write the script's own timing with the words spread
// evenly — the video still builds and still captions, it just has no narrator.
// `tools/align.py` overwrites this with what the recording actually did.
const voice = join(dirname(dst), "voice.json");
writeFileSync(
  voice,
  JSON.stringify(
    {
      total: out.durationInSeconds,
      beats: beats.map((b) => {
        const words = b.vo.split(/\s+/).filter(Boolean);
        const step = (b.end - b.start) / Math.max(1, words.length);
        return {
          n: b.n,
          file: "", // no recording yet
          start: b.start,
          dur: b.end - b.start,
          speech: b.end - b.start,
          words: words.map((w, i) => ({
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

console.log(
  `${dst}\n  ${engine} · ${out.width}x${out.height} · ${out.durationInSeconds}s · ` +
    `${beats.length} beats · ${texts.length} overlays · ${sfx.length} sfx cues\n  modules: ` +
    beats.map((b) => b.module).join(" → "),
);
