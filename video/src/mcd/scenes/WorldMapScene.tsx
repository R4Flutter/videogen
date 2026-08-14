import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_ARRIVE, EASE_OUT } from "../utils/easing";
import { progressive, useSceneInOut } from "../utils/animation";
import { Camera2D, type CameraKeyframe } from "../components/Camera2D";
import { WorldMap, cellToScreen } from "../components/WorldMap";
import { Backdrop } from "../components/Backdrop";
import { MoneyFlow, type MoneyStream } from "../components/MoneyFlow";
import { AnimatedText } from "../components/AnimatedText";
import { useScene } from "../StoryContext";
import { COLORS, FONT, WEIGHT } from "../theme";
import type { RegionId } from "../data/storyTypes";

// When each region window starts, as fractions of the scene (mirrored by
// the map cues).
const WINDOW = {
  from: 12 / 180,
  to: 40 / 180,
  span: 148 / 180,
  step: 120 / 180,
  arcDur: 46 / 180,
};

export const WorldMapScene: React.FC = () => {
  const { data, durationInFrames, at } = useScene("map");
  const MAP_TITLE = data.title;
  const REGION_ORDER = data.regionOrder;
  const HUB_ORIGIN = data.hubOrigin;
  const HUBS = data.hubs;

  // When each region illuminates, scene-local frames — derived from the
  // story's region order so any number of regions fits the scene window.
  const REGION_WINDOWS: [RegionId, number, number][] = REGION_ORDER.map((r, i) => {
    const from = at(WINDOW.from + i * (WINDOW.span / Math.max(1, REGION_ORDER.length)));
    const to = at(WINDOW.to + i * (WINDOW.step / Math.max(1, REGION_ORDER.length)));
    return [r, from, to] as [RegionId, number, number];
  });

  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  const { opacity, scale } = useSceneInOut(frame, durationInFrames);

  const CAMERA = useMemo<CameraKeyframe[]>(
    () => [
      { frame: 0, camera: { x: 640, y: 470, scale: 1.5 }, easing: EASE_ARRIVE },
      { frame: at(0.439), camera: { x: 960, y: 520, scale: 1.06 }, easing: EASE_OUT },
      { frame: at(0.889), camera: { x: 960, y: 520, scale: 1.06 } },
    ],
    [at],
  );
  const CAMERA_P = useMemo<CameraKeyframe[]>(
    () => [
      { frame: 0, camera: { x: 540, y: 960, scale: 1.35 }, easing: EASE_ARRIVE },
      { frame: at(0.439), camera: { x: 540, y: 960, scale: 1 }, easing: EASE_OUT },
      { frame: at(0.889), camera: { x: 540, y: 960, scale: 1 } },
    ],
    [at],
  );

  const regionProgress: Partial<Record<RegionId, number>> = {};
  for (const [region, from, to] of REGION_WINDOWS) {
    regionProgress[region] = progressive(frame, from, to - from);
  }

  const titleP = progressive(frame, at(0.15), at(0.311) - at(0.15), EASE_ARRIVE);

  const streams = useMemo<MoneyStream[]>(() => {
    const from = cellToScreen(HUB_ORIGIN.cell);
    return HUBS.map((h) => {
      const to = cellToScreen(h.cell);
      const c1 = cellToScreen(h.controls[0]);
      const c2 = cellToScreen(h.controls[1]);
      const regionIdx = REGION_ORDER.indexOf(h.region);
      const arcFrom = REGION_WINDOWS[regionIdx][1] + at(0.089);
      return {
        from,
        c1,
        c2,
        to,
        offset: arcFrom + at(0.078),
        travel: at(0.533),
      };
    });
  }, [HUB_ORIGIN, HUBS, REGION_ORDER, REGION_WINDOWS, at]);

  const arcDur = at(WINDOW.arcDur);

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      <Backdrop scene="map" />
      <Camera2D keyframes={portrait ? CAMERA_P : CAMERA}>
        {portrait ? (
          /* Portrait: the 1920×1080 map world scaled to fill the width
             (1080/1920 = 0.5625), title stacked below in the empty band. */
          <div style={{ position: "absolute", left: 0, top: 260, width: 1080, height: 607, overflow: "hidden" }}>
            <div style={{ width: 1920, height: 1080, transform: "scale(0.5625)", transformOrigin: "top left" }}>
              <WorldMap
                regionProgress={regionProgress}
                arcProgress={HUBS.map((_, i) => {
                  const regionIdx = REGION_ORDER.indexOf(HUBS[i].region);
                  const arcFrom = REGION_WINDOWS[regionIdx][1] + at(0.056);
                  return progressive(frame, arcFrom, arcDur);
                })}
                hubOrigin={data.hubOrigin}
                hubs={data.hubs}
                regionLabel={data.regionLabel}
                regionLabelCell={data.regionLabelCell}
              />
              {/* Money flowing along the network arcs */}
              <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
                <MoneyFlow
                  streams={streams}
                  perStream={6}
                  startFrame={0}
                  travel={at(0.533)}
                  particleRadius={[4, 9]}
                  markerEvery={4}
                />
              </svg>
            </div>
          </div>
        ) : (
          <>
            <WorldMap
              regionProgress={regionProgress}
              arcProgress={HUBS.map((_, i) => {
                const regionIdx = REGION_ORDER.indexOf(HUBS[i].region);
                const arcFrom = REGION_WINDOWS[regionIdx][1] + at(0.056);
                return progressive(frame, arcFrom, arcDur);
              })}
              hubOrigin={data.hubOrigin}
              hubs={data.hubs}
              regionLabel={data.regionLabel}
              regionLabelCell={data.regionLabelCell}
            />

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
                travel={at(0.533)}
                particleRadius={[4, 9]}
                markerEvery={4}
              />
            </svg>
          </>
        )}
      </Camera2D>

      {/* Title, bottom-left over the open Pacific */}
      <div
        style={
          portrait
            ? {
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 220,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                opacity: titleP,
                transform: `translateY(${(1 - titleP) * 30}px)`,
              }
            : {
                position: "absolute",
                left: 84,
                bottom: 96,
                opacity: titleP,
                transform: `translateY(${(1 - titleP) * 30}px)`,
              }
        }
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
          delay={at(0.161)}
          lineStagger={7}
          wordStagger={2}
          align={portrait ? "center" : "left"}
          style={{
            fontSize: portrait ? 56 : 76,
            lineHeight: 1.1,
            letterSpacing: "-0.01em",
            textAlign: portrait ? "center" : undefined,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
