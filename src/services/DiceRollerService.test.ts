import { describe, expect, it } from 'vitest';
import { DiceRollerService } from './DiceRollerService.js';

describe('DiceRollerService', () => {
  it('parses a dice formula and returns a bounded result', () => {
    const result = new DiceRollerService().roll('2d6+4');
    expect(result.formula).toBe('2d6+4');
    expect(result.rolls).toHaveLength(2);
    expect(result.result).toBeGreaterThanOrEqual(6);
    expect(result.result).toBeLessThanOrEqual(16);
  });

  it('rejects invalid formulas', () => {
    expect(() => new DiceRollerService().roll('not-a-roll')).toThrow('Invalid dice formula');
  });

  it('detects natural 20 and natural 1', () => {
    const random = Math.random;
    Math.random = () => 0.999999;
    expect(new DiceRollerService().roll('1d20').critical).toBe('success');
    Math.random = () => 0;
    expect(new DiceRollerService().roll('1d20').critical).toBe('failure');
    Math.random = random;
  });

  it('supports advantage and disadvantage formulas', () => {
    const random = Math.random;
    let index = 0;
    const values = [0, 0.999999];
    Math.random = () => values[index++];
    expect(new DiceRollerService().roll('2d20h1').keptRolls).toEqual([20]);
    index = 0;
    Math.random = () => values[index++];
    expect(new DiceRollerService().roll('2d20l1').keptRolls).toEqual([1]);
    Math.random = random;
  });
});
