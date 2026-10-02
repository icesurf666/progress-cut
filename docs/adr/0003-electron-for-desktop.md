# ADR-0003: Electron for desktop MVP

## Context

After M0 proves the algorithm, we need a cross-platform desktop shell. Options must support native screen capture, local file access, and background processing.

## Decision

Electron. Core story engine remains platform-independent (pure Node.js/TS). Electron provides the shell, IPC bridge, and initial capture provider. `nodeIntegration=false`, `contextIsolation=true`, `sandbox=true`.

## Alternatives

- Tauri (Rust backend) — considered: smaller binary, better memory, but requires Rust expertise and adds native compilation complexity at MVP stage
- Native macOS app (Swift) — rejected: Windows support too expensive to add later
- Web app — rejected: no access to screen capture APIs, no local-first

## Consequences

- Desktop MVP is macOS-first, Windows second
- All IPC is explicit and narrow; payloads are typed via `DesktopBridge` and validated with manual type guards
- Renderer has no direct Node access
- Core modules must never import `electron`
