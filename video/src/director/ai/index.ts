// ai/index.ts — the editorial-brain integration: validated decisions become a
// DirectorOverlay (the existing hand-written-notes channel), revisions merge
// over it, and viewer state is attached to the finished plan. The brain never
// touches the plan directly; everything it says lands on the same overlay
// path a human editor's notes take.
import type { DirectorOverlay, Script, ScriptBeat } from "../types.ts";
import type { EditorialResponse, RevisionResponse } from "./EditorialTypes.ts";
import { applyDecision, type ViewerState } from "./ViewerState.ts";

/** Convert the brain's validated beat decisions into an overlay. Fields the
 *  author already wrote in the script are left untouched — author > brain. */
export const decisionsToOverlay = (script: Script, resp: EditorialResponse): { overlay: DirectorOverlay; locked: number[] } => {
  const notes: Record<number, Record<string, unknown>> = {};
  const locked: number[] = [];
  const authorKeys = new Set([
    "purpose", "chapter", "sequence", "question", "reveal", "emotion", "rest",
    "captionMode", "revealMode", "camera", "music", "silence", "jcut", "lcut",
    "sfx", "callback", "visualPurpose", "attentionStrategy",
  ]);

  for (const d of resp.beats) {
    const n = Number(d.beatId);
    const beat = script.beats.find((b) => b.n === n);
    if (!beat) continue;
    const note: Record<string, unknown> = {};
    const free = (key: keyof ScriptBeat) => !authorKeys.has(key) || beat[key] === undefined || beat[key] === "";

    if (d.purpose && free("purpose")) note.purpose = d.purpose;
    if (d.sequence && free("sequence")) note.sequence = d.sequence;
    if (typeof d.question === "string" && free("question")) note.question = d.question;
    if (typeof d.reveal === "string" && free("reveal")) note.reveal = d.reveal;
    if (typeof d.nextQuestion === "string" && free("nextQuestion")) note.nextQuestion = d.nextQuestion;
    if (typeof d.consequence === "string" && free("consequence")) note.consequence = d.consequence;
    if (d.emotion && free("emotion")) note.emotion = d.emotion.to;
    if (d.visual) {
      if (d.visual.module && free("module")) note.module = d.visual.module;
      if (d.visual.purpose && free("visualPurpose")) note.visualPurpose = d.visual.purpose;
      if (d.visual.reason && free("visualReason")) note.visualReason = d.visual.reason;
    }
    if (d.motion) {
      if (d.motion.camera && free("camera")) note.camera = d.motion.camera;
      if (d.motion.reveal && free("revealMode")) note.revealMode = d.motion.reveal;
    }
    if (d.audio) {
      if (d.audio.music && free("music")) note.music = d.audio.music;
      if (typeof d.audio.silence === "string" && free("silence")) note.silence = d.audio.silence;
      if (d.audio.sfx && free("sfx")) note.sfx = d.audio.sfx;
      if (d.audio.jcut !== undefined && free("jcut")) note.jcut = d.audio.jcut;
      if (d.audio.lcut !== undefined && free("lcut")) note.lcut = d.audio.lcut;
    }
    if (d.attention?.strategy && free("attentionStrategy")) note.attentionStrategy = d.attention.strategy;
    if (d.rest !== undefined && free("rest")) note.rest = d.rest;
    if (d.callback && free("callback")) note.callback = d.callback;
    if (d.captionMode && free("captionMode")) note.captionMode = d.captionMode;

    if (Object.keys(note).length) notes[n] = note;
    if (d.locked === true) locked.push(n);
  }

  const overlay: DirectorOverlay = {};
  if (resp.macro?.chapters?.length) {
    overlay.chapters = resp.macro.chapters.map((c) => ({
      startBeat: Number(c.startBeat),
      title: String(c.title),
      subtext: c.cardSubtext,
    }));
  }
  if (Object.keys(notes).length) overlay.beats = notes;
  return { overlay, locked };
};

/** Merge a validated revision over the previous overlay. Locked beats are
 *  protected by the validator; here we simply replace the listed beats. */
export const applyRevision = (base: DirectorOverlay, rev: RevisionResponse): DirectorOverlay => {
  const beats = { ...(base.beats ?? {}) };
  for (const change of rev.revision.changes) {
    const n = Number(change.beatId);
    if (!n) continue;
    const note = { ...(beats[n] ?? {}) };
    const pick = (v: unknown, key: keyof ScriptBeat) => {
      if (v !== undefined && v !== null) (note as Record<string, unknown>)[key as string] = v;
    };
    pick(change.purpose, "purpose");
    pick(change.sequence, "sequence");
    pick(change.question, "question");
    pick(change.reveal, "reveal");
    pick(change.nextQuestion, "nextQuestion");
    pick(change.consequence, "consequence");
    if (change.emotion) pick(change.emotion.to, "emotion");
    if (change.visual) {
      pick(change.visual.module, "module");
      pick(change.visual.purpose, "visualPurpose");
      pick(change.visual.reason, "visualReason");
    }
    if (change.motion) {
      pick(change.motion.camera, "camera");
      pick(change.motion.reveal, "revealMode");
    }
    if (change.audio) {
      pick(change.audio.music, "music");
      if (typeof change.audio.silence === "string") pick(change.audio.silence, "silence");
      pick(change.audio.sfx, "sfx");
      pick(change.audio.jcut, "jcut");
      pick(change.audio.lcut, "lcut");
    }
    pick(change.rest, "rest");
    pick(change.callback, "callback");
    pick(change.captionMode, "captionMode");
    if (change.attention?.strategy) pick(change.attention.strategy, "attentionStrategy");
    beats[n] = note;
  }
  return { ...base, beats };
};

/** Attach the brain's per-sequence viewerState snapshots to the finished plan
 *  (by beat range); sequences the brain skipped get the deterministic
 *  tracker's projection from the beat decisions that landed in the plan. */
export const attachViewerStates = (
  plan: {
    sequences: { beatRange: [number, number]; viewerState?: ViewerState }[];
  },
  resp: EditorialResponse,
  decisions: { beatId: string; question?: string; reveal?: string; nextQuestion?: string; consequence?: string }[],
): void => {
  const brainMap = new Map<number, ViewerState>();
  for (const s of resp.sequences ?? []) {
    if (!Array.isArray(s.beatRange) || s.beatRange.length !== 2) continue;
    if (s.viewerState) brainMap.set(s.beatRange[0], s.viewerState);
  }
  let tracker: ViewerState = {
    knows: [], believes: [], suspects: [], doesNotKnow: [], openQuestions: [], resolvedQuestions: [],
  };
  const byBeat = new Map<number, ViewerState>();
  const sorted = [...decisions].sort((a, b) => Number(a.beatId) - Number(b.beatId));
  for (const d of sorted) {
    tracker = applyDecision(tracker, d as Parameters<typeof applyDecision>[1]);
    byBeat.set(Number(d.beatId), { ...tracker });
  }
  for (const seq of plan.sequences) {
    const [first, last] = seq.beatRange;
    const brain = brainMap.get(first);
    if (brain) {
      seq.viewerState = brain;
    } else {
      const snapshot = byBeat.get(first) ?? (last >= first ? byBeat.get(last) : undefined);
      if (snapshot) seq.viewerState = { ...snapshot };
    }
  }
};
