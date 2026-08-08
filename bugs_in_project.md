Bro, I went through the entire 10:00 compound.mp4 systematically: full-duration sampling, dense inspection of representative sections, individual problematic frames, audio-level analysis, and then I compared the output against your actual R4Flutter/videogen Remotion architecture.

I also inspected your current vox_style_engine.md, VOX_MODULES.md, VoxShort.tsx, scenes.tsx, elements.tsx, staging.tsx, and script.json.

5
My professional verdict
As a visual prototype: 7/10
As a finished 10-minute documentary: 4.5–5/10

And I'm being blunt because you're trying to build something genuinely good.

Your biggest problem is NOT that you need more transitions.

Your engine already has plenty of vocabulary: kinetic text, doodles, charts, compare, stat, callout, timeline, quote, trace, trust, funnel, map and collage.

The problem is that the editorial intelligence, layout system, and long-form orchestration aren't mature enough yet.

The video currently feels like:

"A very good animated presentation generator."

You want:

"An automated editorial documentary editor."

Those are very different things.

1. 🚨 P0 — Your typography/layout engine is breaking

This is the most obvious technical problem.

I found repeated cases where:

numbers run outside the canvas
titles collide with kickers
captions collide with module labels
text gets clipped during transitions
long numbers don't fit
elements occupy the same spatial zone
Example: ~10.5s

Your number becomes something like:

25,557,729...

and runs beyond the right edge.

Then:

~255s

You get:

9,171.4...

with the number physically cut off.

And around 380s:

A HUNDRED THOUSAND TARGETS

is sitting directly underneath/through the THE FUNNEL kicker.

This isn't an artistic problem.

This is a layout-engineering problem.

2. I found the exact reason in your code

Your Stat module does:

size = width * (shown.length > 8 ? 0.18 : 0.24)

So a 10-digit number gets a fixed font size based only on character count. Your runW is calculated, but it is not actually used to reduce the font size of the number itself.

That's why:

30,000,000

can exceed the usable width.

You need a real text fitting engine.

Replace this concept:
number length → choose font size

with:

desired font size
       ↓
measure actual rendered width
       ↓
available safe width
       ↓
if too wide:
    reduce font size
       ↓
if still too wide:
    change representation
       ↓
30,000,000 → 30M

For example:

$9,171.49

$10,000

30M

123.6K

1.25M

And only use the full number when the exact number is editorially important.

3. 🚨 P0 — You don't have a global layout system

This is actually the big architectural problem behind many of the visual defects.

Your modules independently decide where things go.

For example, the funnel has its own title placement.

The kicker has its own placement.

The caption has its own placement.

The data has its own placement.

The transition moves the whole page.

Eventually they collide.

Your Stage component reserves some bottom space, but it doesn't establish a real composition grid.

You need this

Create:

video/src/vox/layout.ts

with something conceptually like:

┌────────────────────────────────────┐
│ SAFE TOP                           │
│                                    │
│ KICKER                             │
│                                    │
│ TITLE / HERO                       │
│                                    │
│                                    │
│ PRIMARY VISUAL                     │
│                                    │
│                                    │
│ ANNOTATION                         │
│                                    │
│ CAPTION SAFE ZONE                  │
└────────────────────────────────────┘

Every module receives:

LayoutSlots
├── kicker
├── headline
├── primary
├── secondary
├── annotation
├── caption
└── footer

Then no module is allowed to arbitrarily place content outside its slot.

That one change will eliminate a huge percentage of your current ugliness.

4. 🚨 P0 — Your captions are fighting the visuals

This is one of the biggest problems I saw.

At ~104s you get something like:

48

and underneath:

a supervisor appears.

But the same information is already represented by the module.

The result is visual duplication.

Your global Captions component places narration in a fixed lower region for non-kinetic modules.

Meanwhile modules such as Stat also have their own labels.

So you're effectively doing:

MODULE TEXT
       +
FULL NARRATION CAPTION
       +
ANIMATED EMPHASIS

That's too much.

5. Build a caption policy

Don't have:

caption = true/false

Have:

captionMode:

NONE
EMPHASIS
SUBTITLE
LOWER_THIRD
FULL

For example:

Stat
captionMode: EMPHASIS

Show:

48

and maybe:

A SUPERVISOR

Don't show the entire narration.

Chart
captionMode: NONE

Let the chart explain the sentence.

Cinematic footage
captionMode: SUBTITLE
Pure narration / abstract section
captionMode: FULL

This will make the video feel much more editorial.

6. 🚨 P0 — Your video is too dependent on word-by-word typography

This is the biggest artistic problem.

Look at the first few seconds.

You go:

THEY PAY

THEY PAY YOU

THEY PAY YOU TWO

THEY PAY YOU TWO DOLLARS

WATCH VIDEOS

The animation itself is technically fine.

But after several minutes the viewer realizes:

"I'm basically watching a giant animated transcript."

That's not enough for 10 minutes.

7. Your engine needs an editorial visual rhythm

For long-form, don't make:

word → text
word → text
word → text
word → text

Instead:

NARRATION
   ↓
EDITORIAL IDEA
   ↓
VISUAL ARGUMENT
   ↓
ANIMATION
   ↓
NEXT IDEA

Example:

Narration

"The balance on screen isn't real."

Don't display:

THE BALANCE
ON SCREEN
IS NOT
REAL

Instead:

     FAKE APP BALANCE

       $250.00
          ↓
    ┌───────────┐
    │ AVAILABLE │
    │  $250.00  │
    └───────────┘

       ↓

       [FREEZE]

       $250.00
          ↓
      ✕ NOT REAL

That's editorial storytelling.

8. 🚨 Your visual vocabulary is stronger than your visual orchestration

This is important.

Your repo already has a surprisingly good vocabulary.

You've built:

kinetic
doodle
footage
icon
chart
compare
stat
callout
timeline
quote
trace
trust
funnel
map
collage

That's good.

But your actual 10-minute video doesn't use these as different editorial experiences strongly enough.

Instead it often feels like:

Paper
+
Big text
+
Orange line
+
Small image
+
Caption

repeated.

9. You need a much stronger visual hierarchy

For long-form, I'd target approximately:

30% — typography / kinetic explanation

20% — diagrams / charts / data

20% — photographs / archival / generated editorial imagery

10% — maps / geography

10% — documents / screenshots / UI reconstruction

10% — cinematic transitions / collage / special moments

Not exact numbers, but the principle matters.

Right now your video feels much closer to:

70–80% typography
20–30% everything else

That's why it becomes tiring.

10. 🚨 Your images aren't doing enough storytelling

The images I saw are often treated as decorative objects.

For example:

phone image
+
orange rectangle
+
headline

That's visually attractive.

But a professional documentary asks:

What does this image prove?

You want:

IMAGE
 ↓
SUBJECT
 ↓
CAMERA MOVEMENT
 ↓
ANNOTATION
 ↓
RELATIONSHIP
 ↓
NARRATIVE MEANING

For example:

phone screen
      ↓
zoom into balance
      ↓
circle "$250"
      ↓
draw line
      ↓
move money
      ↓
destination
      ↓
"THIS IS WHERE IT GOES"

Now the image is part of the argument.

11. Your parallax system is too weak

Your current camera system is deliberately subtle:

kinetic 1.00 → 1.03
doodle 1.00 → 1.04
icon    1.00 → 1.02
compare 1.00 → 1.025
stat    1.05 → 1.00

Your own code confirms this.

That's fine for a paper page.

But for a 10-minute documentary it becomes almost invisible.

You need semantic camera movement, not just:

scale 1 → 1.03
12. Add a real 2.5D editorial camera

For generated images:

BACKGROUND
     ↓
MIDGROUND
     ↓
SUBJECT
     ↓
ANNOTATION
     ↓
CAMERA

Example:

background building
       ↓ 0.15x

people
       ↓ 0.45x

foreground object
       ↓ 1.0x

annotation
       ↓ 1.2x

Then:

camera push
+
slight horizontal drift
+
foreground/midground separation

Now you get actual parallax.

Your collage system already understands multi-rate drift conceptually, but you need to make this a general visual primitive, not a special-case module.

13. 🚨 Your transitions are not the main problem — but the current page turn can create clipping

Your Turn moves the whole page by up to roughly 3.5% on entry and 2.5% on exit.

That's a clever idea.

But your content can already sit close to the canvas edges.

Then:

content near edge
       +
page translate
       ↓
CONTENT GETS CLIPPED

That's exactly what I see in some sections.

Don't increase the transition.

Instead:

Fix the safe area first.

Then change the turn to something like:

scale: 0.985 → 1
opacity: 0 → 1
translate: max 1.2%

Or use a paper-overlap transition where the page itself moves but its contents remain inside an oversized virtual page.

14. Your funnel module is a perfect example of the layout problem

At ~380s:

A HUNDRED THOUSAND
TARGETS

is competing with:

THE FUNNEL

Then the 100,000 value is pushed beyond the right edge.

This tells me your modules don't have a shared contract like:

Kicker occupies 7–14%
Headline occupies 15–30%
Visual occupies 30–78%
Caption occupies 82–94%

You need that.

15. 🚨 Audio is a serious technical problem

I analyzed the audio stream separately.

The overall audio level is far too quiet.

Measured approximately:

RMS:  -42.3 dBFS
Peak: -27.5 dBFS

That's nowhere near a healthy finished YouTube mix.

Your Soundtrack component simply plays the narration Audio sources without a proper loudness-normalization stage.

Your code has:

DUCK = 0.42

for music ducking, which is reasonable conceptually, but ducking a music bed doesn't solve under-recorded narration.

16. Fix audio before doing anything fancy

Your pipeline should be:

TTS
 ↓
per-take loudness normalization
 ↓
EQ
 ↓
compression
 ↓
limiter
 ↓
voice bus
 ↓
music bus
 ↓
ducking
 ↓
master limiter
 ↓
final loudness normalization

For a YouTube-oriented finished mix, aim roughly around:

Integrated: ~ -14 LUFS
True peak: ≤ -1 dBTP

The exact target can vary, but your current level is dramatically too low.

17. There is also a recurring audio timing artifact

Your audio analysis shows repeated silent windows of approximately:

1.47 seconds

at roughly:

31.5s
63.5s
95.5s
127.5s
159.5s
...

That's almost exactly a 32-second cadence.

That strongly suggests your audio segmentation/render pipeline is introducing a recurring timing gap.

That should be fixed at the source.

Don't try to hide it with music.

Check:

voice generation
↓
voice concatenation
↓
voice.json timings
↓
Sequence start times

particularly around your Take.start / dur calculations.

18. Your long-form architecture needs to change

This is a big one.

Your own vox_style_engine.md currently describes the engine primarily around the 60–90 second Vox-style explainer, with a 16:9 essay path described as a later phase.

And the current repository script.json is literally:

1080 × 1920
57 seconds

with six beats.

But your compound.mp4 is:

1920 × 1080
10 minutes

So you're effectively asking the short-form composition philosophy to carry a long-form documentary.

Don't do that.

Build:

VoxShort
VoxEssay

as two different editorial compositions sharing the same primitives.

19. Build VoxEssay.tsx

I would create:

video/src/VoxEssay.tsx

and keep:

VoxShort.tsx

for Shorts.

Both can share:

vox/elements.tsx
vox/layout.tsx
vox/camera.tsx
vox/captions.tsx
vox/assets.tsx
vox/audio.ts
vox/scenes.tsx

But the director should be different.

20. Long-form should operate on three levels

This is the architecture I'd use.

LEVEL 1
CHAPTER

5–15 minute documentary
        ↓

LEVEL 2
SEQUENCE

30–120 seconds
        ↓

LEVEL 3
BEAT

3–15 seconds

For example:

CHAPTER 1 — THE HOOK

Sequence A
    Beat 1
    Beat 2
    Beat 3

Sequence B
    Beat 4
    Beat 5

CHAPTER 2 — HOW IT WORKS

Sequence C
    Beat 6
    Beat 7
    Beat 8

Your current system mostly thinks in beats.

That's why it doesn't understand long-form rhythm.

21. Add a VisualPlan

This is probably the single most important AI-engineering improvement.

Instead of:

Visual: A chart showing...

have the planning model output:

{
  "beat": 17,
  "purpose": "reveal",
  "visualType": "editorial_diagram",
  "asset": "bank_transfer.png",
  "composition": "left_subject_right_explanation",
  "camera": "push_to_balance",
  "layers": [
    "background",
    "phone",
    "balance",
    "annotation"
  ],
  "captionMode": "emphasis",
  "motion": "trace_money",
  "duration": 7.4
}

Then Remotion only renders the plan.

22. Don't let the parser decide everything from keywords

Your current system uses the Visual line to choose modules. That's elegant for a prototype.

But this:

Visual contains "chart"
       ↓
chart module

isn't enough for professional long-form.

The AI needs to understand:

What is being said?
What is the viewer learning?
What visual proves it?
What should move?
Where should the viewer look?
What should remain static?
What should be emphasized?

Then explicitly select:

module
composition
asset
camera
caption
transition
sound
23. Add an actual visual planner before Remotion

Your pipeline should become:

SCRIPT
   ↓
STORY ANALYZER
   ↓
CHAPTER PLANNER
   ↓
SEQUENCE PLANNER
   ↓
VISUAL PLANNER
   ↓
ASSET PLANNER
   ↓
MOTION PLANNER
   ↓
TIMELINE JSON
   ↓
REMOTION

Not:

SCRIPT
 ↓
keyword parser
 ↓
module
 ↓
Remotion
24. You need "visual escalation"

A 10-minute video can't remain visually at the same intensity.

Use:

INTRO
  ↓
simple
  ↓
context
  ↓
more imagery
  ↓
diagram
  ↓
evidence
  ↓
collage
  ↓
map
  ↓
complex mechanism
  ↓
visual climax
  ↓
simplification
  ↓
payoff

Your current video has a very similar visual energy from beginning to end.

That's one reason it feels generated.

25. Your orange/black/off-white palette is actually good

I don't want you to destroy this.

Your engine's palette:

paper
black
orange
muted gray

is coherent and restrained. Your documentation explicitly defines that restraint as part of the visual grammar.

Keep it.

The problem isn't the palette.

The problem is:

too many frames using the same composition grammar.

26. Your paper background is good — but it's becoming wallpaper

The subtle grain, guides and warm paper are nice.

But after 5 minutes the viewer stops seeing it.

That's normal.

So don't make the paper itself more complicated.

Instead:

paper
↓
photograph
↓
document
↓
map
↓
diagram
↓
full-screen evidence
↓
paper

The return to paper then becomes meaningful.

27. Your strongest visual moments are actually the simplest ones

The sections like:

THE TRAP IS THE TRUST

work.

The cards work.

The large numbers can work.

The final:

PAID TO WATCH VIDEOS
UNTIL THE PAY BECOMES THE PRICE

has a good editorial idea.

But the final payoff would be much stronger if the visual transformed the meaning, rather than simply displaying the sentence.

For example:

PAID TO WATCH VIDEOS

       ↓

       $2
       ↓
     $250
       ↓
    $250 LOST
       ↓

PAID TO WATCH VIDEOS

UNTIL THE PAY
BECOMES THE PRICE.

That's a real visual callback.

28. The biggest improvement I would make

If you only implement five things, do these:

P0 — 1. Global layout engine

Fix:

clipping
overlaps
unsafe text
kicker collisions
number overflow
P0 — 2. Caption manager

Stop:

module label
+
full narration
+
same phrase again
P0 — 3. Audio normalization

Get the voice to professional loudness.

P1 — 4. VoxEssay

Stop treating 10 minutes like a giant Short.

P1 — 5. Visual planner + 2.5D scenes

Turn:

animated slides

into:

editorial visual storytelling
29. The exact stack I'd use for your project

You don't need a completely different technology stack.

Your current stack is enough.

Claude
   │
   ├── Story planning
   ├── Visual planning
   └── Timeline decisions
   │
   ↓
Whisper
   │
   └── word timings
   │
   ↓
Chatterbox / TTS
   │
   └── normalized narration
   │
   ↓
Pollinations
   │
   └── editorial images
   │
   ↓
Wikimedia / footage
   │
   └── real evidence
   │
   ↓
Remotion
   │
   ├── layout engine
   ├── typography
   ├── 2.5D parallax
   ├── diagrams
   ├── maps
   ├── collage
   ├── documents
   ├── camera
   └── transitions
   │
   ↓
FFmpeg
   │
   ├── audio mastering
   ├── loudness
   └── final encode

You do not need to abandon Remotion.

30. What I would NOT do

Don't respond to this video by adding:

❌ more wipes
❌ more zooms
❌ more bounce
❌ more orange
❌ more transitions
❌ more text animation
❌ more particles
❌ random camera shake

That would make it worse.

Your problem isn't:

"Not enough effects."

Your problem is:

"Not enough editorial decisions."

31. Your target should be this

Current:

Narration
   ↓
Text
   ↓
Animation
   ↓
Next text
   ↓
Animation
Target:
Narration
   ↓
"What does the viewer need to understand?"
   ↓
Visual metaphor / evidence
   ↓
Composition
   ↓
Camera
   ↓
Annotation
   ↓
Sound emphasis
   ↓
Narrative progression

That is the difference between AI-generated motion graphics and AI-assisted documentary editing.

My priority roadmap for R4Flutter/videogen
Phase 1 — Make the current renderer reliable
[1] Layout engine
[2] Text measurement
[3] Number fitting
[4] Caption collision prevention
[5] Safe zones
[6] Transition clipping fix
[7] Audio normalization
Phase 2 — Make it look professional
[8] 2.5D camera
[9] semantic camera paths
[10] editorial image staging
[11] document animation
[12] collage animation
[13] map choreography
[14] diagram choreography
Phase 3 — Make it genuinely long-form
[15] VoxEssay
[16] chapters
[17] sequences
[18] visual rhythm
[19] visual escalation
[20] callbacks
[21] chapter transitions
Phase 4 — Make it intelligent
[22] VisualPlanner
[23] AssetPlanner
[24] MotionPlanner
[25] CaptionPlanner
[26] AudioPlanner
[27] Timeline JSON
[28] automated QC
One sentence diagnosis

compound.mp4 has a strong Vox-inspired design system, but right now it is fundamentally an animated editorial slideshow—not yet a professional long-form documentary—because the layout engine is unsafe, captions duplicate the visuals, numbers overflow, audio is severely under-leveled, visual variety is too low, and the system lacks a true long-form editorial director.

And the good news is: you don't need to rebuild the project. Your existing Remotion architecture and 15-module vocabulary are actually a very good foundation.

The next move I'd make is not another prompt. I'd refactor your project around LayoutSlots + CaptionPolicy + VoxEssay + VisualPlan, then fix the concrete Stat/Funnel/KineticText/Turn bugs. That would give you a massive jump in quality.