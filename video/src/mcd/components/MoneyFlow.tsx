import React, { useMemo } from "react";
import { useCurrentFrame } from "remotion";
import { EASE_IN_OUT } from "../utils/easing";
import { progressive } from "../utils/animation";
import { cubicPoint, linePoint, type Pt } from "../utils/geometry";
import { seededRandom } from "../utils/deterministicRandom";
import { COLORS } from "../theme";

export type MoneyStream = {
  from: Pt;
  c1?: Pt;
  c2?: Pt;
  to: Pt;
  // Scene-local frames.
  offset?: number;
  travel?: number;
};

type Props = {
  streams: MoneyStream[];
  perStream?: number;
  startFrame?: number;
  color?: string;
  particleRadius?: [number, number];
  travel?: number;
  markerEvery?: number;
  opacity?: number;
};

const E = EASE_IN_OUT;

// Deterministic particle system that flows money along paths.
// Each stream spawns `perStream` particles over its travel window.
export const MoneyFlow: React.FC<Props> = ({
  streams,
  perStream = 7,
  startFrame = 0,
  color = COLORS.gold,
  particleRadius = [4, 8],
  travel = 120,
  markerEvery = 4,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const particles = useMemo(() => {
    const out: {
      p: number;
      r: number;
      marker: boolean;
      stream: MoneyStream;
      seedKey: string;
    }[] = [];
    streams.forEach((s, si) => {
      const rnd = seededRandom(`money:v1:${si}`);
      for (let i = 0; i < perStream; i++) {
        out.push({
          p: rnd.range(0.7, 1.3),
          r: rnd.range(particleRadius[0], particleRadius[1]),
          marker: i % markerEvery === 0 && markerEvery > 0,
          stream: s,
          seedKey: `m${si}:${i}`,
        });
      }
    });
    return out;
  }, [streams, perStream, particleRadius, markerEvery]);

  return (
    <g opacity={opacity}>
      {particles.map((pt, i) => {
        const s = pt.stream;
        const offset = startFrame + (s.offset ?? 0) + pt.p * (s.travel ?? travel) * 0.35;
        const dur = (s.travel ?? travel) * 0.8;
        const env = progressive(frame, offset, dur, E);
        if (env <= 0 || env >= 1) return null;
        const pos = s.c1 && s.c2
          ? cubicPoint({ from: s.from, c1: s.c1, c2: s.c2, to: s.to }, env)
          : linePoint(s.from, s.to, env);
        const fade = Math.sin(Math.PI * env);
        return (
          <g key={i} opacity={fade * 0.95 + 0.05}>
            {env < 0.18 ? (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={pt.r * 0.55}
                fill={color}
                opacity={0.35}
              />
            ) : null}
            <circle cx={pos.x} cy={pos.y} r={pt.r} fill={color} />
            {pt.marker ? (
              <text
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={pt.r * 2.4}
                fontWeight={900}
                fill="#0B0C0F"
              >
                $
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
};