import "./index.css";
import { Composition } from "remotion";
import { CRIME_TRACKS, CrimeDoc } from "./CrimeDoc";
import { ScamDoc } from "./scam/ScamShort";
import script from "./script.json";

// One story file, two engines. The parser writes `engine` from the story
// format it detected — a crime documentary stages CrimeDoc, a scam episode
// stages ScamDoc — and each engine registers its cuts only when the story
// actually is one. An empty composition is a render that fails at 3am.
const fps = script.fps;
const frames = (seconds: number) => Math.max(1, Math.round(seconds * fps));

export const RemotionRoot: React.FC = () => {
  const scam = script.engine === "scam";
  return (
    <>
      {!scam ? (
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
    </>
  );
};
