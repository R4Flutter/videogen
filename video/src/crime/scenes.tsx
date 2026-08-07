// One module per beat. The director (script.json, written by parse-story.mjs)
// picks which one runs when; each owns its own staging. A crime episode never
// writes JSX — it writes a beat with a module name, so the second case costs a
// story.txt and nothing else.
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import {
  affix,
  DrawIn,
  InkChart,
  KineticText,
  LineIcon,
  Marker,
  num,
  Shape,
  Word,
} from "../vox/elements";
import {
  Body,
  CRIME_TYPE,
  Diagram,
  ease,
  Emphasis,
  FilmBG,
  hasAsset,
  layout,
  Mono,
  Node,
  Plate,
  Provenance,
  ProvenanceTag,
  Redact,
  Screen,
  Sheet,
  Slug,
  Stage,
  useStage,
} from "./elements";

const c = theme.crime;

/** A row a beat carries: "2:17 AM — the phone stops" parses to label/raw here.
 *  What the two halves mean is the module's business: a timeline reads raw as a
 *  time, a map reads it as a place note, an evidence card as a description. */
export type Row = { label: string; raw: string; value: number; side?: string };

/** What a crime beat carries. Everything past `vo` is optional — a beat that
 *  says nothing but its narration still stages. */
export type CrimeBeat = {
  n: number;
  name: string;
  module: string;
  start: number;
  end: number;
  vo: string;
  visual: string;
  chapter?: string;
  text?: string;
  source?: string;
  footage?: string;
  data?: Row[];
  /** Index of the first row this beat adds — earlier rows are memory, and are
   *  staged dim so the viewer sees the case accumulating rather than resetting. */
  accent?: number;
  links?: [number, number][];
  provenance?: string;
  intent?: string;
  intensity?: number;
  /** The script asked for the bed to drop under this beat. */
  silence?: boolean;
  density?: number;
  sfx?: string[];
  track?: string;
  /** ICONS row: mechanism steps, one lucide glyph each. */
  icons?: { icon: string; label: string }[];
  /** MARK row: the hand-drawn annotation drawn over this beat's headline. */
  shape?: string;
};

export type CrimeSceneProps = { dur: number; beat: CrimeBeat; words: Word[] };

const rows = (beat: CrimeBeat): Row[] => beat.data ?? [];
const prov = (beat: CrimeBeat): Provenance =>
  (beat.provenance as Provenance) ?? "illustrative";

/** Imagery + the tag that says what the imagery is. Every module that puts a
 *  picture on screen goes through here, which is why nothing can quietly ship
 *  stock footage dressed as evidence. */
const Imagery: React.FC<{
  beat: CrimeBeat;
  progress: number;
  grade?: "neutral" | "cold" | "archival";
  dim?: number;
}> = ({ beat, progress, grade, dim }) => (
  <>
    <Plate beat={beat.n} progress={progress} grade={grade} dim={dim} />
    {hasAsset(beat.n) ? <ProvenanceTag kind={prov(beat)} /> : null}
  </>
);

/** Where the case is, who is speaking, which chapter we are in. Present on most
 *  frames, quiet enough to ignore. */
const Header: React.FC<{ beat: CrimeBeat; frame: number; color?: string }> = ({
  beat,
  frame,
  color,
}) => {
  const { pad } = useStage();
  return (
    <div style={{ position: "absolute", left: pad, top: pad * 0.8 }}>
      <Slug text={beat.chapter || beat.name} enter={frame - 3} color={color} />
    </div>
  );
};

// ------------------------------------------------------------------ opening
/**
 * The cold open. No logo, no channel, no "today we're looking at" — the case
 * title, where it happened, and what its status is, and then the story starts.
 */
export const CaseOpen: React.FC<CrimeSceneProps> = ({ dur, beat, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, pad, height } = useStage();
  const [place, status] = [rows(beat)[0], rows(beat)[1]];
  return (
    <AbsoluteFill>
      <Imagery beat={beat} progress={ease(frame, 0, dur)} grade="cold" dim={0.55} />
      <Stage justify="center">
        <div style={{ height: height * 0.04 }} />
        <Emphasis text={beat.text || beat.name} enter={frame - 6} maxChars={22} />
        <div style={{ display: "flex", gap: pad * 0.8, opacity: ease(frame, 18, 34) }}>
          {place ? <Mono text={place.label.toUpperCase()} size={u * 20} color={c.dim} /> : null}
          {status ? (
            <Mono text={status.label.toUpperCase()} size={u * 20} color={c.evidence} />
          ) : null}
        </div>
      </Stage>
      <div style={{ position: "absolute", left: pad, bottom: pad * 2.1, width: "70%" }}>
        <KineticText
          words={words}
          t={frame / fps}
          mode="caption"
          palette={CRIME_TYPE}
        />
      </div>
    </AbsoluteFill>
  );
};

/** A chapter card. Short — it is a breath between developments, not an act
 *  break, and a long one throws away the momentum the last beat built. */
export const Chapter: React.FC<CrimeSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { u, width, height } = useStage();
  const title = (beat.text || beat.name).toUpperCase();
  const t = ease(frame, 0, 14);
  const out = ease(frame, dur - 8, dur, [1, 0] as const);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <FilmBG />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: u * 22,
        }}
      >
        <div
          style={{
            width: width * 0.34 * t,
            height: u * 2,
            background: c.evidence,
          }}
        />
        <div
          style={{
            fontFamily: c.font,
            fontWeight: 800,
            fontSize: u * (title.length > 22 ? 52 : 72),
            letterSpacing: u * 4,
            textTransform: "uppercase",
            textAlign: "center",
            color: c.text,
            opacity: t,
            transform: `translateY(${(1 - t) * height * 0.012}px)`,
          }}
        >
          {title}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ time
/** One timestamp, alone. The most useful frame in a documentary about when
 *  something happened, and it works precisely because it holds nothing else. */
export const Clock: React.FC<CrimeSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { u, width } = useStage();
  const stamp = beat.text || rows(beat)[0]?.label || "";
  const note = rows(beat)[0]?.raw ?? "";
  const t = ease(frame, 4, 20);
  return (
    <AbsoluteFill>
      <Imagery beat={beat} progress={ease(frame, 0, dur)} grade="cold" dim={0.62} />
      <Header beat={beat} frame={frame} />
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: u * 18,
        }}
      >
        <div
          style={{
            fontFamily: c.mono,
            fontWeight: 700,
            fontSize: u * (stamp.length > 9 ? 88 : 122),
            letterSpacing: -u * 2,
            color: c.text,
            fontVariantNumeric: "tabular-nums",
            opacity: t,
            transform: `scale(${0.96 + t * 0.04})`,
          }}
        >
          {stamp}
        </div>
        {note ? (
          <div style={{ opacity: ease(frame, 20, 34) }}>
            <Body text={note.toUpperCase()} size={u * 24} color={c.dim} weight={700} />
          </div>
        ) : null}
        <div
          style={{
            width: width * 0.2 * ease(frame, 10, 30),
            height: u * 2,
            background: c.evidence,
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * The timeline, and the engine's story memory. Rows from earlier beats stay on
 * it, dimmed; the rows this beat adds land in evidence red.
 *
 * Returning to a populated timeline with one new entry is the single clearest
 * way to show an investigation changing shape, which is why the parser carries
 * every row forward instead of each beat starting a fresh list.
 */
export const Timeline: React.FC<CrimeSceneProps> = ({ dur, beat, words }) => {
  const frame = useCurrentFrame();
  const { u, pad, width, height, wide } = useStage();
  const list = rows(beat);
  const from = beat.accent ?? 0;
  if (!list.length) return <Statement dur={dur} beat={beat} words={words} />;

  const top = height * (wide ? 0.24 : 0.2);
  const step = Math.min(u * 62, (height * (wide ? 0.56 : 0.5)) / list.length);
  const axis = pad + u * 10;

  return (
    <AbsoluteFill>
      <FilmBG />
      <Header beat={beat} frame={frame} />
      {/* the spine, drawn down to the last row it has reached */}
      <div
        style={{
          position: "absolute",
          left: axis,
          top,
          width: u * 2,
          height: step * list.length * ease(frame, 4, 26),
          background: c.rule,
        }}
      />
      {list.map((row, i) => {
        const isNew = i >= from;
        // Old rows are already known: they are on screen from the first frame.
        // New rows arrive in order, one after the other.
        const t = isNew ? ease(frame, 12 + (i - from) * 9, 26 + (i - from) * 9) : 1;
        const y = top + i * step;
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                left: axis - u * 7,
                top: y - u * 7,
                width: u * 16,
                height: u * 16,
                borderRadius: u * 16,
                border: `${u * 2}px solid ${isNew ? c.evidence : c.dim}`,
                background: isNew ? c.evidence : c.ink,
                transform: `scale(${t})`,
                opacity: isNew ? 1 : 0.45,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: axis + u * 26,
                top: y - u * 20,
                width: width - axis - pad * 1.4,
                display: "flex",
                flexDirection: wide ? "row" : "column",
                alignItems: wide ? "baseline" : "flex-start",
                gap: wide ? u * 22 : u * 2,
                opacity: t * (isNew ? 1 : 0.42),
                transform: `translateX(${(1 - t) * u * 14}px)`,
              }}
            >
              <Mono
                text={row.label}
                size={u * 24}
                color={isNew ? c.evidence : c.surveil}
              />
              <Body
                text={row.raw}
                size={u * 25}
                color={isNew ? c.text : c.dim}
                weight={600}
              />
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ places
/**
 * A schematic of the geography — pins, and the distances between them.
 *
 * It is deliberately a diagram and not a drawn map of a real place. Inventing
 * a coastline or a street grid the case data does not contain would be making
 * up evidence, and a labelled diagram carries the only thing the narration
 * actually claims: these locations, in this relation, this far apart.
 */
export const Map: React.FC<CrimeSceneProps> = ({ dur, beat, words }) => {
  const frame = useCurrentFrame();
  const { u, height, wide, pad } = useStage();
  const list = rows(beat);
  if (!list.length) return <Statement dur={dur} beat={beat} words={words} />;

  const spots = layout(list.length, wide);
  const nodes: Node[] = list.map((row, i) => ({
    label: row.label,
    sub: row.raw,
    ...spots[i],
  }));
  // Locations in the order the story visits them: the route is the claim.
  const links = nodes.slice(1).map((_, i) => [i, i + 1] as [number, number]);
  const run = ease(frame, 6, Math.max(30, dur * 0.55));

  return (
    <AbsoluteFill>
      <FilmBG />
      {/* survey grid: enough to read as a map surface, faint enough to ignore */}
      <AbsoluteFill
        style={{
          backgroundImage:
            `repeating-linear-gradient(0deg, ${c.rule} 0 1px, transparent 1px ${u * 58}px),` +
            `repeating-linear-gradient(90deg, ${c.rule} 0 1px, transparent 1px ${u * 58}px)`,
          opacity: 0.22,
        }}
      />
      <Header beat={beat} frame={frame} />
      <Diagram nodes={nodes} links={links} progress={run} accent={list.length - 1} />
      {beat.text ? (
        <div style={{ position: "absolute", left: pad, bottom: height * 0.14 }}>
          <Emphasis text={beat.text} enter={frame - 24} color={c.text} />
        </div>
      ) : null}
      <div style={{ position: "absolute", right: pad, top: pad * 0.8 }}>
        <Mono text="SCHEMATIC — NOT TO SCALE" size={u * 14} color={c.dim} />
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ people
/** Who this is and what they were to the case. The role line is written by the
 *  script, so a person is never implicitly accused by their own card. */
export const Person: React.FC<CrimeSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { u, pad, width, height, wide } = useStage();
  const list = rows(beat);
  const t = ease(frame, 6, 22);
  return (
    <AbsoluteFill>
      <Imagery beat={beat} progress={ease(frame, 0, dur)} dim={0.5} />
      <Header beat={beat} frame={frame} />
      <div
        style={{
          position: "absolute",
          left: pad,
          // The vertical cut prints the narration along its bottom edge. A card
          // that sits where the captions are is two things reading as one.
          bottom: wide ? pad * 2.0 : height * 0.22,
          width: width - pad * 2,
          display: "flex",
          flexDirection: "column",
          gap: u * 14,
        }}
      >
        {(list.length ? list : [{ label: beat.text ?? beat.name, raw: "", value: 0 }]).map(
          (row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: u * 4,
                paddingLeft: u * 18,
                borderLeft: `${u * 3}px solid ${c.evidence}`,
                opacity: ease(frame, 6 + i * 8, 22 + i * 8),
                transform: `translateX(${(1 - t) * u * 10}px)`,
              }}
            >
              <div
                style={{
                  fontFamily: c.font,
                  fontWeight: 800,
                  fontSize: u * 46,
                  letterSpacing: -u * 1,
                  color: c.text,
                }}
              >
                {row.label}
              </div>
              {row.raw ? (
                <Body text={row.raw} size={u * 24} color={c.dim} weight={600} />
              ) : null}
            </div>
          ),
        )}
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ evidence
/** Exhibit cards. Numbered, because that is how a case files them, and the
 *  number is what lets the narration refer back to one later. */
export const Evidence: React.FC<CrimeSceneProps> = ({ dur, beat, words }) => {
  const frame = useCurrentFrame();
  const { u, pad, wide } = useStage();
  const list = rows(beat);
  if (!list.length) return <Statement dur={dur} beat={beat} words={words} />;
  return (
    <AbsoluteFill>
      <FilmBG />
      <Header beat={beat} frame={frame} />
      <Stage justify="center">
        {beat.text ? <Emphasis text={beat.text} enter={frame - 4} /> : null}
        <div
          style={{
            display: "flex",
            flexDirection: wide ? "row" : "column",
            gap: pad * 0.5,
            width: "100%",
          }}
        >
          {list.map((row, i) => {
            const t = ease(frame, 10 + i * 8, 26 + i * 8);
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  padding: u * 26,
                  background: c.slate,
                  border: `${u * 1.5}px solid ${c.rule}`,
                  borderTop: `${u * 4}px solid ${c.evidence}`,
                  // wiped in, not faded: a card that fades looks like a card
                  // loading, a card that wipes looks like one being laid down
                  clipPath: `inset(0 ${Math.max(0, (1 - t) * 100)}% 0 0)`,
                  display: "flex",
                  flexDirection: "column",
                  gap: u * 10,
                }}
              >
                {/* Numbered only when the script described an exhibit. A card
                    that is just a place or a date is not evidence, and giving
                    it an exhibit number says the case filed it as such. */}
                {row.raw ? <Mono text={`EXHIBIT ${i + 1}`} size={u * 15} color={c.dim} /> : null}
                <div
                  style={{
                    fontFamily: c.font,
                    fontWeight: 800,
                    fontSize: u * 34,
                    lineHeight: 1.1,
                    color: c.text,
                  }}
                >
                  {row.label}
                </div>
                {row.raw ? <Body text={row.raw} size={u * 22} color={c.dim} /> : null}
              </div>
            );
          })}
        </div>
      </Stage>
    </AbsoluteFill>
  );
};

/**
 * A document, and the one sentence in it that matters.
 *
 * The camera does not present a full page and hope: the page is on screen, and
 * the line the story turns on is marked by hand while it is being read. An
 * unreadable page of body copy communicates "a document exists" — this
 * communicates what the document says.
 */
export const Document: React.FC<CrimeSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { u, pad, width, height, wide } = useStage();
  const list = rows(beat);
  const line = beat.text || list[0]?.label || "";
  const t = ease(frame, 4, 22);
  // A page is a page. Stretched to 1920 it stops being a document and becomes
  // a banner, so in landscape the sheet keeps a paper-shaped measure.
  const sheetW = wide ? width * 0.56 : width - pad * 2;
  const sheetX = (width - sheetW) / 2;
  const top = height * 0.26;

  return (
    <AbsoluteFill>
      <FilmBG warm />
      <Header beat={beat} frame={frame} />
      <div style={{ position: "absolute", left: sheetX, top, width: sheetW }}>
        <Sheet progress={t}>
          <Mono text={beat.source || "DOCUMENT"} size={u * 16} color="#6E6656" />
          <div style={{ height: u * 20 }} />
          <div
            style={{
              fontFamily: c.font,
              fontWeight: 700,
              fontSize: u * (line.length > 90 ? 28 : 36),
              lineHeight: 1.32,
              color: "#20242A",
            }}
          >
            {line}
          </div>
          {list.slice(1).map((row, i) => (
            <div key={i} style={{ marginTop: u * 16, opacity: 0.55 }}>
              <Body text={`${row.label} ${row.raw}`} size={u * 22} color="#3A3F46" />
            </div>
          ))}
        </Sheet>
      </div>
      {/* the mark lands on the line while the narrator reads it */}
      <DrawIn
        shape="highlight"
        x={sheetX + u * 40}
        y={top + u * 96}
        w={sheetW - u * 80}
        h={u * (line.length > 90 ? 40 : 50)}
        color={c.evidence}
        strokeWidth={u * 4}
        seed={beat.n * 13}
        progress={ease(frame, dur * 0.3, dur * 0.62)}
      />
    </AbsoluteFill>
  );
};

/** The same sheet with what was withheld blacked out as you watch. Redaction is
 *  information: it says a record exists and someone decided you cannot read it. */
export const Redacted: React.FC<CrimeSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { u, pad, width, height, wide } = useStage();
  const line = beat.text || rows(beat)[0]?.label || "";
  const t = ease(frame, 4, 22);
  const parts = line.split(/(\[[^\]]*\]|_{3,})/g);
  const sheetW = wide ? width * 0.56 : width - pad * 2;
  return (
    <AbsoluteFill>
      <FilmBG warm />
      <Header beat={beat} frame={frame} />
      <div style={{ position: "absolute", left: (width - sheetW) / 2, top: height * 0.28, width: sheetW }}>
        <Sheet progress={t}>
          <Mono text={beat.source || "RECORD — PARTIALLY WITHHELD"} size={u * 16} color="#6E6656" />
          <div style={{ height: u * 20 }} />
          <div
            style={{
              fontFamily: c.font,
              fontWeight: 700,
              fontSize: u * 34,
              lineHeight: 1.5,
              color: "#20242A",
            }}
          >
            {parts.map((part, i) =>
              /^(\[.*\]|_{3,})$/.test(part) ? (
                <Redact
                  key={i}
                  progress={ease(frame, dur * 0.28 + i * 3, dur * 0.5 + i * 3)}
                  width={u * Math.max(60, part.length * 16)}
                  height={u * 32}
                />
              ) : (
                <span key={i}>{part}</span>
              ),
            )}
          </div>
        </Sheet>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ machines
/**
 * Surveillance. The chrome is only ever put on material that is actually
 * surveillance: a beat staging stock imagery here declares itself illustrative
 * in the corner, in red, for the whole beat.
 */
export const CCTV: React.FC<CrimeSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { u, width, height } = useStage();
  const stamp = rows(beat)[0]?.label || beat.text || "";
  const camera = beat.source || "CAM 04";
  return (
    <AbsoluteFill>
      <Screen camera={camera} stamp={stamp} frame={frame}>
        <Plate beat={beat.n} progress={ease(frame, 0, dur)} grade="cold" dim={0.42} />
      </Screen>
      {/* the region the narration is talking about, marked while it is said */}
      <DrawIn
        shape="box"
        x={width * 0.34}
        y={height * 0.36}
        w={width * 0.3}
        h={height * 0.22}
        color={c.evidence}
        strokeWidth={u * 3}
        seed={beat.n * 7}
        progress={ease(frame, dur * 0.34, dur * 0.6)}
      />
      <ProvenanceTag kind={hasAsset(beat.n) ? prov(beat) : "reconstruction"} />
    </AbsoluteFill>
  );
};

/**
 * What a phone left behind: pings, calls, or messages. One module, because they
 * are the same fact in three shapes — a record with a time on it.
 */
export const PhoneRecord: React.FC<CrimeSceneProps> = ({ dur, beat, words }) => {
  const frame = useCurrentFrame();
  const { u, pad, width, height, wide } = useStage();
  const list = rows(beat);
  if (!list.length) return <Statement dur={dur} beat={beat} words={words} />;
  const cardW = wide ? width * 0.52 : width - pad * 2;

  return (
    <AbsoluteFill>
      <FilmBG />
      <Header beat={beat} frame={frame} />
      <div
        style={{
          position: "absolute",
          left: wide ? (width - cardW) / 2 : pad,
          top: height * 0.24,
          width: cardW,
          background: c.slate,
          border: `${u * 1.5}px solid ${c.rule}`,
        }}
      >
        <div
          style={{
            padding: `${u * 14}px ${u * 20}px`,
            borderBottom: `${u * 1.5}px solid ${c.rule}`,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          {/* Records with times on them are a call log; the rest are messages.
              Labelling a message "CALL DETAIL RECORD" is the frame claiming a
              document that does not exist. */}
          <Mono
            text={
              beat.source ||
              (list.some((r) => /\d{1,2}:\d{2}/.test(r.label)) ? "CALL DETAIL RECORD" : "MESSAGE")
            }
            size={u * 16}
            color={c.surveil}
          />
          <Mono text={`${list.length} ENTRIES`} size={u * 16} color={c.dim} />
        </div>
        {list.map((row, i) => {
          const t = ease(frame, 10 + i * 7, 22 + i * 7);
          const hot = i === (beat.accent ?? list.length - 1);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: u * 18,
                alignItems: "baseline",
                padding: `${u * 13}px ${u * 20}px`,
                borderBottom: `${u * 1}px solid ${c.rule}`,
                background: hot ? `${c.evidence}1A` : "transparent",
                opacity: t,
                transform: `translateY(${(1 - t) * u * 8}px)`,
              }}
            >
              <Mono text={row.label} size={u * 21} color={hot ? c.evidence : c.surveil} />
              <Body
                text={row.raw}
                size={u * 22}
                color={hot ? c.text : c.dim}
                weight={600}
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ words
/**
 * Somebody else's words, with their name on them. This is the module that keeps
 * the documentary citable instead of assertive: the claim belongs to whoever
 * made it, and the frame says so.
 */
export const Quote: React.FC<CrimeSceneProps> = ({ beat }) => {
  const frame = useCurrentFrame();
  const { u, pad, width, height } = useStage();
  const text = beat.text || beat.vo;
  const t = ease(frame, 4, 22);
  return (
    <AbsoluteFill>
      <FilmBG />
      <Header beat={beat} frame={frame} />
      <div
        style={{
          position: "absolute",
          left: pad,
          top: height * 0.3,
          width: width - pad * 2,
          borderLeft: `${u * 4}px solid ${c.evidence}`,
          paddingLeft: u * 28,
          opacity: t,
          transform: `translateY(${(1 - t) * u * 14}px)`,
        }}
      >
        <div
          style={{
            fontFamily: c.font,
            fontWeight: 700,
            fontSize: u * (text.length > 120 ? 32 : text.length > 70 ? 40 : 50),
            lineHeight: 1.28,
            color: c.text,
          }}
        >
          “{text}”
        </div>
        <div style={{ height: u * 22 }} />
        <Mono
          text={(beat.source || "ATTRIBUTION NOT ESTABLISHED").toUpperCase()}
          size={u * 18}
          color={beat.source ? c.dim : c.evidence}
        />
      </div>
    </AbsoluteFill>
  );
};

/** Press coverage, as a clipping. What the papers said is a fact about the
 *  papers, not about the case, and staging it as newsprint keeps that clear. */
export const Headline: React.FC<CrimeSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { u, pad, width, height, wide } = useStage();
  const t = ease(frame, 4, 20);
  // A clipping is torn from a column, not from a billboard.
  const sheetW = wide ? width * 0.5 : width - pad * 2;
  return (
    <AbsoluteFill>
      <Imagery beat={beat} progress={ease(frame, 0, dur)} grade="archival" dim={0.6} />
      <Header beat={beat} frame={frame} color={c.amber} />
      <div style={{ position: "absolute", left: (width - sheetW) / 2, top: height * 0.3, width: sheetW }}>
        <Sheet progress={t} tilt={1.1} ruled={false}>
          <Mono text={(beat.source || "PRESS REPORT").toUpperCase()} size={u * 15} color="#6E6656" />
          <div style={{ height: u * 14 }} />
          <div
            style={{
              fontFamily: c.font,
              fontWeight: 800,
              fontSize: u * ((beat.text ?? "").length > 40 ? 42 : 56),
              lineHeight: 1.06,
              letterSpacing: -u * 1.4,
              textTransform: "uppercase",
              color: "#16191D",
            }}
          >
            {beat.text || beat.name}
          </div>
        </Sheet>
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ structure
/**
 * The case board: what connects to what, accumulated. Later board beats keep
 * every earlier node and add the new relationship, so the picture the viewer is
 * holding is the picture the investigation was holding.
 */
export const Board: React.FC<CrimeSceneProps> = ({ dur, beat, words }) => {
  const frame = useCurrentFrame();
  const { wide, u, pad, height } = useStage();
  const list = rows(beat);
  if (!list.length) return <Statement dur={dur} beat={beat} words={words} />;
  const spots = layout(list.length, wide);
  const nodes: Node[] = list.map((row, i) => ({
    label: row.label,
    sub: row.raw,
    ...spots[i],
  }));
  return (
    <AbsoluteFill>
      <FilmBG />
      <Header beat={beat} frame={frame} />
      <Diagram
        nodes={nodes}
        links={beat.links ?? []}
        progress={ease(frame, 6, Math.max(34, dur * 0.6))}
        accent={beat.accent ?? -1}
        round={false}
      />
      {beat.text ? (
        <div style={{ position: "absolute", left: pad, bottom: height * 0.13 }}>
          <Emphasis text={beat.text} enter={frame - 30} color={c.evidence} />
        </div>
      ) : null}
      <div style={{ position: "absolute", right: pad, top: pad * 0.8 }}>
        <Mono text={`${nodes.length} LINKED`} size={u * 15} color={c.dim} />
      </div>
    </AbsoluteFill>
  );
};

/**
 * Two things held against each other: two accounts, two timelines, two sets of
 * evidence. The frame is split because the comparison is the argument — putting
 * them one after another asks the viewer to hold the first in their head, and
 * they will not.
 */
export const Compare: React.FC<CrimeSceneProps> = ({ dur, beat, words }) => {
  const frame = useCurrentFrame();
  const { u, pad, width, height, wide } = useStage();
  const list = rows(beat);
  if (!list.length) return <Statement dur={dur} beat={beat} words={words} />;

  // A script marks its sides ("LEFT:" / "RIGHT:"). Where it did not, the rows
  // split down the middle, which is the only reading left.
  const marked = list.some((r) => r.side === "left" || r.side === "right");
  const half = Math.ceil(list.length / 2);
  const side = (row: Row, i: number) =>
    marked ? (row.side ?? "") : i < half ? "left" : "right";
  const columns = [
    list.filter((r, i) => side(r, i) === "left"),
    list.filter((r, i) => side(r, i) === "right"),
  ];
  const middle = marked ? list.filter((r) => !r.side) : [];

  return (
    <AbsoluteFill>
      <FilmBG />
      <Header beat={beat} frame={frame} />
      <div
        style={{
          position: "absolute",
          left: pad,
          top: height * 0.26,
          width: width - pad * 2,
          display: "flex",
          flexDirection: wide ? "row" : "column",
          alignItems: "stretch",
          gap: pad * 0.7,
        }}
      >
        {columns.map((column, side) => (
          <div
            key={side}
            style={{
              flex: 1,
              padding: u * 24,
              background: c.slate,
              borderTop: `${u * 3}px solid ${side ? c.evidence : c.surveil}`,
              display: "flex",
              flexDirection: "column",
              gap: u * 12,
            }}
          >
            {column.map((row, i) => {
              const t = ease(frame, 8 + i * 7 + side * 4, 24 + i * 7 + side * 4);
              return (
                <div key={i} style={{ opacity: t, transform: `translateY(${(1 - t) * u * 8}px)` }}>
                  <div
                    style={{
                      fontFamily: c.font,
                      fontWeight: i ? 600 : 800,
                      fontSize: u * (i ? 24 : 38),
                      lineHeight: 1.15,
                      color: i ? c.dim : side ? c.evidence : c.surveil,
                    }}
                  >
                    {row.label}
                  </div>
                  {row.raw ? <Body text={row.raw} size={u * 22} color={c.dim} /> : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {/* what sits between the two columns is usually the point of the frame */}
      {middle.length ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: height * (wide ? 0.72 : 0.82),
            width,
            display: "flex",
            justifyContent: "center",
            opacity: ease(frame, 30, 46),
          }}
        >
          <Emphasis
            text={middle.map((r) => r.label).join(" · ")}
            enter={frame - 30}
            color={c.evidence}
            align="center"
          />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * The reveal. The frame empties, the words land one at a time on the read, and
 * the audio director holds a beat of silence in front of it — the pause is what
 * makes it a reveal; the type is just where the eye goes.
 */
export const Reveal: React.FC<CrimeSceneProps> = ({ beat, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { u, height } = useStage();
  return (
    <AbsoluteFill>
      <FilmBG />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 50% 40% at 50% 46%, ${c.evidence}14 0%, transparent 70%)` }} />
      <Stage align="center" justify="center">
        <div style={{ height: height * 0.02 }} />
        <KineticText words={words} t={frame / fps} mode="hero" palette={CRIME_TYPE} />
        {beat.text ? (
          <div style={{ opacity: ease(frame, 40, 60), marginTop: u * 20 }}>
            <Mono text={beat.text.toUpperCase()} size={u * 22} color={c.evidence} />
          </div>
        ) : null}
      </Stage>
    </AbsoluteFill>
  );
};

/** Where the case stands today: charges, verdict, or that it is still open.
 *  A documentary that ends without this leaves the viewer holding nothing. */
export const Status: React.FC<CrimeSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { u, pad, width, height } = useStage();
  const list = rows(beat);
  const t = ease(frame, 4, 22);
  return (
    <AbsoluteFill>
      <Imagery beat={beat} progress={ease(frame, 0, dur)} dim={0.68} />
      <div
        style={{
          position: "absolute",
          left: pad,
          top: height * 0.3,
          width: width - pad * 2,
          opacity: t,
        }}
      >
        <Mono text="CASE STATUS" size={u * 18} color={c.dim} />
        <div style={{ height: u * 16 }} />
        <Emphasis text={beat.text || beat.name} enter={frame - 8} color={c.evidence} />
        <div style={{ height: u * 24 }} />
        {list.map((row, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: u * 16,
              alignItems: "baseline",
              padding: `${u * 10}px 0`,
              borderTop: `${u * 1}px solid ${c.rule}`,
              opacity: ease(frame, 20 + i * 8, 34 + i * 8),
            }}
          >
            <Mono text={row.label.toUpperCase()} size={u * 18} color={c.surveil} />
            <Body text={row.raw} size={u * 22} color={c.dim} weight={600} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/**
 * The fallback: imagery, one line of type, nothing else. Also the honest answer
 * when a beat is narration a module cannot improve on — most of a documentary
 * is somebody talking over a picture, and pretending otherwise is what makes
 * generated video feel restless.
 */
export const Statement: React.FC<CrimeSceneProps> = ({ dur, beat, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { pad, width, height } = useStage();
  // Nothing to show and nothing to look at. Rather than hold a near-black frame
  // for ten seconds, the line being spoken carries it — the one place in the
  // long form where the narration is allowed on screen.
  const bare = !beat.text && !hasAsset(beat.n);
  return (
    <AbsoluteFill>
      <Imagery beat={beat} progress={ease(frame, 0, dur)} dim={0.45} />
      <Header beat={beat} frame={frame} />
      {beat.text ? (
        <div style={{ position: "absolute", left: pad, bottom: height * 0.16 }}>
          <Emphasis text={beat.text} enter={frame - 10} />
        </div>
      ) : null}
      {beat.text ? (
        <Annotate beat={beat} text={beat.text} left={pad} bottom={height * 0.16} dur={dur} />
      ) : bare ? (
        <div
          style={{
            position: "absolute",
            left: pad,
            right: pad,
            top: height * 0.42,
            width: width - pad * 2,
          }}
        >
          <KineticText
            words={words}
            t={frame / fps}
            mode="caption"
            palette={CRIME_TYPE}
          />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** Archival material — older than the case, and graded to say so. */
export const Archival: React.FC<CrimeSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { pad, height } = useStage();
  return (
    <AbsoluteFill>
      <Plate beat={beat.n} progress={ease(frame, 0, dur)} grade="archival" dim={0.4} />
      {hasAsset(beat.n) ? <ProvenanceTag kind={prov(beat)} /> : null}
      <Header beat={beat} frame={frame} color={c.amber} />
      {beat.text ? (
        <div style={{ position: "absolute", left: pad, bottom: height * 0.16 }}>
          <Emphasis text={beat.text} enter={frame - 10} color={c.amber} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ explainer
// The vox layer, re-dressed for the investigation room: hand-drawn marks, icon
// cards, an ink chart, one number. Same primitives as vox/scenes.tsx — only the
// ink changes, because a mechanism explained on dark film is still a mechanism.

/** The chart's ink, on film instead of paper. */
const CHART_INK = {
  ink: c.text,
  accent: c.evidence,
  rule: c.rule,
  muted: c.dim,
  font: c.font,
};

/**
 * The hand-drawn annotation over a headline. There are no text metrics at
 * render time, so the box is estimated the way vox/scenes.tsx does: uppercase
 * Archivo 800 runs about 0.55em per glyph, and a hand-drawn mark is forgiving
 * by design.
 */
const Annotate: React.FC<{
  beat: CrimeBeat;
  text: string;
  left: number;
  bottom: number;
  dur: number;
  maxChars?: number;
}> = ({ beat, text, left, bottom, dur, maxChars = 26 }) => {
  const frame = useCurrentFrame();
  const { u, width, height, pad } = useStage();
  if (!beat.shape || !text) return null;
  const size =
    u * (text.length > maxChars * 1.8 ? 44 : text.length > maxChars ? 58 : 76);
  const maxW = width - pad * 2;
  const runW = text.length * size * 0.55;
  const lines = Math.max(1, Math.ceil(runW / maxW));
  const w = Math.min(maxW, runW);
  const h = lines * size * 1.02;
  const y = height - bottom - h;
  const shape = beat.shape as Shape;
  const grow = shape === "circle" || shape === "box";
  const progress = ease(frame, dur * 0.35, dur * 0.68);
  return shape === "highlight" ? (
    <Marker x={left} y={y} w={w} h={h} color={c.evidence} seed={beat.n * 13} progress={progress} />
  ) : (
    <DrawIn
      shape={shape}
      x={left - (grow ? u * 26 : 0)}
      y={y - (grow ? size * 0.18 : 0)}
      w={w + (grow ? u * 52 : 0)}
      h={h + (grow ? size * 0.36 : size * 0.06)}
      color={c.evidence}
      strokeWidth={u * 5}
      seed={beat.n * 13}
      progress={progress}
    />
  );
};

/** The hook and the payoff: words fill the frame and land as spoken. Reveal
 *  without the silence — the loud sibling, for lines that carry the story
 *  forward rather than turn it. */
export const Kinetic: React.FC<CrimeSceneProps> = ({ dur, beat, words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Imagery beat={beat} progress={ease(frame, 0, dur)} dim={0.62} />
      <Header beat={beat} frame={frame} />
      <Stage align="center" justify="center">
        <KineticText words={words} t={frame / fps} mode="hero" palette={CRIME_TYPE} />
      </Stage>
    </AbsoluteFill>
  );
};

/** Mechanism steps as cards — "here is how the metadata actually worked."
 *  Wiped in, not faded: a card that fades looks like it is loading, one that
 *  wipes looks like it is being laid down. */
export const IconSteps: React.FC<CrimeSceneProps> = ({ dur, beat, words }) => {
  const frame = useCurrentFrame();
  const { u, pad, wide } = useStage();
  const steps = beat.icons ?? [];
  if (!steps.length) return <Statement dur={dur} beat={beat} words={words} />;
  const glyph = u * (wide ? 120 : 96);

  return (
    <AbsoluteFill>
      <FilmBG />
      <Header beat={beat} frame={frame} />
      <Stage align="flex-start" justify="center">
        {beat.text ? <Emphasis text={beat.text} enter={frame - 6} maxChars={34} /> : null}
        <div
          style={{
            display: "flex",
            flexDirection: wide ? "row" : "column",
            gap: pad * 0.5,
            width: "100%",
          }}
        >
          {steps.map((step, i) => {
            const at = 10 + i * 9;
            const s = ease(frame, at, at + 12);
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: wide ? "column" : "row",
                  alignItems: wide ? "flex-start" : "center",
                  gap: u * 26,
                  padding: u * 30,
                  background: c.slate,
                  border: `${u * 1.5}px solid ${c.rule}`,
                  borderTop: `${u * 4}px solid ${c.surveil}`,
                  clipPath: `inset(0 ${(1 - s) * 100}% 0 0)`,
                  transform: `translateY(${(1 - s) * u * 14}px)`,
                }}
              >
                <LineIcon name={step.icon} size={glyph} color={c.surveil} stroke={1.4} />
                <div>
                  <Mono text={`0${i + 1}`} size={u * 15} color={c.dim} />
                  <div
                    style={{
                      marginTop: u * 6,
                      fontFamily: c.font,
                      fontWeight: 700,
                      fontSize: u * (wide ? 27 : 30),
                      lineHeight: 1.16,
                      color: c.text,
                    }}
                  >
                    {step.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Stage>
    </AbsoluteFill>
  );
};

/** The number that carries the case, drawn as a line on film. `value` is the
 *  measure, `label` marks the point — years, victims, letters. */
export const Chart: React.FC<CrimeSceneProps> = ({ dur, beat, words }) => {
  const frame = useCurrentFrame();
  const { u, pad, width, height } = useStage();
  const list = rows(beat);
  if (list.length < 2) return <Statement dur={dur} beat={beat} words={words} />;
  const w = width - pad * 2;
  const h = height * 0.34;
  return (
    <AbsoluteFill>
      <FilmBG />
      <Header beat={beat} frame={frame} />
      <Stage align="flex-start" justify="center">
        {beat.text ? <Emphasis text={beat.text} enter={frame - 6} maxChars={34} /> : null}
        <div style={{ position: "relative", width: w, height: h + u * 70 }}>
          <InkChart
            data={list.map((r) => r.value)}
            labels={list.map((r) => r.label)}
            x={0}
            y={0}
            w={w}
            h={h}
            colors={CHART_INK}
            progress={ease(frame, 12, Math.max(30, dur - 14))}
          />
        </div>
      </Stage>
    </AbsoluteFill>
  );
};

/** One number, alone, rolling up as it is read. The label arrives once the
 *  number has finished being a surprise. */
export const Stat: React.FC<CrimeSceneProps> = ({ dur, beat, words }) => {
  const frame = useCurrentFrame();
  const { u, pad, width, height } = useStage();
  const row = rows(beat)[0];
  if (!row) return <Statement dur={dur} beat={beat} words={words} />;
  // "31 — YEARS OF SILENCE" puts the number in the label; "YEARS — 31" in the
  // value. Take whichever side actually holds one.
  const value = row.value || Number(row.label.replace(/[^\d.-]/g, "")) || 0;
  const caption = row.value ? row.label : row.raw || row.label;
  const { prefix, suffix } = affix(row.value ? row.raw : "");
  const roll = ease(frame, 8, dur * 0.5);
  const shown = num(value * roll, prefix, suffix);
  const size = u * (shown.length > 8 ? 200 : 260);
  const runW = shown.length * size * 0.56;
  const top = height * 0.42 - size * 0.5;
  return (
    <AbsoluteFill>
      <FilmBG />
      <Header beat={beat} frame={frame} />
      <div
        style={{
          position: "absolute",
          left: pad,
          top,
          width: width - pad * 2,
          textAlign: "center",
          fontFamily: c.font,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1,
          letterSpacing: -size * 0.035,
          color: c.evidence,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {shown}
      </div>
      <div
        style={{
          position: "absolute",
          left: pad,
          top: top + size * 1.22,
          width: width - pad * 2,
          textAlign: "center",
          opacity: ease(frame, dur * 0.45, dur * 0.62),
        }}
      >
        <Mono text={caption.toUpperCase()} size={u * 26} color={c.text} />
      </div>
      <DrawIn
        shape="underline"
        x={(width - Math.min(width - pad * 2, runW)) / 2}
        y={top}
        w={Math.min(width - pad * 2, runW)}
        h={size * 1.06}
        color={c.evidence}
        strokeWidth={u * 6}
        seed={beat.n * 23}
        progress={ease(frame, dur * 0.52, dur * 0.74)}
      />
    </AbsoluteFill>
  );
};

export const CRIME_MODULES: Record<string, React.FC<CrimeSceneProps>> = {
  caseOpen: CaseOpen,
  chapter: Chapter,
  clock: Clock,
  timeline: Timeline,
  map: Map,
  person: Person,
  evidence: Evidence,
  document: Document,
  redacted: Redacted,
  cctv: CCTV,
  phone: PhoneRecord,
  quote: Quote,
  headline: Headline,
  board: Board,
  compare: Compare,
  reveal: Reveal,
  status: Status,
  archival: Archival,
  statement: Statement,
  kinetic: Kinetic,
  icon: IconSteps,
  chart: Chart,
  stat: Stat,
};

/** Which visual mode each module belongs to. The QC in parse-story.mjs uses
 *  this to catch a documentary that has stopped changing shape. */
export const VISUAL_MODE: Record<string, string> = {
  caseOpen: "photo",
  chapter: "text",
  clock: "time",
  timeline: "timeline",
  map: "map",
  person: "photo",
  evidence: "diagram",
  document: "document",
  redacted: "document",
  cctv: "surveillance",
  phone: "communication",
  quote: "text",
  headline: "archival",
  board: "case_board",
  compare: "diagram",
  reveal: "text",
  status: "text",
  archival: "archival",
  statement: "photo",
  kinetic: "text",
  icon: "icons",
  chart: "chart",
  stat: "number",
};

/**
 * Camera intention -> the actual move, as [start scale, end scale].
 *
 * A documentary camera moves because the story moved. These are all small: the
 * largest is a 7% push, because a still photograph that travels further than
 * that stops being a document of something and becomes a screensaver.
 */
export const CRIME_CAMERA: Record<string, [number, number]> = {
  observe: [1.0, 1.015],
  investigate: [1.0, 1.055],
  follow: [1.03, 1.0],
  search: [1.045, 1.0],
  connect: [1.0, 1.025],
  isolate: [1.0, 1.07],
  reveal: [1.02, 1.0],
  shock: [1.06, 1.02],
  reflect: [1.035, 1.0],
};
