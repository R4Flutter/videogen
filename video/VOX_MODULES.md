# Vox Module Reference

Ten modules. A script never writes JSX — it writes a beat, and `parse-script.mjs`
picks the module from the **Visual** line. Every module reads the same
`script.json` + `voice.json`, so word timing is always locked to the actual read.

To override the guess, add a `| **Module** | timeline |` row to the beat.

---

## Beat block shape

```markdown
### BEAT 3 — THE MECHANISM (0:22–0:36)

| Layer | Content |
|---|---|
| **On-screen text** | PAID MINUS PRICES |
| **Visual** | Three step cards on the page, one line icon each. |
| **Icons** | percent: The bank pays 0.4%, shopping-basket: The basket costs 3% more |
| **Audio** | See, inflation is measured on the same basket you actually buy. |
| **Motion FX** | Cards arrive one at a time. |
```

| Row | Read by | Notes |
|---|---|---|
| `On-screen text` | most modules | headline, or the quote body |
| `Visual` | the parser | picks the module |
| `Motion FX` | the parser | picks the mark shape |
| `Icons` | `icon` | `lucide-name: Label, lucide-name: Label` |
| `Data` | `chart` `compare` `stat` `timeline` | `Label: value, Label: value` |
| `Source` | `quote` | printed under the clipping |
| `Footage` | `fetch-footage.py` | Pexels search terms |
| `Audio` | voice + captions | the actual read |

---

## The ten modules

| Module | Triggered by | Stages |
|---|---|---|
| `kinetic` | *words, headline, phrase* | Hook/payoff. Words fill the page, land as spoken. |
| `doodle` | *circled, underlined, annotated* | Headline over footage + one hand-drawn mark. |
| `footage` | *archival, b-roll, clip, photo* | Full-bleed clip under a headline. |
| `icon` | *step cards, icons* | Mechanism steps, one line icon each. |
| `chart` | *chart, graph, curve, line draws* | Ink line chart drawing left to right. |
| `compare` | *compare, bars, side by side* | Two quantities racing; the gap gets boxed. |
| `stat` | *big number, one number, counts down* | One number alone, rolling. |
| **`callout`** | *callout, leader line, pointer* | Ring on the frame + leader line to a label. |
| **`timeline`** | *timeline, year by year, decade by decade* | Events on a true-to-scale axis. |
| **`quote`** | *quote, clipping, cited, according to* | A torn clipping with a source line. |

Bold = new.

---

## The three new ones

### `callout` — point at it, then name it

For "the number they print big is *this* one." Draws a ring on the frame, then
runs a hand-drawn leader line from a label to the ring. Order matters: the eye
gets sent somewhere before it's told what it found.

```markdown
| **On-screen text** | THE RATE THEY PRINT BIG |
| **Visual** | A callout ring on the statement, leader line to the label. |
| **Footage** | bank statement paper closeup |
```

`On-screen text` becomes the label. Works with or without footage — on bare
paper the label needs no card, over a clip it gets one automatically.

### `timeline` — events on an axis

Portrait runs it **down** the page, landscape **across**. A horizontal timeline
in 9:16 gives every label about four characters of room, which isn't a timeline,
it's a row of dots.

**`Data` means something different here:** `value` is the position in time,
`label` is what happened. Positions are true to scale, so an uneven span looks
uneven. The last row takes the accent colour.

```markdown
| **On-screen text** | WHAT $10,000 BOUGHT |
| **Visual** | A timeline down the page, year by year. |
| **Data** | Opened the account: 0, First rate cut: 3, Still sitting there: 10 |
```

### `quote` — somebody else's words

The module that makes a money video citable instead of assertable. A clipping
laid on the page, tilted a degree or two, accent rule down the left.

```markdown
| **On-screen text** | Prices rose 3.0% over the twelve months ending in June. |
| **Visual** | A clipping laid on the page, cited to the agency. |
| **Source** | Bureau of Labor Statistics, CPI |
```

Use this every time you state a figure you didn't compute yourself. It costs
four seconds and it's the difference between a finance channel and a guy
asserting numbers.

---

## Marks

`Motion FX` picks the shape. If it names none, no mark is drawn — except on
`doodle`, which always marks.

| Say | Get |
|---|---|
| *highlights, marker, swipes over* | **`highlight`** — translucent marker band, multiply blend |
| *circles, ring* | `circle` |
| *box, rectangle, frame* | `box` |
| *arrow, points at* | `arrow` |
| *strikes, crosses out* | `strike` |
| (nothing named) | `underline` where a mark is required |

The highlighter multiplies rather than covers — real marker ink darkens what's
under it and leaves the letterforms showing. That's why it reads as highlighter
and not as a coloured rectangle sitting on the type.

**One mark per frame.** Two is a mess.

---

## Turns

Beats no longer hard-cut. Each beat is held open `TURN` frames (9, in
`VoxShort.tsx`) past its own end, so the outgoing page lifts and clears while
the incoming one rises into place — the frame is never empty.

The move is small on purpose. A page that slides its full height reads as a
slideshow transition; a page that shifts 3% reads as paper being moved, which
is the only thing this engine is pretending to be.

The final beat doesn't fade. Fading the payoff out throws away the line the
whole video was built to land.

Modules still animate against their own `dur` and know nothing about the turn.

---

## Motion

What moves, and how much. The rule is that the hook carries weight and
everything after it stays calm — restraint everywhere is just flatness.

| Element | Motion | Why |
|---|---|---|
| Hero words | spring, **overshoots to 1.06 and settles by frame 16** | Weight in the first second is the whole job |
| Caption words | spring, no overshoot, settled by frame 11 | A bouncing caption pulls the eye off the frame it explains |
| Numbers & `$` `%` | always accent, in both modes | In money writing the number *is* the stressed word |
| Icon cards | wipe in left→right (`clip-path`) | A card that fades looks like it's loading; one that wipes looks laid down |
| Chart head | rides the line continuously, value interpolates with it | It used to hop vertex to vertex |
| Page layers | gradient, guides and grain drift at 1 : 0.35 : 1 | The rate difference is what gives the page depth |
| Beat turns | 9-frame overlap, 3% lift | Paper being moved, not a slide transition |

`STRESS` in `vox/elements.tsx` is the emphasis pattern — `/[\d$%]/`. Pass a
different `emphasis` regex to `KineticText` to override it per beat.

---

## Running it

```
npm run script:vox     # script_vox.md -> src/script.json
npm run voice          # TTS
npm run align          # word-level timing -> src/voice.json
npm run footage        # Pexels clips (needs PEXELS_API_KEY)
npm run lint           # eslint + tsc
npm run render:vox     # -> out/vox.mp4

npm run episode:vox    # all of the above
```
