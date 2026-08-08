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

**You make them.** The pipeline does not generate images.

```
npm run prompts    # -> video/prompts/ (10 prompts per file)   prompts only, nothing else
                   # -> prompts/files.txt   which prompt becomes which file
npm run footage -- --import <folder>   # numbered batch output -> slot names
npm run footage                        # scan the folder, rebuild the manifest
```

`video/prompts/` holds `01.md`, `02.md`, … — **ten prompts to a file**, and
**prompts and nothing else**: a prompt, its negative on the next line, a blank
line, the next block. No headings, no filenames, no prose — a block is pasted
straight into a generator, and anything sitting above a prompt gets pasted in
with it.

```
<prompt 1>
Negative prompt: <negative>

<prompt 2>
Negative prompt: <negative>
```

Three framings are written per beat — establishing, detail, context — and the
engine cross-fades through all three across the beat, so a beat that holds for
eight seconds is three moves rather than one still.

Which prompt fills which slot is in `prompts/files.txt`, in the same order, so
save the generated images into `video/public/footage/` under these names:

```
1  beat-2.jpg        beat 2 THE PIVOT (establishing)
2  beat-2-2.jpg      beat 2 THE PIVOT (detail)
3  beat-2-3.jpg      beat 2 THE PIVOT (context)
```

`npm run footage -- --import <folder>` does that mapping for you: it reads the
index, takes the numbered files in order, and copies them into
`public/footage/` under the right slot names.

Both files regenerate from the script every run, so they are never out of step
with the beats. Beats that need no photograph are printed to the console, not
written into either file.

Three framings per beat — establishing, detail, context — because a collage of
three near-identical photographs is one photograph printed three times.

| Row on the beat | What the sheet does |
|---|---|
| `Image Prompt` | uses your art direction **as written** — its palette and framing win, and only a reframe line is added for slots 2 and 3 |
| `Footage` | builds a full prompt around that subject in the house style |
| *neither, but a photo module* | builds one from the `Visual` line, direction stripped |

Beats that need no photograph are listed at the end of the sheet with what they
stage instead, so "this beat draws itself" is never confused with "this beat was
skipped".

### Optional: real photographs instead

`npm run footage -- --commons` fills any **still-empty** slot that has a
`Footage` row from Wikimedia Commons — no key, no signup, 3000–5000px, CC/PD. It
never overwrites a file you put there. Commons is an encyclopedia rather than a
stock library: excellent on objects, places, machines and documents, blind to
app screenshots. For screen beats use the mockup tools (`chat-mockup.py`,
`transfer-mockup.py`), which draw the interface instead of hunting for a photo of
one.

**Attribution is not optional.** Anything taken from Commons is written to
`video/src/credits.json` with artist, licence and source URL. Most of Commons is
CC-BY; paste that file into the video description before publishing.

Generation used to run here through pollinations.ai and was removed: their free
tier now serves one small model and caps output at 576×1024 whatever you ask
for, which is an upscale on a 1080-wide card.

### How a still is staged (and why it used to just zoom)

A **clip** and a **still** are not the same frame and no longer take the same
path. `isClip()` decides, on the file extension, and `ArchivalBG` dispatches:

| | Clip (`.mp4`) | Still (`.jpg` / `.png`) |
|---|---|---|
| Stages as | full-bleed `cover`, graded, vignetted | `EditorialStill` — a plate on the page |
| The page | covered | visible, and still the brand |
| Type | white, shadowed, centred | ink, in the zone the prompt sheet reserved |
| Motion | pan + 1.16 → 1.02 | three planes translating, **no scale at all** |

Everything used to go down the left column, and that is the whole reason a
generated image rendered as a slow zoom:

1. `VoxShort.tsx` gave the beat a page-wide camera ramp **and** `ArchivalBG`
   ran its own 1.16 → 1.02 inside it. Two zooms multiply. The picture modules
   are on `[1.0, 1.0]` now, alongside `trace`/`trust`/`funnel`/`map`.
2. A flat rectangle has nothing behind it to move against, so drift on it is a
   camera move by definition. `EditorialStill` puts the paper on a far plane,
   a printer's rule on a middle one and the picture on the near one, moving at
   1 : 0.38 : 0.12 — and the headline counter-moves at −0.34. The depth is the
   rate difference, exactly as `PaperBG` has always worked.
3. `cover` cropped away the negative space the prompt sheet had just finished
   reserving for type, and the wash and vignette buried the paper.
4. With `footage.json` empty — the state a slot is in until its file is named
   correctly — the old path staged the beat as a *zooming vignette*. So a
   missing picture and a badly-staged one looked identical. An empty slot now
   stays a bare page.

**The free cut-out.** The generated ground *is* the page colour, because the
style line says so. A `.jpg` is composited with `mix-blend-mode: darken`, which
keeps whichever of picture and page is darker — so the ground disappears into
the paper with no preprocessing at all. It holds on a flat ground and leaves a
faint haze where the generator shaded one.

```
npm run plate      # beat-N.jpg -> beat-N.png, ground alpha-keyed
npm run footage    # rebuild the manifest so the .png is picked up
```

`tools/plate.py` is the real version: it floods the ground from the borders,
writes a transparent PNG, and refuses the job rather than guessing when the cut
takes under 4% or over 93% of the frame. A `.png` is composited with no blend,
so it can overlap anything. Optional — `darken` is the default for a reason.

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
npm run prompts        # -> video/prompts/ (10 prompts per file), one prompt per image slot
npm run voice          # TTS (local Chatterbox)
npm run align          # word-level timing -> src/voice.json
npm run footage        # scan public/footage, rebuild the manifest
npm run check          # parser + prompt-sheet contract, both engines
npm run lint           # eslint + tsc
npm run render:vox     # -> out/vox.mp4

npm run episode:vox    # all of the above
```

`episode:vox` runs straight through, so the first pass renders with whatever
imagery is already on disk. Generate from `video/prompts/`, drop the files in,
and run it again — `npm run footage` picks them up and nothing else changes.

Every dependency in that chain is free and unmetered: Remotion renders locally,
Chatterbox speaks locally, Whisper aligns locally, and the map geometry is
public domain and bundled. The only step that leaves the machine is the optional
`--commons` fetch.
