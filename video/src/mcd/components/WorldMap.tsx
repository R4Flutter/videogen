import React, { useMemo } from "react";
import { interpolateColors, useCurrentFrame, useVideoConfig } from "remotion";
import { seededRandom } from "../utils/deterministicRandom";
import { springProgress } from "../utils/animation";
import { AnimatedPath } from "./AnimatedPath";
import { cubicPath, type CubicArc, type Pt } from "../utils/geometry";
import type { RegionId } from "../data/storyTypes";
import { useStory } from "../StoryContext";
import { COLORS, FONT, WEIGHT, withAlpha } from "../theme";

// Dot-matrix world map: continents are coarse polygons in grid-cell space;
// every land cell becomes a dot. Deterministic, vector, zero external assets.

export const GRID = { cols: 64, rows: 32, cell: 30, x0: 15, y0: 60 } as const;

export const cellToScreen = ([c, r]: [number, number]): Pt => ({
  x: GRID.x0 + c * GRID.cell + GRID.cell / 2,
  y: GRID.y0 + r * GRID.cell + GRID.cell / 2,
});

type Poly = [number, number][];

const POLYGONS: Record<RegionId, Poly[]> & { africa: Poly[] } = {
  northAmerica: [
    [
      [3, 3], [7, 1], [12, 1], [17, 1], [20, 2], [22, 4], [22, 7], [21, 10],
      [18, 12], [15, 13], [12, 14], [10, 13], [7, 11], [5, 9], [3, 6], [2, 3],
    ],
    [[23, 2], [26, 1], [27, 3], [26, 5], [23, 4]],
  ],
  southAmerica: [
    [
      [17, 15], [21, 14], [24, 15], [25, 17], [25, 20], [23, 24], [21, 27],
      [19, 29], [17, 28], [16, 25], [15, 21], [15, 18], [16, 16],
    ],
  ],
  europe: [
    [[29, 4], [32, 2], [35, 3], [37, 4], [38, 6], [36, 8], [33, 9], [30, 8], [28, 6]],
    [[28, 5], [30, 5], [30, 6.5], [28, 7]],
  ],
  middleEast: [
    [[36, 11], [38, 10], [40, 12], [41, 14], [41, 17], [39, 19], [37, 18], [36, 15]],
  ],
  africa: [
    [
      [29, 11], [33, 10], [36, 10], [38, 11], [39, 13], [39, 15], [38, 17],
      [35, 19], [33, 22], [31, 24], [29, 22], [28, 19], [27, 16], [27, 13],
    ],
  ],
  asia: [
    [
      [37, 3], [40, 2], [46, 2], [52, 3], [58, 3], [61, 6], [62, 9], [61, 12],
      [58, 14], [54, 17], [50, 16], [47, 14], [43, 11], [40, 9], [38, 8], [36, 6],
    ],
    [[46, 15], [49, 17], [50, 20], [47, 22], [44, 20]],
    [[51, 17], [55, 17], [57, 16], [58, 18], [56, 19], [53, 18]],
    [[60, 7], [62, 7], [62, 9], [60, 9]],
    [[54, 21], [57, 20], [58, 22], [55, 23]],
  ],
  australia: [
    [
      [51, 21], [55, 20], [58, 21], [60, 23], [61, 26], [59, 28], [55, 29],
      [52, 28], [50, 25], [50, 23],
    ],
  ],
};

// Africa is part of the landmass but not of the six highlighted regions.

const pointInPolygon = (px: number, py: number, poly: Poly): boolean => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0];
    const yi = poly[i][1];
    const xj = poly[j][0];
    const yj = poly[j][1];
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const regionAt = (c: number, r: number): RegionId | null => {
  const order: RegionId[] = [
    "northAmerica",
    "southAmerica",
    "europe",
    "middleEast",
    "asia",
    "australia",
  ];
  for (const region of order) {
    if (POLYGONS[region].some((poly) => pointInPolygon(c + 0.5, r + 0.5, poly))) {
      return region;
    }
  }
  return null;
};

export type WorldCell = {
  x: number;
  y: number;
  jx: number;
  jy: number;
  region: RegionId | null;
  africa: boolean;
};

const buildCells = (): WorldCell[] => {
  const rnd = seededRandom("worldmap:v1");
  const cells: WorldCell[] = [];
  for (let r = 0; r < GRID.rows; r++) {
    for (let c = 0; c < GRID.cols; c++) {
      const region = regionAt(c, r);
      const africa = region === null && pointInPolygon(c + 0.5, r + 0.5, POLYGONS.africa[0]);
      if (region === null && !africa) continue;
      cells.push({
        x: GRID.x0 + c * GRID.cell + GRID.cell / 2,
        y: GRID.y0 + r * GRID.cell + GRID.cell / 2,
        jx: rnd.range(-4, 4),
        jy: rnd.range(-4, 4),
        region,
        africa,
      });
    }
  }
  return cells;
};

const WORLD_CELLS = buildCells();

type Props = {
  // 0..1 illumination progress per region (cumulative).
  regionProgress: Partial<Record<RegionId, number>>;
  // 0..1 draw progress per hub arc, indexed like HUBS.
  arcProgress: number[];
  showHubs?: boolean;
  title?: React.ReactNode;
};

export const WorldMap: React.FC<Props> = ({
  regionProgress,
  arcProgress,
  showHubs = true,
  title,
}) => {
  const story = useStory();
  const HUB_ORIGIN = story.map.hubOrigin;
  const HUBS = story.map.hubs;
  const REGION_LABEL = story.map.regionLabel;
  const REGION_LABEL_CELL = story.map.regionLabelCell;
  const arcs = useMemo<CubicArc[]>(
    () =>
      HUBS.map((h) => {
        const from = cellToScreen(HUB_ORIGIN.cell);
        const to = cellToScreen(h.cell);
        const c1 = cellToScreen(h.controls[0]);
        const c2 = cellToScreen(h.controls[1]);
        return { from, c1, c2, to };
      }),
    [HUB_ORIGIN, HUBS],
  );

  const litColor = COLORS.gold;

  return (
    <svg width="1920" height="1080" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
      {/* Graticule */}
      {[8, 16, 24].map((row) => {
        const y = GRID.y0 + (row + 0.5) * GRID.cell;
        return (
          <line
            key={row}
            x1="10"
            y1={y}
            x2="1910"
            y2={y}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1.4"
            strokeDasharray="5 9"
          />
        );
      })}

      {WORLD_CELLS.map((cell, i) => {
        const region = cell.region;
        let fill = cell.africa ? "#3B414C" : "#3B414C";
        let r = 4.8;
        if (region && regionProgress[region]) {
          const progress = regionProgress[region] as number;
          const stagger = (cell.jx + cell.jy) * 0.02 + i * 0.0008;
          const p = Math.max(0, Math.min(1, (progress - stagger / 10) * 3));
          const color = interpolateColors(p, [0, 1], ["#3B414C", litColor]);
          fill = color;
          r = 4.8 + p * 1.6;
        }
        return (
          <circle
            key={i}
            cx={cell.x + cell.jx}
            cy={cell.y + cell.jy}
            r={r}
            fill={fill}
            opacity={cell.region ? (region && regionProgress[region] ? 1 : 0.55) : 0.5}
          />
        );
      })}

      {/* Arcs */}
      {arcs.map((arc, i) => (
        <AnimatedPath
          key={i}
          d={cubicPath(arc)}
          color={withAlpha(COLORS.gold, 0.85)}
          strokeWidth={3}
          glow={4}
          duration={44}
          delay={0}
          opacity={Math.max(0, Math.min(1, arcProgress[i] * 6))}
        />
      ))}

      {/* Hub dots */}
      {showHubs ? (
        <>
          <HubDot pos={cellToScreen(HUB_ORIGIN.cell)} label={HUB_ORIGIN.name} delay={0} active={arcProgress.some((p) => p > 0)} />
          {HUBS.map((h, i) => (
            <HubDot
              key={h.region}
              pos={cellToScreen(h.cell)}
              label={h.name}
              delay={30 + i * 8}
              active={arcProgress[i] > 0}
            />
          ))}
        </>
      ) : null}

      {/* Region label chips */}
      {(Object.keys(REGION_LABEL) as RegionId[]).map((region) => {
        const p = regionProgress[region] ?? 0;
        const appear = Math.max(0, Math.min(1, (p - 0.55) * 4));
        if (appear <= 0) return null;
        const pos = cellToScreen(REGION_LABEL_CELL[region]);
        return (
          <g key={region} opacity={appear} transform={`translate(0 ${(1 - appear) * 10})`}>
            <circle cx={pos.x - 20} cy={pos.y} r={5} fill={litColor} />
            <text
              x={pos.x - 8}
              y={pos.y}
              textAnchor="start"
              dominantBaseline="central"
              fontFamily={FONT.headline}
              fontWeight={WEIGHT.bold}
              fontSize={24}
              letterSpacing="0.18em"
              fill={COLORS.textSecondary}
            >
              {REGION_LABEL[region]}
            </text>
          </g>
        );
      })}

      {title}
    </svg>
  );
};

const HubDot: React.FC<{ pos: Pt; label: string; delay: number; active: boolean }> = ({
  pos,
  label,
  delay,
  active,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = springProgress(frame, fps, { delay, durationInFrames: 30, damping: 16 });
  const ring = active ? 0.5 + 0.5 * Math.sin(frame * 0.12 + delay) : 0;
  if (p <= 0) return null;
  return (
    <g opacity={Math.min(1, p * 2)}>
      <circle cx={pos.x} cy={pos.y} r={7.5} fill="#F5F6F8" />
      <circle
        cx={pos.x}
        cy={pos.y}
        r={7.5 + ring * 9}
        fill="none"
        stroke="#F5F6F8"
        strokeWidth={1.6}
        opacity={0.45 * (0.4 + ring * 0.6)}
      />
      <text
        x={pos.x + 16}
        y={pos.y + 20}
        textAnchor="start"
        fontFamily={FONT.headline}
        fontWeight={WEIGHT.bold}
        fontSize={21}
        letterSpacing="0.14em"
        fill={COLORS.textPrimary}
        opacity={0.85}
      >
        {label}
      </text>
    </g>
  );
};