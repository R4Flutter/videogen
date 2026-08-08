// EssayScene: one beat under the essay director. The plan names the module,
// the camera intent, the reveal staging; this wrapper obeys. The modules
// themselves are untouched — the essay stages them differently, it does not
// rewrite them.
import React from "react";
import { AbsoluteFill } from "remotion";
import { VOX_MODULES, VoxSceneProps } from "../vox/scenes.tsx";
import { useSemanticCamera } from "../editorial/camera.ts";
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
        <CameraMove intent={intent} dur={dur}>
          {stage}
        </CameraMove>
      ) : (
        stage
      )}
      {/* The stamp is an overlay on the page, not a thing on it — it stays
          out of the camera so it never drifts with the frame. */}
      <CallbackStamp plan={plan} beatN={db.n} />
    </AbsoluteFill>
  );
};

/** The 2.5D camera move a beat earns — the plan's intent applied to the page.
 *  It has to *wrap* the stage: a transform on an empty sibling moves nothing,
 *  which is how 68 beats rendered as 68 static cards. */
const CameraMove: React.FC<{
  intent: string;
  dur: number;
  children: React.ReactNode;
}> = ({ intent, dur, children }) => {
  const { transform } = useSemanticCamera(
    intent as Parameters<typeof useSemanticCamera>[0],
    dur,
  );
  return (
    <AbsoluteFill style={{ transform, transformOrigin: "50% 50%", willChange: "transform" }}>
      {children}
    </AbsoluteFill>
  );
};
