# VOX STYLE ENGINE — The Second Vocabulary

The crime engine stages a room at night. The scam engine stages a friend at a
coffee table. This engine stages **a printed page** — the Vox editorial look:
off-white paper, ink type, one orange accent, hand-drawn annotations, and
words that land as they are spoken. It is not a new pipeline. It is a second
vocabulary + one staging component (`VoxShort.tsx`) that consumes the same
`script.json` + `voice.json` every other engine reads, so the crime and scam
engines stay untouched and all three render from the same episode file.

The lane this engine is built for: **the 60–90 second Vox-style explainer**
(the white space — Coffeezilla and Vox itself are long-form, nobody owns the
short). Scam mechanics, money mechanics, "how the thing actually works" —
paper-and-ink is the visual that lets you say it without showing it.

---

## PART 0 — TWO FORKS, ONE COMPONENT

| | A. Vox shorts | B. Vox essays |
|---|---|---|
| Aspect | 9:16 (1080×1920) | 16:9 (1920×1080) |
| When | every episode, the default | phase-4 toggle |
| How | script.json writes `width`/`height` from the script's `**Format:**` line | `VoxEssay` composition, fixed 1920×1080 |

`VoxShort.tsx` sizes every element off the canvas (`useMargin` in
`vox/scenes.tsx`), never off constants, so the same component stages both
without a branch. Portraits run the timeline down the page; landscapes run it
across. Build A first — same canvas as everything else, zero risk.

---

## PART 1 — RETENTION RULES (the script layer)

A vox video dies in the first three seconds or it survives. These rules are
enforced at the **script** level, in `script.md`, before a single frame is
rendered — the engine will happily render slop, so the style is a writing
discipline, not a renderer feature.

### The hook

- **Under 15 words.** If the first beat's narration needs more, the idea isn't
  hooked yet.
- **Start mid-action.** No greeting, no "So", no "In this video". The first
  word should be the one you'd use to interrupt a conversation.
- **Visually verifiable.** The hook frame must show what the hook claims —
  words fill the page as they're spoken (`kinetic`), or a clip plus one
  hand-drawn mark (`doodle`).
- **A number beats a claim.** The stressed word in this engine is the number
  (`STRESS = /[\d$%]/`). If the hook has no number, find the number.

### Forbidden patterns (instant fail)

- **Three-word loops** — "It's fast. It's easy. It's effective."
- **Rhetorical lists** — "Price? High. Quality? Low."
- **Meta-commentary** — "Let's dive in," "In this video," "But here's the twist."
- **Hype adjectives** — mind-blowing, insane, game-changing.
- **Fake scenarios** — "Imagine you're walking down the street..."

### Required flow

- **The connector.** "See," "Meaning," "Therefore" — glue sentences together;
  every claim must be tied to the one before it.
- **The contrast.** "Most [X] do Y. But [this] does Z." — the argument of an
  explainer in one sentence, and `compare` is the frame it gets drawn on.
- **The mechanism.** Explain *how* it works, never that it works. The
  mechanism is the content. If the script has no mechanism, it has no video.

### Structures

**The punchy (30–45s, broad appeal):** The Slap (0–3s, pattern interrupt) →
The Context (3–8s, "See," + stakes) → The Insight (8–35s, the one mechanism,
no tangents) → The Callback (35–45s, reframe the hook or loop back to word one).

**The deep dive (60s, technical):** The Claim (0–5s) → The Status Quo (5–15s,
"most people do X") → The Pivot (15–20s, "but X does Y") → The Mechanism
(20–45s, "meaning...") → The Escalation (45–55s) → The Payoff (55–60s, the
final insight).

These map 1:1 onto modules — beat 1 is `kinetic` (the hook words slam in),
the pivot is `doodle` (the phrase that turns the argument, circled by hand),
the mechanism is `icon` (step cards) or `chart`, the escalation is `compare`
or `stat`, the payoff is `kinetic` again.

### Metadata (from `**Caption Hook:**` in the script header)

The caption's first line is a **second hook**, not a summary. The thumbnail
text is max four words, high contrast (e.g. "PAID MINUS PRICES"). Three to
five broad keywords tag the algorithm. `parse-script.mjs` lifts the caption
hook into `script.json` automatically.

---

## PART 2 — THE PIPELINE

```
script.md ──parse-script.mjs──▶ script.json (+ voice.json stub)
                                   │
                 voice.py ──TTS──▶ beat .wav files (the Vox narrator: steady,
                                   deliberate, lower energy than the scam read)
                                   │
                 align.py ────────▶ voice.json word-level timings
                                   │
                 fetch-footage.py ▶ public/footage/* (Pexels, per-beat, idempotent)
                                   │
                                   ▼
                          VoxShort.tsx ──▶ out/vox.mp4
```

A script becomes a vox video when its header says `**Style:** Vox deep dive`
(or any line with the word "vox"). `parse-script.mjs` detects it, emits
`engine: "vox"` plus the vox-only beat fields (`text`, `shape`, `icons`,
`data`, `source`, `footage`), and everything downstream — voice, align, sfx,
camera — reads the same file and doesn't know the vocabulary changed.

---

## PART 3 — THE PALETTE (`theme.ts` → `theme.vox`)

```
paper:      #F4F1EA   off-white page
paperDeep:  #E4DED1   page edge, vignette falloff
ink:        #1A1A1A   body type
accent:     #D9491E   vox orange — the one colour that means "look here"
muted:      #8A857C   secondary text, source lines
rule:       #C9C2B4   printer's guides, card borders
font:       Archivo (400/700/800, latin only) → Bahnschrift → Segoe UI
```

Grammar: **restraint is the look.** Accent is a verb — it underlines, circles,
draws, points — and a colour used for decoration breaks the grammar. Numbers
and `$` `%` are always accent, in both hero and caption modes: in money
writing the number *is* the stressed word.

Archivo is loaded by `vox/elements.tsx` via `@remotion/google-fonts` (three
weights, latin only — the full family is 50+ requests per frame batch). If
the font server is unreachable the stack falls through to a local grotesk and
the render still runs.

---

## PART 4 — THE VOCABULARY (`vox/elements.tsx`, the Vox Kit)

| Element | What it is | The rule |
|---|---|---|
| `PaperBG` | the page: grain, warm centre, printer's guides | three layers drift at 1 : 0.35 : 1 — the rate difference is the only depth the page has |
| `Kicker` | small uppercase editorial tag in accent | the thing that makes a frame read as a page, not a slide |
| `KineticText` | words land as spoken, timed to `voice.json` | hero overshoots to 1.06 and settles by frame 16; captions settle by frame 11 with no overshoot |
| `DrawIn` | roughjs hand-drawn marks | deterministic seeded jitter — a mark must land in the same place every frame or it boils |
| `Marker` | highlighter band | multiplies rather than covers — real marker ink darkens what's under it |
| `Leader` | elbow leader line | two strokes: elbow first, then the point — the way a hand points |
| `Clipping` | a torn clipping with a source line | tilted a degree or two; nothing placed by hand is square |
| `Halftone` | a printer's dot screen over a photograph | a CSS dot grid, not an SVG filter — `feImage` re-rasterises every frame |
| `LineIcon` | lucide thin-stroke icon, 1.5 stroke | an unknown name draws a circle — a script typo must not cost a render |
| `InkChart` | line drawn in ink | straight segments only — a smoothed curve invents values |
| `ArchivalBG` | Pexels clip, graded `saturate(0.5) contrast(1.08) brightness(0.96)`, paper wash, vignette, grain | no clip downloaded yet → the beat still stages as a paper page, the honest fallback |

---

## PART 5 — THE MODULES (`vox/scenes.tsx` → `VOX_MODULES`)

Ten modules, one per beat, picked by `parse-script.mjs` from the **Visual**
line (override with a `| **Module** | timeline |` row). A script never writes
JSX — it writes a beat.

| Module | Triggered by | Stages |
|---|---|---|
| `kinetic` | words, headline, phrase | the hook/payoff — words fill the page, land as spoken |
| `doodle` | circled, underlined, annotated | headline over footage + one hand-drawn mark |
| `footage` | archival, b-roll, clip, photo | full-bleed clip under a headline |
| `icon` | step cards, icons | mechanism steps, one line icon each |
| `chart` | chart, graph, curve, line draws | ink line chart drawing left to right |
| `compare` | compare, bars, side by side | two quantities racing; the gap gets boxed |
| `stat` | big number, one number, counts down | one number alone, rolling digit by digit |
| `callout` | callout, leader line, pointer | ring on the frame + leader line to a label |
| `timeline` | timeline, year by year | events on a true-to-scale axis, down in portrait, across in landscape |
| `quote` | quote, clipping, cited, according to | a torn clipping with a source line |
| `trace` | flow, trace, follows the money | money moving node to node along a line |
| `trust` | trust, signals check, verified | trust signals check in, then flip to fake |
| `funnel` | funnel, narrows, targets | volume as geometry, contacts down to victims |
| `map` | **a `Places` row**, or map/globe/atlas | countries inked, pins dropped, a route drawn |
| `collage` | collage, montage, scrapbook | photographs as halftone clippings on the page |

`ARCHIVAL = {doodle, footage, callout}` — these fill and darken the frame, so
the caption track draws a paper card behind the words to keep them legible.

### Marks

`Motion FX` picks the shape: highlight → marker band (multiply), circle, box,
arrow, strike. Default where a mark is required: underline. **One mark per
frame — two is a mess.**

### Turns

Beats don't hard-cut. Each is held open 9 frames past its own end while the
next rises into place, a 3% page lift — a page being moved, not a slideshow
transition. **The final beat doesn't fade**: fading the payoff throws away
the line the whole video was built to land.

---

## PART 6 — MOTION

| Element | Motion | Why |
|---|---|---|
| Hero words | spring, overshoots to 1.06, settles by frame 16 | weight in the first second is the whole job |
| Caption words | spring, no overshoot, settled by frame 11 | a bouncing caption pulls the eye off the frame it explains |
| Numbers & `$` `%` | always accent, both modes | in money writing the number is the stressed word |
| Icon cards | wipe in left→right (`clip-path`) | a card that fades loads; one that wipes gets laid down |
| Chart head | rides the line continuously, value interpolates with it | it used to hop vertex to vertex |
| Page layers | gradient, guides, grain drift at 1 : 0.35 : 1 | the rate difference is the depth |
| Camera | per-module drift 1.0 → 1.02–1.06, no shake | a shaking page reads as a mistake |
| Beat turns | 9-frame overlap, 3% lift | paper moved, not a slide |
| Music bed | swells into the closing beat, not onto a word | the essay lands on its closing statement |

---

## PART 7 — WRITING A VOX SCRIPT

```markdown
# WHY YOUR SAVINGS ACCOUNT IS SHRINKING

**Style:** Vox deep dive
**Format:** portrait
**Caption Hook:** Your bank pays 0.4%. The basket costs 3% more. Here's the gap.
**Keywords:** inflation, savings, banking, CPI

### BEAT 1 — THE HOOK (0:00–0:05)

| Layer | Content |
|---|---|
| **On-screen text** | THE RATE THEY PRINT BIG |
| **Visual** | Words fill the page as they're spoken. |
| **Audio** | Your bank pays you 0.4 percent. It charges you 23. |

### BEAT 2 — THE MECHANISM (0:05–0:18)

| Layer | Content |
|---|---|
| **On-screen text** | PAID MINUS PRICES |
| **Visual** | Three step cards on the page, one line icon each. |
| **Icons** | percent: The bank pays 0.4%, shopping-basket: The basket costs 3% more |
| **Motion FX** | Cards arrive one at a time. |
| **Audio** | See, inflation is measured on the same basket you actually buy. Meaning your money is losing value. |
```

Rows are all optional except `Audio` (a beat with no narration stages, but a
video with no narration isn't a video). `Data` feeds `chart`/`compare`/`stat`/
`timeline`/`trace`/`funnel` as `Label: value` pairs. `Source` prints under a
`quote` — use it every time you state a figure you didn't compute yourself; a
cite costs four seconds and is the difference between an explainer and a guy
asserting numbers. `Footage` gives `fetch-footage.py` its subject terms.

Four rows exist so that **nothing about an episode lives in the engine**:

| Row | Carries | Instead of |
|---|---|---|
| `Places` | `Bangkok @ 13.75,100.5; Myanmar` | a geography table in the renderer |
| `Image Prompt` | this beat's art direction, in full | `vox_prompts.py`, keyed by beat number |
| `Turn` | the phrase a `trust` collapse lands on | the engine hunting the word "real" |
| `Module` | an explicit module name | arguing with the keyword table |

`**Image Prompt:**` is the important one. Hand art direction used to live in
`tools/vox_prompts.py` as `{beat_number: prompt}`, which meant the previous
documentary's beat 2 was painted onto every new story's beat 2, silently and
with no error. That table now declares `CURATED_FOR = "story.txt"` and only
unlocks for the script it was written against; every other story art-directs in
its own beats. `tools/fixtures/vox-demo.md` is an unrelated script kept as the
proof — `npm run check` parses it and asserts the routing.

The `## 4. TEXT TIMING TABLE` and `## 5. SOUND DESIGN` sections are optional —
the overlay and sfx tracks from the finance era still parse, and the renderer
reads them defensively.

---

## PART 8 — RUNNING IT

```
npm run script:vox     # script_vox.md -> src/script.json (+ voice.json stub)
npm run voice          # TTS (Vox narrator: steady, deliberate)
npm run align          # word-level timing -> src/voice.json
npm run footage        # images via pollinations.ai — free, no key
npm run check          # parser contract, both engines, against fixtures
npm run lint           # eslint + tsc
npm run render:vox     # -> out/vox.mp4
npm run render:vox:essay   # -> out/vox-essay.mp4 (16:9)

npm run episode:vox    # all of the above
```

---

## PART 9 — HOUSE RULES (the grammar, restated)

1. **A colour means one thing.** Accent points; it doesn't decorate.
2. **One mark per frame.** Two is a mess.
3. **The hook carries weight; everything after stays calm.** Restraint
   everywhere is just flatness.
4. **The number is the stress.** `STRESS = /[\d$%]/` — the engine agrees.
5. **Cite what you didn't compute.** The quote module exists for it.
6. **The mechanism is the content.** If the script can't say how it works,
   it has no video.
