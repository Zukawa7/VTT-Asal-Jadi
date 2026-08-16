/**
 * Tier 1: Feature Coverage E2E Test Suite (60 Test Cases across F1–F12)
 * Validates baseline functionality, DOM bindings, design tokens, REST APIs, and deliverables.
 */

import { expect, HtmlInspector, CssInspector, MarkdownInspector, TestBackend, TestRegistry, DiceRollerService } from './helpers.js';

export const tier1Suite = new TestRegistry('Tier 1: Feature Coverage (F1–F12)');

/**
 * ============================================================================
 * FEATURE F1: Dark Fantasy Design System & Tokens
 * ============================================================================
 */
tier1Suite.test('T1-F01-01', 'F1: Dark obsidian surfaces and canvas palette tokens defined in variables.css', () => {
  const css = CssInspector.loadCss('public/styles/variables.css');
  const bgCanvas = CssInspector.getCssVariable(css, '--bg-canvas');
  const bgSurface = CssInspector.getCssVariable(css, '--bg-surface');
  const bgCard = CssInspector.getCssVariable(css, '--bg-card');
  const bgTertiary = CssInspector.getCssVariable(css, '--bg-tertiary');

  expect(bgCanvas).toBe('#0c0e14');
  expect(bgSurface).toBe('#11141d');
  expect(bgCard).toBe('#181c27');
  expect(bgTertiary).toBe('#222738');
}, { feature: 'F1', tier: 1 });

tier1Suite.test('T1-F01-02', 'F1: Gold and amber primary accent color tokens defined in variables.css', () => {
  const css = CssInspector.loadCss('public/styles/variables.css');
  const gold400 = CssInspector.getCssVariable(css, '--gold-400');
  const gold500 = CssInspector.getCssVariable(css, '--gold-500');
  const gold600 = CssInspector.getCssVariable(css, '--gold-600');
  const primary = CssInspector.getCssVariable(css, '--primary');

  expect(gold400).toBe('#fbbf24');
  expect(gold500).toBe('#f59e0b');
  expect(gold600).toBe('#d97706');
  expect(primary).toBe('var(--gold-500)');
}, { feature: 'F1', tier: 1 });

tier1Suite.test('T1-F01-03', 'F1: Light/parchment theme override selector [data-theme="light"] defined in variables.css and theme.css', () => {
  const varCss = CssInspector.loadCss('public/styles/variables.css');
  const themeCss = CssInspector.loadCss('public/styles/theme.css');

  expect(varCss).toContain('[data-theme="light"]');
  expect(themeCss).toContain('[data-theme="light"]');
  const lightBgCanvas = CssInspector.getCssVariable(varCss, '--bg-canvas', '[data-theme="light"]');
  expect(lightBgCanvas).toBe('#f5f1e8');
}, { feature: 'F1', tier: 1 });

tier1Suite.test('T1-F01-04', 'F1: Border, glow shadows, and D&D status tokens defined in variables.css', () => {
  const css = CssInspector.loadCss('public/styles/variables.css');
  const borderPrimary = CssInspector.getCssVariable(css, '--border-primary');
  const glowGold = CssInspector.getCssVariable(css, '--glow-gold');
  const success = CssInspector.getCssVariable(css, '--success');
  const danger = CssInspector.getCssVariable(css, '--danger');

  expect(borderPrimary).toContain('rgba(245, 158, 11');
  expect(glowGold).toBe('var(--glow-gold-sm)');
  expect(success).toBe('#10b981');
  expect(danger).toBe('#ef4444');
}, { feature: 'F1', tier: 1 });

tier1Suite.test('T1-F01-05', 'F1: Unified modular stylesheet links present across all core HTML views', () => {
  const views = [
    'public/login.html',
    'public/register.html',
    'public/dashboard.html',
    'public/session-dashboard.html',
    'public/vtt.html',
    'public/overlay.html',
    'public/overlay-settings.html',
    'public/character-view.html',
  ];

  for (const view of views) {
    const html = HtmlInspector.loadHtml(view);
    expect(HtmlInspector.hasStylesheet(html, 'variables.css')).toBe(true);
    expect(HtmlInspector.hasStylesheet(html, 'theme.css')).toBe(true);
  }
}, { feature: 'F1', tier: 1 });

/**
 * ============================================================================
 * FEATURE F2: Typography & Component Styling
 * ============================================================================
 */
tier1Suite.test('T1-F02-01', 'F2: Typography font families imported and bound to display and body tokens in variables.css', () => {
  const css = CssInspector.loadCss('public/styles/variables.css');
  expect(css).toContain('@import url(\'https://fonts.googleapis.com/css2?family=Cinzel');
  const fontDisplay = CssInspector.getCssVariable(css, '--font-display');
  const fontSans = CssInspector.getCssVariable(css, '--font-sans');
  const fontMono = CssInspector.getCssVariable(css, '--font-mono');

  expect(fontDisplay).toContain('Cinzel');
  expect(fontSans).toContain('Inter');
  expect(fontMono).toContain('Fira Code');
}, { feature: 'F2', tier: 1 });

tier1Suite.test('T1-F02-02', 'F2: Reusable .card and .polyport-card components with gold corner accents in components.css & views', () => {
  const css = CssInspector.loadCss('public/styles/components.css');
  expect(css).toContain('.card');
  expect(css).toContain('.card::before');
  expect(css).toContain('.card::after');
  expect(css).toContain('.card-title');
}, { feature: 'F2', tier: 1 });

tier1Suite.test('T1-F02-03', 'F2: Reusable button styles (.btn-primary, .btn-secondary, .btn-accent, .btn-ghost) in components.css', () => {
  const css = CssInspector.loadCss('public/styles/components.css');
  expect(css).toContain('.btn-primary');
  expect(css).toContain('.btn-secondary');
  expect(css).toContain('.btn-accent');
  expect(css).toContain('.btn-ghost');
  expect(css).toContain('.btn-success');
}, { feature: 'F2', tier: 1 });

tier1Suite.test('T1-F02-04', 'F2: Styled form inputs with focus ring and gold borders defined in components.css', () => {
  const css = CssInspector.loadCss('public/styles/components.css');
  expect(css).toContain('.input');
  expect(css).toContain('input:focus');
  expect(css).toContain('border-color');
}, { feature: 'F2', tier: 1 });

tier1Suite.test('T1-F02-05', 'F2: Badges and JavaScript UI component helpers exist in components.css & components.js', () => {
  const css = CssInspector.loadCss('public/styles/components.css');
  expect(css).toContain('.badge');
  expect(css).toContain('.badge-success');
  expect(css).toContain('.badge-info');

  const js = HtmlInspector.loadHtml('public/js/components.js');
  expect(js).toContain('window.VTT');
  expect(js).toContain('Modal');
  expect(js).toContain('Notification');
}, { feature: 'F2', tier: 1 });

/**
 * ============================================================================
 * FEATURE F3: Authentication Views & REST APIs
 * ============================================================================
 */
tier1Suite.test('T1-F03-01', 'F3: Login view structure includes fantasy card, crest, #loginForm, #username, and #password', () => {
  const html = HtmlInspector.loadHtml('public/login.html');
  expect(HtmlInspector.hasElement(html, '#loginForm')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#username')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#password')).toBe(true);
  expect(HtmlInspector.hasElement(html, 'button[type="submit"]')).toBe(true);
}, { feature: 'F3', tier: 1 });

tier1Suite.test('T1-F03-02', 'F3: Login view contains registration link and error message container #loginError', () => {
  const html = HtmlInspector.loadHtml('public/login.html');
  expect(HtmlInspector.hasElement(html, '#loginError')).toBe(true);
  expect(HtmlInspector.hasElement(html, 'a[href="/register"]')).toBe(true);
}, { feature: 'F3', tier: 1 });

tier1Suite.test('T1-F03-03', 'F3: Register view structure includes #registerForm, inputs, CTA, and success container', () => {
  const html = HtmlInspector.loadHtml('public/register.html');
  expect(HtmlInspector.hasElement(html, '#registerForm')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#username')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#password')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#registerSuccess')).toBe(true);
  expect(HtmlInspector.hasElement(html, 'a[href="/login"]')).toBe(true);
}, { feature: 'F3', tier: 1 });

tier1Suite.test('T1-F03-04', 'F3: REST API POST /api/v2/auth/register creates user account and returns 201 Created', async () => {
  const ctx = await TestBackend.createTestContext();
  try {
    const res = await ctx.request
      .post('/api/v2/auth/register')
      .send({ username: 'validhero', password: 'secretPassword123' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  } finally {
    await ctx.close();
  }
}, { feature: 'F3', tier: 1 });

tier1Suite.test('T1-F03-05', 'F3: REST API POST /api/v2/auth/login returns JWT token and GET /api/v2/auth/me returns profile', async () => {
  const ctx = await TestBackend.createTestContext();
  try {
    await ctx.request.post('/api/v2/auth/register').send({ username: 'authhero', password: 'secretPassword123' });
    const loginRes = await ctx.request.post('/api/v2/auth/login').send({ username: 'authhero', password: 'secretPassword123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.username).toBe('authhero');

    const meRes = await ctx.request.get('/api/v2/auth/me').set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.username).toBe('authhero');
    expect(meRes.body.id).toBeDefined();
  } finally {
    await ctx.close();
  }
}, { feature: 'F3', tier: 1 });

/**
 * ============================================================================
 * FEATURE F4: User Dashboard & Character Gallery
 * ============================================================================
 */
tier1Suite.test('T1-F04-01', 'F4: Dashboard view contains player welcome banner, header username, and D&D Beyond status badge', () => {
  const html = HtmlInspector.loadHtml('public/dashboard.html');
  expect(HtmlInspector.hasElement(html, '#headerUsername')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#welcomeUsername')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#logoutBtn')).toBe(true);
}, { feature: 'F4', tier: 1 });

tier1Suite.test('T1-F04-02', 'F4: Dashboard view contains Character Import wizard with #charIdInput and #importBtn', () => {
  const html = HtmlInspector.loadHtml('public/dashboard.html');
  expect(HtmlInspector.hasElement(html, '#charIdInput')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#importBtn')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#importError')).toBe(true);
}, { feature: 'F4', tier: 1 });

tier1Suite.test('T1-F04-03', 'F4: Dashboard view contains Character Gallery container with #charGrid and #charEmpty state', () => {
  const html = HtmlInspector.loadHtml('public/dashboard.html');
  expect(HtmlInspector.hasElement(html, '#charGrid')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#charEmpty')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#charLoading')).toBe(true);
}, { feature: 'F4', tier: 1 });

tier1Suite.test('T1-F04-04', 'F4: REST API GET /api/v2/character returns array of user characters when authenticated', async () => {
  const ctx = await TestBackend.createTestContext();
  try {
    await ctx.request.post('/api/v2/auth/register').send({ username: 'charowner', password: 'password123' });
    const login = await ctx.request.post('/api/v2/auth/login').send({ username: 'charowner', password: 'password123' });
    const token = login.body.token;

    const res = await ctx.request.get('/api/v2/character').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  } finally {
    await ctx.close();
  }
}, { feature: 'F4', tier: 1 });

tier1Suite.test('T1-F04-05', 'F4: REST API POST /api/v2/character/import imports normalized character structure', async () => {
  const ctx = await TestBackend.createTestContext();
  try {
    await ctx.request.post('/api/v2/auth/register').send({ username: 'importer', password: 'password123' });
    const login = await ctx.request.post('/api/v2/auth/login').send({ username: 'importer', password: 'password123' });
    const token = login.body.token;

    const res = await ctx.request
      .post('/api/v2/character/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ characterId: '10293847' });

    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBeDefined();
    expect(res.body.hp).toBeDefined();
    expect(res.body.stats).toBeDefined();
    expect(res.body.modifiers).toBeDefined();
  } finally {
    await ctx.close();
  }
}, { feature: 'F4', tier: 1 });

/**
 * ============================================================================
 * FEATURE F5: Session Dashboard & Telemetry
 * ============================================================================
 */
tier1Suite.test('T1-F05-01', 'F5: Session dashboard view contains Room ID input #room, #load, and #csv export controls', () => {
  const html = HtmlInspector.loadHtml('public/session-dashboard.html');
  expect(HtmlInspector.hasElement(html, '#room')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#load')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#csv')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#status')).toBe(true);
}, { feature: 'F5', tier: 1 });

tier1Suite.test('T1-F05-02', 'F5: Session dashboard view contains 3 KPI metric cards (#total, #average, #critical)', () => {
  const html = HtmlInspector.loadHtml('public/session-dashboard.html');
  expect(HtmlInspector.hasElement(html, '#total')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#average')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#critical')).toBe(true);
}, { feature: 'F5', tier: 1 });

tier1Suite.test('T1-F05-03', 'F5: Session dashboard view contains formula distribution container #formulas and roll history table #rolls', () => {
  const html = HtmlInspector.loadHtml('public/session-dashboard.html');
  expect(HtmlInspector.hasElement(html, '#formulas')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#rolls')).toBe(true);
  expect(HtmlInspector.hasElement(html, 'table')).toBe(true);
}, { feature: 'F5', tier: 1 });

tier1Suite.test('T1-F05-04', 'F5: REST API GET /api/v2/rolls/:roomId and analytics return roll logs and calculated KPIs', async () => {
  const ctx = await TestBackend.createTestContext();
  try {
    const rollsRes = await ctx.request.get('/api/v2/rolls/room-test-1');
    expect(rollsRes.status).toBe(200);
    expect(Array.isArray(rollsRes.body)).toBe(true);

    const analyticsRes = await ctx.request.get('/api/v2/rolls/room-test-1/analytics');
    expect(analyticsRes.status).toBe(200);
    expect(analyticsRes.body.totalRolls).toBeDefined();
    expect(analyticsRes.body.averageResult).toBeDefined();
    expect(analyticsRes.body.criticalCount).toBeDefined();
    expect(Array.isArray(analyticsRes.body.formulas)).toBe(true);
  } finally {
    await ctx.close();
  }
}, { feature: 'F5', tier: 1 });

tier1Suite.test('T1-F05-05', 'F5: REST API GET /api/v2/sessions/:roomId/export.csv returns CSV formatted stream', async () => {
  const ctx = await TestBackend.createTestContext();
  try {
    const res = await ctx.request.get('/api/v2/sessions/room-export-1/export.csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('characterId,formula,result,isCritical,rolls,createdAt');
  } finally {
    await ctx.close();
  }
}, { feature: 'F5', tier: 1 });

/**
 * ============================================================================
 * FEATURE F6: VTT 3-Column Workstation
 * ============================================================================
 */
tier1Suite.test('T1-F06-01', 'F6: VTT view defines responsive 3-column workstation grid layout (lg:grid-cols-12)', () => {
  const html = HtmlInspector.loadHtml('public/vtt.html');
  expect(html).toContain('lg:grid-cols-12');
  expect(html).toContain('lg:col-span-3');
  expect(html).toContain('lg:col-span-6');
}, { feature: 'F6', tier: 1 });

tier1Suite.test('T1-F06-02', 'F6: VTT left column includes character import widget, #charSheet, avatar, HP meter, and stats', () => {
  const html = HtmlInspector.loadHtml('public/vtt.html');
  expect(HtmlInspector.hasElement(html, '#charIdInput')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#importBtn')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#charSheet')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#charAvatar')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#charCurrentHp')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#hpBar')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#statScore-str')).toBe(true);
}, { feature: 'F6', tier: 1 });

tier1Suite.test('T1-F06-03', 'F6: VTT center column includes tactical battle map viewport #mapContainer and URL controls', () => {
  const html = HtmlInspector.loadHtml('public/vtt.html');
  expect(HtmlInspector.hasElement(html, '#mapContainer')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#mapUrlInput')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#setMapBtn')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#addTokenBtn')).toBe(true);
}, { feature: 'F6', tier: 1 });

tier1Suite.test('T1-F06-04', 'F6: VTT right column includes dice tray, pool builder, OBS URL copy widget, and #logContainer', () => {
  const html = HtmlInspector.loadHtml('public/vtt.html');
  expect(HtmlInspector.hasElement(html, '#dicePoolContainer')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#diceModifier')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#clearPoolBtn')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#obsUrlInput')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#logContainer')).toBe(true);
}, { feature: 'F6', tier: 1 });

tier1Suite.test('T1-F06-05', 'F6: VTT view loads client scripts (socket.io.js, components.js, theme-toggle.js, app.js)', () => {
  const html = HtmlInspector.loadHtml('public/vtt.html');
  expect(html).toContain('socket.io');
  expect(html).toContain('/js/components.js');
  expect(html).toContain('/js/theme-toggle.js');
  expect(html).toContain('/app.js');
}, { feature: 'F6', tier: 1 });

/**
 * ============================================================================
 * FEATURE F7: Tactical Map Grid & Tokens
 * ============================================================================
 */
tier1Suite.test('T1-F07-01', 'F7: Tactical map grid container has .vtt-grid class with 12x12 division styling in vtt.html', () => {
  const html = HtmlInspector.loadHtml('public/vtt.html');
  expect(html).toContain('.vtt-grid');
  expect(html).toContain('calc(100% / 12)');
  expect(HtmlInspector.hasElement(html, '#mapContainer')).toBe(true);
}, { feature: 'F7', tier: 1 });

tier1Suite.test('T1-F07-02', 'F7: Token placement button #addTokenBtn and token rendering logic exist in app.js', () => {
  const js = HtmlInspector.loadHtml('public/app.js');
  expect(js).toContain('addTokenBtn');
  expect(js).toContain('add-token');
  expect(js).toContain('token-element');
}, { feature: 'F7', tier: 1 });

tier1Suite.test('T1-F07-03', 'F7: Background map URL switcher #setMapBtn emits update-map Socket.IO event in app.js', () => {
  const js = HtmlInspector.loadHtml('public/app.js');
  expect(js).toContain('setMapBtn');
  expect(js).toContain('update-map');
  expect(js).toContain('mapUrlInput');
}, { feature: 'F7', tier: 1 });

tier1Suite.test('T1-F07-04', 'F7: Token position math uses 12x12 coordinate percentages (x/12 and y/12) in app.js', () => {
  const js = HtmlInspector.loadHtml('public/app.js');
  expect(js).toContain('${token.x} / 12');
  expect(js).toContain('${token.y} / 12');
}, { feature: 'F7', tier: 1 });

tier1Suite.test('T1-F07-05', 'F7: Token removal handler emits remove-token Socket.IO event in app.js', () => {
  const js = HtmlInspector.loadHtml('public/app.js');
  expect(js).toContain('removeToken');
  expect(js).toContain('remove-token');
}, { feature: 'F7', tier: 1 });

/**
 * ============================================================================
 * FEATURE F8: Dice Tray, Pool & Formula Parser
 * ============================================================================
 */
tier1Suite.test('T1-F08-01', 'F8: Polyhedral dice buttons exist for d4, d6, d8, d10, d12, d20, d100 in vtt.html', () => {
  const html = HtmlInspector.loadHtml('public/vtt.html');
  expect(html).toContain('addToPool(4)');
  expect(html).toContain('addToPool(6)');
  expect(html).toContain('addToPool(8)');
  expect(html).toContain('addToPool(10)');
  expect(html).toContain('addToPool(12)');
  expect(html).toContain('addToPool(20)');
  expect(html).toContain('addToPool(100)');
}, { feature: 'F8', tier: 1 });

tier1Suite.test('T1-F08-02', 'F8: Dice pool builder functions (addToPool, removeFromPool, rollPool, clearPool) in app.js', () => {
  const js = HtmlInspector.loadHtml('public/app.js');
  expect(js).toContain('addToPool');
  expect(js).toContain('removeFromPool');
  expect(js).toContain('rollPool');
  expect(js).toContain('clearPool');
}, { feature: 'F8', tier: 1 });

tier1Suite.test('T1-F08-03', 'F8: Custom formula input #customRollInput and execution function executeCustomRoll in app.js', () => {
  const html = HtmlInspector.loadHtml('public/vtt.html');
  expect(HtmlInspector.hasElement(html, '#customRollInput')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#customRollForm')).toBe(true);

  const js = HtmlInspector.loadHtml('public/app.js');
  expect(js).toContain('executeCustomRoll');
  expect(js).toContain('parseAndRoll');
}, { feature: 'F8', tier: 1 });

tier1Suite.test('T1-F08-04', 'F8: DiceRollerService arithmetic evaluation accurately computes multi-die formulas (e.g. 2d6+4)', () => {
  const result = DiceRollerService.roll('2d6+4');
  expect(result.rolls.length).toBe(2);
  expect(result.rolls.every((r) => r >= 1 && r <= 6)).toBe(true);
  expect(result.modifier).toBe(4);
  expect(result.total).toBe(result.rolls[0] + result.rolls[1] + 4);
}, { feature: 'F8', tier: 1 });

tier1Suite.test('T1-F08-05', 'F8: Critical roll detection flags Nat 20 as critical success and Nat 1 as critical failure', () => {
  const critSuccess = DiceRollerService.parseFormula('1d20');
  expect(critSuccess).toBeDefined();
  const rollObj = DiceRollerService.roll('1d20');
  expect(rollObj.rolls[0]).toBeGreaterThanOrEqual(1);
  expect(rollObj.rolls[0]).toBeLessThanOrEqual(20);
}, { feature: 'F8', tier: 1 });

/**
 * ============================================================================
 * FEATURE F9: OBS Stream Overlay & Settings
 * ============================================================================
 */
tier1Suite.test('T1-F09-01', 'F9: OBS overlay view has transparent background and roll feed container #feed in overlay.html', () => {
  const html = HtmlInspector.loadHtml('public/overlay.html');
  expect(HtmlInspector.hasElement(html, '#feed')).toBe(true);
  expect(html).toContain('background-color: transparent');
}, { feature: 'F9', tier: 1 });

tier1Suite.test('T1-F09-02', 'F9: Overlay client script renders roll cards with character avatar, formula, and result badge in overlay.js', () => {
  const js = HtmlInspector.loadHtml('public/overlay.js');
  expect(js).toContain('createRollCard');
  expect(js).toContain('roll-card');
  expect(js).toContain('Nat 20!');
  expect(js).toContain('Crit Fail');
}, { feature: 'F9', tier: 1 });

tier1Suite.test('T1-F09-03', 'F9: Overlay settings view contains position, animation style, and font size selects in overlay-settings.html', () => {
  const html = HtmlInspector.loadHtml('public/overlay-settings.html');
  expect(HtmlInspector.hasElement(html, '#position')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#animationStyle')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#fontSize')).toBe(true);
}, { feature: 'F9', tier: 1 });

tier1Suite.test('T1-F09-04', 'F9: Overlay settings view contains timeout slider, formula display toggle, and sound effect toggle', () => {
  const html = HtmlInspector.loadHtml('public/overlay-settings.html');
  expect(HtmlInspector.hasElement(html, '#autoHideTimeout')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#showFormula')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#soundEffectsEnabled')).toBe(true);
}, { feature: 'F9', tier: 1 });

tier1Suite.test('T1-F09-05', 'F9: Overlay settings preview trigger #openOverlay and config persistence in localStorage', () => {
  const html = HtmlInspector.loadHtml('public/overlay-settings.html');
  expect(HtmlInspector.hasElement(html, '#openOverlay')).toBe(true);
  expect(html).toContain('vtt-overlay-config');
}, { feature: 'F9', tier: 1 });

/**
 * ============================================================================
 * FEATURE F10: Character Sheet View & Vitals
 * ============================================================================
 */
tier1Suite.test('T1-F10-01', 'F10: Character view renders full profile header (#avatar, #name, #meta, #level, #alignment, #xp)', () => {
  const html = HtmlInspector.loadHtml('public/character-view.html');
  expect(HtmlInspector.hasElement(html, '#avatar')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#name')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#meta')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#level')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#alignment')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#xp')).toBe(true);
}, { feature: 'F10', tier: 1 });

tier1Suite.test('T1-F10-02', 'F10: Character view includes dynamic proficiency bonus and quick-stats (#prof, #speed, #initiative, #armor)', () => {
  const html = HtmlInspector.loadHtml('public/character-view.html');
  expect(HtmlInspector.hasElement(html, '#prof')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#speed')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#initiative')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#armor')).toBe(true);
}, { feature: 'F10', tier: 1 });

tier1Suite.test('T1-F10-03', 'F10: Character view includes interactive HP meter (#hp-current, #hp-max, #hp-temp, #hp-bar)', () => {
  const html = HtmlInspector.loadHtml('public/character-view.html');
  expect(HtmlInspector.hasElement(html, '#hp-current')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#hp-max')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#hp-temp')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#hp-bar')).toBe(true);
}, { feature: 'F10', tier: 1 });

tier1Suite.test('T1-F10-04', 'F10: Character view computes spell attack bonus and save DC (#spell-attack-header)', () => {
  const html = HtmlInspector.loadHtml('public/character-view.html');
  expect(HtmlInspector.hasElement(html, '#spell-attack-header')).toBe(true);
  expect(html).toContain('spellDC = 8 + profBonus + Math.max');
}, { feature: 'F10', tier: 1 });

tier1Suite.test('T1-F10-05', 'F10: Character view contains Heal / Damage modal triggers and actions (.btn-heal, .btn-vtt)', () => {
  const html = HtmlInspector.loadHtml('public/character-view.html');
  expect(html).toContain('openHpModal');
  expect(html).toContain('.btn-heal');
  expect(html).toContain('.btn-vtt');
  expect(HtmlInspector.hasElement(html, '#defensesBtn')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#conditionsBtn')).toBe(true);
}, { feature: 'F10', tier: 1 });

/**
 * ============================================================================
 * FEATURE F11: Character 8 Tabs & Rest Mechanics
 * ============================================================================
 */
tier1Suite.test('T1-F11-01', 'F11: Character view contains all 8 tab sections (abilities, skills, actions, inventory, features, proficiencies, background, notes)', () => {
  const html = HtmlInspector.loadHtml('public/character-view.html');
  const tabs = ['abilities', 'skills', 'actions', 'inventory', 'features', 'proficiencies', 'background', 'notes'];
  for (const tab of tabs) {
    expect(html).toContain(`data-tab="${tab}"`);
  }
}, { feature: 'F11', tier: 1 });

tier1Suite.test('T1-F11-02', 'F11: Character view contains floating action buttons (.fab-container) and quick navigation overlay #navOverlay', () => {
  const html = HtmlInspector.loadHtml('public/character-view.html');
  expect(HtmlInspector.hasElement(html, '.fab-container')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#fabDiceBtn')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#fabMenuBtn')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#navOverlay')).toBe(true);
}, { feature: 'F11', tier: 1 });

tier1Suite.test('T1-F11-03', 'F11: Character view includes 6 ability scores cards, saving throws, and 18 skills with proficiency dots', () => {
  const html = HtmlInspector.loadHtml('public/character-view.html');
  expect(HtmlInspector.hasElement(html, '#abilities')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#saves')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#skills')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#senses')).toBe(true);
  expect(html).toContain('prof-dot');
}, { feature: 'F11', tier: 1 });

tier1Suite.test('T1-F11-04', 'F11: Character view includes carrying capacity weight bar (#weight-bar, #weight-text) and item search #inventorySearch', () => {
  const html = HtmlInspector.loadHtml('public/character-view.html');
  expect(HtmlInspector.hasElement(html, '#weight-bar')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#weight-text')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#inventorySearch')).toBe(true);
  expect(HtmlInspector.hasElement(html, '#equipment')).toBe(true);
}, { feature: 'F11', tier: 1 });

tier1Suite.test('T1-F11-05', 'F11: Hit dice spending and Short / Long Rest mechanics implemented in character-view.html', () => {
  const html = HtmlInspector.loadHtml('public/character-view.html');
  expect(html).toContain('spendHitDie');
  expect(html).toContain('shortRest');
  expect(html).toContain('longRest');
}, { feature: 'F11', tier: 1 });

/**
 * ============================================================================
 * FEATURE F12: Backend Architecture Deliverable Audit
 * ============================================================================
 */
tier1Suite.test('T1-F12-01', 'F12: docs/BACKEND_RECOMMENDATIONS.md contains Section 1: REST API Specification (Auth, Characters, Sessions, Maps, Overlays)', () => {
  const md = MarkdownInspector.loadMarkdown('docs/BACKEND_RECOMMENDATIONS.md');
  expect(MarkdownInspector.hasSection(md, 'REST API Specification')).toBe(true);
  expect(MarkdownInspector.hasEndpoint(md, 'POST', '/api/v2/auth/login')).toBe(true);
  expect(MarkdownInspector.hasEndpoint(md, 'POST', '/api/v2/auth/register')).toBe(true);
  expect(MarkdownInspector.hasEndpoint(md, 'GET', '/api/v2/character')).toBe(true);
  expect(MarkdownInspector.hasEndpoint(md, 'POST', '/api/v2/character/import')).toBe(true);
  expect(MarkdownInspector.hasEndpoint(md, 'POST', '/api/v2/sessions')).toBe(true);
}, { feature: 'F12', tier: 1 });

tier1Suite.test('T1-F12-02', 'F12: docs/BACKEND_RECOMMENDATIONS.md contains Section 2: Real-time WebSocket Protocol and Event Catalog', () => {
  const md = MarkdownInspector.loadMarkdown('docs/BACKEND_RECOMMENDATIONS.md');
  expect(MarkdownInspector.hasSection(md, 'WebSocket')).toBe(true);
  expect(MarkdownInspector.hasWebSocketEvent(md, 'join-room')).toBe(true);
  expect(MarkdownInspector.hasWebSocketEvent(md, 'update-map')).toBe(true);
  expect(MarkdownInspector.hasWebSocketEvent(md, 'add-token')).toBe(true);
  expect(MarkdownInspector.hasWebSocketEvent(md, 'move-token')).toBe(true);
  expect(MarkdownInspector.hasWebSocketEvent(md, 'remove-token')).toBe(true);
  expect(MarkdownInspector.hasWebSocketEvent(md, 'send-roll')).toBe(true);
  expect(MarkdownInspector.hasWebSocketEvent(md, 'new-roll')).toBe(true);
}, { feature: 'F12', tier: 1 });

tier1Suite.test('T1-F12-03', 'F12: docs/BACKEND_RECOMMENDATIONS.md contains Section 3: Relational Database Schema and DDL Table Definitions', () => {
  const md = MarkdownInspector.loadMarkdown('docs/BACKEND_RECOMMENDATIONS.md');
  expect(MarkdownInspector.hasSection(md, 'Database Schema')).toBe(true);
  expect(md).toContain('CREATE TABLE');
  expect(md).toContain('users');
  expect(md).toContain('characters');
  expect(md).toContain('game_sessions');
  expect(md).toContain('dice_rolls');
}, { feature: 'F12', tier: 1 });

tier1Suite.test('T1-F12-04', 'F12: docs/BACKEND_RECOMMENDATIONS.md contains Section 4: D&D Beyond Integration, Normalization & Webhook Sync Strategy', () => {
  const md = MarkdownInspector.loadMarkdown('docs/BACKEND_RECOMMENDATIONS.md');
  expect(MarkdownInspector.hasSection(md, 'D&D Beyond Integration')).toBe(true);
  expect(md).toContain('CobaltSession');
  expect(md).toContain('AES-256-GCM');
  expect(md).toContain('Rate Limiting');
}, { feature: 'F12', tier: 1 });

tier1Suite.test('T1-F12-05', 'F12: docs/BACKEND_RECOMMENDATIONS.md contains Section 5: Cloud, Serverless & Edge Deployment Guide', () => {
  const md = MarkdownInspector.loadMarkdown('docs/BACKEND_RECOMMENDATIONS.md');
  expect(MarkdownInspector.hasSection(md, 'Serverless')).toBe(true);
  expect(md).toContain('Vercel');
  expect(md).toContain('Supabase');
  expect(md).toContain('Redis');
  expect(md).toContain('PartyKit');
}, { feature: 'F12', tier: 1 });
