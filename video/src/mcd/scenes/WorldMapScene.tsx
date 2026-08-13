import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE_ARRIVE, EASE_OUT } from "../utils/easing";
import { progressive, useSceneInOut } from "../utils/animation";
import { Camera2D, type CameraKeyframe } from "../components/Camera2D";
import { WorldMap, cellToScreen } from "../components/WorldMap";
import { MoneyFlow, type MoneyStream } from "../components/MoneyFlow";
import { AnimatedText } from "../components/AnimatedText";
import {
  ABSOLUTE,
  SCENE_FRAMES,
} from "../data/story";
import { useStory } from "../StoryContext";
import { cueAt } from "../utils/audio";
import { COLORS, FONT, WEIGHT } from "../theme";
import type { RegionId } from "../data/storyTypes";

const CAMERA: CameraKeyframe[] = [
  { frame: 0, camera: { x: 640, y: 470, scale: 1.5 }, easing: EASE_ARRIVE },
  { frame: 118, camera: { x: 960, y: 520, scale: 1.06 }, easing: EASE_OUT },
  { frame: 240, camera: { x: 960, y: 520, scale: 1.06 } },
];

export const WorldMapScene: React.FC = () => {
  const story = useStory();
  const MAP_TITLE = story.map.title;
  const REGION_ORDER = story.map.regionOrder;
  const HUB_ORIGIN = story.map.hubOrigin;
  const HUBS = story.map.hubs;

  // When each region illuminates, scene-local frames — derived from the
  // story's region order so any number of regions fits the scene window.
  const REGION_WINDOWS: [RegionId, number, number][] = REGION_ORDER.map((r, i) => {
    const from = 18 + i * (222 / Math.max(1, REGION_ORDER.length));
    const to = 60 + i * (180 / Math.max(1, REGION_ORDER.length));
    return [r, Math.round(from), Math.round(to)] as [RegionId, number, number];
  });

  const frame = useCurrentFrame();
  const { opacity, scale } = useSceneInOut(frame, SCENE_FRAMES.map);

  cueAt("map", "whoosh", ABSOLUTE.mapStart);
  REGION_WINDOWS.forEach(([, from]) => cueAt("map", "tick", ABSOLUTE.mapStart + from));
  HUBS.forEach((h) =>
    cueAt(
      "map",
      "money",
      ABSOLUTE.mapStart + REGION_WINDOWS[REGION_ORDER.indexOf(h.region)][1] + 24,
    ),
  );

  const regionProgress: Partial<Record<RegionId, number>> = {};
  for (const [region, from, to] of REGION_WINDOWS) {
    regionProgress[region] = progressive(frame, from, to - from);
  }

  const titleP = progressive(frame, 40, 44, EASE_ARRIVE);

  const streams = useMemo<MoneyStream[]>(() => {
    const from = cellToScreen(HUB_ORIGIN.cell);
    return HUBS.map((h) => {
      const to = cellToScreen(h.cell);
      const c1 = cellToScreen(h.controls[0]);
      const c2 = cellToScreen(h.controls[1]);
      const regionIdx = REGION_ORDER.indexOf(h.region);
      const arcFrom = REGION_WINDOWS[regionIdx][1] + 16;
      return {
        from,
        c1,
        c2,
        to,
        offset: arcFrom + 14,
        travel: 96,
      };
    });
  }, [HUB_ORIGIN, HUBS, REGION_ORDER, REGION_WINDOWS]);

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      <Camera2D keyframes={CAMERA}>
        <WorldMap
          regionProgress={regionProgress}
          arcProgress={HUBS.map((_, i) => {
            const regionIdx = REGION_ORDER.indexOf(HUBS[i].region);
            const arcFrom = REGION_WINDOWS[regionIdx][1] + 10;
            return progressive(frame, arcFrom, 46);
          })}
        />
      </Camera2D>

      {/* Money flowing along the network arcs */}
      <svg
        width="1920"
        height="1080"
        viewBox="0 0 1920 1080"
        style={{ position: "absolute", inset: 0 }}
      >
        <MoneyFlow
          streams={streams}
          perStream={6}
          startFrame={0}
          travel={96}
          particleRadius={[4, 9]}
          markerEvery={4}
        />
      </svg>

      {/* Title, bottom-left over the open Pacific */}
      <div
        style={{
          position: "absolute",
          left: 84,
          bottom: 96,
          opacity: titleP,
          transform: `translateY(${(1 - titleP) * 30}px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <div style={{ width: 42, height: 5, borderRadius: 3, background: COLORS.red }} />
          <span
            style={{
              fontFamily: FONT.headline,
              fontWeight: WEIGHT.bold,
              fontSize: 24,
              letterSpacing: "0.34em",
              color: COLORS.textSecondary,
            }}
          >
            {MAP_TITLE.kicker}
          </span>
        </div>
        <AnimatedText
          lines={MAP_TITLE.lines}
          delay={44}
          lineStagger={11}
          wordStagger={3}
          style={{ fontSize: 76, lineHeight: 1.1, letterSpacing: "-0.01em" }}
        />
      </div>
    </AbsoluteFill>
  );
};