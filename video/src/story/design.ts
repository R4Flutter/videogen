// Centralized design configuration for the story engine — the single place
// where the editorial identity and motion defaults live. Scenes read from
// here (and from mcd/theme.ts tokens); nothing is hardcoded inside a scene.
//
// The identity: warm cream paper, charcoal ink, one accent. Excitement comes
// from composition, movement, typography and timing — never from decoration.

export const DESIGN = {
  background: "#F4F1EA",
  ink: "#1A1A1A",
  accent: "#16A34A",

  // Letter-spacing rhythm. Headlines set wide (editorial), body normal,
  // kickers widest — the same hierarchy the vox engine uses on paper.
  tracking: {
    headline: "0.01em",
    body: "0.01em",
    kicker: "0.34em",
  },

  // Typographic scale: sizes are fractions of the canvas short edge, so the
  // same scene JSON reads well at 1080×1920 and 1920×1080.
  type: {
    headline: 0.14,
    number: 0.3,
    sub: 0.045,
    kicker: 0.02,
    caption: 0.028,
  },

  // Safe zones as fractions of the canvas edge. Portrait is tighter: phone
  // UI (notch + swipe bar) eats the top and bottom.
  safe: {
    landscape: { top: 0.06, bottom: 0.06, left: 0.06, right: 0.06 },
    portrait: { top: 0.08, bottom: 0.13, left: 0.09, right: 0.09 },
    square: { top: 0.07, bottom: 0.07, left: 0.07, right: 0.07 },
  },

  motion: {
    // Defaults — parameterized per animation, these are only the baseline.
    durationInFrames: 22,
    fps: 30,
    defaultEasing: "arrive" as const,
    // How far a slide travels, as a fraction of the canvas width.
    slideDistance: 0.9,
    // How far the camera zooms for a push, at intensity 1.
    pushZoom: 0.12,
  },
} as const;

export type Design = typeof DESIGN;

// Motion personalities — every animation carries one. A personality is a
// spring tuning + travel/easing bias, so "heavy" never looks like "snappy".
export type Personality =
  | "snappy"
  | "heavy"
  | "elastic"
  | "cinematic"
  | "aggressive"
  | "soft"
  | "mechanical";

export type PersonalitySpec = {
  damping: number;
  stiffness: number;
  mass: number;
  // 0..1 — how far a slide's spring overshoots past the target.
  overshoot: number;
};

export const PERSONALITIES: Record<Personality, PersonalitySpec> = {
  // Fast, tight, one clean pop. For hooks and punch lines.
  snappy: { damping: 16, stiffness: 260, mass: 0.9, overshoot: 0.04 },
  // Slow, weighty, deep settle. For big objects and heavy reveals.
  heavy: { damping: 22, stiffness: 110, mass: 1.6, overshoot: 0.08 },
  // Loose, playful bounce. For playful or absurd beats.
  elastic: { damping: 9, stiffness: 170, mass: 1, overshoot: 0.16 },
  // Slow travel, graceful arrival. For camera glides and pulls.
  cinematic: { damping: 26, stiffness: 80, mass: 1.2, overshoot: 0.02 },
  // Hard, fast, slight violence. For slams and impacts.
  aggressive: { damping: 12, stiffness: 320, mass: 0.8, overshoot: 0.12 },
  // Gentle, calm, almost no bounce. For quiet exposition.
  soft: { damping: 26, stiffness: 120, mass: 1, overshoot: 0.02 },
  // Crisp, no overshoot at all. For documents, machines, data.
  mechanical: { damping: 30, stiffness: 420, mass: 1, overshoot: 0 },
};