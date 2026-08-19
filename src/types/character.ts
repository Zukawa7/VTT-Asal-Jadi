export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface CharacterClass {
  name: string;
  level: number;
  isStarting?: boolean;
}
export interface HitPoints {
  current: number;
  max: number;
  temp: number;
}
export interface SpellSlot {
  current: number;
  max: number;
}
export type SpellSlots = Record<string, SpellSlot>;
export interface Currency {
  cp: number;
  sp: number;
  ep?: number;
  gp: number;
  pp: number;
}
export interface Proficiencies {
  saves: AbilityKey[];
  skills: string[];
}
export interface ProficiencyDetails {
  armor: string[];
  weapons: string[];
  tools: string[];
  languages: string[];
}
export interface Resource {
  name: string;
  current: number;
  max: number;
  resetOn?: string;
}
export interface HitDice {
  current: number;
  max: number;
  dieType: number;
}
export interface Spell {
  name: string;
  level: number;
  prepared?: boolean;
  attackBonus?: number;
  saveDC?: number;
  damage?: string;
  castingTime?: string;
  range?: string;
  components?: string;
  duration?: string;
  source?: string;
}

export interface DeathSaves {
  successes: number;
  failures: number;
}
export interface Feature {
  name: string;
  description?: string;
  category: string;
  source?: string;
  usesResourceName?: string;
}
export interface Background {
  name?: string;
  description?: string;
}

export interface EquipmentItem {
  id?: string | number;
  name: string;
  quantity?: number;
  weight?: number;
  equipped?: boolean;
  attuned?: boolean;
  category?: 'Equipment' | 'Backpack';
  isWeapon?: boolean;
  type?: string;
  attackBonus?: number;
  damage?: string;
  range?: string;
  description?: string;
}

export interface Character {
  id: string | number;
  name: string;
  avatarUrl: string;
  race: string;
  classes: CharacterClass[];
  level: number;
  hp: HitPoints;
  stats: AbilityScores;
  modifiers: AbilityScores;
  ac?: number | null;
  currencies?: Currency;
  inspiration?: boolean;
  speed?: number;
  alignment?: string;
  xp?: number;
  damageImmunities?: string[];
  damageResistances?: string[];
  damageVulnerabilities?: string[];
  conditions?: string[];
  proficiencies?: Proficiencies;
  proficiencyDetails?: ProficiencyDetails;
  resources?: Resource[];
  hitDice?: HitDice;
  equipment?: EquipmentItem[];
  spells?: Spell[];
  features?: Feature[];
  traits?: Feature[];
  background?: Background;
  personalityTraits?: string[];
  ideals?: string[];
  bonds?: string[];
  flaws?: string[];
  spellSlots?: SpellSlots;
  deathSaves?: DeathSaves;
  senses?: string[];
  notes?: string;
}

export interface DndBeyondCharacterResponse {
  success: boolean;
  data?: Record<string, unknown>;
  message?: string;
}
export interface DndBeyondStat {
  id: number;
  value: number | null;
}

export interface DndBeyondModifier {
  type?: string;
  subType?: string;
}
export interface DndBeyondLimitedUse {
  maxUses?: number;
  numberUsed?: number;
  resetType?: number;
}
