# MASTER IMPLEMENTATION PROMPT

# CRIME DOCUMENTARY MOTION GRAPHICS ENGINE — REMOTION + CLAUDE

You are working inside my EXISTING `videogen` repository.

The repository already contains a Finance video engine and a developing Crime Documentary engine using Remotion.

Your task is NOT to rewrite the project.

Your task is to add a production-quality, reusable **Crime Documentary Motion Graphics Engine** that allows Claude to DIRECT sophisticated motion graphics semantically while Remotion handles the actual deterministic animation.

The target output is:

* premium YouTube crime documentaries
* primarily US audience
* 16:9 long form
* approximately 8–15 minutes
* 1920×1080
* 30 FPS
* plus reusable 9:16 Crime Shorts support

The desired result should feel like a human motion designer/editor intentionally animated the documentary.

It must NOT feel like:

* PowerPoint
* an AI slideshow
* random Ken Burns effects
* stock footage with captions
* generic template animation
* constant zooming
* cheap true-crime graphics
* horror edits
* random transitions

The motion system must primarily communicate:

* where something happened
* when something happened
* how events connect
* what evidence matters
* what changed
* what contradicts something else
* how investigators narrowed possibilities
* how a mechanism works
* what information is being revealed
* why a clue matters

==================================================
PHASE 0 — INSPECT BEFORE EDITING
================================

Before changing code, thoroughly inspect the repository.

Find and understand:

* Root.tsx
* FinanceShort
* CrimeShort
* CrimeLong
* current crime toolkit / CrimeKit
* existing module registry
* camera system
* interpolation helpers
* timing helpers
* transitions
* SFX system
* music/audio system
* voice pipeline
* word alignment
* voice.json
* script.json
* story/director formats
* crime types
* theme
* provenance system
* current Diagram
* Plate
* Sheet
* Screen/CCTV surface
* Emphasis
* Redact
* FilmBG
* useStage
* any map implementation
* existing assets
* package.json
* render commands

Search the repository rather than assuming paths.

First produce an internal architecture map:

NARRATION
→ VOICE
→ WORD ALIGNMENT
→ STORY BEAT
→ DIRECTOR
→ MODULE
→ MOTION
→ CAMERA
→ SFX
→ MUSIC
→ REMOTION

Determine which layers already exist.

Do not duplicate existing functionality.

Run the current build/typecheck/lint/tests before major edits where practical.

Establish a baseline.

Finance must remain functional.

CrimeLong must remain functional.

==================================================
CORE ARCHITECTURAL PRINCIPLE
============================

The new architecture should become:

NARRATION
↓
WORD TIMINGS
↓
STORY BEAT
↓
CRIME DIRECTOR
↓
MOTION DIRECTOR
↓
MOTION RECIPE
↓
MOTION COMPONENTS
↓
MOTION PRIMITIVES
↓
CAMERA + VFX + SFX + AUDIO
↓
REMOTION

The episode tells the engine WHAT should happen.

Remotion determines HOW it animates.

BAD:

{
"x": 422,
"y": 280,
"scale": 1.17,
"rotation": 3
}

GOOD:

{
"intent": "connect",
"graphic": "case_graph",
"target": "church_to_dennis",
"triggerPhrase": "Dennis"
}

Do not expose low-level pixel animation to Claude unless absolutely necessary.

==================================================
THE THREE-LAYER MOTION SYSTEM
=============================

Implement motion graphics in three levels.

---

## LEVEL 1 — MOTION PRIMITIVES

Create/reuse tiny deterministic primitives.

Examples:

Fade
Scale
Slide
Push
Pull
Pan
Drift
Parallax
DrawLine
TracePath
Reveal
MaskReveal
Wipe
TypeText
Counter
Highlight
Underline
CircleHighlight
Pulse
Glow
BlurFocus
Stamp
PinDrop
Progress
Scan
CropReveal
FocusRegion
NumberTick
Connector
PathMarker

Do NOT overbuild.

If existing utilities already provide these capabilities, reuse them.

These primitives should:

* use `useCurrentFrame()`
* use deterministic interpolation
* respect scene-relative frame
* clamp interpolation appropriately
* avoid uncontrolled randomness
* support configurable duration
* avoid expensive per-frame computation

Claude should normally NEVER directly choose these primitives.

==================================================
LEVEL 2 — DOCUMENTARY MOTION COMPONENTS
=======================================

Create semantic components built from the primitives.

Initial library:

AnimatedMap
MapZoom
RouteTrace
SearchRadius
PhonePing
LocationSequence

TimelineBuild
TimelineReturn
TimeGap
DateCounter

EvidenceReveal
EvidenceInspect
EvidenceChain

DocumentInspect
DocumentHighlight
RedactionReveal
MetadataReveal

CaseGraph
ConnectionReveal
SuspectNarrowing

PhoneCall
CallLog
MessageThread

CCTVInspect
CCTVFocus
CCTVTimestamp

PersonReveal
PersonCompare

AlibiCompare
StatementCompare

DNACompare
ForensicMatch

HeadlineReveal
HeadlineStack

MechanismExplainer

ChapterReveal

FinalCallback

Do not build 30 half-working components immediately.

Start with the highest-value components first.

Priority:

1. AnimatedMap
2. RouteTrace
3. TimelineBuild
4. EvidenceReveal
5. DocumentInspect
6. MetadataReveal
7. CaseGraph
8. ConnectionReveal
9. PhonePing
10. CCTVInspect
11. AlibiCompare
12. DNACompare

Validate those before expanding.

==================================================
LEVEL 3 — MOTION RECIPES
========================

This is the layer Claude should normally control.

Create semantic recipes such as:

ESTABLISH_LOCATION

FOLLOW_ROUTE

TRACE_PHONE

BUILD_TIMELINE

SHOW_TIME_GAP

INVESTIGATE_EVIDENCE

INVESTIGATE_DOCUMENT

REVEAL_METADATA

CONNECT_EVIDENCE

BUILD_CASE_GRAPH

NARROW_SUSPECTS

COMPARE_STATEMENTS

COMPARE_ALIBI

EXPLAIN_MECHANISM

REVEAL_IDENTITY

SHOW_FORENSIC_MATCH

RETURN_TO_OPENING_OBJECT

REFLECT_ON_EVIDENCE

A recipe should combine:

* motion component
* motion timing
* information hierarchy
* camera intent
* optional VFX
* semantic SFX
* audio emphasis
* visual density

Example:

REVEAL_METADATA

might internally produce:

document enters
→ camera investigates
→ visible content de-emphasizes
→ metadata layer separates
→ relevant field highlights
→ camera settles
→ subtle document SFX
→ music ducks slightly

Claude only chooses:

REVEAL_METADATA

not all individual animations.

==================================================
MOTION DIRECTOR TYPES
=====================

Create clean typed contracts.

Conceptually:

type MotionIntent =
| "establish"
| "locate"
| "observe"
| "follow"
| "search"
| "investigate"
| "explain"
| "connect"
| "compare"
| "narrow"
| "isolate"
| "reveal"
| "shock"
| "reflect"
| "resolve";

type MotionGraphic =
| "map"
| "route"
| "timeline"
| "evidence"
| "document"
| "metadata"
| "case_graph"
| "phone"
| "communication"
| "cctv"
| "person"
| "forensics"
| "typography"
| "photo"
| "headline"
| "mechanism";

type MotionRecipe =
| "establish_location"
| "follow_route"
| "trace_phone"
| "build_timeline"
| "show_time_gap"
| "investigate_evidence"
| "investigate_document"
| "reveal_metadata"
| "connect_evidence"
| "build_case_graph"
| "narrow_suspects"
| "compare_statements"
| "compare_alibi"
| "explain_mechanism"
| "reveal_identity"
| "show_forensic_match"
| "return_to_opening_object"
| "reflect_on_evidence";

Adapt naming to the existing project conventions.

==================================================
MOTION CUE
==========

Create a structure conceptually similar to:

interface MotionCue {
id: string;

recipe: MotionRecipe;

intent: MotionIntent;
graphic: MotionGraphic;

trigger: MotionTrigger;

target?: string;

importance: 1 | 2 | 3 | 4 | 5;

cameraIntent?: CameraIntent;

audioEmphasis?: "none" | "light" | "medium" | "major";

sfx?: CrimeSfx[];

visualDensity?: 1 | 2 | 3 | 4 | 5;

params?: Record<string, unknown>;
}

Avoid `Record<string, unknown>` if a better discriminated union can be implemented cleanly.

Prefer typed recipe-specific params.

==================================================
WORD-LEVEL TRIGGERS
===================

This is CRITICAL.

The existing voice alignment should become the timing authority.

Support triggers:

type MotionTrigger =
| {
type: "word";
word: string;
occurrence?: number;
}
| {
type: "phrase";
phrase: string;
}
| {
type: "scene_progress";
progress: number;
}
| {
type: "after_phrase";
phrase: string;
delayFrames?: number;
};

The engine should resolve these against aligned narration.

Example narration:

"One pointed toward a Lutheran church.
The other pointed toward a first name.
Dennis."

Motion cues:

phrase "Lutheran church"
→ reveal church node

phrase "first name"
→ metadata field becomes visible

word "Dennis"
→ reveal DENNIS
→ draw connection
→ camera settles
→ subtle music duck
→ evidence SFX

This should happen on the exact aligned frame where possible.

==================================================
WORD TIMING RESOLVER
====================

Create a reusable utility.

Conceptually:

resolveWordFrame(...)
resolvePhraseFrame(...)
resolveTriggerFrame(...)

Requirements:

* scene-relative frame
* composition-relative frame
* occurrence selection
* graceful fallback
* warning when trigger phrase is not found
* no crash for punctuation/casing mismatch
* normalized comparison

Normalize:

case
punctuation
whitespace

Do NOT silently trigger important reveals at frame 0 when alignment fails.

For missing critical triggers:

warn or fail QC.

==================================================
EXAMPLE — BTK METADATA SCENE
============================

Narration:

"The examination of the disk produced two extremely useful pieces of information.

One pointed toward a Lutheran church.

The other pointed toward a first name.

Dennis."

Director data should resemble:

{
"motion": [
{
"recipe": "reveal_metadata",
"intent": "investigate",
"graphic": "metadata",
"trigger": {
"type": "phrase",
"phrase": "Lutheran church"
},
"target": "church",
"importance": 4
},
{
"recipe": "reveal_metadata",
"intent": "isolate",
"graphic": "metadata",
"trigger": {
"type": "phrase",
"phrase": "first name"
},
"target": "author_field",
"importance": 4
},
{
"recipe": "connect_evidence",
"intent": "reveal",
"graphic": "case_graph",
"trigger": {
"type": "word",
"word": "Dennis"
},
"target": "dennis",
"importance": 5,
"audioEmphasis": "medium",
"sfx": ["reveal_minor"]
}
]
}

Expected visual behavior:

disk
→ document
→ hidden metadata layer
→ church field
→ connection line
→ DENNIS
→ camera settles

This should feel synchronized to narration.

==================================================
ANIMATED MAP ENGINE
===================

Crime documentaries need excellent maps.

Create a reusable map motion system.

Capabilities:

USA
→ state
→ city
→ neighborhood/local area

Support:

location pin
route line
vehicle movement
phone movement
search radius
distance
multiple locations
time-labeled locations
sequential location reveal

Example narration:

"At 11:42 PM, his phone connected three miles from the house."

Motion:

11:42 PM
→ phone ping
→ location circle
→ distance line
→ house pin
→ 3.1 MI

The map should explain the evidence.

It should NOT merely decorate the frame.

==================================================
MAP CAMERA

Semantic commands:

LOCATE
→ zoom from broad region to location

FOLLOW
→ camera tracks route

COMPARE
→ fit both locations

SEARCH
→ controlled pan/zoom over search area

REVEAL
→ settle on newly important location

Do not let Claude define raw map camera coordinates unless unavoidable.

==================================================
ROUTE TRACE

Create RouteTrace.

Features:

* progressive SVG/path drawing
* moving marker
* optional timestamps
* optional distance
* multiple stops
* route direction
* path completion
* camera following

Do not recalculate complex path geometry every frame.

Precompute geometry.

==================================================
TIMELINE ENGINE
===============

Timeline should be a major reusable motion system.

Support:

date
time
event
location
person
evidence
contradiction
unknown gap
arrest
trial/outcome

Important:

The timeline must be persistent story memory.

Example:

At minute 2:

1974
→ event A
→ event B

At minute 6:

RETURN to the same timeline.

Add:

2004
→ communication
→ disk

At minute 8:

RETURN again.

Add:

2005
→ arrest

Do not generate unrelated timeline designs every time.

==================================================
TIME GAP MOTION GRAPHIC
=======================

Create a specialized time-gap graphic.

Example:

2:17 AM
────────────
?
?
?
────────────
2:28 AM

Then:

11 MINUTES

This is extremely useful for:

* missing time
* alibi gaps
* CCTV gaps
* phone inactivity
* unexplained movement

The gap should visually create curiosity.

==================================================
CASE GRAPH ENGINE
=================

Upgrade the existing Diagram/graph concept into a persistent investigative graph.

Node types:

person
location
vehicle
phone
document
evidence
organization
event
unknown

Edges:

connected_to
called
visited
owned
worked_at
seen_at
sent
received
matches
contradicts
related_to

Do NOT make it look like cliché red-string corkboard graphics.

Use clean information design.

==================================================
PROGRESSIVE CASE GRAPH
======================

The graph should build across the documentary.

Example BTK:

UNKNOWN
↓
BTK

Later:

BTK
↓
FLOPPY DISK

Later:

BTK
↓
FLOPPY DISK
↓
LUTHERAN CHURCH
↓
DENNIS
↓
?

Later:

?
→ DENNIS RADER

Later:

DENNIS RADER
↓
FORENSIC SUPPORT

The graph becomes visual memory.

==================================================
CONNECTION REVEAL
=================

Create reusable connection animations.

Sequence:

node A visible
→ narration establishes relationship
→ line begins drawing
→ line reaches node B
→ B appears
→ label appears
→ camera settles

For important connections:

music may duck slightly
semantic SFX may fire

Do not draw everything simultaneously.

==================================================
DOCUMENT MOTION ENGINE
======================

Upgrade existing Sheet/Redact functionality.

Create:

DocumentInspect
DocumentHighlight
RedactionReveal
MetadataReveal

DocumentInspect should support:

* page entering
* subtle perspective
* camera pan
* line highlighting
* phrase isolation
* annotations
* evidence tag
* provenance
* page/date/source labels

Never display a full unreadable page as the primary visual.

Guide the viewer to relevant information.

==================================================
METADATA REVEAL
===============

Create a premium digital-forensics animation.

Sequence:

visible document
→ document shifts slightly
→ metadata layer appears behind/beside it
→ fields populate
→ irrelevant fields dim
→ important field highlights
→ connection to investigation appears

Potential fields:

AUTHOR
LAST SAVED BY
ORGANIZATION
FILE DATE
SOFTWARE
DOCUMENT PATH

Only show fields supported by case data.

Never fabricate realistic metadata for a real case.

==================================================
EVIDENCE ENGINE
===============

EvidenceReveal should support:

* object
* evidence number
* source/provenance
* date
* location
* significance
* annotation
* magnified detail

Motion:

object enters
→ evidence label
→ camera investigates
→ relevant region highlighted

Avoid unnecessary 3D spinning.

Evidence should feel physical and serious.

==================================================
EVIDENCE CHAIN
==============

Create an EvidenceChain recipe.

Example:

COMMUNICATION
↓
FLOPPY DISK
↓
METADATA
↓
CHURCH
↓
DENNIS
↓
RADER
↓
FORENSIC SUPPORT

Reveal each step on narration cues.

At the end, allow camera to pull out and show the entire chain.

This is excellent for end-of-documentary explanation.

==================================================
PHONE MOTION SYSTEM
===================

Create:

PhonePing
CallLog
MessageThread

PhonePing:

map
→ tower/area
→ pulse
→ timestamp
→ distance

CallLog:

caller
recipient
time
duration
direction

MessageThread:

only reproduce message content when supported.

Do not invent messages.

==================================================
CCTV MOTION ENGINE
==================

Upgrade surveillance treatment.

Create:

CCTVInspect
CCTVFocus
CCTVTimeline

Features:

* timestamp
* camera ID
* restrained noise
* scanline
* focus box
* zoom region
* object tracking
* time jump

Do not fake CCTV.

If generated or reconstructed:

show RECONSTRUCTION.

==================================================
CCTV FOCUS
==========

Example narration:

"At 2:17 AM, a vehicle enters the lot."

Motion:

wide CCTV
→ timestamp reaches 2:17
→ vehicle enters
→ focus box appears
→ camera digitally crops slightly
→ vehicle highlighted

Do not overzoom poor-quality footage.

==================================================
FORENSIC MOTION SYSTEM
======================

Create:

DNACompare
EvidenceMatch
ForensicProcess

DNACompare should NOT show fake scientific percentages.

Use conceptual visualization unless verified values exist.

Possible visual:

SAMPLE A
↓
comparison
↑
REFERENCE

Then:

CONSISTENT / MATCH / SUPPORT

Use terminology supported by the case data.

==================================================
COMPARE SYSTEM
==============

Create a powerful SplitCompare.

Uses:

ALIBI vs EVIDENCE

STATEMENT A vs STATEMENT B

CLAIM vs PHONE RECORD

CCTV vs TIMELINE

Example:

LEFT
CLAIM:
HOME AT 10:00

RIGHT
PHONE:
3.2 MILES AWAY
10:07 PM

Then connection/contradiction marker.

This is one of the strongest crime-documentary motion formats.

==================================================
TYPOGRAPHY MOTION
=================

Long-form motion typography must remain restrained.

Do NOT animate every narration word.

Create high-value emphasis motion:

timestamp
distance
name
location
number
contradiction
question
reveal

Examples:

2:17 AM

3.1 MILES

31 YEARS

DENNIS

NOT PROOF

11 MINUTES MISSING

Animate using:

fade
mask
subtle scale
tracking
line reveal

Avoid:

bouncing words
rainbow text
Shorts captions
huge constant kinetic typography

==================================================
CAMERA + MOTION COORDINATION
============================

Motion graphics and camera cannot operate independently.

Create semantic coordination.

Examples:

INVESTIGATE_DOCUMENT

camera:
slow push

document:
highlight phrase

SFX:
paper/detail tick

audio:
slight duck

CONNECT_EVIDENCE

camera:
travel between nodes

graph:
line draws

SFX:
connection tick

REVEAL_IDENTITY

camera:
movement stops

identity:
appears

music:
drop

SFX:
low impact

REFLECT

camera:
slow pull-out

graphics:
reduce density

audio:
simplify

==================================================
MOTION HIERARCHY
================

Never animate five equally important elements simultaneously.

Each scene needs:

PRIMARY ACTION

SECONDARY SUPPORT

BACKGROUND MOTION

Example:

PRIMARY:
DENNIS appears.

SECONDARY:
connection line reaches Dennis.

BACKGROUND:
document subtly drifts.

The eye must know where to look.

==================================================
MOTION DENSITY
==============

Add:

motionDensity: 1 | 2 | 3 | 4 | 5

1:
almost still

2:
one subtle movement

3:
normal documentary animation

4:
multi-step investigation graphic

5:
major reveal/explanation

Do not keep the documentary at 4–5.

A good 10-minute documentary needs quiet moments.

==================================================
MOTION ENERGY CURVE
===================

Support scene-level motion energy.

Example 10-minute arc:

0:00 hook
4

0:30 context
2

1:30 investigation
3

2:30 silence/cold case
1

3:00 return
3

4:30 evidence
4

5:30 major clue
5

6:30 suspect
3

7:30 confirmation
4

8:00 reveal
5

8:30 explanation
3

9:30 reflection
1

Do not make every scene hyperactive.

==================================================
TRANSITIONS
===========

Motion graphics should transition naturally.

Preferred:

hard cut
match cut
camera continuation
map-to-photo
photo-to-map
document push
fade through black
mask reveal
shared-element transition

Avoid:

spin
cube
random slide
giant zoom
constant whoosh

==================================================
MATCH CUTS
==========

Build optional reusable match-cut logic.

Examples:

map circle
→ evidence magnifying circle

document highlight
→ location highlight

floppy disk
→ circular case-board node

timestamp
→ timeline marker

photo
→ person node

These can make Remotion output feel much more edited.

==================================================
VFX LAYER
=========

Motion graphics may use restrained VFX:

grain
vignette
paper texture
scanline
subtle glow
focus blur
redaction
light exposure
archival dust

VFX must never dominate.

No random glitch spam.

==================================================
SFX INTEGRATION
===============

Motion recipes should emit semantic SFX.

Examples:

map_pin
route_start
route_arrive
document
highlight
evidence
connection
timestamp
phone
message
reveal_minor
reveal_major
chapter

Do not store raw filenames in episode JSON.

==================================================
SFX VARIATION POOLS
===================

Upgrade semantic SFX mapping to deterministic pools.

Example:

evidence:

* evidence_soft_01
* evidence_soft_02
* paper_place
* forensic_tick

connection:

* connect_01
* connect_02
* subtle_tick

reveal_major:

* low_hit_01
* tonal_hit
* sub_drop

Selection must be deterministic.

Use episode ID + beat ID + cue ID as seed.

Do not use uncontrolled randomness.

==================================================
AUDIO REACTION
==============

Motion cues may request audio emphasis:

none
light
medium
major

LIGHT:
small music duck

MEDIUM:
music duck + SFX

MAJOR:
music drop or strong duck + silence + SFX

Do not let motion components directly control the entire soundtrack.

Send intent to the Audio Director.

==================================================
SILENCE
=======

Important reveals may use silence.

Example:

narrator:
"The other pointed toward a first name."

music drops

250–500ms pause

narrator:
"Dennis."

DENNIS appears.

subtle low hit.

This should be supported structurally.

Do not overuse it.

==================================================
ASSET PROVENANCE
================

All motion graphics using case assets must preserve existing provenance.

official
archival
public_record
licensed
reconstruction
illustrative
unknown

Generated reconstruction cannot masquerade as:

authentic CCTV
police evidence
official document
bodycam
real photograph

Motion graphics must retain the provenance label where required.

==================================================
CRIME LONG VS CRIME SHORT
=========================

Reuse the same motion system.

CrimeLong:

restrained
slower
selective typography
longer holds
more explanatory diagrams
more progressive builds

CrimeShort:

faster
larger text
higher motion density
more aggressive framing
fewer simultaneous details

Do not create two independent motion engines.

Use:

aspectRatio
motionProfile

Example:

motionProfile:
"documentary" | "short"

==================================================
DIRECTOR EXAMPLE — FULL SCENE
=============================

Narration:

"Police had spent decades trying to move from a nickname to a person.

The disk suddenly gave them a path.

BTK.

A church.

Dennis."

Desired director representation:

{
"id": "btk-path",

"module": "CASE_BOARD",

"visualMode": "case_graph",

"visualDensity": 5,

"motionDensity": 4,

"cameraIntent": "connect",

"audioMood": "discovery",

"audioIntensity": 0.62,

"motion": [
{
"recipe": "build_case_graph",
"intent": "connect",
"trigger": {
"type": "phrase",
"phrase": "gave them a path"
},
"target": "btk",
"importance": 3
},

```
{
  "recipe": "connect_evidence",
  "intent": "connect",
  "trigger": {
    "type": "word",
    "word": "BTK"
  },
  "target": "disk",
  "importance": 3
},

{
  "recipe": "connect_evidence",
  "intent": "connect",
  "trigger": {
    "type": "phrase",
    "phrase": "A church"
  },
  "target": "church",
  "importance": 4
},

{
  "recipe": "connect_evidence",
  "intent": "reveal",
  "trigger": {
    "type": "word",
    "word": "Dennis"
  },
  "target": "dennis",
  "importance": 5,
  "audioEmphasis": "medium",
  "sfx": ["reveal_minor"]
}
```

]
}

Remotion should render:

BTK
↓
FLOPPY DISK
↓
CHURCH
↓
DENNIS

with each connection appearing exactly with narration.

==================================================
MOTION QC
=========

Create automated motion quality checks.

Detect:

1. TOO MUCH MOTION

Too many simultaneous primary animations.

2. DEAD SCENE

Long scene with no visual progression where progression is expected.

3. REPETITIVE RECIPE

Same motion recipe used too many times consecutively.

4. REPETITIVE CAMERA

Same camera intent too many scenes consecutively.

5. UNSYNCED REVEAL

Important reveal triggers before narration.

6. MISSING TRIGGER

Word/phrase trigger cannot be found.

7. TEXT OVERLOAD

Too much information appears simultaneously.

8. MOTION OVERLOAD

Motion density too high for too long.

9. INVALID PROVENANCE

Reconstruction presented as authentic.

10. SFX OVERLOAD

Too many semantic SFX within a short interval.

11. CAMERA CONFLICT

Camera and primary motion compete.

12. NO QUIET MOMENT

Long stretch with constant high motion intensity.

13. REVEAL WITHOUT SETUP

High-importance reveal has no prior context.

14. OFFSCREEN CONTENT

Responsive layout causes content to leave safe bounds.

==================================================
PERFORMANCE REQUIREMENTS
========================

A 10-minute 30fps video contains approximately 18,000 frames.

Do NOT:

perform heavy graph layout every frame
parse large JSON every frame
calculate map paths every frame
create uncontrolled random layouts
run expensive filters unnecessarily
rebuild huge SVG trees unnecessarily

Precompute:

graph layout
map geometry
timeline positions
route geometry
cue frames
word trigger frames
scene metadata

Use memoization where appropriate.

Keep rendering deterministic.

==================================================
RESPONSIVE REQUIREMENTS
=======================

Reuse existing stage/orientation abstractions.

Motion graphics must work at:

1920×1080

and

1080×1920

Do not merely scale the landscape composition down for Shorts.

Layout should adapt.

Example:

landscape CaseGraph:
horizontal / wide

vertical CaseGraph:
stacked / vertical

Same semantic data.

Different layout.

==================================================
FOLDER ARCHITECTURE
===================

Do not force this exact structure if existing repository conventions suggest something better.

Conceptually:

src/
core/
motion/
primitives/
timing/
triggers/
camera/
types.ts

crime/
motion/
recipes/
components/
maps/
timeline/
evidence/
documents/
caseGraph/
phone/
cctv/
forensic/
typography/

```
  MotionDirector.tsx
  registry.ts
  types.ts

qc/
  motionQc.ts
```

Avoid one giant file.

==================================================
REGISTRY
========

Create a registry so recipes resolve cleanly.

Concept:

MOTION_RECIPES = {
establish_location: ...,
follow_route: ...,
trace_phone: ...,
build_timeline: ...,
investigate_evidence: ...,
reveal_metadata: ...,
connect_evidence: ...,
reveal_identity: ...
}

The episode should never import React components directly.

==================================================
IMPLEMENTATION ORDER
====================

DO NOT implement everything simultaneously.

STEP 1
Audit current project.

STEP 2
Create motion types.

STEP 3
Create word/phrase trigger resolver.

STEP 4
Create/reuse low-level primitives.

STEP 5
Implement:

TimelineBuild
EvidenceReveal
DocumentInspect
CaseGraph

STEP 6
Add word-synchronized cues.

STEP 7
Add:

MetadataReveal
ConnectionReveal

STEP 8
Implement map system:

AnimatedMap
RouteTrace
PhonePing

STEP 9
Implement:

CCTVInspect
AlibiCompare
DNACompare

STEP 10
Integrate semantic camera.

STEP 11
Integrate semantic SFX.

STEP 12
Integrate Audio Director emphasis.

STEP 13
Add Motion QC.

STEP 14
Integrate into CrimeLong.

STEP 15
Adapt same system to CrimeShort.

STEP 16
Use the BTK episode as the first full stress test.

STEP 17
Regression test FinanceShort.

==================================================
BTK STRESS TEST
===============

The BTK episode should demonstrate:

1. floppy disk evidence reveal

2. USA → Kansas → Wichita map

3. 1974 → 2005 timeline

4. letters/documents

5. years passing

6. communication returning

7. traceability question

8. disk entering evidence

9. metadata explanation

10. LUTHERAN reveal

11. DENNIS reveal

12. progressive CaseGraph

13. Wichita → church map

14. Dennis Rader PersonCard

15. LEAD — NOT PROOF emphasis

16. forensic comparison

17. BTK → DENNIS RADER identity reveal

18. full investigative evidence chain

19. 1974 vs 2005 comparison

20. return to the opening floppy disk

This episode should exercise the system rather than contain custom BTK JSX.

==================================================
SECOND-EPISODE TEST
===================

After BTK works, test whether the system generalizes.

Use a second case with a DIFFERENT explanatory mechanism.

The second episode should require combinations such as:

family relationships
DNA
geographic narrowing
timeline
suspect narrowing
forensic comparison

If the second episode requires writing many new case-specific React components, the architecture has failed.

New GENERIC modules are acceptable.

Case-specific modules are not.

==================================================
SUCCESS CRITERIA
================

The motion engine succeeds when:

1. Claude can direct motion semantically.

2. Episode JSON contains editorial intent, not pixel coordinates.

3. Word alignment can trigger important reveals.

4. Maps explain geography.

5. Timelines act as persistent memory.

6. Case graphs progressively accumulate evidence.

7. Documents guide attention.

8. Evidence receives deliberate motion.

9. Camera supports the information hierarchy.

10. SFX synchronize with meaningful actions.

11. Music can react to major reveals.

12. Motion intensity changes throughout the documentary.

13. Quiet scenes exist.

14. Motion graphics work in 16:9 and 9:16.

15. Generated reconstructions remain clearly identified.

16. A second crime episode can use the same system.

17. Finance remains functional.

18. 10-minute renders remain deterministic.

19. No episode requires custom React code.

20. The finished video looks intentionally motion-designed rather than automatically animated.

==================================================
FINAL QUALITY STANDARD
======================

Every animation must answer at least one question:

WHAT should I look at?

WHERE did this happen?

WHEN did this happen?

WHO is connected?

HOW are these facts connected?

WHAT changed?

WHAT contradicts what?

WHY does this clue matter?

HOW did investigators narrow the case?

If an animation answers none of those questions, question whether it should exist.

Motion is not decoration.

Motion is storytelling.

The desired hierarchy is:

STORY

>

EVIDENCE

>

CLARITY

>

MOTION

>

STYLE

Never reverse that hierarchy.

==================================================
START NOW
=========

Begin with PHASE 0 only.

Inspect the repository.

Then report:

1. current architecture
2. reusable systems already present
3. files that should be modified
4. files that should remain untouched
5. missing pieces
6. architectural risks
7. exact implementation phases
8. baseline validation status

Only then begin implementation.

Work incrementally.

After each phase:

* typecheck
* lint where available
* validate Remotion
* test relevant frame ranges
* fix errors before continuing

Do not claim a feature works without validating it.

Do not perform a giant uncontrolled rewrite.
