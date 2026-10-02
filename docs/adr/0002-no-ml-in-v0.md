# ADR-0002: No ML in M0

## Context

The core problem is Visual Story Compression: selecting a small set of meaningful frames from thousands. ML-based approaches (embeddings, vision models, OCR) could theoretically produce better selections but add significant complexity.

## Decision

M0 uses only deterministic, classical algorithms: perceptual hashing (dHash/pHash), pixel difference, SSIM, and temporal segmentation heuristics. No ML, no external API calls, no model files.

## Alternatives

- CLIP embeddings for semantic frame comparison — deferred: adds model dependency, harder to run locally, overkill before baseline is proven
- OCR for text-change detection — deferred: complex, slow, privacy concern
- LLM frame ranking — deferred: expensive, requires network

## Consequences

- Story selector is fully local and deterministic
- Can run on any machine without GPU
- Results are reproducible (same input → same output)
- If classical approach fails to beat baseline B, we revisit ML before building Electron — not before
