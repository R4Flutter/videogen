// The semantic camera director. A module says what it wants to look at and
// why; the director turns that into framing. No module hand-computes a
// translate, because a translate computed by hand is a magic number that
// breaks the day the layout changes.
//
// Deterministic and frame-based like every primitive in this repo: the same
// intent on the same beat renders the same move every time.
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/** What the camera is doing, in story terms, not in pixels. */
export type CameraIntent =
  | "establish" // slow pull to the whole page
  | "focus" // frame a target object
  | "push" // drift in, attention narrows
  | "pull" // drift out, context widens
  | "pan" // lateral read, left to right
  | "compare" // slide across two quantities
  | "reveal" // settle from a wider frame
  | "settle"; // the quiet beat after a move

/** Canvas-coordinate box of the thing being looked at. */
export type Bounds = { x: number; y: number; w: number; h: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The house easing curve, same as every module uses. */
const SOFT = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * 1.45 is the ceiling. Beyond it a 1080px frame has to upscale the page and
 * the paper grain starts to read as noise, which is the one thing a printed
 * page is not supposed to be.
 */
const MAX_SCALE = 1.45;

/**
 * Camera transform for one beat. `target` is only meaningful to `focus`; the
 * drift intents move the page itself and ignore it.
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
): { transform: string; progress: number } => {
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

  let scale = 1;
  let tx = 0;
  let ty = 0;
  let rotate = 0;

  switch (intent) {
    case "focus": {
      // Default target: the middle band of the page. A focus without a target
      // still frames *something*, which is better than a focus that is a no-op.
      const t = target ?? { x: width * 0.1, y: height * 0.3, w: width * 0.8, h: height * 0.4 };
      const fit = Math.min(width / t.w, height / t.h) * 0.88;
      scale = 1 + (clamp(fit, 1, MAX_SCALE) - 1) * p;
      // With `transformOrigin: 50% 50%`, a point p maps to (p - c) * s + c + t.
      // Setting p = target centre and the result = canvas centre gives the
      // translate that parks the target in the middle of the frame.
      tx = (width / 2 - (t.x + t.w / 2)) * scale * p;
      ty = (height / 2 - (t.y + t.h / 2)) * scale * p;
      break;
    }
    case "push":
      scale = 1 + 0.06 * p;
      break;
    case "pull":
    case "establish":
      scale = 1.05 - 0.05 * p;
      break;
    case "pan":
      scale = 1.02 - 0.02 * p;
      tx = width * 0.025 * (0.5 - p);
      break;
    case "compare":
      scale = 1.02 - 0.02 * p;
      tx = width * 0.02 * (0.5 - p);
      break;
    case "reveal":
      scale = 1.08 - 0.08 * p;
      // A degree of wobble as it lands: a thing being placed settles.
      rotate = 0.6 * (1 - p);
      break;
    case "settle":
      scale = 1.04 - 0.04 * p;
      break;
  }

  return { transform: `translate(${tx}px, ${ty}px) rotate(${rotate}deg) scale(${scale})`, progress: p };
};
