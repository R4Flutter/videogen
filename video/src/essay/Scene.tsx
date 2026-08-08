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
  const camera =
    intent === "settle" || SELF_FRAMING.has(module) ? null : (
      <CameraMove intent={intent} dur={dur} />
    );

  return (
    <AbsoluteFill style={{ backgroundColor: vox.paper }}>
      {camera}
      <Reveal beat={db} module={module}>
        {Scene ? (
          <Scene
            dur={dur}
            beat={{ ...scriptBeat, module } as VoxSceneProps["beat"]}
            words={wordsForBeat(scriptBeat)}
          />
        ) : null}
      </Reveal>
      <CallbackStamp plan={plan} beatN={db.n} />
    </AbsoluteFill>
  );
};

/** The 2.5D camera move a beat earns — the plan's intent, applied at the
 *  page level so the caption card stays steady. */
const CameraMove: React.FC<{ intent: string; dur: number }> = ({ intent, dur }) => {
  const { transform } = useSemanticCamera(
    intent as Parameters<typeof useSemanticCamera>[0],
    dur,
  );
  return <AbsoluteFill style={{ transform }} />;
};
