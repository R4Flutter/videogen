// The semantic camera director. A module says what it wants to look at and
// why; the director turns that into framing. No module hand-computes a
// translate, because a translate computed by hand is a magic number that
// breaks the day the layout changes.
//
// Deterministic and frame-based like every primitive in this repo: the same
// intent on the same beat renders the same move every time.
//
// The 2.5D part lives in two halves that have to agree. `CameraRig` applies the
// beat's framing to the whole stage *and publishes it*; anything inside asks
// `useDepth(d)` for its own share of that same move. The camera is the motion,
// depth is the rate at which each plane obeys it. Two layers at different
// depths under one push separate; two layers wobbling on their own sines under
// a shared scale do not, which is what this used to do.
import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  cameraState,
  depthTransform,
  handheld,
  IDENTITY,
  type Bounds,
  type CameraIntent,
  type CameraState,
} from "./camera-math.ts";

export type { Bounds, CameraIntent, CameraState };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The house easing curve, same as every module uses. */
const SOFT = Easing.bezier(0.22, 1, 0.36, 1);

/** Identity when nothing above provides a camera — a module rendered outside a
 *  rig then degrades to its own drift, exactly as it behaved before. */
export const CameraContext = React.createContext<CameraState>(IDENTITY);

/** The framing the enclosing rig is applying this frame. */
export const useCameraState = () => React.useContext(CameraContext);

/**
 * Camera transform for one beat. `target` is only meaningful to `focus`; the
 * drift intents move the page itself and ignore it. `seed` picks the anchor and
 * the operator's wander, so neighbouring beats are not framed identically.
 *
 * `dur` is the beat in **frames** — the same unit VoxSceneProps carries and the
 * same domain `useCurrentFrame` reports in. It used to be read as seconds and
 * multiplied up by 30 here, which put the end of every move ~30x past the end
 * of its own beat: progress never left zero and every module using this camera
 * rendered its opening frame for the whole beat.
 */
export const useSemanticCamera = (
  intent: CameraIntent,
  dur: number,
  target?: Bounds | null,
  seed = 0,
): {
  transform: string;
  transformOrigin: string;
  progress: number;
  state: CameraState;
} => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const progress = clamp(
    interpolate(frame, [0, Math.max(1, dur)], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    0,
    1,
  );
  const p = SOFT(progress);
  const base = cameraState(intent, p, width, height, target, seed);
  const rig = handheld(frame, seed, width, height);
  const state: CameraState = {
    ...base,
    tx: base.tx + rig.x,
    ty: base.ty + rig.y,
    rotate: base.rotate + rig.rotate,
  };

  return {
    transform: `translate(${state.tx}px, ${state.ty}px) rotate(${state.rotate}deg) scale(${state.scale})`,
    transformOrigin: `${state.ox}% ${state.oy}%`,
    progress: p,
    state,
  };
};

/**
 * A layer's extra transform for sitting `depth` planes forward of the page.
 * 1 is the page (nothing extra), 2 responds twice as hard as the page does.
 *
 * The origin comes back with it and has to be used: the rig scales about the
 * beat's anchor, so a child scaling about its own centre pulls towards a
 * different point and the planes shear apart instead of separating in depth.
 */
export const useDepth = (
  depth: number,
): { transform: string; transformOrigin: string; anchor: { x: number; y: number } } => {
  const cam = useCameraState();
  const { width, height } = useVideoConfig();
  const { scale, x, y } = depthTransform(cam, depth);
  return {
    transform: `translate(${x}px, ${y}px) scale(${scale})`,
    // Correct for a full-canvas layer. A layer that is a sub-box of the canvas
    // has to convert: `anchor` is the same point in canvas pixels, so such a
    // layer sets `${anchor.x - left}px ${anchor.y - top}px` instead.
    transformOrigin: `${cam.ox}% ${cam.oy}%`,
    anchor: { x: (width * cam.ox) / 100, y: (height * cam.oy) / 100 },
  };
};

/**
 * The camera for one beat: applies the framing to everything inside it and
 * publishes it so those children can take their own share of it.
 *
 * It has to *wrap* the stage. A transform on an empty sibling moves nothing,
 * which is how 68 beats once rendered as 68 static cards.
 */
export const CameraRig: React.FC<{
  intent: CameraIntent;
  dur: number;
  target?: Bounds | null;
  seed?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ intent, dur, target, seed = 0, style, children }) => {
  const { transform, transformOrigin, state } = useSemanticCamera(intent, dur, target, seed);
  return React.createElement(
    CameraContext.Provider,
    { value: state },
    React.createElement(
      "div",
      {
        style: {
          position: "absolute",
          inset: 0,
          transform,
          transformOrigin,
          willChange: "transform",
          ...style,
        },
      },
      children,
    ),
  );
};
