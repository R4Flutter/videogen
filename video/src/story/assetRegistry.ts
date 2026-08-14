// The asset registry. Scenes reference assets by ID; the registry resolves
// the ID to a path under /public plus metadata (dimensions, transparency,
// subject, tags). A scene never names a file path. When an asset is not yet
// generated, the renderer falls back to a flat-vector placeholder — so a
// story is testable before its images exist, and upgrades automatically the
// moment the file appears at the registered path.

export type AssetRecord = {
  // Path under /public, e.g. "subjects/empty-gym.png".
  path: string;
  // Natural size in px (the layout scales from this).
  width: number;
  height: number;
  // True when the image has an alpha channel (PNG renders / vector art).
  transparent: boolean;
  // What the asset depicts — used by the planner to pick the right one.
  subject: string;
  tags: string[];
  // Visual kind — picks the fallback silhouette when the file is missing.
  kind: "vehicle" | "object";
};

export const ASSET_REGISTRY: Record<string, AssetRecord> = {
  "subjects/empty-gym": {
    path: "subjects/empty-gym.png",
    width: 2048,
    height: 1024,
    transparent: false,
    subject: "empty gym interior at night",
    tags: ["gym", "interior", "planet-fitness", "empty"],
    kind: "object",
  },
  "subjects/lambo": {
    path: "subjects/lambo.png",
    width: 1774,
    height: 887,
    transparent: true,
    subject: "lamborghini supercar side profile",
    tags: ["car", "lamborghini", "vehicle"],
    kind: "vehicle",
  },
  "subjects/treadmill": {
    path: "subjects/treadmill.png",
    width: 1774,
    height: 887,
    transparent: true,
    subject: "commercial gym treadmill, side profile",
    tags: ["gym", "treadmill", "equipment"],
    kind: "object",
  },
  "subjects/gym-person": {
    path: "subjects/gym-person.png",
    width: 887,
    height: 1774,
    transparent: true,
    subject: "lone anonymous runner silhouette, side profile",
    tags: ["gym", "person", "runner"],
    kind: "object",
  },
  "subjects/machine-row": {
    path: "subjects/machine-row.png",
    width: 1774,
    height: 887,
    transparent: true,
    subject: "row of gym cardio machines receding in perspective",
    tags: ["gym", "machines", "row"],
    kind: "object",
  },
};

export const resolveAsset = (id: string | undefined): AssetRecord | null => {
  if (!id) return null;
  return ASSET_REGISTRY[id] ?? null;
};

// True when a story references an asset that is not (yet) registered — the
// planner's QC step reports these instead of silently rendering placeholders.
export const missingAssets = (ids: Array<string | undefined>): string[] =>
  ids.filter((id): id is string => typeof id === "string" && !ASSET_REGISTRY[id]);