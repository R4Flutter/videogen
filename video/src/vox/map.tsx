// The map. This is the frame the whole Vox look is built on: a place named, a
// country inked in, a route drawn between two dots. Everything else in this kit
// explains a mechanism — the map is the one module that answers "where".
//
// Geometry is Natural Earth 1:110m admin-0 countries (public domain), fetched
// once and slimmed to name + ISO + 2dp coordinates in ./world.json. 2dp is
// ~1km, which is finer than 110m data is accurate to, so nothing was lost.
import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  geoGraticule10,
  geoMercator,
  geoNaturalEarth1,
  geoOrthographic,
  geoPath,
} from "d3-geo";
import type { GeoProjection } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { theme } from "../theme";
import { DrawIn } from "./elements";
import { useLayout } from "./layout";
import { PageHead, VoxSceneProps } from "./scenes";
import worldData from "./world.json";

const vox = theme.vox;

/** Annotated once here rather than inferred: a 173KB JSON literal costs tsc
 *  more than the whole rest of the project to widen field by field. */
const WORLD = worldData as unknown as FeatureCollection<
  Geometry,
  { name: string; iso: string }
>;

/** A place a script named. No lat/lon means it's a country — look it up in the
 *  geometry and ink the shape. With one, it's a pin dropped at a point. */
export type Place = { name: string; lat?: number; lon?: number };

const norm = (s: string) => s.trim().toLowerCase();

/** Country lookup by name or ISO-2. Natural Earth's short names are the common
 *  ones ("United States of America" is `US`), so a script gets to write either. */
const find = (name: string) => {
  const q = norm(name);
  return (
    WORLD.features.find((f) => norm(f.properties.name) === q) ??
    WORLD.features.find((f) => norm(f.properties.iso ?? "") === q) ??
    WORLD.features.find((f) => norm(f.properties.name).includes(q))
  );
};

/** How much wider than the final framing the beat opens. The Vox map move is a
 *  zoom with somewhere to zoom *from*; land on the subject with no approach and
 *  it reads as a slide of a map rather than an arrival. */
const OPEN = 3.1;

/**
 * A quadratic arc between two projected points, bulging perpendicular to the
 * chord. Not a great circle — on a zoomed regional map a true geodesic between
 * two nearby cities is visually a straight line, and a straight line between two
 * dots doesn't read as a journey.
 */
const arc = (a: [number, number], b: [number, number]) => {
  const [ax, ay] = a;
  const [bx, by] = b;
  const mx = (ax + bx) / 2;
  const my = (ay + by) / 2;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  // Always bows the same way relative to travel direction, so a multi-leg route
  // reads as one continuous hand-drawn line instead of a zigzag.
  const bow = len * 0.22;
  return {
    d: `M${ax} ${ay} Q${mx - (dy / len) * bow} ${my + (dx / len) * bow} ${bx} ${by}`,
    ctrl: [mx - (dy / len) * bow, my + (dx / len) * bow] as [number, number],
  };
};

/** Point on that quadratic at t — the token rides the curve, not the chord. */
const along = (
  a: [number, number],
  c: [number, number],
  b: [number, number],
  t: number,
): [number, number] => {
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
    u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
  ];
};

export const MapScene: React.FC<VoxSceneProps> = ({ dur, beat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height, pad, y: band, primaryH } = useLayout();
  // Subject registry. The map's primary subject is the centred subject —
  // the centroid of all inked features. Children of this scene resolve the
  // subject to the same box, so the rig's focus lands on it and the
  // destination annotation follows it.
  const reg = React.useMemo(() => new Map(), []);

  const globe = /globe|world|planet|orbit/i.test(
    beat.visual + " " + (beat.motion ?? ""),
  );

  // Everything geometric is computed once. d3 reprojecting 177 countries per
  // frame is affordable but pointless: the move is a transform on the <g>, and
  // `vector-effect: non-scaling-stroke` keeps borders at their drawn weight
  // through it, so one projection serves the whole beat.
  const view = React.useMemo(() => {
    // Derived inside the memo, not above it: `beat.places` comes from the
    // script.json import and is referentially stable, but `?? []` and `.filter`
    // mint fresh arrays every frame, which would re-project 177 countries at
    // 30fps for a result that never changes.
    const places = beat.places ?? [];
    const pins = places.filter(
      (p) => p.lat !== undefined && p.lon !== undefined,
    );
    const inked = places
      .filter((p) => p.lat === undefined)
      .map((p) => find(p.name))
      .filter((f): f is Feature<Geometry, { name: string; iso: string }> =>
        Boolean(f),
      );

    // What the camera is asked to frame: the inked countries plus every pin.
    const subject: FeatureCollection = {
      type: "FeatureCollection",
      features: [
        ...inked,
        ...pins.map(
          (p): Feature<Geometry, Record<string, never>> => ({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Point",
              coordinates: [p.lon as number, p.lat as number],
            },
          }),
        ),
      ],
    };
    const framed = subject.features.length > 0;

    // The globe is its own establishing shot, so it is never fitted to the
    // subject — it is rotated until the subject faces the camera and left at a
    // fixed radius. A fitted globe is a globe cropped off the top of the frame.
    let projection: GeoProjection;
    if (globe) {
      const [lon, lat] = framed ? centroidLonLat(subject) : [0, 12];
      projection = geoOrthographic()
        .rotate([-lon, -lat])
        .fitExtent(
          [
            [pad * 1.4, band.primary],
            [width - pad * 1.4, band.primary + Math.min(primaryH, width - pad * 2.8)],
          ],
          { type: "Sphere" },
        );
    } else if (framed) {
      // A single pin has zero extent, so fitExtent would divide by nothing and
      // hand back an infinite scale. Fit the country it sits in instead — and
      // failing that, the region around it.
      const extent: [[number, number], [number, number]] = [
        [pad * 1.6, band.primary],
        [width - pad * 1.6, band.annotation],
      ];
      const degenerate = inked.length === 0 && pins.length < 2;
      projection = geoMercator().fitExtent(
        extent,
        degenerate ? boxAround(pins[0], 9) : subject,
      );
    } else {
      projection = geoNaturalEarth1().fitExtent(
        [
          [pad, band.primary],
          [width - pad, band.annotation],
        ],
        { type: "Sphere" },
      );
    }

    const path = geoPath(projection);
    const inkedNames = new Set(inked.map((f) => f.properties.name));
    return {
      framed,
      // Land is drawn in two passes so an inked country is never overdrawn by a
      // neighbour's fill: everything, then the subject on top.
      land: WORLD.features.map((f) => ({
        d: path(f) ?? "",
        lit: inkedNames.has(f.properties.name),
        name: f.properties.name,
        at: path.centroid(f) as [number, number],
      })),
      graticule: path(geoGraticule10()) ?? "",
      sphere: path({ type: "Sphere" }) ?? "",
      centre: (framed
        ? path.centroid(subject)
        : [width / 2, band.primary + primaryH / 2]) as [number, number],
      dots: pins.map((p) => ({
        name: p.name,
        at: (projection([p.lon as number, p.lat as number]) ?? [0, 0]) as [
          number,
          number,
        ],
      })),
    };
  }, [beat.places, globe, width, pad, band, primaryH]);

  // The zoom. It opens wide and closes on the subject over most of the beat,
  // leaving the last stretch still so the frame can be read rather than chased.
  // The map's own zoom is now *part of* the camera plan, not a second camera
  // — it is the subject's framing, applied as a scale on the same group the
  // rig scales. Two cameras on one frame is the bug; one camera with a
  // subject-anchored move is the fix.
  const push = interpolate(
    frame,
    [0, Math.max(24, dur * 0.72)],
    [1 / OPEN, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );
  // A globe and an unframed world map have nowhere to zoom to, so they drift
  // instead. The rotation is baked into the projection, not animated: spinning
  // the rendered disc turns the globe like a plate on a table.
  const zoom =
    view.framed && !globe ? push : interpolate(push, [1 / OPEN, 1], [1, 1.06]);
  const [cx, cy] = view.centre;

  const route = view.dots.length >= 2;
  const legs = route
    ? view.dots.slice(0, -1).map((from, i) => arc(from.at, view.dots[i + 1].at))
    : [];
  // The route starts after the pins have landed: a line drawn to a dot that
  // isn't there yet is a line to nowhere.
  const travel = interpolate(
    frame,
    [26 + view.dots.length * 6, Math.max(60, dur * 0.86)],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const legT = legs.length ? travel * legs.length : 0;

  const pin = width * 0.016;
  const stroke = width * 0.0022;

  // Labels, de-collided down the page. Two places a script names in the same
  // sentence are often a few kilometres apart — a border town and the compound
  // across the river — and at that zoom their labels land on top of each other,
  // which loses one of the two names the beat exists to say.
  //
  // Sorted by y, then each label pushed clear of the one above it, with a
  // connector back to its own pin when it had to move. Deterministic: same
  // input, same layout, every frame and every re-render.
  const gap = width * 0.058;
  const marks = view.dots
    .map((d, i) => ({
      i,
      name: d.name,
      x: (d.at[0] - cx) * zoom + cx,
      y: (d.at[1] - cy) * zoom + cy,
    }))
    .sort((a, b) => a.y - b.y);
  const placed = marks.map((m) => ({ ...m, ly: m.y }));
  for (let i = 1; i < placed.length; i++) {
    const above = placed[i - 1];
    if (
      Math.abs(placed[i].x - above.x) < width * 0.42 &&
      placed[i].ly - above.ly < gap
    ) {
      placed[i].ly = above.ly + gap;
    }
  }

  return (
    <AbsoluteFill style={{ fontFamily: vox.font }}>
      {/* The sea. Multiplied over the page rather than painted on it, so the
          water keeps the paper's grain — and so land, drawn opaque on top, is
          the lighter shape. Land and water within a shade of each other is the
          failure mode of every quiet map palette. */}
      <AbsoluteFill
        style={{
          background: vox.paperDeep,
          mixBlendMode: "multiply",
          opacity: 0.62,
        }}
      />
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        style={{ position: "absolute", inset: 0 }}
      >
        <g
          transform={`translate(${cx} ${cy}) scale(${zoom}) translate(${-cx} ${-cy})`}
        >
          {globe ? (
            <path
              d={view.sphere}
              fill="#FFFDF7"
              stroke={vox.rule}
              strokeWidth={stroke * 2}
            />
          ) : null}
          {/* Parallels and meridians. Faint enough to register as the page's own
              ruling rather than as a grid someone put on top of a map. */}
          <path
            d={view.graticule}
            fill="none"
            stroke={vox.rule}
            strokeWidth={stroke}
            opacity={0.5}
            vectorEffect="non-scaling-stroke"
          />
          {view.land.map((c, i) =>
            c.d && !c.lit ? (
              <path
                key={i}
                d={c.d}
                fill={vox.paper}
                stroke={vox.rule}
                strokeWidth={stroke * 1.6}
                vectorEffect="non-scaling-stroke"
              />
            ) : null,
          )}
          {/* The subject, inked last so no neighbour's fill lands on top of it.
              Countries ink in one at a time — the order the narration names
              them is the order the eye should find them. */}
          {view.land.map((c, i) =>
            c.d && c.lit ? (
              <path
                key={`lit${i}`}
                d={c.d}
                fill={vox.accent}
                stroke={vox.ink}
                strokeWidth={stroke * 2}
                vectorEffect="non-scaling-stroke"
                opacity={interpolate(frame, [8 + i * 0.02, 24], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })}
              />
            ) : null,
          )}

          {/* The route, drawn leg by leg. */}
          {legs.map((leg, i) => {
            const p = Math.max(0, Math.min(1, legT - i));
            return p > 0 ? (
              <path
                key={`leg${i}`}
                d={leg.d}
                fill="none"
                stroke={vox.ink}
                strokeWidth={width * 0.005}
                strokeLinecap="round"
                strokeDasharray={1}
                strokeDashoffset={1 - p}
                pathLength={1}
                vectorEffect="non-scaling-stroke"
              />
            ) : null;
          })}

          {view.dots.map((d, i) => {
            const s = spring({
              frame: frame - 18 - i * 6,
              fps,
              config: { damping: 200, mass: 0.5, stiffness: 200 },
              durationInFrames: 12,
            });
            const reached = legs.length === 0 || legT >= i;
            return (
              <g key={`pin${i}`} transform={`translate(${d.at[0]} ${d.at[1]})`}>
                <circle
                  r={(pin / zoom) * s}
                  fill={reached ? vox.accent : vox.paper}
                  stroke={vox.ink}
                  strokeWidth={stroke * 2}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}

          {/* The money/person/shipment, riding the leg it is currently on. */}
          {legs.length && travel > 0 && travel < 1
            ? (() => {
                const i = Math.min(legs.length - 1, Math.floor(legT));
                const from = view.dots[i].at;
                const to = view.dots[i + 1].at;
                const [tx, ty] = along(from, legs[i].ctrl, to, legT - i);
                return (
                  <circle
                    cx={tx}
                    cy={ty}
                    r={pin / zoom}
                    fill={vox.accent}
                    stroke={vox.paper}
                    strokeWidth={stroke * 3}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })()
            : null}
        </g>
      </svg>

      {/* Labels live outside the zoomed group: type that scales with the map is
          type that is unreadable for the first second and oversized for the
          last. They ride the transform by hand instead. */}
      {placed.map((d) => {
        const s = spring({
          frame: frame - 22 - d.i * 6,
          fps,
          config: { damping: 200, mass: 0.5, stiffness: 200 },
          durationInFrames: 12,
        });
        const moved = Math.abs(d.ly - d.y) > 1;
        return (
          <React.Fragment key={`lbl${d.i}`}>
            {/* A label that had to move gets a hairline back to its own pin, or
                it is a name floating next to the wrong dot. */}
            {moved ? (
              <svg
                width={width}
                height={height}
                style={{ position: "absolute", inset: 0, opacity: s }}
              >
                <path
                  d={`M${d.x + pin * 0.6} ${d.y} L${d.x + pin * 1.2} ${d.ly} L${d.x + pin * 1.6} ${d.ly}`}
                  fill="none"
                  stroke={vox.ink}
                  strokeWidth={width * 0.0018}
                />
              </svg>
            ) : null}
            <div
              style={{
                position: "absolute",
                left: d.x + pin * 1.6,
                top: d.ly - width * 0.026,
                padding: `${width * 0.008}px ${width * 0.014}px`,
                background: vox.paper,
                border: `${width * 0.002}px solid ${vox.ink}`,
                fontWeight: 800,
                fontSize: width * 0.026,
                letterSpacing: width * 0.0008,
                textTransform: "uppercase",
                color: vox.ink,
                whiteSpace: "nowrap",
                opacity: s,
                transform: `translateY(${interpolate(s, [0, 1], [width * 0.01, 0])}px)`,
              }}
            >
              {d.name}
            </div>
          </React.Fragment>
        );
      })}

      <PageHead kicker={beat.name} headline={beat.text} frame={frame} />

      {/* The destination gets marked by hand, the same way every other module in
          this kit says "this one". Only once the route has actually arrived. */}
      {route && travel > 0.98 ? (
        <DrawIn
          shape="circle"
          x={(view.dots[view.dots.length - 1].at[0] - cx) * zoom + cx - pin * 3}
          y={(view.dots[view.dots.length - 1].at[1] - cy) * zoom + cy - pin * 3}
          w={pin * 6}
          h={pin * 6}
          seed={beat.n * 19}
          progress={interpolate(travel, [0.98, 1], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        />
      ) : null}
    </AbsoluteFill>
  );
};

/** Lon/lat centre of a collection, for pointing the globe at it. */
function centroidLonLat(fc: FeatureCollection): [number, number] {
  const pts: [number, number][] = [];
  const walk = (c: unknown): void => {
    if (
      Array.isArray(c) &&
      typeof c[0] === "number" &&
      typeof c[1] === "number"
    ) {
      pts.push([c[0], c[1]]);
    } else if (Array.isArray(c)) {
      c.forEach(walk);
    }
  };
  fc.features.forEach((f) =>
    walk((f.geometry as { coordinates?: unknown }).coordinates),
  );
  if (!pts.length) return [0, 12];
  const lon = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const lat = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  return [lon, lat];
}

/** A degrees-wide box around a lone pin, so fitExtent has an extent to fit. */
function boxAround(p: Place | undefined, deg: number): FeatureCollection {
  const lon = p?.lon ?? 0;
  const lat = p?.lat ?? 0;
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [lon - deg, lat - deg],
              [lon + deg, lat - deg],
              [lon + deg, lat + deg],
              [lon - deg, lat + deg],
              [lon - deg, lat - deg],
            ],
          ],
        },
      },
    ],
  };
}
