// tools/editorial.mjs — the full editorial pipeline. Claude is the brain,
// the deterministic director is the enforcement engine, QC is the critic.
//
//   node --experimental-strip-types tools/editorial.mjs
//        [--script video/src/script.json]
//        [--out video/src/director-plan.json]
//        [--overlay video/src/director.overlay.json]
//        [--mode essay|short]
//        [--dry-run]              show chapters/sequences/beats/questions/
//                                 reveals/attention/callbacks/audio/QC, write nothing
//        [--max-revisions N]      default 3
//        [--no-ai]                deterministic only (no Claude calls)
//        [--model MODEL]          Claude model override (default: claude model)
//
// Pipeline: context → Claude editorial analysis → validation → overlay merge
// (author > Claude > deterministic) → deterministic director → QC critic →
// Claude revision (only affected beats, locked beats protected) → … → plan.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const hasFlag = (name) => process.argv.includes(name);

const scriptPath = join(root, arg("--script", "video/src/script.json"));
const outPath = join(root, arg("--out", "video/src/director-plan.json"));
const overlayPath = arg("--overlay", null);
const mode = arg("--mode", "essay").toLowerCase() === "short" ? "SHORT" : "ESSAY";
const dryRun = hasFlag("--dry-run");
const noAi = hasFlag("--no-ai");
const maxRevisions = Number(arg("--max-revisions", "3"));
const model = arg("--model", null);

const script = JSON.parse(readFileSync(scriptPath, "utf8"));
const baseOverlay = overlayPath && existsSync(join(root, overlayPath))
  ? JSON.parse(readFileSync(join(root, overlayPath), "utf8"))
  : undefined;

const aiDir = join(root, "video/src/director/ai");
const { buildEditorialContext } = await import(pathToFileURL(join(aiDir, "EditorialContext.ts")).href);
const { buildEditorialPrompt, buildRevisionPrompt, SYSTEM_PROMPT } = await import(pathToFileURL(join(aiDir, "EditorialPrompt.ts")).href);
const { validateResponse, validateRevision } = await import(pathToFileURL(join(aiDir, "EditorialValidator.ts")).href);
const { decisionsToOverlay, applyRevision, attachViewerStates } = await import(pathToFileURL(join(aiDir, "index.ts")).href);
const { buildDirectorPlan } = await import(pathToFileURL(join(root, "video/src/director/plan.ts")).href);

const fmt = (s) => {
  if (s === -1) return "  --";
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${String(Math.round(s % 60)).padStart(2, "0")}`;
};

// ------------------------------------------------------------------ brain
// Default tracks the newest flash model; override with EDITORIAL_MODEL
// (e.g. "gemini-pro-latest", "gemini-2.5-pro").
const GEMINI_MODEL = process.env.EDITORIAL_MODEL || "gemini-flash-latest";

const callClaude = (prompt, kind) =>
  new Promise((resolve, reject) => {
    const claudeBin = process.env.CLAUDE_BIN || "claude";
    const args = ["-p", "--max-turns", "1", "--output-format", "text", "--bare"];
    if (model) args.push("--model", model);
    const child = spawn(claudeBin, args, {
      env: { ...process.env, CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    const chunks = [];
    const errChunks = [];
    child.stdout.on("data", (c) => chunks.push(c));
    child.stderr.on("data", (c) => errChunks.push(c));
    child.on("error", (e) => reject(new Error(`claude CLI not runnable (${e.message})`)));
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`${kind} timed out after 8 minutes`));
    }, 8 * 60 * 1000);
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            `${kind}: claude CLI exited ${code}${errChunks.length ? ` — ${Buffer.concat(errChunks).toString("utf8").split("\n")[0]}` : ""}`,
          ),
        );
        return;
      }
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    child.stdin.end(prompt);
  });

const callGemini = async (prompt, kind) => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 65536 },
  };
  const extract = (json) => {
    const cand = json?.candidates?.[0];
    const text = cand?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const finish = cand?.finishReason ?? "UNKNOWN";
    if (finish === "MAX_TOKENS") {
      process.stderr.write(`  brain    gemini response hit MAX_TOKENS (${text.length} chars) — repair will retry\n`);
      if (!text) throw new Error(`${kind}: Gemini response MAX_TOKENS with no content`);
      return text;
    }
    if (finish === "SAFETY") throw new Error(`${kind}: Gemini response blocked (SAFETY)`);
    if (!text) throw new Error(`${kind}: Gemini returned no content`);
    return text;
  };
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, 8 * 60 * 1000);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).finally(() => clearTimeout(timer));
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    if (res.status === 429 || res.status === 503) {
      for (const attempt of [1, 2]) {
        const wait = attempt * 8 * 1000;
        process.stderr.write(`  brain    gemini busy (HTTP ${res.status}) — retrying in ${attempt * 8}s\n`);
        await new Promise((r) => setTimeout(r, wait));
        const again = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (again.ok) return extract(await again.json());
      }
    }
    throw new Error(`${kind}: Gemini HTTP ${res.status} — ${detail}`);
  }
  return extract(await res.json());
};

/** Provider chain: EDITORIAL_BRAIN pins one; otherwise claude CLI first,
 *  Gemini API as the automatic fallback. */
const callBrain = async (prompt, kind) => {
  const t0 = Date.now();
  const pin = process.env.EDITORIAL_BRAIN || "auto";
  const chain = pin === "auto"
    ? ["claude", "gemini"]
    : pin === "claude" ? ["claude"]
    : pin === "gemini" ? ["gemini"] : ["claude", "gemini"];
  let lastErr = null;
  for (const provider of chain) {
    try {
      const raw = provider === "claude" ? await callClaude(prompt, kind) : await callGemini(prompt, kind);
      process.stderr.write(`  brain    ${kind} via ${provider} in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
      return raw;
    } catch (e) {
      lastErr = e;
      process.stderr.write(`  brain    ${provider} unavailable (${e.message.split("\n")[0]})\n`);
    }
  }
  throw lastErr;
};

// ------------------------------------------------------------------ main
const notes = [];
let overlay = baseOverlay;
let resp = null;
let lockedBeats = [];
let passes = 0;
let qc = null;

console.log(`EDITORIAL DIRECTOR   ${script.title}`);
console.log(`  mode     ${mode} · ${script.beats.length} beats · ${script.durationInSeconds}s${noAi ? " · deterministic only" : ""}`);

if (!noAi) {
  const ctx = buildEditorialContext(script);
  let raw, v;
  try {
    raw = await callBrain(buildEditorialPrompt(ctx), "editorial analysis");
    writeFileSync(join(root, "video/out/brain-trace.json"), raw);
    v = validateResponse(raw, script);
    if (!v.ok) {
      process.stderr.write(`  brain    analysis failed validation (${v.errors.length} errors) — one repair retry\n`);
      v.errors.slice(0, 6).forEach((e) => process.stderr.write(`    ✗ ${e}\n`));
      raw = await callBrain(
        `${SYSTEM_PROMPT}\n\nYour previous response failed validation:\n${v.errors.join("\n")}\n\nReturn ONLY the corrected JSON plan per the schema.`,
        "repair attempt",
      );
      writeFileSync(join(root, "video/out/brain-repair-trace.json"), raw);
      v = validateResponse(raw, script);
    }
  } catch (e) {
    v = { ok: false, errors: [`brain unavailable: ${e.message.split("\n")[0]}`], fixed: [] };
  }
  if (!v.ok) {
    process.stderr.write(`  brain    STILL INVALID after repair — falling back to deterministic plan\n`);
    v.errors.forEach((e) => process.stderr.write(`    ✗ ${e}\n`));
    notes.push("editorial brain unavailable or invalid — deterministic plan used");
  } else {
    resp = v.value;
    const merged = decisionsToOverlay(script, resp);
    overlay = merged.overlay;
    lockedBeats = merged.locked;
    if (v.fixed.length) {
      process.stderr.write(`  gate     fallbacks applied (logged, never silent):\n`);
      v.fixed.slice(0, 12).forEach((f) => process.stderr.write(`    ~ ${f}\n`));
      if (v.fixed.length > 12) process.stderr.write(`    … ${v.fixed.length - 12} more\n`);
    }
    notes.push(`brain decisions: ${resp.beats.length} beats, ${resp.sequences.length} sequences, ${resp.macro.chapters.length} chapters`);
  }
}

// revision loop: plan → QC → targeted revision → plan
for (let pass = 1; pass <= maxRevisions + 1; pass++) {
  const { plan, warnings, issues, qc } = buildDirectorPlan(script, overlay, mode);
  passes = pass;
  const high = qc.findings.filter((f) => f.severity === "HIGH").length;
  const med = qc.findings.filter((f) => f.severity === "MED").length;
  process.stderr.write(`  pass ${pass}: ${qc.findings.length} findings (${high} HIGH, ${med} MED) · retention ${qc.retention}\n`);
  if (pass > maxRevisions || noAi || !resp || high === 0) {
    // attach viewer state + provenance, then write
    if (resp) {
      const decisions = (resp.beats ?? []).map((d) => ({
        beatId: d.beatId,
        question: d.question,
        reveal: d.reveal,
        nextQuestion: d.nextQuestion,
        consequence: d.consequence,
      }));
      attachViewerStates(plan, resp, decisions);
    }
    plan.editorial = {
      passes,
      source: resp ? "ai" : "deterministic",
      lockedBeats,
      notes,
    };
    if (!dryRun) {
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, JSON.stringify(plan, null, 2));
    }
    // ---- report ----
    console.log(`DIRECTOR   ${plan.project.title}`);
    console.log(`  mode     ${plan.project.mode} · ${plan.project.width}x${plan.project.height}@${plan.project.fps} · ${plan.project.durationInSeconds}s · passes ${passes} (${plan.editorial.source})`);
    console.log(`  chapters ${plan.chapters.map((c) => `${c.ordinal}. ${c.title}`).join(" / ")}`);
    console.log(`  seqs     ${plan.sequences.length} · beats ${plan.beats.length} · motifs ${plan.storyMemory.length} (central: ${plan.storyMemory.find((m) => m.central)?.label ?? "—"})`);
    console.log(`  events   ${plan.attentionEvents.length} attention · ${plan.audioEvents.length} audio · ${plan.memoryEvents.length} memory`);
    console.log(`  j/l cuts ${plan.beats.filter((b) => b.jCut || b.lCut).length} beats · locked ${lockedBeats.length}`);
    if (warnings.length) console.log(`  warnings ${warnings.length}`);
    for (const w of warnings.slice(0, 12)) console.log(`    ! ${w}`);
    console.log(`  timeline ${issues.length ? `${issues.length} validation issues` : "validated clean"}`);
    console.log("QC SCORES");
    for (const [k, v] of Object.entries(qc.scores)) console.log(`  ${k.padEnd(14)} ${v.toFixed(1)}/10`);
    console.log(`  retention    ${qc.retention}/10 (internal heuristic)`);
    for (const f of qc.findings.filter((x) => x.severity === "HIGH")) {
      console.log(`HIGH ${fmt(f.at)} ${f.rule}${f.beat ? ` (beat ${f.beat})` : ""}`);
      console.log(`     ${f.message}`);
      if (f.fix) console.log(`     fix: ${f.fix}`);
    }
    if (notes.length) {
      console.log("EDITORIAL NOTES");
      for (const n of notes) console.log(`  · ${n}`);
    }
    if (dryRun) {
      console.log(`DRY RUN  nothing written`);
    } else {
      console.log(`WROTE      ${outPath}`);
    }
    process.exit(0);
  }

  // --- revision pass ---
  if (resp) {
    const findings = qc.findings
      .filter((f) => f.severity === "HIGH" || (f.severity === "MED" && f.beat))
      .map((f) => ({ at: f.at, severity: f.severity ?? "MED", rule: f.rule, message: f.message, beat: f.beat, fix: f.fix }));
    const affected = new Set(findings.map((f) => f.beat).filter((b) => b !== undefined));
    const previous = {};
    for (const b of affected) {
      const note = overlay?.beats?.[b];
      if (note) previous[`beat_${b}`] = note;
    }
    const ctx = buildEditorialContext(script, plan, qc);
    let raw, rv;
    try {
      raw = await callBrain(buildRevisionPrompt(ctx, findings, previous, lockedBeats), `revision pass ${pass}`);
      writeFileSync(join(root, "video/out/brain-revision-trace.json"), raw);
      rv = validateRevision(raw, script, lockedBeats);
    } catch (e) {
      rv = { ok: false, errors: [`brain unavailable: ${e.message.split("\n")[0]}`] };
    }
    if (!rv.ok) {
      process.stderr.write(`  gate     revision rejected (${rv.errors.length} errors) — keeping current plan\n`);
      rv.errors.slice(0, 6).forEach((e) => process.stderr.write(`    ✗ ${e}\n`));
      continue; // keep current overlay; loop decrements pass budget via maxRevisions guard
    }
    overlay = applyRevision(overlay ?? {}, rv.value);
    notes.push(`revision ${pass}: ${rv.value.revision.reason} (${rv.value.revision.changes.length} beats)`);
  } else {
    break; // no brain to revise with
  }
}
