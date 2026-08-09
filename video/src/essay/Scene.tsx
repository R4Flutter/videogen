// EssayScene: one beat under the essay director. The plan names the module,
// the camera intent, the reveal staging; this wrapper obeys. The modules
// themselves are untouched — the essay stages them differently, it does not
// rewrite them.
import React from "react";
import { AbsoluteFill } from "remotion";
import { VOX_MODULES, VoxSceneProps } from "../vox/scenes.tsx";
import { CameraRig, type CameraIntent } from "../editorial/camera.ts";
import { theme } from "../theme";
import type { DirectorPlan, DirectedBeat } from "../director/types.ts";
import { Reveal } from "./Reveal.tsx";
import { CallbackStamp } from "./CallbackStamp.tsx";
import { wordsForBeat } from "./Captions.tsx";
import script from "../script.json";

const vox = theme.vox;

/** Editorially self-framing modules run their own camera inside the beat —
 *  a page-level camera would fight the one the module already owns. */
const SELF_FRAMING = new Set(["map", "trace", "trust", "funnel", "collage"]);

export const EssayScene: React.FC<{
  plan: DirectorPlan;
  db: DirectedBeat;
  dur: number;
}> = ({ plan, db, dur }) => {
  const scriptBeat = script.beats.find((b) => b.n === db.n);
  if (!scriptBeat) return null;

  const module = db.visual.module;
  const Scene = VOX_MODULES[module];

  const intent = db.motion.camera.intent;
  // A self-framing module runs its own camera inside the beat; anything else
  // gets the page camera. `settle` is not "no camera" — it is the slow release
  // every held frame needs to stop reading as a slide.
  const moved = !SELF_FRAMING.has(module);

  const stage = (
    <Reveal beat={db} module={module}>
      {Scene ? (
        <Scene
          dur={dur}
          beat={{ ...scriptBeat, module } as VoxSceneProps["beat"]}
          words={wordsForBeat(scriptBeat)}
        />
      ) : null}
    </Reveal>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: vox.paper }}>
      {moved ? (
        <CameraRig
          intent={intent as CameraIntent}
          dur={dur}
          target={db.motion.camera.target}
          seed={db.n}
        >
          {stage}
        </CameraRig>
      ) : (
        stage
      )}
      {/* The stamp is an overlay on the page, not a thing on it — it stays
          out of the camera so it never drifts with the frame. */}
      <CallbackStamp plan={plan} beatN={db.n} />
    </AbsoluteFill>
  );
};

