import type { Character, DndBeyondCharacterResponse, EquipmentItem } from '../types/character.js';

const DEFAULT_AVATAR = 'https://www.dndbeyond.com/content/skins/waterdeep/images/characters/default-avatar.png';

export class DnDBeyondService {
  constructor(private readonly baseUrl = 'https://character-service.dndbeyond.com') {}

  async fetchCharacter(characterId: string): Promise<Character> {
    const response = await fetch(`${this.baseUrl}/character/v5/character/${characterId}`);
    if (!response.ok) throw new Error(`D&D Beyond request failed (${response.status})`);
    const payload = (await response.json()) as DndBeyondCharacterResponse;
    if (!payload.success || !payload.data) throw new Error('Invalid D&D Beyond character response');
    return this.normalize(payload.data);
  }

  private normalize(data: Record<string, unknown>): Character {
    const stats = (data.stats as Array<{ id: number; value: number | null }> | undefined) ?? [];
    const readStat = (id: number): number => stats.find((stat) => stat.id === id)?.value ?? 10;
    const values = { str: readStat(1), dex: readStat(2), con: readStat(3), int: readStat(4), wis: readStat(5), cha: readStat(6) };
    const modifiers: Character['modifiers'] = {
      str: Math.floor((values.str - 10) / 2), dex: Math.floor((values.dex - 10) / 2), con: Math.floor((values.con - 10) / 2),
      int: Math.floor((values.int - 10) / 2), wis: Math.floor((values.wis - 10) / 2), cha: Math.floor((values.cha - 10) / 2),
    };
    const classes = ((data.classes as Array<{ level: number; definition?: { name?: string } }> | undefined) ?? [])
      .map((item) => ({ name: item.definition?.name ?? 'Unknown', level: item.level }));
    const equipment: EquipmentItem[] = ((data.inventory as Array<{ id?: number; quantity?: number; equipped?: boolean; isAttuned?: boolean; definition?: { name?: string; weight?: number } }> | undefined) ?? [])
      .map((item) => ({ id: item.id, name: item.definition?.name ?? 'Unknown Item', quantity: item.quantity ?? 1, weight: item.definition?.weight ?? 0, equipped: item.equipped ?? false, attuned: item.isAttuned ?? false }));
    const level = classes.reduce((total, item) => total + item.level, 0);
    const maxHp = Number(data.overrideHitPoints ?? data.baseHitPoints ?? 0);
    return {
      id: String(data.id), name: String(data.name ?? 'Unnamed Character'),
      avatarUrl: String(data.avatarUrl ?? (data.decorations as { avatarUrl?: string } | undefined)?.avatarUrl ?? DEFAULT_AVATAR),
      race: String((data.race as { fullName?: string } | undefined)?.fullName ?? 'Unknown Race'),
      classes, level, hp: { current: maxHp - Number(data.removedHitPoints ?? 0), max: maxHp, temp: Number(data.temporaryHitPoints ?? 0) }, stats: values, modifiers, equipment,
    };
  }
}
