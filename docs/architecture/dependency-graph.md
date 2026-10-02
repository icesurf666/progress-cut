# Package Dependency Graph

## Allowed import directions

```
apps/cli ──────────────────────────────────────────────┐
apps/desktop ──────────────────────────────────────────┤
                                                        ↓
                                               @progresscut/application
                                                        │
                          ┌─────────────────────────────┤
                          ↓             ↓               ↓
               @progresscut/  @progresscut/  @progresscut/
                 capture        render         storage
                          │             │               │
                          └─────────────┴───────────────┘
                                        │ (ports only)
                          ┌─────────────┘
                          ↓
               @progresscut/engine
                          │
                          ↓
               @progresscut/domain        ← @progresscut/contracts
```

## Rules (enforced by ESLint)

| Package                 | May import                                                      |
| ----------------------- | --------------------------------------------------------------- |
| `domain`                | nothing (no @progresscut, no external runtime deps)             |
| `contracts`             | `domain` (types only), `zod`                                    |
| `engine`                | `domain`, `sharp`                                               |
| `capture`               | `domain`                                                        |
| `render`                | `domain`                                                        |
| `storage`               | `domain`                                                        |
| `application`           | `domain`, `contracts`, `engine`, `capture`, `render`, `storage` |
| `apps/cli`              | all packages                                                    |
| `apps/desktop/main`     | all packages + `electron`                                       |
| `apps/desktop/renderer` | `contracts`, `domain` (via contextBridge only)                  |

## Hard constraints

- `domain` has zero runtime dependencies. It can be imported anywhere.
- `engine` never imports `capture`, `render`, `storage`, or `application`.
- `application` never imports `electron` or `react` directly.
- Concrete adapters (`FixtureCaptureProvider`, `FFmpegRenderer`, `FileSystemRepository`) are wired in `apps/*`, not inside `application`.
- `contracts` Zod schemas describe the _interface boundary_ (IPC, commands, events). They do not replace domain types. Domain types flow inside the process; DTOs cross the IPC/serialization boundary.

## What Sharp does in engine

`engine` uses `sharp` for proxy creation (resize + grayscale) and image comparison math (pixel diff, hash computation). This is algorithm-level image math — not infrastructure. `sharp` is not a platform dep the way `electron` or `node:fs` is.
