// The director: turns the editing rules fetched from yt_scrapper
// (director-rules.json) into per-scene camera work + motion beats. Every
// scene gets a *varied* move (no two adjacent scenes repeat or reverse), and
// the move's travel/intensity is scaled by where the scene sits on the mined
// retention position curve — peaks get stronger motion, dips get calmer
// holds. A story can override per scene with `scene.edit.camera`.

import { useMemo } from "react";
import rulesJson from "./director-rules.json";
import type { CameraKeyframe } from "../components/Camera2D";
import type { SceneType, StoryScene } from "./storyTypes";
import { useScene, useStory } from "../StoryContext";
import { EASE_ARRIVE, EASE_IN_OUT } from "../utils/easing";

type MoveSpec = {
  entry: number;
  settle: number;
  settleAt: number;
  dx?: number;
  dy?: number;
};

type DirectorRules = {
  pacing: { maxStaticShotSec: number; cutBand: number[] };
  signals: Record<string, number>;
  position: { bin: number; peak: number; intensity: number }[];
  motion: Record<string, MoveSpec>;
  typeBias: Partial<Record<SceneType, string[]>>;
  beatSignals: {
    hitWords: string[];
    moneyRe: string;
    percentRe: string;
    entityRe: string;
  };
};

const rules = rulesJson as DirectorRules;
const signal = (name: string): number => rules.signals[name] ?? 0;

export type CameraMove = keyof typeof rules.motion;

const clamp = (v: number, lo = 0, hi = 1): number => Math.min(hi, Math.max(lo, v));

const hash = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const OPPOSITES: Partial<Record<CameraMove, CameraMove>> = {
  panLeft: "panRight",
  panRight: "panLeft",
  panUp: "panDown",
  panDown: "panUp",
};

// Deterministic, varied move selection: the scene's type pool (from the
// yt_scrapper bias table), seeded by its id, re-rolling away from the
// previous scene's move and any immediate reversal.
export const pickMove = (
  sceneType: SceneType,
  index: number,
  prevMove: CameraMove | undefined,
  seed: number,
): CameraMove => {
  const pool = (rules.typeBias[sceneType] ?? ["drift"]) as CameraMove[];
  let i = seed % pool.length;
  let move = pool[i];
  for (let k = 0; k < pool.length; k++) {
    if (move !== prevMove && OPPOSITES[move] !== prevMove) break;
    i = (i + 1 + k) % pool.length;
    move = pool[i];
  }
  return move;
};

// Retention-position intensity (0..1) for a scene at index/total of the
// runtime — from the mined 50-bin heat curve.
export const positionIntensity = (index: number, total: number): number => {
  if (total <= 1) return 0.5;
  const bin = clamp(Math.round((index / total) * 50), 0, rules.position.length - 1);
  return rules.position[bin]?.intensity ?? 0.5;
};

// Narration signal scoring: which chunks carry a hit (contrast word, money,
// percent, named entity) — the "at what time" the camera should punch.
const scoreChunk = (chunk: string): number => {
  const { hitWords, moneyRe, percentRe, entityRe } = rules.beatSignals;
  let score = 0;
  const words = chunk.toLowerCase().split(/\s+/);
  if (words.some((w) => hitWords.includes(w))) score += signal("is_contrast");
  if (new RegExp(moneyRe, "i").test(chunk)) score += signal("has_dollar");
  if (new RegExp(percentRe, "i").test(chunk)) score += signal("has_percent");
  if (new RegExp(entityRe).test(chunk)) score += signal("names_org");
  if (/\d/.test(chunk)) score += signal("number_specific");
  return score;
};

// Motion beats: narration chunks with positive signal score, as scene
// fractions, strongest first. The camera punches the strongest one.
export const planMotionBeats = (scene: StoryScene): { rel: number; weight: number }[] =>
  scene.narration
    .map((chunk, i) => ({ rel: (i + 0.5) / scene.narration.length, weight: scoreChunk(chunk) }))
    .filter((b) => b.weight > 0)
    .sort((a, b) => b.weight - a.weight);

const sorted = (k: CameraKeyframe[]): CameraKeyframe[] => k.sort((a, b) => a.frame - b.frame);

// Builds the keyframe list for a move, with travel scaled by the retention
// intensity. Landscape world is 1920×1080 (center 960/540), portrait
// 1080×1920 (center 540/960) — offsets stay in world units.
export const buildKeyframes = (
  move: CameraMove,
  intensity: number,
  at: (p: number) => number,
  portrait: boolean,
  punchRel = 0.45,
): CameraKeyframe[] => {
  const spec = rules.motion[move];
  const t = 0.65 + 0.7 * intensity; // travel factor: peaks move more
  const cx = portrait ? 540 : 960;
  const cy = portrait ? 960 : 540;
  const dx = (spec.dx ?? 0) * t;
  const dy = (spec.dy ?? 0) * t;
  const settle = spec.settle;
  const keyframes: CameraKeyframe[] = [
    { frame: 0, camera: { x: cx - dx, y: cy - dy, scale: spec.entry }, easing: EASE_IN_OUT },
    { frame: at(spec.settleAt), camera: { x: cx, y: cy, scale: settle }, easing: EASE_ARRIVE },
    // gentle overrun past center, then settle back for the flash cut
    { frame: at(clamp(spec.settleAt + 0.18, 0, 0.85)), camera: { x: cx + dx * 0.15, y: cy + dy * 0.15, scale: settle }, easing: EASE_IN_OUT },
    { frame: at(0.97), camera: { x: cx, y: cy, scale: settle }, easing: EASE_ARRIVE },
  ];
  if (move === "punch") {
    const p = clamp(punchRel, 0.25, 0.7);
    keyframes.push(
      { frame: at(p), camera: { x: cx, y: cy, scale: settle * 1.045 }, easing: EASE_IN_OUT },
      { frame: at(clamp(p + 0.12, 0, 1)), camera: { x: cx, y: cy, scale: settle }, easing: EASE_ARRIVE },
    );
  }
  return sorted(keyframes);
};

// React hook: the scene's planned camera work + metadata.
export const useDirector = (): {
  move: CameraMove;
  intensity: number;
  keyframes: CameraKeyframe[];
  keyframesPortrait: CameraKeyframe[];
} => {
  const { scene, durationInFrames, at } = useScene();
  const story = useStory();
  const index = Math.max(0, story.scenes.findIndex((s) => s.id === scene.id));
  const total = story.scenes.length;
  return useMemo(() => {
    const edit = (scene as StoryScene & { edit?: { camera?: CameraMove; intensity?: number } }).edit;
    const seed = hash(scene.id);
    const prevMove =
      index > 0
        ? pickMove(story.scenes[index - 1].type, index - 1, undefined, hash(story.scenes[index - 1].id))
        : undefined;
    const move = edit?.camera ?? pickMove(scene.type, index, prevMove, seed);
    const intensity = clamp(edit?.intensity ?? positionIntensity(index, total));
    const punchRel = planMotionBeats(scene)[0]?.rel ?? 0.45;
    return {
      move,
      intensity,
      keyframes: buildKeyframes(move, intensity, at, false, punchRel),
      keyframesPortrait: buildKeyframes(move, intensity, at, true, punchRel),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, index, total, at, durationInFrames]);
};
