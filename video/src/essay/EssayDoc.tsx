// EssayDoc: the long-form composition. VoxShort reads the script and stages
// a tight explainer; EssayDoc reads the director's plan — chapters,
// sequences, attention events, camera intents, caption policy, audio curve,
// story memory — and stages the same modules at the plan's pace. The plan
// and the script are generated together, so a plan that doesn't match its
// script is a plan to ignore: the composition falls back to the short form
// rather than rendering a contradiction.
import React from "react";
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { PaperBG } from "../vox/elements";
import { VoxShort } from "../VoxShort";
import { EssayScene } from "./Scene.tsx";
import { EssayCaptions, ChapterKicker } from "./Captions.tsx";
import { EssaySoundtrack } from "./EssaySoundtrack.tsx";
import { ChapterCard } from "./ChapterCard.tsx";
import type { DirectorPlan } from "../director/types.ts";
import script from "../script.json";

const vox = theme.vox;

/** The frames an outgoing beat must hold while the incoming one takes over,
 *  per transition type. */
const OVERLAP: Record<string, number> = {
  page: 9,
  crossfade: 9,
  hold: 12,
  cut: 0,
  chapter: 0,
};

/** Incoming-beat entrance: a page rises, a crossfade fades, a cut lands. */
const Entrance: React.FC<{ type: string; children: React.ReactNode }> = ({
  type,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  if (type === "cut") return <>{children}</>;
  if (type === "page") {
    // The page rises into place over the first beat of the turn.
    const p = Math.min(1, t / 0.45);
    return (
      <div
        style={{
          opacity: p,
          transform: `translateY(${(1 - p) * -16}px) scale(${1 - (1 - p) * 0.015})`,
        }}
      >
        {children}
      </div>
    );
  }

  // crossfade / hold / chapter: fade in over the overlap.
  const p = interpolate(t, [0, 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <div style={{ opacity: p }}>{children}</div>;
};

export const EssayDoc: React.FC<{ plan?: DirectorPlan }> = ({ plan }) => {
  const { fps } = useVideoConfig();
  const dur = (s: number) => Math.max(1, Math.round(s * fps));

  // The plan is truth; if there is none — or it doesn't fit this script —
  // the short form is.
  if (!plan) return <VoxShort />;
  if (plan.beats.length !== script.beats.length) return <VoxShort />;
  if (plan.project.title !== script.title) return <VoxShort />;

  const beats = plan.beats;
  const chapters = plan.chapters;

  return (
    <AbsoluteFill style={{ backgroundColor: vox.paper }}>
      <PaperBG />
      <AbsoluteFill>
        {beats.map((b, i) => {
          const next = beats[i + 1];
          const overlap = OVERLAP[next?.motion.transitionIn.type ?? "cut"] ?? 0;
          const last = i === beats.length - 1;
          return (
            <Sequence
              key={b.n}
              from={dur(b.start)}
              durationInFrames={dur(b.end - b.start) + overlap}
            >
              <Entrance type={b.motion.transitionIn.type}>
                <EssayScene plan={plan} db={b} dur={dur(b.end - b.start) + overlap} />
              </Entrance>
            </Sequence>
          );
        })}
        {chapters.slice(1).map((c) => (
          <Sequence key={c.id} from={dur(c.start)} durationInFrames={dur(2.6)}>
            <ChapterCard text={c.card.text} subtext={c.card.subtext} chapter={c.number} />
          </Sequence>
        ))}
        {chapters.slice(1).map((c) => (
          <Sequence key={`k-${c.id}`} from={dur(c.start)} durationInFrames={dur(3.2)}>
            <ChapterKicker text={`chapter ${c.number} — ${c.card.text}`} at={0} dur={3.2} />
          </Sequence>
        ))}
      </AbsoluteFill>
      <EssayCaptions plan={plan} />
      <EssaySoundtrack plan={plan} />
    </AbsoluteFill>
  );
};
