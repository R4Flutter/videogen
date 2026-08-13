import { Easing } from "remotion";

// Curated easing curves shared across the whole engine.
// Named curves live here so scenes stay declarative about intent,
// not about raw easing math.

export const EASE_OUT = Easing.out(Easing.cubic);
export const EASE_IN = Easing.in(Easing.cubic);
export const EASE_IN_OUT = Easing.inOut(Easing.cubic);
export const EASE_IN_OUT_QUART = Easing.inOut(Easing.poly(4));
export const EASE_OUT_QUINT = Easing.out(Easing.poly(5));
export const EASE_OUT_EXPO = Easing.out(Easing.exp);
export const EASE_OUT_BACK = Easing.out(Easing.back(1.6));

// A gentle "arrive" curve: accelerates quickly, then eases into a hold.
export const EASE_ARRIVE = Easing.bezier(0.16, 1, 0.3, 1);