// Habituation: why "cut every three seconds" stops working at ninety seconds.
//
// The orienting response — involuntary attention capture by sudden change — is
// pre-conscious and reliable, and it *habituates*. Repeat a stimulus and the
// nervous system builds a model of it, at which point it is no longer an
// event. This is the single most under-modelled fact in retention editing: a
// film that is maximally dense everywhere has no dynamic range, and a viewer
// stops registering change within about ninety seconds.
//
// `RhythmEngine` schedules events on a fixed per-tier cadence with ±20%
// jitter, and defends the regularity in its own comment: "a viewer senses a
// pattern before they sense randomness, and pattern is calmer." That is right
// *within* a beat and wrong *across* a film. This module supplies the missing
// half: a decaying familiarity per event type, and a channel-rotation pass so
// no single modality carries three interrupts in a row.
//
// Three defences, in ascending order of power:
//   1. vary the interval      — a metronome habituates fastest
//   2. vary the modality      — a visual change after ninety seconds of visual
//                               changes is weak; an audio change is strong
//   3. escalate               — later interrupts must be objectively larger to
//                               produce the same response
import type { AttentionEvent, AttentionEventType } from "../types.ts";
import type { Channel } from "./OpeningRegime.ts";
import { clamp } from "../util.ts";

/** Familiarity half-life, seconds. Roughly the timescale on which a device
 *  stops being an event — which is why minute four feels like minute two. */
export const TAU = 90;

/** How fast familiarity saturates. The first repeat costs a lot; the ninth
 *  costs very little more, because the viewer had already stopped counting. */
const SATURATION = 2.2;

/** Decayed familiarity with one event type at time t, 0..1.
 *
 *  0 means the viewer has never seen this device (or has forgotten it) and it
 *  will land at full strength. 1 means they have seen it so often that it is
 *  wallpaper. */
export const habituation = (
  events: { at: number; type: string; strength: number }[],
  type: string,
  t: number,
): number => {
  let acc = 0;
  for (const e of events) {
    if (e.type !== type) continue;
    if (e.at > t) break;
    acc += e.strength * Math.exp(-(t - e.at) / TAU);
  }
  return clamp(1 - Math.exp(-acc / SATURATION), 0, 1);
};

/** What an event is actually worth once the viewer has got used to it. The
 *  floor is 0.25 rather than 0: even a fully habituated device still marks
 *  time, it just no longer captures. */
export const effectiveStrength = (
  events: { at: number; type: string; strength: number }[],
  event: { at: number; type: string; strength: number },
): number => {
  // Familiarity is measured *just before* the event, so an event never
  // habituates itself.
  const fam = habituation(events, event.type, event.at - 0.001);
  return Number(clamp(event.strength * (1 - 0.6 * fam), 0.25 * event.strength, 1).toFixed(3));
};

/** Which sense an interrupt arrives through. The rotation rule is stated in
 *  channels rather than event types because the viewer's nervous system
 *  habituates per *channel*, not per label: a MAP_REVEAL and an IMAGE_CHANGE
 *  are the same event to the eye. */
export const CHANNEL_OF_EVENT: Record<string, Channel> = {
  WORD_EMPHASIS: "TYPE",
  OBJECT_ENTRY: "PICTURE",
  OBJECT_EXIT: "PICTURE",
  CAMERA_PUSH: "PICTURE",
  CAMERA_PULL: "PICTURE",
  CAMERA_SHIFT: "PICTURE",
  ANNOTATION_APPEAR: "TYPE",
  ANNOTATION_DRAW: "TYPE",
  DATA_CHANGE: "PICTURE",
  NUMBER_REVEAL: "TYPE",
  IMAGE_CHANGE: "PICTURE",
  FOOTAGE_CHANGE: "PICTURE",
  DIAGRAM_BUILD: "PICTURE",
  MAP_REVEAL: "PICTURE",
  PERSPECTIVE_CHANGE: "PICTURE",
  AUDIO_DROP: "SILENCE",
  SILENCE: "SILENCE",
  MUSIC_SHIFT: "SOUND",
  SFX_ACCENT: "SOUND",
  QUESTION: "TYPE",
  REVEAL: "PICTURE",
  CONTRADICTION: "TYPE",
  PAYOFF: "SOUND",
  PATTERN_INTERRUPT: "COLOUR",
};

/** For each channel, the event types that can carry an interrupt on it. Used
 *  to *re-language* a repeated interrupt rather than delete it — the beat
 *  still needs a change at that moment, it just needs a different kind. */
const BY_CHANNEL: Record<Channel, AttentionEventType[]> = {
  PICTURE: ["IMAGE_CHANGE", "CAMERA_SHIFT", "OBJECT_ENTRY", "DIAGRAM_BUILD", "PERSPECTIVE_CHANGE"],
  TYPE: ["WORD_EMPHASIS", "NUMBER_REVEAL", "ANNOTATION_APPEAR", "CONTRADICTION"],
  SOUND: ["SFX_ACCENT", "MUSIC_SHIFT"],
  SILENCE: ["AUDIO_DROP", "SILENCE"],
  COLOUR: ["PATTERN_INTERRUPT"],
};

const CHANNELS: Channel[] = ["PICTURE", "TYPE", "SOUND", "SILENCE", "COLOUR"];

export const channelOf = (type: string): Channel => CHANNEL_OF_EVENT[type] ?? "PICTURE";

/**
 * Rotate the modality of interrupts so no channel carries three in a row.
 *
 * Only *interrupts* rotate — events at or above `floor` strength, the ones
 * doing the job of re-capturing attention. Low-strength events are texture and
 * are left alone; forcing variety on them would produce a film that twitches.
 *
 * When a run of three is found, the third is re-languaged onto the channel
 * that has been quiet longest. Its `at`, `beat` and `strength` are preserved:
 * the moment was correctly chosen by the rhythm engine, it is only the *kind*
 * of change that was repetitive.
 */
export const rotateModality = (events: AttentionEvent[], floor = 0.55): AttentionEvent[] => {
  const out = events.map((e) => ({ ...e }));
  const lastUsed = new Map<Channel, number>();
  const recent: Channel[] = [];

  for (let i = 0; i < out.length; i++) {
    const e = out[i];
    const ch = channelOf(e.type);
    if (e.strength < floor) continue;

    if (recent.length >= 2 && recent[recent.length - 1] === ch && recent[recent.length - 2] === ch) {
      // Pick the channel idle longest, excluding the one we're escaping.
      const target = CHANNELS.filter((c) => c !== ch).sort(
        (a, b) => (lastUsed.get(a) ?? -Infinity) - (lastUsed.get(b) ?? -Infinity),
      )[0];
      const options = BY_CHANNEL[target];
      // Deterministic choice: the beat number picks within the channel, so the
      // same script always produces the same rotation.
      e.type = options[e.beat % options.length];
      recent.push(target);
      lastUsed.set(target, e.at);
    } else {
      recent.push(ch);
      lastUsed.set(ch, e.at);
    }
    if (recent.length > 3) recent.shift();
  }
  return out;
};

/**
 * Escalation: the novelty ceiling should rise across a film, not stay flat.
 *
 * A device that opened the film at strength 0.7 has to be louder at 8:00 to
 * produce the same response, because the viewer has spent eight minutes
 * building a model of what this film does. The curve is gentle — a 25% lift
 * across the whole runtime — because the alternative reading of "escalate" is
 * the one MrBeast publicly walked back: everything louder than everything
 * else, which is exhausting rather than exciting.
 */
export const escalate = (strength: number, progress: number): number =>
  Number(clamp(strength * (1 + 0.25 * clamp(progress, 0, 1)), 0, 1).toFixed(3));

/** The full pass: habituation-adjusted strengths, escalation, then rotation.
 *  Order matters — rotation must see the adjusted strengths so that it only
 *  moves events that are still doing interrupt work. */
export const applyHabituation = (events: AttentionEvent[], duration: number): AttentionEvent[] => {
  const sorted = [...events].sort((a, b) => a.at - b.at);
  const adjusted = sorted.map((e) => ({
    ...e,
    strength: escalate(effectiveStrength(sorted, e), duration > 0 ? e.at / duration : 0),
  }));
  return rotateModality(adjusted);
};

/** A diagnosis surface: mean familiarity per channel over the runtime, so a
 *  report can say "this film is 62% picture" without anyone counting. */
export const channelMix = (events: AttentionEvent[]): Record<Channel, number> => {
  const counts: Record<string, number> = {};
  const strong = events.filter((e) => e.strength >= 0.55);
  for (const e of strong) {
    const c = channelOf(e.type);
    counts[c] = (counts[c] ?? 0) + 1;
  }
  const total = Math.max(1, strong.length);
  const out = {} as Record<Channel, number>;
  for (const c of CHANNELS) out[c] = Number(((counts[c] ?? 0) / total).toFixed(3));
  return out;
};
