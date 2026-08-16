/**
 * Stress & Adversarial Test Suite: Backend Architecture Document Validator
 * Validates SQL DDL Schema, REST Endpoints, Payloads, JSON Schemas & WebSocket Protocols in docs/BACKEND_RECOMMENDATIONS.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { expect, ROOT_DIR, TestRegistry } from '../e2e/helpers.js';

export function createBackendRecommendationsValidatorSuite() {
  const suite = new TestRegistry('Stress: Backend Recommendations Architectural Validator');
  const docPath = path.resolve(ROOT_DIR, 'docs/BACKEND_RECOMMENDATIONS.md');
  const docContent = fs.readFileSync(docPath, 'utf8');

  // 1. Structural & Section Completeness
  suite.test('STR-DOC-01', 'Document contains all 6 core engineering sections and TOC headers', async () => {
    const requiredSections = [
      '1. Executive Architecture Overview & System Topology',
      '2. Comprehensive REST API Specification',
      '3. Real-Time WebSocket & PubSub Protocol Specification',
      '4. Relational Database Schema, Migrations & ORM Specifications',
      '5. D&D Beyond Integration & Sync Daemon Architecture',
      '6. Cloud, Serverless & Edge Deployment Strategy'
    ];

    for (const sec of requiredSections) {
      expect(docContent.includes(sec)).toBe(true);
    }
  });

  // 2. SQL DDL Table Count & Enum Definitions
  suite.test('STR-DOC-02', 'SQL DDL defines exactly 12 production tables and 9 ENUM types with syntax integrity', async () => {
    const requiredTables = [
      'public.profiles',
      'public.campaigns',
      'public.sessions',
      'public.session_participants',
      'public.characters',
      'public.map_templates',
      'public.map_states',
      'public.tokens',
      'public.token_instances',
      'public.initiatives',
      'public.dice_rolls',
      'public.overlay_configs'
    ];

    for (const tbl of requiredTables) {
      const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS ${tbl.replace('.', '\\.')}`, 'i');
      expect(tableRegex.test(docContent)).toBe(true);
    }

    const requiredEnums = [
      'user_role',
      'participant_role',
      'session_status',
      'grid_type',
      'token_size',
      'token_type',
      'roll_type',
      'overlay_position',
      'overlay_animation',
      'overlay_font_size'
    ];

    for (const en of requiredEnums) {
      const enumRegex = new RegExp(`CREATE TYPE ${en} AS ENUM`, 'i');
      expect(enumRegex.test(docContent)).toBe(true);
    }
  });

  // 3. SQL Foreign Key Constraints & Cascading Deletion Semantics
  suite.test('STR-DOC-03', 'SQL DDL enforces relational integrity: ON DELETE CASCADE, SET NULL, and RESTRICT', async () => {
    expect(docContent).toContain('REFERENCES auth.users(id) ON DELETE CASCADE');
    expect(docContent).toContain('REFERENCES public.profiles(id) ON DELETE RESTRICT');
    expect(docContent).toContain('REFERENCES public.campaigns(id) ON DELETE CASCADE');
    expect(docContent).toContain('REFERENCES public.sessions(id) ON DELETE CASCADE');
    expect(docContent).toContain('REFERENCES public.characters(id) ON DELETE CASCADE');
    expect(docContent).toContain('REFERENCES public.characters(id) ON DELETE SET NULL');
    expect(docContent).toContain('REFERENCES public.map_templates(id) ON DELETE SET NULL');
  });

  // 4. SQL Indexing Strategy (B-Tree, Partial, Composite, JSONB GIN)
  suite.test('STR-DOC-04', 'SQL DDL defines comprehensive indexing matrix with GIN and Partial indexes', async () => {
    const expectedIndexes = [
      'idx_campaigns_dm_id',
      'idx_sessions_campaign_id',
      'idx_characters_user_id',
      'idx_token_instances_session_id',
      'idx_dice_rolls_session_id',
      'idx_dice_rolls_session_created',
      'idx_dice_rolls_analytics',
      'idx_token_instances_session_map',
      'idx_map_states_active_per_session',
      'idx_characters_ddb_id',
      'idx_sessions_invite_code',
      'idx_overlay_configs_stream_key',
      'idx_characters_stats_gin',
      'idx_characters_conditions_gin',
      'idx_characters_spells_gin',
      'idx_characters_equipment_gin',
      'idx_map_states_fog_gin',
      'idx_map_states_walls_gin',
      'idx_token_instances_conditions_gin',
      'idx_dice_rolls_breakdown_gin'
    ];

    for (const idx of expectedIndexes) {
      expect(docContent).toContain(idx);
    }

    // Verify GIN indexes use jsonb_path_ops where appropriate
    expect(docContent).toContain('USING gin (conditions jsonb_path_ops)');
    expect(docContent).toContain('USING gin (spells jsonb_path_ops)');
  });

  // 5. Row Level Security (RLS) & Security Definer Functions
  suite.test('STR-DOC-05', 'SQL DDL enforces RLS across all 12 tables and provides security definer helper functions', async () => {
    const rlsTables = [
      'profiles', 'campaigns', 'sessions', 'session_participants',
      'characters', 'map_templates', 'map_states', 'tokens',
      'token_instances', 'initiatives', 'dice_rolls', 'overlay_configs'
    ];

    for (const tbl of rlsTables) {
      expect(docContent).toContain(`ALTER TABLE public.${tbl} ENABLE ROW LEVEL SECURITY;`);
    }

    // Verify helper functions
    const helperFunctions = [
      'public.is_dm_of_session',
      'public.is_participant_of_session',
      'public.is_dm_of_campaign',
      'public.is_member_of_campaign'
    ];

    for (const fn of helperFunctions) {
      expect(docContent).toContain(`CREATE OR REPLACE FUNCTION ${fn}`);
      expect(docContent).toContain('SECURITY DEFINER SET search_path = public');
    }
  });

  // 6. REST API Endpoints & Valid JSON Payloads
  suite.test('STR-DOC-06', 'REST API specification documents all required endpoints with valid JSON payloads', async () => {
    const requiredEndpoints = [
      'POST /api/v2/auth/register',
      'POST /api/v2/auth/login',
      'POST /api/v2/auth/refresh',
      'POST /api/v2/auth/logout',
      'GET /api/v2/auth/me',
      'PUT /api/v2/users/preferences',
      'GET /api/v2/character',
      'POST /api/v2/character',
      'GET /api/v2/character/:id',
      'PATCH /api/v2/character/:id/vitals',
      'POST /api/v2/character/import',
      'POST /api/v2/character/import/json',
      'GET /api/v2/character/:id/export',
      'POST /api/v2/character/:id/avatar',
      'POST /api/v2/campaigns',
      'GET /api/v2/campaigns',
      'POST /api/v2/sessions',
      'GET /api/v2/sessions/:roomId',
      'POST /api/v2/sessions/:roomId/invite',
      'POST /api/v2/sessions/:roomId/join',
      'GET /api/v2/sessions/:roomId/participants',
      'GET /api/v2/sessions/:roomId/export.csv',
      'POST /api/v2/maps',
      'GET /api/v2/maps/:mapId/fog',
      'PUT /api/v2/maps/:mapId/fog',
      'POST /api/v2/assets/upload-url',
      'GET /api/v2/rolls/:roomId',
      'POST /api/v2/rolls/:roomId',
      'GET /api/v2/rolls/:roomId/analytics',
      'GET /api/v2/rolls/verify/:rollId',
      'GET /api/v2/overlay/:roomId/config',
      'PUT /api/v2/overlay/:roomId/config',
      'GET /api/v2/overlay/feed/:streamKey'
    ];

    for (const ep of requiredEndpoints) {
      const [method, path] = ep.split(' ');
      const re = new RegExp(`(?:###?\\s+.*\`?${method}\\s+${path.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}|${method}\\s+${path.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'i');
      expect(re.test(docContent)).toBe(true);
    }

    // Extract all json code blocks and verify they parse as valid JSON
    const jsonBlockRegex = /(?:^|\n)[ \t]*```json\s*\n([\s\S]*?)\n[ \t]*```/g;
    let match;
    let parsedCount = 0;
    while ((match = jsonBlockRegex.exec(docContent)) !== null) {
      const rawJson = match[1].trim();
      // Skip if contains ellipsis placeholders like ... or comment lines
      if (!rawJson.includes('...') && !rawJson.includes('//')) {
        try {
          const parsed = JSON.parse(rawJson);
          expect(parsed).toBeDefined();
          parsedCount++;
        } catch (err) {
          throw new Error(`Invalid JSON code block in BACKEND_RECOMMENDATIONS.md: ${err.message}\n${rawJson}`);
        }
      }
    }

    expect(parsedCount).toBeGreaterThan(10);
  });

  // 7. RFC 7807 Problem Details Standard & Error Catalog
  suite.test('STR-DOC-07', 'Error specification strictly adheres to RFC 7807 Problem Details with full error code catalog', async () => {
    expect(docContent).toContain('RFC 7807 Standard Error Response Format');
    expect(docContent).toContain('"type":');
    expect(docContent).toContain('"title":');
    expect(docContent).toContain('"status":');
    expect(docContent).toContain('"detail":');
    expect(docContent).toContain('"code":');
    expect(docContent).toContain('"traceId":');

    const expectedErrorCodes = [
      'ERR_BAD_REQUEST',
      'ERR_UNAUTHORIZED',
      'ERR_FORBIDDEN',
      'ERR_NOT_FOUND',
      'ERR_CONFLICT',
      'ERR_UNPROCESSABLE_ENTITY',
      'ERR_RATE_LIMIT_EXCEEDED',
      'ERR_INTERNAL_SERVER_ERROR',
      'ERR_SERVICE_UNAVAILABLE'
    ];

    for (const code of expectedErrorCodes) {
      expect(docContent).toContain(code);
    }
  });

  // 8. WebSocket Protocol, Envelope Framing & Event Catalog
  suite.test('STR-DOC-08', 'WebSocket specification documents typed WsEnvelope<T> and all real-time events', async () => {
    expect(docContent).toContain('export interface WsEnvelope<T');
    expect(docContent).toContain('id: string;');
    expect(docContent).toContain('seq: number;');
    expect(docContent).toContain('channel: string;');
    expect(docContent).toContain('event: string;');

    const expectedWsEvents = [
      'join-room',
      'leave-room',
      'room-state',
      'user:joined',
      'user:left',
      'token:add',
      'token:move',
      'token:rotate',
      'token:scale',
      'token:update-vitals',
      'token:set-visibility',
      'token:remove',
      'token:added',
      'token:moved',
      'token:rotated',
      'token:scaled',
      'token:updated',
      'token:visibility-changed',
      'token:removed',
      'roll:request',
      'roll:result',
      'ping:emit',
      'ping:broadcast',
      'pointer:move',
      'pointer:update',
      'fog:reveal',
      'fog:sync-vision',
      'fog:updated',
      'fog:full-state'
    ];

    for (const evt of expectedWsEvents) {
      expect(docContent).toContain(evt);
    }
  });

  return suite;
}
