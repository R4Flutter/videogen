// The director's public surface. tools/direct.mjs imports buildDirectorPlan
// through Node's type stripping; Remotion imports the types; the tests import
// the modules. One source of truth for the whole editorial layer.
export * from "./types.ts";
export * from "./util.ts";
export { analyzeStory } from "./story/StoryAnalyzer.ts";
export { buildStoryGraph, recurringEntities } from "./story/StoryGraph.ts";
export { planChapters, chapterOfBeat, chapterId } from "./story/ChapterPlanner.ts";
export { planSequences, sequenceOfBeat } from "./story/SequencePlanner.ts";
export { runCuriosity } from "./attention/CuriosityEngine.ts";
export {
  runLoopStack,
  debtScore,
  overlap,
  terms,
  MIN_OPEN,
  MAX_OPEN,
  SHELF_LIFE,
  MATCH_THRESHOLD,
  type Loop,
  type LoopDepth,
  type LoopState,
} from "./attention/LoopStack.ts";
export {
  inspectOpening,
  classifyHook,
  hookText,
  threeWordLoop,
  FORBIDDEN,
  HOOK_TYPES,
  type HookType,
  type Channel,
} from "./attention/OpeningRegime.ts";
export {
  analyzeCausality,
  linkBetween,
  andThenRuns,
  causalityScore,
  type Link,
  type Connective,
} from "./story/Causality.ts";
export { buildRiskCurve, sparkline, fmtTime, WEIGHTS, type RiskCurve } from "./qc/DropRisk.ts";
export { runGates, failedGates, audioSourcesAt, MAX_AUDIO_SOURCES } from "./qc/Gates.ts";
export { rhythmFor, scheduleAllEvents } from "./attention/RhythmEngine.ts";
export { buildEmotionalCurve, emotionFor } from "./attention/EmotionalCurve.ts";
export { profileFor } from "./attention/AttentionDirector.ts";
export { budgetFor, pickHeroBeats, MODULE_MOTION, HERO_CEILING, HERO_PER_MINUTE } from "./attention/NoveltyBudget.ts";
export {
  habituation,
  effectiveStrength,
  escalate,
  rotateModality,
  applyHabituation,
  channelOf,
  channelMix,
  CHANNEL_OF_EVENT,
  TAU,
} from "./attention/Habituation.ts";
export {
  buildEmotionalArc,
  arcDistance,
  arcTargetAt,
  nearest,
  flatStretches,
  VALENCE_AROUSAL,
  MIN_CONTRAST,
  type VA,
} from "./attention/EmotionalArc.ts";
export { visualPurposeFor, MODULE_BY_PURPOSE } from "./visual/VisualPurpose.ts";
export { visualFor, NATIVE_REVEAL, CAPTION_BY_MODULE } from "./visual/VisualDirector.ts";
export { metaphorFor, isAbstract } from "./visual/MetaphorPlanner.ts";
export { enforceVariety, moduleRuns } from "./visual/VisualContinuity.ts";
export { cameraFor } from "./motion/CameraPlanner.ts";
export { revealFor } from "./motion/RevealPlanner.ts";
export { transitionInto } from "./motion/TransitionDirector.ts";
export { musicMoodFor, planMusic } from "./audio/MusicPlanner.ts";
export { silenceFor, planSilence } from "./audio/SilencePlanner.ts";
export { sfxFor, planSfx, SFX_PACK } from "./audio/SFXPlanner.ts";
export { audioFor, cutsFor } from "./audio/AudioDirector.ts";
export { trackMotifs } from "./memory/MotifTracker.ts";
export { buildMemory, memoryOf } from "./memory/StoryMemory.ts";
export { planCallbacks } from "./memory/CallbackPlanner.ts";
export { assembleTimeline } from "./timeline/TimelinePlanner.ts";
export { validateTimeline } from "./timeline/TimelineValidator.ts";
export { runRetentionQC } from "./qc/RetentionQC.ts";
export { buildDirectorPlan, type DirectResult } from "./plan.ts";
