export interface DiceRoll {
  formula: string;
  rolls: number[];
  modifier: number;
  result: number;
  critical: 'success' | 'failure' | null;
}

export class DiceRollerService {
  roll(formula: string): DiceRoll {
    const normalized = formula.toLowerCase().replace(/\s/g, '');
    const match = normalized.match(/^(\d*)d(\d+)([+-]\d+)?$/);
    if (!match) throw new Error('Invalid dice formula');
    const count = Math.min(Math.max(Number(match[1] || 1), 1), 100);
    const sides = Math.min(Math.max(Number(match[2]), 2), 1000);
    const modifier = Number(match[3] || 0);
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const result = rolls.reduce((sum, value) => sum + value, modifier);
    const critical = sides === 20 && count === 1
      ? rolls[0] === 20 ? 'success' : rolls[0] === 1 ? 'failure' : null
      : null;
    return { formula: normalized, rolls, modifier, result, critical };
  }
}
