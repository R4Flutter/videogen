import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { EASE_ARRIVE } from "../utils/easing";
import { progressive, springProgress, useSceneInOut } from "../utils/animation";
import { Camera2D } from "../components/Camera2D";
import { useDirector } from "../data/director";
import { Backdrop } from "../components/Backdrop";
import { useScene } from "../StoryContext";
import { COLORS, FONT, WEIGHT, withAlpha } from "../theme";
import type { DocumentData } from "../data/storyTypes";

// Paper document beats: bank statements (rows staggering in on ticks),
// contracts / court filings (ruled body with a gold highlight), and
// calendars (a circled day). Spec: the V2 engine's paper compositions
// (engine/scenes/*.mjs) — same cream/ink/green/gold editorial look.

const PAGE_L = { x: 360, y: 150, w: 1200, h: 810, headerY: 248, rowsY: 360 };
const PAGE_P = { x: 90, y: 260, w: 900, h: 1240, headerY: 380, rowsY: 500 };

export const DocumentScene: React.FC = () => {
  const { data, durationInFrames, at } = useScene("document");
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const { opacity, scale } = useSceneInOut(frame, durationInFrames, {
    fadeIn: 8,
    entranceScale: 1.02,
  });
  const CAMERA = useDirector().keyframes;
  const PAGE = portrait ? PAGE_P : PAGE_L;

  const kickerP = progressive(frame, at(0.05), at(0.16) - at(0.05), EASE_ARRIVE);
  const pageP = springProgress(frame, fps, { delay: at(0.1), damping: 14, stiffness: 130 });

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${scale})` }}>
      <Backdrop scene="document" />
      <Camera2D keyframes={CAMERA}>
        <KickerRow progress={kickerP} label={data.kicker} x={portrait ? undefined : 84} top={portrait ? 150 : 84} portrait={portrait} />

        <div
          style={{
            position: "absolute",
            left: PAGE.x,
            top: PAGE.y,
            width: PAGE.w,
            height: PAGE.h,
            opacity: Math.min(1, pageP * 1.6),
            transform: `scale(${0.96 + pageP * 0.04})`,
          }}
        >
          {/* page shadow + paper */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 18,
              background: "rgba(0,0,0,0.18)",
              transform: "translateY(14px)",
              filter: "blur(10px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 18,
              background: COLORS.panel,
              border: `1px solid ${COLORS.lineStrong}`,
              overflow: "hidden",
            }}
          >
            {data.docType === "statement" ? (
              <StatementPage data={data} page={PAGE} frame={frame} fps={fps} at={at} />
            ) : data.docType === "calendar" ? (
              <CalendarPage data={data} page={PAGE} frame={frame} fps={fps} at={at} />
            ) : (
              <FilingPage data={data} page={PAGE} frame={frame} fps={fps} at={at} />
            )}
          </div>

          {data.stamp ? (
            <StampMark label={data.stamp} color={data.stampColor ?? COLORS.red} page={PAGE} frame={frame} fps={fps} at={at} />
          ) : null}
        </div>

        {data.footnote ? (
          <span
            style={{
              position: "absolute",
              left: portrait ? 0 : 0,
              right: 0,
              top: portrait ? 1580 : 950,
              fontFamily: FONT.body,
              fontSize: portrait ? 26 : 18,
              letterSpacing: "0.28em",
              color: COLORS.muted,
              textAlign: "center",
              opacity: progressive(frame, at(0.8), at(0.92) - at(0.8), EASE_ARRIVE),
            }}
          >
            {data.footnote}
          </span>
        ) : null}
      </Camera2D>
    </AbsoluteFill>
  );
};

const KickerRow: React.FC<{
  progress: number;
  label: string;
  x?: number;
  top: number;
  portrait: boolean;
}> = ({ progress, label, x, top, portrait }) => (
  <div
    style={
      portrait
        ? {
            position: "absolute",
            left: 0,
            right: 0,
            top,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            opacity: progress,
            transform: `translateX(${(1 - progress) * -16}px)`,
          }
        : {
            position: "absolute",
            left: x,
            top,
            display: "flex",
            alignItems: "center",
            gap: 14,
            opacity: progress,
            transform: `translateX(${(1 - progress) * -16}px)`,
          }
    }
  >
    <div style={{ width: 42, height: 5, borderRadius: 3, background: COLORS.red }} />
    <span
      style={{
        fontFamily: FONT.headline,
        fontWeight: WEIGHT.bold,
        fontSize: portrait ? 26 : 26,
        letterSpacing: "0.34em",
        color: COLORS.textSecondary,
      }}
    >
      {label}
    </span>
  </div>
);

// ---------------------------------------------------------------- statement

const StatementPage: React.FC<{
  data: DocumentData;
  page: typeof PAGE_L;
  frame: number;
  fps: number;
  at: (p: number) => number;
}> = ({ data, page, frame, at }) => {
  const rows = data.rows ?? [];
  const portrait = page === PAGE_P;
  const rowH = portrait ? 86 : 62;
  const stagger = Math.min(0.09, 0.55 / Math.max(1, rows.length));
  const totalP = progressive(frame, at(0.78), at(0.9) - at(0.78), EASE_ARRIVE);

  return (
    <div style={{ position: "absolute", inset: 0, padding: portrait ? 56 : 60 }}>
      <div
        style={{
          fontFamily: FONT.body,
          fontWeight: WEIGHT.bold,
          fontSize: 30,
          color: COLORS.textPrimary,
          letterSpacing: "0.06em",
        }}
      >
        {data.header ?? "MONTHLY STATEMENT"}
      </div>
      <div
        style={{
          fontFamily: FONT.body,
          fontSize: 24,
          color: COLORS.muted,
          letterSpacing: "0.2em",
          marginTop: 6,
        }}
      >
        {data.subheader ?? ""}
      </div>
      <div
        style={{
          marginTop: 18,
          height: 2,
          background: COLORS.lineStrong,
        }}
      />

      <div style={{ marginTop: 26 }}>
        {rows.map((r, i) => {
          const p = progressive(frame, at(0.14 + i * stagger), at(0.12), EASE_ARRIVE);
          return (
            <div
              key={i}
              style={{
                position: "relative",
                height: rowH,
                opacity: p,
                transform: `translateX(${(1 - p) * -24}px)`,
              }}
            >
              {r.recurring ? (
                <div
                  style={{
                    position: "absolute",
                    inset: "2px -12px",
                    borderRadius: 10,
                    background: withAlpha(COLORS.red, 0.08),
                  }}
                />
              ) : null}
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  height: "100%",
                  gap: 28,
                  borderBottom: `1px solid ${COLORS.line}`,
                }}
              >
                <span
                  style={{
                    fontFamily: FONT.body,
                    fontSize: 22,
                    color: COLORS.muted,
                    width: portrait ? 150 : 190,
                    letterSpacing: "0.08em",
                  }}
                >
                  {r.date ?? ""}
                </span>
                <span
                  style={{
                    fontFamily: FONT.body,
                    fontWeight: WEIGHT.medium,
                    fontSize: 26,
                    color: COLORS.textPrimary,
                    flex: 1,
                    letterSpacing: "0.04em",
                  }}
                >
                  {r.name}
                </span>
                {r.recurring ? (
                  <span
                    style={{
                      fontFamily: FONT.body,
                      fontWeight: WEIGHT.bold,
                      fontSize: 18,
                      color: COLORS.red,
                      letterSpacing: "0.24em",
                    }}
                  >
                    RECURRING
                  </span>
                ) : null}
                <span
                  style={{
                    fontFamily: FONT.body,
                    fontWeight: WEIGHT.bold,
                    fontSize: 26,
                    color: r.recurring ? COLORS.red : COLORS.textPrimary,
                    width: portrait ? 180 : 200,
                    textAlign: "right",
                    letterSpacing: "0.04em",
                  }}
                >
                  {r.amount}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: portrait ? 56 : 60,
          right: portrait ? 56 : 60,
          bottom: 46,
        }}
      >
        <div style={{ height: 2, background: COLORS.textPrimary, marginBottom: 18 }} />
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <span
            style={{
              fontFamily: FONT.body,
              fontSize: 24,
              color: COLORS.muted,
              letterSpacing: "0.24em",
              opacity: totalP,
            }}
          >
            {data.totalLabel ?? "RECURRING TOTAL"}
          </span>
          <span
            style={{
              fontFamily: FONT.headline,
              fontWeight: WEIGHT.black,
              fontSize: portrait ? 72 : 56,
              color: COLORS.red,
              opacity: totalP,
              transform: `scale(${0.9 + totalP * 0.1})`,
            }}
          >
            {data.totalValue ?? ""}
          </span>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- calendar

const CalendarPage: React.FC<{
  data: DocumentData;
  page: typeof PAGE_L;
  frame: number;
  fps: number;
  at: (p: number) => number;
}> = ({ data, page, frame, fps, at }) => {
  const day = data.day ?? 1;
  const portrait = page === PAGE_P;
  const dayP = springProgress(frame, fps, { delay: at(0.32), damping: 11, stiffness: 140 });
  const cells: React.ReactNode[] = [];
  const cellW = (page.w - (portrait ? 112 : 120)) / 6;
  const cellH = page === PAGE_P ? 240 : 150;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 6; c++) {
      const n = r * 6 + c + 1;
      const isDay = n === day;
      cells.push(
        <div
          key={n}
          style={{
            width: cellW - 10,
            height: cellH - 10,
            borderRadius: 12,
            border: isDay
              ? `4px solid ${COLORS.gold}`
              : `1px solid ${COLORS.line}`,
            background: isDay ? withAlpha(COLORS.gold, 0.12) : COLORS.panel,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isDay ? (
            <span
              style={{
                fontFamily: FONT.headline,
                fontWeight: WEIGHT.black,
                fontSize: page === PAGE_P ? 84 : 46,
                color: COLORS.gold,
                transform: `scale(${0.7 + dayP * 0.3})`,
                opacity: Math.min(1, dayP * 1.4),
              }}
            >
              {n}
            </span>
          ) : null}
        </div>,
      );
    }
  }
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: portrait ? 56 : 60,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontFamily: FONT.body,
          fontWeight: WEIGHT.bold,
          fontSize: 30,
          color: COLORS.textPrimary,
          letterSpacing: "0.06em",
        }}
      >
        {data.month ?? ""}
      </div>
      <div style={{ marginTop: 18, height: 2, background: COLORS.lineStrong }} />
      <div style={{ display: "flex", flexWrap: "wrap", marginTop: 22, gap: 10 }}>{cells}</div>
      <div style={{ flex: 1 }} />
      {data.header ? (
        <div
          style={{
            fontFamily: FONT.body,
            fontWeight: WEIGHT.bold,
            fontSize: page === PAGE_P ? 40 : 30,
            color: COLORS.textPrimary,
            letterSpacing: "0.02em",
            opacity: progressive(frame, at(0.75), at(0.88) - at(0.75)),
          }}
        >
          {data.header}
        </div>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------- contract / filing

const FilingPage: React.FC<{
  data: DocumentData;
  page: typeof PAGE_L;
  frame: number;
  fps: number;
  at: (p: number) => number;
}> = ({ data, page, frame, at }) => {
  const body = data.body ?? [];
  const portrait = page === PAGE_P;
  const ruleH = portrait ? 26 : 20;
  const gap = page === PAGE_P ? 22 : 16;
  const hlIndex = body.length >= 3 ? Math.max(2, Math.floor(body.length * 0.72)) : -1;
  const p = progressive(frame, at(0.2), at(0.6) - at(0.2));
  const hlP = progressive(frame, at(0.62), at(0.75) - at(0.62), EASE_ARRIVE);
  const pattern = [1, 0.92, 0.86, 0.72, 1, 0.84, 0.94, 0.76];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        padding: portrait ? 56 : 60,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontFamily: FONT.body,
          fontWeight: WEIGHT.bold,
          fontSize: 30,
          color: COLORS.textPrimary,
          letterSpacing: "0.06em",
        }}
      >
        {data.header ?? ""}
      </div>
      <div style={{ marginTop: 18, height: 2, background: COLORS.lineStrong }} />
      <div style={{ marginTop: 30, position: "relative" }}>
        {body.map((line, i) => {
          const w = pattern[i % pattern.length];
          const isHl = i === hlIndex;
          return (
            <div key={i} style={{ marginBottom: gap }}>
              {isHl ? (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: i * (ruleH + gap),
                    width: `${w * 100}%`,
                    height: ruleH,
                    background: withAlpha(COLORS.gold, 0.55),
                    borderRadius: 3,
                    opacity: hlP,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: `${w * 100}%`,
                    height: ruleH,
                    borderRadius: 3,
                    background: COLORS.dot,
                    opacity: Math.min(1, p * 1.6 - 0.2),
                    transform: `translateY(${(1 - p) * 18}px)`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1 }} />
      <div
        style={{
          fontFamily: FONT.body,
          fontSize: page === PAGE_P ? 30 : 24,
          color: COLORS.muted,
          letterSpacing: "0.24em",
          textAlign: "center",
          opacity: progressive(frame, at(0.82), at(0.92) - at(0.82)),
        }}
      >
        {data.subheader ?? "· · ·"}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- stamp

const StampMark: React.FC<{
  label: string;
  color: string;
  page: typeof PAGE_L;
  frame: number;
  fps: number;
  at: (p: number) => number;
}> = ({ label, color, page, frame, fps, at }) => {
  const p = springProgress(frame, fps, { delay: at(0.84), damping: 10, stiffness: 170 });
  const size = page === PAGE_P ? 150 : 92;
  const cx = page.x + page.w * 0.72;
  const cy = page.y + page.h * 0.36;
  const w = label.length * size * 0.62 + size;
  return (
    <div
      style={{
        position: "absolute",
        left: cx - w / 2,
        top: cy - size * 0.75,
        width: w,
        height: size * 1.5,
        borderRadius: 16,
        border: `10px solid ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: Math.min(1, p * 1.4),
        transform: `rotate(-12deg) scale(${0.6 + p * 0.4})`,
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          fontFamily: FONT.headline,
          fontWeight: WEIGHT.black,
          fontSize: size * 0.82,
          color,
          letterSpacing: "0.12em",
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
};