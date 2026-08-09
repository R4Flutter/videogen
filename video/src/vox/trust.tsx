// The trust engine. The scam's own script, staged: the signals that make a
// fake platform look real check in one at a time — and then, when the
// narration turns, every check becomes a cross and a FAKE stamp lands on each
// row. The same objects build the trust and collapse it, which is the
// argument of the whole genre in one frame.
import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraRig } from "../editorial/camera";
import { theme } from "../theme";
import { DrawIn, LineIcon } from "./elements";
import { fitBlock, useLayout } from "./layout";
import { PageHead, VoxSceneProps } from "./scenes";

/**
 * When the trust collapses, in seconds into the beat. Timed off voice.json like
 * everything else, so the turn is locked to the read and not to a frame guess.
 *
 * Three sources, most-specific first:
 *   1. `**Turn:**` in the script — the phrase the collapse lands on, named by
 *      the author. Every story turns on a different sentence, so the engine
 *      must not hold an opinion about which words those are.
 *   2. the last sentence of the beat, which is where a reversal lives in
 *      practice ("...none of it was real", "...the account was never yours").
 *   3. 72% in, for a beat written as one unbroken sentence.
 *
 * `secs` is the beat in seconds, matching the word timings it falls back from;
 * the caller converts, because VoxSceneProps carries frames.
 */
const flipAt = (
  secs: number,
  words: { w: string; start: number; end: number }[],
  turn?: string,
) => {
  const cue = (turn ?? "").trim().toLowerCase();
  if (cue) {
    const head = cue.split(/\s+/)[0].replace(/[^\w']/g, "");
    const hit = words.find((w) => w.w.toLowerCase().replace(/[^\w']/g, "") === head);
    if (hit) return hit.start;
  }
  // Start of the final sentence: the word after the last mid-beat full stop.
  const breaks = words
    .map((w, i) => (/[.?!]$/.test(w.w) && i < words.length - 1 ? i + 1 : -1))
    .filter((i) => i > words.length * 0.35);
  if (breaks.length) return words[breaks[breaks.length - 1]].start;
  return secs * 0.72;
};

export const Trust: React.FC<VoxSceneProps> = ({ dur, beat, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, pad, safeW, y: band, primaryH } = useLayout();
  const vox = theme.vox;
  const rows = beat.icons && beat.icons.length ? beat.icons : [];
  if (!rows.length) return null;

  const flip = beat.shape === "flip";
  const at = flip ? flipAt(dur / fps, words, beat.turn) : Infinity;
  const flipped = flip && frame / fps >= at;

  const glyph = width * 0.05;
  // The list divides the primary band between however many signals the script
  // listed, rather than assuming six will fit at a fixed row height — a
  // nine-signal beat used to run its last three rows through the caption.
  const rowH = Math.min(width * 0.075, primaryH / rows.length);
  const firstY = band.primary;
  // The FAKE stamp lands at the right margin, so a label may not reach it.
  const labelW = safeW - glyph - pad * 0.5 - width * 0.16;
  const size = rows.reduce(
    (small, row) =>
      Math.min(small, fitBlock(row.label, labelW, rowH * 0.9, width * 0.036,
        { weight: 700, family: vox.font }, 1.15)),
    width * 0.036,
  );

  return (
    <CameraRig intent="settle" dur={dur} seed={beat.n} style={{ fontFamily: vox.font }}>
      <PageHead kicker={beat.name} headline={beat.text} frame={frame} />

      {rows.map((row, i) => {
        const enter = spring({
          frame: frame - 10 - i * 9,
          fps,
          config: { damping: 200, mass: 0.6, stiffness: 190 },
          durationInFrames: 14,
        });
        const y = firstY + i * rowH;
        // Stamps land one row apart, in the order the trust was built.
        const stamped = flipped && frame >= at * fps + 12 + i * 10;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: pad,
                top: y,
                width: safeW,
                display: "flex",
                alignItems: "center",
                gap: pad * 0.5,
                opacity: enter,
                transform: `translateY(${interpolate(enter, [0, 1], [width * 0.012, 0])}px)`,
              }}
            >
              <LineIcon
                name={flipped ? "x" : "check"}
                size={glyph}
                color={flipped ? vox.accent : vox.ink}
              />
              <div
                style={{
                  maxWidth: labelW,
                  fontWeight: 700,
                  fontSize: size,
                  lineHeight: 1.15,
                  letterSpacing: -width * 0.0006,
                  color: flipped ? vox.muted : vox.ink,
                }}
              >
                {row.label}
              </div>
              {/* The stamp: FAKE, placed by hand, naming the row as fake. */}
              <div
                style={{
                  position: "absolute",
                  right: width * 0.06,
                  fontWeight: 800,
                  fontSize: width * 0.034,
                  letterSpacing: width * 0.004,
                  textTransform: "uppercase",
                  color: vox.accent,
                  transform: "rotate(-2deg)",
                  opacity: stamped ? 1 : 0,
                }}
              >
                FAKE
              </div>
            </div>
            {flipped && i > 0 ? (
              <DrawIn
                shape="strike"
                x={pad + glyph + pad * 0.7}
                y={y + size * 0.55}
                w={width * 0.42}
                h={size}
                seed={beat.n * 13 + i}
                progress={interpolate(frame - at * fps - 14 - i * 10, [0, 14], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.linear,
                })}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </CameraRig>
  );
};
