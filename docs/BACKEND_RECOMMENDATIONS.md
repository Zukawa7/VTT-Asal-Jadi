# VTT Asal Jadi: Backend Architecture, Real-Time Protocol & Cloud Deployment Blueprint

**Document Version**: 2.4.0  
**Target Environment**: Vercel Edge/Serverless, Supabase PostgreSQL, Upstash Redis/QStash, Cloudflare R2 / PartyKit  
**Specification Status**: Complete / Production-Grade Engineering Deliverable  
**Associated Repository**: [VTT Asal Jadi](https://github.com/vtt-asal-jadi)

---

## Table of Contents
1. [Executive Architecture Overview & System Topology](#1-executive-architecture-overview--system-topology)
   - 1.1 Architecture Summary & Design Goals
   - 1.2 System Topology Diagram
   - 1.3 Client / Edge / Real-time / Storage Flow
   - 1.4 Latency & Scalability SLAs
2. [Comprehensive REST API Specification](#2-comprehensive-rest-api-specification)
   - 2.1 API Conventions, Headers & RFC 7807 Error Standard
   - 2.2 Authentication & User Profile Endpoints
   - 2.3 Character Sheet & 5e Stat Management Endpoints
   - 2.4 Campaign & Session Management Endpoints
   - 2.5 Battle Maps & Fog of War Persistence Endpoints
   - 2.6 Dice Roll History, Telemetry & Cryptographic Verification Endpoints
   - 2.7 Stream Overlay HUD Configuration Endpoints
3. [Real-Time WebSocket & PubSub Protocol Specification](#3-real-time-websocket--pubsub-protocol-specification)
   - 3.1 Connection Lifecycle, Authentication Handshake & Reconnection
   - 3.2 Multi-Channel Room Topology
   - 3.3 Message Envelope Framing (`WsEnvelope<T>`)
   - 3.4 Exhaustive Event Catalog with Typed Payloads
   - 3.5 Conflict Resolution: Last-Write-Wins (LWW), Optimistic UI Reconciliation & CRC32 Drift Recovery
4. [Relational Database Schema, Migrations & ORM Specifications](#4-relational-database-schema-migrations--orm-specifications)
   - 4.1 Production PostgreSQL / Supabase SQL DDL (12 Tables, 9 ENUMs)
   - 4.2 Comprehensive Indexing Strategy (B-Tree, Composite, Partial, JSONB GIN)
   - 4.3 Row Level Security (RLS) Policies & Security Definer Functions
   - 4.4 Drizzle ORM TypeScript Schema
   - 4.5 Prisma ORM Schema Mapping
   - 4.6 ORM & Migration Framework Comparison
5. [D&D Beyond Integration & Sync Daemon Architecture](#5-dd-beyond-integration--sync-daemon-architecture)
   - 5.1 Reverse-Engineered v5 API Ingestion Contract
   - 5.2 5e Stat Normalization Engine & Precedence Rules
   - 5.3 CobaltSession Token Encryption & Key Security (AES-256-GCM)
   - 5.4 Serverless Sync Daemon & Queue Topology (Upstash QStash & BullMQ)
   - 5.5 Token Bucket Rate Limiting with Full Jitter Exponential Backoff
   - 5.6 Delta Sync Engine & RFC 6902 JSON Patch Generation
   - 5.7 Manifest V3 Chrome Extension Receiver & Webhook Endpoint
   - 5.8 Circuit Breaker & Stale-While-Revalidate Resiliency
6. [Cloud, Serverless & Edge Deployment Strategy](#6-cloud-serverless--edge-deployment-strategy)
   - 6.1 Vercel Serverless & Edge Function Routing Matrix
   - 6.2 Supabase PostgreSQL & Supavisor Connection Pooling
   - 6.3 Real-Time WebSocket Infrastructure Comparison & PartyKit Decision
   - 6.4 Ephemeral Caching, Presence & State Management via Upstash Redis
   - 6.5 Redis Lua Sliding-Window Rate Limiting Algorithm
   - 6.6 High-Resolution 4K/8K Battlemap Storage & Deep Zoom (DZI) Tiling (Cloudflare R2)
   - 6.7 Security Blueprint, JWT Key Rotation & Production `.env.example`

---

# 1. Executive Architecture Overview & System Topology

## 1.1 Architecture Summary & Design Goals
VTT Asal Jadi is a modern, high-performance Virtual Tabletop (VTT) and livestream HUD system tailored for Dungeons & Dragons 5th Edition (D&D 5e). The architecture is engineered around the following core requirements:

1. **Sub-20ms Real-Time Tactical Synchronization**: Smooth token movement, rotation, scaling, dynamic fog-of-war reveals, and 3D dice physics broadcasts across all connected clients.
2. **Stateless Edge Execution**: Stateless REST endpoints deployed to globally distributed V8 edge runtimes (Vercel Edge Network) for zero cold starts.
3. **Resilient Third-Party Integration**: Automated bi-directional synchronization with D&D Beyond via reverse-engineered v5 endpoints, rate-limited queues, and RFC 6902 JSON Patch delta diffing.
4. **Relational Rigor with Document Flexibility**: PostgreSQL with Row Level Security (RLS) for multi-tenant isolation, combined with JSONB columns for complex 5e mechanics (spells, equipment, traits, dynamic fog polygons).
5. **Zero-Egress High-Resolution Asset Pipeline**: 4K/8K tactical battlemap storage using Cloudflare R2 and Deep Zoom (DZI) image pyramid tiling, eliminating bandwidth costs and client memory bottlenecks.

## 1.2 System Topology Diagram

```
+----------------------------------------------------------------------------------------------------+
|                                      SYSTEM TOPOLOGY DIAGRAM                                       |
+----------------------------------------------------------------------------------------------------+

  [ Players / DM / Viewers ]                 [ OBS Studio / Streamlabs ]        [ D&D Beyond Browser Tab ]
       │                │                                │                                │
       │ (HTTPS REST)   │ (WebSocket WSS)                │ (Overlay WSS / HTTP)           │ (Content Script / Ext)
       ▼                ▼                                ▼                                ▼
  +─────────────────────────────────────────────────────────────+                +──────────────────+
  |              Cloudflare Global Edge Network & WAF           |                | Chrome Extension |
  |   - SSL Termination, DDoS Shield, Edge Caching, CORS        |                |  (Manifest V3)   |
  +──────────────┬──────────────────────────────┬───────────────+                +────────┬─────────+
                 │                              │                                         │
        ┌────────┴────────┐            ┌────────┴────────┐                                │
        │                 │            │                 │                                │
        ▼                 ▼            ▼                 ▼                                │
  +───────────+     +───────────+  +─────────────────────────+                            │
  |  Vercel   |     |  Vercel   |  | PartyKit Realtime Fleet | (WebSocket Server)         │
  |   Edge    |     | Serverless|  | (Cloudflare DO Actors)  |                            │
  | Functions |     |  Node.js  |  | - Room State Machine    |                            │
  | (Auth,    |     | (DDB Imp, |  | - Token Movement Lerp   |                            │
  |  Rolls,   |     |  CSV Exp, |  | - Live 3D Dice Broadcast|                            │
  |  CRUD)    |     |  Queues)  |  | - Ephemeral CRC32 Sync  |                            │
  +─────┬─────+     +─────┬─────+  +────────────┬────────────+                            │
        │                 │                     │                                         │
        └────────┬────────┘                     │                                         │
                 │                              │ State Deltas                            │
                 ▼                              ▼                                         │
  +───────────────────────────────────────────────────────────────+                       │
  |             Upstash Redis & QStash (Serverless)               |                       │
  |   - Room Token Hash Cache (`room:{id}:tokens`)                |                       │
  |   - Presence Heartbeats (`room:{id}:presence`)                |                       │
  |   - Sliding Window Rate Limiting (Redis Lua)                  |                       │
  |   - Scheduled Sync Triggers (QStash Cron)                     |                       │
  +──────────────────────────────┬────────────────────────────────+                       │
                                 │                                                        │
                 ┌───────────────┴───────────────┐                                        │
                 ▼                               ▼                                        │
  +──────────────────────────────+ +──────────────────────────────+                       │
  |  Supabase PostgreSQL (15+)   | | Cloudflare R2 Object Storage |                       │
  |  - Transaction Pooler (6543) | | - 4K/8K Battlemap Images     |                       │
  |  - Direct Migrations (5432)  | | - DZI Deep Zoom Pyramid Tiles|                       │
  |  - Row Level Security (RLS)  | | - Character Portraits / Assets|                      │
  |  - 12 Tables, 9 ENUM Types   | | - Zero Egress Fees           |                       │
  +──────────────────────────────+ +──────────────────────────────+                       │
                 ▲                                                                        │
                 │ Periodic Snapshots                                                     │
                 └────────────────────────────────────────────────────────────────────────┘
```

## 1.3 Client / Edge / Real-time / Storage Flow
1. **Authentication Flow**: Client submits credentials to `POST /api/v2/auth/login`. An edge function verifies passwords via Argon2id / Supabase Auth and returns an RS256 signed JWT Access Token and an HTTP-only Refresh Token.
2. **Tactical Session Join**: Client opens a WebSocket handshake with the PartyKit / Realtime Fleet passing the Bearer JWT. The room actor retrieves current token coordinates and fog state from Upstash Redis (falling back to Supabase PostgreSQL) and responds with `room-state`.
3. **Optimistic Movement Flow**: Token dragging renders immediately on the client canvas. The client emits `token:move` with an `actionId` UUID. The Realtime server validates boundary/collision conditions, assigns a monotonic sequence ID (`seq`), and broadcasts `token:moved` to the `map:{id}` channel.
4. **Livestream Roll Broadcast**: When a player rolls a d20, the client emits `roll:request`. The server computes cryptographically sound RNG, records the event to PostgreSQL, and broadcasts `roll:result` simultaneously to `session:{id}` (chat/log) and `overlay:{id}` (OBS HUD widget).
5. **D&D Beyond Sync Daemon**: QStash periodically invokes the background worker. The worker retrieves the encrypted `CobaltSession` token from PostgreSQL, fetches the raw v5 JSON, applies the normalization engine, computes an RFC 6902 JSON Patch, updates the database, and emits granular delta events (`character:hp_changed`, `character:spell_slot_updated`).

## 1.4 Latency & Scalability SLAs
| Service Tier | Target Latency (P50) | Target Latency (P95) | Target Concurrency |
|---|---|---|---|
| Edge REST Read Endpoints | < 15 ms | < 45 ms | 50,000 req/min |
| Edge REST Write / Mutation | < 40 ms | < 120 ms | 10,000 req/min |
| WebSocket Token Movement Broadcast | < 10 ms | < 25 ms | 2,500 active rooms |
| Live 3D Dice Physics Broadcast | < 12 ms | < 30 ms | 10,000 concurrent rolls |
| Battlemap DZI Tile Delivery | < 20 ms | < 60 ms | Unlimited (Global CDN) |

---

# 2. Comprehensive REST API Specification

## 2.1 API Conventions, Headers & RFC 7807 Error Standard
- **Base URL**: `https://api.vtt-asal-jadi.com/api/v2`
- **Transport**: HTTPS (TLS 1.3 mandated)
- **Payload Format**: `application/json` (unless `multipart/form-data` for uploads or `text/csv` for analytics exports)
- **Authentication**: `Authorization: Bearer <JWT_ACCESS_TOKEN>`

### 2.1.1 Standard Rate Limiting Headers (IETF Draft-7)
Every HTTP response carries rate limit metadata:
```http
RateLimit-Limit: 100
RateLimit-Remaining: 94
RateLimit-Reset: 1786941600
RateLimit-Policy: 100;w=60
```
When limits are breached, the server responds with `HTTP 429 Too Many Requests` and a mandatory `Retry-After: <seconds>` header.

### 2.1.2 RFC 7807 Standard Error Response Format
All error responses (4xx/5xx) strictly adhere to RFC 7807 Problem Details:

```json
{
  "type": "https://api.vtt-asal-jadi.com/errors/ERR_SCHEMA_VALIDATION_FAILED",
  "title": "Unprocessable Content",
  "status": 422,
  "detail": "The character sheet payload failed validation constraints.",
  "instance": "/api/v2/character/import",
  "code": "ERR_SCHEMA_VALIDATION_FAILED",
  "invalidParams": [
    {
      "name": "hp.current",
      "reason": "Current HP (45) cannot exceed Max HP (38)"
    },
    {
      "name": "classes[0].level",
      "reason": "Class level must be an integer between 1 and 20"
    }
  ],
  "traceId": "req_01HZX8M4J9K817263540001",
  "timestamp": "2026-08-16T04:30:00.000Z"
}
```

### 2.1.3 Canonical Error Code Catalog
| HTTP Status | Error Code (`code`) | Description |
|---|---|---|
| `400` | `ERR_BAD_REQUEST` | Malformed JSON syntax or missing mandatory root parameters |
| `401` | `ERR_UNAUTHORIZED` | Missing, expired, or cryptographically invalid Bearer JWT |
| `403` | `ERR_FORBIDDEN` | Caller lacks permissions (e.g. non-DM attempting to alter map state) |
| `404` | `ERR_NOT_FOUND` | Target entity (user, room, character, map) does not exist |
| `409` | `ERR_CONFLICT` | Resource conflict (e.g., duplicate room ID, stale sequence version) |
| `422` | `ERR_UNPROCESSABLE_ENTITY` | Semantic validation failed (e.g., malformed dice formula string) |
| `429` | `ERR_RATE_LIMIT_EXCEEDED` | Request quota exhausted within active sliding window |
| `500` | `ERR_INTERNAL_SERVER_ERROR` | Unhandled server exception with trace ID captured |
| `503` | `ERR_SERVICE_UNAVAILABLE` | External dependency down (e.g. D&D Beyond API failure) |

---

## 2.2 Authentication & User Profile Endpoints

### 2.2.1 `POST /api/v2/auth/register`
Registers a new user account with Argon2id password hashing and auto-generates a profile record.

**Request Schema (`application/json`)**:
```json
{
  "username": "dungeon_master_eric",
  "email": "eric@example.com",
  "password": "SecurePassword123!"
}
```

**Response `201 Created`**:
```json
{
  "success": true,
  "user": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "username": "dungeon_master_eric",
    "email": "eric@example.com",
    "role": "user",
    "createdAt": "2026-08-16T04:30:00.000Z"
  }
}
```

---

### 2.2.2 `POST /api/v2/auth/login`
Authenticates credentials and returns a dual JWT access/refresh token pair.

**Request Schema**:
```json
{
  "username": "dungeon_master_eric",
  "password": "SecurePassword123!"
}
```

**Response `200 OK`**:
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "e4b98c3a-912f-48d0-9a2d-48ef01bc9942",
  "expiresIn": 900,
  "user": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "username": "dungeon_master_eric",
    "email": "eric@example.com",
    "avatarUrl": "https://cdn.vtt-asal-jadi.com/avatars/user-142.webp",
    "role": "user",
    "preferences": {
      "theme": "obsidian-gold",
      "diceSoundEnabled": true,
      "dice3dEnabled": true,
      "snapToGrid": true
    }
  }
}
```

---

### 2.2.3 `POST /api/v2/auth/refresh`
Rotates the refresh token and issues a new short-lived RS256 access token.

**Request Schema**:
```json
{
  "refreshToken": "e4b98c3a-912f-48d0-9a2d-48ef01bc9942"
}
```

**Response `200 OK`**:
```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIs...",
  "refreshToken": "7f8a9b0c-1d2e-3f4a-5b6c-7d8e9f0a1b2c",
  "expiresIn": 900
}
```

---

### 2.2.4 `POST /api/v2/auth/logout`
Revokes active session tokens and invalidates the refresh token in Redis.

**Response `204 No Content`**

---

### 2.2.5 `GET /api/v2/auth/me`
Retrieves the profile, permissions, and UI preferences of the authenticated user.

**Response `200 OK`**:
```json
{
  "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "email": "eric@example.com",
  "displayName": "Dungeon Master Eric",
  "avatarUrl": "https://cdn.vtt-asal-jadi.com/avatars/user-142.webp",
  "role": "user",
  "preferences": {
    "theme": "obsidian-gold",
    "diceSoundEnabled": true,
    "dice3dEnabled": true,
    "snapToGrid": true,
    "colorScheme": "amber",
    "defaultDiceFormula": "1d20"
  },
  "createdAt": "2026-08-16T04:30:00.000Z",
  "updatedAt": "2026-08-16T04:30:00.000Z"
}
```

---

### 2.2.6 `PUT /api/v2/users/preferences`
Updates user UI/UX settings and streaming preferences.

**Request Schema**:
```json
{
  "theme": "obsidian-gold",
  "diceSoundEnabled": false,
  "dice3dEnabled": true,
  "snapToGrid": true,
  "colorScheme": "ruby-ember"
}
```

**Response `200 OK`**: Updated preferences object.

---

## 2.3 Character Sheet & 5e Stat Management Endpoints

### 2.3.1 `GET /api/v2/character`
Lists all characters owned by the authenticated user with optional campaign filtering and search.

**Query Parameters**:
- `page` (integer, default: 1)
- `limit` (integer, default: 20, max: 100)
- `campaignId` (UUID, optional)
- `search` (string, optional)

**Response `200 OK`**:
```json
{
  "items": [
    {
      "id": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      "userId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      "campaignId": "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
      "ddbId": "104928172",
      "name": "Valeros Highwind",
      "avatarUrl": "https://cdn.vtt-asal-jadi.com/avatars/valeros.webp",
      "race": "Human (Variant)",
      "classAndLevel": "Fighter 5",
      "level": 5,
      "hp": { "current": 44, "max": 44, "temp": 5 },
      "ac": 18,
      "speed": 30,
      "updatedAt": "2026-08-16T04:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 2.3.2 `POST /api/v2/character`
Creates a brand new custom character adhering to the full 5e schema.

**Request Schema**:
```json
{
  "name": "Morlin Silvervein",
  "avatarUrl": "https://cdn.vtt-asal-jadi.com/avatars/morlin.webp",
  "race": "Mountain Dwarf",
  "classAndLevel": "Cleric 4 (Life Domain)",
  "level": 4,
  "hp": { "current": 35, "max": 35, "temp": 0 },
  "ac": 18,
  "speed": 25,
  "stats": { "str": 14, "dex": 10, "con": 16, "int": 10, "wis": 16, "cha": 12 },
  "modifiers": { "str": 2, "dex": 0, "con": 3, "int": 0, "wis": 3, "cha": 1 },
  "currencies": { "cp": 40, "sp": 25, "ep": 0, "gp": 110, "pp": 0 },
  "hitDice": { "current": 4, "max": 4, "dieType": 8 },
  "spellSlots": {
    "1": { "current": 4, "max": 4 },
    "2": { "current": 3, "max": 3 }
  },
  "proficiencies": {
    "saves": ["wis", "cha"],
    "skills": ["Insight", "Medicine", "Religion", "History"]
  }
}
```

**Response `201 Created`**: Returns the complete `Character` record with assigned UUID.

---

### 2.3.3 `GET /api/v2/character/:id` & `GET /api/v2/character/:id/sheet`
Retrieves the complete, authoritative D&D 5e character document.

**Response `200 OK`**:
```json
{
  "id": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  "userId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "campaignId": "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
  "ddbId": "104928172",
  "name": "Valeros Highwind",
  "avatarUrl": "https://cdn.vtt-asal-jadi.com/avatars/valeros.webp",
  "race": "Human (Variant)",
  "classAndLevel": "Fighter 5",
  "level": 5,
  "experiencePoints": 6500,
  "alignment": "Neutral Good",
  "background": "Soldier",
  "hp": {
    "current": 44,
    "max": 44,
    "temp": 5
  },
  "ac": 18,
  "speed": 30,
  "initiativeModifier": 2,
  "proficiencyBonus": 3,
  "inspiration": true,
  "stats": { "str": 18, "dex": 14, "con": 16, "int": 10, "wis": 12, "cha": 8 },
  "modifiers": { "str": 4, "dex": 2, "con": 3, "int": 0, "wis": 1, "cha": -1 },
  "savingThrows": {
    "proficiencies": ["str", "con"],
    "customModifiers": {}
  },
  "skills": {
    "proficiencies": ["Athletics", "Intimidation", "Perception", "Survival"],
    "expertises": ["Athletics"],
    "customModifiers": {}
  },
  "currencies": { "cp": 120, "sp": 45, "ep": 0, "gp": 340, "pp": 2 },
  "hitDice": { "current": 5, "max": 5, "dieType": 10 },
  "deathSaves": { "successes": 0, "failures": 0 },
  "spellSlots": {},
  "spells": [],
  "equipment": [
    {
      "id": "item_longsword_01",
      "name": "Longsword +1",
      "quantity": 1,
      "weight": 3,
      "equipped": true,
      "attuned": false,
      "category": "Weapon",
      "isWeapon": true,
      "type": "Martial Melee",
      "attackBonus": 8,
      "damage": "1d8+5",
      "damageType": "Slashing",
      "range": "5 ft.",
      "properties": ["Versatile (1d10+5)"],
      "description": "A finely balanced blade glowing with faint golden runes."
    }
  ],
  "features": [
    {
      "id": "feat_action_surge",
      "name": "Action Surge",
      "source": "Fighter Level 2",
      "description": "Take one additional action on your turn. Once per short or long rest."
    }
  ],
  "proficiencies": {
    "armor": ["Light Armor", "Medium Armor", "Heavy Armor", "Shields"],
    "weapons": ["Simple Weapons", "Martial Weapons"],
    "tools": ["Smith's Tools", "Vehicles (Land)"],
    "languages": ["Common", "Dwarvish"]
  },
  "conditions": [],
  "resources": [
    { "name": "Action Surge", "current": 1, "max": 1, "resetOn": "short rest" },
    { "name": "Second Wind", "current": 1, "max": 1, "resetOn": "short rest" }
  ],
  "notes": "Veteran of the Battle of High Gate. Seeking retribution against Strahd's generals.",
  "lastSyncedAt": "2026-08-16T04:25:00.000Z",
  "createdAt": "2026-08-16T04:00:00.000Z",
  "updatedAt": "2026-08-16T04:25:00.000Z"
}
```

---

### 2.3.4 `PATCH /api/v2/character/:id/vitals`
High-frequency, lightweight endpoint for combat health changes, status conditions, and death saves.

**Request Schema**:
```json
{
  "hpDelta": -12,
  "tempHp": 0,
  "conditions": ["Poisoned"],
  "deathSaves": { "successes": 0, "failures": 0 }
}
```

**Response `200 OK`**:
```json
{
  "id": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  "hp": {
    "current": 32,
    "max": 44,
    "temp": 0
  },
  "conditions": ["Poisoned"],
  "deathSaves": { "successes": 0, "failures": 0 },
  "updatedAt": "2026-08-16T04:32:00.000Z"
}
```

---

### 2.3.5 `POST /api/v2/character/import`
Ingests a character sheet from D&D Beyond by ID or URL with full 5e stat normalization.

**Request Schema**:
```json
{
  "characterId": "104928172",
  "campaignId": "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33"
}
```

**Response `200 OK`**: Full normalized `Character` document.

---

### 2.3.6 `POST /api/v2/character/import/json` & `GET /api/v2/character/:id/export`
- **Import JSON (`POST`)**: Ingests 5e.tools, Foundry VTT Actor, or Avrae JSON character exports.
- **Export JSON (`GET`)**: Emits structured JSON matching requested format (`?format=standard|5etools|foundry`).

---

### 2.3.7 `POST /api/v2/character/:id/avatar`
Uploads a new character portrait image to Cloudflare R2 (`multipart/form-data`). Max size: 5MB (`image/png`, `image/jpeg`, `image/webp`).

**Response `200 OK`**:
```json
{
  "avatarUrl": "https://cdn.vtt-asal-jadi.com/avatars/char-b1eebc99.webp"
}
```

---

## 2.4 Campaign & Session Management Endpoints

### 2.4.1 `POST /api/v2/campaigns` & `GET /api/v2/campaigns`
- **Create Campaign (`POST`)**: Creates a campaign container managed by the DM.
- **List Campaigns (`GET`)**: Returns campaigns where caller is either DM or a joined player.

**Create Request Schema**:
```json
{
  "title": "Curse of Strahd - Friday Campaign",
  "description": "Weekly gothic horror campaign set in the mists of Barovia.",
  "bannerUrl": "https://cdn.vtt-asal-jadi.com/banners/strahd.webp",
  "settings": {
    "allowSpectators": true,
    "strictMovement": false,
    "fogOfWarDefault": true,
    "diagonalRule": "5-10-5"
  }
}
```

**Response `201 Created`**:
```json
{
  "id": "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
  "dmId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "title": "Curse of Strahd - Friday Campaign",
  "description": "Weekly gothic horror campaign set in the mists of Barovia.",
  "bannerUrl": "https://cdn.vtt-asal-jadi.com/banners/strahd.webp",
  "isArchived": false,
  "createdAt": "2026-08-16T04:30:00.000Z"
}
```

---

### 2.4.2 `POST /api/v2/sessions` & `GET /api/v2/sessions/:roomId`
Creates or inspects a live interactive virtual tabletop game room.

**Create Request Schema**:
```json
{
  "campaignId": "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
  "roomId": "barovia-session-4",
  "title": "Assault on Castle Ravenloft",
  "description": "Chapter 12: The Catacombs and Treasury",
  "password": "OptionalSecretPassword123",
  "settings": {
    "allowSpectators": true,
    "autoHideRolls": false,
    "gridSnap": true,
    "initiativeAutoSort": true
  }
}
```

**Response `201 Created`**:
```json
{
  "id": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
  "campaignId": "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
  "dmId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "roomId": "barovia-session-4",
  "title": "Assault on Castle Ravenloft",
  "status": "draft",
  "inviteCode": "RAVEN89X",
  "createdAt": "2026-08-16T04:30:00.000Z"
}
```

---

### 2.4.3 `POST /api/v2/sessions/:roomId/invite`
Generates cryptographically random shareable invite codes with role and usage limits.

**Request Schema**:
```json
{
  "role": "player",
  "expiresInHours": 72,
  "maxUses": 6
}
```

**Response `201 Created`**:
```json
{
  "inviteCode": "RAVEN89X",
  "inviteUrl": "https://vtt-asal-jadi.com/join/RAVEN89X",
  "role": "player",
  "expiresAt": "2026-08-19T04:30:00.000Z",
  "maxUses": 6,
  "usedCount": 0
}
```

---

### 2.4.4 `POST /api/v2/sessions/:roomId/join`
Enrolls a user into the session room, validating passwords or invite codes and binding their character sheet.

**Request Schema**:
```json
{
  "inviteCode": "RAVEN89X",
  "password": "OptionalSecretPassword123",
  "characterId": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22"
}
```

**Response `200 OK`**:
```json
{
  "sessionId": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
  "roomId": "barovia-session-4",
  "userId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "role": "player",
  "characterId": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  "joinedAt": "2026-08-16T04:30:00.000Z"
}
```

---

### 2.4.5 `GET /api/v2/sessions/:roomId/participants`
Returns the active roster of joined players, their roles, online presence status, and attached characters.

**Response `200 OK`**:
```json
[
  {
    "userId": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "username": "dungeon_master_eric",
    "role": "dm",
    "isActive": true,
    "character": null,
    "lastSeenAt": "2026-08-16T04:32:00.000Z"
  },
  {
    "userId": "f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66",
    "username": "player_sarah",
    "role": "player",
    "isActive": true,
    "character": {
      "id": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      "name": "Valeros Highwind",
      "avatarUrl": "https://cdn.vtt-asal-jadi.com/avatars/valeros.webp",
      "hp": { "current": 44, "max": 44, "temp": 0 }
    },
    "lastSeenAt": "2026-08-16T04:32:10.000Z"
  }
]
```

---

### 2.4.6 `GET /api/v2/sessions/:roomId/export.csv`
Streams a comma-separated audit log of all dice rolls, combat rounds, and HP deltas for telemetry analysis.

**Response `200 OK` (`text/csv`)**:
```csv
id,timestamp,character_name,roll_name,formula,result,is_critical,is_fumble,user_id
e4eebc99,2026-08-16T04:32:10Z,Valeros Highwind,Longsword Attack,1d20+8,28,true,false,f5eebc99
```

---

## 2.5 Battle Maps & Fog of War Persistence Endpoints

### 2.5.1 `POST /api/v2/maps`
Creates a reusable map template asset with grid parameters, light sources, and wall geometry.

**Request Schema**:
```json
{
  "campaignId": "c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33",
  "name": "Castle Ravenloft - Catacombs",
  "imageUrl": "https://cdn.vtt-asal-jadi.com/maps/ravenloft-catacombs.webp",
  "thumbnailUrl": "https://cdn.vtt-asal-jadi.com/maps/ravenloft-catacombs-thumb.webp",
  "gridSize": 70,
  "gridType": "square",
  "gridColor": "#d4a544",
  "gridOpacity": 0.45,
  "width": 4000,
  "height": 3000,
  "walls": [
    { "id": "wall_01", "p1": [100, 200], "p2": [500, 200], "blocksSight": true, "blocksMovement": true }
  ],
  "lights": [
    { "id": "light_torch_01", "x": 350, "y": 450, "brightRadius": 20, "dimRadius": 40, "color": "#ffaa00", "intensity": 0.8 }
  ]
}
```

**Response `201 Created`**: Returns created `MapTemplate` record with `id`.

---

### 2.5.2 `GET /api/v2/maps/:mapId/fog` & `PUT /api/v2/maps/:mapId/fog`
- **Retrieve Fog (`GET`)**: Returns revealed polygon coordinates and exploration bitmask.
- **Persist Fog (`PUT`)**: Atomically updates vector polygon coordinates or base64 WebP mask.

**PUT Request Schema**:
```json
{
  "version": 43,
  "fogOfWar": {
    "mode": "dynamic",
    "revealedPolygons": [
      {
        "id": "poly_catacombs_entrance",
        "points": [[0, 0], [1400, 0], [1400, 1050], [0, 1050]],
        "mode": "reveal",
        "opacity": 1.0
      }
    ],
    "exploredMaskUrl": "https://cdn.vtt-asal-jadi.com/fog/map-43-explored.webp"
  }
}
```

**Response `200 OK`**: `{ "success": true, "version": 43 }`

---

### 2.5.3 `POST /api/v2/assets/upload-url`
Issues cryptographic pre-signed PUT URLs for direct client-to-Cloudflare R2 storage uploads.

**Request Schema**:
```json
{
  "fileName": "dungeon_level_3.webp",
  "contentType": "image/webp",
  "fileSizeBytes": 18450200
}
```

**Response `200 OK`**:
```json
{
  "uploadUrl": "https://vtt-battlemaps.r2.cloudflarestorage.com/dungeon_level_3.webp?X-Amz-Algorithm=...",
  "publicUrl": "https://cdn.vtt-asal-jadi.com/maps/dungeon_level_3.webp",
  "expiresInSeconds": 300
}
```

---

## 2.6 Dice Roll History, Telemetry & Cryptographic Verification Endpoints

### 2.6.1 `GET /api/v2/rolls/:roomId`
Retrieves paginated dice roll history with cryptographic seed signatures and critical indicators.

**Query Parameters**:
- `limit` (integer, default: 50, max: 100)
- `cursor` (UUID, optional cursor pagination)
- `characterId` (UUID, optional)
- `critical` (boolean, optional)

**Response `200 OK`**:
```json
{
  "items": [
    {
      "id": "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55",
      "sessionId": "d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44",
      "userId": "f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66",
      "characterId": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
      "characterName": "Valeros Highwind",
      "characterAvatar": "https://cdn.vtt-asal-jadi.com/avatars/valeros.webp",
      "rollName": "Longsword Attack",
      "formula": "1d20+8",
      "result": 28,
      "rollsJson": [20],
      "breakdown": {
        "dieType": 20,
        "rawRolls": [20],
        "modifier": 8,
        "critType": "natural_20"
      },
      "rollType": "attack",
      "isCritical": true,
      "isFumble": false,
      "isSecret": false,
      "seed": "f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2",
      "signature": "hmac_sha256_3b8a1c9e...",
      "createdAt": "2026-08-16T04:32:10.000Z"
    }
  ],
  "nextCursor": "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55"
}
```

---

### 2.6.2 `POST /api/v2/rolls/:roomId`
Server-authoritative dice rolling engine executing cryptographically secure RNG (`crypto.randomInt`).

**Request Schema**:
```json
{
  "formula": "2d6+4",
  "rollName": "Greatsword Slashing Damage",
  "characterId": "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
  "characterName": "Valeros Highwind",
  "rollType": "damage",
  "isSecret": false
}
```

**Response `201 Created`**:
```json
{
  "id": "f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66",
  "formula": "2d6+4",
  "rollsJson": [5, 6],
  "result": 15,
  "breakdown": {
    "dice": [
      { "die": 6, "result": 5 },
      { "die": 6, "result": 6 }
    ],
    "modifier": 4,
    "total": 15
  },
  "isCritical": false,
  "isFumble": false,
  "seed": "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d",
  "signature": "hmac_sha256_4a9b2c8d...",
  "createdAt": "2026-08-16T04:32:15.000Z"
}
```

---

### 2.6.3 `GET /api/v2/rolls/:roomId/analytics`
Telemetry aggregation calculated over the session history.

**Response `200 OK`**:
```json
{
  "totalRolls": 148,
  "averageResult": 13.62,
  "criticalSuccessCount": 9,
  "criticalFailureCount": 6,
  "luckIndex": 1.04,
  "formulas": [
    { "formula": "1d20+8", "uses": 42 },
    { "formula": "2d6+4", "uses": 28 },
    { "formula": "1d20+3", "uses": 19 }
  ]
}
```

---

### 2.6.4 `GET /api/v2/rolls/verify/:rollId`
Verifies cryptographic fairness of a completed roll using commit-reveal proof.

**Response `200 OK`**:
```json
{
  "rollId": "e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55",
  "seed": "f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2",
  "formula": "1d20+8",
  "rawRolls": [20],
  "verified": true,
  "algorithm": "HMAC-SHA256(seed, nonce)"
}
```

---

## 2.7 Stream Overlay HUD Configuration Endpoints

### 2.7.1 `GET /api/v2/overlay/:roomId/config` & `PUT /api/v2/overlay/:roomId/config`
Retrieves or updates the public broadcast HUD settings used by OBS Browser Sources.

**Response `200 OK` / Request Schema**:
```json
{
  "roomId": "barovia-session-4",
  "streamKey": "7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a",
  "position": "bottom",
  "animationStyle": "slide",
  "fontSize": "medium",
  "showFormula": true,
  "autoHideTimeout": 10,
  "soundEffectsEnabled": false,
  "hudLayout": {
    "showActiveCombatant": true,
    "showCharacterHp": true,
    "showNat20Animation": true,
    "cardTheme": "obsidian-gold"
  },
  "theme": {
    "primaryColor": "#d4a544",
    "backgroundColor": "rgba(12, 14, 20, 0.85)",
    "fontFamily": "Cinzel, serif"
  },
  "visibleWidgets": ["roll_card", "active_turn"]
}
```

---

### 2.7.2 `GET /api/v2/overlay/feed/:streamKey`
Public, unauthenticated stream endpoint used by OBS Studio browser sources to fetch current HUD widget state via stream key.

---

# 3. Real-Time WebSocket & PubSub Protocol Specification

## 3.1 Connection Lifecycle, Authentication Handshake & Reconnection

```
  Client (Browser / OBS)                                Realtime Node (PartyKit / Fleet)
     │                                                               │
     │ 1. WebSocket Connect (`/socket.io/?EIO=4&transport=websocket`) │
     │    Auth Envelope: { token: "Bearer <JWT>" }                   │
     ├──────────────────────────────────────────────────────────────>│
     │                                                               │ 2. Verify JWT & Extract
     │                                                               │    { userId, username, role }
     │ 3. Connection ACK + Monotonic Sequence Reset                  │
     │<──────────────────────────────────────────────────────────────┤
     │                                                               │
     │ 4. Heartbeat (Ping every 25,000 ms)                           │
     ├──────────────────────────────────────────────────────────────>│
     │ 5. Pong Response                                              │
     │<──────────────────────────────────────────────────────────────┤
     │                                                               │
     │ [Network Disconnect Event]                                    │
     │                                                               │
     │ 6. Reconnect Handshake (`sync:reconnect`)                     │
     │    { roomId, lastSequenceId: 1042 }                           │
     ├──────────────────────────────────────────────────────────────>│
     │                                                               │ 7. Check Delta Buffer
     │ 8. State Catch-Up: Delta Frames (Seq 1043..1050)              │    (within 500 events)
     │<──────────────────────────────────────────────────────────────┤
```

### 3.1.1 Client Connection Parameters
- **Handshake URL**: `wss://realtime.vtt-asal-jadi.com/socket.io/?EIO=4&transport=websocket`
- **Reconnection Settings**:
  - `reconnection`: `true`
  - `reconnectionAttempts`: `Infinity`
  - `reconnectionDelay`: `1000` (ms)
  - `reconnectionDelayMax`: `10000` (ms)
  - `randomizationFactor`: `0.5`

---

## 3.2 Multi-Channel Room Topology
To eliminate unnecessary message parsing and network overhead, socket traffic is segregated into four distinct multiplexed channels:

1. `session:{roomId}` — Primary channel for chat, dice rolls, initiative order, and participant presence.
2. `map:{mapId}` — High-frequency tactical canvas channel for token movement (60 Hz lerp), scale, rotation, dynamic fog reveals, and laser pointers.
3. `overlay:{roomId}` — Lightweight, roll-only broadcast channel subscribed to exclusively by OBS Browser Sources.
4. `user:{userId}` — Unicast private channel for secret DM whispers, hidden passive checks, and validation error alerts.

---

## 3.3 Message Envelope Framing (`WsEnvelope<T>`)
All socket events transmitted between client and server are wrapped in the standard message envelope:

```typescript
export interface WsEnvelope<T = unknown> {
  id: string;               // Unique event UUID (e.g. "evt_01HZX8M4J9K817263540001")
  seq: number;              // Monotonically increasing sequence number per room
  channel: string;          // Target channel, e.g. "session:barovia-session-4"
  event: string;            // Action event name, e.g. "token:move"
  timestamp: string;        // Server ISO-8601 UTC timestamp
  sender: {
    userId: string;         // User UUID
    username: string;       // Display username
    role: 'dm' | 'co_dm' | 'player' | 'spectator';
  };
  payload: T;               // Strongly-typed event payload
  meta?: {
    actionId?: string;      // Client-generated optimistic action UUID for ACK reconciliation
    clientTimestamp?: number; // Client epoch timestamp (ms)
    traceId?: string;       // Distributed tracing correlation ID
  };
}
```

---

## 3.4 Exhaustive Event Catalog with Typed Payloads

### 3.4.1 Room & Presence Lifecycle Events
| Direction | Event Name | Channel | Payload Schema | Description |
|---|---|---|---|---|
| Client -> Server | `join-room` | Root | `{ roomId: string, password?: string, characterId?: string }` | Enrolls client into room channels |
| Client -> Server | `leave-room` | Root | `{ roomId: string }` | Gracefully unsubscribes from room |
| Server -> Client | `room-state` | `session:{id}` | `RoomSnapshot` | Complete room state on join/reconnect |
| Server -> Client | `user:joined` | `session:{id}` | `{ userId: string, username: string, role: string, character?: object }` | Broadcasts user presence |
| Server -> Client | `user:left` | `session:{id}` | `{ userId: string, username: string, reason: 'disconnect' \| 'kicked' }` | Broadcasts user departure |
| Server -> Client | `error` | `user:{id}` | RFC 7807 Problem Details | Private alert on socket error |

---

### 3.4.2 Tactical Token Synchronization Events
| Direction | Event Name | Channel | Payload Schema | Description |
|---|---|---|---|---|
| Client -> Server | `token:add` | `map:{id}` | `{ roomId: string, token: TokenInstance }` | Places a new token on canvas |
| Client -> Server | `token:move` | `map:{id}` | `{ roomId: string, tokenId: string, x: number, y: number, elevation?: number }` | Updates token position |
| Client -> Server | `token:rotate` | `map:{id}` | `{ roomId: string, tokenId: string, rotation: number }` | Rotates token heading (0-360°) |
| Client -> Server | `token:scale` | `map:{id}` | `{ roomId: string, tokenId: string, size: string, scaleFactor: number }` | Scales token footprint |
| Client -> Server | `token:update-vitals` | `map:{id}` | `{ roomId: string, tokenId: string, hpCurrent: number, hpMax: number, conditions: string[] }` | Synchronizes HP and status icons |
| Client -> Server | `token:set-visibility` | `map:{id}` | `{ roomId: string, tokenId: string, isVisibleToPlayers: boolean }` | DM toggles token stealth |
| Client -> Server | `token:remove` | `map:{id}` | `{ roomId: string, tokenId: string }` | Removes token from canvas |
| Server -> Client | `token:added` | `map:{id}` | `TokenInstance` | Broadcasts newly added token |
| Server -> Client | `token:moved` | `map:{id}` | `{ tokenId: string, x: number, y: number, elevation: number, seq: number, ackActionId?: string }` | Broadcasts canonical move |
| Server -> Client | `token:rotated` | `map:{id}` | `{ tokenId: string, rotation: number }` | Broadcasts token rotation |
| Server -> Client | `token:scaled` | `map:{id}` | `{ tokenId: string, size: string, scaleFactor: number }` | Broadcasts token resize |
| Server -> Client | `token:updated` | `map:{id}` | `{ tokenId: string, hpCurrent: number, hpMax: number, conditions: string[] }` | Broadcasts vitals update |
| Server -> Client | `token:visibility-changed` | `map:{id}` | `{ tokenId: string, isVisibleToPlayers: boolean }` | Broadcasts visibility state |
| Server -> Client | `token:removed` | `map:{id}` | `{ tokenId: string }` | Broadcasts token removal |

#### Canonical `TokenInstance` TypeScript Interface
```typescript
export interface TokenInstance {
  id: string;                      // Unique Token UUID
  sessionId: string;               // Associated Game Session UUID
  mapStateId: string;              // Associated Map State UUID
  characterId?: string;            // Optional Character Sheet UUID
  tokenBlueprintId?: string;       // Optional Blueprint Library UUID
  label: string;                   // Display Name (e.g. "Valeros Highwind")
  avatarUrl: string;               // Portrait Image URL
  x: number;                       // Canvas X Coordinate (float, e.g. 12.5)
  y: number;                       // Canvas Y Coordinate (float, e.g. 8.0)
  zIndex: number;                  // Rendering Layer Order
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
  scaleFactor: number;             // Fractional Scale (e.g. 1.0)
  rotation: number;                // Heading in Degrees (0.0 to 359.99)
  elevation: number;               // Elevation above ground in feet (default: 0)
  hpCurrent?: number;              // Realtime Health Override
  hpMax?: number;
  hpTemp?: number;
  ac?: number;
  conditions: string[];            // e.g. ["Blinded", "Prone", "Blessed"]
  isVisibleToPlayers: boolean;     // DM Stealth Toggle
  isLocked: boolean;               // Prevents accidental movement
  tintColor?: string;              // Border / Glow Accent Hex
  hasDarkvision: boolean;
  darkvisionRadius: number;        // in feet
  lightBrightRadius: number;       // in feet
  lightDimRadius: number;          // in feet
  lightColor: string;              // Light Source Color Hex
}
```

---

### 3.4.3 Live 3D Dice Rolling Events
| Direction | Event Name | Channel | Payload Schema | Description |
|---|---|---|---|---|
| Client -> Server | `roll:request` | `session:{id}` | `{ formula: string, rollName?: string, characterId?: string, isSecret?: boolean }` | Client initiates roll |
| Server -> Client | `roll:started` | `session:{id}` | `{ rollId: string, formula: string, roller: string, physicsSeed: number, diceConfig: object[] }` | Broadcasts 3D dice physics seed |
| Server -> Client | `roll:result` / `new-roll` | `session:{id}`, `overlay:{id}` | `RollEvent` | Broadcasts final settled roll result |

---

### 3.4.4 Turn Order & Combat Initiative Events
| Direction | Event Name | Channel | Payload Schema | Description |
|---|---|---|---|---|
| Client -> Server | `initiative:start` | `session:{id}` | `{ roomId: string }` | DM opens combat encounter |
| Client -> Server | `initiative:add` | `session:{id}` | `{ roomId: string, combatant: CombatantEntry }` | Adds combatant to order |
| Client -> Server | `initiative:update` | `session:{id}` | `{ roomId: string, combatantId: string, initiativeScore: number }` | Updates initiative value |
| Client -> Server | `initiative:next-turn` | `session:{id}` | `{ roomId: string }` | Advances active turn pointer |
| Client -> Server | `initiative:prev-turn` | `session:{id}` | `{ roomId: string }` | Steps back turn pointer |
| Client -> Server | `initiative:end` | `session:{id}` | `{ roomId: string }` | DM closes combat encounter |
| Server -> Client | `initiative:state` | `session:{id}` | `InitiativeState` | Broadcasts full turn tracker |
| Server -> Client | `initiative:turn-changed` | `session:{id}` | `{ round: number, activeTurnIndex: number, activeCombatant: CombatantEntry }` | Broadcasts active turn transition |

---

### 3.4.5 Tactical Pings & Laser Pointer Events
| Direction | Event Name | Channel | Payload Schema | Description |
|---|---|---|---|---|
| Client -> Server | `ping:emit` | `map:{id}` | `{ roomId: string, x: number, y: number, pingType: 'alert' \| 'info' \| 'target', color?: string, durationMs?: number }` | User drops map ping marker |
| Server -> Client | `ping:broadcast` | `map:{id}` | `{ userId: string, username: string, x: number, y: number, pingType: string, color: string, durationMs: number }` | Broadcasts animated ping |
| Client -> Server | `pointer:move` | `map:{id}` | `{ roomId: string, x: number, y: number, color: string }` | User moves laser pointer |
| Server -> Client | `pointer:update` | `map:{id}` | `{ userId: string, username: string, x: number, y: number, color: string }` | Broadcasts pointer cursor |

---

### 3.4.6 Dynamic Fog of War Reveal Events
| Direction | Event Name | Channel | Payload Schema | Description |
|---|---|---|---|---|
| Client -> Server | `fog:reveal` | `map:{id}` | `{ roomId: string, shape: 'polygon' \| 'circle' \| 'brush', points: number[][], mode: 'reveal' \| 'hide' }` | DM reveals/hides fog area |
| Client -> Server | `fog:sync-vision` | `map:{id}` | `{ roomId: string, tokenId: string, visionRadiusFt: number, darkvisionFt: number }` | Synchronizes dynamic line-of-sight |
| Server -> Client | `fog:updated` | `map:{id}` | `{ version: number, polygon: object, mode: 'reveal' \| 'hide' }` | Delta broadcast of new fog polygon |
| Server -> Client | `fog:full-state` | `map:{id}` | `{ version: number, revealedPolygons: object[] }` | Full fog geometry synchronization |

---

## 3.5 Conflict Resolution: Last-Write-Wins (LWW), Optimistic UI Reconciliation & CRC32 Drift Recovery

```
  Client A (Player Dragging)              Server (Authoritative Hub)           Client B (Observer / DM)
      │                                                │                                    │
      │ 1. Drag Token to (x=5.0, y=7.5)                │                                    │
      │    Render Optimistically on A                  │                                    │
      │                                                │                                    │
      │ 2. emit 'token:move'                           │                                    │
      │    { tokenId: "tok_1", x:5.0, y:7.5,           │                                    │
      │      actionId: "act_99", seq: 104 }            │                                    │
      ├───────────────────────────────────────────────>│                                    │
      │                                                │ 3. Check Wall Collision & Boundary │
      │                                                │    Increment Room Seq -> 105       │
      │                                                │                                    │
      │ 4. ACK Response (`token:moved`)                │ 4. Broadcast `token:moved`         │
      │    { tokenId: "tok_1", x:5.0, y:7.5,           │    { tokenId: "tok_1", x:5.0, y:7.5│
      │      seq: 105, ackActionId: "act_99" }         │      seq: 105 }                    │
      │<───────────────────────────────────────────────┼───────────────────────────────────>│
      │ 5. Match ackActionId & Settle Position         │                                    │ 5. Smooth Interpolation
      │                                                │                                    │    (Lerp) to (5.0, 7.5)
```

1. **Deterministic Last-Write-Wins (LWW)**: The server acts as the sequence arbiter. Each mutation increments the room's monotonic sequence counter (`seq`). If concurrent writes collide, the transaction processed with the higher `seq` wins.
2. **Rejection & Rollback Animations**: If a movement violates map boundaries or impassable walls, the server responds with a rollback frame:
   ```json
   {
     "event": "token:rollback",
     "tokenId": "tok_1",
     "authoritativePosition": { "x": 3.0, "y": 4.0, "elevation": 0 },
     "rejectedActionId": "act_99",
     "reason": "ERR_COLLISION_IMPASSABLE_WALL"
   }
   ```
   The client cancels the drag state and smoothly animates (lerps) the token back to `(3.0, 4.0)` over 200ms.
3. **CRC32 State Drift Recovery**: Every 30 seconds, the server includes a lightweight CRC32 hash of the active room state (`tokensHash`, `combatHash`, `fogHash`) in the standard heartbeat. If a client's local calculated CRC32 diverges, it dispatches `sync:request-snapshot` to cleanly resynchronize without reloading the web page.

---

# 4. Relational Database Schema, Migrations & ORM Specifications

## 4.1 Production PostgreSQL / Supabase SQL DDL (12 Tables, 9 ENUMs)
The following DDL migration script provides a complete, syntactically verified database foundation:

```sql
-- ============================================================================
-- VTT ASAL JADI - PRODUCTION DATABASE SCHEMA
-- Target Engine: PostgreSQL 15+ / Supabase
-- Extensions: uuid-ossp, pgcrypto, btree_gin
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'user', 'guest');
CREATE TYPE participant_role AS ENUM ('dm', 'co_dm', 'player', 'spectator');
CREATE TYPE session_status AS ENUM ('draft', 'active', 'paused', 'completed', 'archived');
CREATE TYPE grid_type AS ENUM ('square', 'hex_pointy', 'hex_flat', 'gridless');
CREATE TYPE token_size AS ENUM ('tiny', 'small', 'medium', 'large', 'huge', 'gargantuan');
CREATE TYPE token_type AS ENUM ('pc', 'npc', 'monster', 'prop', 'spell_effect');
CREATE TYPE roll_type AS ENUM (
  'general', 'attack', 'damage', 'saving_throw', 
  'ability_check', 'skill_check', 'initiative', 'death_save', 'table'
);
CREATE TYPE overlay_position AS ENUM ('top', 'center', 'bottom');
CREATE TYPE overlay_animation AS ENUM ('slide', 'fade', 'bounce', 'zoom');
CREATE TYPE overlay_font_size AS ENUM ('small', 'medium', 'large');

-- ============================================================================
-- 2. CORE TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table 1: profiles (Extends Supabase auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT DEFAULT 'https://cdn.vtt-asal-jadi.com/avatars/default.webp',
  role user_role NOT NULL DEFAULT 'user',
  preferences JSONB NOT NULL DEFAULT '{
    "theme": "obsidian-gold",
    "dice_sound_enabled": true,
    "dice_3d_enabled": true,
    "snap_to_grid": true,
    "color_scheme": "amber"
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- Table 2: campaigns (Multi-tenant Campaign Containers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (char_length(trim(title)) >= 1 AND char_length(title) <= 100),
  description TEXT DEFAULT '',
  banner_url TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  settings JSONB NOT NULL DEFAULT '{
    "allow_spectators": true,
    "strict_movement": false,
    "fog_of_war_default": true,
    "diagonal_rule": "5-10-5"
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- Table 3: sessions (Game Rooms)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  dm_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  room_id TEXT NOT NULL UNIQUE CHECK (room_id ~ '^[a-z0-9-]{3,50}$'),
  title TEXT NOT NULL DEFAULT 'Game Session',
  description TEXT DEFAULT '',
  status session_status NOT NULL DEFAULT 'draft',
  invite_code TEXT UNIQUE CHECK (invite_code ~ '^[A-Z0-9]{6,12}$'),
  password_hash TEXT,
  settings JSONB NOT NULL DEFAULT '{
    "allow_spectators": true,
    "auto_hide_rolls": false,
    "grid_snap": true,
    "initiative_auto_sort": true
  }'::jsonb,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- Table 4: session_participants (Room Roster & Roles)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.session_participants (
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role participant_role NOT NULL DEFAULT 'player',
  character_id UUID, -- Forward foreign key added after characters table
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (session_id, user_id)
);

-- ----------------------------------------------------------------------------
-- Table 5: characters (5e Character Sheets)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ddb_id TEXT CHECK (ddb_id IS NULL OR ddb_id ~ '^[0-9]+$'),
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1 AND char_length(name) <= 100),
  avatar_url TEXT DEFAULT 'https://cdn.vtt-asal-jadi.com/avatars/default.webp',
  race TEXT NOT NULL DEFAULT 'Human',
  class_and_level TEXT NOT NULL DEFAULT 'Adventurer 1',
  level INT NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 20),
  experience_points INT NOT NULL DEFAULT 0 CHECK (experience_points >= 0),
  alignment TEXT DEFAULT 'True Neutral',
  background TEXT DEFAULT '',
  
  -- Core Vitals & Combat Statistics
  hp_current INT NOT NULL DEFAULT 10 CHECK (hp_current >= 0),
  hp_max INT NOT NULL DEFAULT 10 CHECK (hp_max >= 1),
  hp_temp INT NOT NULL DEFAULT 0 CHECK (hp_temp >= 0),
  ac INT NOT NULL DEFAULT 10 CHECK (ac >= 0),
  speed INT NOT NULL DEFAULT 30 CHECK (speed >= 0),
  initiative_modifier INT NOT NULL DEFAULT 0,
  proficiency_bonus INT NOT NULL DEFAULT 2 CHECK (proficiency_bonus >= 2 AND proficiency_bonus <= 6),
  inspiration BOOLEAN NOT NULL DEFAULT false,
  
  -- Rich D&D 5e JSONB Documents
  stats JSONB NOT NULL DEFAULT '{"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10}'::jsonb,
  modifiers JSONB NOT NULL DEFAULT '{"str": 0, "dex": 0, "con": 0, "int": 0, "wis": 0, "cha": 0}'::jsonb,
  saving_throws JSONB NOT NULL DEFAULT '{"proficiencies": [], "custom_modifiers": {}}'::jsonb,
  skills JSONB NOT NULL DEFAULT '{"proficiencies": [], "expertises": [], "custom_modifiers": {}}'::jsonb,
  currencies JSONB NOT NULL DEFAULT '{"cp": 0, "sp": 0, "ep": 0, "gp": 0, "pp": 0}'::jsonb,
  hit_dice JSONB NOT NULL DEFAULT '{"current": 1, "max": 1, "die_type": 8}'::jsonb,
  death_saves JSONB NOT NULL DEFAULT '{"successes": 0, "failures": 0}'::jsonb,
  spell_slots JSONB NOT NULL DEFAULT '{}'::jsonb,
  spells JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  proficiencies JSONB NOT NULL DEFAULT '{"armor": [], "weapons": [], "tools": [], "languages": []}'::jsonb,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  resources JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Narrative & Notes
  personality_traits TEXT DEFAULT '',
  ideals TEXT DEFAULT '',
  bonds TEXT DEFAULT '',
  flaws TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  
  is_npc BOOLEAN NOT NULL DEFAULT false,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Attach session_participants character foreign key
ALTER TABLE public.session_participants 
  ADD CONSTRAINT fk_session_participants_character 
  FOREIGN KEY (character_id) REFERENCES public.characters(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- Table 6: map_templates (Library Map Assets)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.map_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 1 AND char_length(name) <= 100),
  image_url TEXT NOT NULL CHECK (image_url ~ '^https?://'),
  thumbnail_url TEXT,
  grid_size INT NOT NULL DEFAULT 50 CHECK (grid_size >= 10 AND grid_size <= 500),
  grid_type grid_type NOT NULL DEFAULT 'square',
  grid_color TEXT NOT NULL DEFAULT '#d4a544',
  grid_opacity NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (grid_opacity >= 0.0 AND grid_opacity <= 1.0),
  width INT NOT NULL DEFAULT 1920 CHECK (width >= 100 AND width <= 16384),
  height INT NOT NULL DEFAULT 1080 CHECK (height >= 100 AND height <= 16384),
  walls JSONB NOT NULL DEFAULT '[]'::jsonb,
  lights JSONB NOT NULL DEFAULT '[]'::jsonb,
  default_fog JSONB NOT NULL DEFAULT '{"revealed_polygons": [], "explored_mask": null}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- Table 7: map_states (Active Session Map Instances)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.map_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  map_template_id UUID REFERENCES public.map_templates(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  name TEXT NOT NULL DEFAULT 'Tactical Map',
  image_url TEXT NOT NULL CHECK (image_url ~ '^https?://'),
  grid_size INT NOT NULL DEFAULT 50 CHECK (grid_size >= 10 AND grid_size <= 500),
  grid_type grid_type NOT NULL DEFAULT 'square',
  grid_color TEXT NOT NULL DEFAULT '#d4a544',
  grid_opacity NUMERIC(3,2) NOT NULL DEFAULT 0.50,
  grid_offset_x INT NOT NULL DEFAULT 0,
  grid_offset_y INT NOT NULL DEFAULT 0,
  width INT NOT NULL DEFAULT 1920,
  height INT NOT NULL DEFAULT 1080,
  fog_of_war JSONB NOT NULL DEFAULT '{"revealed_polygons": [], "mode": "dynamic"}'::jsonb,
  walls JSONB NOT NULL DEFAULT '[]'::jsonb,
  lights JSONB NOT NULL DEFAULT '[]'::jsonb,
  ambient_light_color TEXT NOT NULL DEFAULT '#ffffff',
  ambient_light_intensity NUMERIC(3,2) NOT NULL DEFAULT 1.0 CHECK (ambient_light_intensity >= 0.0 AND ambient_light_intensity <= 1.0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- Table 8: tokens (Blueprint Library)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  character_id UUID REFERENCES public.characters(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (char_length(label) <= 100),
  avatar_url TEXT NOT NULL CHECK (avatar_url ~ '^https?://'),
  token_type token_type NOT NULL DEFAULT 'pc',
  size token_size NOT NULL DEFAULT 'medium',
  scale_factor NUMERIC(3,2) NOT NULL DEFAULT 1.00 CHECK (scale_factor >= 0.1 AND scale_factor <= 10.0),
  tint_color TEXT DEFAULT '#d4a544',
  vision_darkvision INT NOT NULL DEFAULT 0 CHECK (vision_darkvision >= 0),
  vision_blindsight INT NOT NULL DEFAULT 0 CHECK (vision_blindsight >= 0),
  light_bright_radius INT NOT NULL DEFAULT 0 CHECK (light_bright_radius >= 0),
  light_dim_radius INT NOT NULL DEFAULT 0 CHECK (light_dim_radius >= 0),
  light_color TEXT DEFAULT '#ffffff',
  default_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- Table 9: token_instances (Placed Canvas Tokens)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.token_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  map_state_id UUID NOT NULL REFERENCES public.map_states(id) ON DELETE CASCADE,
  character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  token_blueprint_id UUID REFERENCES public.tokens(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  x NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  y NUMERIC(8,2) NOT NULL DEFAULT 0.00,
  z_index INT NOT NULL DEFAULT 1,
  size token_size NOT NULL DEFAULT 'medium',
  scale_factor NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  rotation NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (rotation >= 0.0 AND rotation < 360.0),
  elevation NUMERIC(6,2) NOT NULL DEFAULT 0.00,
  
  -- Realtime Combat Overrides
  hp_current INT,
  hp_max INT,
  hp_temp INT,
  ac INT,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Visibility & Permissions
  is_visible_to_players BOOLEAN NOT NULL DEFAULT true,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  tint_color TEXT DEFAULT '#d4a544',
  
  -- Token Lighting & Vision
  has_darkvision BOOLEAN NOT NULL DEFAULT false,
  darkvision_radius INT NOT NULL DEFAULT 0,
  light_bright_radius INT NOT NULL DEFAULT 0,
  light_dim_radius INT NOT NULL DEFAULT 0,
  light_color TEXT DEFAULT '#ffffff',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- Table 10: initiatives (Combat Turn Trackers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
  round INT NOT NULL DEFAULT 1 CHECK (round >= 1),
  active_turn_index INT NOT NULL DEFAULT 0 CHECK (active_turn_index >= 0),
  is_active BOOLEAN NOT NULL DEFAULT false,
  turn_timer_seconds INT DEFAULT 60 CHECK (turn_timer_seconds IS NULL OR turn_timer_seconds > 0),
  combatants JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{
    "sort_direction": "desc",
    "hide_npc_hp": true,
    "hide_npc_rolls": true,
    "auto_roll_npc_initiative": true
  }'::jsonb,
  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- Table 11: dice_rolls (Cryptographic Roll Audit Trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dice_rolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
  character_name TEXT NOT NULL DEFAULT 'Adventurer',
  character_avatar TEXT,
  roll_name TEXT NOT NULL DEFAULT 'Dice Roll',
  formula TEXT NOT NULL CHECK (char_length(formula) <= 150),
  result NUMERIC(8,2) NOT NULL,
  rolls_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  roll_type roll_type NOT NULL DEFAULT 'general',
  is_critical BOOLEAN NOT NULL DEFAULT false,
  is_fumble BOOLEAN NOT NULL DEFAULT false,
  is_secret BOOLEAN NOT NULL DEFAULT false,
  seed TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  signature TEXT,
  client_timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ----------------------------------------------------------------------------
-- Table 12: overlay_configs (OBS Streaming Overlays)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.overlay_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stream_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  position overlay_position NOT NULL DEFAULT 'bottom',
  animation_style overlay_animation NOT NULL DEFAULT 'slide',
  font_size overlay_font_size NOT NULL DEFAULT 'medium',
  show_formula BOOLEAN NOT NULL DEFAULT true,
  auto_hide_timeout INT NOT NULL DEFAULT 10 CHECK (auto_hide_timeout >= 1 AND auto_hide_timeout <= 120),
  sound_effects_enabled BOOLEAN NOT NULL DEFAULT false,
  hud_layout JSONB NOT NULL DEFAULT '{
    "show_active_combatant": true,
    "show_character_hp": true,
    "show_nat20_animation": true,
    "card_theme": "obsidian-gold"
  }'::jsonb,
  theme JSONB NOT NULL DEFAULT '{
    "primary_color": "#d4a544",
    "background_color": "rgba(12, 14, 20, 0.85)",
    "font_family": "Cinzel, serif"
  }'::jsonb,
  visible_widgets JSONB NOT NULL DEFAULT '["roll_card", "active_turn"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 3. AUTOMATIC TIMESTAMP TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'profiles', 'campaigns', 'sessions', 'characters',
    'map_templates', 'map_states', 'tokens', 'token_instances',
    'initiatives', 'overlay_configs'
  ]
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
      CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    ', tbl, tbl);
  END LOOP;
END;
$$;
```

---

## 4.2 Comprehensive Indexing Strategy (B-Tree, Composite, Partial, JSONB GIN)
The following indexing matrix guarantees sub-5ms lookups across high-frequency WebSocket and REST query paths:

```sql
-- ============================================================================
-- INDEXING MATRIX
-- ============================================================================

-- 1. B-Tree Indexes on Foreign Keys
CREATE INDEX IF NOT EXISTS idx_campaigns_dm_id ON public.campaigns(dm_id);
CREATE INDEX IF NOT EXISTS idx_sessions_campaign_id ON public.sessions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sessions_dm_id ON public.sessions(dm_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_user_id ON public.session_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_character_id ON public.session_participants(character_id);
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON public.characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_campaign_id ON public.characters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_map_templates_created_by ON public.map_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_map_templates_campaign_id ON public.map_templates(campaign_id);
CREATE INDEX IF NOT EXISTS idx_map_states_session_id ON public.map_states(session_id);
CREATE INDEX IF NOT EXISTS idx_map_states_map_template_id ON public.map_states(map_template_id);
CREATE INDEX IF NOT EXISTS idx_tokens_campaign_id ON public.tokens(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tokens_character_id ON public.tokens(character_id);
CREATE INDEX IF NOT EXISTS idx_token_instances_session_id ON public.token_instances(session_id);
CREATE INDEX IF NOT EXISTS idx_token_instances_map_state_id ON public.token_instances(map_state_id);
CREATE INDEX IF NOT EXISTS idx_token_instances_character_id ON public.token_instances(character_id);
CREATE INDEX IF NOT EXISTS idx_dice_rolls_session_id ON public.dice_rolls(session_id);
CREATE INDEX IF NOT EXISTS idx_dice_rolls_user_id ON public.dice_rolls(user_id);
CREATE INDEX IF NOT EXISTS idx_dice_rolls_character_id ON public.dice_rolls(character_id);
CREATE INDEX IF NOT EXISTS idx_overlay_configs_user_id ON public.overlay_configs(user_id);

-- 2. Composite Query-Optimized B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_dice_rolls_session_created 
  ON public.dice_rolls (session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dice_rolls_analytics 
  ON public.dice_rolls (session_id, formula, is_critical);

CREATE INDEX IF NOT EXISTS idx_token_instances_session_map 
  ON public.token_instances (session_id, map_state_id, is_visible_to_players);

CREATE INDEX IF NOT EXISTS idx_session_participants_active 
  ON public.session_participants (session_id, is_active, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_campaign_status 
  ON public.sessions (campaign_id, status, created_at DESC);

-- 3. Partial Indexes (Saves Disk RAM for Filtered Workloads)
CREATE UNIQUE INDEX IF NOT EXISTS idx_map_states_active_per_session 
  ON public.map_states (session_id) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_characters_ddb_id 
  ON public.characters (ddb_id) 
  WHERE ddb_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_invite_code 
  ON public.sessions (invite_code) 
  WHERE invite_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_overlay_configs_stream_key 
  ON public.overlay_configs (stream_key);

-- 4. High-Performance GIN Indexes on JSONB Documents
CREATE INDEX IF NOT EXISTS idx_characters_stats_gin 
  ON public.characters USING gin (stats);

CREATE INDEX IF NOT EXISTS idx_characters_conditions_gin 
  ON public.characters USING gin (conditions jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_characters_spells_gin 
  ON public.characters USING gin (spells jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_characters_equipment_gin 
  ON public.characters USING gin (equipment jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_map_states_fog_gin 
  ON public.map_states USING gin (fog_of_war);

CREATE INDEX IF NOT EXISTS idx_map_states_walls_gin 
  ON public.map_states USING gin (walls jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_token_instances_conditions_gin 
  ON public.token_instances USING gin (conditions jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_dice_rolls_breakdown_gin 
  ON public.dice_rolls USING gin (breakdown jsonb_path_ops);
```

---

## 4.3 Row Level Security (RLS) Policies & Security Definer Functions

```sql
-- ============================================================================
-- RLS HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_dm_of_session(p_session_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.sessions
    WHERE id = p_session_id AND dm_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.session_participants
    WHERE session_id = p_session_id 
      AND user_id = auth.uid() 
      AND role IN ('dm', 'co_dm')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_participant_of_session(p_session_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.session_participants
    WHERE session_id = p_session_id 
      AND user_id = auth.uid() 
      AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.sessions
    WHERE id = p_session_id AND dm_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_dm_of_campaign(p_campaign_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE id = p_campaign_id AND dm_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_member_of_campaign(p_campaign_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.campaigns
    WHERE id = p_campaign_id AND dm_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.session_participants sp ON sp.session_id = s.id
    WHERE s.campaign_id = p_campaign_id AND sp.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.map_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dice_rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overlay_configs ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Campaigns Policies
CREATE POLICY "Campaign members can view campaign"
  ON public.campaigns FOR SELECT TO authenticated
  USING (dm_id = auth.uid() OR public.is_member_of_campaign(id));
CREATE POLICY "Authenticated users can create campaigns"
  ON public.campaigns FOR INSERT TO authenticated WITH CHECK (dm_id = auth.uid());
CREATE POLICY "DM can update own campaign"
  ON public.campaigns FOR UPDATE TO authenticated USING (dm_id = auth.uid()) WITH CHECK (dm_id = auth.uid());
CREATE POLICY "DM can delete own campaign"
  ON public.campaigns FOR DELETE TO authenticated USING (dm_id = auth.uid());

-- 3. Sessions Policies
CREATE POLICY "Session participants can view sessions"
  ON public.sessions FOR SELECT TO authenticated
  USING (dm_id = auth.uid() OR public.is_participant_of_session(id) OR public.is_member_of_campaign(campaign_id));
CREATE POLICY "Campaign DM can create sessions"
  ON public.sessions FOR INSERT TO authenticated WITH CHECK (dm_id = auth.uid() AND public.is_dm_of_campaign(campaign_id));
CREATE POLICY "Session DM can update session"
  ON public.sessions FOR UPDATE TO authenticated USING (public.is_dm_of_session(id)) WITH CHECK (public.is_dm_of_session(id));
CREATE POLICY "Session DM can delete session"
  ON public.sessions FOR DELETE TO authenticated USING (public.is_dm_of_session(id));

-- 4. Session Participants Policies
CREATE POLICY "Participants can view session roster"
  ON public.session_participants FOR SELECT TO authenticated USING (public.is_participant_of_session(session_id));
CREATE POLICY "Users can join sessions as participants"
  ON public.session_participants FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "DM or self can update participant status"
  ON public.session_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_dm_of_session(session_id))
  WITH CHECK (user_id = auth.uid() OR public.is_dm_of_session(session_id));
CREATE POLICY "DM can remove participants or user can leave"
  ON public.session_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_dm_of_session(session_id));

-- 5. Characters Policies
CREATE POLICY "Users can view own characters or campaign characters"
  ON public.characters FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (campaign_id IS NOT NULL AND public.is_member_of_campaign(campaign_id)));
CREATE POLICY "Users can insert own characters"
  ON public.characters FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own characters, DM can update campaign characters"
  ON public.characters FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR (campaign_id IS NOT NULL AND public.is_dm_of_campaign(campaign_id)))
  WITH CHECK (user_id = auth.uid() OR (campaign_id IS NOT NULL AND public.is_dm_of_campaign(campaign_id)));
CREATE POLICY "Users can delete own characters"
  ON public.characters FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 6. Map Templates & Map States Policies
CREATE POLICY "Users can view templates" ON public.map_templates FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR (campaign_id IS NOT NULL AND public.is_member_of_campaign(campaign_id)));
CREATE POLICY "Creators can manage templates" ON public.map_templates FOR ALL TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Participants can view active map state" ON public.map_states FOR SELECT TO authenticated
  USING (public.is_participant_of_session(session_id));
CREATE POLICY "DM can manage session map states" ON public.map_states FOR ALL TO authenticated
  USING (public.is_dm_of_session(session_id)) WITH CHECK (public.is_dm_of_session(session_id));

-- 7. Tokens & Token Instances Policies
CREATE POLICY "Campaign members view blueprints" ON public.tokens FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_member_of_campaign(campaign_id));
CREATE POLICY "Users create blueprints" ON public.tokens FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Participants view visible tokens" ON public.token_instances FOR SELECT TO authenticated
  USING (public.is_dm_of_session(session_id) OR (public.is_participant_of_session(session_id) AND is_visible_to_players = true));
CREATE POLICY "DM can manage all token instances" ON public.token_instances FOR ALL TO authenticated
  USING (public.is_dm_of_session(session_id)) WITH CHECK (public.is_dm_of_session(session_id));
CREATE POLICY "Players can move own unlocked assigned tokens" ON public.token_instances FOR UPDATE TO authenticated
  USING (public.is_participant_of_session(session_id) AND character_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()) AND is_locked = false)
  WITH CHECK (public.is_participant_of_session(session_id) AND character_id IN (SELECT id FROM public.characters WHERE user_id = auth.uid()));

-- 8. Initiatives, Rolls & Overlay Configs
CREATE POLICY "Participants view combat tracker" ON public.initiatives FOR SELECT TO authenticated USING (public.is_participant_of_session(session_id));
CREATE POLICY "DM manages combat tracker" ON public.initiatives FOR ALL TO authenticated USING (public.is_dm_of_session(session_id)) WITH CHECK (public.is_dm_of_session(session_id));
CREATE POLICY "Participants view rolls, DM views secret" ON public.dice_rolls FOR SELECT TO authenticated
  USING ((public.is_participant_of_session(session_id) AND (is_secret = false OR user_id = auth.uid())) OR public.is_dm_of_session(session_id));
CREATE POLICY "Participants insert rolls" ON public.dice_rolls FOR INSERT TO authenticated
  WITH CHECK (public.is_participant_of_session(session_id) AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "Holders view overlay config" ON public.overlay_configs FOR SELECT USING (public.is_participant_of_session(session_id) OR user_id = auth.uid() OR stream_key IS NOT NULL);
CREATE POLICY "DM manages overlay config" ON public.overlay_configs FOR ALL TO authenticated USING (public.is_dm_of_session(session_id) OR user_id = auth.uid()) WITH CHECK (public.is_dm_of_session(session_id) OR user_id = auth.uid());
```

---

## 4.4 Drizzle ORM TypeScript Schema
The canonical TypeScript definition for Drizzle ORM (`src/db/schema.ts`):

```typescript
import { pgTable, uuid, text, integer, boolean, numeric, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'user', 'guest']);
export const participantRoleEnum = pgEnum('participant_role', ['dm', 'co_dm', 'player', 'spectator']);
export const sessionStatusEnum = pgEnum('session_status', ['draft', 'active', 'paused', 'completed', 'archived']);
export const gridTypeEnum = pgEnum('grid_type', ['square', 'hex_pointy', 'hex_flat', 'gridless']);
export const tokenSizeEnum = pgEnum('token_size', ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']);
export const tokenTypeEnum = pgEnum('token_type', ['pc', 'npc', 'monster', 'prop', 'spell_effect']);
export const rollTypeEnum = pgEnum('roll_type', [
  'general', 'attack', 'damage', 'saving_throw', 
  'ability_check', 'skill_check', 'initiative', 'death_save', 'table'
]);
export const overlayPositionEnum = pgEnum('overlay_position', ['top', 'center', 'bottom']);
export const overlayAnimationEnum = pgEnum('overlay_animation', ['slide', 'fade', 'bounce', 'zoom']);
export const overlayFontSizeEnum = pgEnum('overlay_font_size', ['small', 'medium', 'large']);

// 2. Profiles Table
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url').default('https://cdn.vtt-asal-jadi.com/avatars/default.webp'),
  role: userRoleEnum('role').default('user').notNull(),
  preferences: jsonb('preferences').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. Campaigns Table
export const campaigns = pgTable('campaigns', {
  id: uuid('id').defaultRandom().primaryKey(),
  dmId: uuid('dm_id').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  title: text('title').notNull(),
  description: text('description').default(''),
  bannerUrl: text('banner_url'),
  isArchived: boolean('is_archived').default(false).notNull(),
  settings: jsonb('settings').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. Sessions Table
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  dmId: uuid('dm_id').notNull().references(() => profiles.id, { onDelete: 'restrict' }),
  roomId: text('room_id').notNull().unique(),
  title: text('title').default('Game Session').notNull(),
  description: text('description').default(''),
  status: sessionStatusEnum('status').default('draft').notNull(),
  inviteCode: text('invite_code').unique(),
  passwordHash: text('password_hash'),
  settings: jsonb('settings').notNull().default({}),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 5. Characters Table
export const characters = pgTable('characters', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  campaignId: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  ddbId: text('ddb_id'),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  race: text('race').default('Human').notNull(),
  classAndLevel: text('class_and_level').default('Adventurer 1').notNull(),
  level: integer('level').default(1).notNull(),
  hpCurrent: integer('hp_current').default(10).notNull(),
  hpMax: integer('hp_max').default(10).notNull(),
  hpTemp: integer('hp_temp').default(0).notNull(),
  ac: integer('ac').default(10).notNull(),
  speed: integer('speed').default(30).notNull(),
  stats: jsonb('stats').notNull().default({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }),
  modifiers: jsonb('modifiers').notNull().default({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }),
  currencies: jsonb('currencies').notNull().default({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }),
  equipment: jsonb('equipment').notNull().default([]),
  spells: jsonb('spells').notNull().default([]),
  spellSlots: jsonb('spell_slots').notNull().default({}),
  conditions: jsonb('conditions').notNull().default([]),
  isNpc: boolean('is_npc').default(false).notNull(),
  notes: text('notes').default(''),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 6. Dice Rolls Table
export const diceRolls = pgTable('dice_rolls', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => profiles.id, { onDelete: 'set null' }),
  characterId: uuid('character_id').references(() => characters.id, { onDelete: 'set null' }),
  characterName: text('character_name').default('Adventurer').notNull(),
  formula: text('formula').notNull(),
  result: numeric('result', { precision: 8, scale: 2 }).notNull(),
  rollsJson: jsonb('rolls_json').notNull().default([]),
  breakdown: jsonb('breakdown').notNull().default({}),
  rollType: rollTypeEnum('roll_type').default('general').notNull(),
  isCritical: boolean('is_critical').default(false).notNull(),
  seed: text('seed').notNull(),
  signature: text('signature'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  dm: one(profiles, { fields: [campaigns.dmId], references: [profiles.id] }),
  sessions: many(sessions),
  characters: many(characters),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  campaign: one(campaigns, { fields: [sessions.campaignId], references: [campaigns.id] }),
  dm: one(profiles, { fields: [sessions.dmId], references: [profiles.id] }),
  diceRolls: many(diceRolls),
}));
```

---

## 4.5 Prisma ORM Schema Mapping (`prisma/schema.prisma`)

```prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  directUrl  = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  admin
  user
  guest
}

enum ParticipantRole {
  dm
  co_dm
  player
  spectator
}

enum SessionStatus {
  draft
  active
  paused
  completed
  archived
}

enum GridType {
  square
  hex_pointy
  hex_flat
  gridless
}

enum TokenSize {
  tiny
  small
  medium
  large
  huge
  gargantuan
}

enum RollType {
  general
  attack
  damage
  saving_throw
  ability_check
  skill_check
  initiative
  death_save
  table
}

model Profile {
  id                  String               @id @db.Uuid
  email               String               @unique
  displayName         String               @map("display_name")
  avatarUrl           String?              @default("https://cdn.vtt-asal-jadi.com/avatars/default.webp") @map("avatar_url")
  role                UserRole             @default(user)
  preferences         Json                 @default("{}")
  createdAt           DateTime             @default(now()) @map("created_at") @db.Timestamptz
  updatedAt           DateTime             @updatedAt @map("updated_at") @db.Timestamptz

  campaigns           Campaign[]           @relation("DMCampaigns")
  sessions            Session[]            @relation("DMSessions")
  participants        SessionParticipant[]
  characters          Character[]
  diceRolls           DiceRoll[]
  overlayConfigs      OverlayConfig[]
  mapTemplates        MapTemplate[]
  tokens              Token[]

  @@map("profiles")
}

model Campaign {
  id          String        @id @default(uuid()) @db.Uuid
  dmId        String        @map("dm_id") @db.Uuid
  title       String
  description String?       @default("")
  bannerUrl   String?       @map("banner_url")
  isArchived  Boolean       @default(false) @map("is_archived")
  settings    Json          @default("{}")
  createdAt   DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  dm          Profile       @relation("DMCampaigns", fields: [dmId], references: [id], onDelete: Restrict)
  sessions    Session[]
  characters  Character[]
  mapTemplates MapTemplate[]
  tokens      Token[]

  @@index([dmId])
  @@map("campaigns")
}

model Session {
  id           String               @id @default(uuid()) @db.Uuid
  campaignId   String               @map("campaign_id") @db.Uuid
  dmId         String               @map("dm_id") @db.Uuid
  roomId       String               @unique @map("room_id")
  title        String               @default("Game Session")
  description  String?              @default("")
  status       SessionStatus        @default(draft)
  inviteCode   String?              @unique @map("invite_code")
  passwordHash String?              @map("password_hash")
  settings     Json                 @default("{}")
  startedAt    DateTime?            @map("started_at") @db.Timestamptz
  endedAt      DateTime?            @map("ended_at") @db.Timestamptz
  createdAt    DateTime             @default(now()) @map("created_at") @db.Timestamptz
  updatedAt    DateTime             @updatedAt @map("updated_at") @db.Timestamptz

  campaign     Campaign             @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  dm           Profile              @relation("DMSessions", fields: [dmId], references: [id], onDelete: Restrict)
  participants SessionParticipant[]
  mapStates    MapState[]
  tokenInstances TokenInstance[]
  initiative   Initiative?
  diceRolls    DiceRoll[]
  overlayConfig OverlayConfig?

  @@index([campaignId, status])
  @@map("sessions")
}

model Character {
  id            String               @id @default(uuid()) @db.Uuid
  userId        String               @map("user_id") @db.Uuid
  campaignId    String?              @map("campaign_id") @db.Uuid
  ddbId         String?              @map("ddb_id")
  name          String
  avatarUrl     String?              @map("avatar_url")
  race          String               @default("Human")
  classAndLevel String               @default("Adventurer 1") @map("class_and_level")
  level         Int                  @default(1)
  hpCurrent     Int                  @default(10) @map("hp_current")
  hpMax         Int                  @default(10) @map("hp_max")
  hpTemp        Int                  @default(0) @map("hp_temp")
  ac            Int                  @default(10)
  speed         Int                  @default(30)
  stats         Json                 @default("{\"str\":10,\"dex\":10,\"con\":10,\"int\":10,\"wis\":10,\"cha\":10}")
  modifiers     Json                 @default("{\"str\":0,\"dex\":0,\"con\":0,\"int\":0,\"wis\":0,\"cha\":0}")
  currencies    Json                 @default("{\"cp\":0,\"sp\":0,\"ep\":0,\"gp\":0,\"pp\":0}")
  equipment     Json                 @default("[]")
  spells        Json                 @default("[]")
  spellSlots    Json                 @default("{}") @map("spell_slots")
  conditions    Json                 @default("[]")
  isNpc         Boolean              @default(false) @map("is_npc")
  notes         String?              @default("")
  createdAt     DateTime             @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime             @updatedAt @map("updated_at") @db.Timestamptz

  user          Profile              @relation(fields: [userId], references: [id], onDelete: Cascade)
  campaign      Campaign?            @relation(fields: [campaignId], references: [id], onDelete: SetNull)
  participants  SessionParticipant[]
  tokenInstances TokenInstance[]
  diceRolls     DiceRoll[]
  tokens        Token[]

  @@index([userId, updatedAt])
  @@map("characters")
}
```

---

## 4.6 ORM & Migration Framework Comparison
| Feature | Supabase Native CLI | Drizzle ORM | Prisma ORM |
|---|---|---|---|
| **Runtime Overhead** | Zero (Pure SQL) | < 5ms (Lightweight TS) | 50-150ms (Rust Binary) |
| **Serverless Cold Start** | N/A (Direct SQL) | Negligible | Moderate (Engine Load) |
| **RLS Policy Handling** | 100% Native | Via Migration Scripts | Bypasses RLS by Default |
| **Complex JSONB Queries** | Full SQL Operators | First-class helper types | Basic Json Filter |
| **Recommendation** | Production DDL Migrations | Primary Edge/Node ORM | Legacy Monolithic Apps |

---

# 5. D&D Beyond Integration & Sync Daemon Architecture

## 5.1 Reverse-Engineered v5 API Ingestion Contract
- **Endpoint**: `https://character-service.dndbeyond.com/character/v5/character/{characterId}`
- **Headers**:
  ```http
  User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
  Accept: application/json
  Authorization: Bearer <cobalt_token>
  Cookie: CobaltSession=<cobalt_session_cookie>
  ```

---

## 5.2 5e Stat Normalization Engine & Precedence Rules

### Ability Score Calculation Precedence
For each ability $A \in \{\text{str}, \text{dex}, \text{con}, \text{int}, \text{wis}, \text{cha}\}$:

$$\text{RawScore}(A) = \text{baseStats}[A] + \text{bonusStats}[A] + \sum \text{modifier}(\text{type} = \text{'bonus'}, \text{subType} = A + \text{'-score'})$$

$$\text{FinalScore}(A) = \begin{cases} 
\text{overrideStats}[A] & \text{if } \text{overrideStats}[A] > 0 \\
\max(\text{RawScore}(A), \text{setScoreModifiers}[A]) & \text{if item sets score (e.g. Gauntlets of Ogre Power = 19)} \\
\text{RawScore}(A) & \text{otherwise}
\end{cases}$$

$$\text{Modifier}(A) = \lfloor(\text{FinalScore}(A) - 10) / 2\rfloor$$

### Hit Points & Health Pool Formula
$$\text{MaxHP} = \begin{cases}
\text{overrideHitPoints} & \text{if } \text{overrideHitPoints} > 0 \\
\max(1, \text{baseHitPoints} + (\text{conMod} \times \text{level}) + (\text{bonusHpPerLevel} \times \text{level}) + \text{bonusHitPoints}) & \text{otherwise}
\end{cases}$$

$$\text{CurrentHP} = \max(0, \text{MaxHP} - \text{removedHitPoints})$$

---

## 5.3 CobaltSession Token Encryption & Key Security (AES-256-GCM)
User CobaltSession authentication tokens are encrypted at rest with authenticated AES-256-GCM:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export interface EncryptedSecret {
  ciphertext: string; // Base64
  iv: string;         // Base64 (12 bytes)
  tag: string;        // Base64 (16 bytes auth tag)
}

export function encryptCobaltToken(token: string, masterKeyHex: string): EncryptedSecret {
  const key = Buffer.from(masterKeyHex, 'hex');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let ciphertext = cipher.update(token, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  const tag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptCobaltToken(encrypted: EncryptedSecret, masterKeyHex: string): string {
  const key = Buffer.from(masterKeyHex, 'hex');
  const iv = Buffer.from(encrypted.iv, 'base64');
  const tag = Buffer.from(encrypted.tag, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

---

## 5.4 Serverless Sync Daemon & Queue Topology (Upstash QStash & BullMQ)
In serverless environments (Vercel), scheduled background loops cannot run in-memory. We deploy a dual-tier queue:
1. **Tier 1 (Serverless)**: Upstash QStash initiates periodic cron calls (`*/5 * * * *`) hitting `/api/v2/jobs/sync-characters`.
2. **Tier 2 (Worker Daemon)**: BullMQ manages worker concurrency (max 10 jobs), token bucket throttling (5 req/sec to DDB), and exponential retry backoff.

---

## 5.5 Token Bucket Rate Limiting with Full Jitter Exponential Backoff
When D&D Beyond returns `429 Too Many Requests` or `503 Service Unavailable`, workers back off with randomized jitter:

$$t_{\text{backoff}} = \min(30000\,\text{ms}, 1000\,\text{ms} \times 2^{\text{attempt}})$$
$$t_{\text{delay}} = \text{random\_between}(0, t_{\text{backoff}})$$

---

## 5.6 Delta Sync Engine & RFC 6902 JSON Patch Generation
To prevent DOM flickering and state reset, the server diffs previous and incoming character snapshots:

```typescript
export interface JsonPatchOperation {
  op: 'add' | 'remove' | 'replace';
  path: string;
  value?: unknown;
  oldValue?: unknown;
}

export function computeCharacterDelta(prev: any, next: any): JsonPatchOperation[] {
  const patches: JsonPatchOperation[] = [];

  // Vitals Diff
  if (prev.hp.current !== next.hp.current) {
    patches.push({ op: 'replace', path: '/hp/current', value: next.hp.current, oldValue: prev.hp.current });
  }
  if (prev.hp.max !== next.hp.max) {
    patches.push({ op: 'replace', path: '/hp/max', value: next.hp.max, oldValue: prev.hp.max });
  }
  if (prev.hp.temp !== next.hp.temp) {
    patches.push({ op: 'replace', path: '/hp/temp', value: next.hp.temp, oldValue: prev.hp.temp });
  }

  // Spell Slots Diff
  for (let lvl = 1; lvl <= 9; lvl++) {
    const p = prev.spellSlots?.[lvl]?.current ?? 0;
    const n = next.spellSlots?.[lvl]?.current ?? 0;
    if (p !== n) {
      patches.push({ op: 'replace', path: `/spellSlots/${lvl}/current`, value: n, oldValue: p });
    }
  }

  // Conditions Diff
  if (JSON.stringify(prev.conditions ?? []) !== JSON.stringify(next.conditions ?? [])) {
    patches.push({ op: 'replace', path: '/conditions', value: next.conditions, oldValue: prev.conditions });
  }

  return patches;
}
```

---

## 5.7 Manifest V3 Chrome Extension Receiver & Webhook Endpoint
Players using D&D Beyond can trigger instant sync via our Manifest V3 browser extension.
- **Webhook Endpoint**: `POST /api/v2/ddb/webhook`
- **Security**: Signed with `X-VTT-Signature: sha256=<hex_hmac>` using the player's personal API key.

---

## 5.8 Circuit Breaker & Stale-While-Revalidate Resiliency
- **Circuit Breaker**: Trips to `OPEN` after 5 consecutive DDB failures, serving cached database snapshots for a 60s cooldown window.
- **SWR Caching**: Upstash Redis caches character JSON (60s TTL, 1 hour stale allowance), returning `X-VTT-Cache: STALE-FALLBACK` during upstream D&D Beyond outages.

---

# 6. Cloud, Serverless & Edge Deployment Strategy

## 6.1 Vercel Serverless & Edge Function Routing Matrix

| Route | Target Runtime | Max Timeout | Memory | Rationale |
|---|---|---|---|---|
| `/api/v2/auth/*` | `edge` (V8) | 5s | 128 MB | Instant global JWT verification with zero cold start. |
| `/api/v2/rolls/*` | `edge` (V8) | 5s | 128 MB | Low-latency roll queries and telemetry calculation. |
| `/api/v2/character/import` | `nodejs` | 30s | 512 MB | Heavy DOM/JSON parsing and multi-step normalization. |
| `/api/v2/character/*` | `edge` (V8) | 10s | 128 MB | Fast character CRUD dispatch to Supabase. |
| `/api/v2/sessions/:id/export` | `nodejs` | 30s | 512 MB | Large CSV generation and history export. |
| `/api/v2/assets/upload-url` | `edge` (V8) | 5s | 128 MB | Rapid pre-signed S3/R2 URL signing. |

---

## 6.2 Supabase PostgreSQL & Supavisor Connection Pooling
To support thousands of stateless serverless lambdas without exhausting database connections:
- **Port 6543 (Transaction Mode)**: All runtime REST and Edge functions connect through Supavisor, multiplexing 5,000+ client connections into 30 backend worker connections.
- **Port 5432 (Session Mode)**: Reserved exclusively for schema migrations (`supabase db push`, Drizzle migrations) and long-running transaction DDL.

---

## 6.3 Real-Time WebSocket Infrastructure Comparison & PartyKit Decision
- **Selected Engine**: **PartyKit / Cloudflare Durable Objects**.
- **Rationale**: Provides sub-15ms edge statefulness, WebSocket hibernation ($0.00 cost when rooms are idle), and in-memory spatial collision checking for token drag operations without saturating the relational database.

---

## 6.4 Ephemeral Caching, Presence & State Management via Upstash Redis
- `room:{roomId}:state` (Hash) — Stores active map URL and token coordinates.
- `room:{roomId}:presence` (Sorted Set) — Heartbeat score timestamps updated every 10 seconds.
- `ratelimit:{ip}:{action}` (Sorted Set) — Tracks sliding-window rate limit stamps.

---

## 6.5 Redis Lua Sliding-Window Rate Limiting Algorithm

```lua
-- Upstash Redis Sliding Window Rate Limiter (sliding_window.lua)
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local clearBefore = now - window

redis.call('ZREMRANGEBYSCORE', key, 0, clearBefore)
local currentRequests = redis.call('ZCARD', key)

if currentRequests < limit then
    redis.call('ZADD', key, now, now .. '-' .. math.random(1000, 9999))
    redis.call('PEXPIRE', key, window)
    return {1, limit - currentRequests - 1, 0}
else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retryAfter = math.ceil((tonumber(oldest[2]) + window - now) / 1000)
    return {0, 0, math.max(1, retryAfter)}
end
```

---

## 6.6 High-Resolution 4K/8K Battlemap Storage & Deep Zoom (DZI) Tiling (Cloudflare R2)
- **Direct Uploads**: Pre-signed URLs bypass serverless 4.5MB payload limits, uploading directly to Cloudflare R2.
- **Deep Zoom Pyramid (DZI)**: Large battlemaps (e.g. 8192x8192) are split into 256x256 WebP tiles across 6 zoom levels. Clients fetch only the 4-9 tiles visible in their active viewport (< 400 KB total), eliminating memory strain on mobile devices and laptops.
- **Zero Egress Fees**: Cloudflare R2 eliminates bandwidth egress charges for massive image downloads.

---

## 6.7 Security Blueprint, JWT Key Rotation & Production `.env.example`

```env
# ==============================================================================
# ENVIRONMENT & CORE CONFIGURATION
# ==============================================================================
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://vtt-asal-jadi.com
NEXT_PUBLIC_WS_URL=wss://realtime.vtt-asal-jadi.partykit.dev

# ==============================================================================
# DATABASE & CONNECTION POOLING (SUPABASE)
# ==============================================================================
# Supavisor Transaction Pooler (Port 6543) for Serverless API
DATABASE_URL="postgres://postgres.xxxx:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
# Direct PostgreSQL (Port 5432) for Migrations & DDL
DIRECT_DATABASE_URL="postgres://postgres.xxxx:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# ==============================================================================
# SECURITY & AUTHENTICATION SECRETS
# ==============================================================================
# Asymmetric RSA Private & Public Keys (RS256)
JWT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
JWT_EXPIRES_IN="15m"
# 256-bit Hex Key for DDB CobaltSession AES-256-GCM Encryption
DDB_TOKEN_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
WEBHOOK_SECRET="vtt_whsec_98a7b6c5d4e3f2a1"

# ==============================================================================
# SERVERLESS CACHING & QUEUES (UPSTASH REDIS & QSTASH)
# ==============================================================================
UPSTASH_REDIS_REST_URL="https://us1-xxxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="Axxxx="
QSTASH_URL="https://qstash.upstash.io/v2"
QSTASH_TOKEN="ey..."
QSTASH_CURRENT_SIGNING_KEY="sig_..."
QSTASH_NEXT_SIGNING_KEY="sig_..."

# ==============================================================================
# ASSET STORAGE (CLOUDFLARE R2)
# ==============================================================================
R2_ACCOUNT_ID="cloudflare-account-id"
R2_ACCESS_KEY_ID="r2-access-key-id"
R2_SECRET_ACCESS_KEY="r2-secret-access-key"
R2_BUCKET_NAME="vtt-battlemaps"
NEXT_PUBLIC_CDN_BASE_URL="https://cdn.vtt-asal-jadi.com"

# ==============================================================================
# D&D BEYOND SERVICE CONFIGURATION
# ==============================================================================
DNDBEYOND_API_URL="https://character-service.dndbeyond.com"
CHARACTER_SYNC_ENABLED=true
CHARACTER_SYNC_INTERVAL_MINUTES=5
```

---
*End of Technical Specification — VTT Asal Jadi Backend Recommendations (Milestone 6)*
