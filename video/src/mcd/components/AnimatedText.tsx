import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { springProgress } from "../utils/animation";
import { COLORS, FONT, WEIGHT } from "../theme";
import type { StoryLine, StoryTextPart } from "../data/storyTypes";

export type TextPart = StoryTextPart;
export type TextLine = StoryLine;

type Props = {
  lines: StoryLine | StoryLine[];
  delay?: number;
  lineStagger?: number;
  wordStagger?: number;
  variant?: "mask" | "fade";
  align?: "left" | "center";
  color?: string;
  accentColor?: string;
  style?: React.CSSProperties;
  wordStyle?: React.CSSProperties;
};

type Word = { text: string; accent: boolean };

const wordsOf = (line: StoryLine): Word[] => {
  const parts: StoryTextPart[] = typeof line === "string" ? [line] : line;
  return parts.flatMap((p) => {
    const text = typeof p === "string" ? p : p.text;
    const accent = typeof p === "string" ? false : !!p.accent;
    return text
      .split(" ")
      .filter(Boolean)
      .map((w) => ({ text: w, accent }));
  });
};

// Normalize `lines` so it may be a single line or a list of lines.
const toLines = (lines: StoryLine | StoryLine[]): StoryLine[] => {
  if (!Array.isArray(lines)) return [lines];
  if (lines.length === 0) return [];
  const isLineList = lines.every(
    (l) => typeof l === "string" || Array.isArray(l),
  );
  return isLineList ? lines : [lines as StoryTextPart[]];
};

// Kinetic typography: lines rise out of a mask with per-word stagger.
export const AnimatedText: React.FC<Props> = ({
  lines,
  delay = 0,
  lineStagger = 10,
  wordStagger = 3,
  variant = "mask",
  align = "left",
  color = COLORS.textPrimary,
  accentColor = COLORS.gold,
  style,
  wordStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lineList = toLines(lines);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        fontFamily: FONT.headline,
        fontWeight: WEIGHT.black,
        ...style,
      }}
    >
      {lineList.map((line, li) => {
        const words = wordsOf(line);
        const base = delay + li * lineStagger;
        return (
          <div
            key={li}
            style={{
              overflow: "hidden",
              paddingBottom: "0.06em",
              marginBottom: "-0.06em",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: align === "center" ? "center" : "flex-start" }}>
              {words.map((w, wi) => {
                const p = springProgress(frame, fps, {
                  delay: base + wi * wordStagger,
                });
                const appear = Math.max(0, Math.min(1, p));
                const rise = variant === "mask" ? 1.25 - appear * 1.25 : (1 - appear) * 0.4;
                return (
                  <span
                    key={wi}
                    style={{
                      display: "inline-block",
                      whiteSpace: "pre",
                      color: w.accent ? accentColor : color,
                      transform: `translateY(${rise * 1.2}em)`,
                      opacity: variant === "mask" ? 1 : Math.min(1, appear * 2),
                      ...wordStyle,
                    }}
                  >
                    {w.text}
                    {wi < words.length - 1 ? " " : ""}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};