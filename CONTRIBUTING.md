# Contributing to ProgressCut

## Requirements

- macOS (screen capture only works on macOS)
- Node.js 22+
- pnpm 9+ — `npm i -g pnpm`
- FFmpeg — `brew install ffmpeg`

## Setup

```bash
git clone https://github.com/icesurf666/progress-cut
cd progress-cut
pnpm install
pnpm desktop        # build + launch
```

## Project structure

```
apps/desktop/       Electron app
  src/main/         Main process — capture, pipeline, IPC
  src/renderer/     Renderer — UI, state, controllers
  src/preload/      contextBridge API surface
  src/shared/       Types shared across main/renderer boundary

apps/cli/           Batch A/B/C pipeline comparison tool

packages/
  domain/           Core types — zero external deps
  engine/           Algorithms — dedupe, novelty, story selection
  capture/          macOS screencapture adapter
  render/           FFmpeg renderer
```

## Development workflow

```bash
pnpm typecheck      # type check all packages
pnpm test           # 187 tests
pnpm lint           # eslint
pnpm check          # full suite: typecheck + format + lint + test + line-length
```

## Code rules

- **200 lines max per file** — enforced by `pnpm check:lines` and eslint `max-lines`
- **No comments that explain what the code does** — only WHY when it's non-obvious
- **No unused code** — dead exports are removed, not kept "for later"
- Architecture: **Ports & Adapters** — `engine` and `domain` have zero platform deps; enforced by ESLint import rules

## Adding a field to `HistoryEntry`

History is persisted to `~/Library/Application Support/ProgressCut/history.json`.
Adding a field requires a migration entry in `sessionHistory.ts → migrateEntry` so existing entries get a safe default instead of crashing.

```ts
// 1. Add field to HistoryEntry in src/shared/history.ts
newField: string;

// 2. Add default in migrateEntry in src/main/sessionHistory.ts
newField: typeof r['newField'] === 'string' ? r['newField'] : '',

// 3. Bump HISTORY_VERSION if the migration is destructive
```

## Tests

Tests live next to the source in `packages/*/tests/` and `apps/desktop/tests/`.
Run a single file: `pnpm vitest run packages/engine/tests/dedupe/deduplicateFrames.test.ts`

Real integration tests where possible — no mocking of the filesystem or image processing.

## Pull requests

- One concern per PR
- Tests for new behaviour
- `pnpm check` must pass
