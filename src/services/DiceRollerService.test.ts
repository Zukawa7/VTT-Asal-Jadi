import { describe, expect, it, vi } from 'vitest';
import { DiceRollerService } from './DiceRollerService.js';

describe('DiceRollerService', () => {
  it('parses a dice formula and returns a bounded result', () => {
    const result = new DiceRollerService().roll('2d6+4');
    expect(result.formula).toBe('2d6+4');
    expect(result.rolls).toHaveLength(2);
    expect(result.result).toBeGreaterThanOrEqual(6);
    expect(result.result).toBeLessThanOrEqual(16);
  });

  it('supports advantage and disadvantage notation', () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.9);
    const advantage = new DiceRollerService().roll('2d20h1');
    expect(advantage.rolls).toEqual([3, 19]);
    expect(advantage.keptRolls).toEqual([19]);
    vi.restoreAllMocks();

    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.9);
    const disadvantage = new DiceRollerService().roll('2d20l1');
    expect(disadvantage.keptRolls).toEqual([3]);
    vi.restoreAllMocks();
  });

  it('supports ability checks and saving throws', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const roller = new DiceRollerService();
    expect(roller.abilityCheck('Strength', 3, 2).result).toBe(16);
    expect(roller.savingThrow('Wisdom', 1, 3).label).toBe('Wisdom Saving Throw');
    vi.restoreAllMocks();
  });

  it('rejects invalid formulas', () => {
    expect(() => new DiceRollerService().roll('not-a-roll')).toThrow('Invalid dice formula');
    expect(() => new DiceRollerService().roll('2d20h3')).toThrow('Invalid dice keep count');
  });

  it('detects natural 20 and natural 1', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    expect(new DiceRollerService().roll('1d20').critical).toBe('success');
    vi.mocked(Math.random).mockReturnValue(0);
    expect(new DiceRollerService().roll('1d20').critical).toBe('failure');
    vi.restoreAllMocks();
  });
});
