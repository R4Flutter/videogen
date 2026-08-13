// The contract a business-documentary story must satisfy. Every scene of the
// engine reads from this single object — a new story.json renders a new video
// with the same motion language.

export type SceneId =
  | "hook"
  | "global"
  | "map"
  | "money"
  | "model"
  | "chart"
  | "finale";

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

export type BusinessStory = {
  id: string;
  title: string;
  brand: string;

  // Hero object of the hook scene. `src` is a path under /public (e.g.
  // "hero/burger.png"); without it the engine draws a monogram block with
  // the brand's initial in the accent color. `kind` selects the vector
  // fallback: "monogram" (default) or "phone" (a generic device).
  hero: {
    src?: string;
    kind?: "monogram" | "phone";
    width: number;
    height: number;
    position?: "left" | "right";
  };

  // Accent colors drive the whole palette (scene accent + secondary accent).
  theme: {
    accent: string;
    accentSecondary: string;
  };

  hook: {
    kicker: string;
    lines: StoryLine[];
    accentLine: number;
  };

  globalScale: {
    finalCount: number;
    headline: string;
    kicker: string;
  };

  map: {
    regionOrder: RegionId[];
    regionLabel: Record<RegionId, string>;
    regionLabelCell: Record<RegionId, [number, number]>;
    hubOrigin: { name: string; cell: [number, number] };
    hubs: HubLink[];
    title: { kicker: string; lines: StoryLine[] };
  };

  revenue: {
    kicker: string;
    steps: { value: number; frame: number }[];
    finalLabel: string;
    overline: string;
    barLabel: string;
    barDelay: number;
    barDuration: number;
  };

  businessModel: {
    kicker: string;
    nodes: { title: string; sub: string; role: NodeRole }[];
    flowNotes: string[];
    payoffOverline: string;
    payoffValue: string;
    payoffNote: string;
  };

  chart: {
    kicker: string;
    valuePrefix: string;
    valueSuffix: string;
    data: { label: string; value: number }[];
    insightKicker: string;
    insight: string;
    annotationNote: string;
    footnote: string;
  };

  finale: {
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
};
