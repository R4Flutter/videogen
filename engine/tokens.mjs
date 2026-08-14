// engine/tokens.mjs — the V2 design tokens for the editorial vector engine.
// House style preserved from V1: cream paper, ink linework, green data,
// gold emphasis. Grays are now tokenized. No gradients, no rasters, no photos.

export const W = 1920;
export const H = 1080;

export const PALETTE = {
  cream: "#F4F1EA",
  creamDeep: "#EAE5DA",
  paper: "#FFFFFF",
  paperDeep: "#EAE5DA",
  ink: "#1A1A1A",
  inkSoft: "#3A3A38",
  green: "#16A34A",
  gold: "#F5C518",
  muted: "#4A4742",
  rule: "#C9C2B4",
  // tokenized grays (replaces the ad-hoc #8A867E/#B9B4AA/#D8D2C6/#E5DFD3)
  gray100: "#E5DFD3", // faint fill
  gray200: "#D8D2C6", // quiet panel
  gray300: "#B9B4AA", // doc body lines
  gray400: "#8A867E", // secondary text
  gray500: "#6B665C", // tertiary strong
  // night beat — the intentional black cards (kept, but as a token)
  night: "#141414",
  nightPanel: "#211F1C",
  nightRule: "#3A3733",
  nightDim: "#8A867E",
  nightText: "#F4F1EA",
  // real-world brand colors (only for scenes that name real companies)
  brand: {
    netflix: "#E50914",
    hulu: "#1CE783",
    prime: "#1A1A1A",
    disney: "#0B1D5C",
    hbomax: "#0B1D5C",
    paramount: "#0069FF",
    peacock: "#E50914",
    planetPurple: "#7C3AED",
    planetGold: "#F5C518",
    adobeRed: "#E0352B",
    fitzgerald: "#8A7B4D",
  },
};

export const TYPE = {
  display: 200, // single hero number / word
  hero: 120,
  big: 84,
  title: 64,
  headline: 52,
  subhead: 40,
  body: 30,
  label: 26,
  caption: 22,
  data: 24,
  small: 18,
};

// tracking (letter-spacing) per role — uppercase editorial tracking
export const TRACK = {
  display: 6,
  hero: 4,
  big: 3,
  title: 2,
  headline: 1,
  subhead: 0.5,
  body: 0.3,
  label: 2, // kickers / overlines
  caption: 1.5,
  data: 0.5,
};

export const STROKE = {
  primary: 3,
  secondary: 2,
  fine: 1,
  hair: 1,
};

export const FONT = {
  display: `"Archivo", "Bahnschrift", "Segoe UI", system-ui, sans-serif`,
  body: `"Archivo", "Segoe UI", system-ui, sans-serif`,
  mono: `"IBM Plex Mono", "Consolas", "DejaVu Sans Mono", ui-monospace, monospace`,
};

// grid: 12 columns, 96px margin, 8px baseline
export const GRID = {
  margin: 96,
  cols: 12,
  colW: (W - 96 * 2 - 11 * 48) / 12, // 48px gutters → 112px columns
  baseline: 8,
};

export const SAFE = {
  x: 96,
  y: 96,
  right: W - 96,
  bottom: H - 96,
};

export const weight = {
  regular: 400,
  medium: 600,
  bold: 800,
  black: 900,
};