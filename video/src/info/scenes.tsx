// One module per beat. The director (script.json, written by parse-info.mjs)
// picks which one runs when; each owns its own staging. An infographic
// never writes JSX — it writes a beat with a module name, so a second
// explainer costs an info.txt and nothing else.
import React from "react";
import { Easing, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import {
  BossFigure,
  CAST,
  Chip,
  CounterRoll,
  Figure,
  Kicker,
  NameTag,
  Path,
  Pin,
  ease,
  qbez,
  useStage,
} from "./elements";

const c = theme.info;

/** A row a beat carries: "MAYA — NEW YORK" parses to the same shape here. */
export type InfoRow = { label: string; raw: string; value: number };

export type InfoBeat = {
  n: number;
  name: string;
  chapter: string;
  module: string;
  start: number;
  end: number;
  vo: string;
  text?: string;
  cues?: string[];
  data?: InfoRow[];
  accent?: number;
  sfx?: string[];
  intensity?: number;
  track?: string;
};

export type InfoSceneProps = { dur: number; beat: InfoBeat };

/** Where each city sits on the board, as canvas fractions. The boss is the
 *  centre everything travels toward. */
const CITY_SPOT: Record<string, [number, number]> = {
  "NEW YORK": [0.16, 0.32],
  "LONDON": [0.16, 0.72],
  "TOKYO": [0.84, 0.32],
  "MUMBAI": [0.84, 0.72],
  "SYDNEY": [0.5, 0.9],
};

const BOSS: [number, number] = [0.5, 0.42];
const spotOf = (city: string, i: number): [number, number] =>
  CITY_SPOT[city.toUpperCase()] ?? [0.2 + (i % 3) * 0.3, 0.6 + Math.floor(i / 3) * 0.2];

/** Where the i-th arrival stands beside the boss: three to the left, then a
 *  second row beneath them, so five people never spill off the board. */
const slotOf = (i: number, width: number, height: number, u: number): [number, number] => {
  const fx = BOSS[0] * width - ((i % 3) + 1) * 150 * u;
  const fy = BOSS[1] * height + (i >= 3 ? 120 * u : 0);
  return [fx, fy];
};

// ------------------------------------------------------------------ chrome
const ProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  const { width, u } = useStage();
  const p = Math.max(0, Math.min(1, progress));
  return (
    <div
      style={{
        position: "absolute",
        bottom: u * 36,
        left: width * 0.5,
        transform: "translateX(-50%)",
        width: width * 0.5,
        height: u * 4,
        borderRadius: u * 2,
        background: c.rule,
      }}
    >
      <div
        style={{
          width: `${p * 100}%`,
          height: "100%",
          borderRadius: u * 2,
          background: c.accent,
        }}
      />
    </div>
  );
};

const BottomMeter: React.FC<{ n: number; total: number }> = ({ n, total }) => {
  const { width, u } = useStage();
  return (
    <div style={{ position: "absolute", right: width * 0.05, bottom: u * 28 }}>
      <CounterRoll value={n} label={`/ ${total} AT THE TABLE`} progress={1} big={false} color={c.ink} />
    </div>
  );
};

// ------------------------------------------------------------------ title
/**
 * The cold open: the pill headline, the stakes as chips, the boss waiting.
 */
const TitleCard: React.FC<InfoSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { width, height, u } = useStage();
  const headline = (beat.cues?.[0] ?? beat.text ?? "THE TITLE").toUpperCase();
  const stake = beat.cues?.[1] ?? "";
  const chips = stake
    .split(/\s+[—–-]\s+|\s+,\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const size = headline.length > 18 ? u * 78 : u * 104;
  const total = beat.data?.length || chips.length || 5;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Kicker text={beat.chapter || "THE SETUP"} enter={2} />
      <div
        style={{
          position: "absolute",
          left: width * 0.5,
          top: height * 0.36,
          transform: "translate(-50%,-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: u * 14,
          opacity: ease(frame, 8, 30),
        }}
      >
        <div
          style={{
            fontFamily: c.font,
            fontWeight: 800,
            fontSize: size,
            lineHeight: 0.98,
            letterSpacing: -size * 0.02,
            textTransform: "uppercase",
            textAlign: "center",
            color: c.ink,
          }}
        >
          {headline}
        </div>
        {chips.length ? (
          <div style={{ display: "flex", gap: u * 12 }}>
            {chips.map((chip, i) => (
              <Chip
                key={chip}
                text={chip}
                enter={38 + i * 7}
                color={i === chips.length - 1 ? c.boss : c.panelLine}
              />
            ))}
          </div>
        ) : null}
      </div>
      <BossFigure x={BOSS[0] * width} y={BOSS[1] * height} s={1.35} />
      <ProgressBar progress={frame / dur} />
      <BottomMeter n={0} total={total} />
    </div>
  );
};

// ------------------------------------------------------------------ travel
/**
 * One character per beat flies in from their city along an arc to the boss.
 * The rows the script wrote arrive in order: the newest (accent) is mid-arc
 * with a name tag riding along, everyone before it is standing in the row
 * beside the boss. The paths and the meter are the memory — the episode
 * accumulates, it never resets.
 */
const TravelBeat: React.FC<InfoSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { width, height, u } = useStage();
  const { fps } = useVideoConfig();
  const rows = beat.data ?? [];
  const accent = Math.min(beat.accent ?? 0, rows.length - 1);
  const active = rows[accent];
  const fy = (frac: number) => frac * height;
  const to: [number, number] = [BOSS[0] * width, fy(BOSS[1])];

  // The walk: leaves at 14% of the beat, lands at 80% — the first moments and
  // the last belong to the statement.
  const walk = ease(frame, dur * 0.14 * fps, dur * 0.8 * fps, [0, 1]);
  const eased = Easing.inOut(Easing.cubic)(Math.max(0, Math.min(1, walk)));
  const arrived = walk >= 1;

  const color = CAST[accent % CAST.length];

  // Arc control point bulges above the straight line.
  const arc = (from: [number, number]): [number, number, [number, number]] => {
    const mid = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
    const ctrl: [number, number] = [mid[0], Math.min(from[1], to[1]) - height * 0.12];
    return [from[0], from[1], ctrl];
  };

  const here = active
    ? (() => {
        const from: [number, number] = [spotOf(active.raw, accent)[0] * width, fy(spotOf(active.raw, accent)[1])];
        const [fx, fym, ctrl] = arc(from);
        return qbez([fx, fym], ctrl, to, eased);
      })()
    : null;

  const pop = spring({
    frame: frame - dur * 0.82 * fps,
    fps,
    config: { damping: 13, mass: 0.7, stiffness: 170 },
  });

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* the board is always there: every city, every face */}
      {rows.map((row, i) => {
        const spot = spotOf(row.raw, i);
        return (
          <Pin
            key={row.raw}
            x={spot[0] * width}
            y={fy(spot[1])}
            label={row.raw}
            enter={i * 4 + 3}
            color={CAST[i % CAST.length]}
          />
        );
      })}

      {/* every path ever walked, then the live one drawing itself */}
      {rows.map((row, i) => {
        const spot = spotOf(row.raw, i);
        const done = i < accent;
        return (
          <Path
            key={row.raw}
            from={[spot[0] * width, fy(spot[1])]}
            to={to}
            progress={done ? 1 : i === accent ? eased : 0}
            color={CAST[i % CAST.length]}
            width={5}
          />
        );
      })}

      {/* the boss holds the centre */}
      <BossFigure x={BOSS[0] * width} y={fy(BOSS[1])} />

      {/* the row beside the boss, filled in arrival order */}
      {rows.slice(0, accent).map((row, i) => (
        <Figure
          key={row.label}
          x={slotOf(i, width, height, u)[0]}
          y={slotOf(i, width, height, u)[1]}
          color={CAST[i % CAST.length]}
          s={0.8}
          bob={false}
        />
      ))}

      {active && here ? (
        arrived ? (
          <Figure
            x={slotOf(accent, width, height, u)[0]}
            y={slotOf(accent, width, height, u)[1]}
            color={color}
            s={0.8 * (1 + pop * 0.15)}
            bob={false}
          />
        ) : (
          <>
            <Figure x={here[0]} y={here[1]} color={color} s={0.8} />
            <NameTag x={here[0]} y={here[1]} text={active.label} color={color} t={walk} />
          </>
        )
      ) : null}

      <Kicker text={beat.chapter || "ON THE WAY"} enter={2} color={color} />
      <BottomMeter n={accent + 1} total={rows.length} />
    </div>
  );
};

// ------------------------------------------------------------------ counter
const CounterBeat: React.FC<InfoSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { width, height } = useStage();
  const { fps } = useVideoConfig();
  const rows = beat.data ?? [];
  const row = rows[beat.accent ?? 0] ?? { value: 0, raw: beat.text ?? "" };
  const t = ease(frame, dur * 0.1 * fps, dur * 0.75 * fps, [0, 1]);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Kicker text={beat.chapter || "THE NUMBER"} enter={2} />
      <div
        style={{
          position: "absolute",
          left: width * 0.5,
          top: height * 0.45,
          transform: "translate(-50%,-50%)",
          textAlign: "center",
        }}
      >
        <CounterRoll value={row.value} label={row.raw} progress={t} />
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ call
const CallBeat: React.FC<InfoSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { width, u } = useStage();
  const { fps } = useVideoConfig();
  const text = (beat.text ?? beat.cues?.[0] ?? "THE POINT").toUpperCase();
  const size = text.length > 16 ? u * 72 : u * 96;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Kicker text={beat.chapter || "THE POINT"} enter={2} />
      <div
        style={{
          position: "absolute",
          left: width * 0.5,
          top: "46%",
          transform: "translate(-50%,-50%)",
          fontFamily: c.font,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.02,
          letterSpacing: -size * 0.02,
          textAlign: "center",
          color: c.ink,
          opacity: ease(frame, dur * 0.2 * fps, dur * 0.5 * fps, [0, 1]),
        }}
      >
        {text}
      </div>
    </div>
  );
};

/** Everything an info episode can stage. A beat with a module that isn't here
 *  renders CallBeat rather than nothing — a script typo becomes a statement
 *  instead of a blank frame. */
export const INFO_MODULES: Record<string, React.FC<InfoSceneProps>> = {
  title: TitleCard,
  travel: TravelBeat,
  counter: CounterBeat,
  call: CallBeat,
};