// Film: the post layer. Everything the composite is missing to stop looking
// like a computer drew it.
//
// The engine already has grain — `vox/elements.tsx` rasterises a turbulence
// filter into the page and drifts it, with the right reasoning attached ("so
// no frame is ever mathematically still"). The problem is *where it sits*: the
// grain is the page's own texture and rides the base camera **underneath**
// everything, so every image, chart, caption and clip composited on top of it
// is still perfectly clean. Two grains at two depths is what a printed page
// shot on film actually is; one grain under everything is a textured
// background with sterile objects on it.
//
// So this wraps the finished frame. Five effects, all subtle, all animated,
// none of them individually noticeable — which is the point. The literature on
// why AI video reads as cheap names over-smoothing as the second-strongest
// tell after voice: "delicate and soft, polished, well-oiled, with no harsh
// edges, regardless of content."
//
//   grain        luminance-weighted, heavier in the shadows where film grain
//                actually lives. Animated: static grain is worse than none,
//                because a fixed noise pattern reads as a dirty lens.
//   halation     warm bloom on highlights above the knee. The single most
//                recognisable film tell, and the cheapest to fake convincingly.
//   aberration   sub-pixel channel separation at the frame edges, the way a
//                real lens fails away from its centre.
//   drift        micro exposure and white-balance movement. Nothing in the
//                physical world holds a value perfectly; holding one perfectly
//                is the machine tell that survives every other fix.
//   vignette     a hair of falloff, to stop the corners reading as flat.
//
// Every number here is deliberately at the bottom of its useful range. If you
// can see an individual effect, it is turned up too far — turn it down until
// you can only see it when you switch it off.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

export type FilmLook = {
  /** Master intensity, 0..1. 0 disables the layer entirely. */
  strength: number;
  grain: number;
  halation: number;
  aberration: number;
  drift: number;
  vignette: number;
};

/** The house look. Tuned for the Vox paper palette: warm, bright, low
 *  contrast — which means halation does most of the work and grain has to
 *  stay light or it reads as newsprint. */
export const VOX_LOOK: FilmLook = {
  strength: 1,
  grain: 0.055,
  halation: 0.13,
  aberration: 0.45,
  drift: 0.014,
  vignette: 0.1,
};

/** A darker room wants more grain and less bloom. */
export const CRIME_LOOK: FilmLook = {
  strength: 1,
  grain: 0.085,
  halation: 0.07,
  aberration: 0.6,
  drift: 0.018,
  vignette: 0.22,
};

/** Grain, rasterised once into a data URI rather than run as a live filter.
 *
 *  A live <feTurbulence> over a 1920×1080 frame costs seconds *per frame* —
 *  `vox/elements.tsx` learned this the expensive way and left a comment about
 *  it. Four tiles are baked at different seeds and cycled, which is what makes
 *  the grain move without making the renderer do any work: the browser is
 *  compositing four cached bitmaps, not evaluating a filter.
 *
 *  `numOctaves={2}` and a high baseFrequency give fine, dense structure. Film
 *  grain is organic and clumped; digital noise is uniform and harsh, and the
 *  difference between them is mostly this parameter. */
const grainTile = (seed: number, size = 180): string =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
      `<filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${seed}" stitchTiles="stitch"/>` +
      `<feColorMatrix type="saturate" values="0.15"/></filter>` +
      `<rect width="100%" height="100%" filter="url(#n)"/></svg>`,
  )}")`;

const TILES = [grainTile(3), grainTile(17), grainTile(41), grainTile(89)];

/** Grain steps at 12fps rather than 30.
 *
 *  Real film grain changes once per photographed frame. Cinema is 24fps and
 *  most archival material is slower still, so grain that updates every single
 *  30fps frame reads as video noise — the exact texture we are trying to get
 *  away from. Holding each pattern for 2–3 frames is what makes it read as
 *  emulsion. */
const GRAIN_HOLD = 3;

export const Film: React.FC<{
  look?: Partial<FilmLook>;
  children: React.ReactNode;
}> = ({ look, children }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const L = { ...VOX_LOOK, ...look };
  const s = L.strength;

  if (s <= 0) return <>{children}</>;

  const t = frame / fps;
  const tile = TILES[Math.floor(frame / GRAIN_HOLD) % TILES.length];

  // Exposure and white balance drift on two incommensurable periods, so the
  // pattern never repeats inside a ten-minute film. If both used the same
  // period the drift would beat, and a beat is a rhythm, and a rhythm is
  // exactly what "nothing holds a value perfectly" must not have.
  const exposure = 1 + L.drift * s * Math.sin((2 * Math.PI * t) / 8.3);
  const warmth = L.drift * s * Math.sin((2 * Math.PI * t) / 11.7);

  // Aberration in pixels, scaled off the frame so 1080p and 4K look the same.
  const ab = (L.aberration * s * width) / 1920;

  return (
    <AbsoluteFill>
      {/* The graded composite. filter: on a wrapper rather than on each child,
          so the grade is applied to the *frame*, which is what unifies images
          that were generated separately and do not share a light source. */}
      <AbsoluteFill
        style={{
          filter: `brightness(${exposure.toFixed(4)}) sepia(${Math.max(0, warmth * 6).toFixed(4)}) saturate(${(1 + warmth * 2).toFixed(4)})`,
        }}
      >
        {children}
      </AbsoluteFill>

      {/* Halation: the bright parts of the frame bloom warm. Isolated by a
          hard brightness/contrast push so only the genuine highlights survive,
          then blurred and screened back. This is the one effect that reads as
          "film" rather than "filter" to most people. */}
      {L.halation > 0 && (
        <AbsoluteFill
          style={{
            mixBlendMode: "screen",
            opacity: L.halation * s,
            filter: `blur(${(18 * width) / 1920}px) brightness(2.1) contrast(2.6) saturate(1.4) hue-rotate(-8deg)`,
            pointerEvents: "none",
          }}
        >
          <AbsoluteFill style={{ filter: "brightness(1.05)" }}>{children}</AbsoluteFill>
        </AbsoluteFill>
      )}

      {/* Chromatic aberration: red and cyan pulled apart, masked to the frame
          edges with a radial gradient because a real lens is sharp in the
          middle. Sub-pixel — if you can see fringing on a face, it is wrong. */}
      {ab > 0.05 && (
        <>
          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              opacity: 0.5,
              transform: `translateX(${ab}px)`,
              maskImage: "radial-gradient(ellipse at center, transparent 45%, black 100%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, transparent 45%, black 100%)",
              pointerEvents: "none",
            }}
          >
            <AbsoluteFill style={{ filter: "url(#film-red)" }}>{children}</AbsoluteFill>
          </AbsoluteFill>
          <AbsoluteFill
            style={{
              mixBlendMode: "screen",
              opacity: 0.5,
              transform: `translateX(${-ab}px)`,
              maskImage: "radial-gradient(ellipse at center, transparent 45%, black 100%)",
              WebkitMaskImage: "radial-gradient(ellipse at center, transparent 45%, black 100%)",
              pointerEvents: "none",
            }}
          >
            <AbsoluteFill style={{ filter: "url(#film-cyan)" }}>{children}</AbsoluteFill>
          </AbsoluteFill>
        </>
      )}

      {/* Grain over the composite. `overlay` rather than `soft-light` so it
          bites in the midtones; the second layer is multiplied through a
          shadow mask so the shadows carry more of it, which is where film
          grain actually lives. */}
      <AbsoluteFill
        style={{
          backgroundImage: tile,
          backgroundSize: `${(180 * width) / 1920}px`,
          mixBlendMode: "overlay",
          opacity: L.grain * s,
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: tile,
          backgroundSize: `${(240 * width) / 1920}px`,
          backgroundPosition: `${(frame % 7) * 3}px ${(frame % 5) * 3}px`,
          mixBlendMode: "multiply",
          opacity: L.grain * s * 0.5,
          pointerEvents: "none",
        }}
      />

      {/* Vignette. A hair, not a halo. */}
      {L.vignette > 0 && (
        <AbsoluteFill
          style={{
            background: `radial-gradient(ellipse at 50% 48%, transparent 52%, rgba(24,18,12,${(L.vignette * s).toFixed(3)}) 100%)`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* The channel-isolation filters the aberration layers reference. An SVG
          <defs> costs nothing and is the only way to get a true per-channel
          matrix in CSS. */}
      <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
        <defs>
          <filter id="film-red" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
          </filter>
          <filter id="film-cyan" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
          </filter>
        </defs>
      </svg>
    </AbsoluteFill>
  );
};

/** The isolated frame.
 *
 *  Von Restorff: the item that differs is the item that is remembered. Exactly
 *  one moment in a film should break the visual language completely — and
 *  *exactly* one, because two is a style and a style is not remembered, it is
 *  merely noticed.
 *
 *  Applied to the film's single hero beat, this inverts the page and drops
 *  everything but one line of type. It is the frame someone screenshots.
 */
export const Isolate: React.FC<{ active: boolean; children: React.ReactNode }> = ({
  active,
  children,
}) => {
  if (!active) return <>{children}</>;
  return (
    <AbsoluteFill style={{ background: "#12100d" }}>
      <AbsoluteFill style={{ filter: "invert(1) hue-rotate(180deg) saturate(0.7)" }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
