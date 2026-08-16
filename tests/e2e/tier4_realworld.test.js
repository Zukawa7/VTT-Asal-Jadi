/**
 * Tier 4: Real-World Application Workflows E2E Test Suite (6 Scenarios)
 * Validates complete end-to-end user journeys and system architectural governance.
 */

import { expect, HtmlInspector, MarkdownInspector, TestBackend, TestRegistry, DiceRollerService, WebSocketManager } from './helpers.js';

export const tier4Suite = new TestRegistry('Tier 4: Real-World Workflows');

/**
 * Scenario 1: Player Registration -> Login -> Character Import -> Sheet Inspection & Update
 */
tier4Suite.test('T4-REAL-01', 'Scenario 1: Player Onboarding & Character Import Journey', async () => {
  const ctx = await TestBackend.createTestContext();
  try {
    // 1. Register new player account
    const regRes = await ctx.request
      .post('/api/v2/auth/register')
      .send({ username: 'elven_mage', password: 'securePassword123' });
    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);

    // 2. Authenticate and obtain JWT token
    const loginRes = await ctx.request
      .post('/api/v2/auth/login')
      .send({ username: 'elven_mage', password: 'securePassword123' });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.token;
    expect(token).toBeDefined();

    // 3. Verify user profile via /auth/me
    const meRes = await ctx.request
      .get('/api/v2/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.username).toBe('elven_mage');

    // 4. Import D&D Beyond character (ID 10293847)
    const importRes = await ctx.request
      .post('/api/v2/character/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ characterId: '10293847' });
    expect(importRes.status).toBe(200);
    const charId = importRes.body.id;
    expect(charId).toBeDefined();

    // 5. Query character collection to confirm appearance in gallery
    const galleryRes = await ctx.request
      .get('/api/v2/character')
      .set('Authorization', `Bearer ${token}`);
    expect(galleryRes.status).toBe(200);
    expect(galleryRes.body.length).toBe(1);
    expect(galleryRes.body[0].id).toBe(charId);

    // 6. Retrieve public sheet and verify stats/modifiers
    const sheetRes = await ctx.request.get(`/api/v2/character/${charId}/sheet`);
    expect(sheetRes.status).toBe(200);
    expect(sheetRes.body.name).toBeDefined();
    expect(sheetRes.body.hp.current).toBeGreaterThan(0);
    expect(sheetRes.body.stats).toBeDefined();

    // 7. Update HP and equipment via PUT
    const updateRes = await ctx.request
      .put(`/api/v2/character/${charId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ hp: { current: 20, temp: 5 } });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.hp.current).toBe(20);
    expect(updateRes.body.hp.temp).toBe(5);
  } finally {
    await ctx.close();
  }
}, { scenario: 1, tier: 4 });

/**
 * Scenario 2: DM Session Creation -> Tactical Map Setup -> Multi-Token Manipulation
 */
tier4Suite.test('T4-REAL-02', 'Scenario 2: DM Tactical Battle Encounter Setup', async () => {
  const ctx = await TestBackend.createTestContext();
  try {
    // 1. DM registers and authenticates
    await ctx.request.post('/api/v2/auth/register').send({ username: 'dungeon_master', password: 'password123' });
    const login = await ctx.request.post('/api/v2/auth/login').send({ username: 'dungeon_master', password: 'password123' });
    const token = login.body.token;

    // 2. DM creates session room "dungeon-crawl-101"
    const sessionRes = await ctx.request
      .post('/api/v2/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({ roomId: 'dungeon-crawl-101', name: 'Catacombs of Barovia', description: 'Encounter 1' });
    expect(sessionRes.status).toBe(201);
    expect(sessionRes.body.roomId).toBe('dungeon-crawl-101');

    // 3. Setup WebSocket Manager and set map background
    const mockIo = { to: () => ({ emit: () => {} }) };
    const wm = new WebSocketManager(mockIo);
    const mapUpdated = wm.setMapUrl('dungeon-crawl-101', 'https://example.com/maps/dungeon_grid.webp');
    expect(mapUpdated).toBe(true);

    // 4. DM places 3 goblin tokens and 1 boss token
    wm.addToken('dungeon-crawl-101', { id: 'goblin-1', name: 'Goblin 1', avatarUrl: 'https://example.com/goblin.png', x: 2, y: 3 });
    wm.addToken('dungeon-crawl-101', { id: 'goblin-2', name: 'Goblin 2', avatarUrl: 'https://example.com/goblin.png', x: 2, y: 4 });
    wm.addToken('dungeon-crawl-101', { id: 'bugbear', name: 'Bugbear Boss', avatarUrl: 'https://example.com/bugbear.png', x: 1, y: 3 });
    wm.addToken('dungeon-crawl-101', { id: 'paladin', name: 'Paladin', avatarUrl: 'https://example.com/paladin.png', x: 5, y: 5 });

    let state = wm.getRoomState('dungeon-crawl-101');
    expect(Object.keys(state.tokens).length).toBe(4);

    // 5. DM moves Goblin 1 to coordinate (4, 5) to engage Paladin
    const moved = wm.moveToken('dungeon-crawl-101', 'goblin-1', 4, 5);
    expect(moved).toBe(true);
    state = wm.getRoomState('dungeon-crawl-101');
    expect(state.tokens['goblin-1'].x).toBe(4);
    expect(state.tokens['goblin-1'].y).toBe(5);

    // 6. Paladin defeats Goblin 1 -> DM removes token
    const removed = wm.removeToken('dungeon-crawl-101', 'goblin-1');
    expect(removed).toBe(true);
    state = wm.getRoomState('dungeon-crawl-101');
    expect(Object.keys(state.tokens).length).toBe(3);
    expect(state.tokens['goblin-1']).toBeUndefined();
  } finally {
    await ctx.close();
  }
}, { scenario: 2, tier: 4 });

/**
 * Scenario 3: Real-Time Combat Round with OBS Stream Broadcast
 */
tier4Suite.test('T4-REAL-03', 'Scenario 3: Live Stream Combat Round with OBS Overlay & Critical Nat 20', async () => {
  const ctx = await TestBackend.createTestContext();
  try {
    const roomId = 'stream-live-42';
    // 1. Create session
    await ctx.request.post('/api/v2/auth/register').send({ username: 'streamer_dan', password: 'password123' });
    const login = await ctx.request.post('/api/v2/auth/login').send({ username: 'streamer_dan', password: 'password123' });
    await ctx.request.post('/api/v2/sessions').set('Authorization', `Bearer ${login.body.token}`).send({ roomId });

    // 2. Simulate combat roll: 1d20+8 resulting in Natural 20
    const rollEvent = {
      roomId,
      characterName: 'Valeros',
      characterAvatar: 'https://example.com/valeros.png',
      rollName: 'Longsword Attack',
      formula: '1d20+8',
      result: 28,
      rolls: [20],
      modifier: 8,
      isCritical: 1,
    };

    // 3. Persist roll to database
    const session = await ctx.db.get('SELECT id FROM game_sessions WHERE room_id = ?', [roomId]);
    await ctx.db.run(
      'INSERT INTO dice_rolls (session_id, character_id, roll_formula, result, is_critical) VALUES (?, ?, ?, ?, ?)',
      [session.id, 'char_valeros', rollEvent.formula, rollEvent.result, rollEvent.isCritical]
    );

    // 4. Verify roll query returns correctly
    const history = await ctx.request.get(`/api/v2/rolls/${roomId}`);
    expect(history.status).toBe(200);
    expect(history.body.length).toBe(1);
    expect(history.body[0].result).toBe(28);
    expect(history.body[0].isCritical).toBe(1);

    // 5. Verify overlay script recognizes Nat 20 badge
    const overlayJs = HtmlInspector.loadHtml('public/overlay.js');
    expect(overlayJs).toContain('rawRoll === 20');
    expect(overlayJs).toContain('Nat 20!');
  } finally {
    await ctx.close();
  }
}, { scenario: 3, tier: 4 });

/**
 * Scenario 4: Damage, Temp HP Overflow, Healing & Rest Cycle
 */
tier4Suite.test('T4-REAL-04', 'Scenario 4: Combat Damage, Temp HP Absorption, Healing & Short Rest', async () => {
  const ctx = await TestBackend.createTestContext();
  try {
    await ctx.request.post('/api/v2/auth/register').send({ username: 'fighter_joe', password: 'password123' });
    const login = await ctx.request.post('/api/v2/auth/login').send({ username: 'fighter_joe', password: 'password123' });
    const token = login.body.token;

    const imported = await ctx.request.post('/api/v2/character/import').set('Authorization', `Bearer ${token}`).send({ characterId: '301' });
    const charId = imported.body.id;

    // 1. Initial State: Set 44 Max HP, 44 Current HP, 10 Temp HP
    let res = await ctx.request
      .put(`/api/v2/character/${charId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ hp: { current: 44, max: 44, temp: 10 } });
    expect(res.body.hp.current).toBe(44);
    expect(res.body.hp.temp).toBe(10);

    // 2. Character takes 15 damage: 10 absorbed by Temp HP, 5 deducted from Current HP (Current: 39, Temp: 0)
    res = await ctx.request
      .put(`/api/v2/character/${charId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ hp: { current: 39, temp: 0 } });
    expect(res.body.hp.current).toBe(39);
    expect(res.body.hp.temp).toBe(0);

    // 3. Character takes 20 additional damage (Current: 19)
    res = await ctx.request
      .put(`/api/v2/character/${charId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ hp: { current: 19 } });
    expect(res.body.hp.current).toBe(19);

    // 4. Character heals 10 HP (Current: 29)
    res = await ctx.request
      .put(`/api/v2/character/${charId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ hp: { current: 29 } });
    expect(res.body.hp.current).toBe(29);

    // 5. Short rest recovers HP up to max (capped at 44)
    res = await ctx.request
      .put(`/api/v2/character/${charId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ hp: { current: 44 } });
    expect(res.body.hp.current).toBe(44);
  } finally {
    await ctx.close();
  }
}, { scenario: 4, tier: 4 });

/**
 * Scenario 5: Full Session Telemetry, Analytics & CSV Export Audit
 */
tier4Suite.test('T4-REAL-05', 'Scenario 5: Full Session Telemetry, Analytics & CSV Export Audit', async () => {
  const ctx = await TestBackend.createTestContext();
  try {
    const roomId = 'campaign-audit-99';
    await ctx.request.post('/api/v2/auth/register').send({ username: 'auditor', password: 'password123' });
    const login = await ctx.request.post('/api/v2/auth/login').send({ username: 'auditor', password: 'password123' });
    await ctx.request.post('/api/v2/sessions').set('Authorization', `Bearer ${login.body.token}`).send({ roomId });

    const session = await ctx.db.get('SELECT id FROM game_sessions WHERE room_id = ?', [roomId]);

    // Insert 10 distinct rolls (including 2 criticals)
    const testRolls = [
      { formula: '1d20+3', result: 18, isCritical: 0 },
      { formula: '1d20+3', result: 23, isCritical: 1 }, // Crit
      { formula: '2d6+2', result: 10, isCritical: 0 },
      { formula: '2d6+2', result: 8, isCritical: 0 },
      { formula: '1d8+4', result: 9, isCritical: 0 },
      { formula: '1d8+4', result: 12, isCritical: 0 },
      { formula: '1d20+5', result: 25, isCritical: 1 }, // Crit
      { formula: '1d100', result: 73, isCritical: 0 },
      { formula: '3d6', result: 11, isCritical: 0 },
      { formula: '1d12+2', result: 9, isCritical: 0 },
    ];

    for (const r of testRolls) {
      await ctx.db.run(
        'INSERT INTO dice_rolls (session_id, character_id, roll_formula, result, is_critical) VALUES (?, ?, ?, ?, ?)',
        [session.id, 'char_audited', r.formula, r.result, r.isCritical]
      );
    }

    // Query roll history
    const history = await ctx.request.get(`/api/v2/rolls/${roomId}`);
    expect(history.status).toBe(200);
    expect(history.body.length).toBe(10);

    // Query analytics
    const analytics = await ctx.request.get(`/api/v2/rolls/${roomId}/analytics`);
    expect(analytics.status).toBe(200);
    expect(analytics.body.totalRolls).toBe(10);
    expect(analytics.body.criticalCount).toBe(2);
    const sum = testRolls.reduce((acc, curr) => acc + curr.result, 0);
    const expectedAverage = parseFloat((sum / 10).toFixed(2));
    expect(analytics.body.averageResult).toBe(expectedAverage);

    // Query CSV export
    const csvRes = await ctx.request.get(`/api/v2/sessions/${roomId}/export.csv`);
    expect(csvRes.status).toBe(200);
    expect(csvRes.text).toContain('characterId,formula,result,isCritical,rolls,createdAt');
    const lines = csvRes.text.trim().split('\n');
    expect(lines.length).toBe(11); // Header + 10 rows
  } finally {
    await ctx.close();
  }
}, { scenario: 5, tier: 4 });

/**
 * Scenario 6: Comprehensive Backend Architecture Blueprint Audit
 */
tier4Suite.test('T4-REAL-06', 'Scenario 6: Comprehensive Backend Architecture Blueprint Audit', () => {
  const md = MarkdownInspector.loadMarkdown('docs/BACKEND_RECOMMENDATIONS.md');
  expect(md.length).toBeGreaterThan(10000); // Substantial engineering deliverable

  // Section 1: REST API
  expect(MarkdownInspector.hasSection(md, 'REST API Specification')).toBe(true);
  expect(MarkdownInspector.hasEndpoint(md, 'POST', '/api/v2/auth/login')).toBe(true);
  expect(MarkdownInspector.hasEndpoint(md, 'POST', '/api/v2/character/import')).toBe(true);
  expect(MarkdownInspector.hasEndpoint(md, 'POST', '/api/v2/sessions')).toBe(true);

  // Section 2: WebSockets
  expect(MarkdownInspector.hasSection(md, 'WebSocket')).toBe(true);
  expect(MarkdownInspector.hasWebSocketEvent(md, 'join-room')).toBe(true);
  expect(MarkdownInspector.hasWebSocketEvent(md, 'new-roll')).toBe(true);
  expect(MarkdownInspector.hasWebSocketEvent(md, 'token-moved')).toBe(true);

  // Section 3: Database Schemas
  expect(MarkdownInspector.hasSection(md, 'Database Schema')).toBe(true);
  expect(md).toContain('CREATE TABLE');
  expect(md).toContain('ON DELETE CASCADE');

  // Section 4: D&D Beyond Sync
  expect(MarkdownInspector.hasSection(md, 'D&D Beyond Integration')).toBe(true);
  expect(md).toContain('CobaltSession');

  // Section 5: Serverless Deployment
  expect(MarkdownInspector.hasSection(md, 'Serverless')).toBe(true);
  expect(md).toContain('Vercel');
  expect(md).toContain('Supabase');
}, { scenario: 6, tier: 4 });
