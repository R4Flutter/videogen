import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const fixtureScript = () => ({
  title: "T", engine: "vox", fps: 30, width: 1920, height: 1080, durationInSeconds: 40,
  beats: Array.from({ length: 8 }, (_, i) => {
    const n = i + 1;
    return { n, name: `beat ${n}`, start: (n - 1) * 5, end: n * 5, vo: `Narration for beat ${n}.`, visual: `visual ${n}` };
  }),
});

const { validateResponse } = await import(pathToFileURL(join(here, "../../video/src/director/ai/EditorialValidator.ts")).href);

// test 9 replay
const s = fixtureScript();
s.beats[0].camera = "pan";
const r = validateResponse(JSON.stringify({ macro: { chapters: [] }, sequences: [], beats: [{ beatId: "1", motion: { camera: "focus" } }] }), s);
console.log("T9 ok:", r.ok, "errors:", JSON.stringify(r.errors), "fixed:", JSON.stringify(r.fixed));

// test 8 replay
const s2 = fixtureScript();
const r2 = validateResponse(JSON.stringify({ macro: { chapters: [] }, sequences: [], beats: [{ beatId: "1", emotion: { from: "bliss", to: "tension", intensity: 4 }, audio: { jcut: 99 } }] }), s2);
console.log("T8 ok:", r2.ok, "errors:", JSON.stringify(r2.errors), "fixed:", JSON.stringify(r2.fixed), "val:", JSON.stringify(r2.value?.beats));
