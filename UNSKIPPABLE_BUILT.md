# UNSKIPPABLE — what was built

Implementation log for `UNSKIPPABLE.md`. What shipped, what it found, what is
still open, and the one thing that could not be verified here.

**Test state:** 49/49 passing (8 camera · 14 editorial · 27 retention) plus four
Python selftests. `npm run check` runs all of them.

---

## The headline

Before this work the pipeline reported **retention 9.6/10, three findings** on a
ten-minute film. It now reports the same film as **five failed gates, 30
seconds of measurable padding, four decayed loops and a 162-second window with
nothing unresolved.**

Nothing about the film changed. The engine simply stopped grading its own
homework — and one of the three findings it *did* have was a bug (below).

---

## New files

| File | What it is |
|---|---|
| `video/src/director/attention/LoopStack.ts` | Depth-3 loop stack, semantic closure matching, loop-debt curve |
| `video/src/director/attention/OpeningRegime.ts` | First-15-seconds rules, hook taxonomy, forbidden-pattern gate |
| `video/src/director/attention/Habituation.ts` | Decaying familiarity, escalation, modality rotation |
| `video/src/director/attention/EmotionalArc.ts` | Valence/arousal model, act-level arc, contrast distance |
| `video/src/director/story/Causality.ts` | BUT / THEREFORE / AND-THEN detection |
| `video/src/director/qc/DropRisk.ts` | Per-second predicted risk curve + sparkline |
| `video/src/director/qc/Gates.ts` | 16 hard gates that block the render |
| `video/src/essay/Film.tsx` | The post layer: grain, halation, aberration, drift, vignette |
| `tools/voice_direction.py` | Per-sentence direction, take scorer, drift monitor |
| `tools/mix.py` | Room tone, ducking envelope, final-mix loudness meter |
| `tools/review.mjs` | Frame review — the engine looks at its own pixels |
| `tools/packaging.mjs` | Titles, thumbnail text and chapters, generated from the plan |
| `tools/tests/retention.test.mjs` | 27 tests, all phrased as claims about what a viewer would notice |

---

## Three bugs found in existing code

These were live, and two of them had been silently shaping every episode.

**1. `moduleRuns` never saw a module on the plan side.** It read `b.module`;
a `DirectedBeat` keeps its module at `b.visual.module`. So every plan-side
caller — including `AttentionQC`'s repetition check — read `undefined`,
collapsed the whole film into one run of `""`, and reported a 68-beat module
run on every single episode. That bogus finding was the *only* thing holding
the attention score below 10, which is exactly why it survived: it looked like
the check working.

**2. Every quantity check was blind.** The script spells numbers out for the
TTS — "thirty million dollars", not "$30M" — and every "does this carry a
number?" test used a digit regex. So on a film made almost entirely of money:
the hook gate failed on *"They pay you two dollars"*, the causality detector
found no quantities anywhere, and the information-void term concluded a film
about fifteen billion dollars contained no facts. Fixed at the root with
`hasQuantity` / `quantityCount` in `util.ts`; causality went from 40% → 69% on
the same unchanged script.

**3. `annotation.ts` is JSX in a `.ts` file** — pre-existing, unrelated to this
work, and it breaks `npm run lint`. Renaming it to `.tsx` fixes it. Not done
here because it touches an area I had no reason to be in.

---

## What the gates found on your actual script

Run `npm run director:check`. Current state of `THE FIFTEEN-BILLION-DOLLAR COMPOUND`:

```
DROP RISK    (predicted, uncalibrated — the shape is the product)
  ▄▂▃▂▁▁▁▁▂▂▁▁▁▂▁▁▁ ▁▁▁▁▁▁▁ ▁▁▂▂▂▂▁▁▂ ▁▁▂▂▂▂▂▃▃▂▃▃▃▃▂▃▂▂▂▁▂▃▃▃
  00:00                         05:00                   10:00
  mean 0.160 · opening 30s 0.291  ← the opening is the weakest part of the film
```

Five failures worth acting on:

1. **`PADDING`** — 7 beats run longer than their content earns, ≈30s total.
   Worst is beat 14: 9.0s of read for 1.5 ideas.
2. **`AND_THEN`** — 7 runs of consecutive beats connected only by "and then";
   worst is beats 11–15. That is a five-beat stretch a viewer can leave at any
   point without missing a consequence.
3. **`NO_LOOP_OPEN`** — a window with fewer than two loops open.
4. **`LOOP_DECAYED`** — beat 23 asks *"In the trade, what do they call that
   first money?"* and it is never touched again inside its shelf life.
5. **`FORBIDDEN_PATTERN`** — beat 43: *"A hundred thousand targets. A thousand
   responses. A hundred deposits."* Three sentences opening on the same word.

The opening now scores as the film's weakest passage, which matches where a
third of any film's loss actually happens.

---

## Design decisions worth knowing about

**The drop-risk weights are guesses, and are labelled as such.** They live in
one exported object (`WEIGHTS` in `DropRisk.ts`) precisely so that calibration,
when real retention data exists, is a fit over eight numbers and nothing else
in the file changes. The *ranking* of moments is far more robust than the
absolute values, and the ranking is what tells you where to work.

**A chapter card is treated as a promise.** "THE LADDER" is a question the
viewer now holds, so a chapter head opens an ACT-level loop even with no
`Question:` row, scoped to close inside its own chapter. A chapter that
contains no reveal shows up as decayed — which is the true finding: it promised
a turn and never took one.

**Voice direction is offsets, not absolutes.** The `DELIVERY`/`SCAM` tables in
`voice.py` were arrived at by listening and they are right; what they could not
do was move *within* a beat. Direction now shifts each sentence around the
module's own setting. The ranges are deliberately narrower than the Chatterbox
docs' dramatic settings — 0.7 exaggeration sounds like an advert, and your
tables already knew that.

**Hero moments are scarce on purpose.** Roughly one per two minutes, ranked by
what the *story* says matters, never adjacent. `NoveltyBudget` only ever
subtracted, which produces a film with no frame louder than any other — and
peak–end says a film with no peak is remembered as its average.

**The three-word-loop gate checks anaphora, not brevity.** My first version
flagged *"Watch ten videos. Screenshot the proof. Send it in."* — which is good
writing. Three short sentences is not a tic; three sentences opening on the
*same word* is.

---

## Not verified here

**The `Film.tsx` post layer has not been seen.** TypeScript validates its JSX,
props and imports, and `npm run check` passes — but this sandbox's
`node_modules` carries Windows native bindings, so `remotion still` cannot run.
Before trusting it:

```
npm run render:vox:essay -- --frames=0-120     # or a still
```

and look at it. If any single effect is *visible as an effect*, turn it down —
the numbers in `VOX_LOOK` are at the bottom of their useful range by design,
and the test of a post layer is that you only notice it when you switch it off.

---

## New commands

```
npm run director:check     # now prints the risk sparkline, loops, causality, gates
npm run packaging          # title + thumbnail candidates from the plan
npm run review:render      # render stills, then review them
npm run review             # contrast, stasis, safe-area, thumbnail legibility
npm run mix                # write room tone + the ducking envelope
npm run mix:meter          # measure the finished render (needs ffmpeg)
npm run direction          # print the directed read for a beat
python tools/voice.py --takes 4 --verbose
```

`npm run director:check` exits 2 when a gate fails, so a render script can
refuse to run. `--no-gate` overrides it.

---

## What is still open from the plan

| Plan item | State |
|---|---|
| §5.1–5.4, 5.5, 5.6, 5.7a, 5.8, 5.9 | built |
| §5.7c **visual motif** | not built — `MotifTracker` still tracks narrative callbacks only |
| §5.6c **layered transition vocabulary** | planner-side only; the SFX pack still has 10 one-shots and needs risers/sub-drops recorded |
| §8 **calibration loop** | cannot start until videos are published. `WEIGHTS` is structured for it |
| §8.2 **competitor corpus** | a weekend of manual coding, and still the highest-value unbuilt item in the whole plan |

The two that matter most now are not code. Fix the seven padded beats and the
beats 11–15 run, and the film gets better than any of this made it.
