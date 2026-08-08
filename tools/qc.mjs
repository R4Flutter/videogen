// tools/qc.mjs — the editorial quality gate.
//
//   node --experimental-strip-types tools/qc.mjs [--plan video/src/director-plan.json]
//
// Reads the DirectorPlan, runs the full QC pipeline (story / attention /
// visual / continuity / audio / emotion) and writes video/out/qc-report.txt
// plus the same report to stdout. Exit code 0 even with warnings — the
// report is for a human (or a future agent pass) to act on.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const planPath = join(root, arg("--plan", "video/src/director-plan.json"));
const plan = JSON.parse(readFileSync(planPath, "utf8"));

const { runRetentionQC } = await import(
  pathToFileURL(join(root, "video/src/director/qc/RetentionQC.ts")).href
);
const report = runRetentionQC(plan);

const fmt = (s) => {
  if (s === -1) return "  --";
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(Math.round(s % 60)).padStart(2, "0")}`;
};

const ICONS = { warn: "⚠", info: "·", good: "✓" };
const lines = [];
lines.push(`EDITORIAL QC`);
lines.push(`────────────────────────`);
lines.push(`${report.video.title} · ${fmt(report.video.duration)} · ${report.video.beats} beats · ${report.video.mode}`);
lines.push(``);
for (const f of report.findings) {
  lines.push(`${fmt(f.at)} ${ICONS[f.level]} ${f.rule}${f.severity ? ` [${f.severity}]` : ""}${f.beat ? ` (beat ${f.beat})` : ""}`);
  lines.push(`   problem: ${f.message}`);
  if (f.reason) lines.push(`   why:     ${f.reason}`);
  if (f.fix) lines.push(`   fix:     ${f.fix}`);
}
lines.push(``);
lines.push(`SCORE`);
for (const [k, v] of Object.entries(report.scores)) {
  lines.push(`${k.padEnd(14)} ${v.toFixed(1)}`);
}
lines.push(`retention     ${report.retention} (internal heuristic)`);

const out = lines.join("\n") + "\n";
console.log(out);

const outFile = join(root, "video/out/qc-report.txt");
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, out);
console.log(`WROTE      ${outFile}`);
