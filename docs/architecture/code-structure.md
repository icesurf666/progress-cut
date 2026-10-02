# Code structure

Every maintained code, template, stylesheet, test and configuration file is limited to
200 physical lines, including comments and blank lines. Generated bundles, dependency
locks and installed dependencies are excluded. `pnpm check:lines` checks this boundary;
ESLint also enforces it for JavaScript and TypeScript.

## Desktop

- `src/shared`: bridge types, session events, export options and history records. This is
  the only definition of the contract between main, preload and renderer.
- `src/main/platform`: Electron window, tray, shortcuts and dependency discovery.
- `src/main/ipc`: session commands and workspace operations.
- `src/main/capture`: capture lifecycle and adaptive timing.
- `src/main/pipeline`: orchestration of analysis, rendering and format conversion.
- `src/renderer/views`: static screen templates, composed by `mountApplication`.
- `src/renderer/components`: reusable controls, activity chart, notifications and exports.
- `src/renderer/controllers`: feature behavior, initialized with explicit dependencies.
- `src/renderer/state`: session phase, metrics, exports and history conversion.
- `src/renderer/lib`: DOM access and display formatting.
- `src/renderer/styles`: styles grouped by feature. Import order preserves the cascade.

`renderer.ts` and `main/index.ts` are entry points. They compose features rather than
implementing them. HTML templates are bundled at build time; no runtime template loading
or framework is required. Runtime values enter the DOM through `textContent`, not HTML.

Controllers own their timers, requests and UI behavior. Session state contains data and
state transitions; it does not access Electron or the DOM. Main holds capture ownership
until capture and processing terminate. History navigation cannot replace a live session.

## Shared processing

`packages/engine` owns deduplication, novelty scoring, segmentation and selection.
CLI and desktop share `deduplicateFrames`, `scoreFrames`, `buildStory` and `buildFrameMap`.
Parallel analysis is bounded by the batch size; rolling comparison remains sequential
and compares against the previous retained frame. A zero hash is a valid reference.
Discarded proxies are released after each batch rather than retained for the full session.

Playback durations reserve a minimum before distributing the remaining budget by novelty.
This preserves the exact duration without making a final frame negative. Format conversion
belongs to `packages/render`; desktop reports only files actually exported.

## Verification

- `pnpm check`: file size, formatting, source and test types, lint and unit/integration tests.
- `pnpm test:desktop-ui`: actual Electron renderer with the production preload and controlled
  IPC responses. Covers capture setup, window/folder selection, independent format controls,
  session lifecycle, GIF history, re-render, failure recovery and compact layout. Screenshots
  are written to a temporary directory. This does not record the user's screen.

Add a module when it owns a separate responsibility, not merely to get under a line limit.
Keep algorithms in engine, platform effects in adapters and view behavior in controllers.
Tests are split by behavior and share image factories with isolated temporary directories.
