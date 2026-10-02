# ADR-0006: pnpm workspace monorepo without Nx/Turborepo

## Context

ProgressCut has multiple real entry points sharing a common algorithmic core: Electron desktop, CLI comparison tool, future headless automation. A flat repo creates pressure to couple these layers.

Package manager: **pnpm**. Workspace config: `pnpm-workspace.yaml`.

## Decision

pnpm workspace. No Nx, Turborepo, or other orchestration tools.

```
packages/domain      — entities, value objects; zero external deps
packages/engine      — story compression algorithms; depends on domain + sharp
packages/capture     — CaptureProvider port + macOS adapter
packages/render      — StoryRenderer port + FFmpeg adapter
apps/cli             — batch A/B/C pipeline comparison tool
apps/desktop         — Electron shell; only place that may import electron
```

Dependency direction:

```
domain ← engine ← apps
domain ← capture / render ← apps
```

Enforced by ESLint `no-restricted-imports` per-package overrides (see `eslint.config.js`).

## Alternatives

- Monolith flat repo — rejected: multiple real entry points already exist; shared code would couple without explicit boundaries
- Nx/Turborepo — deferred: adds tooling complexity before it's needed; revisit if build times become a problem
- Separate git repos — rejected: too much friction; workspace references are simpler than published packages during development
- `contracts` / `storage` / `application` packages — removed: proved to be premature abstraction with no real consumers; logic collapsed into `engine` and `apps/desktop/src/main`

## Consequences

- `domain` imports nothing. Safe to import from any package.
- `engine` imports `domain` + `sharp` only. Never imports `capture`, `render`, or `electron`.
- `apps/desktop/main` is the only place that may import `electron`.
- Adding a new interface (`apps/headless`, `apps/web-viewer`) requires only a new `apps/*` entry — no core packages change.
