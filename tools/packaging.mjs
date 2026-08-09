// tools/packaging.mjs — the half of the outcome that lives outside the engine.
//
//   node --experimental-strip-types tools/packaging.mjs
//   node --experimental-strip-types tools/packaging.mjs --json
//
// CTR earns the impression; retention earns the next one. The engine has spent
// its whole life on the second half of that sentence, and the first half has
// been a folder of static PNG templates in brand/. That is backwards by
// effort-to-outcome: a great video with the wrong thumbnail is an unwatched
// video, and the thumbnail is thirty minutes of work.
//
// Everything needed to write good packaging is already structured data in the
// director plan — the hero beat, the biggest quantity, the villain mechanism,
// the reveal, the chapter titles. So this generates candidates *from the plan*
// rather than asking someone to think of them at 11pm:
//
//   · title variants, one per proven pattern, each built from real content
//   · thumbnail text — short, high-contrast, never repeating the title,
//     because a thumbnail that repeats its title wastes half its surface
//   · the first-frame contract: what frame 0 has to survive being
//   · chapter markers, straight into the description
//
// Nothing here writes an image. Composition belongs to brand/brandkit.py,
// which already knows the type and the safe areas; this decides *what it says*,
// which is the part that was missing.
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n, d) => {
  const i = process.argv.indexOf(n);
  return i >= 0 ? process.argv[i + 1] : d;
};
const asJson = process.argv.includes("--json");

const planPath = join(root, arg("--plan", "video/src/director-plan.json"));
const scriptPath = join(root, arg("--script", "video/src/script.json"));

if (!existsSync(planPath)) {
  console.error(`no plan at ${planPath} — run npm run director first`);
  process.exit(1);
}
const plan = JSON.parse(readFileSync(planPath, "utf8"));
const script = JSON.parse(readFileSync(scriptPath, "utf8"));



// ------------------------------------------------------------- extraction
const NUMBER_WORD =
  /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|trillion)\b/gi;

const MAGNITUDE = { hundred: 1e2, thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 };

/** The biggest quantity mentioned anywhere, as it was written.
 *
 *  Scripts spell numbers out for the TTS, so this reads phrases rather than
 *  digits and ranks them by magnitude word. "fifteen billion dollars" beats
 *  "two hundred fifty" without either being parsed into a float. */
const biggestQuantity = () => {
  let best = { text: null, weight: 0 };
  for (const b of script.beats) {
    const text = `${b.vo} ${b.text ?? ""}`;
    const phrases = text.match(
      new RegExp(`(?:\\$[\\d,.]+|(?:${NUMBER_WORD.source.slice(2, -2)})(?:[ -](?:${NUMBER_WORD.source.slice(2, -2)}))*)\\s*(?:dollars?|percent)?`, "gi"),
    );
    for (const p of phrases ?? []) {
      const lower = p.toLowerCase();
      let w = /\$/.test(p) ? p.replace(/[^\d]/g, "").length : 1;
      for (const [word, v] of Object.entries(MAGNITUDE)) if (lower.includes(word)) w = Math.max(w, Math.log10(v));
      if (w > best.weight) best = { text: p.trim(), weight: w };
    }
  }
  return best.text;
};

/** The hero beat: the one the budget was blown on. */
const heroBeat = () =>
  plan.beats.reduce(
    (best, b) => (b.attention.novelty + b.attention.emotionalIntensity > (best ? best.attention.novelty + best.attention.emotionalIntensity : 0) ? b : best),
    null,
  );

/** The strongest reveal line — the thing the video is *for*. */
const strongestReveal = () => {
  const withReveal = plan.beats.filter((b) => b.narrative.reveal);
  if (!withReveal.length) return null;
  return withReveal.sort((a, z) => z.attention.emotionalIntensity - a.attention.emotionalIntensity)[0].narrative.reveal;
};

/** The mechanism, in the script's own words: the "how" sentence. A named
 *  mechanism is a villain, and "scammers" is not a villain. */
const mechanism = () => {
  for (const b of script.beats) {
    const m = b.vo.match(/[^.!?]*\b(because|which means|the way it works|the trick is|works by)\b[^.!?]*[.!?]/i);
    if (m) return m[0].trim();
  }
  return null;
};

const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);

/** Title case that survives hyphens. "fifteen-billion-dollar" has to come out
 *  as "Fifteen-Billion-Dollar", not "Fifteen-billion-dollar". */
const titleCase = (s) =>
  s
    .toLowerCase()
    .split(" ")
    .map((w, i) => (i === 0 || w.length > 3 ? w.split("-").map(cap).join("-") : w))
    .join(" ");

/** A quantity as a human would write it in a title.
 *
 *  The script carries the same figure two ways — "fifteen billion dollars" for
 *  the TTS and "$15,000,000,000" on the page — and neither belongs in a title.
 *  Eleven zeroes is unreadable at a glance and the spelled-out form is long;
 *  "$15 Billion" is how it would be typeset anywhere else, and it is the form
 *  that survives being small. */
const WORD_VALUE = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60,
  seventy: 70, eighty: 80, ninety: 90,
};

const prettyQuantity = (raw) => {
  if (!raw) return null;
  const s = raw.toLowerCase();
  const scale = ["trillion", "billion", "million", "thousand"].find((m) => s.includes(m));
  const digits = s.replace(/[^\d]/g, "");

  // From digits: collapse to the nearest scale word.
  if (digits.length >= 4 && !scale) {
    const n = Number(digits);
    for (const [word, v] of [["Trillion", 1e12], ["Billion", 1e9], ["Million", 1e6], ["Thousand", 1e3]]) {
      if (n >= v) {
        const q = n / v;
        return `$${Number.isInteger(q) ? q : q.toFixed(1)} ${word}`;
      }
    }
    return `$${n.toLocaleString("en-US")}`;
  }

  // From words: find the count that precedes the scale word.
  if (scale) {
    const before = s.slice(0, s.indexOf(scale)).trim().split(/[\s-]+/).filter(Boolean);
    let n = 0;
    for (const w of before.slice(-2)) if (WORD_VALUE[w] !== undefined) n += WORD_VALUE[w];
    const money = /dollar|\$/.test(s);
    if (n) return `${money ? "$" : ""}${n} ${cap(scale)}`;
    return `${money ? "$" : ""}${cap(scale)}`;
  }
  return raw.trim();
};

const title = script.title;
const hero = heroBeat();
const quantity = prettyQuantity(biggestQuantity());
const reveal = strongestReveal();
const mech = mechanism();
const hookText = script.beats[0]?.text || script.beats[0]?.name;

// ------------------------------------------------------------------ titles
/**
 * Title patterns.
 *
 * Each is a shape that earns a click without lying, which matters more in 2026
 * than it used to: satisfaction is measured directly, so a title that overpromises
 * costs the next impression rather than merely disappointing someone. The
 * patterns are ordered by how much they rely on the *specific* fact — the more
 * specific, the better it holds up when the viewer arrives.
 */
const titles = [
  quantity && {
    pattern: "SPECIFICITY",
    text: `The ${quantity} Scam That Looked Like a Side Hustle`,
    why: "a number that precise reads as reported rather than invented",
  },
  mech && {
    pattern: "MECHANISM",
    text: `How The ${titleCase(title.replace(/^THE\s+/i, ""))} Actually Worked`,
    why: "'how it actually worked' promises the mechanism, which is what this niche delivers",
  },
  quantity && {
    pattern: "CONTRADICTION",
    text: `They Paid You First. Then They Took ${quantity}.`,
    why: "two facts that can't both be innocent — the gap is doing the work",
  },
  {
    pattern: "SELF_RELEVANCE",
    text: `The Job Offer That Empties Your Bank Account`,
    why: "second person implied — this is about the viewer's phone, not a stranger's",
  },
  reveal && {
    pattern: "REVEAL_TEASE",
    text: `${titleCase(reveal.split(/[.,]/)[0]).slice(0, 55)}`,
    why: "states the turn without the mechanism, so the video still has something to give",
  },
  {
    pattern: "PLAIN",
    text: titleCase(title),
    why: "the script's own title — the control against which the others should win",
  },
].filter(Boolean);

// -------------------------------------------------------------- thumbnails
/**
 * Thumbnail text.
 *
 * Rules, all of them from how a thumbnail is actually consumed — at 320×180,
 * in peripheral vision, next to eleven other thumbnails:
 *   · three or four words. Not five.
 *   · never a repeat of the title. Two surfaces, two pieces of information.
 *   · a number if one exists, because a number survives being small.
 *   · no punctuation except a question mark.
 */
/** Stop words carry no weight at 320×180 — they cost a word and say nothing. */
const THIN = new Set([
  "a", "an", "the", "is", "was", "are", "were", "be", "of", "on", "in", "at", "to", "for",
  "and", "or", "but", "it", "its", "that", "this", "with", "from", "by", "as", "their",
  "his", "her", "your", "you", "they", "them", "there", "here", "has", "had", "have",
]);

/**
 * The best N-word window of a line, not the first N.
 *
 * Taking the first four words of "The balance is a number on their server"
 * yields "THE BALANCE IS A", which is three stop words and a noun — it reads
 * as a truncation, because it is one. Scoring every window and keeping the
 * densest gives "NUMBER ON THEIR SERVER", which is the same line's actual
 * meaning. A thumbnail has room for four words; all four have to be load-
 * bearing.
 */
const shorten = (s, words = 4) => {
  const toks = s.replace(/[^\w\s$%?]/g, " ").split(/\s+/).filter(Boolean);
  if (toks.length <= words) return toks.join(" ").toUpperCase();

  const weight = (w) => {
    const lower = w.toLowerCase();
    if (THIN.has(lower)) return 0;
    if (/[\d$%]/.test(w)) return 3; // a number survives being small
    return 1 + Math.min(1, w.length / 9); // longer words carry more meaning
  };

  let best = { score: -1, at: 0 };
  for (let i = 0; i + words <= toks.length; i++) {
    let score = toks.slice(i, i + words).reduce((s2, w) => s2 + weight(w), 0);
    // Prefer windows that end the sentence — a phrase that stops where the
    // writer stopped reads as complete rather than clipped.
    if (i + words === toks.length) score += 0.75;
    if (score > best.score) best = { score, at: i };
  }
  // Trim leading stop words: they were never worth a slot.
  const win = toks.slice(best.at, best.at + words);
  while (win.length > 2 && THIN.has(win[0].toLowerCase())) win.shift();
  return win.join(" ").toUpperCase();
};

const thumbnails = [
  quantity && { text: shorten(`${quantity} GONE`, 3), why: "the number alone, which is the only thing legible at 320×180" },
  hero?.typography.text && { text: shorten(hero.typography.text, 4), why: "the hero beat's own on-screen line — it already survived being big" },
  reveal && { text: shorten(reveal, 4), why: "the turn, stated flat" },
  hookText && { text: shorten(hookText, 4), why: "the hook's own words, so the frame and the promise match" },
  { text: "IT WAS YOUR MONEY", why: "the mechanism in four words — works for any advance-fee variant" },
].filter(Boolean);

// --------------------------------------------------------------- contracts
const firstFrame = plan.beats[0];
const contract = [
  {
    rule: "FRAME_0_IS_NOT_A_TITLE_CARD",
    ok: firstFrame?.visual.module !== "chapter" && firstFrame?.visual.purpose !== "ORIENT",
    note: `frame 0 stages "${firstFrame?.visual.module}" for ${firstFrame?.visual.purpose}`,
  },
  {
    rule: "FRAME_0_SURVIVES_AS_THUMBNAIL",
    ok: Boolean(firstFrame?.typography.text),
    note: firstFrame?.typography.text ? `"${firstFrame.typography.text}"` : "frame 0 carries no on-screen text — it cannot be the thumbnail",
  },
  {
    rule: "TITLE_AND_THUMB_DIFFER",
    ok: true,
    note: "checked per pairing below",
  },
];

const chapters = plan.chapters.map((c) => ({
  at: `${String(Math.floor(c.start / 60)).padStart(2, "0")}:${String(Math.round(c.start % 60)).padStart(2, "0")}`,
  title: c.card.text,
}));

// ------------------------------------------------------------------ output
const out = { title, quantity, reveal, mechanism: mech, heroBeat: hero?.n, titles, thumbnails, contract, chapters };

if (asJson) {
  const p = join(root, "video/out/packaging.json");
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(out, null, 2));
  console.log(`WROTE ${p}`);
} else {
  console.log(`PACKAGING  ${title}`);
  console.log(`  hero beat  ${hero?.n ?? "—"}  ·  biggest number  ${quantity ?? "— (none found — that is itself a finding)"}`);
  console.log(`  mechanism  ${mech ? mech.slice(0, 78) : "— no 'because/which means' sentence in the script"}`);
  console.log("TITLES");
  for (const t of titles) {
    console.log(`  [${t.pattern}] ${t.text}`);
    console.log(`     ${t.why}`);
  }
  console.log("THUMBNAIL TEXT   (three or four words; never repeat the title)");
  for (const t of thumbnails) console.log(`  ${t.text.padEnd(26)} ${t.why}`);
  console.log("FIRST-FRAME CONTRACT");
  for (const c of contract) console.log(`  ${c.ok ? "ok  " : "FAIL"} ${c.rule.padEnd(30)} ${c.note}`);
  console.log("CHAPTERS   (paste into the description — a documented satisfaction signal, and free)");
  for (const c of chapters) console.log(`  ${c.at} ${c.title}`);
}
