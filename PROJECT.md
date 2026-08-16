# Project: VTT Asal Jadi Dark Fantasy Overhaul & Backend Architecture

## Architecture
- **Frontend Stack**: Static HTML5, Modular CSS3 (`public/styles/`), Vanilla ES6+ JavaScript, Socket.IO Client.
- **Backend Stack**: Node.js (ESM), Express 5, Socket.IO v4, SQLite3, TypeScript (`src/` -> `dist/`).
- **Data Flow**:
  - Browser Client <-> REST API (`/api/v2/*`) for Auth, Character Sheets, Sessions, Rolls.
  - Browser Client <-> WebSocket Server (`/`) for Room State, Map Updates, Token Movement, Live Roll Broadcasts.
  - Browser Client <-> D&D Beyond API (via server `/api/v2/character/import`) for character normalization.
  - OBS Stream Overlay <-> WebSocket Server (`/`) for transparent real-time dice roll display.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Dark Fantasy Tokens & Palette | Deep obsidian surfaces (#0c0e14, #11141d, #181c27), gold borders (#f59e0b, #fbbf24, #d97706), glow accents | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Typography System | Display font (Cinzel / MedievalSharp), body/data font (Inter), formula font (Fira Code) | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Reusable UI Components | Cards with gold corner brackets, glowing buttons, form controls, HP meters, filter chips, modal dialogs | M1 | ORIGINAL_REQUEST §R1 |
| 4 | Responsive Utilities | Mobile (320-767px), Tablet (768-1023px), Desktop (1024px+), touch targets >=44px, offcanvas drawer | M1 | ORIGINAL_REQUEST §R1 |
| 5 | Authentication Views Overhaul | Redesign `login.html` & `register.html` with fantasy crest, obsidian card, remember-me/terms checkboxes, gold CTA | M2 | ORIGINAL_REQUEST §R2.1 |
| 6 | User Dashboard Overhaul | Redesign `dashboard.html` with D&D Beyond badge, import wizard, character gallery grid cards, empty-state illustration | M2 | ORIGINAL_REQUEST §R2.2 |
| 7 | Session Dashboard Overhaul | Redesign `session-dashboard.html` with room search bar, 3 KPI metric cards, formula bar chart, gilded roll history table, CSV export | M2 | ORIGINAL_REQUEST §R2.3 |
| 8 | VTT 3-Column Workstation | Redesign `vtt.html` layout: Left (Char import + quick stats), Center (Map canvas + controls), Right (Dice tray + OBS + Log) | M3 | ORIGINAL_REQUEST §R2.4 |
| 9 | Tactical Battle Map Canvas | 12x12 grid canvas with gold coordinate lines, token drag-and-drop, token removal, background map URL switcher | M3 | ORIGINAL_REQUEST §R2.4, §R3 |
| 10 | Interactive Dice Tray & Log | Polyhedral dice buttons (d4-d100), dice pool builder, modifier input, custom formula parser, real-time log feeds | M3 | ORIGINAL_REQUEST §R2.4, §R3 |
| 11 | OBS Stream Overlay Overhaul | Redesign `overlay.html` for broadcast transparency, gold/obsidian roll cards, Nat 20 / Nat 1 visual cues, auto-hide animations | M4 | ORIGINAL_REQUEST §R2.5 |
| 12 | OBS Overlay Settings Panel | Redesign `overlay-settings.html` with position/animation/size dropdowns, auto-hide range slider, formula toggles, test rolls | M4 | ORIGINAL_REQUEST §R2.5 |
| 13 | Full Character Sheet View | Redesign `character-view.html` with 8 tabs, interactive HP calculator (damage/heal/temp), Hit Dice, Short/Long rest | M5 | ORIGINAL_REQUEST §R2.6, §R3 |
| 14 | Character Mechanics & Senses | Ability score modifiers, saving throws with prof dots, passive perception/insight/investigation, actions/spells | M5 | ORIGINAL_REQUEST §R2.6, §R3 |
| 15 | Inventory & Weight Tracker | Carrying capacity calculation (STR x 15), weight progress bar, category filters, item equip toggles | M5 | ORIGINAL_REQUEST §R2.6 |
| 16 | Comprehensive Backend Blueprint | Create `docs/BACKEND_RECOMMENDATIONS.md` with REST API specs, WebSocket protocols, DB schemas, D&D Beyond sync, Serverless/Supabase guide | M6 | ORIGINAL_REQUEST §R4 |
| 17 | E2E Opaque-Box Test Suite | Build test infrastructure and automated test cases covering Tiers 1-4 across all features | E2E-Track | Dual-Track Requirement |
| 18 | Final E2E Test Pass & Hardening | Verify 100% passing E2E tests, pass unit test suite (`npm test`), build with 0 errors (`npm run build`), adversarial hardening | M7 | Acceptance Criteria |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Design System & Modular CSS | `public/styles/*.css`, design tokens, fonts, reusable components, responsive rules | none | IN_PROGRESS |
| M2 | Auth & Dashboards Overhaul | `public/login.html`, `public/register.html`, `public/dashboard.html`, `public/session-dashboard.html`, `public/index.html` | M1 | PLANNED |
| M3 | Virtual Tabletop Room | `public/vtt.html`, `public/app.js` (tactical map, dice tray, quick character sheet, log) | M1 | PLANNED |
| M4 | OBS Stream Overlay & Settings | `public/overlay.html`, `public/overlay-settings.html`, `public/overlay.js` | M1 | PLANNED |
| M5 | Character Sheet View | `public/character-view.html` (vitals, 8 tabs, modals, rest, inventory, spells) | M1 | PLANNED |
| M6 | Backend Blueprint Deliverable | `docs/BACKEND_RECOMMENDATIONS.md` (APIs, WebSockets, DB Schemas, Supabase/Vercel) | none | IN_PROGRESS |
| M7 | Final E2E Verification & Hardening | 100% E2E test pass (Phase 1), Adversarial Tier 5 coverage (Phase 2), `npm test`, `npm run build` | M1-M6, E2E-Track | PLANNED |
| E2E | E2E Testing Track | `tests/e2e/`, test runner, Tiers 1-4 test cases, publish `TEST_READY.md` | none | IN_PROGRESS |

## Interface Contracts

### Client-Server REST Contract (`/api/v2/*`)
- `POST /api/v2/auth/login` -> Request: `{ username, password }` -> Response: `{ token, username }`
- `POST /api/v2/auth/register` -> Request: `{ username, password }` -> Response: `{ success, message }`
- `GET /api/v2/character` -> Headers: `Authorization: Bearer <token>` -> Response: `Character[]`
- `POST /api/v2/character/import` -> Headers: `Authorization: Bearer <token>` -> Request: `{ characterId }` -> Response: `Character`
- `GET /api/v2/character/:id/sheet` -> Response: `Character`
- `PUT /api/v2/character/:id` -> Headers: `Authorization: Bearer <token>` -> Request: `{ hp, equipment, spellSlots, ... }` -> Response: `Character`
- `DELETE /api/v2/character/:id` -> Headers: `Authorization: Bearer <token>` -> Response: `{ success: true }`
- `GET /api/v2/rolls/:roomId` -> Response: `RollEvent[]`
- `GET /api/v2/rolls/:roomId/analytics` -> Response: `{ totalRolls, averageResult, criticalCount, formulas }`
- `GET /api/v2/sessions/:roomId/export.csv` -> Response: `text/csv` attachment

### Real-Time WebSocket Contract (`Socket.IO`)
- Client -> Server: `join-room(roomId)`, `update-map({roomId, mapUrl})`, `add-token({roomId, token})`, `move-token({roomId, tokenId, x, y})`, `remove-token({roomId, tokenId})`, `send-roll(RollEvent)`.
- Server -> Client: `room-state({mapUrl, tokens})`, `map-updated(mapUrl)`, `token-added(token)`, `token-moved({tokenId, x, y})`, `token-removed(tokenId)`, `new-roll(RollEvent)`, `character-updated(Character)`.

## Code Layout
- `public/styles/`:
  - `variables.css` — Design tokens, color palette, typography imports
  - `theme.css` — Dark obsidian theme rules and parchment light theme
  - `components.css` — Reusable cards, corner brackets, buttons, inputs, badges, modals, meters
  - `animations.css` — CSS keyframes, card transitions, dice animations
  - `responsive.css` — Responsive grid/flex helpers, media queries
- `public/`:
  - `login.html`, `register.html` — Authentication views
  - `dashboard.html`, `index.html` — User dashboard & character gallery
  - `session-dashboard.html` — Session telemetry, KPI cards, formula chart, roll log
  - `vtt.html`, `app.js` — Virtual Tabletop 3-column workstation & client logic
  - `overlay.html`, `overlay-settings.html`, `overlay.js` — OBS stream overlay & configuration
  - `character-view.html` — Full interactive D&D character sheet
- `docs/`:
  - `BACKEND_RECOMMENDATIONS.md` — Complete backend architecture blueprint & API specification
- `src/`:
  - Backend TypeScript server, routes, services, database models, and Vitest test suites.
- `tests/e2e/`:
  - Opaque-box E2E test suites (Tiers 1-4).
