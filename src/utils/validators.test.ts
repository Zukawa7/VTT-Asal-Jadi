import { describe, expect, it } from 'vitest';
import {
  validateCharacterId,
  validateDiceFormula,
  validateRoomId,
  validateUsername,
} from './validators.js';

describe('validators', () => {
  it('validates safe room IDs', () => {
    expect(validateRoomId('campaign-1')).toBe(true);
    expect(validateRoomId('../admin')).toBe(false);
  });

  it('validates character IDs and usernames', () => {
    expect(validateCharacterId('123456')).toBe(true);
    expect(validateCharacterId('abc')).toBe(false);
    expect(validateUsername('player_1')).toBe(true);
    expect(validateUsername('a')).toBe(false);
  });

  it('validates supported dice formulas', () => {
    expect(validateDiceFormula('2d6+4')).toBe(true);
    expect(validateDiceFormula('1d20')).toBe(true);
    expect(validateDiceFormula('2d6; DROP TABLE users')).toBe(false);
  });
});
