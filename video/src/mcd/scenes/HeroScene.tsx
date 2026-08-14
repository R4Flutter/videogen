// The hero scene: a subject (vehicle / product / person / object) enters
// with real physics — acceleration, overshoot, settle — while headlines,
// numbers and labels land on their own beats, and the camera responds to
// the strongest beats. Extra foreground layers (a person on a machine, a
// prop) can be mounted to the subject box with `position: "subject"` and
// enter on their own beats. This scene is the milestone proof: scene JSON
// describes WHAT happens; the layout engine (src/story/layout) decides
// WHERE; the motion engine (src/story/motion) decides HOW; Remotion renders.

import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { useScene } from "../StoryContext";
import { COLORS, FONT, WEIGHT } from "../theme";
import { useLayout, type CustomPosition } from "../../story/layout";
import { ENTRANCES, EXITS, type EntranceParams, type Personality } from "../../story/motion";
import { fromFractions, triggerFrame, type BeatMap } from "../../story/beats";
import { CameraRig } from "../../story/CameraRig";
import { AnimatedText, type TextAnimType } from "../../story/AnimatedText";
import { SpeedLines } from "../../story/SpeedLines";
import { SubjectArtwork } from "../../story/SubjectArtwork";
import { resolveAsset } from "../../story/assetRegistry";
import { DESIGN } from "../../story/design";
import type { HeroMotion, HeroSubjectLayer, HeroTextLayer } from "../data/storyTypes";

const TEXT_ROLES = {
  headline: DESIGN.type.headline,
  number: DESIGN.type.number,
  sub: DESIGN.type.sub,
  kicker: DESIGN.type.kicker,
} as const;

const NO_MOTION = { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, velocity: 0, blur: 0 };

// Entrance/exit poses for one layer, resolved against its beat trigger.
const layerPose = (
  frame: number,
  fps: number,
  width: number,
  durationInFrames: number,
  motion: HeroMotion,
  exit?: HeroMotion,
  beatMap?: BeatMap,
  at?: (p: number) => number,
) => {
  const delay =
    beatMap && at
      ? triggerFrame(beatMap, motion.trigger, at, 0.04) + (motion.delayFrames ?? 0)
      : 0;
  const entrance: EntranceParams = {
    frame,
    fps,
    distance: width * 1.1,
    personality: (motion.personality ?? "aggressive") as Personality,
    overshoot: motion.overshoot ?? true,
    delay,
    blur: motion.blur ?? 0,
  };
  const enter = ENTRANCES[motion.type as keyof typeof ENTRANCES]?.(entrance) ?? NO_MOTION;
  const out = exit
    ? EXITS[exit.type as keyof typeof EXITS]?.({
        frame,
        fps,
        sceneEnd: durationInFrames,
        distance: width * 1.1,
        personality: (exit.personality ?? "snappy") as Personality,
        durationInFrames: exit.durationFrames,
      }) ?? null
    : null;
  return { enter, out };
};

export const HeroScene: React.FC = () => {
  const { data, durationInFrames, at } = useScene("hero");
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const layout = useLayout(width, height);
  const portrait = layout.aspect === "portrait";

  const beatMap = useMemo<BeatMap>(
    () => fromFractions(data.beats, durationInFrames / fps),
    [data.beats, durationInFrames, fps],
  );

  // Camera impacts: the most important beats punch the frame.
  const impacts = useMemo(
    () =>
      data.beats
        .filter((b) => b.importance >= 0.7)
        .map((b) => ({ at: at(b.at), strength: b.importance })),
    [data.beats, at],
  );

  const s = data.subject;
  const record = resolveAsset(s.asset);
  const assetRatio = record ? record.height / record.width : s.kind === "vehicle" ? 0.34 : 0.5;
  const subjectW = Math.min(s.width, width * (portrait ? 0.88 : 0.62));
  const subjectH = subjectW * assetRatio;

  const { enter, out } = layerPose(
    frame,
    fps,
    width,
    durationInFrames,
    s.entrance,
    s.exit,
    beatMap,
    at,
  );

  const pos = layout.point(s.position, s.custom as CustomPosition);
  const subjectX = pos.x + enter.x + (out?.x ?? 0);
  const subjectY = pos.y + enter.y + (out?.y ?? 0);
  const subjectScale = (s.scale ?? 1) * enter.scale * (out?.scale ?? 1);
  const subjectOpacity = enter.opacity * (out?.opacity ?? 1);
  const velocity = Math.max(enter.velocity, out?.velocity ?? 0);
  const speedLines = s.effects?.includes("speed_lines") ?? false;
  const subtleShadow = s.effects?.includes("subtle_shadow") ?? false;

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: "hidden" }}>
      <Backdrop scene="hero" />
      <CameraRig
        move={data.camera.move}
        intensity={data.camera.intensity}
        durationInFrames={durationInFrames}
        impacts={impacts}
      >
        {/* kicker */}
        <Kicker text={data.kicker} portrait={portrait} />

        {/* the subject */}
        <SubjectBox
          x={subjectX}
          y={subjectY}
          w={subjectW}
          h={subjectH}
          anchorX={0.5}
          anchorY={0.5}
          scale={subjectScale}
          opacity={subjectOpacity}
          rotation={s.rotation ?? 0}
          blur={enter.blur ?? 0}
          speedLines={speedLines}
          velocity={velocity}
          subtleShadow={subtleShadow}
          asset={s.asset}
        />

        {/* extra foreground layers, mounted to the subject box or placed freely */}
        {(data.subjects ?? []).map((layer, i) => (
          <ExtraLayer
            key={i}
            layer={layer}
            beatMap={beatMap}
            at={at}
            durationInFrames={durationInFrames}
            width={width}
            height={height}
            portrait={portrait}
            subjectX={subjectX}
            subjectY={subjectY}
            subjectW={subjectW}
            subjectH={subjectH}
          />
        ))}

        {/* text layers, each entering on its own beat */}
        {(data.texts ?? []).map((t, i) => (
          <HeroText key={i} layer={t} beatMap={beatMap} layout={layout} at={at} />
        ))}
      </CameraRig>
    </AbsoluteFill>
  );
};

// A positioned box holding the artwork; used by the primary subject.
const SubjectBox: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  anchorX: number;
  anchorY: number;
  scale: number;
  opacity: number;
  rotation: number;
  blur: number;
  speedLines: boolean;
  velocity: number;
  subtleShadow: boolean;
  asset?: string;
}> = ({
  x,
  y,
  w,
  h,
  anchorX,
  anchorY,
  scale,
  opacity,
  rotation,
  blur,
  speedLines,
  velocity,
  subtleShadow,
  asset,
}) => (
  <div
    style={{
      position: "absolute",
      left: x - anchorX * w,
      top: y - anchorY * h,
      width: w,
      transform: `rotate(${rotation}deg)`,
    }}
  >
    {speedLines ? <SpeedLines velocity={velocity} color={COLORS.textPrimary} /> : null}
    <div
      style={{
        transform: `translate3d(0, 0, 0) scale(${scale})`,
        opacity,
        filter:
          blur > 0.02
            ? `blur(${blur}px)`
            : subtleShadow
              ? "drop-shadow(0 24px 36px rgba(26,26,26,0.16))"
              : undefined,
      }}
    >
      <SubjectArtwork asset={asset} width={w} />
    </div>
  </div>
);

// A mounted / free foreground layer with its own entrance and exit.
const ExtraLayer: React.FC<{
  layer: HeroSubjectLayer;
  beatMap: BeatMap;
  at: (p: number) => number;
  durationInFrames: number;
  width: number;
  height: number;
  portrait: boolean;
  subjectX: number;
  subjectY: number;
  subjectW: number;
  subjectH: number;
}> = ({
  layer,
  beatMap,
  at,
  durationInFrames,
  width,
  height,
  portrait,
  subjectX,
  subjectY,
  subjectW,
  subjectH,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = useLayout(width, height);
  const { enter, out } = layerPose(
    frame,
    fps,
    width,
    durationInFrames,
    layer.entrance,
    layer.exit,
    beatMap,
    at,
  );

  const record = resolveAsset(layer.asset);
  const assetRatio = record ? record.height / record.width : layer.kind === "vehicle" ? 0.34 : 0.5;

  let w: number;
  if (layer.relativeWidth !== undefined) {
    w = layer.relativeWidth * subjectW;
  } else {
    const shortEdge = Math.min(width, height);
    w = Math.min(
      (layer.width ?? 900) * (shortEdge / 1080),
      width * (portrait ? 0.88 : 0.62),
    );
  }
  const h = w * assetRatio;

  const mounted =
    layer.position === "subject"
      ? {
          x: subjectX - subjectW / 2 + (layer.custom?.x ?? 0.5) * subjectW,
          y: subjectY - subjectH / 2 + (layer.custom?.y ?? 0.5) * subjectH,
        }
      : layout.point(layer.position, layer.custom as CustomPosition);

  const anchorX = layer.anchor?.x ?? 0.5;
  const anchorY = layer.anchor?.y ?? 0.5;
  const speedLines = layer.effects?.includes("speed_lines") ?? false;
  const subtleShadow = layer.effects?.includes("subtle_shadow") ?? false;

  return (
    <SubjectBox
      x={mounted.x + enter.x + (out?.x ?? 0)}
      y={mounted.y + enter.y + (out?.y ?? 0)}
      w={w}
      h={h}
      anchorX={anchorX}
      anchorY={anchorY}
      scale={(layer.scale ?? 1) * enter.scale * (out?.scale ?? 1)}
      opacity={enter.opacity * (out?.opacity ?? 1)}
      rotation={layer.rotation ?? 0}
      blur={enter.blur ?? 0}
      speedLines={speedLines}
      velocity={Math.max(enter.velocity, out?.velocity ?? 0)}
      subtleShadow={subtleShadow}
      asset={layer.asset}
    />
  );
};

const Kicker: React.FC<{
  text: string;
  portrait: boolean;
}> = ({ text, portrait }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: portrait ? 120 : 84,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      opacity: 1,
      pointerEvents: "none",
    }}
  >
    <div style={{ width: 42, height: 5, borderRadius: 3, background: COLORS.red }} />
    <span
      style={{
        fontFamily: FONT.headline,
        fontWeight: WEIGHT.bold,
        fontSize: portrait ? 26 : 24,
        letterSpacing: "0.34em",
        color: COLORS.textSecondary,
      }}
    >
      {text}
    </span>
  </div>
);

const HeroText: React.FC<{
  layer: HeroTextLayer;
  beatMap: BeatMap;
  layout: ReturnType<typeof useLayout>;
  at: (p: number) => number;
}> = ({ layer, beatMap, layout, at }) => {
  const delay = triggerFrame(beatMap, layer.anim.trigger, at, 0.5);
  const pos = layout.point(layer.position, layer.custom as CustomPosition);
  const size = layout.type(TEXT_ROLES[layer.role ?? "headline"]);
  const accent = layer.accent === true;

  return (
    <div
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        transform: "translate(-50%, -50%)",
        textAlign: "center",
        maxWidth: layout.width * 0.86,
        pointerEvents: "none",
      }}
    >
      <AnimatedText
        text={layer.text}
        anim={(layer.anim.type as TextAnimType) ?? "slam"}
        delay={delay}
        durationInFrames={layer.anim.durationFrames}
        personality={(layer.anim.personality ?? "aggressive") as Personality}
        style={{
          fontFamily: FONT.headline,
          fontWeight: layer.role === "sub" || layer.role === "kicker" ? WEIGHT.bold : WEIGHT.black,
          fontSize: size,
          lineHeight: 1.05,
          letterSpacing: layer.role === "kicker" ? "0.34em" : "0.01em",
          color: accent ? COLORS.red : COLORS.textPrimary,
        }}
      />
    </div>
  );
};

export type { HeroData } from "../data/storyTypes";
