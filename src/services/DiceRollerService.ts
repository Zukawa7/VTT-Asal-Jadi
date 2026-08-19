export type CriticalResult = 'success' | 'failure' | null;

export interface DiceRoll {
  formula: string;
  rolls: number[];
  modifier: number;
  result: number;
  critical: CriticalResult;
  keptRolls: number[];
}

export interface CheckRoll extends DiceRoll {
  label: string;
  ability?: string;
  proficiencyBonus?: number;
}

export class DiceRollerService {
  roll(formula: string): DiceRoll {
    const normalized = formula.toLowerCase().replace(/\s/g, '');
    const match = normalized.match(/^(\d*)d(\d+)([hl]\d+)?([+-]\d+)?$/);
    if (!match) throw new Error('Invalid dice formula');
    const count = Math.min(Math.max(Number(match[1] || 1), 1), 100);
    const sides = Math.min(Math.max(Number(match[2]), 2), 1000);
    const keepMode = match[3]?.[0];
    const keepCount = match[3] ? Number(match[3].slice(1)) : count;
    if (keepCount < 1 || keepCount > count) throw new Error('Invalid dice keep count');
    const modifier = Number(match[4] || 0);
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const keptRolls =
      keepMode === 'h'
        ? [...rolls].sort((a, b) => b - a).slice(0, keepCount)
        : keepMode === 'l'
          ? [...rolls].sort((a, b) => a - b).slice(0, keepCount)
          : rolls;
    const result = keptRolls.reduce((sum, value) => sum + value, modifier);
    const criticalRoll = keptRolls.length === 1 ? keptRolls[0] : undefined;
    const critical =
      sides === 20 && criticalRoll !== undefined
        ? criticalRoll === 20
          ? 'success'
          : criticalRoll === 1
            ? 'failure'
            : null
        : null;
    return { formula: normalized, rolls, keptRolls, modifier, result, critical };
  }

  abilityCheck(label: string, modifier: number, proficiencyBonus = 0): CheckRoll {
    const roll = this.roll(
      `1d20${modifier + proficiencyBonus >= 0 ? '+' : ''}${modifier + proficiencyBonus}`,
    );
    return { ...roll, label, proficiencyBonus };
  }

  savingThrow(label: string, modifier: number, proficiencyBonus = 0): CheckRoll {
    return {
      ...this.abilityCheck(label, modifier, proficiencyBonus),
      label: `${label} Saving Throw`,
    };
  }
}
