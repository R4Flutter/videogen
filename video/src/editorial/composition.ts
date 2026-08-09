// The composition vocabulary. Every beat stages in one of these layouts;
// the layout decides where the kicker, headline, visual and annotation live
// on the page. Before this file, every module hand-picked its own coordinates
// and the result was one composition repeated — paper + orange accent + text
// + image + camera move. The 12 layouts below are the page-grammar a Vox
// explainer actually uses.
//
// A composition is a *constraint*, not a *drawing*. It names the bands the
// module should occupy, the role of the visual on the page, and the type of
// motion that suits the layout. The module then draws inside those bands,
// which is the same job it was always doing — but now from a plan that
// varied, instead of from a hard-coded "centre" it had to break to fit a
// different beat.
import type { DepthRole } from "./depth.ts";

/** The composition families. Names are descriptive, not technical — the
 *  director picks one because the story has changed, not because a
 *  keyword fired. */
export type Composition =
  | "HERO_CENTER"
  | "LEFT_TEXT_RIGHT_VISUAL"
  | "RIGHT_TEXT_LEFT_VISUAL"
  | "FULL_BLEED_SUBJECT"
  | "DOCUMENT_FOCUS"
  | "DIAGRAM_DOMINANT"
  | "TWO_COLUMN_COMPARE"
  | "MAP_DOMINANT"
  | "STACKED_EVIDENCE"
  | "CLOSE_DETAIL"
  | "COLLAGE_OVERLAP"
  | "TYPE_ONLY";

/** A composition's plan for the page. Bands are fractions of the canvas, the
 *  way `BAND` in vox/layout.ts already is — so a composition composes with
 *  the layout grid instead of fighting it. `visual` and `type` are roles:
 *  which plane each side of the page belongs to. */
export type CompositionPlan = {
  id: Composition;
  /** Where the type sits on the page, as a band name. The module reads this
   *  and lays its kicker/headline into the matching band. */
  typeBand: "left" | "right" | "top" | "bottom" | "centre" | "full";
  /** Where the visual sits. Compositions can have two visuals (a hero
   *  subject and a supporting plate) — the second slot is for those. */
  visualBand: "left" | "right" | "top" | "bottom" | "centre" | "full" | "off";
  /** Optional second visual. Two-column compare and stack-of-evidence use it. */
  visualBand2?: "left" | "right" | "top" | "bottom" | "centre";
  /** The depth role the visual occupies. A HERO_CENTER visual is on the
   *  subject plane; a FULL_BLEED is the foreground. Modules use this to
   *  decide whether to take the camera exactly (subject) or as a parallaxed
   *  near-plane (foreground). */
  visualRole: DepthRole;
  /** Whether the type runs in a sidebar (compact, left- or right-aligned)
   *  or fills the page. A sidebar type can run with the visual on the
   *  other half; a full type replaces the visual. */
  typeStyle: "sidebar" | "full" | "overlay" | "none";
  /** Whether the camera moves at all on this composition. A HERO_CENTER
   *  composition holds; a FULL_BLEED pushes; a CLOSE_DETAIL reveal-pushes. */
  cameraMode: "hold" | "push" | "pull" | "reveal" | "follow";
  /** The annotation slot for this composition. "off" means the beat is too
   *  busy for one; "auto" leaves the call to the module. */
  annotationSlot: "auto" | "left" | "right" | "top" | "bottom" | "off";
  /** A textual description the director can hand to a human. */
  description: string;
};

/** The catalogue. Adding a new composition is a one-line change; the
 *  renderer needs no edits, because the renderer reads the plan and the
 *  plan is data. */
export const COMPOSITIONS: Record<Composition, CompositionPlan> = {
  HERO_CENTER: {
    id: "HERO_CENTER",
    typeBand: "centre",
    visualBand: "centre",
    visualRole: "subject",
    typeStyle: "full",
    cameraMode: "hold",
    annotationSlot: "off",
    description: "The thing in the middle of the page. Hero beat, no annotation, hold the camera.",
  },
  LEFT_TEXT_RIGHT_VISUAL: {
    id: "LEFT_TEXT_RIGHT_VISUAL",
    typeBand: "left",
    visualBand: "right",
    visualRole: "midground",
    typeStyle: "sidebar",
    cameraMode: "push",
    annotationSlot: "right",
    description: "Type on the left, visual on the right. The default explainer layout.",
  },
  RIGHT_TEXT_LEFT_VISUAL: {
    id: "RIGHT_TEXT_LEFT_VISUAL",
    typeBand: "right",
    visualBand: "left",
    visualRole: "midground",
    typeStyle: "sidebar",
    cameraMode: "push",
    annotationSlot: "left",
    description: "Visual on the left, type on the right. Mirrored when the lead photo reads R→L.",
  },
  FULL_BLEED_SUBJECT: {
    id: "FULL_BLEED_SUBJECT",
    typeBand: "bottom",
    visualBand: "full",
    visualRole: "foreground",
    typeStyle: "overlay",
    cameraMode: "push",
    annotationSlot: "auto",
    description: "The subject fills the frame; the headline sits on a paper band below.",
  },
  DOCUMENT_FOCUS: {
    id: "DOCUMENT_FOCUS",
    typeBand: "top",
    visualBand: "centre",
    visualRole: "subject",
    typeStyle: "full",
    cameraMode: "reveal",
    annotationSlot: "auto",
    description: "A document is the subject. Camera settles onto it; annotation marks the line.",
  },
  DIAGRAM_DOMINANT: {
    id: "DIAGRAM_DOMINANT",
    typeBand: "top",
    visualBand: "centre",
    visualRole: "subject",
    typeStyle: "full",
    cameraMode: "hold",
    annotationSlot: "auto",
    description: "A diagram owns the frame. The headline above names the argument.",
  },
  TWO_COLUMN_COMPARE: {
    id: "TWO_COLUMN_COMPARE",
    typeBand: "top",
    visualBand: "left",
    visualBand2: "right",
    visualRole: "subject",
    typeStyle: "full",
    cameraMode: "compare",
    annotationSlot: "off",
    description: "Two quantities, one axis, one beat. The headline names the gap.",
  },
  MAP_DOMINANT: {
    id: "MAP_DOMINANT",
    typeBand: "bottom",
    visualBand: "full",
    visualRole: "midground",
    typeStyle: "overlay",
    cameraMode: "push",
    annotationSlot: "auto",
    description: "A map is the page. Camera closes on the subject region.",
  },
  STACKED_EVIDENCE: {
    id: "STACKED_EVIDENCE",
    typeBand: "top",
    visualBand: "centre",
    visualBand2: "bottom",
    visualRole: "subject",
    typeStyle: "full",
    cameraMode: "hold",
    annotationSlot: "auto",
    description: "Two evidence pieces, stacked. The eye reads down, then across.",
  },
  CLOSE_DETAIL: {
    id: "CLOSE_DETAIL",
    typeBand: "off",
    visualBand: "full",
    visualRole: "foreground",
    typeStyle: "none",
    cameraMode: "reveal",
    annotationSlot: "auto",
    description: "A close-up that the camera pushed into. No type — the visual carries the beat.",
  },
  COLLAGE_OVERLAP: {
    id: "COLLAGE_OVERLAP",
    typeBand: "bottom",
    visualBand: "full",
    visualRole: "midground",
    typeStyle: "overlay",
    cameraMode: "hold",
    annotationSlot: "auto",
    description: "Several clippings overlap. The headline sits on a paper band.",
  },
  TYPE_ONLY: {
    id: "TYPE_ONLY",
    typeBand: "centre",
    visualBand: "off",
    visualRole: "subject",
    typeStyle: "full",
    cameraMode: "push",
    annotationSlot: "off",
    description: "Words are the visual. The beat earns a moment of no imagery.",
  },
};

/** The default composition per module. The director can override per beat;
 *  the module's default is what beats get when no override is written. */
export const COMPOSITION_BY_MODULE: Record<string, Composition> = {
  kinetic: "TYPE_ONLY",
  stat: "HERO_CENTER",
  chart: "DIAGRAM_DOMINANT",
  compare: "TWO_COLUMN_COMPARE",
  timeline: "DIAGRAM_DOMINANT",
  icon: "LEFT_TEXT_RIGHT_VISUAL",
  quote: "DOCUMENT_FOCUS",
  doodle: "FULL_BLEED_SUBJECT",
  footage: "FULL_BLEED_SUBJECT",
  callout: "CLOSE_DETAIL",
  trace: "DIAGRAM_DOMINANT",
  trust: "STACKED_EVIDENCE",
  funnel: "DIAGRAM_DOMINANT",
  map: "MAP_DOMINANT",
  collage: "COLLAGE_OVERLAP",
};

/** The composition for a beat, with the director's override applied. */
export const compositionFor = (
  module: string,
  override: Composition | undefined,
): CompositionPlan => COMPOSITIONS[override ?? COMPOSITION_BY_MODULE[module] ?? "HERO_CENTER"];
