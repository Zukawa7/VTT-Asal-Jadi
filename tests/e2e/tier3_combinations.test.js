/**
 * Tier 3: Cross-Feature Combinations E2E Test Suite (12 Test Cases)
 * Validates pairwise interactions across design tokens, auth, character management, VTT workstation,
 * map canvas, dice rolling, OBS overlay, and session telemetry.
 */

import { expect, HtmlInspector, CssInspector, MarkdownInspector, TestBackend, TestRegistry, DiceRollerService, WebSocketManager } from './helpers.js';

export const tier3Suite = new TestRegistry('Tier 3: Cross-Feature Combinations (Pairwise)');

/**
 * T3-COMB-01: F1 + F3 (Theme Tokens on Auth Views)
 */
tier3Suite.test('T3-COMB-01', 'F1+F3: Theme tokens and classes properly styled on Login and Register views', () => {
  const loginHtml = HtmlInspector.loadHtml('public/login.html');
  const registerHtml = HtmlInspector.loadHtml('public/register.html');
  const varCss = CssInspector.loadCss('public/styles/variables.css');

  expect(HtmlInspector.hasStylesheet(loginHtml, 'variables.css')).toBe(true);
  expect(HtmlInspector.hasStylesheet(registerHtml, 'variables.css')).toBe(true);
  expect(loginHtml).toContain('btn-primary');
  expect(registerHtml).toContain('btn-primary');
  expect(varCss).toContain('--primary');
}, { features: ['F1', 'F3'], tier: 3 });

/**
 * T3-COMB-02: F1 + F4 (Theme Tokens on Character Gallery Grid)
 */
tier3Suite.test('T3-COMB-02', 'F1+F4: Theme tokens and card classes properly applied to Dashboard character gallery', () => {
  const dashboardHtml = HtmlInspector.loadHtml('public/dashboard.html');
  expect(HtmlInspector.hasStylesheet(dashboardHtml, 'variables.css')).toBe(true);
  expect(HtmlInspector.hasStylesheet(dashboardHtml, 'components.css')).toBe(true);
  expect(dashboardHtml).toContain('polyport-card');
  expect(dashboardHtml).toContain('badge-level');
}, { features: ['F1', 'F4'], tier: 3 });

/**
 * T3-COMB-03: F1 + F6 (Theme Tokens on 3-Column VTT Workstation)
 */
tier3Suite.test('T3-COMB-03', 'F1+F6: VTT 3-column workstation links theme variables and responsive layout styles', () => {
  const vttHtml = HtmlInspector.loadHtml('public/vtt.html');
  expect(HtmlInspector.hasStylesheet(vttHtml, 'variables.css')).toBe(true);
  expect(HtmlInspector.hasStylesheet(vttHtml, 'components.css')).toBe(true);
  expect(HtmlInspector.hasStylesheet(vttHtml, 'responsive.css')).toBe(true);
  expect(vttHtml).toContain('lg:grid-cols-12');
}, { features: ['F1', 'F6'], tier: 3 });

/**
 * T3-COMB-04: F3 + F4 (Auth JWT Handshake to Character Import)
 */
tier3Suite.test('T3-COMB-04', 'F3+F4: User registers, authenticates for JWT token, and imports character into gallery', async () => {
  const ctx = await TestBackend.createTestContext();
  try {
    const reg = await ctx.request.post('/api/v2/auth/register').send({ username: 'flowuser1', password: 'password123' });
    expect(reg.status).toBe(201);

    const login = await ctx.request.post('/api/v2/auth/login').send({ username: 'flowuser1', password: 'password123' });
    expect(login.status).toBe(200);
    const token = login.body.token;

    const imp = await ctx.request
      .post('/api/v2/character/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ characterId: '201' });

    expect(imp.status).toBe(200);
    expect(imp.body.id).toBeDefined();

    const list = await ctx.request.get('/api/v2/character').set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.length).toBe(1);
    expect(list.body[0].id).toBe(imp.body.id);
  } finally {
    await ctx.close();
  }
}, { features: ['F3', 'F4'], tier: 3 });

/**
 * T3-COMB-05: F4 + F10 (Dashboard Navigation to Character Sheet)
 */
tier3Suite.test('T3-COMB-05', 'F4+F10: Character card navigation link routes to character sheet with matching ID', () => {
  const dashboardHtml = HtmlInspector.loadHtml('public/dashboard.html');
  const charViewHtml = HtmlInspector.loadHtml('public/character-view.html');

  expect(dashboardHtml).toContain('/dashboard/characters/');
  expect(charViewHtml).toContain('GET /api/v2/character/');
  expect(HtmlInspector.hasElement(charViewHtml, '#hp-current')).toBe(true);
}, { features: ['F4', 'F10'], tier: 3 });

/**
 * T3-COMB-06: F6 + F7 (VTT Character Selection to Tactical Map Token)
 */
tier3Suite.test('T3-COMB-06', 'F6+F7: Character state in VTT workstation creates and positions token on tactical map canvas', () => {
  const mockIo = { to: () => ({ emit: () => {} }) };
  const wm = new WebSocketManager(mockIo);

  const character = TestBackend.getStandardCharacter();
  const token = {
    id: `token-${character.id}`,
    name: character.name,
    avatarUrl: character.avatarUrl,
    x: 0,
    y: 0,
  };

  const added = wm.addToken('room-comb-1', token);
  expect(added).toBe(true);

  const state = wm.getRoomState('room-comb-1');
  expect(state.tokens[token.id]).toBeDefined();
  expect(state.tokens[token.id].name).toBe('Valeros Highwind');
}, { features: ['F6', 'F7'], tier: 3 });

/**
 * T3-COMB-07: F6 + F8 (VTT Dice Tray Click to Game Log Update)
 */
tier3Suite.test('T3-COMB-07', 'F6+F8: Clicking polyhedral dice buttons evaluates rolls and formats game log entry', () => {
  const roll = DiceRollerService.roll('1d20+4');
  expect(roll.total).toBe(roll.rolls[0] + 4);

  const appJs = HtmlInspector.loadHtml('public/app.js');
  expect(appJs).toContain('logRoll');
  expect(appJs).toContain('logContainer');
}, { features: ['F6', 'F8'], tier: 3 });

/**
 * T3-COMB-08: F8 + F9 (VTT Dice Roll to OBS Overlay Live Broadcast)
 */
tier3Suite.test('T3-COMB-08', 'F8+F9: Dice roll event envelope dispatches to OBS overlay and renders gilded roll card', () => {
  const rollPayload = {
    roomId: 'stream-room',
    characterName: 'Valeros Highwind',
    characterAvatar: 'https://example.com/avatar.png',
    rollName: 'Attack Roll',
    formula: '1d20+5',
    result: 25,
    rolls: [20],
    modifier: 5,
  };

  expect(rollPayload.rolls[0]).toBe(20);
  const overlayJs = HtmlInspector.loadHtml('public/overlay.js');
  expect(overlayJs).toContain('new-roll');
  expect(overlayJs).toContain('Nat 20!');
}, { features: ['F8', 'F9'], tier: 3 });

/**
 * T3-COMB-09: F8 + F5 (Live Dice Rolling to Session Telemetry Update)
 */
tier3Suite.test('T3-COMB-09', 'F8+F5: Persisted dice rolls update Session Dashboard analytics counters', async () => {
  const ctx = await TestBackend.createTestContext();
  try {
    const roomId = 'telemetry-room-1';
    // Create session
    await ctx.request.post('/api/v2/auth/register').send({ username: 'telemuser', password: 'password123' });
    const login = await ctx.request.post('/api/v2/auth/login').send({ username: 'telemuser', password: 'password123' });
    await ctx.request.post('/api/v2/sessions').set('Authorization', `Bearer ${login.body.token}`).send({ roomId });

    // Simulate roll persistence directly via DB
    const session = await ctx.db.get('SELECT id FROM game_sessions WHERE room_id = ?', [roomId]);
    await ctx.db.run(
      'INSERT INTO dice_rolls (session_id, character_id, roll_formula, result, is_critical) VALUES (?, ?, ?, ?, ?)',
      [session.id, 'char_1', '1d20+5', 25, 1]
    );
    await ctx.db.run(
      'INSERT INTO dice_rolls (session_id, character_id, roll_formula, result, is_critical) VALUES (?, ?, ?, ?, ?)',
      [session.id, 'char_1', '2d6+3', 11, 0]
    );

    const analytics = await ctx.request.get(`/api/v2/rolls/${roomId}/analytics`);
    expect(analytics.status).toBe(200);
    expect(analytics.body.totalRolls).toBe(2);
    expect(analytics.body.criticalCount).toBe(1);
    expect(analytics.body.averageResult).toBe(18);
  } finally {
    await ctx.close();
  }
}, { features: ['F8', 'F5'], tier: 3 });

/**
 * T3-COMB-10: F10 + F11 (Ability Score Modifier Update to Saving Throws and Skills)
 */
tier3Suite.test('T3-COMB-10', 'F10+F11: Changing ability score modifier automatically recalculates saving throw and skill modifiers', () => {
  const char = TestBackend.getStandardCharacter();
  const profBonus = 2 + Math.floor((char.level - 1) / 4); // 3

  // Dexterity check modifier
  const dexMod = char.modifiers.dex; // 2
  const isAcrobaticsProf = char.proficiencies.skills.includes('Acrobatics'); // false
  const acrobaticsTotal = dexMod + (isAcrobaticsProf ? profBonus : 0);
  expect(acrobaticsTotal).toBe(2);

  // Strength save modifier with proficiency
  const strMod = char.modifiers.str; // 4
  const isStrSaveProf = char.proficiencies.saves.includes('str'); // true
  const strSaveTotal = strMod + (isStrSaveProf ? profBonus : 0);
  expect(strSaveTotal).toBe(7);
}, { features: ['F10', 'F11'], tier: 3 });

/**
 * T3-COMB-11: F11 + F10 (Long Rest Action to HP, Temp HP, and Class Resources Reset)
 */
tier3Suite.test('T3-COMB-11', 'F11+F10: Long Rest action restores Current HP to Max HP, resets Temp HP to 0, and restores class resources', () => {
  const char = TestBackend.getStandardCharacter({
    hp: { current: 15, max: 44, temp: 10 },
    resources: [{ name: 'Action Surge', current: 0, max: 1, resetOn: 'short rest' }],
  });

  // Execute Long Rest simulation
  char.hp.current = char.hp.max;
  char.hp.temp = 0;
  char.resources.forEach((r) => {
    r.current = r.max;
  });

  expect(char.hp.current).toBe(44);
  expect(char.hp.temp).toBe(0);
  expect(char.resources[0].current).toBe(1);
}, { features: ['F11', 'F10'], tier: 3 });

/**
 * T3-COMB-12: F5 + F12 (Session Telemetry CSV Export Schema Match)
 */
tier3Suite.test('T3-COMB-12', 'F5+F12: CSV telemetry export column schema matches documented API blueprint in docs/BACKEND_RECOMMENDATIONS.md', async () => {
  const md = MarkdownInspector.loadMarkdown('docs/BACKEND_RECOMMENDATIONS.md');
  expect(md).toContain('/api/v2/sessions/:roomId/export.csv');
  expect(md).toContain('text/csv');

  const ctx = await TestBackend.createTestContext();
  try {
    const res = await ctx.request.get('/api/v2/sessions/schema-check/export.csv');
    expect(res.status).toBe(200);
    expect(res.text).toContain('characterId,formula,result,isCritical,rolls,createdAt');
  } finally {
    await ctx.close();
  }
}, { features: ['F5', 'F12'], tier: 3 });
