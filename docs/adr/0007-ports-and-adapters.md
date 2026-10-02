# ADR-0007: Ports & Adapters for Capture and Render

## Context

Platform-specific code (Electron, FFmpeg, macOS screencapture) must not leak into the story engine or domain. We need to swap implementations (fixtures ↔ real adapters) without touching business logic.

## Decision

Each infrastructure concern defines a port (TypeScript interface) and ships adapters as separate files:

| Port              | Adapter                    |
| ----------------- | -------------------------- |
| `CaptureProvider` | `MacosCaptureProvider`     |
| `StoryRenderer`   | `FfmpegRenderer`           |

Adapters are instantiated in `apps/*` entry points. No service locator. No DI framework.

Session metadata (history) is stored as JSON directly in `apps/desktop/src/main/sessionHistory.ts` without a separate repository port — the storage concern is simple enough that a dedicated port would be premature abstraction.

## Alternatives

- `SessionRepository` port with `FileSystemRepository` adapter — removed: only ever had one implementation, never injected in tests, storage concern is desktop-specific and unlikely to need a swap
- DI framework (InversifyJS, tsyringe) — rejected: excessive for two ports with one adapter each

## Consequences

- `domain` and `engine` have zero runtime platform deps
- Tests inject fixture adapters — no mocking frameworks needed for boundaries
- Future `ScreenCaptureKitProvider`, `WindowsGraphicsCaptureProvider` slot in without algorithm changes
- `apps/desktop/src/main` owns platform wiring — no shared application layer needed
