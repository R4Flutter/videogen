// ChapterCard: the transition between chapters is the film re-orienting
// itself. A full-frame paper page, the chapter's title, and its number —
// held long enough to register, gone before it is asked to carry anything.
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

const vox = theme.vox;
const CHAP_DUR = 2.6; // seconds the card owns the frame

export const ChapterCard: React.FC<{ text: string; subtext?: string; chapter: number }> = ({
  text,
  subtext,
  chapter,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = frame / 30;

  const inT = interpolate(t, [0, 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outT = interpolate(t, [CHAP_DUR - 0.7, CHAP_DUR], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const op = Math.min(inT, outT);
  if (op <= 0) return null;

  const lift = (1 - inT) * width * 0.04;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: vox.paper,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: op,
        zIndex: 10,
      }}
    >
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 60% at 50% 42%, #FFFDF7 0%, ${vox.paper} 60%, ${vox.paperDeep} 100%)` }} />
      <div
        style={{
          transform: `translateY(${lift}px)`,
          textAlign: "center",
          padding: `0 ${width * 0.1}px`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: width * 0.02,
            fontFamily: vox.font,
            fontSize: width * 0.028,
            fontWeight: 700,
            letterSpacing: width * 0.006,
            textTransform: "uppercase",
            color: vox.accent,
            marginBottom: height * 0.035,
          }}
        >
          <span style={{ width: width * 0.06, height: 3, background: vox.accent }} />
          {subtext ?? `CHAPTER ${chapter}`}
          <span style={{ width: width * 0.06, height: 3, background: vox.accent }} />
        </div>
        <div
          style={{
            fontFamily: vox.font,
            fontWeight: 800,
            fontSize: width * (text.length > 18 ? 0.07 : 0.095),
            lineHeight: 1,
            letterSpacing: -width * 0.0025,
            color: vox.ink,
            textTransform: "uppercase",
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};
