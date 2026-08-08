// Captions: the essay's word policy. Each beat's plan names a mode, and the
// frame obeys: full captions under archival material, stressed words only
// under the big visuals, an attribution chip under maps, nothing under a
// stat the graphic itself is spelling out. Words come from voice.json; when
// no voice exists yet, the parser's per-beat timing stub carries them.
import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { STRESS } from "../vox/elements";
import type { DirectorPlan } from "../director/types.ts";
import type { VoxBeat } from "../vox/scenes.tsx";
import script from "../script.json";
import voice from "../voice.json";

const vox = theme.vox;

/** The script beat a directed beat points at — narration, source and the
 *  words live on the script side of the pair. */
const scriptBeatOf = (n: number) => script.beats.find((b) => b.n === n);

/** Words for a beat — real take when the voice exists, else the parser's
 *  stub (one chunk per beat, evenly spread). Timings are seconds relative
 *  to the beat's start, as voice.json writes them. */
export const wordsForBeat = (
  beat: VoxBeat,
): { w: string; start: number; end: number }[] => {
  const take = voice.beats.find((t) => t.n === beat.n);
  if (take && take.words.length) return take.words;
  const spoken = beat.vo ? beat.vo.replace(/[*_]|\[[^\]]*\]/g, "").split(" ") : [];
  const total = beat.end - beat.start;
  const step = spoken.length ? total / spoken.length : 0;
  return spoken.map((w, i) => ({
    w,
    start: i * step,
    end: (i + 1) * step,
  }));
};

/** The chunk currently being spoken, with a small lookahead so captions
 *  land a beat before the word, like subtitles do. Seconds. */
const activeWord = (
  words: { w: string; start: number; end: number }[],
  t: number,
) =>
  words.find((w) => t >= w.start - 0.09 && t < w.end + 0.12) ?? null;

const CaptionCard: React.FC<{ text: string; opacity: number; accent: boolean }> = ({
  text,
  opacity,
  accent,
}) => {
  const { width } = useVideoConfig();
  return (
    <div
      style={{
        position: "absolute",
        bottom: width * 0.09,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: width * 0.86,
        padding: `${width * 0.016}px ${width * 0.034}px`,
        background: accent ? vox.accent : "rgba(244,241,234,0.94)",
        border: `${width * 0.003}px solid ${accent ? vox.accent : vox.rule}`,
        boxShadow: `0 ${width * 0.012}px ${width * 0.03}px rgba(26,26,26,.2)`,
        borderRadius: width * 0.01,
        opacity,
        fontFamily: vox.font,
        fontWeight: 800,
        fontSize: width * 0.035,
        lineHeight: 1.15,
        letterSpacing: 0.1,
        textAlign: "center",
        color: accent ? vox.paper : vox.ink,
        zIndex: 5,
      }}
    >
      {text}
    </div>
  );
};

/** "CHAPTER 2" kicker chip, shown once at a chapter boundary. */
const ChapterKicker: React.FC<{ text: string; at: number }> = ({ text, at }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const t = frame / 30;
  const local = t - at;
  if (local < -0.3 || local > 1.8) return null;
  const op = Math.min(
    interpolate(local, [0, 0.4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    interpolate(local, [1.2, 1.8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  return (
    <div
      style={{
        position: "absolute",
        top: width * 0.07,
        left: "50%",
        transform: "translateX(-50%)",
        opacity: op,
        fontFamily: vox.font,
        fontWeight: 800,
        fontSize: width * 0.026,
        letterSpacing: width * 0.008,
        textTransform: "uppercase",
        color: vox.accent,
      }}
    >
      {text}
    </div>
  );
};

export const EssayCaptions: React.FC<{ plan: DirectorPlan }> = ({ plan }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  const beat = plan.beats.find((b) => t >= b.start && t < b.end);
  if (!beat) return null;
  const sBeat = scriptBeatOf(beat.n);
  if (!sBeat) return null;

  const mode = beat.visual.captionMode;
  if (mode === "NONE") return null;

  const words = wordsForBeat(sBeat);
  const word = activeWord(words, t - beat.start);
  if (!word) return null;

  // A caption lives a life: land fast, hold, go. Beat-relative.
  const op = Math.min(
    interpolate(t, [beat.start, beat.start + 0.18], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(t, [beat.end - 0.25, beat.end], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
  );

  if (mode === "EMPHASIS") {
    // Only the stressed words reach the frame — the sentence is the voice's.
    const stressed = words.filter((w) => STRESS.test(w.w));
    const current = stressed.find((w) => t - beat.start >= w.start - 0.09 && t - beat.start < w.end + 0.12);
    if (!current) return null;
    return <CaptionCard text={current.w} opacity={op} accent={false} />;
  }

  if (mode === "LOWER_THIRD") {
    // The source, not the words: "FBI INVESTIGATION FILES, 2024".
    const label = sBeat.source ?? sBeat.name.toUpperCase();
    return (
      <div
        style={{
          position: "absolute",
          bottom: "8%",
          left: "6%",
          opacity: op,
          fontFamily: vox.font,
          fontWeight: 700,
          fontSize: 24,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: vox.muted,
        }}
      >
        {label}
      </div>
    );
  }

  return <CaptionCard text={word.w} opacity={op} accent={mode === "SUBTITLE"} />;
};

export { ChapterKicker };
