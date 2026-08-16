/**
 * E2E Testing Helpers & Inspection Toolkit for VTT Asal Jadi
 * Standalone Node.js ESM module with zero external binary dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';
import express, { Router } from 'express';
import request from 'supertest';
import { fileURLToPath } from 'node:url';
import { createAuthRouter } from '../../dist/routes/auth.js';
import { createCharacterRouter } from '../../dist/routes/character.js';
import { createRollsRouter } from '../../dist/routes/rolls.js';
import { createSessionsRouter } from '../../dist/routes/sessions.js';
import { DiceRollerService as BaseDiceRollerService } from '../../dist/services/DiceRollerService.js';
import { WebSocketManager } from '../../dist/services/WebSocketManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

/**
 * ============================================================================
 * 1. EXPECT ASSERTION ENGINE
 * ============================================================================
 */
export class Expectation {
  constructor(actual, isNot = false) {
    this.actual = actual;
    this.isNot = isNot;
  }

  get not() {
    return new Expectation(this.actual, !this.isNot);
  }

  _evaluate(condition, message, expected) {
    const passed = this.isNot ? !condition : Boolean(condition);
    if (!passed) {
      const prefix = this.isNot ? 'Expected value NOT to match' : 'Expected value to match';
      const error = new Error(`${prefix}: ${message}\n  Expected: ${JSON.stringify(expected)}\n  Received: ${JSON.stringify(this.actual)}`);
      error.expected = expected;
      error.actual = this.actual;
      throw error;
    }
    return true;
  }

  toBe(expected) {
    return this._evaluate(Object.is(this.actual, expected), `toBe (${expected})`, expected);
  }

  toEqual(expected) {
    const areEqual = (a, b) => {
      if (Object.is(a, b)) return true;
      if (typeof a !== typeof b) return false;
      if (typeof a !== 'object' || a === null || b === null) return false;
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      if (Array.isArray(a)) {
        if (a.length !== b.length) return false;
        return a.every((item, i) => areEqual(item, b[i]));
      }
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      return keysA.every((k) => Object.prototype.hasOwnProperty.call(b, k) && areEqual(a[k], b[k]));
    };
    return this._evaluate(areEqual(this.actual, expected), 'toEqual', expected);
  }

  toContain(item) {
    if (typeof this.actual === 'string' || Array.isArray(this.actual)) {
      return this._evaluate(this.actual.includes(item), `toContain (${item})`, item);
    }
    if (typeof this.actual === 'object' && this.actual !== null) {
      return this._evaluate(item in this.actual, `toContain key (${item})`, item);
    }
    throw new Error(`Cannot call toContain on type ${typeof this.actual}`);
  }

  toMatch(regex) {
    const re = typeof regex === 'string' ? new RegExp(regex) : regex;
    return this._evaluate(re.test(String(this.actual)), `toMatch (${regex})`, regex);
  }

  toBeGreaterThan(num) {
    return this._evaluate(this.actual > num, `toBeGreaterThan (${num})`, num);
  }

  toBeGreaterThanOrEqual(num) {
    return this._evaluate(this.actual >= num, `toBeGreaterThanOrEqual (${num})`, num);
  }

  toBeLessThan(num) {
    return this._evaluate(this.actual < num, `toBeLessThan (${num})`, num);
  }

  toBeLessThanOrEqual(num) {
    return this._evaluate(this.actual <= num, `toBeLessThanOrEqual (${num})`, num);
  }

  toBeDefined() {
    return this._evaluate(this.actual !== undefined, 'toBeDefined', 'defined');
  }

  toBeUndefined() {
    return this._evaluate(this.actual === undefined, 'toBeUndefined', undefined);
  }

  toBeNull() {
    return this._evaluate(this.actual === null, 'toBeNull', null);
  }

  toBeTruthy() {
    return this._evaluate(Boolean(this.actual), 'toBeTruthy', true);
  }

  toBeFalsy() {
    return this._evaluate(!this.actual, 'toBeFalsy', false);
  }

  toThrow(expectedError) {
    if (typeof this.actual !== 'function') {
      throw new Error('Expected function when testing toThrow()');
    }
    let threw = false;
    let thrownError;
    try {
      this.actual();
    } catch (err) {
      threw = true;
      thrownError = err;
    }
    if (!threw) {
      return this._evaluate(false, 'Function did not throw an error', expectedError);
    }
    if (expectedError) {
      if (typeof expectedError === 'string') {
        return this._evaluate(thrownError.message.includes(expectedError), `Error message containing "${expectedError}"`, expectedError);
      }
      if (expectedError instanceof RegExp) {
        return this._evaluate(expectedError.test(thrownError.message), `Error message matching ${expectedError}`, expectedError);
      }
    }
    return this._evaluate(true, 'Function threw error', expectedError);
  }
}

export function expect(actual) {
  return new Expectation(actual);
}

/**
 * ============================================================================
 * 2. HTML INSPECTION UTILITY
 * ============================================================================
 */
export class HtmlInspector {
  static loadHtml(relativeOrAbsPath) {
    const fullPath = path.isAbsolute(relativeOrAbsPath) ? relativeOrAbsPath : path.resolve(ROOT_DIR, relativeOrAbsPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`HTML view not found: ${fullPath}`);
    }
    return fs.readFileSync(fullPath, 'utf8');
  }

  static hasElement(html, selector) {
    return this.countElements(html, selector) > 0;
  }

  static countElements(html, selector) {
    const cleanSelector = selector.trim();

    // 1. ID selector: #foo or tag#foo
    if (cleanSelector.startsWith('#')) {
      const id = cleanSelector.slice(1);
      const re = new RegExp(`id=["']${id}["']`, 'i');
      return re.test(html) ? 1 : 0;
    }
    if (cleanSelector.includes('#') && !cleanSelector.includes('[')) {
      const [tag, id] = cleanSelector.split('#');
      const re = new RegExp(`<${tag}[^>]*id=["']${id}["']`, 'i');
      return re.test(html) ? 1 : 0;
    }

    // 2. Class selector: .foo or tag.foo
    if (cleanSelector.startsWith('.')) {
      const cls = cleanSelector.slice(1);
      const re = new RegExp(`class=["'][^"']*\\b${cls}\\b[^"']*["']`, 'i');
      const matches = html.match(new RegExp(`class=["'][^"']*\\b${cls}\\b[^"']*["']`, 'gi'));
      return matches ? matches.length : 0;
    }
    if (cleanSelector.includes('.') && !cleanSelector.includes('[')) {
      const [tag, cls] = cleanSelector.split('.');
      const matches = html.match(new RegExp(`<${tag}[^>]*class=["'][^"']*\\b${cls}\\b[^"']*["']`, 'gi'));
      return matches ? matches.length : 0;
    }

    // 3. Attribute selector: [attr], [attr="val"], [attr*="val"], tag[attr], tag[attr="val"], etc.
    const attrMatch = cleanSelector.match(/^([a-zA-Z0-9_-]*)\[([a-zA-Z0-9_-]+)(?:([*~|^$]?=)["']?([^"'\]]+)["']?)?\]$/);
    if (attrMatch) {
      const [, tag, attr, op, val] = attrMatch;
      const tagPart = tag ? `<${tag}\\b[^>]*` : '<[a-zA-Z0-9_-]+\\b[^>]*';
      if (!op) {
        const re = new RegExp(`${tagPart}\\b${attr}\\b[^>]*>`, 'gi');
        const matches = html.match(re);
        return matches ? matches.length : 0;
      }
      const escapedVal = val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let valPattern = `"${escapedVal}"|'${escapedVal}'`;
      if (op === '*=') {
        valPattern = `"[^"]*${escapedVal}[^"]*"|'[^']*${escapedVal}[^']*'`;
      }
      const re = new RegExp(`${tagPart}\\b${attr}=(?:${valPattern})[^>]*>`, 'gi');
      const matches = html.match(re);
      return matches ? matches.length : 0;
    }

    // 4. Raw tag selector
    const tagMatch = cleanSelector.match(/^[a-zA-Z0-9_-]+$/);
    if (tagMatch) {
      const tag = tagMatch[0];
      const re = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
      const matches = html.match(re);
      return matches ? matches.length : 0;
    }

    return html.includes(selector) ? 1 : 0;
  }

  static getElement(html, selector) {
    const cleanSelector = selector.trim();
    let re;
    if (cleanSelector.startsWith('#')) {
      const id = cleanSelector.slice(1);
      re = new RegExp(`(<[a-zA-Z0-9_-]+[^>]*id=["']${id}["'][^>]*>)([\\s\\S]*?)(<\\/[a-zA-Z0-9_-]+>|(?=<[a-zA-Z0-9_-]))?`, 'i');
    } else {
      re = new RegExp(`(<[a-zA-Z0-9_-]+[^>]*${cleanSelector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^>]*>)([\\s\\S]*?)(<\\/[a-zA-Z0-9_-]+>)?`, 'i');
    }
    const match = html.match(re);
    if (!match) return null;
    const openingTag = match[1] || '';
    const innerContent = match[2] || '';

    const attributes = {};
    const attrRegex = /([a-zA-Z0-9_-]+)=["']([^"']*)["']/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(openingTag)) !== null) {
      attributes[attrMatch[1]] = attrMatch[2];
    }
    return {
      tag: openingTag,
      attributes,
      id: attributes.id || null,
      className: attributes.class || '',
      type: attributes.type || null,
      value: attributes.value || null,
      placeholder: attributes.placeholder || null,
      innerHTML: innerContent,
      innerText: innerContent.replace(/<[^>]*>/g, '').trim(),
    };
  }

  static hasStylesheet(html, hrefPattern) {
    const re = new RegExp(`<link[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*${hrefPattern}[^"']*["']|<link[^>]*href=["'][^"']*${hrefPattern}[^"']*["'][^>]*rel=["']stylesheet["']`, 'i');
    return re.test(html);
  }

  static hasScript(html, srcPattern) {
    const re = new RegExp(`<script[^>]*src=["'][^"']*${srcPattern}[^"']*["']`, 'i');
    return re.test(html);
  }
}

/**
 * ============================================================================
 * 3. CSS INSPECTION UTILITY
 * ============================================================================
 */
export class CssInspector {
  static loadCss(relativeOrAbsPath) {
    const fullPath = path.isAbsolute(relativeOrAbsPath) ? relativeOrAbsPath : path.resolve(ROOT_DIR, relativeOrAbsPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`CSS file not found: ${fullPath}`);
    }
    return fs.readFileSync(fullPath, 'utf8');
  }

  static getCssVariable(css, varName, selector = ':root') {
    const cleanVar = varName.startsWith('--') ? varName : `--${varName}`;
    const selectorIndex = css.indexOf(selector);
    const searchArea = selectorIndex !== -1 ? css.slice(selectorIndex) : css;
    const re = new RegExp(`${cleanVar}\\s*:\\s*([^;]+);`, 'i');
    const match = searchArea.match(re);
    return match ? match[1].trim() : null;
  }

  static getAllCssVariables(css, selector = ':root') {
    const vars = {};
    const selectorIndex = css.indexOf(selector);
    const searchArea = selectorIndex !== -1 ? css.slice(selectorIndex) : css;
    const re = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;]+);/g;
    let match;
    while ((match = re.exec(searchArea)) !== null) {
      vars[match[1]] = match[2].trim();
    }
    return vars;
  }

  static hasRule(css, selectorPattern, propertyPattern, valuePattern) {
    const re = new RegExp(`${selectorPattern}[^{]*\\{[^}]*${propertyPattern}\\s*:\\s*[^;}]*${valuePattern || ''}[^;}]*[;}]`, 'i');
    return re.test(css);
  }

  static hasKeyframes(css, animationName) {
    const re = new RegExp(`@keyframes\\s+${animationName}\\s*\\{`, 'i');
    return re.test(css);
  }

  static hasMediaQuery(css, queryPattern) {
    const re = new RegExp(`@media\\s*\\([^)]*${queryPattern}[^)]*\\)`, 'i');
    return re.test(css);
  }
}

/**
 * ============================================================================
 * 4. MARKDOWN INSPECTION UTILITY
 * ============================================================================
 */
export class MarkdownInspector {
  static loadMarkdown(relativeOrAbsPath) {
    const fullPath = path.isAbsolute(relativeOrAbsPath) ? relativeOrAbsPath : path.resolve(ROOT_DIR, relativeOrAbsPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Markdown file not found: ${fullPath}`);
    }
    return fs.readFileSync(fullPath, 'utf8');
  }

  static hasSection(md, headingTitle, level = null) {
    const prefix = level ? '#'.repeat(level) : '#+';
    const escaped = headingTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:^${prefix}\\s+.*${escaped}|${escaped})`, 'im');
    return re.test(md);
  }

  static hasEndpoint(md, method, pathPattern) {
    const escapedPath = pathPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:${method.toUpperCase()}|###\\s+${method.toUpperCase()}|\\b${method.toUpperCase()}\\b)\\s+.*${escapedPath}`, 'i');
    return re.test(md);
  }

  static hasTableWithHeaders(md, headers) {
    return headers.every((header) => {
      const re = new RegExp(`\\|[^\\n]*${header}[^\\n]*\\|`, 'i');
      return re.test(md);
    });
  }

  static hasStatusCode(md, code) {
    const re = new RegExp(`(?:` + '`' + `${code}` + '`' + `|\\b${code}\\b)`, 'i');
    return re.test(md);
  }

  static hasWebSocketEvent(md, eventName) {
    const escaped = eventName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(?:` + '`' + `${escaped}` + '`' + `|["']${escaped}["']|${escaped})`, 'i');
    return re.test(md);
  }
}

/**
 * ============================================================================
 * 5. IN-MEMORY DATABASE SERVICE
 * ============================================================================
 */
export class InMemoryDatabase {
  constructor() {
    this.users = new Map();
    this.usersByName = new Map();
    this.gameSessions = new Map();
    this.sessionsByRoom = new Map();
    this.sessionPasswords = new Map();
    this.sessionParticipants = new Map();
    this.characterSheets = new Map();
    this.characters = new Map();
    this.diceRolls = [];
    this.nextUserId = 1;
    this.nextSessionId = 1;
    this.nextRollId = 1;
  }

  async migrate() {}

  async run(sql, params = []) {
    const s = sql.trim();

    // 1. Users
    if (s.startsWith('INSERT INTO users')) {
      const username = String(params[0]);
      if (this.usersByName.has(username.toLowerCase())) {
        const err = new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: users.username');
        err.code = 'SQLITE_CONSTRAINT';
        throw err;
      }
      const user = {
        id: this.nextUserId++,
        username,
        password_hash: String(params[1]),
        salt: String(params[2]),
        created_at: new Date().toISOString(),
      };
      this.users.set(user.id, user);
      this.usersByName.set(username.toLowerCase(), user);
      return { lastID: user.id, changes: 1 };
    }

    // 2. Game Sessions
    if (s.startsWith('INSERT INTO game_sessions')) {
      const roomId = String(params[0]).toLowerCase();
      if (this.sessionsByRoom.has(roomId)) {
        const err = new Error('SQLITE_CONSTRAINT: UNIQUE constraint failed: game_sessions.room_id');
        err.code = 'SQLITE_CONSTRAINT';
        throw err;
      }
      const session = {
        id: this.nextSessionId++,
        room_id: roomId,
        created_by: params[1] ? Number(params[1]) : null,
        name: String(params[2] ?? ''),
        description: String(params[3] ?? ''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.gameSessions.set(session.id, session);
      this.sessionsByRoom.set(roomId, session);
      return { lastID: session.id, changes: 1 };
    }

    if (s.startsWith('INSERT OR IGNORE INTO game_sessions')) {
      const roomId = String(params[0]).toLowerCase();
      if (!this.sessionsByRoom.has(roomId)) {
        const session = {
          id: this.nextSessionId++,
          room_id: roomId,
          created_by: null,
          name: '',
          description: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.gameSessions.set(session.id, session);
        this.sessionsByRoom.set(roomId, session);
        return { lastID: session.id, changes: 1 };
      }
      return { lastID: this.sessionsByRoom.get(roomId).id, changes: 0 };
    }

    // 3. Session Passwords
    if (s.startsWith('INSERT INTO session_passwords')) {
      let sessionId;
      let hash;
      if (s.includes('SELECT id FROM game_sessions')) {
        const roomId = String(params[0]).toLowerCase();
        const session = this.sessionsByRoom.get(roomId);
        sessionId = session ? session.id : null;
        hash = String(params[1]);
      } else {
        sessionId = Number(params[0]);
        hash = String(params[1]);
      }
      if (sessionId) {
        this.sessionPasswords.set(sessionId, hash);
      }
      return { lastID: sessionId || 1, changes: 1 };
    }

    // 4. Session Participants
    if (s.includes('INSERT INTO session_participants')) {
      const sessionId = Number(params[0]);
      const userId = Number(params[1]);
      const characterId = params[2] ? String(params[2]) : null;
      const key = `${sessionId}:${userId}`;
      this.sessionParticipants.set(key, {
        session_id: sessionId,
        user_id: userId,
        character_id: characterId,
        joined_at: new Date().toISOString(),
      });
      return { lastID: 1, changes: 1 };
    }

    // 5. Dice Rolls
    if (s.startsWith('INSERT INTO dice_rolls')) {
      let roll;
      if (params.length >= 8) {
        roll = {
          id: this.nextRollId++,
          session_id: Number(params[0]),
          character_id: params[1] ? String(params[1]) : null,
          character_name: String(params[2] ?? 'Adventurer'),
          roll_name: String(params[3] ?? 'Roll'),
          roll_formula: String(params[4]),
          result: Number(params[5]),
          is_critical: Number(params[6] ?? 0),
          rolls_json: String(params[7] ?? '[]'),
          created_at: new Date().toISOString(),
        };
      } else {
        roll = {
          id: this.nextRollId++,
          session_id: Number(params[0]),
          character_id: params[1] ? String(params[1]) : null,
          character_name: 'Test Character',
          roll_name: 'Roll',
          roll_formula: String(params[2]),
          result: Number(params[3]),
          is_critical: Number(params[4] ?? 0),
          rolls_json: JSON.stringify([params[3]]),
          created_at: new Date().toISOString(),
        };
      }
      this.diceRolls.push(roll);
      return { lastID: roll.id, changes: 1 };
    }

    // 6. Character Sheets & Characters
    if (s.includes('INSERT INTO character_sheets')) {
      const id = String(params[0]);
      const userId = Number(params[1]);
      const characterData = String(params[2]);
      this.characterSheets.set(id, {
        id,
        user_id: userId,
        character_data: characterData,
        last_synced: new Date().toISOString(),
      });
      return { lastID: 1, changes: 1 };
    }

    if (s.includes('INSERT INTO characters')) {
      const id = String(params[0]);
      const userId = Number(params[1]);
      const name = String(params[2]);
      const data = String(params[3]);
      this.characters.set(id, {
        id,
        user_id: userId,
        name,
        data,
        created_at: new Date().toISOString(),
      });
      return { lastID: 1, changes: 1 };
    }

    if (s.startsWith('UPDATE character_sheets')) {
      const characterData = String(params[0]);
      const id = String(params[1]);
      const userId = Number(params[2]);
      const sheet = this.characterSheets.get(id);
      if (sheet && sheet.user_id === userId) {
        sheet.character_data = characterData;
        sheet.last_synced = new Date().toISOString();
        return { lastID: 1, changes: 1 };
      }
      return { lastID: 0, changes: 0 };
    }

    if (s.startsWith('DELETE FROM character_sheets')) {
      const id = String(params[0]);
      const userId = Number(params[1]);
      const sheet = this.characterSheets.get(id);
      if (sheet && sheet.user_id === userId) {
        this.characterSheets.delete(id);
        this.characters.delete(id);
        return { lastID: 1, changes: 1 };
      }
      return { lastID: 0, changes: 0 };
    }

    return { lastID: 1, changes: 1 };
  }

  async get(sql, params = []) {
    const s = sql.trim();

    // 1. Users
    if (s.includes('FROM users WHERE username = ?')) {
      const username = String(params[0]).toLowerCase();
      const user = this.usersByName.get(username);
      return user || undefined;
    }

    if (s.includes('FROM users WHERE id = ?')) {
      const id = Number(params[0]);
      const user = this.users.get(id);
      return user ? { id: user.id, username: user.username } : undefined;
    }

    // 2. Game Sessions
    if (s.includes('FROM game_sessions WHERE room_id = ?')) {
      const roomId = String(params[0]).toLowerCase();
      const session = this.sessionsByRoom.get(roomId);
      if (!session) return undefined;
      return {
        id: session.id,
        roomId: session.room_id,
        createdBy: session.created_by,
        name: session.name,
        description: session.description,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
      };
    }

    // 3. Session Passwords
    if (s.includes('FROM session_passwords WHERE session_id = ?')) {
      const sessionId = Number(params[0]);
      const hash = this.sessionPasswords.get(sessionId);
      return hash ? { password_hash: hash } : undefined;
    }

    // 4. Session Participants
    if (s.includes('FROM session_participants WHERE session_id = ? AND user_id = ?')) {
      const sessionId = Number(params[0]);
      const userId = Number(params[1]);
      const p = this.sessionParticipants.get(`${sessionId}:${userId}`);
      if (!p) return undefined;
      return { userId: p.user_id, characterId: p.character_id, joinedAt: p.joined_at };
    }

    // 5. Character Sheets
    if (s.includes('FROM character_sheets WHERE id = ? AND user_id = ?')) {
      const id = String(params[0]);
      const userId = Number(params[1]);
      const sheet = this.characterSheets.get(id);
      if (sheet && sheet.user_id === userId) {
        return sheet;
      }
      return undefined;
    }

    if (s.includes('FROM character_sheets WHERE id = ?')) {
      const id = String(params[0]);
      const sheet = this.characterSheets.get(id);
      return sheet || undefined;
    }

    // 6. Dice Rolls aggregates
    if (s.includes('COUNT(*) AS totalRolls') || s.includes('SELECT COUNT(*) AS totalRolls') || s.includes('COUNT(*) AS total')) {
      const sessionId = Number(params[0]);
      const matching = this.diceRolls.filter((r) => r.session_id === sessionId);
      if (matching.length === 0) {
        return { total: 0, totalRolls: 0, averageResult: 0, criticalCount: 0 };
      }
      const totalRolls = matching.length;
      const sum = matching.reduce((acc, curr) => acc + curr.result, 0);
      const averageResult = parseFloat((sum / totalRolls).toFixed(2));
      const criticalCount = matching.reduce((acc, curr) => acc + (curr.is_critical ? 1 : 0), 0);
      return { total: totalRolls, totalRolls, averageResult, criticalCount };
    }

    return undefined;
  }

  async all(sql, params = []) {
    const s = sql.trim();

    // 1. Character list for user
    if (s.includes('FROM character_sheets WHERE user_id = ?')) {
      const userId = Number(params[0]);
      const userSheets = [...this.characterSheets.values()].filter((sheet) => sheet.user_id === userId);
      return userSheets;
    }

    // 2. Session Participants
    if (s.includes('FROM session_participants WHERE session_id = ?')) {
      const sessionId = Number(params[0]);
      const matching = [...this.sessionParticipants.values()].filter((p) => p.session_id === sessionId);
      return matching.map((p) => ({ userId: p.user_id, characterId: p.character_id, joinedAt: p.joined_at }));
    }

    // 3. Dice Rolls history
    if (s.includes('FROM dice_rolls WHERE session_id = ? ORDER BY id DESC')) {
      const sessionId = Number(params[0]);
      const matching = this.diceRolls
        .filter((r) => r.session_id === sessionId)
        .sort((a, b) => b.id - a.id)
        .slice(0, 100);
      return matching.map((r) => ({
        id: r.id,
        characterId: r.character_id,
        characterName: r.character_name,
        rollName: r.roll_name,
        formula: r.roll_formula,
        result: r.result,
        isCritical: r.is_critical,
        rolls: r.rolls_json,
        createdAt: r.created_at,
      }));
    }

    // 4. Dice Rolls export
    if (s.includes('FROM dice_rolls WHERE session_id = ? ORDER BY id ASC')) {
      const sessionId = Number(params[0]);
      const matching = this.diceRolls
        .filter((r) => r.session_id === sessionId)
        .sort((a, b) => a.id - b.id);
      return matching.map((r) => ({
        characterId: r.character_id,
        formula: r.roll_formula,
        result: r.result,
        isCritical: r.is_critical,
        rolls: r.rolls_json,
        createdAt: r.created_at,
      }));
    }

    // 5. Formula Distribution
    if (s.includes('GROUP BY roll_formula')) {
      const sessionId = Number(params[0]);
      const matching = this.diceRolls.filter((r) => r.session_id === sessionId);
      const counts = {};
      for (const r of matching) {
        counts[r.roll_formula] = (counts[r.roll_formula] || 0) + 1;
      }
      return Object.entries(counts)
        .map(([formula, uses]) => ({ formula, uses }))
        .sort((a, b) => b.uses - a.uses);
    }

    return [];
  }

  async exec(sql) {}

  async close() {
    this.users.clear();
    this.usersByName.clear();
    this.gameSessions.clear();
    this.sessionsByRoom.clear();
    this.sessionPasswords.clear();
    this.sessionParticipants.clear();
    this.characterSheets.clear();
    this.characters.clear();
    this.diceRolls = [];
  }
}

/**
 * ============================================================================
 * 6. DICE ROLLER SERVICE WRAPPER
 * ============================================================================
 */
const baseRoller = new BaseDiceRollerService();

export class DiceRollerService {
  static roll(formula) {
    const res = baseRoller.roll(formula);
    return {
      formula: res.formula,
      rolls: res.rolls,
      keptRolls: res.keptRolls,
      modifier: res.modifier,
      total: res.result,
      result: res.result,
      critical: res.critical,
    };
  }

  static parseFormula(formula) {
    return baseRoller.roll(formula);
  }

  roll(formula) {
    return DiceRollerService.roll(formula);
  }
}

/**
 * ============================================================================
 * 7. BACKEND API & WEBSOCKET TEST CLIENT
 * ============================================================================
 */
export class TestBackend {
  static async createTestContext(dbPath = ':memory:', jwtSecret = 'e2e-test-jwt-secret-key-12345') {
    const db = new InMemoryDatabase();
    await db.migrate();

    const app = express();
    app.use(express.json());

    const emittedEvents = [];
    const broadcastCallback = (char) => {
      emittedEvents.push({ event: 'character-updated', payload: char });
    };

    // Fast, deterministic character service mock
    const mockDdb = {
      async fetchCharacter(characterId) {
        return TestBackend.getStandardCharacter({ id: String(characterId) });
      },
    };

    const router = Router();
    router.use('/auth', createAuthRouter(db, jwtSecret));
    router.use('/character', createCharacterRouter(db, jwtSecret, mockDdb, broadcastCallback));
    router.use('/rolls', createRollsRouter(db));
    router.use('/sessions', createSessionsRouter(db, jwtSecret));

    app.use('/api/v2', router);

    return {
      db,
      app,
      jwtSecret,
      emittedEvents,
      request: request(app),
      async close() {
        await db.close();
      },
    };
  }

  static getStandardCharacter(overrides = {}) {
    return {
      id: 'char_test_101',
      name: 'Valeros Highwind',
      avatarUrl: 'https://cdn.example.com/avatar.png',
      race: 'Human',
      classes: [{ name: 'Fighter', level: 5 }],
      level: 5,
      alignment: 'Neutral Good',
      xp: 6500,
      hp: { current: 44, max: 44, temp: 5 },
      ac: 18,
      speed: 30,
      stats: { str: 18, dex: 14, con: 16, int: 10, wis: 12, cha: 8 },
      modifiers: { str: 4, dex: 2, con: 3, int: 0, wis: 1, cha: -1 },
      proficiencies: {
        saves: ['str', 'con'],
        skills: ['Athletics', 'Perception'],
      },
      currencies: { cp: 10, sp: 20, ep: 0, gp: 50, pp: 1 },
      equipment: [
        { id: 'item_1', name: 'Longsword +1', isWeapon: true, attackBonus: 8, damage: '1d8+5', equipped: true },
        { id: 'item_2', name: 'Shield', type: 'shield', ac: 2, equipped: true },
      ],
      resources: [
        { name: 'Action Surge', current: 1, max: 1, resetOn: 'short rest' },
        { name: 'Second Wind', current: 1, max: 1, resetOn: 'short rest' },
      ],
      hitDice: { current: 5, max: 5, dieType: 10 },
      notes: 'Test character notes',
      ...overrides,
    };
  }
}

/**
 * ============================================================================
 * 8. TEST SUITE & RUNNER CONTRACT
 * ============================================================================
 */
export class TestRegistry {
  constructor(name) {
    this.name = name;
    this.tests = [];
  }

  test(id, name, fn, metadata = {}) {
    this.tests.push({ id, name, fn, metadata });
  }

  async run(options = {}) {
    const results = [];
    for (const t of this.tests) {
      if (options.feature && t.metadata.feature && t.metadata.feature !== options.feature) {
        continue;
      }
      if (options.filter && !new RegExp(options.filter, 'i').test(`${t.id} ${t.name}`)) {
        continue;
      }
      const start = Date.now();
      try {
        await t.fn();
        const duration = Date.now() - start;
        results.push({ id: t.id, name: t.name, status: 'pass', duration, metadata: t.metadata });
      } catch (error) {
        const duration = Date.now() - start;
        results.push({ id: t.id, name: t.name, status: 'fail', duration, error, metadata: t.metadata });
        if (options.bail) {
          break;
        }
      }
    }
    return results;
  }
}

export { ROOT_DIR, InMemoryDatabase as DatabaseService, WebSocketManager };
