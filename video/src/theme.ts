// One place for brand + layout. Components read from here, never hardcode.
export const theme = {
  // Vox: a printed page, not a stage. Ink on paper, one accent, nothing else —
  // the restraint is the look, so resist adding a sixth colour here.
  vox: {
    paper: "#F4F1EA",
    paperDeep: "#E4DED1",
    ink: "#1A1A1A",
    accent: "#D9491E",
    muted: "#8A857C",
    rule: "#C9C2B4",
    // Archivo is loaded by vox/elements.tsx; the rest of the stack is what
    // renders if the font server is unreachable.
    font: `"Archivo", "Bahnschrift", "Segoe UI", system-ui, sans-serif`,
  },
  // Crime: an investigation room at night. Charcoal, one warm paper, one muted
  // evidence red, one cool surveillance tone. Every colour here means something
  // — red marks evidence, teal marks surveillance, amber marks archival — so a
  // colour used for decoration breaks the grammar.
  crime: {
    ink: "#0A0C0E", // the room
    slate: "#151A1E", // a panel in the room
    rule: "#2B333A",
    paper: "#E9E4D7", // a document under a lamp
    paperEdge: "#C8C0AC",
    text: "#E8EBED",
    dim: "#8A949C",
    evidence: "#C0392B", // an evidence mark, never a mood
    surveil: "#74A9A2", // camera / phone / anything a machine recorded
    amber: "#D2A044", // archival, older than the case
    font: `"Archivo", "Bahnschrift", "Segoe UI", system-ui, sans-serif`,
    // Timestamps, case numbers, evidence tags. A machine wrote these, so they
    // are set in a machine's typeface.
    mono: `"Consolas", "DejaVu Sans Mono", ui-monospace, monospace`,
  },
  // Scam: sitting with a friend over coffee explaining how you almost got got —
  // not a midnight documentary. Warm paper, vox orange for "look here", and
  // three colours that mean one thing each: red is the moment it turns, green
  // is money, blue is the fake trust signal. A colour used for decoration
  // breaks the grammar.
  scam: {
    paper: "#F5F1E8", // warm off-white, slightly warmer than vox
    paperDeep: "#E8E1D2", // edge fade
    ink: "#1A1A1A", // body text
    inkSoft: "#3A3A38", // secondary text
    muted: "#8A857C", // Vox-kit alias for secondary text on the page
    rule: "#C7BFAD", // printer's guides
    accent: "#D9491E", // vox orange — callouts, underlines, the RED FLAG
    alert: "#C81E1E", // the moment the scam turns. One beat per video max.
    money: "#0E7C3A", // every dollar amount. Money is the thing in this niche.
    // The same green lifted for the black hook and payoff frames. #0E7C3A is
    // tuned to sit on paper and only reaches ~3:1 on black — too weak for the
    // one frame that has to stop a thumb at low screen brightness.
    moneyLift: "#2EA85C",
    verified: "#1B6FDB", // the *fake* verification checkmarks scammers fake
    font: `"Archivo", "Bahnschrift", "Segoe UI", system-ui, sans-serif`,
  },
  // Info: the flat infographic page. Deep navy board, white ink, one electric
  // accent for "look here", a second for the thing everything is pointing at.
  // No texture, no gradients pretending to be light — the flatness is the
  // style, the way it is on every chart card that goes viral.
  info: {
    board: "#0B1220", // the canvas
    panel: "#13203A", // cards on the canvas
    panelLine: "#223455", // panel edge
    ink: "#F5F8FF", // headline ink
    text: "#C7D2E8", // body ink
    dim: "#64748B", // secondary
    accent: "#FFC53D", // the look-here number / path / figure
    boss: "#FF5A4E", // the red thing the story centers on
    good: "#3DDC97", // arrived / done
    rule: "#1E2D4B",
    font: `"Archivo", "Bahnschrift", "Segoe UI", system-ui, sans-serif`,
    mono: `"Consolas", "DejaVu Sans Mono", ui-monospace, monospace`,
  },
} as const;
