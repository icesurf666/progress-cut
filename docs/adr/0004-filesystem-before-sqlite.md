# ADR-0004: Filesystem + JSON instead of SQLite

## Context

Sessions produce candidate frames (WebP files) and metadata. We need durable, inspectable, crash-recoverable storage.

## Decision

Filesystem layout with JSON metadata files. Each session gets its own directory. No database dependency for M0 or desktop MVP.

```
sessions/
  <session-id>/
    meta.json
    candidates/
      <frame-id>.webp
    story.json        # written on completion
```

## Alternatives

- SQLite — deferred: adds native module dependency, packaging complexity, harder to inspect manually
- LevelDB / LMDB — rejected: overkill, binary formats harder to debug

## Consequences

- Sessions are human-readable and git-inspectable (minus binaries)
- Recovery is trivial: scan directory, read meta.json
- No migration scripts needed for M0/MVP
- Revisit SQLite if query patterns become complex
