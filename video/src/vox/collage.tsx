// The archival collage. Photographs laid on the page as clippings — bordered,
// tilted, screened through a printer's dot — arriving one at a time and then
// drifting. It is the frame an explainer reaches for when the subject has no
// single picture: three fragments of a thing say more than one photo of it.
//
// Story-agnostic by construction: it stages whatever images the fetcher put on
// disk for this beat, in the order it found them. Nothing here knows what the
// episode is about.
import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraRig } from "../editorial/camera";
import { theme } from "../theme";
import { beatFrames, DrawIn, Halftone, Kicker, Shape } from "./elements";
import { fitBlock, useLayout } from "./layout";
import { VoxSceneProps } from "./scenes";

const vox = theme.vox;

/** Where the clippings land, as fractions of the canvas. The hero is first and
 *  biggest; the rest overlap it, because a collage of non-touching rectangles
 *  is a grid, and a grid is a slide.
 *
 *  Both sets stop short of the lower fifth — that band belongs to the caption
 *  track, and a clipping in it is a clipping with words printed over it. */
const SLOTS = {
  tall: [
    { x: 0.07, y: 0.17, w: 0.62, h: 0.28 },
    { x: 0.42, y: 0.40, w: 0.51, h: 0.23 },
    { x: 0.1, y: 0.575, w: 0.44, h: 0.2 },
    { x: 0.55, y: 0.66, w: 0.36, h: 0.15 },
  ],
  wide: [
    { x: 0.06, y: 0.24, w: 0.36, h: 0.44 },
    { x: 0.38, y: 0.18, w: 0.3, h: 0.35 },
    { x: 0.63, y: 0.36, w: 0.31, h: 0.4 },
    { x: 0.33, y: 0.55, w: 0.26, h: 0.28 },
  ],
};

export const Collage: React.FC<VoxSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height, pad, safeW, wide, y: band } = useLayout();

  const frames = beatFrames(beat.n).slice(0, 4);
  const slots = wide ? SLOTS.wide : SLOTS.tall;
  const headline = beat.text || "";
  // The band the headline is printed on has to end where the caption band
  // begins, so the two are never on screen on top of each other.
  const headTop = height * (wide ? 0.72 : 0.74);
  const headSize = fitBlock(
    headline.toUpperCase(),
    safeW - width * 0.048,
    band.caption - headTop - width * 0.032,
    width * 0.064,
    { weight: 800, family: vox.font },
  );

  return (
    <CameraRig
      intent="settle"
      dur={dur}
      seed={beat.n}
      style={{ fontFamily: vox.font }}
      // The collage's subject is the hero clipping — the first, biggest one.
      // The rig frames it; the headline sits below; the rest overlap.
      target={{
        x: width * slots[0].x,
        y: height * slots[0].y,
        w: width * slots[0].w,
        h: height * slots[0].h,
      }}
    >
      {frames.map((src, i) => {
        const slot = slots[i];
        const s = spring({
          frame: frame - 6 - i * 9,
          fps,
          config: { damping: 200, mass: 0.7, stiffness: 170 },
          durationInFrames: 16,
        });
        // Deterministic, not random: a tilt that resamples per frame is a
        // clipping vibrating on the table. Beat and index seed it so the same
        // beat lays out identically on every render and every re-render.
        const tilt = (((beat.n * 7 + i * 13) % 5) - 2) * 0.9;
        // After landing, each card drifts at its own rate, on both axes and in
        // alternating directions. The difference between the rates is the
        // parallax — matched rates read as one slab, and one axis reads as a
        // wobble rather than as depth.
        const drift = Math.sin((frame + i * 40) / (150 + i * 30)) * width * 0.006;
        const sway =
          Math.cos((frame + i * 55) / (170 + i * 25)) * width * 0.005 * (i % 2 ? -1 : 1);
        const w = width * slot.w;
        const h = height * slot.h;

        return (
          <div
            key={src}
            style={{
              position: "absolute",
              left: width * slot.x,
              top: height * slot.y + drift,
              width: w,
              height: h,
              // Paper border and a shadow: the two things that say "laid on"
              // rather than "composited into".
              background: "#FBF9F4",
              padding: width * 0.011,
              boxShadow: `0 ${width * 0.014}px ${width * 0.038}px rgba(26,26,26,.28)`,
              transform: `translateX(${sway}px) rotate(${tilt}deg) translateY(${interpolate(
                s,
                [0, 1],
                [height * 0.03, 0],
              )}px) scale(${interpolate(s, [0, 1], [0.94, 1])})`,
              opacity: Math.min(1, Math.max(0, s)),
              zIndex: frames.length - i,
            }}
          >
            <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
              <Img
                src={staticFile(src)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  // Graded back towards the page: full-saturation stock next to
                  // flat ink is the tell that the picture was pasted in.
                  filter: "saturate(0.42) contrast(1.12) brightness(0.98)",
                }}
              />
              <Halftone size={width * 0.0042} opacity={0.3} />
            </div>
          </div>
        );
      })}

      <div style={{ position: "absolute", left: pad, top: band.kicker, width: safeW }}>
        <Kicker text={beat.name} enter={frame - 4} />
      </div>

      {/* The headline sits over the collage on its own paper band — black type
          straight onto photographs is legible on exactly the frames where the
          photographs happen to be pale. */}
      {headline ? (
        <div
          style={{
            position: "absolute",
            left: pad,
            top: headTop,
            maxWidth: safeW,
            padding: `${width * 0.016}px ${width * 0.024}px`,
            background: vox.paper,
            boxShadow: `0 ${width * 0.01}px ${width * 0.03}px rgba(26,26,26,.22)`,
            fontWeight: 800,
            fontSize: headSize,
            lineHeight: 1.05,
            letterSpacing: -width * 0.002,
            textTransform: "uppercase",
            color: vox.ink,
            opacity: interpolate(frame, [10, 24], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {headline}
        </div>
      ) : null}

      {/* One mark, on the hero clipping, only when the script asked for one. */}
      {beat.shape && frames.length ? (
        <DrawIn
          shape={beat.shape as Shape}
          x={width * slots[0].x - pad * 0.2}
          y={height * slots[0].y - pad * 0.2}
          w={width * slots[0].w + pad * 0.4}
          h={height * slots[0].h + pad * 0.4}
          seed={beat.n * 29}
          progress={interpolate(frame, [dur * 0.34, dur * 0.66], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        />
      ) : null}
    </CameraRig>
  );
};
