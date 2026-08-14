// The broll scene: each narration line is matched by an asset. The asset
// slides in the moment the voice starts that line, holds while the line is
// spoken, and hands off to the next line's asset at the line boundary — so
// the image on screen always matches the current voice line. Line timing is
// derived from word counts at the story's wpm (the beat engine upgrades this
// to Whisper word timestamps later).

import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "../components/Backdrop";
import { useScene } from "../StoryContext";
import { COLORS, FONT, WEIGHT } from "../theme";
import { useLayout } from "../../story/layout";
import { springProgress } from "../../story/motion";
import { AnimatedText } from "../../story/AnimatedText";
import { SubjectArtwork } from "../../story/SubjectArtwork";
import { resolveAsset } from "../../story/assetRegistry";
import { DESIGN } from "../../story/design";
import type { BrollLine } from "../data/storyTypes";

const words = (text: string): number => text.split(/\s+/).filter(Boolean).length;

export const BrollScene: React.FC = () => {
  const { data, at } = useScene("broll");
  const { fps, width, height } = useVideoConfig();
  const layout = useLayout(width, height);
  const portrait = layout.aspect === "portrait";

  // Line boundaries as scene fractions, derived from word counts. The voice
  // reads continuously, so an asset swaps exactly when the next line starts.
  const lines = useMemo(() => {
    const total = data.lines.reduce((n, l) => n + words(l.text), 0);
    let acc = 0;
    return data.lines.map((l) => {
      const start = acc / Math.max(1, total);
      acc += words(l.text);
      return { line: l, start, end: acc / Math.max(1, total) };
    });
  }, [data.lines]);

  return (
    <AbsoluteFill style={{ background: COLORS.bg, overflow: "hidden" }}>
      <Backdrop scene="hero" />
      <Kicker text={data.kicker} portrait={portrait} />

      {/* one gliding asset per narration line */}
      {lines.map(({ line, start, end }, i) => (
        <BrollShot
          key={i}
          line={line}
          enterFrame={at(start) - 0.08 * fps}
          exitFrame={at(end) - 0.22 * fps}
          width={width}
          height={height}
          portrait={portrait}
          vertical={data.vertical}
        />
      ))}

      {/* captions: the on-screen line for each line, slammed at its start */}
      {lines.map(({ line, start }, i) =>
        line.caption ? (
          <Caption
            key={`c${i}`}
            text={line.caption}
            atFrame={at(start)}
            layout={layout}
          />
        ) : null,
      )}
    </AbsoluteFill>
  );
};

const BrollShot: React.FC<{
  line: BrollLine;
  enterFrame: number;
  exitFrame: number;
  width: number;
  height: number;
  portrait: boolean;
  vertical?: number;
}> = ({ line, enterFrame, exitFrame, width, height, portrait, vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const record = resolveAsset(line.asset);
  const assetRatio = record ? record.height / record.width : 0.5;
  const h = height * (line.heightFrac ?? (portrait ? 0.42 : 0.62));
  const w = h / assetRatio;
  const y = height * (vertical ?? 0.52);
  const dir = (line.direction ?? "rtl") === "ltr" ? 1 : -1;
  const dist = width + w;

  // Enter: slide in from the side with a spring settle.
  const enter = springProgress(frame, {
    fps,
    delay: enterFrame,
    damping: 20,
    stiffness: 160,
    mass: 1,
  });
  // Exit: slide out the other side as the next line's asset arrives.
  const exit = springProgress(frame, {
    fps,
    delay: exitFrame,
    damping: 26,
    stiffness: 140,
    mass: 1,
  });

  const holdP = Math.min(1, Math.max(0, exit));
  const x = dir * dist * 0.5 * ((1 - enter) * (1 - holdP) - holdP);
  const scale = 0.95 + 0.05 * enter;
  const opacity = Math.min(1, enter * 2.2) * (exit < 0.12 ? 1 : Math.min(1, (1 - exit) * 2.2));

  return (
    <div
      style={{
        position: "absolute",
        left: width / 2 + x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        transform: `translate3d(0, 0, 0) scale(${scale})`,
        opacity,
        filter: "drop-shadow(0 30px 50px rgba(26,26,26,0.18))",
      }}
    >
      <SubjectArtwork asset={line.asset} width={w} />
    </div>
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

const Caption: React.FC<{
  text: string;
  atFrame: number;
  layout: ReturnType<typeof useLayout>;
}> = ({ text, atFrame, layout }) => (
  <div
    style={{
      position: "absolute",
      left: layout.width / 2,
      top: layout.height * 0.24,
      transform: "translate(-50%, -50%)",
      textAlign: "center",
      maxWidth: layout.width * 0.86,
      pointerEvents: "none",
    }}
  >
    <AnimatedText
      text={text}
      anim="slam"
      delay={atFrame}
      personality="aggressive"
      style={{
        fontFamily: FONT.headline,
        fontWeight: WEIGHT.black,
        fontSize: layout.type(DESIGN.type.headline),
        lineHeight: 1.05,
        letterSpacing: "0.01em",
        color: COLORS.textPrimary,
      }}
    />
  </div>
);

export type { BrollData } from "../data/storyTypes";