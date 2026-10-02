# ADR-0005: FFmpeg for video rendering

## Context

Story moments (WebP frames + durations) must be assembled into an MP4 file. We need reliable, well-tested video encoding.

## Decision

FFmpeg via `child_process`. Input: image sequence + durations via concat demuxer or `-framerate` + `-t` per segment. Output: H.264, MP4, yuv420p, max 1080p, aspect ratio preserved.

## Alternatives

- fluent-ffmpeg npm wrapper — considered: adds abstraction over CLI, but the CLI is simple enough and the wrapper adds a dependency
- WebCodecs (browser/Electron renderer) — rejected: limited codec support, complex for multi-duration segments
- Native video libraries — rejected: packaging complexity, platform-specific

## Consequences

- FFmpeg binary must be present on the system (documented requirement)
- Renderer module is a thin wrapper around a child_process call
- FFmpeg errors surface as domain errors (`RenderFailedError`)
- No transitions, music, or effects in M0/MVP renderer
