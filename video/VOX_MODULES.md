# Vox Module Reference

Fifteen modules. A script never writes JSX — it writes a beat, and
`parse-script.mjs` picks the module from the **Visual** line. Every module reads
the same `script.json` + `voice.json`, so word timing is always locked to the
actual read.

To override the guess, add a `| **Module** | timeline |` row to the beat.

**Nothing here is wired to a particular story.** The engine holds no opinion
about what an episode is about: art direction lives in the script's own
`**Image Prompt:**` rows, the mid-beat reversal in its own `**Turn:**` row,
geography in its own `**Places:**` row. `tools/fixtures/vox-demo.md` is a
second, unrelated script the engine has never seen; `npm run check` parses it
and asserts the routing, so a change that quietly couples the engine to one
episode fails the check rather than the render.

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
| `Icons` | `icon` `trust` | `lucide-name: Label, lucide-name: Label` |
| `Data` | `chart` `compare` `stat` `timeline` `trace` `funnel` | `Label: value, Label: value` |
| `Source` | `quote` | printed under the clipping |
| `Places` | `map` | `Country; Country; Label @ lat,lon` — **semicolons** |
| `Turn` | `trust` | the phrase the collapse lands on |
| `Image Prompt` | `fetch-footage.py` | hand art direction for this beat |
| `Footage` | `fetch-footage.py` | fallback subject terms |
| `Audio` | voice + captions | the actual read |

Every row is optional except `Audio`. A beat that declares none of them still
stages.

---

## The fifteen modules

| Module | Triggered by | Stages |
|---|---|---|
| `kinetic` | *words, headline, phrase* | Hook/payoff. Words fill the page, land as spoken. |
| `doodle` | *circled, underlined, annotated* | Headline over footage + one hand-drawn mark. |
| `footage` | *archival, b-roll, clip, photo* | Full-bleed clip under a headline. |
| `icon` | *step cards, icons* | Mechanism steps, one line icon each. |
| `chart` | *chart, graph, curve, line draws* | Ink line chart drawing left to right. |
| `compare` | *compare, bars, side by side* | Two quantities racing; the gap gets boxed. |
| `stat` | *big number, one number, counts down* | One number alone, rolling. |
| `callout` | *callout, leader line, pointer* | Ring on the frame + leader line to a label. |
| `timeline` | *timeline, year by year, decade by decade* | Events on a true-to-scale axis. |
| `quote` | *quote, clipping, cited, according to* | A torn clipping with a source line. |
| `trace` | *flow, trace, follows the money, node to node* | Money moving along a line, node to node. |
| `trust` | *trust, signals check, verified, looks real* | Trust signals check in, then flip to fake. |
| `funnel` | *funnel, narrows, targets* | Volume as geometry: contacts down to victims. |
| **`map`** | **a `Places` row**, or *map, globe, atlas* | Countries inked, pins dropped, a route drawn. |
| **`collage`** | *collage, montage, scrapbook, photo wall* | Photographs as clippings, screened and tilted. |

Bold = new.

A `Places` row wins outright — a beat that named places is a map whatever its
prose says, because "the money moves to Dubai" reads as a `trace` to the keyword
table and as a map to anyone who has seen the frame.

---

## The two new ones

### `map` — the frame that answers "where"

Geometry is Natural Earth 1:110m (public domain, bundled — no key, no network at
render time). A bare name inks that country in the accent; a name with
coordinates drops a pin. **Two or more pins draw a route between them**, with a
token riding the curve and the destination circled by hand when it arrives.

```markdown
| **Visual** | The region the messages come from. |
| **Places** | Myanmar; Cambodia; Laos |
```

```markdown
| **Visual** | The journey a recruited worker is taken along. |
| **Places** | Bangkok @ 13.75,100.5; Mae Sot @ 16.71,98.57; Myawaddy @ 16.69,98.51 |
```

**Semicolons separate places** — a `lat,lon` pair already owns the comma.
Country names are Natural Earth's common short forms, and an ISO-2 code
(`US`, `IN`, `AE`) works too. An unmatched name is skipped rather than fatal.

The beat opens ~3x wider than its subject and closes on it over the first 72% —
the zoom needs somewhere to zoom *from*. Say *globe* in the Visual or Motion FX
line to get an orthographic globe already rotated to face the subject instead.

Labels de-collide down the page, with a hairline back to their own pin: two
places named in one sentence are often a few kilometres apart, and at that zoom
their labels would otherwise land on top of each other.

### `collage` — photographs as clippings

Two to four frames laid on the page as bordered, tilted, drop-shadowed
clippings, each screened through a printer's halftone so it reads as printed
rather than as video playing behind paper. They arrive one at a time and then
drift at different rates — the difference between the rates is the parallax.

```markdown
| **Visual** | A collage of the place itself. |
| **Image Prompt** | A high fenced perimeter around plain low-rise concrete blocks at dusk... |
| **Motion FX** | The clippings land one at a time, the first one circled. |
```

Three variants per beat, from `fetch-footage.py`. Fewer images on disk means
fewer cards, not a broken frame.

---

## Where pictures come from

The script already says which source it wants — you choose by picking a row:

| Row | Source | Best at | Useless at |
|---|---|---|---|
| `Footage` | **Wikimedia Commons** — no key, 3000–5000px, CC/PD | objects, places, machines, money, documents, transport | app screenshots, modern UI, abstractions |
| `Image Prompt` | **pollinations.ai** — no key, generated | staged editorial compositions, anything abstract | photographic realism (576px cap, one small model) |
| *neither* | mockup tools (`chat-mockup.py`, `transfer-mockup.py`) | chat threads, transfer screens | anything not a UI |

Commons is an encyclopedia, not a stock library — it is excellent on things that
exist and blind to "a TikTok-style video grid". For screen beats, draw the
interface with the mockup tools rather than hunting for a photograph of one.

A `Footage` row that finds nothing usable falls through to the generator rather
than staging an unrelated photograph — Commons will always return *something*,
and a confident wrong picture is worse than a generated one.

**Attribution is not optional.** Photographs are written to
`video/src/credits.json` with artist, licence and source URL. Most of Commons is
CC-BY; paste that file into the video description before publishing.

---

## The three from the first expansion

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
| *circle, circled, circling, ring* | `circle` |
| *freezes, flips to fake, collapses* | `flip` — the `trust` collapse |
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
npm run voice          # TTS (local Chatterbox)
npm run align          # word-level timing -> src/voice.json
npm run footage        # images via pollinations.ai — free, no key
npm run check          # parser contract, both engines, against fixtures
npm run lint           # eslint + tsc
npm run render:vox     # -> out/vox.mp4

npm run episode:vox    # all of the above
```

Every dependency in that chain is free and unmetered: Remotion renders locally,
Chatterbox speaks locally, Whisper aligns locally, the map geometry is public
domain and bundled, and pollinations.ai needs no key.
