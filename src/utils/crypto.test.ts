import { describe, it, expect } from 'vitest';
import { hashPassword, createSalt, timingSafeEqualText } from './crypto.js';

describe('crypto utils', () => {
  it('should generate a salt', () => {
    const salt = createSalt();
    expect(salt).toBeTypeOf('string');
    expect(salt.length).toBeGreaterThan(0);
  });

  it('should hash a password consistently', () => {
    const salt = 'testsalt';
    const hash1 = hashPassword('password123', salt);
    const hash2 = hashPassword('password123', salt);
    const hash3 = hashPassword('different', salt);

    expect(hash1).toEqual(hash2);
    expect(hash1).not.toEqual(hash3);
  });

  it('should perform timing safe equal', () => {
    expect(timingSafeEqualText('abc', 'abc')).toBe(true);
    expect(timingSafeEqualText('abc', 'def')).toBe(false);
    expect(timingSafeEqualText('abc', 'abcd')).toBe(false);
  });
});
