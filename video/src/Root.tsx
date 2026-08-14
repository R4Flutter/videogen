import "./index.css";
import { Fragment } from "react";
import { Composition } from "remotion";
import { CRIME_TRACKS, CrimeDoc } from "./CrimeDoc";
import { IMAGE_SHORT_SECONDS, ImageShort } from "./ImageShort";
import { ScamDoc } from "./scam/ScamShort";
import { VoxShort } from "./VoxShort";
import { EssayDoc } from "./essay/EssayDoc";
import { INFO_TRACKS, InfoDoc } from "./InfoDoc";
import { McdVideo } from "./mcd/Video";
import { STORY_LIST } from "./mcd/stories";
import { VIDEO_CONFIG, VIDEO_CONFIG_PORTRAIT } from "./mcd/data/timeline";
import script from "./script.json";
import plan from "./director-plan.json";
import type { DirectorPlan } from "./director/types.ts";

// One story file, three engines. The parser writes `engine` from the story
// format it detected — a crime documentary stages CrimeDoc, a scam episode
// stages ScamDoc, a vox script stages VoxShort — and each engine registers
// its cuts only when the story actually is one. An empty composition is a
// render that fails at 3am.
const fps = script.fps;
const frames = (seconds: number) => Math.max(1, Math.round(seconds * fps));

export const RemotionRoot: React.FC = () => {
  const vox = script.engine === "vox";
  const scam = script.engine === "scam";
  const info = script.engine === "info";
  return (
    <>
      {/* Not driven by the story at all — just the pictures sitting in
          public/footage, parallaxed and cross-faded. Always registered. */}
      <Composition
        id="ImageShort"
        component={ImageShort}
        width={1080}
        height={1920}
        fps={fps}
        durationInFrames={frames(IMAGE_SHORT_SECONDS)}
      />
      {!vox && !scam ? (
        <Composition
          id="CrimeLong"
          component={CrimeDoc}
          defaultProps={{ cut: "long" as const }}
          width={script.width}
          height={script.height}
          fps={fps}
          durationInFrames={frames(CRIME_TRACKS.runtime(CRIME_TRACKS.long))}
        />
      ) : null}
      {!scam && CRIME_TRACKS.short.length ? (
        <Composition
          id="CrimeShort"
          component={CrimeDoc}
          defaultProps={{ cut: "short" as const }}
          width={1080}
          height={1920}
          fps={fps}
          durationInFrames={frames(CRIME_TRACKS.runtime(CRIME_TRACKS.short))}
        />
      ) : null}
      {scam ? (
        <>
          <Composition
            id="ScamShort"
            component={ScamDoc}
            defaultProps={{ cut: "short" as const }}
            width={script.width}
            height={script.height}
            fps={fps}
            durationInFrames={frames(script.durationInSeconds)}
          />
          <Composition
            id="ScamLong"
            component={ScamDoc}
            defaultProps={{ cut: "long" as const }}
            width={1920}
            height={1080}
            fps={fps}
            durationInFrames={frames(script.durationInSeconds)}
          />
        </>
      ) : null}
      {vox ? (
        <>
          {/* The canvas comes from the script: `**Format:** portrait` writes
              1080×1920, `landscape`/`16:9` writes 1920×1080. VoxShort sizes
              everything off the canvas, so one component stages both forks. */}
          <Composition
            id="VoxExplain"
            component={VoxShort}
            width={script.width}
            height={script.height}
            fps={fps}
            durationInFrames={frames(script.durationInSeconds)}
          />
          {/* The essay cut runs the director's plan when there is one for
              this script — otherwise EssayDoc falls back to the short form. */}
          <Composition
            id="VoxEssay"
            component={EssayDoc}
            defaultProps={{ plan: plan as unknown as DirectorPlan }}
            width={1920}
            height={1080}
            fps={fps}
            durationInFrames={frames(script.durationInSeconds)}
          />
        </>
      ) : null}
      {info ? (
        <>
          <Composition
            id="InfoLong"
            component={InfoDoc}
            width={script.width}
            height={script.height}
            fps={fps}
            durationInFrames={frames(INFO_TRACKS.runtime(INFO_TRACKS.long))}
          />
          {INFO_TRACKS.long.length >= 5 ? (
            <Composition
              id="InfoDemo"
              component={InfoDoc}
              width={1920}
              height={1080}
              fps={fps}
              durationInFrames={frames(INFO_TRACKS.runtime(INFO_TRACKS.long))}
            />
          ) : null}
        </>
      ) : null}

      {/* Self-contained business-documentary engine (src/mcd) — one
          composition per registered story (stories/index.ts), plus a
          9:16 vertical cut of every story for Shorts. Each story's duration
          comes from its own computed timeline (narration-driven). */}
      {STORY_LIST.map((story) => (
        <Fragment key={story.id}>
          <Composition
            id={story.id}
            component={McdVideo}
            defaultProps={{ story }}
            width={VIDEO_CONFIG.width}
            height={VIDEO_CONFIG.height}
            fps={VIDEO_CONFIG.fps}
            durationInFrames={story.timeline.totalFrames}
          />
          <Composition
            id={`${story.id}Portrait`}
            component={McdVideo}
            defaultProps={{ story }}
            width={VIDEO_CONFIG_PORTRAIT.width}
            height={VIDEO_CONFIG_PORTRAIT.height}
            fps={VIDEO_CONFIG_PORTRAIT.fps}
            durationInFrames={story.timeline.totalFrames}
          />
        </Fragment>
      ))}
    </>
  );
};
