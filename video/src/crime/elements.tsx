// The Crime Kit: the surfaces an investigative documentary is built from.
//
// Nothing here knows about a case. Modules in ./scenes.tsx compose these into
// beats, and the episode JSON only ever names a module — so a second case is a
// second story.txt, never a second component.
//
// Every size is derived from the canvas, not from 1080x1920: `u` is one
// thousandth of the mean edge, which is the same physical size in 16:9 and 9:16.
// That is what lets CrimeLong and CrimeShort share one visual language.
import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { theme } from "../theme";
import footage from "../footage.json";

const c = theme.crime;

/** The type palette the crime engine hands to the shared KineticText. */
export const CRIME_TYPE = { ink: c.text, accent: c.evidence, font: c.font };

export const useStage = () => {
  const { width, height } = useVideoConfig();
  return {
    width,
    height,
    wide: width > height,
    pad: width * (width > height ? 0.062 : 0.075),
    /** One unit ≈ 1/1000 of the mean edge. Equal on screen in both aspects. */
    u: (width + height) / 2000,
  };
};

export const ease = (
  frame: number,
  a: number,
  b: number,
  out: readonly [number, number] = [0, 1],
) =>
  interpolate(frame, [a, b], out, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

// ------------------------------------------------------------------ the room
/** Grain, rasterised once into a data URI. A live <feTurbulence> over the whole
 *  canvas costs seconds per frame, and a 10-minute documentary is 18,000 of them. */
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">` +
    `<filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>` +
    `<feColorMatrix type="saturate" values="0"/></filter>` +
    `<rect width="200" height="200" filter="url(#g)" opacity="0.5"/></svg>`,
)}")`;

/**
 * The room every beat sits in: charcoal, a cold pool of light off-centre, grain
 * and a vignette. It drifts, slowly, so no frame is ever mathematically still —
 * a static frame is the single loudest tell that a video was generated.
 */
export const FilmBG: React.FC<{ warm?: boolean }> = ({ warm = false }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 260) * 10;
  return (
    <AbsoluteFill style={{ backgroundColor: c.ink }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 55% at ${48 + drift / 8}% ${42 + drift / 10}%, ${
            warm ? "#241C13" : "#19222A"
          } 0%, ${c.slate} 45%, ${c.ink} 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: GRAIN,
          backgroundSize: "200px 200px",
          opacity: 0.16,
          transform: `translate(${drift}px, ${-drift * 0.6}px)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 78% 66% at 50% 50%, transparent 42%, #000 128%)`,
          opacity: 0.85,
        }}
      />
    </AbsoluteFill>
  );
};

/** Page margins, and the room the caption card lives in. Reserved in every
 *  module so nothing has to know whether this beat is captioned. */
export const Stage: React.FC<{
  children: React.ReactNode;
  align?: "center" | "flex-start";
  justify?: "center" | "flex-start" | "space-between";
}> = ({ children, align = "flex-start", justify = "center" }) => {
  const { pad, wide } = useStage();
  return (
    <AbsoluteFill
      style={{
        padding: pad,
        paddingBottom: pad * (wide ? 1.9 : 3.0),
        display: "flex",
        flexDirection: "column",
        justifyContent: justify,
        alignItems: align,
        gap: pad * 0.6,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ chrome
/** Small mono label with a rule — the thing that makes a frame read as a file
 *  rather than a slide. Chapter names, camera IDs, exhibit numbers. */
export const Slug: React.FC<{
  text: string;
  color?: string;
  enter?: number;
}> = ({ text, color = c.dim, enter = 30 }) => {
  const { u } = useStage();
  const t = ease(enter, 0, 12);
  if (!text) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: u * 14,
        fontFamily: c.mono,
        fontSize: u * 17,
        fontWeight: 700,
        letterSpacing: u * 3,
        textTransform: "uppercase",
        color,
        opacity: t,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: u * 34 * t, height: u * 2, background: color }} />
      {text}
    </div>
  );
};

/** Timestamps, distances, case numbers. A machine recorded these, so they are
 *  set the way a machine prints them. */
export const Mono: React.FC<{
  text: string;
  size: number;
  color?: string;
  opacity?: number;
}> = ({ text, size, color = c.surveil, opacity = 1 }) => (
  <div
    style={{
      fontFamily: c.mono,
      fontSize: size,
      fontWeight: 700,
      letterSpacing: size * 0.06,
      color,
      opacity,
      fontVariantNumeric: "tabular-nums",
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </div>
);

/**
 * The one line of type the viewer is meant to read on this beat.
 *
 * Long-form narration is spoken, not transcribed — so a documentary frame
 * carries the fact, never the sentence. "2:17 AM", not "at 2:17 in the morning
 * his phone connected to a tower". Sized to fill the measure it is given.
 */
export const Emphasis: React.FC<{
  text: string;
  enter: number;
  color?: string;
  align?: "left" | "center";
  maxChars?: number;
}> = ({ text, enter, color = c.text, align = "left", maxChars = 26 }) => {
  const { u, width, pad } = useStage();
  if (!text) return null;
  const size = u * (text.length > maxChars * 1.8 ? 44 : text.length > maxChars ? 58 : 76);
  const t = ease(enter, 0, 14);
  return (
    <div
      style={{
        maxWidth: width - pad * 2,
        fontFamily: c.font,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: -size * 0.028,
        textTransform: "uppercase",
        textAlign: align,
        color,
        opacity: t,
        transform: `translateY(${(1 - t) * u * 12}px)`,
      }}
    >
      {text}
    </div>
  );
};

/** Body type inside a document or an evidence card. */
export const Body: React.FC<{
  text: string;
  size: number;
  color?: string;
  opacity?: number;
  weight?: number;
}> = ({ text, size, color = c.paperEdge, opacity = 1, weight = 500 }) => (
  <div
    style={{
      fontFamily: c.font,
      fontSize: size,
      fontWeight: weight,
      lineHeight: 1.35,
      color,
      opacity,
    }}
  >
    {text}
  </div>
);

// ------------------------------------------------------------------ provenance
export type Provenance =
  | "official"
  | "archival"
  | "licensed"
  | "public_record"
  | "reconstruction"
  | "illustrative"
  | "unknown";

const PROVENANCE_LABEL: Record<Provenance, string> = {
  official: "OFFICIAL RECORD",
  archival: "ARCHIVAL",
  licensed: "LICENSED FOOTAGE",
  public_record: "PUBLIC RECORD",
  reconstruction: "RECONSTRUCTION",
  illustrative: "ILLUSTRATIVE — NOT CASE FOOTAGE",
  unknown: "SOURCE UNVERIFIED",
};

/** Anything that is not authentic case material says so, on the frame, for as
 *  long as it is on screen. This is the one label in the engine that must never
 *  be animated away or made subtle enough to miss. */
export const ProvenanceTag: React.FC<{ kind: Provenance }> = ({ kind }) => {
  const { u, pad } = useStage();
  const staged = kind === "reconstruction" || kind === "illustrative" || kind === "unknown";
  return (
    <div
      style={{
        position: "absolute",
        left: pad,
        bottom: pad * 0.55,
        display: "flex",
        alignItems: "center",
        gap: u * 8,
        padding: `${u * 6}px ${u * 12}px`,
        border: `${u * 1.5}px solid ${staged ? c.evidence : c.dim}`,
        background: "rgba(0,0,0,.45)",
        fontFamily: c.mono,
        fontSize: u * 13,
        fontWeight: 700,
        letterSpacing: u * 2,
        color: staged ? c.evidence : c.dim,
      }}
    >
      {PROVENANCE_LABEL[kind]}
    </div>
  );
};

// ------------------------------------------------------------------ imagery
const FOOTAGE: Record<string, string> = footage;

export const hasAsset = (beat: number) => Boolean(FOOTAGE[String(beat)]);

/**
 * Stock or archival imagery, graded into the room and pushed slowly.
 *
 * The move is deliberately small. A photograph that zooms 30% stops reading as
 * a document of something that happened and starts reading as a screensaver.
 *
 * With nothing downloaded the beat still stages: an empty evidence panel, which
 * is honest — the engine never pretends to have material it does not have.
 */
export const Plate: React.FC<{
  beat: number;
  progress: number;
  grade?: "neutral" | "cold" | "archival";
  dim?: number;
}> = ({ beat, progress, grade = "neutral", dim = 0.35 }) => {
  const src = FOOTAGE[String(beat)];
  const scale = interpolate(progress, [0, 1], [1.05, 1.0]);
  const fit = { width: "100%", height: "100%", objectFit: "cover" } as const;
  const filter =
    grade === "cold"
      ? "saturate(0.35) contrast(1.16) brightness(0.82) hue-rotate(160deg)"
      : grade === "archival"
        ? "saturate(0.4) sepia(0.35) contrast(1.1) brightness(0.86)"
        : "saturate(0.62) contrast(1.08) brightness(0.84)";

  if (!src) {
    return (
      <AbsoluteFill>
        <FilmBG warm={grade === "archival"} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${scale})` }}>
        {/^.+\.mp4$/i.test(src) ? (
          // No loop: OffthreadVideo cannot, so fetch-footage.py picks clips at
          // least as long as the beat instead.
          <OffthreadVideo src={staticFile(src)} muted style={{ ...fit, filter }} />
        ) : (
          <Img src={staticFile(src)} style={{ ...fit, filter }} />
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: c.ink, opacity: dim }} />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 76% 62% at 50% 48%, transparent 30%, ${c.ink} 122%)`,
          opacity: 0.75,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage: GRAIN,
          backgroundSize: "200px 200px",
          opacity: 0.14,
        }}
      />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ surfaces
/**
 * A sheet of paper under a lamp. Documents, receipts, letters, court records —
 * anything the case produced on paper lands on this.
 *
 * It is slightly off-square because a page placed by hand always is, and that
 * one degree is most of the difference between "a document" and "a text box".
 */
export const Sheet: React.FC<{
  children: React.ReactNode;
  progress: number;
  tilt?: number;
  ruled?: boolean;
}> = ({ children, progress, tilt = -0.6, ruled = true }) => {
  const { u } = useStage();
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        background: `linear-gradient(160deg, ${c.paper} 0%, ${c.paperEdge} 130%)`,
        padding: u * 42,
        boxShadow: `0 ${u * 26}px ${u * 60}px rgba(0,0,0,.55)`,
        transform: `rotate(${tilt}deg) translateY(${(1 - progress) * u * 26}px)`,
        opacity: progress,
        overflow: "hidden",
      }}
    >
      {ruled ? (
        <AbsoluteFill
          style={{
            backgroundImage: `repeating-linear-gradient(180deg, transparent 0 ${u * 34}px, rgba(20,24,28,.07) ${u * 34}px ${u * 35}px)`,
          }}
        />
      ) : null}
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
};

/** Black bars that wipe across withheld text. Drawn, not pre-baked, so the
 *  redaction is visibly an act rather than a picture of one. */
export const Redact: React.FC<{
  progress: number;
  width: number;
  height: number;
}> = ({ progress, width, height }) => (
  <span
    style={{
      display: "inline-block",
      width,
      height,
      verticalAlign: "middle",
      background: "#101315",
      clipPath: `inset(0 ${Math.max(0, (1 - progress) * 100)}% 0 0)`,
    }}
  />
);

/**
 * Surveillance chrome: camera identifier, running timestamp, a scanline field
 * and the soft bloom a cheap sensor puts on everything.
 *
 * The frame does NOT get applied to ordinary photographs. Dressing a stock
 * photo as CCTV is the exact thing the reconstruction rules exist to stop, so
 * the module that stages this passes its own provenance through.
 */
export const Screen: React.FC<{
  children?: React.ReactNode;
  camera: string;
  stamp: string;
  frame: number;
  tone?: string;
}> = ({ children, camera, stamp, frame, tone = c.surveil }) => {
  const { u, pad } = useStage();
  return (
    <AbsoluteFill>
      {children}
      <AbsoluteFill
        style={{
          backgroundImage: `repeating-linear-gradient(180deg, rgba(255,255,255,.045) 0 ${u * 2}px, transparent ${u * 2}px ${u * 5}px)`,
          mixBlendMode: "screen",
          opacity: 0.7,
          transform: `translateY(${(frame % 40) * u * 0.12}px)`,
        }}
      />
      <AbsoluteFill style={{ boxShadow: `inset 0 0 ${u * 160}px rgba(0,0,0,.75)` }} />
      <div
        style={{
          position: "absolute",
          left: pad,
          top: pad * 0.8,
          display: "flex",
          alignItems: "center",
          gap: u * 12,
        }}
      >
        <span
          style={{
            width: u * 12,
            height: u * 12,
            borderRadius: u * 12,
            background: c.evidence,
            opacity: frame % 60 < 34 ? 1 : 0.15,
          }}
        />
        <Mono text={camera} size={u * 18} color={tone} />
      </div>
      <div style={{ position: "absolute", right: pad, top: pad * 0.8 }}>
        <Mono text={stamp} size={u * 18} color={tone} />
      </div>
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------------ diagram
export type Node = { label: string; sub?: string; x: number; y: number };

/**
 * Points and the lines between them: the case board, and the schematic map.
 *
 * Positions are laid out by the caller in 0..1 of the frame, precomputed once —
 * a 10-minute documentary cannot afford geometry per frame.
 *
 * This is deliberately NOT a red-string corkboard. The connections in a real
 * investigation are an information graphic; drawing them as a thriller prop
 * tells the viewer the video is entertainment about a crime rather than an
 * account of one.
 */
export const Diagram: React.FC<{
  nodes: Node[];
  links?: [number, number][];
  progress: number;
  accent?: number;
  round?: boolean;
}> = ({ nodes, links = [], progress, accent = -1, round = true }) => {
  const { width, height, u } = useStage();
  const px = (n: Node) => [n.x * width, n.y * height] as const;
  // One line per link, drawn in order, each taking its own slice of the run.
  const drawn = progress * (links.length + nodes.length);

  return (
    <AbsoluteFill>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {links.map(([a, b], i) => {
          const [x1, y1] = px(nodes[a]);
          const [x2, y2] = px(nodes[b]);
          const t = Math.max(0, Math.min(1, drawn - nodes.length - i));
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x1 + (x2 - x1) * t}
              y2={y1 + (y2 - y1) * t}
              stroke={c.rule}
              strokeWidth={u * 1.6}
              strokeDasharray={`${u * 8} ${u * 6}`}
            />
          );
        })}
      </svg>
      {nodes.map((node, i) => {
        const [x, y] = px(node);
        const t = Math.max(0, Math.min(1, drawn - i));
        const on = i === accent;
        const size = u * (on ? 15 : 10);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${t})`,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: u * 8,
              opacity: t,
            }}
          >
            <span
              style={{
                width: size * 2,
                height: size * 2,
                borderRadius: round ? size * 2 : 0,
                border: `${u * 2}px solid ${on ? c.evidence : c.surveil}`,
                background: on ? c.evidence : "transparent",
                boxShadow: on ? `0 0 ${u * 30}px ${c.evidence}66` : "none",
              }}
            />
            <div
              style={{
                fontFamily: c.font,
                fontWeight: 700,
                fontSize: u * 20,
                letterSpacing: u * 0.6,
                textAlign: "center",
                color: on ? c.text : c.dim,
                whiteSpace: "nowrap",
              }}
            >
              {node.label}
            </div>
            {node.sub ? <Mono text={node.sub} size={u * 15} color={c.dim} /> : null}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Lay points out on a stable, readable grid. Two points sit side by side, three
 * make a triangle, more spread around an ellipse — deterministic, so the same
 * beat lands in the same place on every frame and every render.
 */
export const layout = (n: number, wide: boolean): { x: number; y: number }[] => {
  if (n <= 1) return [{ x: 0.5, y: 0.46 }];
  if (n === 2)
    return [
      { x: 0.29, y: 0.47 },
      { x: 0.71, y: 0.47 },
    ];
  if (n === 3) {
    // Same triangle in both cuts, but a fraction of 1920 is not a fraction of
    // 1080: kept at the landscape spread the portrait frame reads as three
    // labels adrift in black.
    const dy = wide ? 0.15 : 0.09;
    return [
      { x: 0.26, y: 0.51 - dy },
      { x: 0.74, y: 0.51 - dy },
      { x: 0.5, y: 0.51 + dy },
    ];
  }
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return {
      x: 0.5 + Math.cos(a) * (wide ? 0.3 : 0.31),
      y: 0.48 + Math.sin(a) * (wide ? 0.26 : 0.19),
    };
  });
};

// ------------------------------------------------------------------ audio map
/**
 * Semantic sound events -> files. The episode names what happened ("evidence",
 * "chapter"); only this table knows which wav that is, so swapping the SFX pack
 * never touches a story.
 */
export const CRIME_SFX: Record<string, string[]> = {
  document: ["stamp.wav"],
  map_pin: ["tick.wav"],
  timestamp: ["tick.wav"],
  cctv: ["whoosh.wav"],
  message: ["pop.wav"],
  phone: ["pop.wav"],
  evidence: ["stamp.wav"],
  transition_soft: ["whoosh.wav"],
  transition_hard: ["boom.wav"],
  reveal_minor: ["chime.wav"],
  reveal_major: ["boom.wav", "shimmer.wav"],
  tension_rise: ["riser.wav"],
  chapter: ["whoosh-up.wav"],
};
