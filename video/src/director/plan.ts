// plan.ts: the director's front door. Script in, DirectorPlan out. Every
// layer below is deterministic, so the same script + overlay always produces
// the same plan — the renderer, the QC and the tests all read one artifact.
import type { CaptionMode, DirectorOverlay, DirectorPlan, Script } from "./types.ts";
import { analyzeStory } from "./story/StoryAnalyzer.ts";
import { planChapters, chapterOfBeat } from "./story/ChapterPlanner.ts";
import { planSequences } from "./story/SequencePlanner.ts";
import { runCuriosity } from "./attention/CuriosityEngine.ts";
import { rhythmFor, scheduleAllEvents } from "./attention/RhythmEngine.ts";
import { buildEmotionalCurve } from "./attention/EmotionalCurve.ts";
import { profileFor } from "./attention/AttentionDirector.ts";
import { budgetFor } from "./attention/NoveltyBudget.ts";
import { directVisuals } from "./visual/VisualDirector.ts";
import { cameraFor } from "./motion/CameraPlanner.ts";
import { revealFor } from "./motion/RevealPlanner.ts";
import { transitionInto } from "./motion/TransitionDirector.ts";
import { audioFor } from "./audio/AudioDirector.ts";
import { planMusic } from "./audio/MusicPlanner.ts";
import { planSilence } from "./audio/SilencePlanner.ts";
import { planSfx } from "./audio/SFXPlanner.ts";
import { trackMotifs } from "./memory/MotifTracker.ts";
import { buildMemory } from "./memory/StoryMemory.ts";
import { planCallbacks } from "./memory/CallbackPlanner.ts";
import { assembleTimeline } from "./timeline/TimelinePlanner.ts";
import { validateTimeline } from "./timeline/TimelineValidator.ts";
import { runRetentionQC } from "./qc/RetentionQC.ts";

export type DirectResult = {
  plan: DirectorPlan;
  warnings: string[];
  issues: ReturnType<typeof validateTimeline>;
  qc: ReturnType<typeof runRetentionQC>;
};

/** Apply the overlay: hand-written notes win over every guess. */
const mergeOverlay = (script: Script, overlay: DirectorOverlay | undefined): Script => {
  if (!overlay) return script;
  const beats = script.beats.map((b) => {
    const note = overlay.beats?.[b.n];
    return note ? { ...b, ...note } : b;
  });
  return {
    ...script,
    title: overlay.project?.title ?? script.title,
    beats,
  };
};

/** The longest run of loud beats an audience will sit through before the film
 *  has to let go. Nine beats is roughly forty seconds at essay pace. */
const RUN_BEFORE_REST = 9;

/**
 * Place rest beats when the script never asked for one.
 *
 * `rest` was only ever set by an explicit `Rest:` row, so a script that
 * doesn't write one gets a film with no rest, no silence windows (the
 * silence planner keys off rest) and one flat emotional register for five
 * minutes. A director doesn't wait to be told where to breathe: every
 * RUN_BEFORE_REST beats, the calmest beat in that window becomes the rest.
 * An explicit row anywhere in the script disables this entirely — the author
 * is directing, and half-automated rhythm is worse than either.
 */
const placeRestBeats = (
  visuals: { rest: boolean; captionMode: CaptionMode }[],
  profiles: { informationDensity: number }[],
): number[] => {
  if (visuals.some((v) => v.rest)) return [];
  const placed: number[] = [];
  // Never the first window (the hook has to earn attention before spending
  // it) and never the last beat (a film does not end on a held breath).
  for (let start = RUN_BEFORE_REST; start < visuals.length - 1; start += RUN_BEFORE_REST) {
    const end = Math.min(visuals.length - 1, start + RUN_BEFORE_REST);
    let calmest = start;
    for (let i = start; i < end; i++) {
      if (profiles[i].informationDensity < profiles[calmest].informationDensity) calmest = i;
    }
    visuals[calmest] = { ...visuals[calmest], rest: true, captionMode: "NONE" };
    placed.push(calmest);
  }
  return placed;
};

export const buildDirectorPlan = (
  rawScript: Script,
  overlay?: DirectorOverlay,
  mode: "SHORT" | "ESSAY" = "ESSAY",
): DirectResult => {
  const script = mergeOverlay(rawScript, overlay);
  const beats = script.beats;
  const warnings: string[] = [];

  // --- story
  const facts = analyzeStory(script);
  const chapters = planChapters(script, facts);
  const sequences = planSequences(script, facts, chapters);
  const curiosity = runCuriosity(script, facts, sequences);
  if (curiosity.unresolved.length) {
    warnings.push(
      `open question at the end: "${curiosity.unresolved[0].question.slice(0, 60)}" (from beat ${curiosity.unresolved[0].atBeat})`,
    );
  }

  // --- attention
  const emotions = buildEmotionalCurve(script, facts);
  const rhythms = beats.map((b) => rhythmFor(b));
  const profiles = beats.map((b, i) => profileFor(b, facts[i], emotions[i], rhythms[i]));
  const attentionEvents = scheduleAllEvents(script, facts, emotions, rhythms);

  // --- visual
  const { decisions: visuals, warnings: visualWarnings } = directVisuals(script, facts);
  warnings.push(...visualWarnings);

  // Rhythm before motion: the camera, the transitions and every silence
  // window read `rest`, so it has to be settled before any of them are.
  const rests = placeRestBeats(visuals, profiles);
  if (rests.length)
    warnings.push(
      `no Rest: row in the script — director placed ${rests.length} rest beats (${rests.map((i) => beats[i].n).join(", ")})`,
    );

  // --- motion
  const cameras = beats.map((b, i) => cameraFor(b, facts[i], visuals[i], emotions[i]));
  const reveals = beats.map((b, i) =>
    revealFor(b, facts[i], visuals[i].reveal, profiles[i].informationDensity, profiles[i].strategy),
  );

  // The novelty budget trims before the plan is fixed: if a beat wants a
  // loud module, a pushing camera and full captions at once, something goes.
  const budgeted = beats.map((b, i) => {
    const visual = visuals[i];
    if (visual.rest) return { camera: cameras[i], captionMode: visual.captionMode };
    const { camera, captionMode, trimmed } = budgetFor(
      b,
      visual.module,
      cameras[i],
      visual.captionMode,
    );
    if (trimmed) warnings.push(`beat ${b.n}: novelty budget trimmed — ${cameras[i]}→${camera}, captions ${visual.captionMode}→${captionMode}`);
    return { camera: camera as typeof cameras[number], captionMode };
  });
  const finalCameras = budgeted.map((x) => x.camera);
  const finalCaptions = budgeted.map((x) => x.captionMode);
  const trimmedVisuals = visuals.map((v, i) => ({ ...v, captionMode: finalCaptions[i] }));

  const transitions = beats.map((b, i) =>
    transitionInto(
      b,
      beats[i - 1],
      i > 0 && chapterOfBeat(chapters, b.n).id !== chapterOfBeat(chapters, beats[i - 1].n).id,
      emotions[i],
      visuals[i].rest,
      i > 0 && b.module === beats[i - 1].module,
    ),
  );

  // --- audio
  const restFlags = visuals.map((v) => v.rest);
  const audios = beats.map((b, i) => audioFor(b, facts[i], emotions[i], restFlags[i], attentionEvents));
  const audioEvents = [
    ...planMusic(beats, facts, emotions, restFlags),
    ...planSilence(beats, facts, restFlags),
    ...planSfx(beats, facts, attentionEvents),
  ].sort((a, z) => a.at - z.at);

  // --- memory
  const motifs = trackMotifs(script);
  const memory = buildMemory(motifs, beats);
  const callbacks = planCallbacks(memory, beats);

  // --- timeline
  const plan = assembleTimeline({
    script,
    facts,
    emotions,
    rhythms,
    profiles,
    visuals: trimmedVisuals,
    cameras: finalCameras,
    reveals,
    transitions,
    audios,
    memory,
    callbacks,
    attentionEvents,
    audioEvents,
    chapters,
    sequences,
    mode,
  });

  const issues = validateTimeline(plan);
  for (const issue of issues) warnings.push(`timeline: ${issue.message}`);

  const qc = runRetentionQC(plan);

  return { plan, warnings, issues, qc };
};
