export type Pt = { x: number; y: number };

export type CubicArc = {
  from: Pt;
  c1: Pt;
  c2: Pt;
  to: Pt;
};

export const cubicPoint = (a: CubicArc, t: number): Pt => {
  const u = 1 - t;
  const x =
    u * u * u * a.from.x +
    3 * u * u * t * a.c1.x +
    3 * u * t * t * a.c2.x +
    t * t * t * a.to.x;
  const y =
    u * u * u * a.from.y +
    3 * u * u * t * a.c1.y +
    3 * u * t * t * a.c2.y +
    t * t * t * a.to.y;
  return { x, y };
};

// Angle (degrees) of the tangent of a cubic at time t.
export const cubicAngleAt = (a: CubicArc, t: number): number => {
  const u = 1 - t;
  const dx =
    3 * u * u * (a.c1.x - a.from.x) +
    6 * u * t * (a.c2.x - a.c1.x) +
    3 * t * t * (a.to.x - a.c2.x);
  const dy =
    3 * u * u * (a.c1.y - a.from.y) +
    6 * u * t * (a.c2.y - a.c1.y) +
    3 * t * t * (a.to.y - a.c2.y);
  return (Math.atan2(dy, dx) * 180) / Math.PI;
};

export const cubicPath = (a: CubicArc): string =>
  `M ${a.from.x} ${a.from.y} C ${a.c1.x} ${a.c1.y}, ${a.c2.x} ${a.c2.y}, ${a.to.x} ${a.to.y}`;

export const linePath = (from: Pt, to: Pt): string =>
  `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

export const angleBetween = (from: Pt, to: Pt): number =>
  (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;

export const distance = (from: Pt, to: Pt): number =>
  Math.hypot(to.x - from.x, to.y - from.y);

// Point on a straight line at progress t (0..1).
export const linePoint = (from: Pt, to: Pt, t: number): Pt => ({
  x: from.x + (to.x - from.x) * t,
  y: from.y + (to.y - from.y) * t,
});

export const polarPoint = (origin: Pt, angleDeg: number, radius: number): Pt => {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: origin.x + Math.cos(rad) * radius, y: origin.y + Math.sin(rad) * radius };
};