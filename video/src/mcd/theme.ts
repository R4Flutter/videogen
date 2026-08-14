import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";

// Single source of truth for the look. The neutral palette is fixed; the
// brand accents (accent / accentSecondary) come from the story and are
// applied once at mount via applyTheme() — swap the story, the whole video
// re-themes itself.

// Headlines: bold modern sans. Body: clean legible sans.
let headlineFont = "'Archivo', 'Segoe UI', system-ui, sans-serif";
let bodyFont = "'Archivo', 'Segoe UI', system-ui, sans-serif";
try {
  const loaded = loadArchivo("normal", {
    weights: ["400", "600", "800", "900"],
    subsets: ["latin"],
  });
  if (loaded && loaded.fontFamily) {
    headlineFont = `'${loaded.fontFamily}', 'Segoe UI', system-ui, sans-serif`;
    bodyFont = `'${loaded.fontFamily}', 'Segoe UI', system-ui, sans-serif`;
  }
} catch {
  // Offline / cache miss: fall back to system fonts, render stays identical.
  headlineFont = "'Segoe UI', system-ui, sans-serif";
  bodyFont = "'Segoe UI', system-ui, sans-serif";
}

export const FONT = {
  headline: headlineFont,
  body: bodyFont,
};

export const WEIGHT = {
  regular: 400,
  medium: 600,
  bold: 800,
  black: 900,
};

export const COLORS = {
  // Cream "paper" base — same family as the vox engine (paper #F4F1EA,
  // paperDeep #E4DED1, ink #1A1A1A). The brand accents below are rewritten
  // by applyTheme() from the story.
  bg: "#F4F1EA",
  bgElevated: "#ECE6D8",
  panel: "#FBF9F4",
  line: "rgba(26,26,26,0.09)",
  lineStrong: "rgba(26,26,26,0.18)",
  textPrimary: "#1A1A1A",
  textSecondary: "#6B665C",
  muted: "#8A857C",
  red: "#E0352B",
  redDim: "rgba(224,53,43,0.16)",
  gold: "#F5C518",
  goldDim: "rgba(245,197,24,0.14)",
  accentDark: "#8F2A23",
  steel: "#8A857C",
  steelDim: "rgba(138,133,124,0.35)",
  dot: "#C9C2B4",
};

export type StoryTheme = {
  accent: string;
  accentSecondary: string;
};

export const withAlpha = (hex: string, alpha: number): string => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const darken = (hex: string, f = 0.62): string => {
  const h = hex.replace("#", "");
  const r = Math.round(parseInt(h.slice(0, 2), 16) * f);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * f);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * f);
  return `rgb(${r},${g},${b})`;
};

// Runs once per page load, before the scenes render — every scene and
// component reads COLORS at render time, so the story palette applies
// everywhere without threading props.
export const applyTheme = (theme: StoryTheme): void => {
  COLORS.red = theme.accent;
  COLORS.gold = theme.accentSecondary;
  COLORS.redDim = withAlpha(theme.accent, 0.16);
  COLORS.goldDim = withAlpha(theme.accentSecondary, 0.14);
  COLORS.accentDark = darken(theme.accent);
};

export const DISCLAIMER =
  "ILLUSTRATIVE FIGURES — REPLACE WITH VERIFIED DATA IN src/mcd/data/businessStory.json";