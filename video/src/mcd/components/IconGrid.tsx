import React, { useEffect, useMemo, useRef } from "react";
import { useCurrentFrame } from "remotion";
import { seededRandom } from "../utils/deterministicRandom";
import type { CameraState } from "./Camera2D";
import { COLORS } from "../theme";

const COLS = 64;
const ROWS = 32;
const CELL = 100; // world px per cell
const W_L = 1920;
const H_L = 1080;
const W_P = 1080;
const H_P = 1920;

type Cell = { x: number; y: number; rot: number; jx: number; jy: number };

// Precompute the full field once, in spiral order from the center:
// cell 0 is the "origin restaurant", growth radiates outward.
const buildCells = (): Cell[] => {
  const cx = (COLS - 1) / 2;
  const cy = (ROWS - 1) / 2;
  const ringOf = (c: number, r: number) =>
    Math.max(Math.floor(Math.abs(c - cx)), Math.floor(Math.abs(r - cy)));
  const maxRing = ringOf(0, 0);
  const cells: Cell[] = [];
  for (let ring = 0; ring <= maxRing; ring++) {
    const ringCells: { c: number; r: number }[] = [];
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        if (ringOf(c, r) === ring) {
          ringCells.push({ c, r });
        }
      }
    }
    ringCells.sort((a, b) => {
      const ca = Math.atan2(a.r - cy, a.c - cx);
      const cb = Math.atan2(b.r - cy, b.c - cx);
      return ca - cb;
    });
    const rnd = seededRandom(`icongrid:v1:ring${ring}`);
    for (const rc of ringCells) {
      cells.push({
        x: (rc.c - cx) * CELL,
        y: (rc.r - cy) * CELL,
        rot: rnd.range(-0.07, 0.07),
        jx: rnd.range(-18, 18),
        jy: rnd.range(-18, 18),
      });
    }
  }
  return cells;
};

const CELLS = buildCells();
const MAX_DRAW = 2048;

const roundRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const drawGlyph = (
  ctx: CanvasRenderingContext2D,
  cell: Cell,
  camera: CameraState,
  index: number,
  glyphAlpha: number,
  pulse: number,
): void => {
  const s = camera.scale;
  const lw = 9 * Math.min(1, s / 0.55);
  const isOrigin = index === 0;
  const gw = isOrigin ? CELL * 1.25 : CELL * 0.82;
  const gh = gw * 0.98;

  ctx.save();
  ctx.translate(cell.x + cell.jx, cell.y + cell.jy);
  ctx.rotate(cell.rot);

  if (isOrigin) {
    ctx.globalAlpha = glyphAlpha * (0.35 + 0.65 * pulse);
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 4;
    const pr = CELL * (0.6 + pulse * 0.9);
    ctx.beginPath();
    ctx.arc(0, 0, pr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.globalAlpha = glyphAlpha;

  const body = isOrigin ? COLORS.red : COLORS.accentDark;
  const gold = isOrigin ? COLORS.gold : COLORS.gold;

  // Building body
  ctx.fillStyle = body;
  roundRectPath(ctx, -gw / 2, -gh * 0.18, gw, gh * 0.88, gw * 0.14);
  ctx.fill();

  // Roof sign
  ctx.fillStyle = gold;
  roundRectPath(ctx, -gw * 0.4, -gh * 0.62, gw * 0.8, gh * 0.15, gw * 0.07);
  ctx.fill();

  // Golden-arch M stroke
  ctx.strokeStyle = gold;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-gw * 0.28, -gh * 0.06);
  ctx.lineTo(-gw * 0.14, -gh * 0.34);
  ctx.lineTo(0, -gh * 0.06);
  ctx.lineTo(gw * 0.14, -gh * 0.34);
  ctx.lineTo(gw * 0.28, -gh * 0.06);
  ctx.stroke();

  // Door
  ctx.fillStyle = "#1A1A1A";
  roundRectPath(ctx, -gw * 0.1, gh * 0.3, gw * 0.2, gh * 0.38, gw * 0.05);
  ctx.fill();

  ctx.restore();
};

type Props = {
  count: number; // how many restaurants "exist" (may exceed drawn glyphs)
  camera: CameraState;
  milestone?: number; // frame-driven glow pulse phase, 0..1
  portrait?: boolean;
};

// A 2D field of restaurant glyphs drawn straight to a <canvas>. The camera
// zooms out while `count` multiplies — thousands of restaurants read as a
// large organized city without thousands of DOM nodes.
export const IconGrid: React.FC<Props> = ({ count, camera, milestone = 0, portrait = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frame = useCurrentFrame();
  const W = portrait ? W_P : W_L;
  const H = portrait ? H_P : H_L;

  const glyphCount = useMemo(() => Math.min(Math.floor(count), MAX_DRAW), [count]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Camera: screen = (world - cam) * scale + center
    ctx.setTransform(
      camera.scale,
      0,
      0,
      camera.scale,
      W / 2 - camera.x * camera.scale,
      H / 2 - camera.y * camera.scale,
    );

    const pulse = 0.5 + 0.5 * Math.sin(milestone * Math.PI * 2);
    const alpha = Math.max(0.1, Math.min(1, 1.6 - (camera.scale - 0.3) * 0.35));
    const countNow = glyphCount > 0 ? glyphCount : 1;
    for (let i = 0; i < countNow; i++) {
      drawGlyph(ctx, CELLS[i], camera, i, alpha, pulse);
    }
  }, [glyphCount, camera, frame, milestone, portrait, W, H]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ position: "absolute", inset: 0, width: W, height: H }}
    />
  );
};