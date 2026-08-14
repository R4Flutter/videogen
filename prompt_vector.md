# Prompt Vector — 54-Scene Fix for "The Company That Sells You Nothing"

**Goal:** replace every childish/gray/rectangular scene in `video/out/vectors-v2/company-sells-nothing-storyboard.html` with an original editorial vector PNG that reads premium and viral.

**How to use:** one prompt per scene. Append the **MASTER STYLE LOCK** (Part 2) verbatim to every prompt — it is what keeps all 54 scenes visually coherent and on-brand. Each prompt targets ONE hero object, engine-safe composition (no baked text/faces/logos — the mcd engine renders all type over the art), and ken-burns-friendly negative space.

---

## Part 1 — The Viral Standard (analysis against viral channels)

What the top financial-story channels (MagnatesMedia, Johnny Harris, Vox BorderLab, Veritasium) do that the current storyboard does NOT:

| Viral channel habit | Current storyboard problem | Fix in prompts |
|---|---|---|
| ONE hero object, 65–75% of frame | 4–6 small gray tiles of equal weight | Every prompt names exactly ONE hero + max 2 supports |
| Cream/paper + ink + ONE accent only | multi-color tiles (purple/gold/green/blue competing) | 70% cream / 20% ink / 10% one accent per scene |
| Isolated objects on open space (ken-burns pan/zoom friendly) | elements butted edge-to-edge, no breathing room | "isolated on open cream paper, left third empty" |
| Dimensionality via overlapping flat shapes, not gradients | flat single-color rectangles with text as the art | layered flat shapes, offset silhouettes, cast-shadow strips |
| Information density via REPETITION (rows/grids of one object) | scattered different objects | "repeated rows of X, one highlighted" |
| Moment-of-beat scenes (black frames) for pacing | every scene same cream density | black-field scenes at beats (13, 26, 49, 50, 52, 54) |
| No text/numbers inside art (type lives on top) | wordmarks/signs drawn in art | "no letters, no numbers, no words, no logos, no faces" |

Benchmark anchors (from `C:\Users\naikr\yt_scrapper\reports\benchmarks.json`): hook must land <10s (scene 1–2 are the hook), retention falls after scene 3 — so scenes 3–8 must be the most information-dense; the final 3 scenes re-hook for rewatches.

---

## Part 2 — MASTER STYLE LOCK (append to every prompt)

```
Flat editorial vector illustration, 1920x1080, Vox documentary style.
70% warm cream paper background (#F4F1EA), 20% charcoal ink shapes (#1A1A1A),
10% single accent color. Flat shapes only — no gradients, no texture, no 3D.
ONE hero object fills 65-75% of the frame, max two supporting elements.
Objects isolated on open cream paper, left third of frame empty for type.
Thick crisp ink outlines, soft offset cast shadows as flat strips.
No letters, no numbers, no words, no labels, no logos, no faces, no hands.
Editorial, minimal, premium, calm negative space.
```

Accent assignments (keep per scene): green `#16A34A` = money/truth; gold `#F5C518` = subscription/trap; ink `#1A1A1A` = law/breakage; black-field scenes are 100% ink field with a single gold/cream element.

---

## Part 3 — The 54 Prompts

### ACT 1 — THE HOOK (scenes 1–2)

**01 · Empty gym**
> Problem: gray rectangle rows read as "placeholder."
> Prompt: Wide empty gymnasium interior, endless parallel rows of modern exercise machines (treadmills, ellipticals, stationary bikes) receding to the back wall, fluorescent light bars glowing faintly along the ceiling, one mirror wall reflecting the emptiness, a single distant silhouetted figure walking out through a far exit door, vast open foreground floor in cream paper, machines in charcoal ink with thin cream outlines, green accent on one lone machine's display.

**02 · The arithmetic**
> Problem: tiles + text = no art.
> Prompt: A giant charcoal fountain pen nib hovering above a cream paper receipt, the pen drawing a long flat cost line across the paper, beside it a small stack of gold coins that stops halfway up the line, the gap between coin stack and line end emphasized by a thin gold dashed connector, isolated on open cream paper, left third empty, green accent on the coin stack base.

### ACT 2 — THE MACHINE (scenes 3–23)

**03 · The gap**
> Problem: "two rectangles" is not art.
> Prompt: Two flat door frames side by side on cream paper, left frame narrow and short (4% of wall), right frame tall and wide (10% of wall), each frame with a thin ink border and a small step beneath, a measuring arrow spanning the difference between their widths, isolated, left third empty, gold accent on the taller frame's top edge.

**04 · 4% vs 10%**
> Problem: grid of plain dots is childish.
> Prompt: Two dense grids of identical charcoal stick figures on cream paper, left grid of one hundred figures with exactly four tinted gold, right grid of one hundred figures with exactly ten tinted gold, a thin ink dividing line between the grids, figures are simple rounded silhouettes with no faces, gold accent on the tinted figures only.

**05 · It's the product**
> Problem: box on shelf = boring.
> Prompt: A single modern treadmill isolated on a round cream museum pedestal, a soft overhead spotlight cone from the top edge, a thin velvet rope barrier in front of the pedestal, vast cream negative space around it, charcoal ink treadmill with cream tread, green accent on the small museum placard stand beside the pedestal.

**06 · Bank statement**
> Problem: plain paper strip.
> Prompt: A long cream paper receipt unfurling diagonally across the frame, rows of tiny ink line-items on it, three consecutive rows highlighted by a gold marker swipe, a charcoal pen nib resting at the highlighted rows, receipt curled at the bottom edge, left third empty.

**07 · $86 → $219**
> Problem: two text prices = no art.
> Prompt: Two columns of gold coins on cream paper, left column short with a thin ink price tag leaning against it, right column more than twice as tall with a taller ink price tag, a long ink arrow arcing from left tag to right tag, coins are flat circles with simple rim, green accent on the left column's top coin.

**08 · Free-trial checkout**
> Problem: checkout card with buttons is generic.
> Prompt: A giant cream checkout card tilted slightly on cream paper, on it one enormous green button shape and one tiny charcoal "dismiss" link far below it, the green button casting a long flat shadow, a charcoal mouse cursor hovering above the tiny link, left third empty, gold accent on the card's corner fold.

**09 · Cost structure**
> Problem: flat line + blocks is abstract.
> Prompt: A long flat charcoal cost line running horizontally across cream paper, above it a staircase of flat gold blocks climbing step by step higher, the blocks offset from the line by a thin dashed connector, only three gold blocks, rest ink outline, left third empty.

**10 · Cost-to-serve spike**
> Problem: spike line needs more art.
> Prompt: A long flat charcoal line across cream paper that suddenly shoots almost vertically upward like a thin tower, the spike casting a small shadow, at the base of the spike a tiny single gold coin about to be consumed, isolated, left third empty.

**11 · Ideal customer**
> Problem: open door is too literal.
> Prompt: A heavy cream gym door propped open wide, light spilling from inside as a flat gold wedge, a single charcoal gym membership card lying on the floor just inside the doorway, the rest of the frame is dark ink negative space, green accent on the membership card's corner.

**12 · Google Trends**
> Problem: yearly rows need visual mass.
> Prompt: Four horizontal rows of flat charcoal blocks on cream paper, each row a different year (rows grow slightly longer left-to-right), every row has the same pattern: a short climbing slope then a long flat plateau, the final row's plateau is the longest, a thin gold underline beneath the last plateau, isolated, left third empty.

**13 · BREAKAGE (black beat)**
> Problem: black frame needs an object.
> Prompt: Pure black field, a single thick cream paper shard breaking away from the top corner and falling diagonally, small black fragments trailing it, a thin gold crack line running along the break, only cream and gold on black.

**14 · Gift card → subscription**
> Problem: card vs slivers is weak.
> Prompt: A single flat gift card standing upright on cream paper with a ribbon bow on top, beneath it a long train of identical thin gold slivers marching off to the right like dominoes, each sliver identical and repeating, left third empty, green accent on the ribbon.

**15 · Calendar of charges**
> Problem: calendar grid, same cell — needs the repeating highlight.
> Prompt: A cream wall calendar with a simple ink grid, four rows of weeks, in every row the same single day cell marked with a thick gold outline and a small gold dot, a charcoal finger pointing at the highlighted column, calendar isolated on cream paper, left third empty.

**16 · Bally contract**
> Problem: tall paper is plain.
> Prompt: An extra-tall cream contract sheet standing upright like a monolith, dozens of thin ink text lines on it, near the bottom a large empty ink signature line, beneath the signature line a block of tiny gray fine-print lines compressed together, gold accent on the signature line, isolated on cream paper.

**17 · Clippings / complaints**
> Problem: overlapping clippings need weight.
> Prompt: Three overlapping cream newspaper clippings scattered like a fan on cream paper, each clipping has dense ink text blocks and one headline block with no letters, the middle clipping slightly larger and rotated straight, a gold paperclip holding the stack at the corner, left third empty.

**18 · Wrong tool**
> Problem: hammer + puzzle piece mismatch is good — keep one accent.
> Prompt: A heavy charcoal sledgehammer laid flat on cream paper, beside it a small gold jigsaw puzzle piece that clearly does not fit the hammer's shape, a thin gold question mark shape floating above the puzzle piece (no letters), isolated, left third empty.

**19 · Planet Fitness storefront**
> Problem: new facade is okay but tiles compete.
> Prompt: A flat storefront facade on cream paper, one wide window and a door, above them a scalloped awning striped in only two tones (purple and gold, desaturated to sit under ink), the window glowing warm cream, a single charcoal bench outside, left third empty, gold accent on the awning trim.

**20 · $10 among noise**
> Problem: gray coins need the single green hero.
> Prompt: A wide sea of identical flat charcoal coins scattered loosely across cream paper, one single green coin among them near center-right, the green coin casting a small gold glow, vast open cream space on the left, charcoal coins recede in size toward edges.

**21 · $10/mo vs $120/yr**
> Problem: split-screen needs one hero.
> Prompt: Left half: a single thin gold coin standing on edge. Right half: a tall thin charcoal column made of stacked identical coin slivers. A thin ink dividing line between halves, both isolated on cream paper, green accent on a tiny flag atop the right column.

**22 · Boxed CS6**
> Problem: box is now detailed — remove text from art.
> Prompt: A gold software box standing upright on cream paper, tilted slightly, shrink-wrap sheen as a flat white wedge across the box, a black circular disc leaning against the box's base, a thin paper sleeve with a barcode stripe (no actual letters) beside the box, ink outline, left third empty.

**23 · Revenue sawtooth**
> Problem: sawtooth of blocks is good — enlarge hero.
> Prompt: A single towering sawtooth ridge made of flat charcoal blocks on cream paper, each tooth identical height, the ridge casting a long flat shadow to the right, one gold block inserted at the base of the last tooth, isolated, left third empty.

### ACT 3 — THE MOMENT (scenes 24–30)

**24 · Adobe MAX 2013**
> Problem: stage now exists — add scale.
> Prompt: A wide conference stage on cream paper, a single speaker silhouette behind a podium on a flat platform, two wide cream light cones from the top corners converging on the stage, rows of tiny charcoal audience heads receding to the back, one gold spotlight on the podium, vast cream ceiling space.

**25 · The reaction**
> Problem: comment threads need one hero.
> Prompt: Three vertical cream paper comment cards floating on cream paper, each with dense ink text lines and a small avatar circle with no face, the middle card slightly larger and rotated straight, a gold upvote arrow beside the middle card, left third empty.

**26 · Beat of black**
> Problem: keep minimal.
> Prompt: Pure black field, one thin horizontal gold line running across the exact center, nothing else, the line slightly thicker at the left end, photographic grade, no grain.

**27 · Sawtooth → exponential**
> Problem: two charts need a narrative arc.
> Prompt: Left two-thirds of cream paper: a flat sawtooth ridge of charcoal blocks. Right one-third: a single smooth gold exponential curve rising steeply off the page edge. A thin ink arrow spanning from sawtooth to curve, isolated, left third empty.

**28 · $1.23B → $18.28B**
> Problem: two monoliths need proportion.
> Prompt: Two flat charcoal monolith blocks on cream paper, left block small (knee height), right block enormous (filling 75% of frame height), both with simple ink texture lines, the right block casting a long shadow, a tiny gold coin at the left block's base for scale, left third empty.

**29 · Boardroom chart**
> Problem: boardroom chairs now exist — put hero on screen.
> Prompt: A dark boardroom interior, a large blank cream screen on the wall, a single thin gold rising line crossing the blank screen, three charcoal chair silhouettes in the foreground facing the screen, the rest of the frame in ink darkness, no faces.

**30 · Cable → Netflix**
> Problem: three objects; make envelope the hero.
> Prompt: A giant cream paper envelope standing upright with a torn corner, spilling a single thin black cable from its top edge, at the envelope's base a small flat cream TV screen showing a single gold play triangle (no letters), isolated on cream paper, left third empty.

### ACT 4 — THE INDUSTRY (scenes 31–37)

**31 · Streaming launches**
> Problem: 8 brand tiles — make them abstract tiles, not logos.
> Prompt: A neat 4-by-2 grid of identical flat cream tiles on cream paper, each tile with a simple geometric glyph (circle, square, triangle, arc, star, diamond, hexagon, wave — no letters, no logos), all tiles charcoal outline, one tile center-left filled solid gold, left third empty.

**32 · Household stack**
> Problem: stacked tiles are good — add weight.
> Prompt: A vertical stack of flat cream tiles on cream paper, eight tiles stacked perfectly, the stack tilting slightly, a thick gold underline beneath the bottom tile, the top tile slightly smaller (newest), isolated, left third empty.

**33 · Two bills, one total**
> Problem: side-by-side bills need the combined bill hero.
> Prompt: Two cream paper bills standing upright side by side on cream paper, between them a third taller combined bill with a thick gold seal on it, the two side bills leaning inward against the middle one, isolated, left third empty.

**34 · Streamflation**
> Problem: six tags on stairs — one hero.
> Prompt: A short staircase of four flat gold steps on cream paper, on each step a small cream price tag shape (no numbers), the top step's tag slightly larger and outlined in ink, a charcoal hand (no fingers detail) placing the top tag, left third empty.

**35 · $/mo everywhere**
> Problem: four objects — one hero is the badge.
> Prompt: Four small flat charcoal silhouettes arranged in a loose arc on cream paper: a car, a printer, a doorbell, a thermostat, each with a small identical gold badge pinned to it, the badges all the same size, the car silhouette slightly larger, left third empty.

**36 · Prime signup**
> Problem: button art — keep the big yellow.
> Prompt: A giant flat yellow button shape on cream paper with a thick ink outline, a single charcoal mouse cursor hovering above it, far below a tiny thin charcoal link line, the yellow button casting a long flat shadow, left third empty.

**37 · Dark pattern**
> Problem: big green door / tiny gray door is the key scene.
> Prompt: Two doors on a cream wall: one enormous green door open wide with light spilling out, one tiny gray door closed at the wall's base, a charcoal arrow pointing from the big door down to the small door, isolated, left third empty.

### ACT 5 — THE LITIGATION (scenes 38–50)

**38 · The Iliad**
> Problem: open book — make it monumental.
> Prompt: An enormous open cream book on cream paper seen straight-on, pages fanning, a single gold bookmark ribbon hanging down the center, the book casting a large flat shadow, a tiny charcoal figure standing at the book's base for scale, left third empty.

**39 · Homer's worn pages**
> Problem: thick old book — add wear.
> Prompt: A thick closed book on cream paper, pages frayed and uneven at the fore-edge, a worn leather spine band, thin gold foil on the spine, the book tilted slightly, isolated, left third empty.

**40 · FTC release**
> Problem: official papers — one hero is the seal.
> Prompt: A stack of cream official papers on cream paper, the top sheet slightly lifted, a single large gold embossed seal circle on the top sheet (plain circle, no letters), a charcoal fountain pen resting on the stack, left third empty.

**41 · $2.5B split**
> Problem: gold block splitting — add tension.
> Prompt: A single large flat gold block on cream paper with a thick ink crack down its middle, the two halves separating slightly, small cream shards falling between the halves, a thin charcoal hand (no detail) holding each half, left third empty.

**42 · Adobe filing**
> Problem: second paper stack — vary it.
> Prompt: A cream manila folder standing open on cream paper, a thick stack of cream pages inside, a charcoal clip on the folder edge, the folder casting a flat shadow, a small gold tab on the folder, left third empty.

**43 · 50% fee**
> Problem: 4 steps last highlighted gold — make the fee the hero.
> Prompt: Four identical flat charcoal staircase steps on cream paper, the top step solid gold, a thin gold coin falling from the top step into an open cream hand (silhouette, no detail) below, left third empty.

**44 · $2.5B vs $75M**
> Problem: massive vs tiny gold blocks — keep, add scale.
> Prompt: One enormous flat gold block dominating the right half of cream paper, one tiny gold coin at the bottom left for scale, a thin ink bracket measuring the block's width, isolated, left third empty.

**45 · Courthouse**
> Problem: courthouse now exists — keep one gold accent.
> Prompt: A flat courthouse facade on cream paper: triangular pediment, four columns with simple capitals, wide steps, a single gold door at the center of the columns, flat ink outline, vast cream sky, left third empty.

**46 · Symmetry**
> Problem: 3 up / 3 down mirrored — good.
> Prompt: Three flat gold steps rising on the left half of cream paper, three flat gold steps descending on the right half, mirrored perfectly, a thin ink axis line between them, both staircases casting flat shadows, left third empty.

**47 · July 8 2025**
> Problem: calendar circled day — make it one hero.
> Prompt: A cream wall calendar isolated on cream paper, one single day cell near the middle ringed by a thick gold circle, the rest of the grid in faint ink, a charcoal pen resting on the page, left third empty.

**48 · The opinion**
> Problem: document first page — one highlighted paragraph.
> Prompt: A cream legal document page on cream paper, dense thin ink text lines, one paragraph in the middle highlighted with a thick gold marker band, the rest unmarked, a thin charcoal line of the court's seal at the bottom (no letters), isolated, left third empty.

**49 · PROCEDURE (black beat)**
> Problem: black frame dissolving word-block — but no letters.
> Prompt: Pure black field, a single cream paper rectangle in the center dissolving into small falling paper shards, the shards becoming gold as they fall, thin crack lines across the rectangle, only cream and gold on black.

**50 · 2026 — no rule (black beat)**
> Problem: empty frame with canceled line — keep minimal.
> Prompt: Pure black field, a single thin gold line running horizontally across the center with a gold slash crossing it out at a diagonal, nothing else, photographic grade, no grain.

### ACT 6 — THE RESOLUTION (scenes 51–54)

**51 · Back to the gym**
> Problem: same gym composition — change the light.
> Prompt: The same wide empty gymnasium interior from scene 1, but now a warm gold light floods through the windows onto the machines, a single charcoal figure walking IN through the door, machines glowing cream, green accent on one machine's display.

**52 · $133 on black (black beat)**
> Problem: gold coin stack spotlight — keep.
> Prompt: Pure black field, a tall stack of flat gold coins on the right third, a single cream spotlight cone from the top-left corner illuminating the stack, the stack casting a long black shadow, only gold and cream on black.

**53 · Scan the statement**
> Problem: long receipt + cursor — one hero is the cursor.
> Prompt: An extremely long cream receipt snaking diagonally across cream paper, dense ink line items, a single charcoal mouse cursor arrow at the receipt's middle, a gold highlight band sweeping two rows ahead of the cursor, left third empty.

**54 · Final line (black beat)**
> Problem: thin gold line on black — the ending.
> Prompt: Pure black field, one thin horizontal gold line across the exact center, at its right end a single small gold dot, nothing else, photographic grade, no grain.

---

## Part 4 — QA Checklist (run after generating all 54)

1. Every scene: exactly ONE hero object (65–75% frame).
2. Palette: no hex outside cream/ink/gold/green (+ allowed brand tints for scenes 19, 31, 36).
3. No baked text/numbers/letters/logos/faces in any art.
4. Left third empty in every cream scene (type zone).
5. Black beats (13, 26, 49, 50, 52, 54) are 100% dark with ≤2 gold/cream elements.
6. Scenes 3–8 and 31–37 are the densest (retention + industry payoff).
7. Scenes 1 and 51 are the SAME gym composition with different light (bookend callback).
8. Drop shadows are flat strips, never gradients.
9. Output 1920x1080 PNG, no transparency needed (engine grades over it).
10. Run through `engine/qa/structural.mjs` + screenshot QA; ken-burns pan = 4–6% over 4–8s.