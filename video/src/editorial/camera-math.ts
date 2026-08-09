// The camera's arithmetic, with no Remotion in it, so it can be run under
// `node --test` without a compositor. camera.ts is the React skin over this.

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

/** One beat's framing. `ox`/`oy` are the transform origin in percent — an
 *  off-centre origin is what makes a push read as a push *towards something*
 *  rather than as a zoom, and it costs no extra transform. */
export type CameraState = {
  scale: number;
  tx: number;
  ty: number;
  rotate: number;
  ox: number;
  oy: number;
};

export const IDENTITY: CameraState = { scale: 1, tx: 0, ty: 0, rotate: 0, ox: 50, oy: 50 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * 1.45 is the ceiling. Beyond it a 1080px frame has to upscale the page and
 * the paper grain starts to read as noise, which is the one thing a printed
 * page is not supposed to be.
 */
const MAX_SCALE = 1.45;

/**
 * How far the strongest drift intent travels, and the number the whole system
 * is sized against. It is not a taste call — it is what the grid allows.
 *
 * The layout's tightest safe margin is the bottom band ending at 0.945, so 5.5%
 * of the short axis. A scale `s` about an anchor `a` crops `(s - 1) * max(a,
 * 1 - a)` off the far edge, and with the anchors below that worst case is 0.6.
 * 0.085 * 0.6 = 5.1%, which fits with a little to spare. Raising this without
 * moving the grid pushes the caption band off the canvas.
 */
export const MAX_PUSH = 0.085;

/**
 * Where a non-focus move is aimed, as a percentage of the canvas. Off-centre,
 * because every push landing on 50/50 is the loudest tell that a frame was
 * rendered rather than shot — but only just off, since the offset is the other
 * half of the crop budget above. Rule-of-thirds anchors crop 8% and eat the
 * type; these stay inside +/- 10 points of centre.
 */
const ANCHORS: [number, number][] = [
  [50, 50],
  [42, 44],
  [58, 45],
  [44, 57],
  [57, 55],
];

/** The furthest any anchor sits from centre, as a fraction. The crop budget
 *  above is computed against it, so the two cannot drift apart unnoticed. */
export const MAX_ANCHOR_REACH = 0.6;

/**
 * The operator. Two out-of-phase sines per axis so the wander never repeats on
 * a period the eye can lock onto, at an amplitude that is felt and not seen.
 * Applied *outside* the depth split on purpose: a real rig shakes the lens, not
 * the layers, so the whole frame moves together and only the intent parallaxes.
 */
export const handheld = (frame: number, seed: number, width: number, height: number) => {
  const s = seed * 1.7 + 1;
  return {
    x:
      (Math.sin((frame + s * 13) / 97) * 0.62 + Math.sin((frame + s * 29) / 41) * 0.38) *
      width *
      0.0018,
    y:
      (Math.cos((frame + s * 7) / 113) * 0.62 + Math.cos((frame + s * 23) / 53) * 0.38) *
      height *
      0.0014,
    rotate: Math.sin((frame + s * 11) / 151) * 0.04,
  };
};

/**
 * Framing for one beat at eased progress `p`. This is the **subject plane** —
 * the plane the type is set on, which is why it and not some notional mid plane
 * is what the safe margins are measured against.
 */
export const cameraState = (
  intent: CameraIntent,
  p: number,
  width: number,
  height: number,
  target?: Bounds | null,
  seed = 0,
): CameraState => {
  const [ox, oy] = ANCHORS[Math.abs(Math.round(seed)) % ANCHORS.length];
  const aimed = { ...IDENTITY, ox, oy };

  switch (intent) {
    case "focus": {
      // Default target: the middle band of the page. A focus without a target
      // still frames *something*, which is better than a focus that is a no-op.
      const t = target ?? { x: width * 0.1, y: height * 0.3, w: width * 0.8, h: height * 0.4 };
      const fit = Math.min(width / t.w, height / t.h) * 0.88;
      const scale = 1 + (clamp(fit, 1, MAX_SCALE) - 1) * p;
      // The translate below solves for origin 50/50, so focus keeps it. With a
      // point q mapping to (q - c) * s + c + t, setting q = target centre and
      // the result = canvas centre gives the translate that parks the target in
      // the middle of the frame.
      return {
        ...IDENTITY,
        scale,
        tx: (width / 2 - (t.x + t.w / 2)) * scale * p,
        ty: (height / 2 - (t.y + t.h / 2)) * scale * p,
      };
    }
    // The subject plane barely moves, and that is correct rather than timid.
    // The depth is not in how far this travels — it is in how much *less* the
    // page behind it travels (see `depthTransform`). A bigger number here does
    // not buy more depth, it just crops the grid.
    //
    // Written as `1 + k * (1 - p)` and not `1.085 - 0.085 * p`, which is the
    // same line until floating point rounds it to 0.9999999999999999 at p = 1
    // and the frame's last row of pixels is off the canvas.
    case "push":
      return { ...aimed, scale: 1 + MAX_PUSH * p };
    case "pull":
      return { ...aimed, scale: 1 + MAX_PUSH * (1 - p) };
    case "establish":
      return { ...aimed, scale: 1 + MAX_PUSH * 0.8 * (1 - p) };
    case "pan":
      // Scale held above 1 for the whole move so the lateral travel has margin
      // to come out of, and centred so the travel is symmetric about it.
      return { ...aimed, ox: 50, oy: 50, scale: 1 + MAX_PUSH * 0.7, tx: width * 0.03 * (0.5 - p) };
    case "compare":
      return { ...aimed, ox: 50, oy: 50, scale: 1 + MAX_PUSH * 0.6, tx: width * 0.024 * (0.5 - p) };
    case "reveal":
      // A degree of wobble as it lands: a thing being placed settles.
      return { ...aimed, scale: 1 + MAX_PUSH * (1 - p), rotate: 0.6 * (1 - p) };
    case "settle":
      return { ...aimed, scale: 1 + MAX_PUSH * 0.45 * (1 - p) };
  }
};

/**
 * Standing overscan for a layer behind the subject, so it can fall away under
 * the camera without its own edge swinging into frame.
 *
 * Exact rather than generous: at the strongest push a layer at `depth` shrinks
 * by `MAX_PUSH * (1 - depth)`, and this is the reciprocal of that, so the layer
 * bottoms out at exactly 1.0 and sits a few percent large the rest of the time.
 * A few percent on a paper texture or a full-bleed photograph is invisible;
 * one row of blank canvas along an edge is not.
 */
export const overscanFor = (depth: number) =>
  depth >= 1 ? 1 : 1 / (1 - MAX_PUSH * (1 - depth));

/**
 * A layer's transform *relative to the base camera its parent already applied*.
 *
 * `depth` is distance from the lens, with **1 being the subject plane** — the
 * type, the thing the beat is about. It gets exactly the camera and nothing
 * more, which is what keeps it inside the grid. Below 1 is behind the subject
 * and takes proportionally less of the move; above 1 is in front of it, which
 * only a vignette or a glare ever is.
 *
 * The direction matters and the first version of this had it backwards. Pushing
 * near layers *forward* past the type compounds onto the base scale, and a
 * headline layer at 1.33 is a cropped headline. Pushing the page *backwards*
 * costs the grid nothing, and it is what a lens actually does: the subject holds
 * its size while the background falls away behind it.
 *
 * This is the piece the old system did not have at all. Parallax was a
 * free-running sine that ignored the camera, so the camera's own move — the
 * biggest motion in the frame — arrived at every plane identically and flattened
 * them back into one slab. Depth is a *rate difference under the camera*, not a
 * wobble alongside it.
 */
export const depthTransform = (cam: CameraState, depth: number) => {
  // The depth response saturates at MAX_PUSH. `focus` scales to 1.45 to frame a
  // target, and a background falling 45% away behind it is a fisheye, not a
  // dolly — it would also need a 51% standing overscan, which on a photograph
  // means throwing away half the picture. Both axes are damped by the same
  // ratio so the plane stays coherent rather than shearing.
  const k = Math.min(1, MAX_PUSH / Math.max(cam.scale - 1, 1e-9));
  const d = (depth - 1) * k;
  return {
    scale: (1 + (cam.scale - 1) * d) * overscanFor(depth),
    x: cam.tx * d,
    y: cam.ty * d,
  };
};
