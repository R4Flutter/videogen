// The timeline engine: derives every scene's duration from the story's own
// narration, then enforces the yt_scrapper pacing rules (max 8 s static
// shot, 3-frame flash gaps, 10-24 cuts/min) and QC-checks the retention
// devices the story promised. Pure — no React imports — so the same module
// runs in Remotion (bundle) and in node (tools/mcd-timeline.mjs).

import type { BusinessStory } from "./storyTypes";

// Flash-cut frames between scenes. A 3-frame solid accent frame registers as
// two scene changes in PySceneDetect, so N scenes become ~2N detected cuts
// per minute of runtime — inside the outlier 10-24 cuts/min band.
export const FLASH_FRAMES = 3;

// yt_scrapper analyzer gate: no static shot may exceed 8 s.
export const MAX_SCENE_SEC = 8;
export const MIN_SCENE_SEC = 1.5;

// Finance-doc narration reads at 165-180 wpm (yt_scrapper outlier analysis).
export const DEFAULT_WPM = 170;
export const WPM_RANGE = [165, 180] as const;

// Extra seconds of hold a scene gets by default after its narration ends.
export const DEFAULT_HOLD_SEC = 0.5;

export type SceneTiming = {
  id: string;
  type: string;
  startFrame: number;
  durationInFrames: number;
  startSec: number;
  durationSec: number;
};

export type StoryTimeline = {
  fps: number;
  wpm: number;
  totalFrames: number;
  totalSeconds: number;
  cutsPerMinute: number;
  scenes: SceneTiming[];
  warnings: string[];
};

const words = (text: string[]): number =>
  text.join(" ").split(/\s+/).filter(Boolean).length;

export const buildTimeline = (story: BusinessStory, fps = 30): StoryTimeline => {
  const wpm = story.wpm ?? DEFAULT_WPM;
  const warnings: string[] = [];

  if (wpm < WPM_RANGE[0] || wpm > WPM_RANGE[1]) {
    warnings.push(`wpm ${wpm} outside the ${WPM_RANGE[0]}-${WPM_RANGE[1]} finance-doc range`);
  }

  let frame = 0;
  const scenes: SceneTiming[] = story.scenes.map((scene) => {
    const narrSec = (words(scene.narration) / wpm) * 60;
    const hold = scene.hold ?? DEFAULT_HOLD_SEC;
    let sec = narrSec + hold;

    if (sec > MAX_SCENE_SEC) {
      warnings.push(
        `scene "${scene.id}" (${scene.type}) wants ${sec.toFixed(2)}s of narration — ` +
          `clamped to the ${MAX_SCENE_SEC}s static-shot cap`,
      );
      sec = MAX_SCENE_SEC;
    }
    if (sec < MIN_SCENE_SEC) {
      warnings.push(
        `scene "${scene.id}" (${scene.type}) is only ${sec.toFixed(2)}s — ` +
          `padded to the ${MIN_SCENE_SEC}s floor`,
      );
      sec = MIN_SCENE_SEC;
    }

    const timing: SceneTiming = {
      id: scene.id,
      type: scene.type,
      startFrame: frame,
      durationInFrames: Math.round(sec * fps),
      startSec: frame / fps,
      durationSec: sec,
    };
    frame += timing.durationInFrames + FLASH_FRAMES;
    return timing;
  });

  const totalFrames = frame - FLASH_FRAMES; // no flash after the last scene
  const totalSeconds = totalFrames / fps;
  const cutsPerMinute = (story.scenes.length * 2) / (totalSeconds / 60);

  if (cutsPerMinute < 10 || cutsPerMinute > 24) {
    warnings.push(
      `pacing ${cutsPerMinute.toFixed(1)} cuts/min is outside the 10-24 band ` +
        `(${story.scenes.length} scenes over ${totalSeconds.toFixed(1)}s)`,
    );
  }

  // Retention devices: the story promised a curve peak at a fraction of the
  // runtime — there must be a scene boundary near it. The last scene's end is
  // the video's end, which is where the curve collapses, not a peak.
  if (story.retention) {
    const boundaries = scenes.slice(1).map((s) => s.startSec / totalSeconds);
    for (const r of story.retention) {
      if (r.at < 0 || r.at > 1) {
        warnings.push(`retention device "${r.device}" at ${r.at} is not a fraction`);
        continue;
      }
      const nearest = boundaries.reduce(
        (best, b) => (Math.abs(b - r.at) < Math.abs(best - r.at) ? b : best),
        Infinity,
      );
      if (!Number.isFinite(nearest) || Math.abs(nearest - r.at) > 0.04) {
        warnings.push(
          `retention device "${r.device}" at ${(r.at * 100).toFixed(0)}% has no scene ` +
            `boundary within 4% of it`,
        );
      }
    }
  }

  // No content may start after ~92% of the runtime — the curve collapses.
  const lastStart = scenes[scenes.length - 1].startSec / totalSeconds;
  if (lastStart > 0.92) {
    warnings.push(
      `last scene starts at ${(lastStart * 100).toFixed(0)}% of the runtime — past the 92% collapse point`,
    );
  }

  return {
    fps,
    wpm,
    scenes,
    totalFrames,
    totalSeconds,
    cutsPerMinute,
    warnings,
  };
};

export const VIDEO_CONFIG = {
  width: 1920,
  height: 1080,
  fps: 30,
};

// Vertical cut — same story, same beats, re-laid-out per scene in
// 9:16 (1080×1920) for YouTube Shorts / Reels / TikTok.
export const VIDEO_CONFIG_PORTRAIT = {
  width: 1080,
  height: 1920,
  fps: 30,
};
