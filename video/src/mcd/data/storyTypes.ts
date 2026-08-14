// The contract a business-documentary story must satisfy. A story is a list
// of typed scenes — the engine stages whatever scene types the story names,
// in whatever order. Nothing about the arc, the count or the durations is
// hardcoded: scenes carry their own narration, and the timeline engine
// derives every duration from it.

export type SceneType =
  | "hook"
  | "global"
  | "map"
  | "money"
  | "model"
  | "chart"
  | "finale"
  | "title"
  | "reveal"
  | "document"
  | "svg"
  | "hero"
  | "slide"
  | "broll";

// A text line may be a plain string, or a list of parts (for accents).
export type StoryTextPart = string | { text: string; accent?: boolean };
export type StoryLine = string | StoryTextPart[];

// Per-scene edit override. Without it the director picks a varied camera
// move from the yt_scrapper editing rules; `camera` pins the move and
// `intensity` (0..1) scales its travel.
export type SceneEdit = {
  camera?: "pushIn" | "pullOut" | "panLeft" | "panRight" | "panUp" | "panDown" | "drift" | "static" | "punch" | "orbit";
  intensity?: number;
  // Raises the static-shot cap for THIS scene only (seconds). Bounded by the
  // story's mode: MAX_SCENE_SEC normally, LONG_FORM_MAX_SCENE_SEC when the
  // story sets `longForm`. Use for a beat that must breathe, not for filler.
  maxSec?: number;
  // Extra seconds of hold after this scene's narration ends. Same meaning as
  // the scene-level `hold`, kept here so the story can carry all edit knobs
  // in one place. The mux schedules a punch cue at hold start (>= 1s holds).
  holdSec?: number;
};

// Which glyph the business-model node draws. Roles map to a small stroke-icon
// library (components/NodeIcon.tsx) — add roles there when a story needs one.
export type NodeRole =
  | "customer"
  | "store"
  | "partner"
  | "brand"
  | "supplier"
  | "cash"
  | "factory"
  | "tech"
  | "device"
  | "cloud"
  | "people"
  | "platform";

export type RegionId = string;

export type HubLink = {
  region: RegionId;
  name: string;
  cell: [number, number];
  controls: [[number, number], [number, number]];
};

export type Hero = {
  src?: string;
  kind?: "monogram" | "phone" | "image";
  width: number;
  height: number;
  position?: "left" | "right";
};

// A counter step timed as a fraction (0..1) of the scene's duration — the
// story says *when* the milestone lands, the engine says how long that is.
export type CounterStep = { value: number; at: number };

// ---------------------------------------------------------------- scene data

export type HookData = {
  kicker: string;
  lines: StoryLine[];
  accentLine: number;
  hero?: Hero;
};

export type GlobalData = {
  finalCount: number;
  headline: string;
  kicker: string;
};

export type MapData = {
  regionOrder: RegionId[];
  regionLabel?: Record<RegionId, string>;
  regionLabelCell?: Record<RegionId, [number, number]>;
  hubOrigin: { name: string; cell: [number, number] };
  hubs: HubLink[];
  title: { kicker: string; lines: StoryLine[] };
};

export type MoneyData = {
  kicker: string;
  steps: CounterStep[];
  finalLabel: string;
  overline: string;
  barLabel: string;
  barAt: number;
  barDurationSec: number;
};

export type ModelData = {
  kicker: string;
  nodes: { title: string; sub: string; role: NodeRole }[];
  flowNotes: string[];
  payoffOverline: string;
  payoffValue: string;
  payoffNote: string;
};

export type ChartData = {
  kicker: string;
  valuePrefix: string;
  valueSuffix: string;
  data: { label: string; value: number }[];
  insightKicker: string;
  insight: string;
  annotationNote: string;
  footnote: string;
};

export type FinaleData = {
  montage: {
    mapLabel: string;
    revenueLabel: string;
    businessLabel: string;
    networkLabel: string;
  };
  line1: { kicker: string; lines: StoryLine[] };
  line2: { lines: StoryLine };
  footer: string;
};

export type TitleData = {
  kicker: string;
  lines: StoryLine[];
};

export type RevealData = {
  kicker: string;
  lines: StoryLine[];
  value?: string;
  suffix?: string;
  note?: string;
};

// A document beat: statement rows, contract, calendar or court-filing page.
// Spec from the V2 engine's paper compositions (engine/scenes/*.mjs):
// the statement staggers rows in with a tick each, the contract/filing page
// reads like ruled text with a gold highlight, the calendar circles a day.
export type DocumentData = {
  kicker: string;
  docType: "statement" | "contract" | "calendar" | "filing";
  // Title line inside the paper page (e.g. "MONTHLY STATEMENT").
  header?: string;
  // Sub-line under the header (e.g. "MARCH 2025").
  subheader?: string;
  // statement: ledger rows. `recurring` rows get a green wash + RECURRING tag.
  rows?: { date?: string; name: string; amount: string; recurring?: boolean }[];
  // contract / filing: body lines — each renders as a ruled text block.
  body?: string[];
  // calendar: month label and the circled day.
  month?: string;
  day?: number;
  // Total line at the bottom of a statement (label left, value right).
  totalLabel?: string;
  totalValue?: string;
  // Rotated outline stamp that lands over the page (e.g. "RECURRING",
  // "NO FEDERAL RULE"). Pops in with an impact cue.
  stamp?: string;
  stampColor?: string;
  footnote?: string;
};

// A scene that renders an inline SVG artwork with the full camera/motion
// treatment. The V2 engine's storyboard SVGs (engine/scenes/*.mjs) are the
// spec: same 1920×1080 world, cream/ink/green/gold palette, editorial flat
// vector style. The story inlines the SVG string; the scene scales it to
// fit the frame and animates it (spring-in + camera move + motion beats).
export type SvgData = {
  kicker: string;
  // Inline SVG markup. Must not contain <script>, event attributes or
  // external hrefs — the preflight (tools/story-preflight.mjs) rejects them.
  svg: string;
  // Optional caption line under the artwork.
  caption?: string;
  // Horizontal alignment of the artwork inside the frame.
  align?: "left" | "center" | "right";
  // Artwork width in 1920-world px (default 1500, centered).
  width?: number;
};

// -------------------------------------------------------------------- hero

// Semantic position names resolve through src/story/layout.ts — the layout
// engine recomposes them per aspect ratio; scenes never name pixels.
export type SemanticPosition =
  | "center"
  | "upper_center"
  | "lower_center"
  | "left"
  | "right"
  | "upper_left"
  | "upper_right"
  | "lower_left"
  | "lower_right"
  | "left_center"
  | "right_center"
  | "custom";

export type HeroMotion = {
  // Animation name (see src/story/motion.ts for the full vocabulary).
  type: string;
  // 0..1 — travel/scale intensity.
  intensity?: number;
  // Motion personality: snappy | heavy | elastic | cinematic | aggressive |
  // soft | mechanical. Different springs for different feels.
  personality?: string;
  // Spring back-past-the-target when true (slides land with a settle).
  overshoot?: boolean;
  // "beat:<name>" — the element animates when that beat fires.
  trigger?: string;
  // Extra scene-local frames before the entrance starts.
  delayFrames?: number;
  // Motion blur amount (px) while moving fast.
  blur?: number;
  // Duration in frames when the animation isn't spring-driven.
  durationFrames?: number;
};

export type HeroBeat = {
  name: string;
  // Scene-local fraction (0..1) where the beat fires.
  at: number;
  // 0..1 — scales emphasis (typography size, camera response).
  importance: number;
};

export type SlideData = {
  kicker: string;
  // The asset that glides across the canvas.
  subject: {
    // Asset ID from the asset registry.
    asset?: string;
    // "rtl" enters from the right and exits left (default feel);
    // "ltr" enters from the left and exits right.
    direction: "ltr" | "rtl";
    scale?: number;
    rotation?: number;
    // Vertical center of the asset as a canvas fraction (0..1).
    vertical?: number;
    // Asset box height as a fraction of the canvas height.
    heightFrac?: number;
  };
  // Headlines / numbers landing mid-glide on their beats.
  texts?: SlideTextLayer[];
  beats?: HeroBeat[];
};

export type SlideTextLayer = {
  text: string;
  position: SemanticPosition;
  anim: HeroMotion;
  role?: "headline" | "number" | "sub" | "kicker";
  accent?: boolean;
  custom?: { x: number; y: number; unit?: "px" | "fraction" };
};

export type BrollLine = {
  // The narration line the voice reads while this asset is on screen.
  text: string;
  // Asset ID shown while this line is spoken.
  asset?: string;
  // "rtl" slides in from the right and exits left (default), "ltr" the
  // reverse — the traversal continues in one direction line to line.
  direction?: "ltr" | "rtl";
  // Optional on-screen caption slammed when this line starts.
  caption?: string;
  // Asset box height as a fraction of the canvas height (per-line override).
  heightFrac?: number;
};

export type BrollData = {
  kicker: string;
  // One asset per narration line; each slides in when its line starts.
  lines: BrollLine[];
  // Vertical center of the assets as a canvas fraction (0..1).
  vertical?: number;
};

export type HeroTextLayer = {
  text: string;
  position: SemanticPosition;
  anim: HeroMotion;
  // Typographic emphasis: "headline" | "number" | "sub" | "kicker".
  role?: "headline" | "number" | "sub" | "kicker";
  accent?: boolean;
  custom?: { x: number; y: number; unit?: "px" | "fraction" };
};

export type HeroSubjectLayer = {
  // Asset ID from the asset registry — the planner resolves it to a path
  // under /public. Without one the engine draws a flat-vector fallback.
  asset?: string;
  kind?: "vehicle" | "object";
  position: SemanticPosition | "subject";
  // When position is "subject": x/y are fractions of the primary subject's
  // box (0..1). Otherwise a canvas position (see layout.ts).
  custom?: { x: number; y: number; unit?: "px" | "fraction" };
  // Which point of this layer's box is placed at the position
  // (fractions of this layer's box; default {0.5, 0.5}).
  anchor?: { x: number; y: number };
  // Display width in design px (reference: 1080-short-edge canvas).
  width?: number;
  // Fraction of the primary subject's width — overrides `width`.
  relativeWidth?: number;
  scale?: number;
  rotation?: number;
  entrance: HeroMotion;
  exit?: HeroMotion;
  // Effects layered over the subject: "speed_lines", "subtle_shadow".
  effects?: string[];
};

export type HeroData = {
  kicker: string;
  // The subject (vehicle / product / person illustration) entering the frame.
  subject: {
    // Asset ID from the asset registry — the planner resolves it to a path
    // under /public. Without one the engine draws a flat-vector fallback.
    asset?: string;
    position: SemanticPosition;
    custom?: { x: number; y: number; unit?: "px" | "fraction" };
    // Display width in px (the layout may scale it for small screens).
    width: number;
    kind?: "vehicle" | "object";
    scale?: number;
    rotation?: number;
    entrance: HeroMotion;
    exit?: HeroMotion;
    // Effects layered over the subject: "speed_lines", "subtle_shadow".
    effects?: string[];
  };
  // Extra foreground layers (people on machines, props) entering on their
  // own beats — mounted to the subject box with `position: "subject"` or
  // placed freely on the canvas.
  subjects?: HeroSubjectLayer[];
  // Headlines / numbers / labels entering independently on their beats.
  texts?: HeroTextLayer[];
  // The scene's beat map (narration timestamps, planner-provided).
  beats: HeroBeat[];
  // Camera treatment: move + intensity, with impacts on high-importance
  // beats automatically.
  camera: {
    move: "push_in" | "pull_out" | "pan_left" | "pan_right" | "vertical_pan" | "micro_shake" | "whip_pan" | "parallax" | "dolly";
    intensity: number;
  };
};

export type SceneDataByType = {
  hook: HookData;
  global: GlobalData;
  map: MapData;
  money: MoneyData;
  model: ModelData;
  chart: ChartData;
  finale: FinaleData;
  title: TitleData;
  reveal: RevealData;
  document: DocumentData;
  svg: SvgData;
  hero: HeroData;
  slide: SlideData;
  broll: BrollData;
};

// ---------------------------------------------------------------- the scene

export type StoryScene = {
  [T in SceneType]: {
    id: string;
    type: T;
    // Lines to read over this scene. The engine derives the scene's duration
    // from their word count at the story's wpm, then clamps to the pacing
    // rules (8 s cap — or edit.maxSec / long-form cap when set).
    narration: string[];
    // Extra seconds of hold after the narration ends (default 0.5).
    hold?: number;
    energy?: number;
    pace?: number;
    // Optional edit override — otherwise the director decides per scene.
    edit?: SceneEdit;
    data: SceneDataByType[T];
  };
}[SceneType];

// ---------------------------------------------------------------- the story

export type RetentionDevice = {
  device: string;
  // Fraction of total runtime where this device should peak (0..1).
  at: number;
};

export type BusinessStory = {
  id: string;
  title: string;
  brand: string;

  // Words per minute for the narration → duration math. Finance docs read
  // at 165-180 wpm (yt_scrapper outlier analysis); 170 is the default.
  wpm?: number;

  // Long-form mode: raises the per-scene static-shot cap from 8 s to
  // ~25 s (progressively — the first 3 minutes stay tight at 8 s) so a
  // full multi-act script can render in one pass. The pacing gate loosens
  // to the long-form band. Set this only for 10+ minute pieces.
  longForm?: boolean;

  // Expected runtime of the finished video in seconds (the script's
  // spoken length — 19:14 → 1154). Preflight + QC compare the derived
  // timeline against it instead of silently reporting totalSeconds.
  targetSec?: number;

  // Declared scene count. When set, preflight hard-fails if the story's
  // scenes array doesn't match — the guard against a dropped act.
  declaredSceneCount?: number;

  // Hero object of the hook scene. `src` is a path under /public (e.g.
  // "hero/burger.png"); without it the engine draws a monogram block with
  // the brand's initial in the accent color. `kind` selects the vector
  // fallback: "monogram" (default) or "phone" (a generic device).
  hero: Hero;

  // Accent colors drive the whole palette (scene accent + secondary accent).
  theme: {
    accent: string;
    accentSecondary: string;
  };

  // Optional fullscreen photo backdrop per scene type (path under /public,
  // e.g. "bg/money.png"). Rendered behind the vector graphics with a slow
  // ken-burns drift and a cream wash so ink text stays readable.
  backdrops?: Partial<Record<SceneType, string>>;

  // Retention devices the script promises, as fractions of the runtime.
  // The timeline engine checks a scene boundary lands near each one.
  retention?: RetentionDevice[];

  // The arc: order, count, types and content of every scene. This array —
  // and only this array — is what the engine stages.
  scenes: StoryScene[];
};
