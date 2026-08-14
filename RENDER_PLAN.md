# RENDER_PLAN — "The Company That Sells You Nothing" (mcd engine render)

Status: PLAN · Target output: motion-graphics MP4 like `mcd-business-edited.mp4`
Engine: `video/src/mcd` (Remotion) · Script: 54-scene storyboard (`video/out/vectors-v2/company-sells-nothing-storyboard.html`)

---

## 1. What the script is

Full-script storyboard, 54 scenes, 7 sections, 19:14 at 170 wpm:

| # | Section | Scenes | Script beats |
|---|---------|--------|--------------|
| 1 | Cold open (0:00) | 1–5 | Empty gym → the arithmetic ($540/yr) → the gap sits there → 4% / 10% → "it's the product" |
| 2 | The stake (0:40) | 6–8 | Bank statement → $86 vs $219 → free trial checkout |
| 3 | Act I — Breakage (1:35) | 9–21 | Cost structure → cost-to-serve spike → ideal customer → Google Trends → BREAKAGE → gift card→subscription → calendar of charges → Bally contract → complaints → storefront → $10 in the noise → $10/mo vs $120/yr |
| 4 | Act II — Adobe deletes ownership (6:30) | 22–35 | Boxed CS6 → revenue sawtooth → Adobe MAX 2013 → the reaction → beat of black → sawtooth→exponential → $1.23B→$18.28B → boardroom chart → cable→Netflix → streaming launches → household stack → two bills, one total → streamflation → $/mo everywhere |
| 5 | Act III — The Iliad (12:05) | 36–45 | Prime signup → dark pattern → "Iliad" → Homer pages → FTC release → $2.5B split in two → Adobe filing → the 50% fee → $2.5B vs $75M → courthouse |
| 6 | Act IV — The rule that got cancelled (15:15) | 46–50 | Symmetry → July 8, 2025 → the opinion → PROCEDURE → 2026: no rule |
| 7 | Landing (17:35) | 51–54 | Back to the gym → $133 on black → scan the statement → final line |

---

## 2. What the mcd engine can do (capability map)

Scene types (`scenes/index.tsx`): `title, hook, global, map, money, model, chart, finale, reveal`

- **hook** — hero object spring-fly-in (monogram/phone), kicker + 2-line kinetic text, camera push
- **money** — CountUp odometer + bar (`steps[]`), ideal for $540, $86→$219, $1.23B→$18.28B
- **chart** — bar chart with axis draw, camera push to the last bar (74%), insight kicker + annotation at 83–93%
- **reveal** — value + suffix + line reveals (4%, 10%, the dark pattern, documents)
- **model** — business-model card grid / icon grid (streaming launches, household stack, $/mo everywhere)
- **global / map** — world map + count (subscribers anywhere)
- **title / finale** — opening title card, closing montage (map/revenue/model/network + recap lines)
- Camera2D keyframes (pushIn, pullOut, drift, panLeft, panRight, punch, static) + portrait variants
- Motion beats: progressive/spring reveals, FLASH_FRAMES=3 (100 ms flashes), at() frame math at 30 fps (33 ms granularity)
- Timeline engine (`data/timeline.ts`): narration-word-driven durations at wpm, **per-scene clamp [1.5 s, 8 s]**, holds, cut-rate band [10, 24] cuts/min
- Audio: `mcd-voice.py` (Chatterbox TTS, reference voice, best-of-N, breath bank) → `beat-N.wav` + `narration.wav`; `mcd-mux.py` (SFX cues + music, −14 LUFS, atempo ≤ 1.6)
- Assets present: `music.wav` (11.7 MB), `whoosh.wav`, `tick.wav`, `boom.wav`, `shimmer.wav`, `pop.wav`, `riser.wav`, `stamp.wav`, `chime.wav`, `chime-warm.wav`
- Portrait mode built in (height > width → separate keyframes) → Shorts cuts

---

## 3. Virality analysis (yt_scrapper-mined + 2025–26 benchmarks)

From `video/src/mcd/data/director-rules.json` (mined from yt_scrapper reports):

- Retention winners: **specific numbers** (+0.031), **new entities** (+0.027), **contrast beats** (+0.0215), **org name-drops** (+0.0196), **dollars** (+0.0178)
- Retention losers: vague numbers (−0.020), percents (−0.013), high wpm (−0.078) → keep 165–180 wpm
- Position curve: peak intensity at 0% (hook), sharp dip at 6–10%, re-engage ~12%, then steady → **front-load, punch at ~8–10%, re-hook at ~12% of runtime**
- Pacing targets: `targetSec short 895 s / long 1682 s`; cut band 10–24 cuts/min; static shots ≤ 8 s

2025–26 long-form benchmarks (TubeAnalytics / Prepublish / AIR 100-channel study):

- 5–10 min: 50–60% retention healthy · 10–15 min: 40–50% · 15–30 min: 35–45% (watch time > percentage; mid-roll eligible at 8 min)
- First 30 s decide the video; ≥60% retention at 30 s is the target; steep early cliff = bad hook
- **Progressive rhythm**: tight (visual change every 10–20 s) in the first 3 min → widen to 25–40 s once hooked → calm + energy bursts after min 8
- **Contrast pattern**: calm 15–25 s pacing punctuated by a 5–10-cut burst every 2–3 min, then return to calm
- Long-form beat window 10–15 s; layer beats (cut + caption + zoom + SFX) at the same frame
- Like-to-view healthy 4–8%; structure: open with payoff, recap beats, end with crisp next step

**Consequence for this script:** 19:14 across 54 scenes = one cut every ~21 s, below the 10–24 cuts/min band and in the 35–45% retention zone. The timeline engine's 8 s cap physically forces a **compact cut ≈ 7–8 min**, which lands in the *best* retention bracket (50–60%) and keeps cut rate near the band with intra-scene camera cuts. Recommendation: render the compact ~8 min cut (this is what the engine produces; see `cant_do_mcd.md` for the 19:14-long-form extension).

---

## 4. Scene mapping (54 script scenes → mcd types + camera + motion)

Every scene gets: type, camera move, motion beats, SFX cue. Contrast beats (retention winners) get `punch`. Number beats get `money`. Documents/tables (bank statement, contracts, FTC release) use `reveal` (a `document` type is a cant_do gap).

| # | Script scene | mcd type | Camera | Motion / cue |
|---|--------------|----------|--------|--------------|
| 1 | Empty gym | hook | pushIn | hero fly-in ≤ 0.4 s, kicker 0.2×, lines 0.3–0.5× |
| 2 | The arithmetic ($45×12 = $540) | money | punch | CountUp 0→540, pop cue on landing |
| 3 | The gap sits there | reveal | static | line reveal, tick cue |
| 4 | 4% / 10% | reveal | punch | 4% then 10% punch-in, boom cue |
| 5 | It's the product | reveal | static | flash + whoosh |
| 6 | Bank statement | reveal | panRight | RECURRING rows staggered, tick ×4 |
| 7 | $86 → $219 | money | punch | two CountUps 86 then 219, pop + boom |
| 8 | Free trial checkout | reveal | pushIn | "cancel anytime" punch, pop |
| 9 | Cost structure | model | drift | icon grid stagger |
| 10 | Cost-to-serve spike | chart | pushIn | bars + camera push to spike |
| 11 | The ideal customer | reveal | punch | line reveal "pays, never shows up" |
| 12 | Google Trends | chart | panRight | line draw, drift |
| 13 | BREAKAGE | title | punch | big word, stamp cue (stamp.wav) |
| 14 | Gift card → subscription | model | drift | two cards, whoosh |
| 15 | Calendar of charges | reveal | panLeft | day-grid stagger, tick each charge |
| 16 | Bally contract | reveal | pushIn | document fly-in, stamp cue |
| 17 | Clippings / complaints | model | drift | grid stagger, tick |
| 18 | Wrong tool | reveal | static | slow text reveal (was the 110 px overflow scene — keep lines ≤ 2) |
| 19 | Planet Fitness storefront | hook | pushIn | hero + kicker "PLANET FITNESS" |
| 20 | $10 among the noise | money | punch | CountUp 10, pop |
| 21 | $10/mo vs $120/yr | money | punch | **contrast beat**: 10 → 120, boom ×2 |
| 22 | Boxed CS6 | reveal | pushIn | box fly-in "CS6 · $699 once", whoosh |
| 23 | Revenue sawtooth | chart | drift | sawtooth bars draw |
| 24 | Adobe MAX 2013 | reveal | pushIn | stage + seats, riser cue |
| 25 | The reaction | reveal | punch | "we love our subscribers", boom |
| 26 | Beat of black | reveal | static | cream hold + gold accent flash (bg = cream per house rule) |
| 27 | Sawtooth → exponential | chart | pushIn | morph, shimmer cue |
| 28 | $1.23B → $18.28B | money | punch | **hero number beat**: CountUp 1.23B → 18.28B, boom + shimmer |
| 29 | Boardroom chart | chart | panRight | bars + push |
| 30 | Cable → Netflix | chart | punch | contrast bars, boom |
| 31 | Streaming launches | model | drift | logo grid (netflix/hulu/prime/disney+) stagger |
| 32 | Household stack | model | drift | grid + counts |
| 33 | Two bills, one total | money | punch | sum CountUp |
| 34 | Streamflation | chart | pushIn | bars growing, shimmer |
| 35 | $/mo everywhere | model | panRight | logo grid → $/mo tags |
| 36 | Prime signup | reveal | pushIn | checkout fly-in |
| 37 | The dark pattern | reveal | punch | tiny "skip" button punch, boom |
| 38 | "Iliad" | title | static | book cover, whoosh |
| 39 | Homer, worn pages | reveal | drift | page flutter, riser |
| 40 | FTC release | reveal | pushIn | document + headline, tick |
| 41 | $2.5B split in two | money | punch | CountUp + split, boom |
| 42 | The Adobe filing | reveal | pushIn | document, tick |
| 43 | The 50% fee | money | punch | CountUp, pop |
| 44 | $2.5B vs $75M | money | punch | **contrast beat**, boom ×2 |
| 45 | Courthouse | reveal | static→drift | gavel, stamp cue |
| 46 | Symmetry | chart | drift | paired bars |
| 47 | July 8, 2025 | reveal | punch | calendar date punch, stamp cue |
| 48 | The opinion | reveal | pushIn | document, tick |
| 49 | PROCEDURE | reveal | static | document + gold highlight |
| 50 | 2026: no rule | title | punch | "NO RULE" stamp, boom + stamp |
| 51 | Back to the gym | hook | pushIn | **bookend** to scene 1, same framing |
| 52 | $133 on black | money | static→punch | gold $133 CountUp, pop |
| 53 | Scan the statement | reveal | punch | 12× "$10.00 ACME FITNESS" stagger, tick |
| 54 | Final line | finale | pullOut | montage (map/revenue/model/network) + recap lines + footer |

### Pacing directives (per scene group)
- **Cold open (1–5):** every scene ≤ 6 s, first visual beat by frame 12 (0.4 s), 2 beat-layers min (hero + text + cue). Target ≥ 60% retention at 30 s.
- **Act I (9–21):** 6–8 s scenes; burst cluster at 13–14 (BREAKAGE + gift card) and 20–21 (contrast).
- **Act II (22–35):** calm 7–8 s holds at 24/26; burst at 27–28 ($1.23B→$18.28B) and 30 (cable→Netflix); re-engage at ~12% of runtime = start of Act II.
- **Act III (36–45):** burst at 41–44 ($2.5B → 50% → vs $75M); calm at 38–39 (Iliad).
- **Act IV + Landing (46–54):** build to 50 (no rule) and 52–54 ($133 + statement + finale).

---

## 5. Timing spec (millisecond-level)

- 30 fps → 33.3 ms per frame; all beat times via `at(fraction)` on scene duration
- FLASH_FRAMES = 3 (100 ms flashes) for 4, 13, 26, 37, 50
- Narration drives durations: wpm 170 (range 165–180), per-scene clamp [1.5, 8] s, hold 0.5 s
- Two hard timing rules for narration lines: ≤ 2 lines per scene (avoid the 8 s clamp cutting voice), and land the "punch line" in the last 15% of the scene (annotation at 83–93% pattern from DataStory)
- Mux: SFX cues scheduled on beat starts; breath gaps ≤ 0.15 s (pause-clamped); atempo ≤ 1.6; master −14 LUFS

---

## 6. Where the video will lag — ranked risks + mitigations

1. **Cold open static hold** (scene 1, first 30 s) — the #1 retention cliff. Fix: hero in ≤ 0.4 s, kicker by 20%, 2 text lines, pushIn + whoosh on frame 1.
2. **Runtime cap vs 19:14 script** — engine clamps at 8 s/scene; a 19:14 render is impossible in one pass (see cant_do_mcd.md §1). Fix: accept the ~8 min compact cut (better retention bracket), or split into 2 parts once the engine supports per-scene `maxSec`.
3. **Uniform 6–8 s scenes → metronome feel** — cut rate lands near the low end of the band. Fix: contrast pattern — 3–4 s bursts at 13–14, 27–28, 41–44, 50; 7–8 s calm holds at 9–12, 24, 38–39, 46–49.
4. **Emotional holds (26, 52) have no narration** — engine gives only 0.5 s hold → beats vanish. Fix: attach a 1-line narration or fold the beat into the previous scene's tail; gold flash + boom cue carry the beat.
5. **Voice overflow** — narration longer than the 8 s clamp gets atempo-stretched > 1.6 → chipmunk. Fix: keep ≤ 2 lines/scene; preflight check reports any scene whose narration exceeds its clamped duration.
6. **Table/detail scenes (6, 15, 53) read too fast** — rows revealed one per tick (100–150 ms apart) with camera drift, not a static dump.
7. **Mid-video sag (Act II/III, minutes 6:30–15:15)** — 25 scenes straight. Fix: burst at 8:00 ($1.23B→$18.28B) and 13:00 ($2.5B vs $75M); re-engage at 12% of runtime per the mined position curve.
8. **Audio floor** — music.wav must loop cleanly for the full ~8 min; mux must verify −14 LUFS (±1 dB) and no clipped atempo.
9. **Vague-number narration** — `has_number` hurts retention; keep only specific figures ($540, $86, $219, $120, $1.23B, $18.28B, $7.5B→$2.5B, $75M, $133). No "some money", "hundreds of dollars".

---

## 7. Render pipeline (exact commands, in order)

1. **Complete the story JSON** — rewrite `video/src/mcd/stories/companySellsNothingStory.json` with all 54 scenes per §4 mapping (current file is a 14-scene condensed teaser that does NOT cover Acts I–IV). Keep id `CompanySellsNothingStory` (already registered in `stories/index.ts`).
2. **Preflight (new, per cant_do_mcd.md §7):** `node tools/story-preflight.mjs` — assert: 54 scenes, every scene has narration ≤ 2 lines, camera set, type in SCENE_COMPONENTS, no scene's narration overflows its clamped duration, assets exist.
3. **Derive timeline + render:** `node tools/render-business.mjs CompanySellsNothingStory` — runs `npx tsc --noEmit` validation, writes `CompanySellsNothingStory.timeline.json`, renders the composition (Remotion, 1920×1080, 30 fps).
4. **Voice:** `.venv-tts/Scripts/python tools/mcd-voice.py --story video/src/mcd/stories/companySellsNothingStory.json` — one take per scene, best-of-N, breaths before landing lines → `beat-N.wav` + `narration.wav` + plan manifest.
5. **Mux:** `.venv-tts/Scripts/python tools/mcd-mux.py` — SFX cues (whoosh/tick/boom/shimmer/pop/riser/stamp) + music + narration → master at −14 LUFS.
6. **QC (new):** `node tools/mcd-qc.mjs` — ffprobe: duration = timeline total ±1%, frame count = fps×duration, loudness −14 LUFS ±1; extract 6 sample frames (0:00, hook, 25%, mid, 75%, end) and assert cream-background dominance + no black bars.
7. **Deliver:** `video/out/company-sells-nothing-final.mp4` (master) + portrait Shorts cuts (re-render with portrait flag; engine has portrait keyframes for all scenes).

Estimated render cost: ~54 scenes × 8 s × 30 fps ≈ 13k frames (CPU-bound; budget 1–4 h).

---

## 8. Shorts cut list (portrait, engine-native)

1. 4% / 10% (scenes 4) — "the fire marshal would close it"
2. $86 → $219 (scene 7) — the gap beat
3. $1.23B → $18.28B (scene 28) — the biggest number in the video
4. The dark pattern (scene 37)
5. $2.5B vs $75M (scene 44) — contrast
6. $133 on black (scene 52) + final line (54)

---

## 9. Files to touch

- `video/src/mcd/stories/companySellsNothingStory.json` — full 54-scene port (the main work)
- `tools/story-preflight.mjs` — NEW preflight validation (fixes the "system repeats mistakes" problem)
- `tools/mcd-qc.mjs` — NEW render QC
- `video/src/mcd/data/timeline.ts` — only if long-form mode is wanted (per-scene `maxSec` override; see cant_do_mcd.md)
- No changes needed to scene components — the 9 types cover all 54 scenes via the §4 mapping.