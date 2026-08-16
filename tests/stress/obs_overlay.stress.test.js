/**
 * Stress & Adversarial Test Suite: OBS Overlay Stream Engine
 * Message Queuing under Rapid Fire Rolls, FIFO Capping, Auto-Hide Timing & Formatting
 */

import { expect, TestRegistry } from '../e2e/helpers.js';

// DOM simulation harness for overlay.js testing in pure Node.js
export class SimulatedOverlayDom {
  constructor(queryString = '', savedConfig = null) {
    this.search = queryString;
    this.savedConfig = savedConfig;
    this.classes = new Set();
    this.feedChildren = [];
    this.timers = [];
    this.currentTime = 0;
    this.nextTimerId = 1;

    // Config defaults matching overlay.js
    const overlayDefaults = {
      position: 'bottom',
      animationStyle: 'slide',
      fontSize: 'medium',
      showFormula: true,
      autoHideTimeout: 10,
      soundEffectsEnabled: false,
    };

    const overlayParams = new URLSearchParams(this.search);
    const parsedSaved = this.savedConfig || {};

    const booleanParam = (value, fallback) => {
      if (value === null) return fallback;
      return value === 'true' || value === '1';
    };

    this.overlayConfig = {
      ...overlayDefaults,
      ...parsedSaved,
      position: overlayParams.get('position') || overlayParams.get('pos') || parsedSaved.position || overlayDefaults.position,
      animationStyle: overlayParams.get('animation') || parsedSaved.animationStyle || overlayDefaults.animationStyle,
      fontSize: overlayParams.get('fontSize') || parsedSaved.fontSize || overlayDefaults.fontSize,
      showFormula: booleanParam(overlayParams.get('showFormula'), parsedSaved.showFormula ?? overlayDefaults.showFormula),
      autoHideTimeout: Math.min(30, Math.max(5, Number(overlayParams.get('timeout') || parsedSaved.autoHideTimeout || overlayDefaults.autoHideTimeout))),
      soundEffectsEnabled: booleanParam(overlayParams.get('sound'), parsedSaved.soundEffectsEnabled ?? overlayDefaults.soundEffectsEnabled),
    };

    const validPositions = ['top', 'bottom', 'center'];
    const validAnimations = ['slide', 'fade', 'bounce'];
    const validFontSizes = ['small', 'medium', 'large'];

    if (!validPositions.includes(this.overlayConfig.position)) this.overlayConfig.position = overlayDefaults.position;
    if (!validAnimations.includes(this.overlayConfig.animationStyle)) this.overlayConfig.animationStyle = overlayDefaults.animationStyle;
    if (!validFontSizes.includes(this.overlayConfig.fontSize)) this.overlayConfig.fontSize = overlayDefaults.fontSize;

    this.classes.add(`position-${this.overlayConfig.position}`);
    this.classes.add(`animation-${this.overlayConfig.animationStyle}`);
    this.classes.add(`font-${this.overlayConfig.fontSize}`);
  }

  setTimeout(fn, delayMs) {
    const id = this.nextTimerId++;
    this.timers.push({ id, fn, triggerAt: this.currentTime + delayMs, cancelled: false });
    return id;
  }

  advanceTime(ms) {
    const targetTime = this.currentTime + ms;
    while (true) {
      const nextTimer = this.timers
        .filter((t) => !t.cancelled && t.triggerAt <= targetTime)
        .sort((a, b) => a.triggerAt - b.triggerAt)[0];

      if (!nextTimer) break;
      this.currentTime = nextTimer.triggerAt;
      nextTimer.cancelled = true;
      nextTimer.fn();
    }
    this.currentTime = targetTime;
  }

  handleRollEvent(data) {
    if (!data.system) {
      this.createRollCard(data);
    }
  }

  createRollCard(data) {
    const card = {
      id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      className: 'roll-card border border-slate-700/60 rounded-lg p-4 shadow-2xl flex items-center justify-between gap-4 transition-all duration-500',
      data,
      classList: {
        add: (cls) => { card.className += ` ${cls}`; },
        contains: (cls) => card.className.includes(cls)
      },
      parentNode: null
    };

    let resultClass = 'text-white border-slate-600 bg-slate-800';
    let badgeText = '';
    if (String(data.formula || '').startsWith('1d20')) {
      const rawRoll = data.rolls?.[0];
      if (rawRoll === 20) {
        resultClass = 'text-amber-400 border-amber-500 bg-amber-950/60';
        badgeText = '<span class="badge text-amber-500">Nat 20!</span>';
      }
      if (rawRoll === 1) {
        resultClass = 'text-red-400 border-red-500 bg-red-950/60';
        badgeText = '<span class="badge text-red-500">Crit Fail</span>';
      }
    }

    const avatarImg = `<img src="${data.characterAvatar || ''}" class="w-10 h-10 rounded-full border border-slate-600 object-cover bg-slate-800">`;
    const formula = `${data.formula || ''} (${(data.rolls || []).join(', ')})`;
    const modifier = data.modifier ? (data.modifier >= 0 ? ` + ${data.modifier}` : ` - ${Math.abs(data.modifier)}`) : '';
    const formulaMarkup = this.overlayConfig.showFormula ? `<p class="formula text-amber-500/80 font-mono truncate">${formula}${modifier}</p>` : '';

    card.innerHTML = `<div class="flex items-center gap-3 min-w-0"><div>${avatarImg}</div><div class="min-w-0"><h3 class="font-bold text-slate-100 truncate">${data.characterName || 'Adventurer'}</h3><p class="roll-name text-slate-400 truncate">${data.rollName || 'Roll'}</p>${formulaMarkup}</div></div><div class="text-center flex flex-col items-center justify-center">${badgeText}<div class="result font-black px-3 py-1 rounded border ${resultClass}">${data.result}</div></div>`;

    card.parentNode = this;
    this.feedChildren.push(card);

    // Strict FIFO Queue Capping: max 5 cards
    while (this.feedChildren.length > 5) {
      const removed = this.feedChildren.shift();
      if (removed) removed.parentNode = null;
    }

    this.setTimeout(() => this.removeCard(card), this.overlayConfig.autoHideTimeout * 1000);
    return card;
  }

  removeCard(card) {
    if (!card.parentNode) return;
    card.classList.add('fade-out');
    this.setTimeout(() => {
      if (card.parentNode) {
        const idx = this.feedChildren.indexOf(card);
        if (idx !== -1) this.feedChildren.splice(idx, 1);
        card.parentNode = null;
      }
    }, 500);
  }
}

export function createObsOverlayStressSuite() {
  const suite = new TestRegistry('Stress: OBS Overlay Queueing & Timing');

  // 1. Rapid Fire Roll Burst - Strict 5-Card FIFO Capping
  suite.test('STR-OBS-01', 'Rapid burst of 100 rolls strictly caps DOM feed queue at maximum 5 elements at all times', async () => {
    const dom = new SimulatedOverlayDom('?timeout=10');

    for (let i = 1; i <= 100; i++) {
      dom.handleRollEvent({
        characterName: `Warrior ${i}`,
        rollName: `Attack ${i}`,
        formula: '1d20+5',
        result: 15 + (i % 6),
        rolls: [10 + (i % 6)],
      });

      // INVARIANT: At EVERY SINGLE STEP, feedChildren.length MUST be <= 5
      expect(dom.feedChildren.length).toBeLessThanOrEqual(5);
    }

    expect(dom.feedChildren.length).toBe(5);

    // Oldest card in the feed must be Warrior 96, newest must be Warrior 100
    expect(dom.feedChildren[0].innerHTML).toContain('Warrior 96');
    expect(dom.feedChildren[4].innerHTML).toContain('Warrior 100');
  });

  // 2. Auto-Hide Timeout Clamping Boundaries
  suite.test('STR-OBS-02', 'Auto-hide timeout parameter is clamped between 5s and 30s across boundary inputs', async () => {
    const cases = [
      { param: '?timeout=1', expected: 5 },
      { param: '?timeout=0', expected: 5 }, // 0 is clamped to min 5
      { param: '?timeout=-15', expected: 5 },
      { param: '?timeout=4.9', expected: 5 },
      { param: '?timeout=5', expected: 5 },
      { param: '?timeout=12', expected: 12 },
      { param: '?timeout=30', expected: 30 },
      { param: '?timeout=31', expected: 30 },
      { param: '?timeout=9999', expected: 30 },
      { param: '', expected: 10 }
    ];

    for (const c of cases) {
      const dom = new SimulatedOverlayDom(c.param);
      expect(dom.overlayConfig.autoHideTimeout).toBe(c.expected);
    }
  });

  // 3. Staggered Auto-Hide Cascade & Clean DOM Removal
  suite.test('STR-OBS-03', 'Staggered rolls auto-hide in exact chronological order without orphan nodes', async () => {
    const dom = new SimulatedOverlayDom('?timeout=6'); // 6 seconds autoHide

    // Add 3 cards at t = 0s, t = 2s, t = 4s
    dom.handleRollEvent({ characterName: 'Card A', formula: '1d20', rolls: [10], result: 10 });
    dom.advanceTime(2000); // t = 2s
    dom.handleRollEvent({ characterName: 'Card B', formula: '1d20', rolls: [12], result: 12 });
    dom.advanceTime(2000); // t = 4s
    dom.handleRollEvent({ characterName: 'Card C', formula: '1d20', rolls: [14], result: 14 });

    expect(dom.feedChildren.length).toBe(3);

    // Advance to t = 6.1s (Card A's 6s timeout fired at 6.0s, fade-out added, scheduled deletion at 6.5s)
    dom.advanceTime(2100); // t = 6.1s
    expect(dom.feedChildren.length).toBe(3);
    expect(dom.feedChildren[0].innerHTML).toContain('Card A');
    expect(dom.feedChildren[0].className).toContain('fade-out');

    // Advance to t = 6.6s (Card A removed at 6.5s)
    dom.advanceTime(500); // t = 6.6s
    expect(dom.feedChildren.length).toBe(2);
    expect(dom.feedChildren[0].innerHTML).toContain('Card B');
    expect(dom.feedChildren[1].innerHTML).toContain('Card C');

    // Advance to t = 8.6s (Card B removed at 8.5s)
    dom.advanceTime(2000); // t = 8.6s
    expect(dom.feedChildren.length).toBe(1);
    expect(dom.feedChildren[0].innerHTML).toContain('Card C');

    // Advance to t = 10.6s (Card C removed at 10.5s -> feed empty)
    dom.advanceTime(2000); // t = 10.6s
    expect(dom.feedChildren.length).toBe(0);
  });

  // 4. Critical Roll Card Styling & Badge Rendering
  suite.test('STR-OBS-04', 'Critical Nat 20 and Nat 1 render dedicated obsidian/gold and crimson styling and badges', async () => {
    const dom = new SimulatedOverlayDom();

    // Nat 20
    const card20 = dom.createRollCard({
      characterName: 'Paladin',
      rollName: 'Smite',
      formula: '1d20+8',
      result: 28,
      rolls: [20]
    });
    expect(card20.innerHTML).toContain('Nat 20!');
    expect(card20.innerHTML).toContain('text-amber-400 border-amber-500 bg-amber-950/60');

    // Nat 1
    const card1 = dom.createRollCard({
      characterName: 'Wizard',
      rollName: 'Save',
      formula: '1d20+1',
      result: 2,
      rolls: [1]
    });
    expect(card1.innerHTML).toContain('Crit Fail');
    expect(card1.innerHTML).toContain('text-red-400 border-red-500 bg-red-950/60');

    // Non-d20 roll with 20 on damage (e.g. 2d10 -> [10, 10] = 20) must NOT show Nat 20 badge
    const cardDamage = dom.createRollCard({
      characterName: 'Fighter',
      rollName: 'Damage',
      formula: '2d10',
      result: 20,
      rolls: [10, 10]
    });
    expect(cardDamage.innerHTML).not.toContain('Nat 20!');
    expect(cardDamage.innerHTML).toContain('text-white border-slate-600 bg-slate-800');
  });

  // 5. System Messages & Filter Ignorance
  suite.test('STR-OBS-05', 'System messages (data.system: true) are strictly suppressed from overlay HUD', async () => {
    const dom = new SimulatedOverlayDom();

    dom.handleRollEvent({ system: true, text: 'Roll limit reached. Try again in a minute.' });
    dom.handleRollEvent({ system: true, text: 'User disconnected.' });

    expect(dom.feedChildren.length).toBe(0);
  });

  // 6. ShowFormula Toggle & Fallback Configuration
  suite.test('STR-OBS-06', 'Formula markup visibility is strictly gated by showFormula configuration', async () => {
    const domWithFormula = new SimulatedOverlayDom('?showFormula=true');
    const cardWith = domWithFormula.createRollCard({
      characterName: 'Ranger',
      formula: '1d8+3',
      rolls: [6],
      modifier: 3,
      result: 9
    });
    expect(cardWith.innerHTML).toContain('class="formula');
    expect(cardWith.innerHTML).toContain('1d8+3 (6) + 3');

    const domNoFormula = new SimulatedOverlayDom('?showFormula=false');
    const cardWithout = domNoFormula.createRollCard({
      characterName: 'Ranger',
      formula: '1d8+3',
      rolls: [6],
      modifier: 3,
      result: 9
    });
    expect(cardWithout.innerHTML).not.toContain('class="formula');
  });

  // 7. Robustness against missing fields
  suite.test('STR-OBS-07', 'Cards render cleanly with safe fallbacks when character data fields are omitted', async () => {
    const dom = new SimulatedOverlayDom();

    const cardSparse = dom.createRollCard({
      result: 12
    });

    expect(cardSparse.innerHTML).toContain('Adventurer'); // fallback name
    expect(cardSparse.innerHTML).toContain('Roll'); // fallback roll name
    expect(cardSparse.innerHTML).toContain('12'); // result
    expect(cardSparse.innerHTML).not.toContain('undefined');
    expect(cardSparse.innerHTML).not.toContain('null');
  });

  return suite;
}
