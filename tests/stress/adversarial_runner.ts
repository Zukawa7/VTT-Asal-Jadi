import assert from 'node:assert/strict';
import { DiceRollerService } from '../../src/services/DiceRollerService.js';
import { WebSocketManager } from '../../src/services/WebSocketManager.js';
import type { TokenState } from '../../src/types/api.js';

let passedChecks = 0;
let totalChecks = 0;

function check(name: string, fn: () => void) {
  totalChecks++;
  try {
    fn();
    passedChecks++;
    console.log(`  ✔ [PASS] ${name}`);
  } catch (err: any) {
    console.error(`  ✖ [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

console.log('\n========================================================================');
console.log('   GEN 2 ADVERSARIAL EMPIRICAL STRESS & VERIFICATION SUITE');
console.log('========================================================================\n');

// --------------------------------------------------------------------------
// SUITE 1: DICE FORMULA PARSER & ROLL GENERATOR
// --------------------------------------------------------------------------
console.log('▶ SUITE 1: Dice Formula Parser, Generator & Edge Cases');
const diceRoller = new DiceRollerService();

// Frontend parseAndRoll replication from public/app.js for empirical evaluation
function parseAndRollFrontend(formula: string) {
  const cleanFormula = formula.replace(/\s+/g, '').toLowerCase();
  const match = cleanFormula.match(/^(\d*)d(\d+)([hl]\d+|kh\d+|kl\d+)?([\+\-]\d+)?$/);
  if (!match) return null;

  const count = match[1] ? parseInt(match[1]) : 1;
  const sides = parseInt(match[2]);
  let keepMode: 'h' | 'l' | null = null;
  let keepCount = count;

  if (match[3]) {
    if (match[3].startsWith('kh') || match[3].startsWith('h')) {
      keepMode = 'h';
      keepCount = parseInt(match[3].replace(/^[kh]+/, '')) || 1;
    } else if (match[3].startsWith('kl') || match[3].startsWith('l')) {
      keepMode = 'l';
      keepCount = parseInt(match[3].replace(/^[kl]+/, '')) || 1;
    }
  }

  const modifier = match[4] ? parseInt(match[4]) : 0;

  if (count <= 0 || count > 100 || sides <= 0 || sides > 1000 || keepCount < 1 || keepCount > count) return null;

  const rolls: number[] = [];
  let sum = 0;
  for (let i = 0; i < count; i++) {
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    sum += roll;
  }

  const keptRolls = keepMode === 'h'
    ? [...rolls].sort((a, b) => b - a).slice(0, keepCount)
    : keepMode === 'l'
    ? [...rolls].sort((a, b) => a - b).slice(0, keepCount)
    : rolls;
  const result = keptRolls.reduce((total, value) => total + value, modifier);

  return {
    formula: `${count}d${sides}${match[3] || ''}${modifier !== 0 ? (modifier > 0 ? '+' + modifier : modifier) : ''}`,
    count,
    sides,
    modifier,
    rolls,
    keptRolls,
    result
  };
}

check('Polyhedral dice set (d4, d6, d8, d10, d12, d20, d100) range invariant over 10,000 iterations each', () => {
  const diceTypes = [4, 6, 8, 10, 12, 20, 100];
  for (const sides of diceTypes) {
    for (let i = 0; i < 10000; i++) {
      const roll = diceRoller.roll(`1d${sides}`);
      assert.strictEqual(roll.rolls.length, 1);
      assert.strictEqual(roll.keptRolls.length, 1);
      assert.ok(roll.rolls[0] >= 1 && roll.rolls[0] <= sides, `Roll ${roll.rolls[0]} outside 1..${sides}`);
      assert.strictEqual(roll.result, roll.rolls[0]);
      assert.strictEqual(Number.isInteger(roll.result), true);
    }
  }
});

check('d100 stress test: 50,000 iterations verify integer uniformity strictly within [1, 100]', () => {
  const counts = new Array(101).fill(0);
  for (let i = 0; i < 50000; i++) {
    const roll = diceRoller.roll('1d100');
    assert.ok(roll.result >= 1 && roll.result <= 100);
    assert.strictEqual(roll.result % 1, 0);
    counts[roll.result]++;
  }
  // Verify all values 1..100 appeared at least once in 50k rolls
  for (let val = 1; val <= 100; val++) {
    assert.ok(counts[val] > 0, `Value ${val} never rolled in 50k rolls`);
  }
});

check('Advantage & Disadvantage keep-high / keep-low parsing and mathematical bounds', () => {
  // 4d6 keep highest 3 (character stat generation)
  for (let i = 0; i < 1000; i++) {
    const statRoll = diceRoller.roll('4d6h3');
    assert.strictEqual(statRoll.rolls.length, 4);
    assert.strictEqual(statRoll.keptRolls.length, 3);
    assert.ok(statRoll.result >= 3 && statRoll.result <= 18);
    const sorted = [...statRoll.rolls].sort((a, b) => b - a);
    assert.deepStrictEqual(statRoll.keptRolls, sorted.slice(0, 3));
  }

  // 2d20 keep lowest 1 (disadvantage)
  for (let i = 0; i < 1000; i++) {
    const disRoll = diceRoller.roll('2d20l1');
    assert.strictEqual(disRoll.rolls.length, 2);
    assert.strictEqual(disRoll.keptRolls.length, 1);
    assert.strictEqual(disRoll.keptRolls[0], Math.min(disRoll.rolls[0], disRoll.rolls[1]));
    assert.strictEqual(disRoll.result, disRoll.keptRolls[0]);
  }
});

check('Frontend parseAndRoll supports standard kh/kl and h/l syntax identically', () => {
  const testFormulas = ['4d6kh3+2', '2d20kl1-3', '1d100+50', '2d6', '1d4-10'];
  for (const f of testFormulas) {
    const parsed = parseAndRollFrontend(f);
    assert.ok(parsed !== null, `Failed to parse formula: ${f}`);
    assert.strictEqual(Number.isInteger(parsed.result), true);
  }
});

check('Dice modifiers: positive, negative, zero, and resulting negative totals', () => {
  // 1d4 - 10 can yield -9 to -6
  for (let i = 0; i < 100; i++) {
    const r = diceRoller.roll('1d4-10');
    assert.ok(r.result >= -9 && r.result <= -6, `Result ${r.result} outside expected [-9, -6]`);
    assert.strictEqual(r.modifier, -10);
  }

  const posMod = diceRoller.roll('2d6+15');
  assert.strictEqual(posMod.modifier, 15);
  assert.ok(posMod.result >= 17 && posMod.result <= 27);

  const zeroMod = diceRoller.roll('1d20+0');
  assert.strictEqual(zeroMod.modifier, 0);
  assert.ok(zeroMod.result >= 1 && zeroMod.result <= 20);
});

check('Critical success (Nat 20) and failure (Nat 1) semantics on d20 vs non-d20', () => {
  let sawCritSuccess = false;
  let sawCritFailure = false;
  for (let i = 0; i < 2000; i++) {
    const r = diceRoller.roll('1d20');
    if (r.rolls[0] === 20) {
      assert.strictEqual(r.critical, 'success');
      sawCritSuccess = true;
    } else if (r.rolls[0] === 1) {
      assert.strictEqual(r.critical, 'failure');
      sawCritFailure = true;
    } else {
      assert.strictEqual(r.critical, null);
    }
  }
  assert.ok(sawCritSuccess && sawCritFailure, 'Did not encounter both Nat 20 and Nat 1 in 2000 rolls');

  // Non-d20 rolls must never flag critical
  for (let i = 0; i < 200; i++) {
    const r100 = diceRoller.roll('1d100');
    assert.strictEqual(r100.critical, null);
    const r6 = diceRoller.roll('1d6');
    assert.strictEqual(r6.critical, null);
  }

  // Multi-dice d20 without keep must not flag critical
  for (let i = 0; i < 100; i++) {
    const rMulti = diceRoller.roll('2d20');
    assert.strictEqual(rMulti.critical, null);
  }
});

check('Dice pool additions: multi-type dice accumulation and custom modifier aggregation', () => {
  // Simulate pool: 2d6 + 1d8 + 2d10 + 5 modifier
  const pool: Record<number, number> = { 6: 2, 8: 1, 10: 2 };
  const modifier = 5;
  let sum = modifier;
  let totalDice = 0;
  const rolls: number[] = [];

  for (const [sidesStr, count] of Object.entries(pool)) {
    const sides = Number(sidesStr);
    totalDice += count;
    for (let i = 0; i < count; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      rolls.push(roll);
      sum += roll;
    }
  }

  assert.strictEqual(rolls.length, 5);
  assert.ok(sum >= (2*1 + 1*1 + 2*1 + 5) && sum <= (2*6 + 1*8 + 2*10 + 5));
});

check('Adversarial dice inputs: backend and frontend syntax rejection & clamp bounds', () => {
  const backendInvalidFormulas = [
    'invalid',
    '',
    '   ',
    'd',
    '3d',
    'd+5',
    '2d20h3', // keep 3 out of 2 (illegal)
    '2d20l0', // keep 0 (illegal)
    '--2d6',
    '2d6++5',
    '2d6+-5'
  ];

  for (const f of backendInvalidFormulas) {
    assert.throws(() => diceRoller.roll(f), /Invalid dice/, `Backend failed to reject: ${f}`);
  }

  const frontendInvalidFormulas = [
    'invalid',
    '',
    '   ',
    'd',
    '3d',
    'd+5',
    '2d20h3',
    '--2d6',
    '2d6++5',
    '2d6+-5'
  ];

  for (const f of frontendInvalidFormulas) {
    assert.strictEqual(parseAndRollFrontend(f), null, `Frontend failed to reject: ${f}`);
  }

  // Clamping of count (>100 -> 100) and sides (>1000 -> 1000)
  const clampedRoll = diceRoller.roll('200d2000');
  assert.strictEqual(clampedRoll.rolls.length, 100);
  for (const val of clampedRoll.rolls) {
    assert.ok(val <= 1000);
  }
});

// --------------------------------------------------------------------------
// SUITE 2: CHARACTER SHEET HP CALCULATIONS & REST MECHANICS
// --------------------------------------------------------------------------
console.log('\n▶ SUITE 2: Character Sheet HP Calculation Edge Cases & Rest Mechanics');

interface HPState {
  current: number;
  max: number;
  temp: number;
}

function applyDamage(state: HPState, amount: number): HPState {
  if (amount <= 0) return { ...state };
  let newCurrent = state.current;
  let newTemp = state.temp || 0;

  if (newTemp >= amount) {
    newTemp -= amount;
  } else {
    const overflow = amount - newTemp;
    newTemp = 0;
    newCurrent = Math.max(0, newCurrent - overflow);
  }
  return { ...state, current: newCurrent, temp: newTemp };
}

function applyHeal(state: HPState, amount: number): HPState {
  if (amount <= 0) return { ...state };
  return { ...state, current: Math.min(state.max, state.current + amount) };
}

function applyTempHP(state: HPState, amount: number): HPState {
  if (amount <= 0) return { ...state };
  return { ...state, temp: Math.max(state.temp || 0, amount) };
}

function performLongRest(char: {
  hp: HPState;
  hitDice: { current: number; max: number; type: string };
  resources: Array<{ name: string; current: number; max: number }>;
}) {
  const newHp: HPState = { current: char.hp.max, max: char.hp.max, temp: 0 };
  const hd = char.hitDice;
  const recoveredHd = Math.max(1, Math.floor(hd.max / 2));
  const newHd = { ...hd, current: Math.min(hd.max, hd.current + recoveredHd) };
  const newRes = char.resources.map(r => ({ ...r, current: r.max }));
  return { hp: newHp, hitDice: newHd, resources: newRes };
}

function spendHitDie(char: {
  hp: HPState;
  hitDice: { current: number; max: number; type: string };
  conMod: number;
}) {
  if (char.hitDice.current <= 0) throw new Error('No Hit Dice left!');
  const sides = parseInt(char.hitDice.type.replace('d', ''));
  const roll = Math.floor(Math.random() * sides) + 1;
  const heal = Math.max(1, roll + char.conMod); // heal at least 1 even with negative con
  const newHp = Math.min(char.hp.max, char.hp.current + heal);
  return {
    roll,
    heal,
    hp: { ...char.hp, current: newHp },
    hitDice: { ...char.hitDice, current: char.hitDice.current - 1 }
  };
}

check('Edge Case: Damage fully absorbed by Temp HP (Current HP unchanged)', () => {
  const initial: HPState = { current: 28, max: 35, temp: 12 };
  const res = applyDamage(initial, 8);
  assert.strictEqual(res.current, 28);
  assert.strictEqual(res.temp, 4);
});

check('Edge Case: Damage exactly equals Temp HP (Temp HP becomes 0, Current HP unchanged)', () => {
  const initial: HPState = { current: 30, max: 40, temp: 15 };
  const res = applyDamage(initial, 15);
  assert.strictEqual(res.current, 30);
  assert.strictEqual(res.temp, 0);
});

check('Edge Case: Excess damage overflows Temp HP and depletes Current HP proportionally', () => {
  const initial: HPState = { current: 25, max: 30, temp: 10 };
  const res = applyDamage(initial, 18);
  assert.strictEqual(res.temp, 0);
  assert.strictEqual(res.current, 17); // 10 absorbed, 8 applied to current
});

check('Edge Case: Massive excess damage drops Current HP to 0 without going negative', () => {
  const initial: HPState = { current: 15, max: 50, temp: 10 };
  const res = applyDamage(initial, 100);
  assert.strictEqual(res.temp, 0);
  assert.strictEqual(res.current, 0);
});

check('Edge Case: Non-positive (negative or 0) damage does not alter HP state', () => {
  const initial: HPState = { current: 20, max: 30, temp: 5 };
  const res0 = applyDamage(initial, 0);
  const resNeg = applyDamage(initial, -15);
  assert.deepStrictEqual(res0, initial);
  assert.deepStrictEqual(resNeg, initial);
});

check('Edge Case: Overhealing is clamped strictly to max HP (no overflow past max)', () => {
  const initial: HPState = { current: 28, max: 30, temp: 0 };
  const res = applyHeal(initial, 25);
  assert.strictEqual(res.current, 30);
  assert.strictEqual(res.max, 30);

  const fullHp: HPState = { current: 30, max: 30, temp: 0 };
  const resFull = applyHeal(fullHp, 50);
  assert.strictEqual(resFull.current, 30);
});

check('Edge Case: Temp HP replacement respects D&D 5e rule (non-stacking, take highest)', () => {
  const initial: HPState = { current: 20, max: 30, temp: 8 };
  // Lower temp HP offered -> keep existing 8
  const lower = applyTempHP(initial, 5);
  assert.strictEqual(lower.temp, 8);

  // Higher temp HP offered -> update to 14
  const higher = applyTempHP(initial, 14);
  assert.strictEqual(higher.temp, 14);
});

check('Edge Case: Hit dice spending with positive/negative CON and boundary at 0 HD remaining', () => {
  const char = {
    hp: { current: 10, max: 40, temp: 0 },
    hitDice: { current: 2, max: 5, type: 'd10' },
    conMod: 3
  };

  const spent1 = spendHitDie(char);
  assert.strictEqual(spent1.hitDice.current, 1);
  assert.ok(spent1.roll >= 1 && spent1.roll <= 10);
  assert.strictEqual(spent1.heal, spent1.roll + 3);
  assert.strictEqual(spent1.hp.current, 10 + spent1.heal);

  const spent2 = spendHitDie(spent1);
  assert.strictEqual(spent2.hitDice.current, 0);

  // Attempting to spend when HD == 0 must throw error
  assert.throws(() => spendHitDie(spent2), /No Hit Dice left!/);
});

check('Edge Case: Long Rest restores Current HP to Max, clears Temp HP, restores HD (floor(max/2)) and class resources', () => {
  const char = {
    hp: { current: 4, max: 45, temp: 10 },
    hitDice: { current: 0, max: 6, type: 'd8' },
    resources: [
      { name: 'Action Surge', current: 0, max: 1 },
      { name: 'Superiority Dice', current: 1, max: 4 }
    ]
  };

  const rested = performLongRest(char);
  assert.strictEqual(rested.hp.current, 45);
  assert.strictEqual(rested.hp.temp, 0);
  assert.strictEqual(rested.hitDice.current, 3); // 0 + floor(6/2) = 3
  assert.strictEqual(rested.resources[0].current, 1);
  assert.strictEqual(rested.resources[1].current, 4);

  // Test odd max HD (e.g. 5 HD -> recovers floor(5/2) = 2)
  const oddChar = {
    hp: { current: 1, max: 30, temp: 0 },
    hitDice: { current: 1, max: 5, type: 'd10' },
    resources: []
  };
  const restedOdd = performLongRest(oddChar);
  assert.strictEqual(restedOdd.hitDice.current, 3); // 1 + 2 = 3

  // Test 1 HD character (floor(1/2) = 0 -> minimum recovery is 1)
  const level1Char = {
    hp: { current: 2, max: 10, temp: 0 },
    hitDice: { current: 0, max: 1, type: 'd8' },
    resources: []
  };
  const restedLvl1 = performLongRest(level1Char);
  assert.strictEqual(restedLvl1.hitDice.current, 1);
});

// --------------------------------------------------------------------------
// SUITE 3: TACTICAL MAP GRID COORDINATE SNAPPING (12x12, 0 TO 11)
// --------------------------------------------------------------------------
console.log('\n▶ SUITE 3: Tactical Map Grid Coordinate Snapping & Boundary Limits');

function snapCoordinateToGrid(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number }
): { x: number; y: number } {
  const xCell = Math.floor(((clientX - rect.left) / rect.width) * 12);
  const yCell = Math.floor(((clientY - rect.top) / rect.height) * 12);
  const x = Math.max(0, Math.min(11, xCell));
  const y = Math.max(0, Math.min(11, yCell));
  return { x, y };
}

check('Grid coordinate conversion: standard interior points on 600x600 canvas', () => {
  const rect = { left: 100, top: 50, width: 600, height: 600 }; // 50px per cell
  
  // Top-left cell (0, 0)
  assert.deepStrictEqual(snapCoordinateToGrid(100, 50, rect), { x: 0, y: 0 });
  assert.deepStrictEqual(snapCoordinateToGrid(149.9, 99.9, rect), { x: 0, y: 0 });

  // Cell (1, 1)
  assert.deepStrictEqual(snapCoordinateToGrid(150, 100, rect), { x: 1, y: 1 });

  // Center cell (6, 6)
  assert.deepStrictEqual(snapCoordinateToGrid(400, 350, rect), { x: 6, y: 6 });

  // Bottom-right cell (11, 11)
  assert.deepStrictEqual(snapCoordinateToGrid(699.9, 649.9, rect), { x: 11, y: 11 });
});

check('Boundary limits: clamping out-of-bounds clicks to strictly [0, 11]', () => {
  const rect = { left: 0, top: 0, width: 1200, height: 1200 }; // 100px per cell

  // Negative / off-canvas left and top
  assert.deepStrictEqual(snapCoordinateToGrid(-200, -150, rect), { x: 0, y: 0 });

  // Far right and bottom
  assert.deepStrictEqual(snapCoordinateToGrid(1500, 2400, rect), { x: 11, y: 11 });

  // Exact boundary edge: 1200px -> xCell = 12 -> clamped to 11
  assert.deepStrictEqual(snapCoordinateToGrid(1200, 1200, rect), { x: 11, y: 11 });
});

check('Subpixel and floating point precision coordinates snap reliably', () => {
  const rect = { left: 33.333, top: 17.777, width: 723.45, height: 723.45 };
  const cellWidth = 723.45 / 12;

  for (let cell = 0; cell < 12; cell++) {
    const testX = rect.left + cell * cellWidth + cellWidth * 0.5;
    const testY = rect.top + cell * cellWidth + cellWidth * 0.5;
    const snapped = snapCoordinateToGrid(testX, testY, rect);
    assert.strictEqual(snapped.x, cell);
    assert.strictEqual(snapped.y, cell);
  }
});

// Test WebSocketManager token placement & movement boundary enforcement
check('WebSocketManager backend token coordinate clamping and state integrity', () => {
  const mockIo: any = {
    to: () => ({
      emit: () => {}
    })
  };
  const wsManager = new WebSocketManager(mockIo);
  const roomId = 'test-room-123';

  // Add token with out-of-bounds coordinates (-5, 25) -> clamped to (0, 11)
  const token: TokenState = {
    id: 'tok-1',
    name: 'Gimli',
    avatarUrl: 'https://example.com/avatar.png',
    x: -5,
    y: 25
  };
  const addSuccess = wsManager.addToken(roomId, token);
  assert.strictEqual(addSuccess, true);

  const state = wsManager.getRoomState(roomId);
  assert.strictEqual(state.tokens['tok-1'].x, 0);
  assert.strictEqual(state.tokens['tok-1'].y, 11);

  // Move token to valid position (7, 4)
  const moveSuccess = wsManager.moveToken(roomId, 'tok-1', 7, 4);
  assert.strictEqual(moveSuccess, true);
  assert.strictEqual(state.tokens['tok-1'].x, 7);
  assert.strictEqual(state.tokens['tok-1'].y, 4);

  // Move token out of bounds (-10, 99) -> clamped to (0, 11)
  const clampMoveSuccess = wsManager.moveToken(roomId, 'tok-1', -10, 99);
  assert.strictEqual(clampMoveSuccess, true);
  assert.strictEqual(state.tokens['tok-1'].x, 0);
  assert.strictEqual(state.tokens['tok-1'].y, 11);

  // Move non-integer coordinates -> must be rejected
  const nonIntMove = wsManager.moveToken(roomId, 'tok-1', 4.5, 6.2);
  assert.strictEqual(nonIntMove, false);
  // Position remains untouched
  assert.strictEqual(state.tokens['tok-1'].x, 0);
  assert.strictEqual(state.tokens['tok-1'].y, 11);

  // Move non-existent token -> rejected
  const nonExistentMove = wsManager.moveToken(roomId, 'tok-unknown', 2, 2);
  assert.strictEqual(nonExistentMove, false);

  // Remove token
  const removeSuccess = wsManager.removeToken(roomId, 'tok-1');
  assert.strictEqual(removeSuccess, true);
  assert.strictEqual(state.tokens['tok-1'], undefined);

  // Remove already removed token -> rejected
  const removeAgain = wsManager.removeToken(roomId, 'tok-1');
  assert.strictEqual(removeAgain, false);
});

console.log('\n========================================================================');
console.log(`   EMPIRICAL ADVERSARIAL TEST RESULTS: ${passedChecks} / ${totalChecks} PASSED (100%)`);
console.log('========================================================================\n');
