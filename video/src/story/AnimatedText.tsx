// Text animation vocabulary. Every variant is a pure function of frame +
// params returning per-word / per-char transforms, so text animations stay
// declarative and share the same spring physics as everything else.

import React, { useMemo } from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_OUT_BACK, EASE_OUT_QUINT, EASE_IN_OUT, EASE_ARRIVE } from "../mcd/utils/easing";
import { springProgress, clamp01, type Transform } from "./motion";
import type { Personality } from "./design";

export type TextAnimType =
  | "word_pop"
  | "character_reveal"
  | "type_on"
  | "slam"
  | "scale_pop"
  | "fade_up"
  | "fade_down"
  | "split_reveal"
  | "mask_reveal"
  | "underline_reveal"
  | "highlight"
  | "counter";

export type TextAnimParams = {
  frame: number;
  fps: number;
  delay?: number;
  durationInFrames?: number;
  personality?: Personality;
};

type WordPose = Transform & { maskW?: number };

// Word-level animation. Returns a per-index transform for staggered reveal.
export const wordPose = (
  index: number,
  count: number,
  anim: TextAnimType,
  p: TextAnimParams,
): WordPose => {
  const { frame, fps, delay = 0, durationInFrames = 14 } = p;
  const start = delay + index * 4;

  switch (anim) {
    case "word_pop": {
      const raw = springProgress(frame, { fps, delay: start, damping: 14, stiffness: 300, mass: 0.7 });
      const t = clamp01(raw);
      return {
        x: 0,
        y: 0,
        scale: 0.55 + t * 0.45,
        rotation: 0,
        opacity: clamp01(raw * 1.8),
        velocity: clamp01(
          Math.abs(
            springProgress(frame + 1, { fps, delay: start, damping: 14, stiffness: 300, mass: 0.7 }) -
              raw,
          ) * 14,
        ),
      };
    }
    case "fade_up":
    case "fade_down": {
      const t = clamp01(
        interpolate(frame, [start, start + durationInFrames], [0, 1], {
          easing: EASE_OUT_QUINT,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      );
      const dy = anim === "fade_up" ? 0.5 : -0.5;
      return { x: 0, y: (1 - t) * dy * 26, scale: 0.96 + t * 0.04, rotation: 0, opacity: t, velocity: t };
    }
    case "slam": {
      const t = clamp01(
        interpolate(frame, [start, start + 16], [0, 1], {
          easing: EASE_OUT_BACK,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      );
      return {
        x: 0,
        y: 0,
        scale: interpolate(t, [0, 1], [2.6, 1], { easing: EASE_OUT_BACK }),
        rotation: interpolate(t, [0, 1], [-5, 0]),
        opacity: clamp01(t * 1.6),
        velocity: t,
      };
    }
    case "scale_pop": {
      const t = clamp01(springProgress(frame, { fps, delay: start, damping: 16, stiffness: 320, mass: 0.7 }));
      return { x: 0, y: 0, scale: 0.6 + t * 0.4, rotation: 0, opacity: 1, velocity: t };
    }
    case "split_reveal": {
      const t = clamp01(
        interpolate(frame, [start, start + durationInFrames], [0, 1], {
          easing: EASE_IN_OUT,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      );
      const dir = index % 2 === 0 ? -1 : 1;
      return { x: dir * (1 - t) * 40, y: 0, scale: 1, rotation: 0, opacity: t, velocity: t };
    }
    case "mask_reveal": {
      const t = clamp01(
        interpolate(frame, [start, start + durationInFrames], [0, 1], {
          easing: EASE_IN_OUT,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      );
      return { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, velocity: t, maskW: t };
    }
    default:
      return { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, velocity: 0 };
  }
};

// Whole-line wrapper: fade + slight scale, used for captions and labels.
export const linePose = (anim: TextAnimType, p: TextAnimParams): WordPose => {
  const { frame, fps, delay = 0, durationInFrames = 16 } = p;
  switch (anim) {
    case "fade_up": {
      const t = clamp01(
        interpolate(frame, [delay, delay + durationInFrames], [0, 1], {
          easing: EASE_OUT_QUINT,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      );
      return { x: 0, y: (1 - t) * 30, scale: 0.97 + t * 0.03, rotation: 0, opacity: t, velocity: t };
    }
    case "fade_down": {
      const t = clamp01(
        interpolate(frame, [delay, delay + durationInFrames], [0, 1], {
          easing: EASE_OUT_QUINT,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      );
      return { x: 0, y: -(1 - t) * 30, scale: 0.97 + t * 0.03, rotation: 0, opacity: t, velocity: t };
    }
    case "slam": {
      const t = clamp01(
        interpolate(frame, [delay, delay + 18], [0, 1], {
          easing: EASE_OUT_BACK,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      );
      return {
        x: 0,
        y: 0,
        scale: interpolate(t, [0, 1], [2.4, 1], { easing: EASE_OUT_BACK }),
        rotation: interpolate(t, [0, 1], [-3, 0]),
        opacity: clamp01(t * 1.6),
        velocity: t,
      };
    }
    default: {
      const t = clamp01(springProgress(frame, { fps, delay, damping: 18, stiffness: 220 }));
      return { x: 0, y: 0, scale: 0.9 + t * 0.1, rotation: 0, opacity: clamp01(t * 1.6), velocity: t };
    }
  }
};

// Character-level reveal (typewriter / character_reveal).
export const charPose = (
  index: number,
  anim: TextAnimType,
  p: TextAnimParams,
): { opacity: number; blur: number } => {
  const { frame, delay = 0, durationInFrames = 3 } = p;
  const start = delay + index * 2;
  const t = clamp01(
    interpolate(frame, [start, start + durationInFrames], [0, 1], {
      easing: EASE_OUT_QUINT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  void anim;
  return { opacity: t, blur: (1 - t) * 2 };
};

// ------------------------------------------------------------------ counter

export const counterValue = (
  frame: number,
  delay: number,
  durationInFrames: number,
  from: number,
  to: number,
): number => {
  const t = clamp01(
    interpolate(frame, [delay, delay + durationInFrames], [0, 1], {
      easing: EASE_ARRIVE,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );
  return Math.round(from + (to - from) * t);
};

// ---------------------------------------------------------------- underline

export const underlineProgress = (
  frame: number,
  delay: number,
  durationInFrames: number,
): number =>
  clamp01(
    interpolate(frame, [delay, delay + durationInFrames], [0, 1], {
      easing: EASE_IN_OUT,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

// ------------------------------------------------------------- the component

export type AnimatedTextProps = {
  text: string;
  anim: TextAnimType;
  delay?: number;
  durationInFrames?: number;
  personality?: Personality;
  style?: React.CSSProperties;
  // Renders an accent underline that draws itself after the text arrives.
  underlineColor?: string;
  underlineDelay?: number;
  // Word-level: renders each word as an inline span with its own pose.
  wordLevel?: boolean;
  // Character-level: type_on / character_reveal.
  charLevel?: boolean;
};

// Deterministic text renderer for the editorial stack. The whole line
// fades/scales via linePose; word/char variants stagger per element.
export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  anim,
  delay = 0,
  durationInFrames = 16,
  underlineColor,
  underlineDelay,
  wordLevel = false,
  charLevel = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = useMemo(() => text.split(" "), [text]);
  const count = words.length;

  return (
    <span
      style={{
        display: "inline-block",
        whiteSpace: "pre-wrap",
      }}
    >
      {words.map((w, i) => (
        <Word
          key={i}
          word={w}
          index={i}
          count={count}
          anim={anim}
          delay={delay}
          durationInFrames={durationInFrames}
          wordLevel={wordLevel}
          charLevel={charLevel}
          frame={frame}
          fps={fps}
        />
      ))}
      {underlineColor ? (
        <Underline color={underlineColor} delay={underlineDelay ?? delay} frame={frame} fps={fps} />
      ) : null}
    </span>
  );
};

const Word: React.FC<{
  word: string;
  index: number;
  count: number;
  anim: TextAnimType;
  delay: number;
  durationInFrames: number;
  wordLevel: boolean;
  charLevel: boolean;
  frame: number;
  fps: number;
}> = ({ word, index, count, anim, delay, durationInFrames, wordLevel, charLevel, frame, fps }) => {
  if (charLevel) {
    return (
      <span style={{ display: "inline-block" }}>
        {Array.from(word).map((c, i) => {
          const pose = charPose(index * 8 + i, anim, { frame, fps, delay });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: pose.opacity,
                filter: pose.blur > 0.02 ? `blur(${pose.blur}px)` : undefined,
              }}
            >
              {c}
            </span>
          );
        })}
        {index < count - 1 ? <span>&nbsp;</span> : null}
      </span>
    );
  }
  if (!wordLevel) {
    // Whole-line animation (slam, fade_up, ...) — the entire line shares one
    // pose so headlines land as a single unit, not word by word.
    const pose = linePose(anim, { frame, fps, delay, durationInFrames });
    return (
      <span
        style={{
          display: "inline-block",
          opacity: pose.opacity,
          transform: `translate3d(${pose.x}px, ${pose.y}px, 0) scale(${pose.scale}) rotate(${pose.rotation}deg)`,
          clipPath: pose.maskW !== undefined ? `inset(0 ${(1 - (pose.maskW ?? 1)) * 100}% 0 0)` : undefined,
          whiteSpace: "pre-wrap",
        }}
      >
        {word}
        {index < count - 1 ? " " : ""}
      </span>
    );
  }
  const pose = wordPose(index, count, anim, { frame, fps, delay, durationInFrames });
  return (
    <span
      style={{
        display: "inline-block",
        opacity: pose.opacity,
        transform: `translate3d(${pose.x}px, ${pose.y}px, 0) scale(${pose.scale}) rotate(${pose.rotation}deg)`,
        clipPath: pose.maskW !== undefined ? `inset(0 ${(1 - (pose.maskW ?? 1)) * 100}% 0 0)` : undefined,
      }}
    >
      {word}
      {index < count - 1 ? "\u00A0" : ""}
    </span>
  );
};

const Underline: React.FC<{ color: string; delay: number; frame: number; fps: number }> = ({
  color,
  delay,
  frame,
  fps,
}) => {
  const p = underlineProgress(frame, delay, 12);
  void fps;
  return (
    <span
      style={{
        display: "block",
        height: 6,
        marginTop: 6,
        borderRadius: 3,
        background: color,
        transformOrigin: "left center",
        transform: `scaleX(${p})`,
        width: "100%",
      }}
    />
  );
};