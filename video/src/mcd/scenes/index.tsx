// Scene registry: type → component. This table is the only place a scene
// type is wired to a renderer — a story may stage any type in this table, in
// any order, and a new type is a component + one row here (+ a validator row
// in data/validators.ts + cues in data/cues.ts).

import type { ComponentType } from "react";
import type { SceneType } from "../data/storyTypes";
import { Hook } from "./Hook";
import { GlobalScale } from "./GlobalScale";
import { WorldMapScene } from "./WorldMapScene";
import { MoneyScene } from "./MoneyScene";
import { BusinessModel } from "./BusinessModel";
import { DataStory } from "./DataStory";
import { Finale } from "./Finale";
import { TitleCard } from "./TitleCard";
import { RevealCard } from "./RevealCard";

export const SCENE_COMPONENTS: Record<SceneType, ComponentType> = {
  hook: Hook,
  global: GlobalScale,
  map: WorldMapScene,
  money: MoneyScene,
  model: BusinessModel,
  chart: DataStory,
  finale: Finale,
  title: TitleCard,
  reveal: RevealCard,
};

export const SCENE_TYPES = Object.keys(SCENE_COMPONENTS) as SceneType[];
