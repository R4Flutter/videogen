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
  | "reveal";

// A text line may be a plain string, or a list of parts (for accents).
export type StoryTextPart = string | { text: string; accent?: boolean };
export type StoryLine = string | StoryTextPart[];

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
  kind?: "monogram" | "phone";
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
};

// ---------------------------------------------------------------- the scene

export type StoryScene = {
  [T in SceneType]: {
    id: string;
    type: T;
    // Lines to read over this scene. The engine derives the scene's duration
    // from their word count at the story's wpm, then clamps to the pacing
    // rules (no static shot may exceed 8 s).
    narration: string[];
    // Extra seconds of hold after the narration ends (default 0.5).
    hold?: number;
    energy?: number;
    pace?: number;
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
