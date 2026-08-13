import React, { createContext, useContext, useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { EASE_IN_OUT } from "../utils/easing";

export type CameraState = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

// A camera "node" at a scene-local frame. Omitted fields inherit from the
// previous keyframe (or the default camera at the first keyframe).
export type CameraKeyframe = {
  frame: number;
  camera?: Partial<CameraState>;
  easing?: (t: number) => number;
};

export const DEFAULT_CAMERA: CameraState = { x: 960, y: 540, scale: 1, rotation: 0 };

// Smoothly interpolate a camera through keyframes.
export const useCamera2D = (keyframes: readonly CameraKeyframe[]): CameraState => {
  const frame = useCurrentFrame();
  return useMemo(() => {
    if (keyframes.length === 0) {
      return DEFAULT_CAMERA;
    }
    const first = keyframes[0];
    if (frame <= first.frame) {
      return { ...DEFAULT_CAMERA, ...first.camera };
    }
    for (let i = 0; i < keyframes.length - 1; i++) {
      const a = keyframes[i];
      const b = keyframes[i + 1];
      if (frame >= a.frame && frame <= b.frame) {
        const span = Math.max(1, b.frame - a.frame);
        const raw = (frame - a.frame) / span;
        const t = (a.easing ?? EASE_IN_OUT)(raw);
        const from = { ...DEFAULT_CAMERA, ...a.camera };
        const to = { ...from, ...b.camera };
        return {
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
          scale: from.scale + (to.scale - from.scale) * t,
          rotation: from.rotation + (to.rotation - from.rotation) * t,
        };
      }
    }
    const last = keyframes[keyframes.length - 1];
    return { ...DEFAULT_CAMERA, ...last.camera };
  }, [keyframes, frame]);
};

const CameraContext = createContext<CameraState>(DEFAULT_CAMERA);

// Wraps a scene's world in a camera transform. Content is laid out in
// 1920×1080 "world" space; the camera looks at (x, y) with a zoom of `scale`.
export const Camera2D: React.FC<{
  keyframes: readonly CameraKeyframe[];
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ keyframes, children, style }) => {
  const cam = useCamera2D(keyframes);
  const tx = (960 - cam.x) * cam.scale;
  const ty = (540 - cam.y) * cam.scale;
  return (
    <CameraContext.Provider value={cam}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate3d(${tx}px, ${ty}px, 0) scale(${cam.scale}) rotate(${-cam.rotation}deg)`,
          transformOrigin: "0 0",
          willChange: "transform",
          ...style,
        }}
      >
        {children}
      </div>
    </CameraContext.Provider>
  );
};

// Parallax helper: factor 0 = glued to the screen, 1 = moves fully with the
// camera. Use ~0.2–0.6 for depth on foreground/background layers.
export const Parallax: React.FC<{
  factor: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ factor, style, children }) => {
  const cam = useContext(CameraContext);
  const dx = (cam.x - 960) * factor;
  const dy = (cam.y - 540) * factor;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `translate3d(${dx}px, ${dy}px, 0)`,
        willChange: "transform",
        ...style,
      }}
    >
      {children}
    </div>
  );
};