// The virtual camera layer. Every scene gets a move + intensity; the rig
// computes the camera pose per frame and can react to beats with a punch
// and a micro-shake. Camera movement stays subtle — the video should feel
// professionally shot, not dizzy.

import React, { createContext, useContext, useMemo } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { cameraPose, type CameraMoveType, type CameraPose } from "./motion";

export type Impact = { at: number; strength: number };

export type CameraRigProps = {
  move: CameraMoveType;
  intensity: number;
  durationInFrames: number;
  impacts?: Impact[];
  parallax?: boolean;
  children: React.ReactNode;
};

const CameraPoseContext = createContext<CameraPose>({ x: 0, y: 0, scale: 1, rotation: 0, blur: 0 });

export const useCameraPose = (): CameraPose => useContext(CameraPoseContext);

export const CameraRig: React.FC<CameraRigProps> = ({
  move,
  intensity,
  durationInFrames,
  impacts = [],
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const pose = useMemo(
    () =>
      cameraPose({
        frame,
        fps,
        durationInFrames,
        width,
        height,
        move,
        intensity,
        impacts,
      }),
    [frame, fps, width, height, move, intensity, durationInFrames, impacts],
  );

  const cx = width / 2;
  const cy = height / 2;
  const tx = (cx - pose.x) * pose.scale;
  const ty = (cy - pose.y) * pose.scale;

  return (
    <CameraPoseContext.Provider value={pose}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate3d(${tx}px, ${ty}px, 0) scale(${pose.scale}) rotate(${-pose.rotation}deg)`,
          transformOrigin: "0 0",
          willChange: "transform",
          filter: pose.blur > 0 ? `blur(${pose.blur}px)` : undefined,
        }}
      >
        {children}
      </div>
    </CameraPoseContext.Provider>
  );
};

// Parallax helper for depth layers: factor 0 = glued to screen, 1 = moves
// fully with the camera. Backgrounds ~0.15-0.3, foreground ~1.2-1.5.
export const Parallax: React.FC<{
  factor: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ factor, style, children }) => {
  const pose = useCameraPose();
  const { width, height } = useVideoConfig();
  const dx = (pose.x - width / 2) * factor;
  const dy = (pose.y - height / 2) * factor;
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