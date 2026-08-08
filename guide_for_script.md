# How to write `vox_script.md`

The script is not a document that describes the video. It is the **only input the
video has**. Everything downstream — module choice, camera, transitions, music
level, silence windows, sfx, chapter cards, captions, reveal stamps, the QC score
— is derived from rows you write here or guessed by a heuristic when you leave
them blank.

The heuristics are decent. They are not a director. Every row you leave blank is
a decision the machine makes on your behalf, and the machine has never seen the
story.

This guide documents what the parser actually reads
([tools/parse-script.mjs](tools/parse-script.mjs)) and what each director module
does with it. Where it says "the engine does X", X is in the code, not an
aspiration.

---

## 1. The pipeline

```
vox_script.md
   │  npm run script:vox      → tools/parse-script.mjs
   ▼
video/src/script.json  +  video/src/voice.json (timing stub)
   │  npm run voice / align   → real narration + word timings
   │  npm run director        → video/src/director/plan.ts
   ▼
video/src/director-plan.json     ← the edit: camera, cuts, music, silence, reveals
   │  npm run render:vox:essay
   ▼
out/vox-essay.mp4
```

Two commands matter while writing:

| command | what it tells you |
|---|---|
| `npm run script:vox` | did the parser find your beats, and which module did each one get |
| `npm run director:check` | the full edit + QC findings, no AI, ~2 seconds |

Run `director:check` after every editing pass. It is the fastest feedback loop
in the project and it reads exactly what a viewer would feel.

---

## 2. Document skeleton

````markdown
# THE FIFTEEN-BILLION-DOLLAR COMPOUND        ← title (first H1)

**Style:** Vox deep dive                      ← must contain "vox" to pick this engine
**Format:** landscape                         ← "landscape" or "16:9" → 1920×1080, else 1080×1920
**Runtime:** 10:00                            ← documentation only
**Caption Hook:** They pay you $2 to watch videos.
**Keywords:** pig butchering, task scam

## COLD OPEN (0:00–0:42)                       ← chapter: NAME (m:ss–m:ss)

**Act Hook:** What is the machine actually selling?   ← the chapter's promise

### BEAT 1 — THE HOOK (0:00–0:08)              ← em dash, then (m:ss–m:ss)

| Layer | Content |
|---|---|
| **On-screen text** | PAID TO WATCH VIDEOS |
| **Visual** | Words fill the page as they're spoken. |
| **Module** | kinetic |
| **Audio** | They pay you two dollars to watch videos. |
````

### Hard syntax rules

The parser is regex-driven. These are not style preferences:

- Beat heading: `### BEAT <n> — <NAME> (<m:ss>–<m:ss>)`. The separator after the
  number **must be an em dash** (`—`). The time range accepts en dash or hyphen.
- Chapter heading: `## <NAME> (<m:ss>–<m:ss>)`. A `##` heading with no time range
  is not a chapter — that is how `## 4. TEXT TIMING TABLE` stays out of the film.
- Rows must be `| **Key** | value |`. Keys are lowercased before lookup, so
  `**On-screen text**` and `**ON-SCREEN TEXT**` are the same row. The bold
  asterisks are required.
- A beat block ends at the next `###` or `##`. Anything after that belongs to the
  next beat.
- Beat times are the **edit**, not a suggestion. `durationInSeconds` is the last
  beat's end. Gaps between beats render as nothing.
- `fps` is fixed at 30.

---

## 3. Every row the parser reads

Rows marked **directs the edit** feed the director. Rows marked **stages the
frame** feed the renderer. Everything is optional; the third column is what
happens when you leave it out.

### Content rows — stages the frame

| Row | Purpose | If omitted |
|---|---|---|
| `Audio` | The narration. This is what gets spoken and word-timed. | Beat is silent; captions have nothing to show |
| `On-screen text` | The big overlay text. Also becomes a "thing the viewer now knows". | No overlay; `viewerKnows` loses this beat |
| `Visual` | Prose description of the frame. **Drives module inference by keyword.** | Module falls back to `kinetic` |
| `Module` | Names the module outright. Beats all inference. | Inferred from `Visual` keywords, else `kinetic` |
| `Motion FX` | Describes the mark. Sets `shape`: flip / highlight / circle / box / arrow / strike. | Module draws its default mark |
| `Data` | `Label: value, Label: value` for `stat`/`compare`/`chart`/`funnel`. Digit-grouping commas are safe (`15,000,000,000`). | Numeric modules have nothing to render |
| `Icons` | `icon-name: Label, icon-name: Label` (lucide names) for `icon`. | `icon` module renders empty |
| `Places` | `India; Cambodia @ 12.5,104.9; Dubai @ 25.2,55.3`. Semicolons — a lat/lon pair owns the comma. **A beat with `Places` and no `Module` row becomes a `map`.** | `map` has nothing to ink or pin |
| `Source` | Citation printed under a `quote` clipping; becomes the `LOWER_THIRD` caption text on any beat. | Lower-third falls back to the beat NAME |
| `Turn` | The word a `trust` beat collapses on. | Module picks its own turn |
| `Footage` | Search terms for `tools/fetch-footage.py`. Not read by the renderer. | No footage fetched for this beat |
| `Image prompt` | Hand-written art direction. The only correct home for one. | Built from `Visual` + `Footage` |

### Direction rows — directs the edit

These are the rows almost nobody writes and every one of them is the difference
between a slideshow and an edit.

| Row | Values | What reads it |
|---|---|---|
| `Purpose` | hook, orient, explain, complicate, escalate, reveal, consequence, payoff, reflect, rest | camera, music mood, silence, sequence purpose, story QC |
| `Question` | free text, should read as a question | reveal stamps, CuriosityEngine, `no-questions` QC |
| `Reveal` | free text: what the viewer now knows | reveal stamp, music drop, pre-reveal silence, **`no-reveal` QC** |
| `Emotion` | curiosity, comfort, surprise, tension, confusion, clarity, shock, empathy, anger, anticipation, relief, satisfaction | camera lean, music, **`flat-emotion` QC** |
| `Rest` | true / yes / 1 | rest beat: captions off, music quiet, VOICE_ONLY silence |
| `Camera` | establish, focus, push, pull, pan, compare, reveal, settle | the 2.5D page camera |
| `Caption mode` | NONE, EMPHASIS, SUBTITLE, LOWER_THIRD, FULL | what words reach the frame |
| `Reveal mode` | SEQUENTIAL, PROGRESSIVE, MASK, DRAW_ON, FOCUS, HIDDEN_THEN_REVEAL, COUNTER_REVEAL, ZOOM_REVEAL, LAYERED | progressive disclosure staging |
| `Music` | swell / rise, drop / out, quiet / low, hold | the bed level under this beat |
| `Silence` | full, pre, post, drop | carves the bed out around the line |
| `Sfx` | a name from the pack (`boom`, `riser`, `stamp`, `tick`, `chime`, `pop`, `whoosh`, `whoosh-up`, `shimmer`, `chime-warm`) | an extra accent on top of the earned ones |
| `J-cut` / `L-cut` | seconds, e.g. `0.4` | audio leads / trails the picture |
| `Chapter` / `Sequence` | free text | grouping override |
| `Callback` | free text | motif callback stamp |

---

## 4. The module catalogue

Fifteen modules. Pick by **what the frame has to prove**, not by what the
narration mentions.

| Module | Use when | Needs | Native reveal | Native caption |
|---|---|---|---|---|
| `kinetic` | The words *are* the frame | `On-screen text` | MASK | NONE |
| `stat` | One number carries the beat | `Data` (one pair) | COUNTER_REVEAL | EMPHASIS |
| `compare` | Two quantities, and the gap is the point | `Data` (two pairs) | SEQUENTIAL | EMPHASIS |
| `chart` | A trend over a range | `Data` | PROGRESSIVE | EMPHASIS |
| `timeline` | Events in order along an axis | `Data` | PROGRESSIVE | FULL |
| `funnel` | Many in, few out | `Data` | PROGRESSIVE | FULL |
| `map` | Where. Geography is the claim | `Places` | LAYERED | FULL |
| `trace` | Money or a thing moving node to node | `Places` / `Data` | PROGRESSIVE | FULL |
| `trust` | Something looks legitimate, then doesn't | `Turn` | SEQUENTIAL | FULL |
| `icon` | Discrete steps or categories | `Icons` | SEQUENTIAL | FULL |
| `quote` | Someone said it and it must be cited | `On-screen text` + `Source` | FOCUS | EMPHASIS |
| `collage` | Many pieces of evidence at once | `Footage` | SEQUENTIAL | FULL |
| `doodle` | Archival image + a hand-drawn mark | `Footage` + `Motion FX` | DRAW_ON | SUBTITLE |
| `callout` | One detail inside a larger image | `Footage` + `Motion FX` | DRAW_ON | SUBTITLE |
| `footage` | A clip breathes under a headline | `Footage` | HIDDEN_THEN_REVEAL | SUBTITLE |

### Module selection gotchas

- **Keyword inference is first-match-wins and narrow on purpose.** `"the money
  moves to Dubai"` matches `moves to` → `trace`, not `map`. If you meant a map,
  write a `Places` row or a `Module` row.
- **Write the `Module` row whenever you care.** Inference exists so a rough draft
  renders, not so a finished script can skip the decision.
- **The variety pass will overrule you.** Long runs of one module get restaged
  and reported as `beat N: "x" run broken — restaged as "y"`. If you get that
  warning and you meant the run, vary the modules yourself; the automatic
  restage picks a substitute that has never read your script.
- **`kinetic` is the fallback.** If more than ~25% of the film is kinetic you
  will trip `kinetic-overuse`, and it usually means beats fell through inference
  rather than that you chose typography.

---

## 5. Engineering engagement

Four devices. Each one clears a specific QC rule, and **three of them cannot be
inferred** — the engine only sees them if you write the row.

### 5.1 Reveals — the one that matters most

```markdown
| **Reveal** | The "company" was one man with a spreadsheet. |
```

A `Reveal` row does five things at once:

1. Plants a `REVEAL` stamp at ~62–80% through the beat (late, so the beat's air
   is the payoff).
2. Drops the music bed to 0.3 for the beat.
3. Carves a `PRE_REVEAL_SILENCE` window at 60% through, if the beat is ≥6s.
4. Fires a `boom.wav` + `shimmer.wav` sting.
5. Adds the claim to what the viewer knows, so callbacks can reference it.

**The `no-reveal` HIGH finding can only be cleared by `Reveal` rows.** Writing
"the truth is…" in the `Audio` row sets the beat's *purpose* to reveal, but
`facts.reveal` reads the row and nothing else. This is the single most common
reason a technically-fine script scores badly.

**How many:** one per sequence turn, minimum. In a 68-beat film that is roughly
one every 8–10 beats. A reveal is *something the viewer now knows that they did
not know 30 seconds ago* — not a restatement, not a bigger number.

### 5.2 Questions — the pull

```markdown
| **Question** | Why would anyone pay you to watch a video? |
```

Opens a `?` stamp at ~15–25% into the beat and registers an open loop in the
CuriosityEngine. A question is also inferred when the `Audio` row ends in `?` or
starts with why/who/what/where/how/when/is it/does it/would you/can it — so
narration that genuinely asks does not need the row.

The engine tracks whether each open question gets answered. Unanswered ones at
the end produce `open question at the end: "…"`. That is fine if deliberate
(a closing question is a legitimate ending) and a defect if accidental.

**Pair them.** Question at beat N, reveal by beat N+4 or so. `open-questions`
reports the ratio; 9 questions against 1 reveal is a film that keeps promising
and never pays.

### 5.3 Emotion — and the trap

```markdown
| **Emotion** | tension |
```

Here is the mechanism that surprises everyone:

> `SequencePlanner` builds each sequence's emotion from `emotionHint`, which is
> **only** the author's `Emotion` row. The inferred emotional curve — the one
> `EmotionalCurve.ts` builds from your narration's language — never reaches the
> sequence. So a script with zero `Emotion` rows gets `curiosity` on every
> sequence and trips `flat-emotion` no matter how good the writing is.

**To clear `flat-emotion` you must write `Emotion` rows.** You do not need one
per beat — one per sequence (roughly every 4–5 beats, at the turns) is enough,
because the sequence takes the first hint in its run.

A working arc for a 5-minute investigative piece:

```
curiosity → comfort → clarity → confusion → tension → shock → anger → clarity → satisfaction
```

The rule is that it must *move*. Intensity should swing by more than 0.25
between sequences or you trip `flat-intensity`.

### 5.4 Rest — the breath

```markdown
| **Rest** | true |
```

A rest beat turns captions off, drops the bed to 0.28, and opens a `VOICE_ONLY`
silence window. It is where the audience catches up.

**Note the current behaviour:** if your script contains *no* `Rest` row at all,
the director places its own — the calmest beat in every 9-beat window — and warns
you about it. That is a safety net, not direction. The moment you write one
`Rest` row anywhere, automatic placement switches off entirely and every rest in
the film is yours. Half-automated rhythm is worse than either, so if you take
the wheel, take it for the whole film.

Place rests **after** a dense stretch or a reveal, never before one, and never on
the last beat.

### 5.5 Callbacks

```markdown
| **Callback** | PAID TO WATCH VIDEOS |
```

Returns a motif from earlier in the film. `no-callbacks` fires on any 4+ minute
film without one. The strongest callback is the hook's exact phrase, returning in
the payoff with new meaning.

---

## 6. Rhythm

Beat length is the edit's pulse and you set it in the beat heading.

| Tier | Length | Use for |
|---|---|---|
| MICRO_CHANGE | 1.5–4s | punches, list items, escalating stats |
| VISUAL_IDEA | 4–10s | one idea, fully staged — the workhorse |
| PROGRESSION | 10–30s | one visual that develops (a trace, a chart building) |
| ATTENTION_RESET | 30–60s | the frame changes language entirely |

**The failure mode is uniformity.** A film where every beat is 4–5 seconds reads
as metronomic even when every individual beat is good. Deliberately vary:

```
2.3s  4.4s  6.7s  2.7s  9.1s  3.4s  4.2s  12.0s  2.1s
```

Short beats stack pressure. Long beats let something land. A 2-second beat next
to a 12-second beat is a rhythm; twelve 4-second beats is a metronome.

Chapter cadence: aim for a `##` chapter every 60–120 seconds. Chapters produce
chapter cards and chapter-boundary transitions, which are the film's largest
pattern interrupts.

---

## 7. Audio direction

The bed is an instrument, not a drone. Levels the planner uses:

| Mood | Level | Earned automatically by |
|---|---|---|
| swell | 0.58 | `Purpose: hook`, `Purpose: payoff` |
| hold | 0.40 | everything else |
| drop | 0.30 | a `Reveal` row; emotion surprise or shock |
| quiet | 0.28 | a rest beat; `Purpose: reflect`; emotion tension or anticipation |

Your `Music` row overrides all of it.

**Silence** is the loudest tool in the file:

| `Silence` value | Effect |
|---|---|
| `pre` | 1.2s drop at the top of the beat — the line lands in the open |
| `post` | 1.0s hold at the end — the audience gets air after the payoff |
| `drop` | bed out for the first 35% of the beat |
| `full` | bed out for the whole beat. **Check the beat has no narration** — `voice-muted` will flag it if it does |

**SFX** are earned, not sprinkled. The planner attaches one accent per strong
attention event per beat: reveals get `boom`+`shimmer`, questions get
`whoosh-up`, numbers get `chime`, objects entering get `pop`, pattern interrupts
get `riser`, diagram builds get `tick`. Aim for roughly one accent per 40s of
runtime or you trip `sparse-sfx`.

**J/L cuts** — `| **J-cut** | 0.4 |` starts this beat's narration 0.4s before its
picture. Two or three across a long film is enough to clear `no-jlcuts` and it
is the cheapest thing in this document that makes an edit feel professional.

---

## 8. Camera and transitions

You rarely need the `Camera` row — module-driven framing is sensible (`stat` and
`kinetic` push, `doodle` and `callout` focus, `quote` and `chart` settle,
`compare` slides across). Write it when the story disagrees with the module:

- `establish` — first beat of a chapter, widening onto the whole page
- `push` — pressure building, attention narrowing
- `pull` — consequence, aftermath, widening out
- `reveal` — settling from a wider frame as the thing lands
- `settle` — the quiet beat after a move

Note that `settle` is not "no camera" — it is a slow release, and a page with no
camera at all reads as a slide.

**The novelty budget will overrule a camera you asked for.** A loud module plus a
moving camera plus full captions exceeds the frame's motion budget, and the
director removes captions first, then the camera. You will see
`novelty budget trimmed — push→settle` in the warnings. That is the system
working: flying type under a pushing camera is noise. If you want the camera,
quiet the captions yourself with `| **Caption mode** | EMPHASIS |`.

---

## 9. The QC rule table

Run `npm run director:check`. Every rule below, what trips it, what fixes it.

| Rule | Trips when | Fix |
|---|---|---|
| `no-reveal` ⚠ | zero `Reveal` rows | write `Reveal` rows at sequence turns |
| `flat-emotion` ⚠ | every sequence has the same emotion | write `Emotion` rows |
| `no-payoff` ⚠ | last beat's purpose isn't payoff/reflect | `Purpose: payoff` on the final beat |
| `no-silence` ⚠ | 3+ min film, no silence window | `Reveal` rows, or explicit `Silence` |
| `flat-music` ⚠ | bed level never changes | vary `Purpose`; add `Music` rows |
| `voice-muted` ⚠ | `Silence: full` over a beat that speaks | move it or shorten it |
| `no-reset` ⚠ | no attention reset in the film | add a chapter or a 30s+ beat |
| `long-rest` ⚠ | a rest beat runs 20s+ | split it |
| `module-dominance` ⚠ | one module carries too much | vary modules |
| `no-hook` | first beat isn't a hook | `Purpose: hook` on beat 1 |
| `no-questions` | no beat poses one | `Question` rows, or narration that asks |
| `low-variety` | too few distinct modules | use the catalogue |
| `no-rest` | 4+ min film, no rest beat | `Rest: true` |
| `kinetic-overuse` | kinetic carries >25% | most are inference fallbacks — write `Module` rows |
| `no-callbacks` | 4+ min film, no callback | `Callback` row in the payoff |
| `no-jlcuts` | 3+ min film, no J/L cuts | two or three `J-cut` rows |
| `sparse-sfx` | fewer than ~1 accent per 40s | more reveals and questions |
| `open-questions` | more questions than reveals | pair them, or accept it |
| `unexplained-transition` | a cut with no continuity reason | usually resolves once purposes are set |
| `metaphor-vs-evidence` | metaphor staged where a citation belongs | use `quote` + `Source` |

Warnings marked ⚠ carry real weight in the score. The rest are advisory.

---

## 10. A beat, before and after

**Before** — renders, scores badly, directs nothing:

```markdown
### BEAT 22 — THE MONEY (2:14–2:19)

| Layer | Content |
|---|---|
| **Visual** | The money moves offshore. |
| **Audio** | The money went to Dubai, then to a wallet nobody could name. |
```

What the engine does with it: `moves` matches → `trace`. Purpose falls to
`explain` → camera `settle`. Emotion falls to positional → `curiosity`. No
question, no reveal, `FULL` captions over a diagram. One of 68 identical beats.

**After** — same narration, directed:

```markdown
### BEAT 22 — THE MONEY (2:14–2:23)

| Layer | Content |
|---|---|
| **On-screen text** | NOBODY COULD NAME IT |
| **Visual** | The money traces node to node, then the last node has no label. |
| **Module** | trace |
| **Places** | Sihanoukville @ 10.6,103.5; Dubai @ 25.2,55.3 |
| **Purpose** | reveal |
| **Question** | Where does fifteen billion dollars actually go? |
| **Reveal** | The final wallet had no owner on any registry. |
| **Emotion** | confusion |
| **Caption mode** | EMPHASIS |
| **Silence** | pre |
| **Audio** | The money went to Dubai, then to a wallet nobody could name. |
```

The beat is now 9 seconds instead of 5 — a reveal needs air. It opens a `?`
stamp, drops the bed, holds a silence before the line, lands a `REVEAL` stamp
with a `boom`, keeps only stressed words on screen, and registers a claim the
payoff can call back to.

Same sentence of narration. Different film.

---

## 11. Pre-flight checklist

Before you render anything longer than a minute:

- [ ] `npm run script:vox` — every beat found, module list reads deliberately
- [ ] Beat 1 has `Purpose: hook`; the last beat has `Purpose: payoff`
- [ ] At least one `Reveal` row per chapter
- [ ] At least one `Emotion` row per sequence, and the arc moves
- [ ] Every `Question` has a reveal within a few beats, or is deliberately left open
- [ ] Beat durations vary — read the list, not the average
- [ ] A chapter every 60–120s
- [ ] Two or three `J-cut` rows
- [ ] `Rest`: either none at all (let the director place them) or yours throughout
- [ ] `npm run director:check` — no ⚠ findings you have not consciously accepted
- [ ] `Data` rows on every numeric module, `Places` on every map, `Source` on every quote

---

## 12. Common mistakes

**Writing the reveal in the narration and not in the row.** The most expensive
mistake in this file. The engine cannot read prose for reveals.

**One `Emotion` row, at the top.** Sequences take the first hint in their run —
one row at the top colours one sequence and leaves the rest on `curiosity`.

**Uniform beat lengths.** Every beat 4–5s. Individually fine, collectively a
metronome.

**Trusting module inference on a finished script.** It exists so a draft renders.
A finished beat states its module.

**`Silence: full` on a talking beat.** Mutes the narration. QC flags it; do not
ship past it.

**Reveals without air.** A `Reveal` row on a 4-second beat fires the stamp at
2.9s with 1.1s left. Reveals want 7 seconds or more.

**Treating the QC score as the goal.** It is a heuristic for finding weak
sections before you spend an hour rendering. A 9.5 with a boring story is a
boring story that passes a checklist.
