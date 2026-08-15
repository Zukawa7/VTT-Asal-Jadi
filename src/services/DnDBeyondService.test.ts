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
