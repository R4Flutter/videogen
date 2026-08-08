// Deterministic primitives for the director. Everything here is seeded from
// the beat number and content, so the same script produces the same plan on
// every machine. Math.random is the one thing a director may never use.
import type { ScriptBeat } from "./types.ts";

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** FNV-1a over a string, returned as an unsigned 32-bit integer. */
export const hash = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

/** mulberry32 — a small, fast, deterministic PRNG. */
export type Rng = () => number;

export const rng = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const pick = <T>(r: Rng, items: T[]): T => items[Math.floor(r() * items.length) % items.length];

/** 0..1 folded over a beat's position in the video (0 = start, 1 = end). */
export const progress = (b: ScriptBeat, beats: ScriptBeat[]) =>
  beats.length <= 1 ? 0 : (b.start - beats[0].start) / (beats[beats.length - 1].end - beats[0].start);

export const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const asNumber = (v: number | undefined, fallback: number) =>
  v === undefined || !Number.isFinite(v) ? fallback : v;

/** All dollar-and-number tokens in a line, e.g. "$2" "250" "100,000". */
export const numberTokens = (s: string) => (s.match(/[$%]?\d[\d,]*(\.\d+)?%?/g) ?? []);

/** The first sentence-like chunk of a beat's narration, for stamps. */
export const firstWords = (s: string, n = 6) => {
  const words = s.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, n).join(" ");
};

/** Whether a line reads like a question ("?", or opens on a question word). */
export const looksLikeQuestion = (s: string) =>
  /\?\s*$/.test(s.trim()) ||
  /^(but )?(why|who|what|where|how|when|is it|does it|would you|can it)\b/i.test(s.trim());

/** The subject of a beat: its on-screen text, else its first words. */
export const beatSubject = (b: ScriptBeat) => (b.text && b.text.trim() ? b.text : b.name);
