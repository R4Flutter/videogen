// ChapterPlanner: the macro structure of a long form. Chapters are the level
// at which a viewer re-orients; a ten-minute video with no chapter structure
// is a hundred clips, not a documentary.
//
// A `Chapter:` row in the script is a hard chapter boundary (the author
// decides, the director obeys). Everything else is grouped heuristically:
// chapters are 45–150s, split where the story's *purpose* changes, where a
// rest beat lands, or where the visual language shifts.
import type { Chapter, Script, ScriptBeat } from "../types.ts";
import type { BeatFacts } from "./StoryAnalyzer.ts";
import { slug } from "../util.ts";

const TARGET_MIN = 45;
const TARGET_MAX = 150;

const cardText = (title: string) => title.replace(/^chapter\s*\d+\s*[—:-]?\s*/i, "").trim() || "THE STORY";

export const planChapters = (script: Script, facts: BeatFacts[]): Chapter[] => {
  const beats = script.beats;
  const named = new Map<number, string>();

  // Author rows win: every beat that names a chapter starts one.
  beats.forEach((b) => {
    if (b.chapter?.trim()) named.set(b.n, b.chapter.trim());
  });

  const chapters: Chapter[] = [];
  const current = { title: "", from: beats[0] };
  let startBeat = beats[0].n;
  let start = beats[0].start;
  let boundary = false;

  // A chapter is named by what it opens with, not by the beat that closes it.
  const push = (untilBeat: ScriptBeat, last = false) => {
    const title = current.title || cardText(current.from.name);
    chapters.push({
      id: `ch_${chapters.length + 1}`,
      title: cardText(title),
      ordinal: chapters.length + 1,
      startBeat,
      start,
      end: last ? untilBeat.end : untilBeat.start,
      card: { text: cardText(title), subtext: undefined },
    });
  };

  for (let i = 0; i < beats.length; i++) {
    const b = beats[i];
    const dur = b.end - b.start;
    const purpose = facts[i].purpose;
    const prev = facts[i - 1];

    // Hard boundary from the script.
    if (named.has(b.n) && i > 0) boundary = true;

    // Heuristic: a purpose shift after a chapter-length run.
    if (
      !boundary &&
      !named.has(b.n) &&
      i > 0 &&
      b.start - start >= TARGET_MIN &&
      ((prev && purpose !== prev.purpose) || dur >= 12)
    ) {
      boundary = true;
    }

    // Hard cap: never let a chapter run past ~2.5 minutes.
    if (!boundary && b.start - start >= TARGET_MAX) boundary = true;

    if (boundary) {
      push(b);
      current.title = named.get(b.n) ?? "";
      current.from = b;
      startBeat = b.n;
      start = b.start;
      boundary = false;
    } else if (named.has(b.n) && !current.title) {
      current.title = named.get(b.n) ?? "";
    }
  }
  push(beats[beats.length - 1], true);

  // Chapter cards carry a short line for the card frame; the first chapter is
  // the cold open and gets no card (the hook is the open).
  return chapters.map((c, i) => ({
    ...c,
    card: {
      text: c.card.text,
      subtext: i === 0 ? undefined : `CHAPTER ${c.ordinal}`,
    },
  }));
};

export const chapterFor = (chapters: Chapter[], beat: ScriptBeat) =>
  chapters.find((c) => beat.start >= c.start && beat.start < c.end) ?? chapters[chapters.length - 1];

export const chapterOfBeat = (chapters: Chapter[], n: number) =>
  chapters.find((c) => n >= c.startBeat) ?? chapters[chapters.length - 1];

export const chapterId = (chapters: Chapter[], n: number) => chapterOfBeat(chapters, n).id;

export const uniqueChapterTitles = (chapters: Chapter[]) => [
  ...new Set(chapters.map((c) => slug(c.title))),
];
