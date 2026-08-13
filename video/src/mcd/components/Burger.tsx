import React, { useMemo } from "react";
import { seededRandom } from "../utils/deterministicRandom";

type Props = {
  scale?: number;
  style?: React.CSSProperties;
};

// Stylized burger — the video's anchor object. Pure vector, no animation
// inside; parents animate position/rotation/scale.
export const Burger: React.FC<Props> = ({ scale = 1, style }) => {
  const sesames = useMemo(() => {
    const rnd = seededRandom("burger:sesame:v1");
    return Array.from({ length: 16 }, () => ({
      x: 120 + rnd.range(0, 360),
      y: 92 + rnd.range(0, 52),
      rx: rnd.range(11, 18),
      ry: rnd.range(6, 9),
      rot: rnd.range(0, 180),
    }));
  }, []);

  return (
    <div style={{ width: 640, height: 540, transform: `scale(${scale})`, ...style }}>
      <svg width="640" height="540" viewBox="0 0 640 540" style={{ overflow: "visible" }} aria-hidden>
        <defs>
          <linearGradient id="burger-bun-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E3A75C" />
            <stop offset="1" stopColor="#CF8F45" />
          </linearGradient>
          <linearGradient id="burger-bun-bottom" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#D39A50" />
            <stop offset="1" stopColor="#B97F38" />
          </linearGradient>
        </defs>

        {/* Soft contact shadow */}
        <ellipse cx="320" cy="508" rx="230" ry="26" fill="#000" opacity="0.42" />

        {/* Bottom bun */}
        <path
          d="M 92 320 h 456 a 40 40 0 0 1 40 40 v 30 a 40 40 0 0 1 -40 40 h -456 a 40 40 0 0 1 -40 -40 v -30 a 40 40 0 0 1 40 -40 Z"
          fill="url(#burger-bun-bottom)"
        />

        {/* Patty */}
        <rect x="80" y="296" width="480" height="42" rx="19" fill="#5C3B25" />

        {/* Cheese with drips */}
        <path
          d="M 68 280 L 572 280 L 556 238 L 486 272 L 414 234 L 348 268 L 270 234 L 205 268 L 140 240 Z"
          fill="#F0B429"
        />

        {/* Lettuce */}
        <path
          d="M 60 226 Q 150 202 240 224 T 420 224 T 580 220 L 576 206 Q 440 208 330 206 T 70 210 Z"
          fill="#6FA55C"
        />

        {/* Tomato */}
        <rect x="66" y="196" width="508" height="26" rx="11" fill="#B23A32" />

        {/* Top bun dome */}
        <path
          d="M 66 192 Q 66 62 320 62 Q 574 62 574 192 Q 574 216 320 216 Q 66 216 66 192 Z"
          fill="url(#burger-bun-top)"
        />
        <path
          d="M 120 80 Q 320 44 520 80"
          fill="none"
          stroke="#F0C288"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.5"
        />

        {/* Sesame seeds */}
        {sesames.map((s, i) => (
          <ellipse
            key={i}
            cx={s.x}
            cy={s.y}
            rx={s.rx}
            ry={s.ry}
            fill="#F7E3B8"
            opacity="0.9"
            transform={`rotate(${s.rot} ${s.x} ${s.y})`}
          />
        ))}
      </svg>
    </div>
  );
};