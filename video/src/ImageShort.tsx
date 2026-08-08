// A short built from nothing but the pictures in public/footage: each one drifts
// across the frame while a blurred copy of itself drifts slower behind it, and
// they cross-fade into each other. The two speeds are the whole point — one
// moving layer is a Ken Burns pan, two moving at different rates is parallax.
import React from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const SHOTS = [
  "footage/01_Phone_screen_grid_of_shor.jpg",
  "footage/02_Phone_screen_grid_of_shor.jpg",
  "footage/03_Phone_screen_grid_of_shor.jpg",
];

/** Seconds a picture holds, and seconds the outgoing one overlaps the incoming.
 *  The overlap is long enough to read as a dissolve, short enough to still cut. */
const HOLD = 4;
const FADE = 0.7;

export const IMAGE_SHORT_SECONDS = SHOTS.length * HOLD + FADE;

/** One picture: blurred fill behind, the frame itself in front, both drifting.
 *  Direction alternates off the index so no two shots push the same way. */
const Plate: React.FC<{ src: string; i: number; hold: number; fade: number }> = ({
  src,
  i,
  hold,
  fade,
}) => {
  const frame = useCurrentFrame();
  const io = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

  // Held open past `hold` so the outgoing plate is still on screen while the
  // next one arrives — without the overlap every cut flashes to black.
  const opacity =
    interpolate(frame, [0, fade], [0, 1], { ...io, easing: Easing.out(Easing.quad) }) *
    interpolate(frame, [hold, hold + fade], [1, 0], io);

  const p = frame / (hold + fade); // 0 → 1 across the plate's whole life
  const dir = i % 2 ? -1 : 1;
  const file = staticFile(src);

  return (
    <AbsoluteFill style={{ opacity, background: "#0B0B0D" }}>
      {/* back layer: the same picture, blown up and blurred, moving at a third
          the speed. It fills the 9:16 canvas that the 16:9 frame cannot. */}
      <Img
        src={file}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(1.5) translate(${dir * (p - 0.5) * 3}%, ${(p - 0.5) * 2}%)`,
          filter: "blur(28px) brightness(0.5) saturate(0.7)",
        }}
      />
      {/* front layer: the picture itself, drifting the other way and pushing in */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Img
          src={file}
          style={{
            width: "92%",
            borderRadius: 18,
            boxShadow: "0 40px 90px rgba(0,0,0,0.55)",
            transform: `scale(${1.02 + p * 0.09}) translate(${-dir * (p - 0.5) * 5}%, ${
              -(p - 0.5) * 3
            }%)`,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ImageShort: React.FC = () => {
  const { fps } = useVideoConfig();
  const hold = Math.round(HOLD * fps);
  const fade = Math.round(FADE * fps);

  return (
    <AbsoluteFill style={{ background: "#0B0B0D" }}>
      {SHOTS.map((src, i) => (
        // Each plate lives `hold + fade` frames but only advances the timeline by
        // `hold`, which is what makes consecutive plates overlap.
        <Sequence key={src} from={i * hold} durationInFrames={hold + fade}>
          <Plate src={src} i={i} hold={hold} fade={fade} />
        </Sequence>
      ))}
      <Audio src={staticFile("audio/music.wav")} volume={0.5} />
    </AbsoluteFill>
  );
};
