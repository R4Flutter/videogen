# MASTER IMPLEMENTATION PROMPT — CONVERT VIDEOGEN INTO A US CRIME DOCUMENTARY ENGINE

You are working inside my EXISTING `videogen` repository.

Your task is to evolve the current Finance Remotion video engine into a multi-genre video engine that preserves the existing Finance Shorts functionality while adding a production-grade **US Crime Documentary Engine** capable of generating:

1. 16:9 long-form crime documentaries, initially targeting approximately 8–12 minutes.
2. 9:16 crime Shorts, approximately 30–60 seconds.
3. Multiple Shorts derived from the same verified case dossier used by the long-form documentary.

The target audience is primarily viewers in the United States.

The final product must feel like an intentionally edited investigative YouTube documentary, NOT an AI slideshow.

Do NOT blindly rewrite the repository.

Do NOT destroy working finance functionality.

Do NOT create per-episode React components.

Do NOT hardcode the first crime case into the engine.

First inspect the current repository completely and understand how the existing system works.

---

# PHASE 0 — READ THE EXISTING PROJECT FIRST

Before editing anything, inspect:

* `package.json`
* `src/`
* `public/`
* `tools/`
* `script.md`
* generated `script.json`
* voice generation code
* `align.py`
* generated `voice.json`
* `FinanceShort.tsx`
* `Root.tsx`
* existing MODULES/module registry
* camera system
* transition system
* caption/text system
* music system
* SFX system
* audio ducking
* asset loading
* themes
* render scripts
* QC/lint scripts
* `model_plan.md`
* `plan_vox.txt`
* `human_like_voice.md`

Search the repository rather than assuming filenames.

Build an internal dependency map:

TOPIC/SCRIPT
→ PARSER
→ EPISODE DATA
→ VOICE
→ ALIGNMENT
→ WORD TIMINGS
→ REMOTION
→ MODULES
→ CAMERA
→ AUDIO
→ RENDER

Before implementing, identify:

1. What is genuinely reusable.
2. What is finance-specific.
3. What is coupled unnecessarily to `FinanceShort`.
4. What should move to shared core.
5. What should remain untouched.
6. What crime-specific components must be added.

Do not perform a giant rewrite if existing functionality can be reused.

---

# CORE ARCHITECTURAL RULE

The architecture should become:

```text
                    SHARED CORE
                         |
          +--------------+--------------+
          |                             |
       FINANCE                         CRIME
          |                             |
   FinanceShort              +----------+----------+
                             |                     |
                        CrimeShort             CrimeLong
                         9:16                   16:9
```

The shared core should own generic capabilities such as:

* episode loading
* timing
* word-level synchronization
* voice playback
* audio mixing
* SFX scheduling
* camera primitives
* transitions
* asset resolution
* sequencing
* interpolation helpers
* safe timing utilities
* QC utilities

Do NOT move files merely for architectural purity if doing so introduces unnecessary risk.

Refactor only where useful.

Finance must continue rendering after every major refactor.

---

# TARGET OUTPUTS

## CrimeLong

Resolution:

1920 × 1080

Aspect ratio:

16:9

FPS:

30

Initial target duration:

8–12 minutes

Typical narration:

approximately 135–155 spoken words per minute.

The architecture must support longer documentaries later without fundamental changes.

---

## CrimeShort

Resolution:

1080 × 1920

Aspect ratio:

9:16

FPS:

30

Duration:

30–60 seconds.

CrimeShort must use the same verified case data as CrimeLong but receive a separately rewritten short-form narrative.

Do NOT simply crop the long documentary.

---

# TARGET AUDIENCE

Primary audience:

United States.

Use American English.

When appropriate use:

* dollars
* miles
* feet
* Fahrenheit
* US date conventions in natural narration
* familiar US geographical terminology

Narration should sound like a modern American investigative documentary.

Do NOT imitate any specific living creator.

Voice characteristics:

* calm
* controlled
* curious
* intelligent
* conversational
* serious
* restrained
* human
* deliberate

Avoid:

* fake movie-trailer voice
* constant dramatic delivery
* TikTok shouting
* robotic narration
* excessive sensationalism
* unnecessary gore

---

# EDITORIAL POSITIONING

The crime engine should support:

* disappearances
* unsolved mysteries
* solved investigations
* heists
* robberies
* scams
* fraud
* cybercrime
* prison escapes
* strange historical crimes
* evidence-driven investigations
* cases where one clue changed the investigation
* trials and legal outcomes where appropriate

The system should NOT depend on graphic imagery.

The documentary's primary storytelling tools should be:

* evidence
* chronology
* geography
* contradictions
* documents
* communication records
* relationships
* investigative discoveries
* questions
* reveals

---

# CRIME FACTUALITY SYSTEM

This is mandatory.

Crime involves real people and potentially defamatory claims.

Never flatten all information into "fact."

Create a structured claim system supporting classifications such as:

```ts
type ClaimStatus =
  | "confirmed"
  | "official_allegation"
  | "prosecution_claim"
  | "defense_claim"
  | "witness_account"
  | "media_report"
  | "disputed"
  | "unverified"
  | "unknown";
```

Each important factual claim should support metadata resembling:

```ts
interface CrimeClaim {
  id: string;
  claim: string;
  status: ClaimStatus;
  source?: string;
  sourceUrl?: string;
  sourceType?: string;
  retrievedAt?: string;
  eventDate?: string;
  confidence?: number;
}
```

Do not invent missing information.

Narration must preserve attribution.

For example:

BAD:

"He killed her."

GOOD when appropriate:

"Prosecutors alleged that he killed her."

BAD:

"She was definitely at the motel."

GOOD:

"Investigators said her phone connected near the motel."

Never convert uncertainty into certainty for dramatic effect.

---

# RECONSTRUCTION SAFETY

The engine must distinguish authentic material from reconstructed/generated material.

Support asset provenance:

```ts
type AssetProvenance =
  | "official"
  | "archival"
  | "licensed"
  | "public_record"
  | "generated_reconstruction"
  | "illustrative"
  | "unknown";
```

Generated reconstruction must NEVER visually masquerade as authentic:

* CCTV
* police evidence
* bodycam
* surveillance imagery
* court evidence
* official documents

When appropriate, show a subtle:

RECONSTRUCTION

label.

Authentic and reconstructed material should have different visual treatments.

---

# NEW EPISODE ARCHITECTURE

Move toward self-contained episodes:

```text
episodes/
  crime/
    episode-slug/
      case.json
      sources.json
      facts.json
      story.json
      director.json
      voice.json

      assets/
        photos/
        documents/
        maps/
        footage/
        generated/

      audio/
        narration/
        music/
        ambience/
        sfx/
```

Do not break the existing finance workflow while introducing this.

If compatibility adapters are required, create them.

---

# CASE DOSSIER

Create types/schema for a reusable case dossier.

Suggested structure:

```ts
interface CrimeCase {
  id: string;
  title: string;

  location?: {
    country?: string;
    state?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };

  people: CrimePerson[];
  events: CrimeEvent[];
  claims: CrimeClaim[];
  sources: CrimeSource[];
  evidence: CrimeEvidence[];

  centralQuestion?: string;
  status?: string;
}
```

Create sensible supporting interfaces.

Do not overengineer fields that are not needed.

---

# STORY GRAPH

Do not write long-form narration directly from raw research.

Introduce a story-planning layer.

The story model should support:

```text
CENTRAL QUESTION
PROMISE
INCITING INCIDENT
KEY PEOPLE
TIMELINE
CONTRADICTIONS
CLUES
MIDPOINT REFRAME
MAJOR REVEAL
RESOLUTION
UNANSWERED QUESTIONS
```

Also support open loops.

Example:

```ts
interface OpenLoop {
  id: string;
  question: string;
  openedAtBeat: string;
  plannedPayoffBeat?: string;
  resolved: boolean;
}
```

This allows the story engine to intentionally create and resolve curiosity.

---

# LONG-FORM STORY STRUCTURE

Do NOT rigidly force timestamps, but use this as the default storytelling rhythm:

0:00–0:30
COLD OPEN

0:30–1:30
PEOPLE / LOCATION / CONTEXT

1:30–3:00
INCIDENT

3:00–4:30
INITIAL INVESTIGATION

4:30–5:30
CONTRADICTION / STORY REFRAME

5:30–7:00
NEW EVIDENCE

7:00–8:15
BREAKTHROUGH / MAJOR REVEAL

8:15–9:20
OUTCOME / LEGAL RESULT / CURRENT STATUS

9:20–10:00
FINAL MEANING / UNANSWERED QUESTION / CALLBACK

Adapt this structure to the case.

Story logic is more important than fixed timestamps.

---

# HOOK TOURNAMENT

Create a crime hook generator architecture.

Do NOT generate one hook and accept it.

Generate multiple candidates.

Support hook families:

* timestamp
* contradiction
* missing-time
* evidence-object
* impossible-situation
* location
* phone/digital evidence
* unanswered-question
* countdown
* mistaken-assumption

Examples of structural patterns only:

"At 2:17 AM, the phone moved for the final time."

"Police had their suspect on camera. There was one problem."

"Eleven minutes were missing from the timeline."

"This receipt destroyed the original story."

Do not copy these mechanically.

Score candidate hooks on:

```text
curiosity
specificity
stakes
clarity
visualPotential
novelty
credibility
spoilerRisk
```

False or unsupported hooks must automatically fail.

Select the strongest truthful hook.

---

# FIRST 30-SECOND RETENTION ARCHITECTURE

Default cold-open rhythm:

0–5 sec:
MYSTERY

5–12 sec:
EVIDENCE

12–20 sec:
COMPLICATION

20–30 sec:
PROMISE

Avoid:

* greetings
* channel introductions
* "today we're talking about"
* long logo animations
* generic exposition

The story should begin immediately.

A branding sting may exist but should normally remain approximately 1 second and must not interrupt narrative momentum.

---

# RETENTION ENGINE

Create retention metadata at the beat level.

Every approximately 20–45 seconds the story should ideally provide at least one:

```text
new_information
new_question
new_evidence
contradiction
location_change
time_change
visual_mode_change
reveal
emotional_change
pattern_interrupt
```

Do NOT mechanically insert fake twists.

Retention must come from real story information.

Create QC capable of identifying long stretches without meaningful progression.

Example:

```ts
interface RetentionEvent {
  type:
    | "new_information"
    | "new_question"
    | "evidence"
    | "contradiction"
    | "reveal"
    | "location_change"
    | "time_change"
    | "pattern_interrupt";
  strength: number;
}
```

---

# CRIME VISUAL LANGUAGE

The design should feel like a premium investigative documentary.

NOT:

* horror YouTube
* cheap red/black crime graphics
* constant glitches
* blood splatters
* cheesy police tape everywhere

Preferred:

* charcoal
* near-black
* warm paper
* restrained off-white
* muted evidence red
* cool surveillance tones
* subtle texture
* elegant typography
* restrained motion

Create:

`src/crime/theme.ts`

Use semantic tokens instead of scattering colors throughout components.

---

# CRIME MODULE SYSTEM

Build a registry similar to the existing Finance MODULES architecture.

Do not make episode-specific React components.

Create reusable modules.

Minimum V1 modules:

```text
CASE_OPEN
LOCATION_MAP
MAP_ROUTE
PERSON_CARD
TIMELINE
CLOCK
EVIDENCE_CARD
DOCUMENT
REDACTED_DOCUMENT
CCTV
PHONE_PING
CALL_LOG
TEXT_MESSAGE
HEADLINE
QUOTE
CONNECTION_GRAPH
ALIBI_COMPARE
SPLIT_COMPARE
CASE_BOARD
CALENDAR
ARCHIVAL
REVEAL
CASE_STATUS
CHAPTER_CARD
```

Each module should have a clean typed contract.

Example conceptual API:

```ts
interface CrimeModuleProps {
  beat: CrimeBeat;
  durationInFrames: number;
  aspectRatio: "landscape" | "vertical";
}
```

Do not expose unnecessary Remotion implementation details to episode JSON.

---

# MODULE SELECTION

The Director should choose semantic modules.

For example:

Narration:

"At 11:42 PM, his phone connected three miles from the house."

Director:

```json
{
  "module": "PHONE_PING",
  "focus": "timestamp_and_distance"
}
```

NOT:

```json
{
  "x": 382,
  "y": 188,
  "scale": 1.14
}
```

Episode data should express editorial intent.

The engine should determine low-level rendering.

---

# VISUAL MODE VARIATION

Prevent slideshow fatigue.

Track visual modes such as:

```text
photo
map
timeline
document
surveillance
case_board
text
archival
diagram
communication
```

Create QC that warns when too many consecutive beats use the same visual mode.

The viewer should feel visual progression.

---

# VISUAL DENSITY

Support:

```ts
visualDensity: 1 | 2 | 3 | 4 | 5;
```

Interpret approximately as:

1 = quiet / single image
2 = image + small information
3 = normal explanatory visual
4 = multiple evidence elements
5 = major reveal / dense composition

Do not keep the entire documentary at density 5.

Contrast creates pacing.

---

# CAMERA DIRECTOR

Reuse existing camera primitives where possible.

Create semantic crime camera intentions:

```ts
type CameraIntent =
  | "observe"
  | "investigate"
  | "follow"
  | "search"
  | "connect"
  | "isolate"
  | "reveal"
  | "shock"
  | "reflect";
```

Map them internally to motion.

Suggested interpretation:

OBSERVE
→ near-static drift

INVESTIGATE
→ controlled slow push-in

FOLLOW
→ tracking pan

SEARCH
→ map/document pan

CONNECT
→ movement between related evidence

ISOLATE
→ background de-emphasis + controlled push

REVEAL
→ push + settle

SHOCK
→ hard cut or tiny controlled punch

REFLECT
→ static or extremely slow pull-out

Never use camera movement merely because movement is possible.

Movement must support storytelling.

---

# PARALLAX SYSTEM

Create reusable cinematic treatment for still images.

Support:

* background
* subject
* foreground
* evidence overlay
* typography

Allow subtle independent movement.

Keep motion restrained.

Avoid fake dramatic 30% zooms.

Typical movement should be subtle enough that photographs still feel documentary-authentic.

---

# CCTV MODULE

Create a reusable CCTV visual language.

Support:

* timestamp
* camera identifier
* restrained noise
* optional monochrome
* subtle scanline
* zoom/highlight region
* evidence annotation

Do not automatically add fake CCTV treatment to normal images.

The module should know whether the underlying source is authentic CCTV or an illustrative reconstruction.

---

# DOCUMENT SYSTEM

Build reusable document presentation.

Features:

* paper surface
* slow camera movement
* line highlighting
* sentence isolation
* redaction animation
* evidence tag
* source label
* page number
* date
* optional official/public-record label

Do not display unreadable full pages.

The camera should guide the viewer to the relevant sentence.

---

# MAP SYSTEM

Maps are critical.

Create a reusable map system supporting:

USA
→ state
→ city
→ local area

Capabilities:

* location pin
* route trace
* distance line
* search radius
* sequential location reveal
* movement between timestamps
* phone ping
* vehicle movement
* highlighted region

Keep implementation modular.

If the repository already has map-related dependencies from Vox planning, reuse them where appropriate.

---

# TIMELINE SYSTEM

Build a reusable timeline capable of:

* timestamp
* date
* event
* location
* person
* evidence
* contradiction marker

Timeline should progressively build rather than appearing fully populated immediately.

Allow the documentary to return to the same timeline later with new information.

This is important.

The timeline should function as persistent story memory.

---

# CASE BOARD

Create a signature CaseBoard component.

It should visually connect:

* people
* locations
* objects
* phones
* vehicles
* events
* documents
* evidence

Do NOT make it a cheesy detective red-string meme.

Use clean investigative information design.

The board should be able to progressively accumulate connections throughout the documentary.

At major moments, the director may return to the board and reveal a new relationship.

---

# LONG-FORM TYPOGRAPHY

Do NOT use Shorts-style full captions for the entire documentary.

Narration:

"At exactly 2:23 AM, the vehicle left."

On-screen emphasis might only show:

2:23 AM

Then perhaps:

11 MINUTES MISSING

Use selective kinetic typography.

CrimeLong text should support comprehension, not transcribe every sentence.

CrimeShort may continue using aggressive captions.

---

# AUDIO ARCHITECTURE

Do not treat audio as:

VOICE + RANDOM MUSIC + RANDOM SFX.

Build an audio director.

Support audio states:

```ts
type CrimeAudioMood =
  | "neutral"
  | "mystery"
  | "investigation"
  | "tension"
  | "discovery"
  | "danger"
  | "reveal"
  | "aftermath"
  | "resolution";
```

Each beat may specify:

```ts
audioMood
audioIntensity
```

The audio engine determines:

* music layer
* ambience
* ducking
* transition
* SFX density

Reuse existing audio infrastructure.

---

# MUSIC

Music should behave as a continuous documentary score, not restart every scene.

Support:

* cue continuation
* crossfade
* intensity automation
* narration ducking
* reveal swells
* deliberate silence
* chapter transitions

Avoid constant maximum tension.

Create an intensity curve across the documentary.

---

# SILENCE EVENTS

Implement silence as a deliberate audio tool.

Example:

music building
→ narration setup
→ music drops
→ 250–700ms controlled silence
→ evidence appears
→ subtle evidence SFX
→ narration reveal

Do not overuse this.

Silence should signal importance.

---

# SFX SEMANTIC SYSTEM

Claude/episode JSON should NOT select raw filenames.

Use semantic events:

```ts
type CrimeSfx =
  | "document"
  | "map_pin"
  | "timestamp"
  | "cctv"
  | "message"
  | "phone"
  | "evidence"
  | "transition_soft"
  | "transition_hard"
  | "reveal_minor"
  | "reveal_major"
  | "tension_rise"
  | "chapter";
```

The audio engine maps these to actual files.

This allows SFX packs to change without modifying episodes.

---

# SFX RULES

SFX should punctuate information.

Do not add an effect to every animation.

Priority SFX moments:

* important timestamp
* map location
* evidence appearance
* document reveal
* phone/message
* contradiction
* major discovery
* chapter transition

Reduce SFX density during emotionally serious passages.

---

# VFX

Create reusable subtle documentary VFX:

* film grain
* paper texture
* vignette
* surveillance noise
* scanlines
* highlight glow
* redaction
* dust for archival material
* subtle exposure transition
* controlled blur/focus

Avoid:

* random glitches
* blood overlays
* huge camera shakes
* excessive RGB splitting
* horror filters
* constant flickering

VFX should communicate context.

---

# SOURCE-SPECIFIC VISUAL GRAMMAR

Different source types should visually communicate different meanings.

CCTV
→ surveillance treatment

official/public document
→ document treatment

court record
→ legal-document treatment

witness account
→ attributed quote treatment

reconstruction
→ clearly labeled illustrative treatment

unknown/disputed information
→ visually communicate uncertainty where appropriate

Do not visually imply certainty that the underlying evidence does not support.

---

# CHAPTER SYSTEM

Support optional chapter cards.

Examples of structure:

THE LAST CALL

THE SEARCH

THE ALIBI

THE RECEIPT

THE SECOND TIMELINE

THE VERDICT

Do not force numbered chapters.

Chapter titles should represent story developments.

Transitions should be short.

---

# CRIME SHORTS

CrimeShort must share:

* case dossier
* verified facts
* people
* evidence
* sources

but have its own story/director output.

Short structure:

HOOK
→ CONTEXT
→ EVIDENCE
→ CONTRADICTION
→ REVEAL/PAYOFF

Do NOT simply cut 60 seconds from CrimeLong.

One long documentary should be capable of producing multiple Shorts around:

1. central mystery
2. strongest evidence
3. biggest contradiction
4. strongest reveal

Each must remain truthful and understandable independently.

---

# THUMBNAIL METADATA

The pipeline should produce thumbnail planning metadata, not necessarily render the final thumbnail in V1.

Suggested structure:

```ts
interface ThumbnailPlan {
  concept: string;
  primarySubject?: string;
  secondaryObject?: string;
  location?: string;
  text?: string;
  emotionalGoal?: string;
}
```

Thumbnail text should usually be approximately 2–4 words.

Avoid clutter.

---

# TITLE GENERATOR METADATA

Support title candidates and scores.

Score:

* curiosity
* clarity
* specificity
* emotional stakes
* searchability
* thumbnail compatibility
* spoiler avoidance
* factual accuracy

Do not use deceptive titles.

---

# VOICE

Reuse the current voice pipeline.

Add a crime-documentary voice mode.

Target delivery:

American English
calm
controlled
curious
serious
restrained
natural pauses
slower than finance Shorts

Target approximately:

135–155 WPM for normal documentary passages.

Allow slower delivery around major evidence/reveals.

Do not structurally replace the current word-alignment pipeline unless necessary.

Word-level timing remains extremely valuable.

---

# NARRATION RULES

Write for speech.

Prefer:

"Police checked the camera.

Nothing.

The car never appeared."

Avoid:

"Upon conducting a comprehensive review of the available surveillance material, investigators subsequently determined..."

Use:

* short paragraphs
* concrete nouns
* active voice
* natural contractions where appropriate
* specific times
* specific locations
* restrained rhetorical questions

Do not manufacture suspense.

---

# DIRECTOR JSON

Design a typed CrimeBeat/CrimeDirector schema.

Example concept:

```ts
interface CrimeBeat {
  id: string;

  narration: string;

  module: CrimeModule;

  duration?: number;

  visualMode: CrimeVisualMode;
  visualDensity: 1 | 2 | 3 | 4 | 5;

  cameraIntent?: CameraIntent;

  audioMood?: CrimeAudioMood;
  audioIntensity?: number;

  sfx?: CrimeSfx[];

  retentionEvents?: RetentionEvent[];

  claims?: string[];
  assets?: string[];

  reconstruction?: boolean;
}
```

Adjust this after examining the existing engine.

Do not duplicate data already available elsewhere if references are cleaner.

---

# DIRECTOR RESPONSIBILITIES

The director should determine:

* scene/module
* information hierarchy
* visual mode
* visual density
* camera intention
* audio mood
* SFX events
* transition
* asset requirements
* retention event
* evidence references
* claim references

The director should NOT manually specify dozens of pixel coordinates.

---

# PATTERN INTERRUPTION

Track visual mode history.

Avoid sequences like:

PHOTO
PHOTO
PHOTO
PHOTO
PHOTO

Prefer meaningful variation:

PHOTO
→ MAP
→ CCTV
→ DOCUMENT
→ TIMELINE
→ CASE BOARD
→ ARCHIVAL

Do not change visuals randomly.

The visual change should match narrative function.

---

# TRANSITIONS

Default to restrained transitions:

* hard cut
* match cut
* subtle crossfade
* fade through black
* document wipe
* map transition
* camera push-through
* restrained exposure flash for archival changes

Avoid:

* spins
* giant slides
* constant zoom transitions
* gimmicky presets

---

# QUALITY CONTROL

Implement crime-specific QC.

## FACT QC

Check:

* unsupported accusation
* missing attribution
* uncertain claim presented as fact
* contradictory facts
* missing source reference

## TIMELINE QC

Check:

* impossible chronology
* inconsistent dates
* inconsistent times
* event ordering

## PERSON QC

Check:

* inconsistent names
* inconsistent roles
* unsupported relationships

## VISUAL QC

Check:

* repeated visual modes
* excessive text
* unreadable text
* generated reconstruction presented as authentic
* unsupported visual implication

## RETENTION QC

Check:

* weak opening
* long information-flat sections
* unresolved promised hook
* excessive exposition
* missing progression

## AUDIO QC

Check:

* narration masked by music
* excessive SFX
* music restarting unnecessarily
* inappropriate high intensity
* lack of dynamic contrast

## STORY QC

Check:

* hook promise answered
* central question understandable
* reveal not spoiled too early
* open loops resolved where appropriate
* ending provides closure/status

## TECHNICAL QC

Check:

* missing assets
* invalid modules
* invalid timings
* NaN interpolation
* negative durations
* out-of-range frames
* missing audio
* invalid JSON

QC failures should be explicit.

Do not silently render broken episodes.

---

# REMOTION SAFETY

Long-form videos create many more frames than Shorts.

Be careful with:

* memory
* unnecessary rerenders
* giant arrays
* expensive per-frame calculations
* random values
* unstable React keys
* dynamic filesystem assumptions
* huge SVG recomputation
* expensive map calculations every frame

Memoize or precompute where appropriate.

Keep Remotion deterministic.

Never use uncontrolled randomness.

Use seeded randomness where variation is necessary.

---

# PERFORMANCE

CrimeLong may contain 18,000+ frames.

Design accordingly.

Precompute:

* timeline layouts
* map geometry
* evidence positions
* scene metadata
* audio event scheduling

Do not perform expensive parsing or geometry work every rendered frame.

---

# ROOT COMPOSITIONS

Register compositions cleanly.

Expected conceptual output:

```text
FinanceShort
CrimeShort
CrimeLong
```

Keep existing finance composition IDs compatible where practical.

Do not break existing render commands unnecessarily.

---

# PACKAGE SCRIPTS

Add convenient commands based on the actual existing package manager/scripts.

Conceptually:

```text
render:finance
render:crime-short
render:crime-long

episode:finance
episode:crime-short
episode:crime-long
```

Do not invent commands that conflict with the current repository.

Inspect first.

---

# DEMO CASE

After the engine architecture exists, create ONE demo crime episode.

The demo must primarily test the engine.

It should exercise:

* CaseOpen
* PersonCard
* Map
* Timeline
* Clock
* Evidence
* Document
* CCTV or surveillance-style module where legitimate
* Phone/communication visualization
* CaseBoard
* Reveal
* CaseStatus

Do NOT hardcode the engine around this case.

If real-world factual sourcing cannot be reliably completed in the current environment, use an explicitly fictional development fixture for technical testing.

Never invent facts about a real crime case merely to fill demo data.

---

# DEVELOPMENT FIXTURES

Create small fixture data for individual modules where useful.

For example:

```text
fixtures/
  map-demo.json
  timeline-demo.json
  evidence-demo.json
  caseboard-demo.json
```

This allows components to be tested without rendering a complete 10-minute documentary.

---

# IMPLEMENTATION ORDER

Follow this order unless repository inspection reveals a better dependency order.

## STEP 1 — AUDIT

Read repository.

Document architecture.

Run existing validation/tests/build/render where practical.

Establish baseline.

Do not edit before understanding the baseline.

---

## STEP 2 — TYPES + SHARED CONTRACTS

Add:

* crime types
* case dossier
* claim classification
* asset provenance
* story graph
* director schema

Keep types small and practical.

Compile.

---

## STEP 3 — CRIME THEME + CRIMELONG SHELL

Create:

* crime theme
* CrimeLong composition
* CrimeShort composition shell

Register compositions.

Verify Remotion loads.

Do not build all modules yet.

---

## STEP 4 — CORE MODULES

Implement first:

1. CaseOpen
2. PersonCard
3. LocationMap
4. Timeline
5. EvidenceCard
6. Document
7. CCTV
8. PhonePing
9. CaseBoard
10. Reveal
11. CaseStatus

Test individually.

---

## STEP 5 — CAMERA

Adapt existing camera infrastructure.

Add semantic camera intents.

Validate that camera moves remain restrained and deterministic.

---

## STEP 6 — AUDIO

Adapt current audio system.

Implement:

* CrimeAudioMood
* intensity
* semantic SFX
* ambience
* ducking
* silence events
* continuous music behavior

Do not replace working voice alignment.

---

## STEP 7 — LONG-FORM TYPOGRAPHY

Add selective emphasis system.

Do not use full-screen Shorts captions throughout CrimeLong.

---

## STEP 8 — STORY/DIRECTOR PIPELINE

Implement schemas/tools for:

case
→ story
→ hook
→ narration
→ director

Keep these outputs deterministic where possible.

Validate generated JSON before Remotion consumes it.

---

## STEP 9 — RETENTION QC

Add:

* hook validation
* progression gaps
* visual repetition
* unresolved open loops
* promise/payoff checks

---

## STEP 10 — CRIME SHORT

Reuse verified case/story data.

Create short-form director behavior.

Do not duplicate the factual source layer.

---

## STEP 11 — DEMO DOCUMENTARY

Produce one complete test documentary.

Initial target:

approximately 8–10 minutes.

Do NOT begin with 15 minutes.

Test the entire pipeline.

---

## STEP 12 — REGRESSION

Render or validate:

FinanceShort
CrimeShort
CrimeLong

Finance must still work.

Fix regressions before proceeding.

---

# TESTING REQUIREMENTS

After meaningful changes run appropriate existing checks.

At minimum where available:

* TypeScript compiler
* ESLint
* existing tests
* Remotion composition validation
* script parser
* JSON schema validation

For render validation, use short frame ranges before expensive full renders.

Example principle:

render frames 0–300

then selected middle scene

then selected reveal scene

then full render.

Do not repeatedly render a 10-minute video just to find basic TypeScript errors.

---

# DO NOT DO THESE THINGS

DO NOT:

* delete the finance engine
* turn FinanceShort into CrimeLong
* hardcode one crime story
* create one React file per episode
* use random stock images for every sentence
* use full captions throughout long form
* add cheesy horror effects
* generate fake evidence
* present allegations as facts
* restart music every scene
* add SFX to every animation
* move the camera constantly
* create a giant monolithic CrimeLong component
* duplicate the entire engine
* rewrite working alignment code without reason
* install unnecessary dependencies
* silently ignore missing assets
* silently ignore invalid episode JSON
* make every scene maximum intensity
* generate a 10-minute video as one enormous React component

---

# SUCCESS CRITERIA

The implementation succeeds when:

1. Existing FinanceShort still works.

2. CrimeLong renders at 1920×1080 / 30fps.

3. CrimeShort renders at 1080×1920 / 30fps.

4. Both crime compositions consume structured episode data.

5. No episode-specific JSX is required.

6. Word-level voice alignment is reused.

7. CrimeLong supports multiple visual modes.

8. Maps, timelines, evidence, documents and case boards are reusable.

9. Camera direction is semantic.

10. Audio direction is semantic.

11. Music can persist across scenes.

12. SFX are semantic events rather than filenames.

13. Generated reconstructions are distinguishable from authentic evidence.

14. Claim attribution is represented structurally.

15. Long-form typography is selective.

16. CrimeShort can reuse the same verified case dossier.

17. The system can create a second crime episode without modifying React.

18. Existing finance behavior has not regressed.

---

# IMPORTANT IMPLEMENTATION BEHAVIOR

Do not attempt the entire project in one uncontrolled pass.

Work phase-by-phase.

At the beginning:

1. Inspect.
2. Explain the architecture you found.
3. Identify exact files you intend to touch.
4. Identify exact files you intend to preserve.
5. Identify risks.
6. Establish a baseline build/check.
7. Then implement.

After each major phase:

1. run validation
2. fix errors
3. summarize changes
4. continue

Do not leave placeholder TODOs for critical runtime functionality unless the dependency truly cannot be completed.

Do not claim something works without validating it.

Prefer extending existing patterns over inventing parallel infrastructure.

---

# FINAL ARCHITECTURAL GOAL

The eventual production pipeline should resemble:

```text
US CRIME TOPIC
       ↓
RESEARCH
       ↓
SOURCES
       ↓
CLAIM CLASSIFICATION
       ↓
CASE DOSSIER
       ↓
STORY ARCHITECT
       ↓
HOOK TOURNAMENT
       ↓
NARRATION
       ↓
DIRECTOR
       ↓
ASSET PLAN
       ↓
VOICE
       ↓
WORD ALIGNMENT
       ↓
SHARED REMOTION CORE
       ↓
 +-------------------------+
 |                         |
CRIME LONG             CRIME SHORT
1920×1080              1080×1920
 |                         |
AUDIO                   AUDIO
 |                         |
QC                      QC
 |                         |
MP4                     MP4
```

Finance remains another consumer of the shared infrastructure:

```text
FINANCE
   ↓
FinanceShort
```

The goal is therefore NOT:

FINANCE ENGINE → CRIME ENGINE

The goal is:

```text
                 VIDEOGEN CORE
                            \
                            CRIME
                           /     \
                         SHORT     LONG
```

Build toward that architecture incrementally.

---

# QUALITY BAR

The final CrimeLong output should feel as though:

* a researcher organized the case
* a documentary writer structured the mystery
* an editor chose every visual intentionally
* a motion designer created the information graphics
* a sound designer controlled tension
* a narrator understood when to slow down
* an investigative producer distinguished fact from allegation

The viewer should NOT feel:

"This is an automatically generated Remotion slideshow."

When automation and quality conflict, prefer reusable editorial intelligence over simply adding more animations.

Now begin with PHASE 0.

Inspect the repository thoroughly before changing any code.
