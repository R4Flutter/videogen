// ai/EditorialValidator.ts — the gate between the brain's JSON and the
// deterministic director. Unsupported vocabulary is rejected and replaced
// with the nearest supported fallback; missing beats are ignored (the
// deterministic engine covers them); malformed JSON is repaired best-effort.
// Every rejection or fallback is logged — nothing is silently fabricated.
import type { Script, VisualPurpose } from "../types.ts";
import type { BeatDecision, EditorialResponse, RevisionResponse } from "./EditorialTypes.ts";
import {
  ATTENTION_EVENTS,
  ATTENTION_STRATEGIES,
  CAMERA_INTENTS,
  CAPTION_MODES,
  EMOTIONS,
  EMOTION_SYNONYMS,
  MODULE_BY_PURPOSE,
  MODULES,
  MUSIC_MOODS,
  NARRATIVE_PURPOSES,
  REVEAL_MODES,
  SFX_FILES,
  SILENCE_KINDS,
} from "./vocab.ts";

export type ValidationResult<T> = {
  ok: boolean;
  value?: T;
  errors: string[];
  fixed: string[]; // fallbacks applied (logged, never silent)
};

/** Hand-written script rows. A note here outranks any brain decision for that
 *  beat — unless the brain explicitly locked it and a revision pass arrives. */
const AUTHOR_FIELDS = [
  "purpose", "chapter", "sequence", "question", "reveal", "emotion", "rest",
  "captionMode", "revealMode", "camera", "music", "silence", "jcut", "lcut",
  "sfx", "callback", "visualPurpose", "attentionStrategy",
] as const;

const beatOf = (script: Script, beatId: string): number | undefined => {
  const m = /^(?:beat_?)?(\d+)$/i.exec(String(beatId).trim());
  if (!m) return undefined;
  const n = Number(m[1]);
  return script.beats.some((b) => b.n === n) ? n : undefined;
};

const firstIn = <T extends string>(v: unknown, list: readonly T[]): T | undefined =>
  typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : undefined;

/** Pull the first balanced JSON object out of model output: strips markdown
 *  fences and any surrounding prose. Returns null when there is none. */
export const extractJson = (raw: string): unknown => {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
};

const clampNum = (v: unknown, lo: number, hi: number): number | undefined => {
  if (typeof v !== "number" || !Number.isFinite(v)) return undefined;
  return Math.min(hi, Math.max(lo, v));
};

const validateBeat = (script: Script, d: BeatDecision, errors: string[], fixed: string[], locked: number[]): BeatDecision => {
  const out: BeatDecision = { beatId: d.beatId };
  const n = beatOf(script, d.beatId);
  if (!n) {
    errors.push(`unknown beatId "${d.beatId}" — decision dropped`);
    return out;
  }
  out.beatId = String(n);

  const beat = script.beats.find((b) => b.n === n);
  const authorFields = new Set<string>(
    AUTHOR_FIELDS.filter((f) => {
      const v = beat?.[f];
      return v !== undefined && v !== null && v !== "";
    }),
  );
  const guard = (field: string) => authorFields.has(field) && !locked.includes(n);

  if (d.purpose && !guard("purpose")) {
    out.purpose = firstIn(d.purpose, NARRATIVE_PURPOSES) ?? (() => {
      errors.push(`beat ${n}: unsupported purpose "${d.purpose}"`);
      return undefined as never;
    })();
  }
  if (d.sequence && !guard("sequence")) out.sequence = String(d.sequence);
  if (typeof d.question === "string" && !guard("question")) out.question = d.question;
  if (typeof d.reveal === "string" && !guard("reveal")) out.reveal = d.reveal;
  if (typeof d.nextQuestion === "string" && !guard("nextQuestion")) out.nextQuestion = d.nextQuestion;
  if (typeof d.consequence === "string" && !guard("consequence")) out.consequence = d.consequence;

  if (d.emotion && !guard("emotion")) {
    const from = firstIn(d.emotion.from, EMOTIONS)
      ?? (typeof d.emotion.from === "string" ? EMOTION_SYNONYMS[d.emotion.from.toLowerCase()] : undefined);
    const to = firstIn(d.emotion.to, EMOTIONS)
      ?? (typeof d.emotion.to === "string" ? EMOTION_SYNONYMS[d.emotion.to.toLowerCase()] : undefined);
    if (from && to && typeof d.emotion.intensity === "number") {
      if (from !== d.emotion.from) fixed.push(`beat ${n}: emotion from "${d.emotion.from}" → "${from}"`);
      if (to !== d.emotion.to) fixed.push(`beat ${n}: emotion to "${d.emotion.to}" → "${to}"`);
      out.emotion = { from, to, intensity: clampNum(d.emotion.intensity, 0, 1) ?? 0.5 };
    } else {
      errors.push(`beat ${n}: invalid emotion {from:${d.emotion.from}, to:${d.emotion.to}}`);
    }
  }

  if (d.visual && !guard("visualPurpose") && !guard("module")) {
    const module = firstIn(d.visual.module, MODULES);
    if (module) {
      out.visual = { module, purpose: d.visual.purpose, reason: d.visual.reason };
    } else {
      const purpose = firstIn(d.visual.purpose, Object.keys(MODULE_BY_PURPOSE) as VisualPurpose[]);
      const fallback = purpose ? MODULE_BY_PURPOSE[purpose]?.[0] : "kinetic";
      if (purpose) {
        out.visual = { module: fallback ?? "kinetic", purpose, reason: d.visual.reason };
        fixed.push(`beat ${n}: unsupported module "${d.visual.module}" → nearest supported "${fallback}" for ${purpose}`);
      } else {
        errors.push(`beat ${n}: unsupported module "${d.visual.module}" with no usable purpose`);
      }
    }
  }

  if (d.motion) {
    if (d.motion.camera && !guard("camera")) {
      const cam = firstIn(d.motion.camera, CAMERA_INTENTS);
      if (cam) out.motion = { ...out.motion, camera: cam };
      else {
        fixed.push(`beat ${n}: unsupported camera "${d.motion.camera}" → "settle"`);
        out.motion = { ...out.motion, camera: "settle" };
      }
    }
    if (d.motion.reveal && !guard("revealMode")) {
      const r = firstIn(d.motion.reveal, REVEAL_MODES);
      if (r) out.motion = { ...out.motion, reveal: r };
      else {
        fixed.push(`beat ${n}: unsupported reveal mode "${d.motion.reveal}" → "SEQUENTIAL"`);
        out.motion = { ...out.motion, reveal: "SEQUENTIAL" };
      }
    }
  }

  if (d.audio) {
    const audio: BeatDecision["audio"] = {};
    if (d.audio.music && !guard("music")) {
      const mood = firstIn(d.audio.music, MUSIC_MOODS);
      if (mood) audio.music = mood;
      else {
        fixed.push(`beat ${n}: unsupported music mood "${d.audio.music}" → "hold"`);
        audio.music = "hold";
      }
    }
    if (d.audio.silence !== undefined && !guard("silence")) {
      if (typeof d.audio.silence === "boolean") audio.silence = d.audio.silence;
      else {
        const kind = firstIn(String(d.audio.silence).toUpperCase(), SILENCE_KINDS);
        if (kind) audio.silence = kind;
        else {
          fixed.push(`beat ${n}: unsupported silence kind "${d.audio.silence}" → engine auto`);
          audio.silence = true;
        }
      }
    }
    if (d.audio.sfx && !guard("sfx")) {
      const parts = String(d.audio.sfx).split(/[+,]/).map((s) => s.trim()).filter(Boolean);
      const ok = parts.every((p) => (SFX_FILES as readonly string[]).includes(p));
      if (ok) audio.sfx = parts.join(",");
      else {
        fixed.push(`beat ${n}: unsupported sfx "${d.audio.sfx}" → dropped`);
      }
    }
    const jcut = d.audio.jcut === undefined ? undefined : clampNum(d.audio.jcut, 0, 2.5);
    if (jcut !== undefined && !guard("jcut")) audio.jcut = jcut;
    const lcut = d.audio.lcut === undefined ? undefined : clampNum(d.audio.lcut, 0, 3);
    if (lcut !== undefined && !guard("lcut")) audio.lcut = lcut;
    if (Object.keys(audio).length) out.audio = audio;
  }

  if (d.attention && !guard("attentionStrategy")) {
    const strategy = firstIn(d.attention.strategy, ATTENTION_STRATEGIES);
    const event = d.attention.event ? firstIn(d.attention.event, ATTENTION_EVENTS) : undefined;
    if (strategy) out.attention = { strategy, event, reason: d.attention.reason };
    else if (event) out.attention = { strategy: "standard", event, reason: d.attention.reason };
    else if (d.attention.strategy === undefined && d.attention.event === undefined) {
      // no-op decision — nothing to validate
    } else {
      fixed.push(`beat ${n}: unsupported attention strategy/event → "standard"`);
      out.attention = { strategy: "standard", event: undefined, reason: d.attention.reason };
    }
  }

  if (typeof d.rest === "boolean" && !guard("rest")) out.rest = d.rest;
  if (d.callback !== undefined && !guard("callback")) out.callback = d.callback;
  if (d.captionMode && !guard("captionMode")) {
    const mode = firstIn(d.captionMode, CAPTION_MODES);
    if (mode) out.captionMode = mode;
    else errors.push(`beat ${n}: unsupported caption mode "${d.captionMode}"`);
  }
  if (d.locked === true) out.locked = true;

  return out;
};

export const validateResponse = (raw: string, script: Script): ValidationResult<EditorialResponse> => {
  const errors: string[] = [];
  const fixed: string[] = [];
  const parsed = extractJson(raw);
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, errors: ["no JSON object found in model output"], fixed };
  }
  const resp = parsed as EditorialResponse;
  if (!Array.isArray(resp.beats)) {
    // Tolerate wrappers: {"plan": {...}}, {"response": {...}}.
    const inner = (parsed as { plan?: unknown }).plan ?? (parsed as { response?: unknown }).response;
    if (inner && typeof inner === "object" && Array.isArray((inner as EditorialResponse).beats)) {
      return validateResponse(JSON.stringify(inner), script);
    }
    return { ok: false, errors: ["response has no beats array"], fixed };
  }
  const beats = resp.beats.map((d) => validateBeat(script, d, errors, fixed, []));
  const sequences = Array.isArray(resp.sequences)
    ? resp.sequences.filter((s) => s && Array.isArray(s.beatRange))
    : [];
  const macro = resp.macro && Array.isArray(resp.macro.chapters)
    ? resp.macro
    : { chapters: [] as { startBeat: number; title: string; purpose: string; cardSubtext?: string }[] };
  return {
    ok: errors.length === 0,
    value: { macro, sequences, beats },
    errors,
    fixed,
  };
};

export const validateRevision = (raw: string, script: Script, lockedBeats: number[]): ValidationResult<RevisionResponse> => {
  const errors: string[] = [];
  const fixed: string[] = [];
  const parsed = extractJson(raw);
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, errors: ["no JSON object found in revision output"], fixed };
  }
  // Tolerate wrappers: {"revision": {...}}, {"changes": [...]}, {"plan": {...}}.
  const rev = (parsed as RevisionResponse).revision
    ?? (parsed as { plan?: { revision?: unknown } }).plan?.revision
    ?? (parsed as { changes?: unknown }).changes;
  if (!rev || typeof rev !== "object") {
    return { ok: false, errors: ["revision has no changes array"], fixed };
  }
  const changes = Array.isArray((rev as { changes?: unknown }).changes)
    ? (rev as { changes: BeatDecision[] }).changes
    : Array.isArray(rev)
      ? (rev as BeatDecision[])
      : null;
  if (!changes) {
    return { ok: false, errors: ["revision has no changes array"], fixed };
  }
  const clean = changes
    .filter((d) => {
      const n = beatOf(script, d.beatId);
      if (!n) {
        errors.push(`revision references unknown beat "${d.beatId}" — rejected`);
        return false;
      }
      if (lockedBeats.includes(n)) {
        errors.push(`revision tries to change locked beat ${n} — rejected`);
        return false;
      }
      return true;
    })
    .map((d) => validateBeat(script, d, errors, fixed, lockedBeats));
  return {
    ok: errors.length === 0,
    value: { revision: { reason: typeof rev === "object" && "reason" in rev && typeof (rev as { reason?: unknown }).reason === "string" ? (rev as { reason: string }).reason : "unspecified", changes: clean } },
    errors,
    fixed,
  };
};
