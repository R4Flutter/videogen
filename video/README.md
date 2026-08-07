# Crime documentary engine — one story in, one film out

`story.txt` is the only thing that changes per episode. Everything under `src/`
is the engine that stages it.

```
story.txt ──parse-story.mjs──▶ src/script.json ──▶ <CrimeLong/>  ─▶ out/crime.mp4
 sections                       beats  → modules      ▲            1920x1080
 MODULE / CAMERA / AUDIO / SFX   camera → intents      │
 ### NARRATION                   audio  → mood curve   │  <CrimeShort/> ─▶ 1080x1920
 ### VISUAL (**bold** = on screen)      │              │  (only if the story
                                        │              │   wrote a SHORT section)
                                        ├──voice.py───▶ public/audio/vo/beat-N.wav
                                        ├──align.py───▶ src/voice.json
                                        │                word timings, and script.json
                                        │                retimed so the edit fits the read
                                        └──fetch-footage.py──▶ public/footage/beat-N.mp4
```

The timecodes in a story are the author's intent, not the final cut. Once a take
exists, `align.py` rewrites every beat from the recording: **the voice is the
clock.** Camera, music, sfx and text all conform to it.

## Run it

```bash
cd video
npm run episode          # story → voice → align → footage → lint → render
```

or a step at a time:

| command | does |
|---|---|
| `npm run story` | checks the contract, then `story.txt` → `src/script.json` |
| `npm run voice` | one directed Chatterbox take per beat (needs `../.venv-tts`) |
| `npm run align` | word timings, and the episode retimed around the read |
| `npm run footage` | Pexels imagery for beats that stage a picture (needs `PEXELS_API_KEY`) |
| `npm run imagebed` | a Vox-style picture under every ~4s of narration → `public/img/` |
| `npm run lint` | eslint + tsc |
| `npm run preview` | renders the first 30 seconds only |
| `npm run render` | `CrimeLong` → `out/crime.mp4` |
| `npm run render:short` | `CrimeShort` → `out/crime-short.mp4` |
| `npm run check` | the story→script contract and the word-timing self-test |

Without a voice take the film still builds — the parser writes an evenly-spread
timing stub, so you can see the edit before you record it. Without imagery the
beats stage on the room instead of on a photograph. Neither is an error.

## The image bed

`fetch-footage.py` gives one picture to a beat that asked for one. That leaves
most of a scam episode as type on paper, and a headline held for nine seconds
reads as a slide, not as a film. `fetch-imagebed.py` fixes the other half: it
divides every beat into ~4s slots, prompts pollinations.ai with **the narration
actually spoken over that slot**, and writes a timeline to `src/imagebed.json`.

`<ImageBed>` renders it under every page and never turns with the beats, so the
pictures are the one continuous thing in the film while the type pages over
them. It is additive — with an empty manifest each beat draws its own `PaperBG`
exactly as before.

```
npm run imagebed -- --dry            # print the plan, fetch nothing
npm run imagebed                     # fetch what's missing (idempotent)
npm run imagebed -- --only 12 --force --seed 40   # re-roll one beat
npm run imagebed -- --slot 3         # denser: a picture every 3s
```

Delete a bad `public/img/bed-N-K.jpg` and re-run: the manifest is rebuilt from
disk, so that slot drops out and the page falls back to paper for four seconds.

## Writing story.txt

```
**Topic:** THE FLOPPY DISK THAT EXPOSED HIM
**Format:** CrimeLong          # or CrimeShort for a 9:16 film
**Resolution:** 1920×1080
**FPS:** 30

# 0:00–0:35 — THE QUESTION

**MODULE:** EVIDENCE_CARD → DOCUMENT → REVEAL
**CAMERA:** investigate
**AUDIO:** silence → tension
**SFX:** evidence / document
**VISUAL DENSITY:** 2 → 4

### NARRATION

Short lines. One idea each. Written to be spoken.

### VISUAL

**WICHITA, KANSAS**

**CAN A FLOPPY DISK BE TRACED?**

LEFT:

**BTK — controlled every message**

RIGHT:

**POLICE — asked to explain the technology**
```

* A **section becomes several beats** — one per visual, about eleven seconds of
  narration each — and the modules it named run across them in order.
* **`**BOLD**` lines in VISUAL are what goes on screen.** `LABEL — DETAIL` is
  read as exactly that, so a row of them becomes the rows of a timeline, a map,
  a person card, a comparison or a case board. `LEFT:` / `RIGHT:` mark the two
  halves of a split.
* The **timeline and the case board accumulate**: rows established in an early
  section are still there in a later one, dimmed, with the new entry in red.
  That is the engine's story memory, and it is the reason returning to the
  timeline later reads as an investigation changing shape.
* A section with no `### NARRATION` is a note to a human and is not staged, so
  arcs, checklists and production notes can live in the same file.
* `# SHORT` (or `# VERTICAL`) starts the 9:16 cut. It gets its own timeline and
  its own empty board — it is a second telling of the case, never a crop.

### Modules a story may name

`CASE_OPEN` `CHAPTER_CARD` `CLOCK` `CALENDAR` `TIMELINE` `LOCATION_MAP`
`MAP_ROUTE` `PERSON_CARD` `EVIDENCE_CARD` `DOCUMENT` `METADATA`
`REDACTED_DOCUMENT` `CCTV` `PHONE_PING` `CALL_LOG` `TEXT_MESSAGE` `HEADLINE`
`QUOTE` `CASE_BOARD` `CONNECTION_GRAPH` `SPLIT_COMPARE` `ALIBI_COMPARE`
`DNA_COMPARE` `ARCHIVAL` `REVEAL` `CASE_STATUS` `STATEMENT`

### Camera intentions

`observe` `investigate` `follow` `search` `connect` `isolate` `reveal` `shock`
`reflect` — a story names the intention, never a scale. The engine owns the
move, and every one of them is small on purpose.

### Sound events

`document` `map_pin` `timestamp` `cctv` `message` `phone` `evidence`
`transition_soft` `transition_hard` `reveal_minor` `reveal_major`
`tension_rise` `chapter` — semantic, so changing the sfx pack never touches a
story. Anything else in an `**SFX:**` line is treated as a note to a sound
designer and dropped.

## What the engine refuses to do

* **State a crime as fact with nobody's name on it.** A sentence like "he killed
  her" fails the parse unless it is attributed ("prosecutors said…", "police
  alleged…") or the story establishes a plea, verdict or sentence. In an
  adjudicated case it drops to a warning; in an open one it stops the render.
* **Let generated or stock imagery pass as case material.** Everything
  `fetch-footage.py` downloads is labelled `ILLUSTRATIVE — NOT CASE FOOTAGE` on
  the frame for as long as it is on screen, and the surveillance treatment is
  only applied to a beat that declares itself surveillance. A story can override
  provenance per section (`**Provenance:** archival`) when it actually has the
  material.
* **Hold a frame that has nothing on it.** A timeline with one entry, a map with
  one pin or a comparison with one side falls back to imagery under the line.
* **Stay in one visual mode.** Four beats in a row in the same mode and the
  fourth becomes a statement — except the board and the timeline, which are
  supposed to keep building.

QC warnings (visual repetition, stretches with nothing new on screen, a missing
case-status beat, a narration that runs far past the planned runtime) print on
every parse. Failures stop it.

## The room

`src/theme.ts` holds the palette and nothing else does. Charcoal, one warm
paper, one muted evidence red, one cool surveillance tone, one archival amber —
every colour means something, so a colour used for decoration breaks the
grammar.

`src/crime/elements.tsx` is the kit (the room, sheets, screens, diagrams,
provenance tags); `src/crime/scenes.tsx` is one module per beat;
`src/CrimeDoc.tsx` stages them; `src/staging.tsx` is the shared core — narration
playback, the ducking bed, the sfx track, the camera.

The Vox explainer engine (`src/VoxShort.tsx`, `src/vox/`, `tools/parse-script.mjs`)
is still here and still works on its own script format. The crime modules borrow
its type and its hand-drawn marks; nothing else is shared.
