# ADR-0001: TypeScript as primary language

## Context

ProgressCut needs to run on Node.js (M0 CLI), Electron (desktop MVP), and potentially other runtimes. The team is small and the codebase must be maintainable long-term.

## Decision

TypeScript with strict mode (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). No `any`. Unknown external data enters as `unknown` and is validated with manual type guards at boundaries (IPC payloads, persisted JSON).

## Alternatives

- JavaScript — rejected: no type safety, harder to refactor
- Rust — rejected: unnecessary complexity for M0, no proven need for native performance yet
- Python — rejected: wrong runtime for Electron, poor desktop packaging story

## Consequences

- All modules must be TypeScript
- CI must run `tsc --noEmit`
- External inputs (JSON, IPC) validated at boundary
