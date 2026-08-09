// Gates: the hard contract. A gate is not a score — it is a rule a
// professional edit does not break, and a failed gate blocks the render.
//
// The existing QC scores are advisory and always were. That is the right
// design for taste (is this beat too long? depends) and the wrong one for
// structure (does the film open a question and never answer it? that is not a
// matter of degree). The scores stayed; this is the layer that says no.
//
// Every gate here is either a rule with a citation behind it in UNSKIPPABLE.md
// or a spec with a number attached. Nothing is here because it felt right.
import type { DirectorPlan, QcGate, Script } from "../types.ts";
import type { LoopState } from "../attention/LoopStack.ts";
import { MIN_OPEN } from "../attention/LoopStack.ts";
import { inspectOpening } from "../attention/OpeningRegime.ts";
import { rhythmMismatch } from "../attention/RhythmEngine.ts";
import { analyzeStory } from "../story/StoryAnalyzer.ts";
import { analyzeCausality, andThenRuns, causalityScore } from "../story/Causality.ts";
import { moduleRuns } from "../visual/VisualContinuity.ts";

const g = (id: string, passed: boolean, at: number, message: string, fix?: string, beat?: number): QcGate => ({
  id,
  passed,
  at,
  beat,
  message,
  fix,
});

/** Seconds of loop starvation that count as a real hole rather than a seam. */
const STARVATION_TOLERANCE = 20;

/** How many audio sources may sound at once. From the documentary sound
 *  literature, which is unusually specific about it: more than three and the
 *  audience hears a cacophony rather than a soundtrack. */
export const MAX_AUDIO_SOURCES = 3;

/** Simultaneous audio sources at time t: the voice (whenever a beat is
 *  speaking and not inside a FULL_SILENCE), the bed (unless dropped), and
 *  every accent still ringing. Accents are given a 0.9s tail, which is about
 *  how long the pack's one-shots actually sound for. */
export const audioSourcesAt = (plan: DirectorPlan, t: number): number => {
  let n = 0;
  const beat = plan.beats.find((b) => t >= b.audioStart && t < b.end + (b.lCut ?? 0));
  const fullSilence = beat?.audio.silence.some(
    (s) => s.kind === "FULL_SILENCE" && t >= s.at && t < s.at + s.dur,
  );
  if (beat && !fullSilence) n += 1; // voice

  const bedDown = plan.audioEvents.some(
    (e) =>
      e.kind === "silence_start" &&
      (e.label === "FULL_SILENCE" || e.label === "MUSIC_DROP" || e.label === "VOICE_ONLY") &&
      e.at <= t &&
      !plan.audioEvents.some((x) => x.kind === "silence_end" && x.label === e.label && x.at <= t && x.at > e.at),
  );
  if (!bedDown) n += 1; // bed

  n += plan.audioEvents.filter((e) => e.kind === "sfx" && t >= e.at && t < e.at + 0.9).length;
  return n;
};

export const runGates = (script: Script, plan: DirectorPlan, loops: LoopState): QcGate[] => {
  const gates: QcGate[] = [];
  const dur = plan.project.durationInSeconds;
  const facts = analyzeStory(script);

  // ---------------------------------------------------------- opening
  const opening = inspectOpening(script, plan);
  gates.push(...opening.gates);

  // ---------------------------------------------------------- loops
  const realStarvation = loops.starved.filter((w) => w.to - w.from > STARVATION_TOLERANCE);
  gates.push(
    g(
      "NO_LOOP_OPEN",
      realStarvation.length === 0,
      realStarvation[0]?.from ?? -1,
      realStarvation.length
        ? `${realStarvation.length} window(s) with fewer than ${MIN_OPEN} loops open, longest ${Math.max(...realStarvation.map((w) => w.to - w.from))}s`
        : "loop debt stays inside the band",
      "open a beat-level question in that window — the viewer currently has no unresolved thing to stay for",
    ),
  );

  const stillOpen = loops.loops.filter((l) => l.outcome === "open");
  gates.push(
    g(
      "LOOP_UNRESOLVED",
      stillOpen.length === 0,
      stillOpen[0]?.openedAt ?? -1,
      stillOpen.length
        ? `${stillOpen.length} loop(s) never close — "${stillOpen[0].question.slice(0, 50)}" (beat ${stillOpen[0].openedAtBeat})`
        : "every loop closes",
      "answer it, or delete the question — an unpaid loop is the promise the channel gets judged on",
      stillOpen[0]?.openedAtBeat,
    ),
  );

  const decayed = loops.loops.filter((l) => l.outcome === "decayed");
  gates.push(
    g(
      "LOOP_DECAYED",
      decayed.length === 0,
      decayed[0]?.openedAt ?? -1,
      decayed.length
        ? `${decayed.length} loop(s) held past their shelf life — "${decayed[0].question.slice(0, 50)}" (beat ${decayed[0].openedAtBeat})`
        : "no loop is held past the point the viewer stopped holding it",
      "close it sooner, or re-state it — tension that isn't touched for a minute has decayed into forgetting",
      decayed[0]?.openedAtBeat,
    ),
  );

  // ---------------------------------------------------------- padding
  // The content/read mismatch, aggregated. One padded beat is a beat; a
  // handful is a habit, and it is the habit that flattens a retention graph
  // through the middle third.
  const padded = script.beats
    .map((b, i) => ({ b, m: rhythmMismatch(b, facts[i]) }))
    .filter((x) => x.m?.kind === "padded");
  const paddedSeconds = padded.reduce((s, x) => s + (x.m!.dur - x.m!.target[1]), 0);
  gates.push(
    g(
      "PADDING",
      padded.length <= Math.max(1, Math.round(script.beats.length * 0.06)),
      padded[0]?.b.start ?? -1,
      padded.length
        ? `${padded.length} beat(s) run longer than their content earns — about ${Math.round(paddedSeconds)}s of padding (worst: beat ${padded[0].b.n}, ${padded[0].m!.dur.toFixed(1)}s for ${padded[0].m!.ideas.toFixed(1)} ideas)`
        : "every beat's length is earned by what it carries",
      "cut the line, or give the beat something more to carry — runtime is an output of the outline, never an input",
      padded[0]?.b.n,
    ),
  );

  // ---------------------------------------------------------- causality
  const links = analyzeCausality(script);
  const runs = andThenRuns(links, 2);
  const score = causalityScore(links);
  gates.push(
    g(
      "AND_THEN",
      runs.length === 0,
      runs.length ? (script.beats.find((b) => b.n === runs[0].from)?.start ?? -1) : -1,
      runs.length
        ? `${runs.length} run(s) of consecutive beats connected only by "and then" — worst is beats ${runs[0].from}–${runs[0].to}`
        : `every seam carries BUT or THEREFORE (${(score * 100).toFixed(0)}%)`,
      "make the later beat either contradict or follow from the earlier one — otherwise it is a list, and a viewer leaves a list wherever they like",
      runs[0]?.from,
    ),
  );

  // ---------------------------------------------------------- visual
  const runsOfModule = moduleRuns(plan.beats).filter((r) => r.beats.length >= 3);
  gates.push(
    g(
      "MODULE_RUN_3",
      runsOfModule.length === 0,
      runsOfModule.length ? (plan.beats.find((b) => b.n === runsOfModule[0].beats[0])?.start ?? -1) : -1,
      runsOfModule.length
        ? `${runsOfModule[0].beats.length}× "${runsOfModule[0].module}" in a row (beats ${runsOfModule[0].beats.join(", ")})`
        : "no module runs three deep",
      "give one of them a different visual purpose — three identical frames in a row is where the orienting response gives up",
      runsOfModule[0]?.beats[0],
    ),
  );

  // A film with no peak has no memory. Peak–end says retrospective judgement
  // is roughly the average of the best moment and the last one — so a film
  // that never spends everything at once is remembered as its average, which
  // is the worst possible outcome for something that took a week.
  const peak = plan.beats.reduce((best, b) => Math.max(best, b.attention.novelty + b.attention.emotionalIntensity), 0);
  gates.push(
    g(
      "NO_PEAK",
      peak >= 1.4,
      -1,
      peak >= 1.4 ? `peak intensity ${peak.toFixed(2)}` : `nothing in the film exceeds ${peak.toFixed(2)} combined novelty+intensity`,
      "let one beat spend the whole novelty budget — one moment worth screenshotting is what the film is remembered as",
    ),
  );

  // ---------------------------------------------------------- audio
  let worstSources = 0;
  let worstAt = -1;
  for (let t = 0; t < dur; t += 0.5) {
    const n = audioSourcesAt(plan, t);
    if (n > worstSources) {
      worstSources = n;
      worstAt = t;
    }
  }
  gates.push(
    g(
      "AUDIO_SOURCES",
      worstSources <= MAX_AUDIO_SOURCES,
      worstSources > MAX_AUDIO_SOURCES ? worstAt : -1,
      worstSources > MAX_AUDIO_SOURCES
        ? `${worstSources} simultaneous audio sources`
        : `never more than ${worstSources} sources at once`,
      "voice + bed + one accent. Past three the audience hears a cacophony rather than a soundtrack",
    ),
  );

  // Precede loud with soft: every peak wants silence in front of it. This is
  // the single cheapest way to make a reveal land, and it costs nothing but
  // nerve.
  //
  // Keyed off the *story* — beats that carry a reveal or pay the film off —
  // rather than off attention-event strength. Event strengths are habituation-
  // adjusted, so a film with many reveals scores most of them below any fixed
  // threshold and the gate would quietly stop checking the moments that matter
  // most. What the beat is for does not habituate.
  const revealBeats = plan.beats.filter(
    (b) => Boolean(b.narrative.reveal) || b.narrative.purpose === "reveal" || b.narrative.purpose === "payoff",
  );
  const unprepared = revealBeats.filter(
    (b) =>
      !plan.audioEvents.some(
        (s) => s.kind === "silence_start" && s.at <= b.end && s.at > b.start - 3.5,
      ),
  );
  gates.push(
    g(
      "REVEAL_UNPREPARED",
      unprepared.length === 0,
      unprepared[0]?.start ?? -1,
      unprepared.length
        ? `${unprepared.length} of ${revealBeats.length} reveal/payoff beats have no silence window`
        : `all ${revealBeats.length} reveal/payoff beats are preceded by a drop`,
      "the way to make something sound loud is to precede it with something very soft",
      unprepared[0]?.n,
    ),
  );

  return gates;
};

export const failedGates = (gates: QcGate[]): QcGate[] => gates.filter((x) => !x.passed);
