// tools/direct.mjs — run the editorial director.
//
//   node --experimental-strip-types tools/direct.mjs [--script video/src/script.json]
//                                                 [--out video/src/director-plan.json]
//                                                 [--overlay video/src/director.overlay.json]
//                                                 [--mode essay|short]
//
// Reads script.json (and an optional hand-written overlay of editorial notes),
// runs the deterministic director (video/src/director/plan.ts) and writes the
// DirectorPlan the renderer and QC both consume. Validation failures are
// printed but the plan is still written — a director should report, not refuse.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};

const scriptPath = join(root, arg("--script", "video/src/script.json"));
const outPath = join(root, arg("--out", "video/src/director-plan.json"));
const overlayPath = arg("--overlay", null);
const mode = arg("--mode", "essay").toLowerCase() === "short" ? "SHORT" : "ESSAY";

const script = JSON.parse(readFileSync(scriptPath, "utf8"));
const overlay = overlayPath ? JSON.parse(readFileSync(join(root, overlayPath), "utf8")) : undefined;

const { buildDirectorPlan } = await import(pathToFileURL(join(root, "video/src/director/plan.ts")).href);

const { plan, warnings, issues, qc } = buildDirectorPlan(script, overlay, mode);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(plan, null, 2));

const fmt = (s) => {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(Math.round(s % 60)).padStart(2, "0")}`;
};

console.log(`DIRECTOR   ${plan.project.title}`);
console.log(`  mode     ${plan.project.mode} · ${plan.project.width}x${plan.project.height}@${plan.project.fps} · ${plan.project.durationInSeconds}s`);
console.log(`  chapters ${plan.chapters.map((c) => `${c.ordinal}. ${c.title}`).join(" / ")}`);
console.log(`  seqs     ${plan.sequences.length} · beats ${plan.beats.length} · motifs ${plan.storyMemory.length} (central: ${plan.storyMemory.find((m) => m.central)?.label ?? "—"})`);
console.log(`  events   ${plan.attentionEvents.length} attention · ${plan.audioEvents.length} audio · ${plan.memoryEvents.length} memory`);
console.log(`  j/l cuts ${plan.beats.filter((b) => b.jCut || b.lCut).length} beats`);
if (warnings.length) console.log(`  warnings ${warnings.length}`);
for (const w of warnings.slice(0, 12)) console.log(`    ! ${w}`);
console.log(`  timeline ${issues.length ? `${issues.length} validation issues` : "validated clean"}`);
if (issues.length) for (const i of issues.slice(0, 8)) console.log(`    ✗ ${i.message}`);
console.log("QC SCORES");
for (const [k, v] of Object.entries(qc.scores)) console.log(`  ${k.padEnd(14)} ${v.toFixed(1)}/10`);
console.log(`  retention    ${qc.retention}/10 (internal heuristic)`);
console.log(`WROTE      ${outPath}`);
