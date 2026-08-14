import React, { useMemo } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_ARRIVE } from "../utils/easing";
import { progressive, springProgress, useSceneInOut } from "../utils/animation";
import { Camera2D, type CameraKeyframe } from "../components/Camera2D";
import { AnimatedText } from "../components/AnimatedText";
import { PhoneHero } from "../components/PhoneHero";
import { Backdrop } from "../components/Backdrop";
import { useScene, useStory } from "../StoryContext";
import { COLORS, FONT, WEIGHT } from "../theme";
import type { StoryLine } from "../data/storyTypes";

export const Hook: React.FC = () => {
  const story = useStory();
  const { data, durationInFrames, at } = useScene("hook");
  const hero = data.hero ?? story.hero;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const { opacity, scale } = useSceneInOut(frame, durationInFrames, {
    fadeIn: 10,
    entranceScale: 1.02,
  });

  const CAMERA = useMemo<CameraKeyframe[]>(
    () => [
      { frame: 0, camera: { x: 900, y: 540, scale: 0.96 } },
      { frame: at(0.6), camera: { x: 900, y: 540, scale: 0.96 }, easing: EASE_ARRIVE },
      { frame: at(0.908), camera: { x: 900, y: 540, scale: 1.12 }, easing: EASE_ARRIVE },
    ],
    [at],
  );
  const CAMERA_P = useMemo<CameraKeyframe[]>(
    () => [
      { frame: 0, camera: { x: 540, y: 960, scale: 0.98 } },
      { frame: at(0.6), camera: { x: 540, y: 960, scale: 0.98 }, easing: EASE_ARRIVE },
      { frame: at(0.908), camera: { x: 540, y: 960, scale: 1.1 }, easing: EASE_ARRIVE },
    ],
    [at],
  );

  // Hero object: flies in from the left with a spring, slight rotation
  // cleanup, soft landing scale + shadow settles underneath.
  const heroIn = springProgress(frame, fps, { delay: at(0.017), damping: 11, stiffness: 95, mass: 1 });
  const rotate = 22 * (1 - heroIn);
  const scaleUp = heroIn < 1 ? 0.92 + heroIn * 0.14 : 1;
  const shadowP = springProgress(frame, fps, { delay: at(0.067), damping: 13, stiffness: 120, mass: 0.8 });
  const grounded = Math.min(1, Math.max(0, (heroIn - 0.45) / 0.55));
  const heroX = -1500 + heroIn * 1500;
  const heroY = heroIn < 1 ? 460 - heroIn * 440 : 20;

  const heroLeft = hero.position !== "right";
  const heroStyle = portrait
    ? { left: (1080 - hero.width) / 2, top: 1150 }
    : heroLeft
      ? { left: 250, top: 380 }
      : { left: 990, top: 380 };
  const headlineStyle = portrait
    ? { left: 0, right: 0, top: 430, alignItems: "center" as const }
    : heroLeft
      ? { left: 1180, top: 250, width: 640 }
      : { left: 84, top: 250, width: 720 };

  // Text: kicker first, then two lines with a kinetic mask reveal.
  const t1 = progressive(frame, at(0.225), at(0.358) - at(0.225), EASE_ARRIVE);
  const t2 = springProgress(frame, fps, { delay: at(0.292) });

  const lines: StoryLine[] = data.lines.map((l) => {
    if (typeof l === "string") return l;
    return l.map((p) =>
      typeof p === "string" ? p : { text: p.text, accent: p.accent ?? true },
    );
  });

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      <Backdrop scene="hook" />
      <Camera2D keyframes={portrait ? CAMERA_P : CAMERA}>
        {/* Ambient accent glow bleeding from under the stage */}
        <div
          style={{
            position: "absolute",
            left: portrait ? (1080 - 900) / 2 : 330,
            top: portrait ? 1290 : 620,
            width: 900,
            height: 260,
            background: `radial-gradient(closest-side, ${COLORS.redDim}, transparent)`,
          }}
        />
        <div
          style={{
            position: "absolute",
            ...heroStyle,
            transform: `translate(${heroX}px, ${heroY}px) rotate(${rotate}deg) scale(${scaleUp})`,
            willChange: "transform",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 10,
              top: hero.height,
              width: hero.width,
              height: 80,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.5)",
              transform: `scaleX(${0.6 + grounded * 0.8})`,
              filter: "blur(6px)",
              opacity: shadowP,
              willChange: "transform",
            }}
          />
          <HeroArt hero={hero} brand={story.brand} />
        </div>

        {/* Headline cluster */}
        <div
          style={{
            position: "absolute",
            ...headlineStyle,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              opacity: t1,
              transform: `translateX(${(1 - t1) * -14}px)`,
            }}
          >
            <div
              style={{
                width: 42,
                height: 5,
                borderRadius: 3,
                background: COLORS.red,
                transform: `scaleX(${t1})`,
                transformOrigin: "left center",
              }}
            />
            <span
              style={{
                fontFamily: FONT.headline,
                fontWeight: WEIGHT.bold,
                fontSize: portrait ? 26 : 24,
                letterSpacing: "0.34em",
                color: COLORS.textSecondary,
              }}
            >
              {data.kicker}
            </span>
          </div>

          <div style={{ marginTop: 26 }}>
            <AnimatedText
              lines={lines}
              delay={at(0.308)}
              lineStagger={9}
              wordStagger={4}
              align={portrait ? "center" : "left"}
              style={{
                fontSize: portrait ? 84 : 92,
                lineHeight: portrait ? 1.12 : 1.12,
                letterSpacing: "-0.01em",
              }}
            />
          </div>

          {/* Underline drawing under the headline */}
          <svg
            width="520"
            height="40"
            viewBox="0 0 520 40"
            style={{ marginTop: 26, opacity: t2 >= 0.95 ? 1 : 0.6 * t2, alignSelf: portrait ? "center" : undefined }}
          >
            <AnimatedTextLine t={t2} />
          </svg>
        </div>
      </Camera2D>
    </AbsoluteFill>
  );
};

const HeroArt: React.FC<{
  hero: { src?: string; kind?: "monogram" | "phone"; width: number; height: number };
  brand: string;
}> = ({ hero, brand }) => {
  if (hero.src) {
    return (
      <Img
        src={staticFile(`/${hero.src.replace(/^\//, "")}`)}
        width={hero.width}
        height={hero.height}
        style={{ objectFit: "contain", filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.45))" }}
      />
    );
  }
  if (hero.kind === "phone") {
    return <PhoneHero width={hero.width} height={hero.height} />;
  }
  // Monogram fallback: brand initial in the accent colors.
  return (
    <div
      style={{
        width: hero.width,
        height: hero.height,
        borderRadius: 28,
        background: `linear-gradient(160deg, ${COLORS.red}, ${COLORS.accentDark})`,
        border: `1px solid ${COLORS.lineStrong}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(closest-side at 50% 0%, ${COLORS.redDim}, transparent)`,
        }}
      />
      <span
        style={{
          fontFamily: FONT.headline,
          fontWeight: WEIGHT.black,
          fontSize: Math.min(hero.width, hero.height) * 0.55,
          color: COLORS.gold,
          textShadow: "0 10px 40px rgba(0,0,0,0.4)",
        }}
      >
        {brand.trim().charAt(0).toUpperCase()}
      </span>
    </div>
  );
};

const AnimatedTextLine: React.FC<{ t: number }> = ({ t }) => {
  const dash = Math.max(0, Math.min(1, t));
  return (
    <line
      x1="0"
      y1="20"
      x2="520"
      y2="20"
      stroke={COLORS.gold}
      strokeWidth="6"
      strokeLinecap="round"
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - dash}
    />
  );
};
