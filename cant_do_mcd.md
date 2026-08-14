# cant_do_mcd.md — gaps in the mcd engine for viral-quality renders + fixes

Audit of `video/src/mcd` against the requirements of "The Company That Sells You Nothing"
(54-scene script, 19:14 at 170 wpm, house style: cream #F4F1EA bg, ink, green #16A34A, gold #F5C518).
Each item: **gap** → **why it breaks virality** → **fix** (so the system self-corrects next time).

---

## 1. Per-scene duration clamp (8 s) makes long-form impossible

- **Gap:** `data/timeline.ts` clamps every scene to `[1.5, 8] s` (MAX_SCENE_SEC = 8). The script is 54 scenes over 19:14 = ~21.3 s/scene average. One pass physically cannot exceed ~54×8 s + holds ≈ 8 min. The mined targets (`targetSec short 895 / long 1682`) are unreachable with this clamp.
- **Why it matters:** user's full script (Acts I–IV with holds) can't be rendered in one pass; forced 8-min cut drops Act II–IV detail or forces a 2-parter.
- **Fix:** add a per-scene `edit.maxSec` override (default 8) plus a story-level `longForm: true` mode that raises the cap to ~20–25 s and widens the cut band for scenes past the 3-min mark (progressive-rhythm rule: tight first 3 min, wider later). Timeline must warn (`long-form override N scenes`) instead of silently clamping.

## 2. No `document` / `table` / `calendar` scene type

- **Gap:** the 9 types (title/hook/global/map/money/model/chart/finale/reveal) have no native document, bank-statement, contract, calendar, or screenshot component. Scenes 6, 8, 15, 16, 40, 42, 48, 53 (statement rows, contracts, FTC release, filings) currently force a `reveal` with text lines — losing the visual that makes the beat land.
- **Why it matters:** table scenes are detail-dense; a text dump kills retention. Row-by-row stagger + camera drift is the pro move and the engine can't do it natively.
- **Fix:** new `document` scene type: rows/paragraphs data, row stagger on ticks, optional stamp overlay (stamp.wav), portrait-aware layout. Reuse the V2 engine's SVG table designs (`engine/scenes/*.mjs`) as the spec.

## 3. No custom vector art / photo assets

- **Gap:** Hook only renders `monogram`/`phone` heroes; `Backdrop` needs an image file. The storyboard's empty gym, treadmill, storefront, courthouse, book covers (Iliad, Homer pages) exist only as V2 SVGs. No hero for the gym.
- **Why it matters:** the whole cold open + Iliad Act hinges on place imagery; without it the video is abstract text over cream.
- **Fix:** (a) hero.kind `image` — render a provided staticFile image with the same spring-in physics; (b) new `svg` scene type that takes an inline SVG string and animates it with Camera2D + motion beats. The 54 V2 SVGs (`video/out/vectors-v2/svg/`) become usable immediately — the single highest-leverage fix.

## 4. Emotional beats with no narration collapse to 0.5 s

- **Gap:** scenes 26 (beat of black) and 52 ($133 on black) carry no narration; the engine gives them DEFAULT_HOLD_SEC = 0.5 s and moves on.
- **Why it matters:** these are the video's emotional punctuation; at 0.5 s they're invisible.
- **Fix:** add `edit.holdSec` (explicit hold per scene, e.g. 3 s) and let the mux schedule a `boom`/`shimmer` cue at hold start. Preflight flags any scene with narration + hold > clamped duration.

## 5. No frame-accurate visual QC (system can't see its own output)

- **Gap:** the pipeline validates TS and timeline but never inspects rendered frames. Errors like the 110 px text overflow (fixed in V2 by hand) or a black-bar/misplaced-element regression pass silently.
- **Why it matters:** a single overflow or clipped headline in the first 30 s kills retention; humans can't eyeball 13k frames.
- **Fix:** `tools/mcd-qc.mjs` after every render: ffprobe duration/frame-count/loudness asserts, plus frame extraction (0:00, 0:40, 25%, 50%, 75%, end) with heuristics — cream-bg dominance, no pure-black full frames, no text clipping outside safe margins. Fail = re-render gate. (Model has no vision — this is the machine-eyes substitute.)

## 6. No preflight story validation (repeat-mistake loop)

- **Gap:** nothing checks the story JSON before a multi-hour render: scene count vs script, narration overflow vs 8 s clamp, missing camera/edit, unknown type, missing audio assets.
- **Why it matters:** every structural mistake costs a full render cycle (1–4 h) + TTS run.
- **Fix:** `tools/story-preflight.mjs` (runs inside render-business before tsc): assert 54 scenes (or story's declared count), narration ≤ 2 lines per scene, every scene has camera + type + narration, no overflow, assets exist. Hard-fail with a numbered list. This is the "system corrects its mistake next time" mechanism — it turns silent clamping into loud failures.

## 7. Runtime never verified against the script's target

- **Gap:** the render reports `totalSeconds` but nothing checks it against `targetSec` (895/1682) or the script's 1154 s.
- **Fix:** preflight + QC both compare `timeline.totalSeconds` to the target band and to the script's expected runtime (1154 s for 19:14); if a long-form override exists, warn when the cut lands < 60% of target.

## 8. Voice/SFX overflow detection is post-hoc

- **Gap:** mcd-mux warns at `atempo > 1.6` only after TTS takes are generated; a scene whose narration can't fit its clamped window silently stretches.
- **Fix:** compute `narration_sec(170wpm)` per scene in preflight (item 6) and re-word the narration, don't stretch.

---

## Priority order for fixes

1. `tools/story-preflight.mjs` (prevents wasted render cycles) — do first
2. `svg` scene type + `hero.kind image` (unlocks all 54 V2 SVGs)
3. `document` scene type (statement/contract/calendar beats)
4. `edit.maxSec` long-form mode + `edit.holdSec` (restores script runtime & emotional beats)
5. `tools/mcd-qc.mjs` (machine eyes on every render)

After 1–5, the system can render the full 19:14 script in one pass, self-check every render, and reuse all V2 storyboard art — with no human eyeballing.
