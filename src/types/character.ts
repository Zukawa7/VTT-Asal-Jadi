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

export interface EquipmentItem {
  id?: string | number;
  name: string;
  quantity?: number;
  weight?: number;
  equipped?: boolean;
  attuned?: boolean;
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
  equipment?: EquipmentItem[];
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
