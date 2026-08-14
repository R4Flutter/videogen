// The slide scene: an asset glides across the full canvas — enters from one
// edge, traverses the frame, exits the other — like a product showcase / film
// slide. Speed comes from the scene's duration; direction, size and vertical
// placement are scene JSON. Headlines land mid-glide on their beats.

import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { useScene } from "../StoryContext";
import { COLORS, FONT, WEIGHT } from "../theme";
import { useLayout, type CustomPosition } from "../../story/layout";
import { type Personality } from "../../story/motion";
import { fromFractions, triggerFrame, type BeatMap } from "../../story/beats";
import { AnimatedText, type TextAnimType } from "../../story/AnimatedText";
import { SubjectArtwork } from "../../story/SubjectArtwork";
import { resolveAsset } from "../../story/assetRegistry";
import { DESIGN } from "../../story/design";
import type { SlideTextLayer } from "../data/storyTypes";

const TEXT_ROLES = {
  headline: DESIGN.type.headline,
  number: DESIGN.type.number,
  sub: DESIGN.type.sub,
  kicker: DESIGN.type.kicker,
} as const;

const easeInOut = (p: number): number =>
  p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

export const SlideScene: React.FC = () => {
  const { data, durationInFrames, at } = useScene("slide");
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const layout = useLayout(width, height);
  const portrait = layout.aspect === "portrait";

  const beatMap = useMemo<BeatMap>(
    () => fromFractions(data.beats ?? [], durationInFrames / fps),
    [data.beats, durationInFrames, fps],
  );

  const s = data.subject;
  const record = resolveAsset(s.asset);
  const assetRatio = record ? record.height / record.width : 0.5;
  const h = height * (s.heightFrac ?? (portrait ? 0.5 : 0.7));
  const w = h / assetRatio;
  const y = height * (s.vertical ?? 0.52);

  // Glide across the canvas; the edges ease so the traversal reads as
  // deliberate, not mechanical.
  const raw = Math.min(1, Math.max(0, frame / durationInFrames));
  const edge = 0.14;
  const t =
    raw < edge
      ? easeInOut(raw / edge) * edge
      : raw > 1 - edge
        ? 1 - edge + easeInOut((raw - (1 - edge)) / edge) * edge
        : raw;
  const x =
    s.direction === "ltr"
      ? -w / 2 + t * (width + w)
      : width + w / 2 - t * (width + w);

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: "hidden" }}>
      <Backdrop scene="hero" />
      <Kicker text={data.kicker} portrait={portrait} />

      {/* the gliding asset */}
      <div
        style={{
          position: "absolute",
          left: x,
          top: y - h / 2,
          width: w,
          height: h,
          transform: `rotate(${s.rotation ?? 0}deg)`,
          filter: "drop-shadow(0 30px 50px rgba(26,26,26,0.18))",
        }}
      >
        <SubjectArtwork asset={s.asset} width={w} />
      </div>

      {/* text layers landing mid-glide */}
      {(data.texts ?? []).map((t2, i) => (
        <SlideText key={i} layer={t2} beatMap={beatMap} layout={layout} at={at} />
      ))}
    </AbsoluteFill>
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

const SlideText: React.FC<{
  layer: SlideTextLayer;
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

export type { SlideData } from "../data/storyTypes";