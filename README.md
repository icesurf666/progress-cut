# ProgressCut

> Turn hours of coding into a one-minute build story. Automatically.

ProgressCut is a local-first macOS desktop app that captures your screen while you work and compresses the session into a short, shareable progress story — a GIF or MP4 that shows your actual progress without the noise.

**Core principle:** Record everything. Keep only what changed.

---

## How it works

1. **Capture** — screenshots every few seconds, adaptive rate (slows when idle, speeds up when active)
2. **Deduplicate** — removes visually identical frames using dHash + pixel diff
3. **Score** — ranks unique frames by structural novelty (tiled SSIM)
4. **Select** — stride sampling with novelty-peak picks guarantees temporal coverage
5. **Render** — FFmpeg assembles the story at your chosen target duration

All processing runs locally. No screenshots ever leave your machine.

## Requirements

- macOS (Screen Recording permission required on first launch)
- Node.js 22+
- pnpm 9+
- FFmpeg — `brew install ffmpeg`

## Quick start

```bash
pnpm install
pnpm desktop        # build and launch the app
```

## Development

```bash
pnpm typecheck      # type check all packages
pnpm test           # 187 tests
pnpm lint           # eslint
pnpm check          # typecheck + format + lint + test + line-length
pnpm bench          # dedup parallel benchmark
```

Build a distributable:

```bash
pnpm pack           # unpackaged .app (fast, for smoke testing)
pnpm dist           # .dmg
```

## Repository structure

```
apps/
  desktop/          # Electron app — main process, preload, renderer
  cli/              # Batch capture and A/B/C pipeline comparison tool

packages/
  domain/           # Core types: FrameObservation, Story, StoryMoment…
  engine/           # Algorithms: dedup, novelty scoring, story selection
  capture/          # macOS screencapture adapter
  render/           # FFmpeg renderer

bench/              # Performance benchmarks
docs/adr/           # Architecture Decision Records
```

Architecture follows **Ports & Adapters**: `engine` and `domain` have zero platform dependencies; `capture` and `render` implement their ports; `apps/desktop` wires everything together. Enforced by ESLint import rules.

## Privacy

All processing is local. No screenshots leave your machine. No account required. No telemetry.

## License

MIT — see [LICENSE](LICENSE).
