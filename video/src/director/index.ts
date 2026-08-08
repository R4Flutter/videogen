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
export { rhythmFor, scheduleAllEvents } from "./attention/RhythmEngine.ts";
export { buildEmotionalCurve, emotionFor } from "./attention/EmotionalCurve.ts";
export { profileFor } from "./attention/AttentionDirector.ts";
export { budgetFor, MODULE_MOTION } from "./attention/NoveltyBudget.ts";
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
