// engine/scenes/index.mjs — all 54 scenes, in order, with their sections.

import { coldOpen } from "./00-cold-open.mjs";
import { stake } from "./01-stake.mjs";
import { breakage } from "./02-breakage.mjs";
import { adobe } from "./03-adobe.mjs";
import { iliad } from "./04-iliad.mjs";
import { rule } from "./05-rule.mjs";
import { landing } from "./06-landing.mjs";

export const SECTIONS = [
  { heading: "Cold open — 0:00", scenes: coldOpen },
  { heading: "The stake — 0:40", scenes: stake },
  { heading: "Act I — Breakage — 1:35", scenes: breakage },
  { heading: "Act II — The day Adobe deleted ownership — 6:30", scenes: adobe },
  { heading: "Act III — The Iliad — 12:05", scenes: iliad },
  { heading: "Act IV — The rule that got cancelled — 15:15", scenes: rule },
  { heading: "Landing — 17:35", scenes: landing },
];

export const SCENES = SECTIONS.flatMap((s) => s.scenes);
export const SCENE_COUNT = SCENES.length;