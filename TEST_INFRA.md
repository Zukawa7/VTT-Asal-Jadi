# E2E Test Infra: VTT Asal Jadi Dark Fantasy & Architecture

## Test Philosophy
- Opaque-box, requirement-driven. Derived strictly from `ORIGINAL_REQUEST.md`.
- No dependency on implementation internals; verifies views, API responses, DOM contracts, theme tokens, and backend document completeness.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial + Real-World Workload Testing.

## Feature Inventory & Test Coverage
| # | Feature | Requirement | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Cross-Feature) | Tier 4 (Real-World) |
|---|---------|-------------|:----------------:|:-----------------:|:---------------------:|:-------------------:|
| F1 | Dark Fantasy Design System & Tokens | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F2 | Typography & Component Styling | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| F3 | Authentication Views (Login/Register) | ORIGINAL_REQUEST §R2.1 | 5 | 5 | ✓ | ✓ |
| F4 | User Dashboard & Character Gallery | ORIGINAL_REQUEST §R2.2 | 5 | 5 | ✓ | ✓ |
| F5 | Session Dashboard & Telemetry | ORIGINAL_REQUEST §R2.3 | 5 | 5 | ✓ | ✓ |
| F6 | VTT 3-Column Workstation | ORIGINAL_REQUEST §R2.4 | 5 | 5 | ✓ | ✓ |
| F7 | Tactical Map Grid & Tokens | ORIGINAL_REQUEST §R2.4, §R3 | 5 | 5 | ✓ | ✓ |
| F8 | Dice Tray, Pool & Formula Parser | ORIGINAL_REQUEST §R2.4, §R3 | 5 | 5 | ✓ | ✓ |
| F9 | OBS Stream Overlay & Settings | ORIGINAL_REQUEST §R2.5 | 5 | 5 | ✓ | ✓ |
| F10 | Character Sheet View & Vitals | ORIGINAL_REQUEST §R2.6, §R3 | 5 | 5 | ✓ | ✓ |
| F11 | Character Tabs (8 sections) & Rest | ORIGINAL_REQUEST §R2.6, §R3 | 5 | 5 | ✓ | ✓ |
| F12 | Backend Recommendations Deliverable | ORIGINAL_REQUEST §R4 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Test Runner**: Node-based automated E2E test runner (`tests/e2e/runner.js` or `tests/e2e/e2e.test.ts` via Vitest / Playwright / Supertest).
- **Directory Layout**:
  - `tests/e2e/tier1_features.test.js` (Tier 1: >=60 feature test cases)
  - `tests/e2e/tier2_boundaries.test.js` (Tier 2: >=60 boundary & corner test cases)
  - `tests/e2e/tier3_combinations.test.js` (Tier 3: >=12 pairwise interaction test cases)
  - `tests/e2e/tier4_realworld.test.js` (Tier 4: >=6 real-world user workflows)
- **Pass/Fail Semantics**: All test suites must exit with code 0 and 100% assertions passing.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Player Registration -> Login -> Character Import -> Gallery Inspection | F1, F3, F4 | High |
| 2 | DM Creates Session -> Joins VTT -> Places Map -> Places Monster Tokens | F1, F5, F6, F7 | High |
| 3 | Combat Round: Player Rolls Attack -> Crit Nat 20 -> Broadcast to OBS Overlay | F6, F8, F9 | High |
| 4 | Character Sheet Damage & Heal: Takes 15 Dmg -> Overflows Temp HP -> Heals -> Short Rest | F10, F11 | High |
| 5 | Session Telemetry: 10 Rolls -> Live Analytics Calculation -> CSV Export Verification | F5, F8 | High |
| 6 | Comprehensive Backend Reference Audit: Validates all 5 mandatory sections in `docs/BACKEND_RECOMMENDATIONS.md` | F12 | High |

## Coverage Thresholds
- Tier 1: >=5 test cases per feature (12 features = >=60 test cases)
- Tier 2: >=5 test cases per feature (12 features = >=60 test cases)
- Tier 3: >=12 cross-feature pairwise interaction test cases
- Tier 4: >=6 realistic end-to-end user workflows
- **Total Minimum Test Cases**: >=138 test cases
