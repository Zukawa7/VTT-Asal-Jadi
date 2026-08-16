

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DnDBeyondService } from './DnDBeyondService.js';

describe('DnDBeyondService', () => {
  let service: DnDBeyondService;

  beforeEach(() => {
    service = new DnDBeyondService();
    global.fetch = vi.fn();
  });

  it('should fetch and normalize a character correctly', async () => {
    const mockResponse = {
      success: true,
      data: {
        id: 12345,
        name: 'Test Hero',
        avatarUrl: 'http://example.com/avatar.png',
        race: { fullName: 'Human' },
        baseHitPoints: 20,
        removedHitPoints: 5,
        temporaryHitPoints: 2,
        stats: [
          { id: 1, value: 16 }, // str
          { id: 2, value: 14 }, // dex
          { id: 3, value: 12 }, // con
          { id: 4, value: 10 }, // int
          { id: 5, value: 8 },  // wis
          { id: 6, value: 18 }  // cha
        ],
        classes: [
          { level: 3, definition: { name: 'Fighter' } }
        ],
        inventory: [
          {
            id: 1,
            quantity: 1,
            equipped: true,
            isAttuned: false,
            definition: { name: 'Sword', weight: 3 }
          }
        ]
      }
    };

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const character = await service.fetchCharacter('12345');

    expect(global.fetch).toHaveBeenCalledWith('https://character-service.dndbeyond.com/character/v5/character/12345');
    
    expect(character.id).toBe('12345');
    expect(character.name).toBe('Test Hero');
    expect(character.avatarUrl).toBe('http://example.com/avatar.png');
    expect(character.race).toBe('Human');
    expect(character.level).toBe(3);
    
    expect(character.hp.max).toBe(20);
    expect(character.hp.current).toBe(15);
    expect(character.hp.temp).toBe(2);

    expect(character.stats.str).toBe(16);
    expect(character.modifiers.str).toBe(3);
    expect(character.stats.wis).toBe(8);
    expect(character.modifiers.wis).toBe(-1);

    expect(character.equipment!).toHaveLength(1);
    expect(character.equipment![0].name).toBe('Sword');
  });

  it('normalizes extended character fields from grouped D&D Beyond payloads', async () => {
    const payload = { success: true, data: { id: 77, name: 'Zaaderedaaz', currentXp: 900, armorClass: 16, alignmentId: 6, inspiration: true, currencies: { cp: 1, sp: 2, gp: 30, pp: 4 }, race: { fullName: 'Elf', weightSpeeds: { normal: { walk: 35 } }, racialTraits: [{ definition: { name: 'Darkvision' } }] }, stats: [{ id: 1, value: 10 }, { id: 2, value: 16 }, { id: 3, value: 12 }, { id: 4, value: 14 }, { id: 5, value: 10 }, { id: 6, value: 8 }], classes: [{ level: 3, hitDiceUsed: 1, definition: { name: 'Wizard', hitDice: 6 }, classFeatures: [{ definition: { name: 'Arcane Recovery' } }] }], modifiers: { race: [{ type: 'resistance', subType: 'fire' }, { type: 'proficiency', subType: 'perception' }], class: [{ type: 'proficiency', subType: 'intelligence-saving-throws' }, { type: 'proficiency', subType: 'simple-weapons' }], item: [{ type: 'immunity', subType: 'poison' }] }, inventory: [{ id: 9, equipped: true, definition: { name: 'Dagger', filterType: 'Weapon', properties: ['Finesse'], damage: { diceString: '1d4' }, range: 20, longRange: 60 } }], actions: { class: [{ name: 'Arcane Recovery', limitedUse: { maxUses: 1, numberUsed: 0, resetType: 2 } }] }, classSpells: [{ spells: [{ definition: { name: 'Fire Bolt', level: 0 }, prepared: true }] }], background: { definition: { name: 'Sage', shortDescription: 'Researcher' } }, traits: { personalityTraits: 'Curious\\nQuiet' } } };
    vi.mocked(global.fetch).mockResolvedValueOnce({ ok: true, json: async () => payload } as Response);
    const character = await service.fetchCharacter('77');
    expect(character).toMatchObject({ ac: 16, speed: 35, alignment: 'Chaotic Neutral', xp: 900 });
    expect(character.currencies).toMatchObject({ cp: 1, sp: 2, gp: 30, pp: 4 });
    expect(character.damageResistances).toEqual(['Fire']);
    expect(character.damageImmunities).toEqual(['Poison']);
    expect(character.proficiencies?.saves).toEqual(['int']);
    expect(character.proficiencies?.skills).toEqual(['Perception']);
    expect(character.hitDice).toMatchObject({ current: 2, max: 3, dieType: 6 });
    expect(character.resources?.[0]).toMatchObject({ name: 'Arcane Recovery', current: 1, max: 1, resetOn: 'long rest' });
    expect(character.equipment?.[0]).toMatchObject({ category: 'weapon', damage: '1d4+3', range: '20/60 ft.' });
    expect(character.spells?.[0]).toMatchObject({ name: 'Fire Bolt', level: 0, prepared: true, saveDC: 12 });
    expect(character.features?.map((feature) => feature.name)).toEqual(['Arcane Recovery', 'Darkvision']);
    expect(character.background).toEqual({ name: 'Sage', description: 'Researcher' });
    expect(character.personalityTraits).toEqual(['Curious', 'Quiet']);
  });

  it('should throw error on failed fetch', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404
    } as Response);

    await expect(service.fetchCharacter('12345')).rejects.toThrow('D&D Beyond request failed (404)');
  });

  it('should throw error on invalid response payload', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false })
    } as Response);

    await expect(service.fetchCharacter('12345')).rejects.toThrow('Invalid D&D Beyond character response');
  });

  it('should handle missing data fields gracefully', async () => {
    const mockResponse = {
      success: true,
      data: {
        id: 999
        // missing name, stats, classes, etc.
      }
    };

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const character = await service.fetchCharacter('999');
    expect(character.name).toBe('Unnamed Character');
    expect(character.stats.str).toBe(10); // default
    expect(character.modifiers.str).toBe(0);
    expect(character.level).toBe(0);
  });
});
