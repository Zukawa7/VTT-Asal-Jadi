Coding Standards & Contribution Guide

Purpose

This short guide codifies the small, safe standards to follow when contributing to this repository. The focus is maintainability and low-risk changes.

Formatting & linting

- Prettier is the canonical formatter. Run `npm run format:all` before committing.
- ESLint rules are enforced via `npm run lint`. Fix issues before pushing.
- For JS files in `public/` the ESLint overrides allow browser globals; keep those files lean and prefer small modules.

TypeScript

- Server-side code in `src/` should be TypeScript-first. Add type definitions in `src/types/` and avoid `any` where possible.
- For client-side migration, add new TS files under `src/client/` and expose a small JS build artifact if needed for immediate compatibility.

Frontend structure

- Avoid large single-file HTML + inline JS. Prefer moving behavior into `public/js/*.js` modules.
- Keep pure DOM rendering separate from data normalization and business logic.

Testing

- Use Vitest for unit tests under `src/`.
- Tests must be deterministic and not depend on external network calls. Mock fetch responses for DnDBeyond payloads.

Pull request etiquette

- Create small, focused PRs (one logical change per PR).
- Include changelog entry in PR description summarizing what changed and how it was validated (type-check, lint, tests).
- Prefer feature branches named `feature/<short-desc>` or `fix/<short-desc>`.

Review checklist

- Type-check and lint pass locally
- Unit tests added/updated for logic changes
- No unrelated formatting changes in files not touched (Prettier is ok across repo but keep commits focused)
- Documentation (README or docs/) updated for significant changes

This guide is intentionally concise: prefer safe, incremental changes and keep the codebase easy to review.