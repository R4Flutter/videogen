"""The single source of truth for every image prompt in the scam documentary.

Replaces the one-line collage stubs: each beat now gets a fully art-directed
prompt written against the world-class editorial documentary visual system
(Vox master style). Rules enforced here, by hand, per prompt:

  * ONE hero occupying ~65-75% of the frame, max 2-3 supporting elements.
  * Color proportions ~70% warm off-white paper, 20% charcoal / grayscale
    photographic cutouts, 10% ONE dominant accent (mustard, deep red,
    institutional blue).
  * No text, no lettering, no numbers, no labels, no arrows, no fake charts
    baked in - the engine renders its own type. Negative-space zones are
    left explicitly for Remotion's typography and motion.
  * No faces, no real names, no people except anonymous hands or paper
    silhouettes. No words that would draw the crime itself (see CHARGED in
    fetch-footage.py - prompts here must survive that filter).
  * Elements are isolated with clean negative space so a motion designer can
    move them independently (crossfades, slide-ins, animated connector lines).

The fetch tool appends the master STYLE_LOCK suffix to each prompt.
"""

# The script these prompts were written against. They are keyed by *that*
# story's beat numbers, so pointing them at any other script silently paints
# beat 2's doorstep onto whatever beat 2 happens to be now. fetch-footage.py
# checks this before it consults the table.
#
# A new story does not extend this file. It art-directs in its own script, in
# `| **Image Prompt:** | ... |` rows on the beats that want one — art direction
# belongs to the story that owns it.
CURATED_FOR = "story.txt"

# beat n -> detailed art-directed prompt. Beats without a prompt (1, 30, 36,
# 38) are kinetic frames - no image.
PROMPTS = {
    2: (
        "A quiet middle-class suburban front entrance viewed almost perfectly straight-on. "
        "The slightly open front door is the dominant hero structure, occupying about 65 percent "
        "of the frame, warm wood tones and neat white trim. A small doorbell camera sits beside "
        "the doorframe at eye level. One unmarked manila envelope rests on the doorstep, partially "
        "unfolded, a neat stack of folded banknotes visible inside. A simplified paper-cut "
        "silhouette of a suburban house stands behind the entrance. A single rectangular field of "
        "deep mustard-yellow sits behind the envelope. The right 35 percent of the frame is "
        "intentionally sparse and empty. No arrows, no labels, no captions, no generated text. "
        "Every element isolated with clean negative space so a motion designer can move them "
        "independently."
    ),
    3: (
        "A cut-paper composition of a hand in a dark suit sleeve passing a neat stack of folded "
        "banknotes through a doorway, the exchange frozen mid-motion, seen from inside looking out. "
        "The doorway frame dominates the left two thirds in warm charcoal tones. The stack of "
        "folded cash is the hero object, crisp and centered, slightly oversized. A torn fragment "
        "of a printed legal form with blank ruled lines floats in the upper right corner as a "
        "supporting element. One deep-red rectangular accent strip sits behind the cash. The "
        "bottom and right portions of the frame stay empty with generous negative space for "
        "typography. No arrows, no labels, no text, no faces. Flat frontal editorial perspective, "
        "isolated elements for independent motion."
    ),
    4: (
        "A single over-engineered paper-cut gear mechanism is the centerpiece, occupying roughly "
        "65 percent of the frame, its interlocking wheels and axles rendered as layered paper in "
        "charcoal, warm gray and off-white. A vintage rotary telephone receiver cut out in "
        "monochrome sits far left, small in scale. A folded bundle of banknotes sits far right, "
        "equally small. The left-to-right relationship between them is communicated purely by "
        "position and scale, with no arrows and no connector lines. Wide corridors of clean "
        "negative space separate the three objects so animated connector lines can be drawn in "
        "later. A flat mustard-yellow geometric field sits behind the gear mechanism. One subtle "
        "deep-red accent dot near the center serves as an animation anchor. The upper third of "
        "the frame is empty, reserved for typography. No text, no labels, no faces."
    ),
    5: (
        "A long quiet back-office call center at night, rendered as an editorial composition of "
        "photographic cutouts on a flat off-white field. The room is the hero: rows of empty desks "
        "with telephone headsets receding in strong one-point perspective, occupying about 70 "
        "percent of the frame in muted charcoal tones. On the far wall, small paper sheets hang in "
        "a neat grid like script cheat-sheets. A tall whiteboard stands beside the door with "
        "abstract blank number blocks. A torn fragment of a world map with a small red pin floats "
        "in the upper left. Warm mustard-yellow geometric panels sit behind the desks. The "
        "foreground lower third stays empty for typography. No people, no faces, no text, no "
        "labels, no arrows."
    ),
    6: (
        "A paper-cut assembly line diagram in editorial information-graphic style. The hero is a "
        "horizontal conveyor made of three connected paper sections: a script page with blank "
        "ruled lines, a grid of telephone handset cutouts, and a row of banknote silhouettes, "
        "each section a different flat color, off-white, charcoal and mustard-yellow, together "
        "occupying 70 percent of the frame. A single deep-red gear sits at the central joint "
        "where the sections connect. Each paper section is cleanly separated by negative space "
        "so a motion designer can slide them apart. The upper quarter of the frame is empty for "
        "typography. No text, no lettering, no arrows, no labels, no faces, no people."
    ),
    7: (
        "A vast flat grid of small charcoal dots fills the frame, each dot slightly raised like "
        "a printed braille pattern, occupying about 75 percent of the composition on a warm "
        "off-white background. One single dot near the center is bright warm red, clearly larger, "
        "the only colored element in the grid, the hero of the image. A torn paper corner "
        "overlaps the top left edge. A faint magnifying-glass circle frames the red dot, drawn "
        "as a thin charcoal ring, not a photorealistic lens. All other elements stay muted. The "
        "grid fades out gradually toward the bottom third of the frame, leaving negative space "
        "for typography. No text, no labels, no arrows, no faces."
    ),
    8: (
        "A single rotary telephone handset rendered as a paper cutout, standing upright like a "
        "character, is the hero, occupying 65 percent of the frame in charcoal and off-white. "
        "The handset wears a theatrical paper masquerade mask, deep red, tied with thin ribbons, "
        "the mask clearly decorative and not a face. Behind it, a tall column of small blank "
        "paper rectangles suggests a list of phone numbers, unmarked. A mustard-yellow flat "
        "field sits behind the telephone. The mask is the only saturated color. The left third "
        "of the frame is empty negative space for typography. No face, no person, no text, no "
        "lettering, no arrows, no labels."
    ),
    9: (
        "A paper-cut funnel diagram is the hero, a wide top opening into a single narrow "
        "channel, built from layered off-white and charcoal paper, occupying 70 percent of the "
        "frame. A single folded banknote enters the wide top, and below the funnel's narrow end "
        "a short column of identical paper coins stacks up. The flow is implied by size and "
        "position only, with no arrows. A flat mustard-yellow geometric field sits behind the "
        "funnel. A torn receipt fragment with blank ruled lines floats at the lower right as a "
        "minor supporting element. The upper left third of the frame stays empty for typography. "
        "No text, no labels, no faces, no arrows."
    ),
    10: (
        "An oversized flat paper dartboard is the hero, occupying 65 percent of the frame, "
        "rendered in concentric off-white, charcoal and warm-gray rings on a warm off-white "
        "background. The central bullseye is deep red. A rotary telephone handset cutout lies "
        "across the dartboard, dramatically large compared to the board, like a darted object. "
        "A small paper stack of blank personal-profile cards sits in the lower left corner, "
        "muted. The board floats with generous negative space on all sides, the top third empty "
        "for typography. No text, no lettering, no numbers, no arrows, no labels, no faces."
    ),
    11: (
        "A quiet domestic kitchen corner rendered in warm archival photography with muted "
        "film-grain tones, the scene of a house that has stood still for decades. The hero is a "
        "vintage rotary landline telephone sitting on a wooden kitchen counter, occupying 70 "
        "percent of the frame, its cord curling loosely. A torn paper calendar page with a "
        "single blank circled square floats in the upper right as a cutout element. A small "
        "round wall clock hangs blurred in the far background. Warm amber afternoon light falls "
        "from a window on the left. The lower third of the frame stays clear for typography. No "
        "people, no faces, no text, no lettering, no labels, no arrows."
    ),
    12: (
        "A full-frame editorial background for a messaging scene: a large paper speech bubble "
        "cutout floats left of center, its tail pointing downward, rendered in warm off-white "
        "with a soft charcoal outline, occupying 60 percent of the frame. A second smaller "
        "speech bubble overlaps it at the bottom right. A rotary telephone handset cutout in "
        "charcoal sits in the lower left corner. A torn manila envelope with a folded edge "
        "rests at the very bottom center. The background is a warm off-white paper field with a "
        "single mustard-yellow geometric band across the lower third. The upper right quarter "
        "of the frame is empty and uncluttered, leaving room for interface elements. No text, "
        "no faces, no arrows, no labels."
    ),
    13: (
        "A cut-paper composition of a hand holding a fountain pen over a large blank paper "
        "speech bubble, the pen about to write, the bubble occupying 65 percent of the frame in "
        "off-white with a charcoal outline. A small blank rectangular name-tag cutout lies "
        "beside the bubble, empty. A rotary telephone handset rests in the bottom right corner, "
        "small and muted. The composition is clean and quiet, warm off-white and charcoal with "
        "one deep-red pen accent. A flat mustard-yellow panel sits behind the speech bubble. "
        "The bottom third of the frame is clear negative space for typography. No text, no "
        "lettering, no words, no faces, no arrows, no labels."
    ),
    14: (
        "A formal editorial composition of a judge's wooden gavel resting on a sound block, the "
        "hero, occupying 65 percent of the frame as a photographic cutout in warm wood tones on "
        "a flat off-white field. A rotary telephone handset lies beside the gavel, smaller, in "
        "charcoal monochrome. A dark robe silhouette hangs in the background, simplified and "
        "empty. A torn strip of a legal form with blank ruled lines floats at the top right. A "
        "deep-blue geometric panel sits behind the gavel. The lower third of the frame is clear "
        "for typography. No person, no face, no text, no lettering, no labels, no arrows."
    ),
    15: (
        "A full-frame editorial background for a payment scene: a torn manila envelope spills a "
        "neat stack of folded banknotes across the lower center of the composition, the cash the "
        "hero, crisp and well lit on warm off-white paper. A blank torn receipt fragment floats "
        "above the cash with empty ruled lines, muted. A single deep-red rectangular seal strip "
        "sits at the top center as a warning accent, blank. The upper two thirds of the frame "
        "stay minimal and open for a user interface overlay. No text, no numbers, no lettering, "
        "no faces, no arrows, no labels."
    ),
    16: (
        "A full-frame editorial background for a messaging scene: a delivery van silhouette "
        "rendered as a flat paper cutout in charcoal occupies the lower right, medium size, "
        "with a single cardboard package cutout beside it in warm kraft tones. A thin dotted "
        "route line with one small pin marker crosses the off-white field from the left edge to "
        "the van, drawn as a minimal charcoal dotted path, purposeful. A flat mustard-yellow "
        "geometric band sits behind the van. The upper left half of the frame is open and empty "
        "for an interface overlay. No text, no lettering, no faces, no arrows, no labels, no "
        "people."
    ),
    17: (
        "A paper chain of linked envelopes and banknotes stretches diagonally across the frame, "
        "the hero, each link a clean paper cutout alternating manila envelope and charcoal "
        "banknote silhouette, occupying 70 percent of the composition on a warm off-white field. "
        "Every link is identical, suggesting interchangeable parts, connected by neat "
        "rectangular paper joints. A large flat gear cutout overlaps the chain at its center, "
        "deep red, the only saturated element. Generous negative space surrounds the chain at "
        "top and bottom for typography. No text, no faces, no arrows, no labels."
    ),
    18: (
        "A single worn canvas duffel bag cutout is the hero, centered, occupying 65 percent of "
        "the frame in muted olive-charcoal tones, its top unzipped showing a neat row of folded "
        "banknote edges. A small flat screen cutout floats to the right of the bag, blank and "
        "unmarked, suggesting a device screen. A single golden coin cutout hovers above the "
        "bag, the only warm accent. The composition sits on a flat off-white field with a "
        "deep-blue geometric panel behind the bag. The top third of the frame is empty for "
        "typography. No text, no numbers, no lettering, no faces, no arrows, no labels."
    ),
    19: (
        "A bank building silhouette rendered as a flat architectural paper cutout in charcoal, "
        "the hero, occupying 65 percent of the frame, with tall columns and a pediment in a "
        "simplified frontal elevation. A torn receipt fragment with blank ruled lines floats in "
        "front of the bank at the lower left. A thin charcoal warning-triangle outline, empty, "
        "sits at the upper right corner as a supporting element. A flat off-white paper field "
        "with a restrained mustard-yellow band across the bottom. The right third of the frame "
        "stays open for typography. No text, no lettering, no faces, no people, no arrows, no "
        "labels."
    ),
    20: (
        "An empty highway at night seen from a low frontal angle, long exposure light trails "
        "streaking toward the viewer, rendered as an archival photograph with film grain, the "
        "full frame the hero. A flat paper-cut car silhouette in charcoal sits small at the "
        "bottom left edge, isolated, suggesting motion. A small server-tower cutout floats in "
        "the upper right corner, muted, almost abstract. The sky is deep charcoal with a wide "
        "negative band at the top for typography. Muted amber and white light trails are the "
        "only color. No people, no faces, no text, no lettering, no labels, no arrows."
    ),
    21: (
        "Two paper machines face each other across the frame, the hero composition. The left "
        "machine is built from telephone handsets and jagged dark paper shapes, charcoal and "
        "deep red, suggesting panic. The right machine is built from smooth blank rectangles "
        "and a folded paper heart, off-white and mustard-yellow, calm and pleasant. Each "
        "machine occupies 35 percent of the frame, separated by a wide empty corridor of "
        "negative space in the center, 30 percent, reserved for typography and motion. A single "
        "flat off-white field behind both. No text, no labels, no faces, no arrows."
    ),
    22: (
        "A single smartphone cutout is the hero, centered, occupying 60 percent of the frame, "
        "rendered in flat charcoal with a large blank screen. A small paper speech bubble "
        "floats above the phone, a question mark outline drawn as one clean stroke the only "
        "mark on it. A torn manila envelope edge overlaps the bottom left corner. A folded "
        "paper heart cutout, deep red, floats to the right of the phone at a distance, "
        "suggesting a growing connection. A flat warm off-white field behind, one mustard-yellow "
        "panel behind the phone. The top and bottom thirds of the frame are empty for "
        "typography. No text, no faces, no arrows, no labels."
    ),
    23: (
        "A full-frame editorial background for a messaging scene: two large paper speech "
        "bubbles float in the upper center, one off-white with a charcoal outline and one "
        "smaller and lighter, tails pointing at each other, forming a gentle back-and-forth "
        "rhythm, occupying 55 percent of the frame. A single folded paper heart cutout in muted "
        "red sits at the lower right, small. A rotary telephone handset cutout rests at the "
        "very bottom left in charcoal. The background is a warm off-white paper field with a "
        "soft mustard-yellow band at the bottom. The lower two thirds stay open for an "
        "interface overlay. No text, no faces, no arrows, no labels."
    ),
    24: (
        "A full-frame editorial background for a finance scene: a rising paper bar chart built "
        "of neat charcoal and off-white bars ascends the right side, the hero, each bar a clean "
        "cutout. A smartphone cutout with a blank screen stands at the left, smaller, angled "
        "toward the chart. A single golden coin cutout sits at the base of the chart. A flat "
        "mustard-yellow geometric field covers the upper left. The bottom third of the frame is "
        "clear for an interface overlay. No text, no numbers, no lettering, no faces, no "
        "arrows, no labels."
    ),
    25: (
        "A single large smartphone cutout is the hero, centered, occupying 65 percent of the "
        "frame in charcoal, its screen blank and smooth. Floating in front of the screen: a "
        "small blue checkmark badge cutout, a small shield outline, and a padlock outline, each "
        "a clean flat paper shape arranged in a neat diagonal row. The badge is the only "
        "saturated color, bright institutional blue. A flat off-white field behind with a "
        "deep-blue panel. The top third of the frame is empty for typography. No text, no "
        "lettering, no numbers, no faces, no arrows, no labels."
    ),
    26: (
        "A full-frame editorial background for a finance scene: a blank paper bank deposit slip "
        "cutout sits at the center with clean ruled lines and no markings, occupying 50 percent "
        "of the frame. A rising diagonal stack of three coins, small, gold and charcoal, climbs "
        "from the bottom left toward the slip. A single warm-red upward tick mark outline "
        "floats above the slip as the hero accent, a clean minimal stroke. A flat warm off-white "
        "field with a mustard-yellow band at the bottom. The lower and upper thirds stay open "
        "for an interface overlay. No text, no numbers, no lettering, no faces, no arrows, no "
        "labels."
    ),
    27: (
        "A torn paper calendar page is the hero, centered, occupying 60 percent of the frame, "
        "showing a clean ruled grid of blank squares, one square circled with a thin outline. A "
        "small paper envelope cutout travels toward the circled square along a thin dotted path "
        "from the page edge, a single minimal charcoal line. A small round clock face cutout "
        "without hands floats at the upper right, charcoal. A flat mustard-yellow geometric "
        "field behind the calendar page. The bottom third of the frame is empty for typography. "
        "No text, no numbers, no lettering, no faces, no arrows, no labels."
    ),
    28: (
        "A full-frame editorial background for a finance scene: a stack of torn paper receipt "
        "fragments grows diagonally across the frame from the lower left, each fragment a clean "
        "off-white cutout with blank ruled lines, the stack the hero, occupying 55 percent of "
        "the frame. A single charcoal banknote silhouette rests on top of the stack. A small "
        "deep-red rectangular stamp outline floats above the stack, blank, as an accent of "
        "urgency. A flat warm off-white field with a muted mustard band at the top. The lower "
        "two thirds stay open for an interface overlay. No text, no numbers, no lettering, no "
        "faces, no arrows, no labels."
    ),
    29: (
        "A full-frame editorial background for a finance scene: a long climbing paper line "
        "chart is the hero, a single continuous charcoal paper ribbon ascending from lower left "
        "to upper right across 70 percent of the frame, gentle and steady. Small blank "
        "calendar-page squares float along the line at even intervals like data points. A "
        "folded banknote silhouette rests at the line's peak, upper right. A flat warm off-white "
        "field with a mustard-yellow band across the bottom. The bottom third stays open for an "
        "interface overlay. No text, no numbers, no lettering, no faces, no arrows, no labels."
    ),
    31: (
        "A towering bar chart built from stacked paper banknote silhouettes is the hero, "
        "occupying 70 percent of the frame, each bar a neat column of identical charcoal and "
        "off-white banknote cutouts rising to different heights like a city skyline. A single "
        "deep-red bar stands tallest at the center, the only saturated element. A flat globe "
        "cutout, simplified with latitude lines, floats at the base on the left. A blank folder "
        "cutout sits at the base on the right. A warm off-white field behind. The top quarter "
        "of the frame is empty for typography. No text, no numbers, no lettering, no faces, no "
        "arrows, no labels."
    ),
    32: (
        "A flat world map cutout in muted paper tones is the hero, occupying 70 percent of the "
        "frame as a simplified continent silhouette on a warm off-white field. Three thin "
        "charcoal route lines with small pin markers cross the map between continents, each "
        "line a clean minimal stroke with no arrowheads. A small clock face cutout without "
        "hands floats in the upper right corner. A short paper chain of three linked envelope "
        "cutouts runs along the bottom edge, small. The top left quarter of the frame is empty "
        "for typography. No text, no labels, no faces, no arrows."
    ),
    33: (
        "A large blueprint-style composition is the hero: a telephone handset drawn as a "
        "technical line drawing in charcoal on an off-white paper sheet, occupying 70 percent "
        "of the frame, with thin measurement marks and a small ruled detail grid beside it. A "
        "flat target-reticle ring outline floats at the upper left. A simple shield outline "
        "sits at the lower right. The line work is precise and clean, editorial "
        "information-graphic style. A flat mustard-yellow geometric panel sits behind the "
        "blueprint sheet. The bottom third of the frame is empty for typography. No text, no "
        "numbers, no lettering, no faces, no arrows, no labels."
    ),
    34: (
        "A giant paper question mark cutout stands like a monolith, the hero, occupying 70 "
        "percent of the frame, rendered in charcoal on a warm off-white field, its curve thick "
        "and solid. A small rotary telephone handset cutout sits at its base, small in scale, "
        "in muted red, the only saturated accent. A neat row of small blank paper blocks lines "
        "the bottom edge like building blocks. The question mark is slightly tilted as if it "
        "could topple. Wide negative space surrounds the monolith, the left third empty for "
        "typography. No text, no lettering, no faces, no arrows, no labels."
    ),
    35: (
        "A single hand pressing a rotary telephone handset down onto its cradle, the gesture "
        "the hero, a photographic cutout in muted charcoal tones occupying 65 percent of the "
        "frame, the motion frozen mid-press. A small rectangular bank card cutout with blank "
        "surfaces floats beside the handset, tilted, one clean card. A thin closed-loop outline "
        "above the phone suggests a completed action, drawn as a minimal stroke. A flat warm "
        "off-white field with a mustard-yellow panel behind the phone. The top third of the "
        "frame is empty for typography. No faces, no text, no lettering, no numbers, no arrows, "
        "no labels."
    ),
    37: (
        "A closed paper folder cutout is the hero, centered, occupying 60 percent of the "
        "frame, warm manila tones, a small blank white label on its face. A paper megaphone "
        "cutout in charcoal points toward the folder from the upper right, small and abstract. "
        "A folded paper heart cutout, deep red, sits at the lower left, small. An envelope "
        "cutout with a blank rectangular stamp outline floats at the upper left. A flat warm "
        "off-white field with a deep-blue band at the bottom. The bottom third of the frame is "
        "empty for typography. No text, no lettering, no faces, no arrows, no labels."
    ),
}
