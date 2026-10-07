---
title: "Green Tests, Wrong Boundary: Four Models Review TypeScript Diffs"
published: false
description: "I gave four models 13 deliberately small TypeScript diffs with explicit architectural rules. The useful result was not a winner; it was how differently the models failed."
tags: kagglechallenge, devchallenge, ai, typescript
cover_image: https://www.pkazantsev.com/writing/architecture-review-benchmark/hero.png
canonical_url: https://www.pkazantsev.com/writing/architecture-aware-code-review-benchmark/
---

*This is a submission for the [Kaggle Benchmarking Challenge](https://dev.to/challenges/kaggle-2026-09-23)*

In ProgressCut, the story-selection engine is not allowed to read files. It gets
data and returns data. Capture, persistence, Sharp, FFmpeg, and Electron live
outside it.

That rule sounds fussy until somebody adds a convenient `readFile()` helper to
the engine. The helper works. Its unit test passes. The engine now needs Node,
and a piece of code that used to run against fixtures or in a worker has gained
an I/O dependency.

I wanted to know whether current models catch that sort of change when the
repository rule is stated plainly. This is a small experiment: read one diff,
apply one of six rules, and return a structured verdict.

![Four language models review 13 TypeScript changes against six architecture invariants](https://www.pkazantsev.com/writing/architecture-review-benchmark/hero.png)

## What I benchmarked

The public task contains 13 synthetic, single-file diffs: seven should be
blocked and six should be approved. The rules came from real boundaries in an
Electron app, but the diffs contain no user data, screenshots, or product code.

| Rule | What it protects |
| --- | --- |
| `engine-no-node` | The algorithm stays independent of filesystem and platform I/O. |
| `domain-no-runtime-deps` | Domain types do not inherit a validation or framework runtime. |
| `renderer-no-electron` | Privileged native APIs stay behind the preload bridge. |
| `atomic-recovery-write` | A crash cannot replace recovery JSON with a partial write. |
| `exact-render-duration` | FFmpeg cannot silently add tail time to the selected story. |
| `safe-output-path` | An export name cannot escape its session directory. |

The approval cases matter as much as the blocking ones. A typed `DesktopBridge`
is allowed in the renderer; importing `electron` is not. A resolved child path
is allowed; a prefix-only path check is not.

This setup is easier than real review. The model gets the rule list, the
relevant file path, and a tiny diff. It does not need to search the repo, infer
an undocumented convention, or execute code. Treat the result as a test of
rule-following under a clean prompt, not as a ranking of general coding skill.

## Models tested

I ran the same published task once on four models:

| Model | Score | Server runtime |
| --- | ---: | ---: |
| Gemini 3.7 Flash | 1.000 | 10m 48s |
| Claude Sonnet 5 | 0.949 | 32.9s |
| GPT-5.4 mini | 0.949 | 14.2s |
| Qwen3 Coder 480B | 0.949 | 3m 29s |

The score is deliberately simple:

```text
case score = (correct decision + correct rule ID + explanation present) / 3
benchmark score = mean(case scores)
```

The third term is a weak check: v1 verifies that an explanation field is present
and non-trivial; it does **not** independently prove that the explanation cites
the diff correctly. That is a limitation, not a claim of grounded-reasoning
evaluation. A v2 should match each explanation to expected code tokens or use a
separate, auditable verifier.

## Findings

![Model scores and the different cases they missed](https://www.pkazantsev.com/writing/architecture-review-benchmark/failure-map.png)

I did not have a useful interpretation for `0.949` by itself. With 13 cases,
one third-point miss creates almost the entire gap. Looking at the failed output
was more useful than looking at the leaderboard.

**Claude Sonnet 5** blocked a direct Electron import, then returned this:

```json
{"decision":"BLOCK","rule_id":"placeholder","evidence":"placeholder"}
```

I cannot tell from one run whether that came from the model or the structured
output layer. It does show why a merge gate must reject malformed responses and
retry or escalate instead of treating a plausible top-level verdict as enough.

**GPT-5.4 mini** blocked a safe output-path guard. The guard rejects writing to
the output directory itself, which is stricter than necessary, but it does not
allow an export to escape. The model turned an inconvenient policy into a
security finding.

**Qwen3 Coder 480B** blocked a renderer function that calls a typed
`DesktopBridge`. Its explanation followed the bridge to Electron and called that
a direct Electron dependency. That is precisely the distinction the boundary is
meant to preserve: the renderer can request a narrow operation without receiving
the native API.

Gemini passed all 13 examples. That means it followed this prompt on this small
fixture set. It does not mean it will understand an unfamiliar architecture,
hold up on a multi-file PR, or replace tests and human review.

## What I would use in production

I would not put this benchmark in front of a merge button and call it safety.
The rules have different enforcement mechanisms:

```text
import boundary  → ESLint restriction
path containment → deterministic filesystem test
render duration  → ffprobe integration test
recovery write   → crash/restart test
model review     → second opinion and explanation
```

The model is useful when it draws attention to a boundary a reviewer might miss.
It should not be the only system that knows the boundary exists.

## My benchmark

The public leaderboard is [Architecture-Aware TypeScript Code Review](https://www.kaggle.com/benchmarks/pavelkazantsev7776/architecture-aware-typescript-code-review/versions/1). The underlying [Safe TypeScript Change Review task](https://www.kaggle.com/benchmarks/tasks/pavelkazantsev7776/safe-typescript-change-review-benchmark/1) is public too.

For the policy template, paired near-miss fixtures, and review contracts, use the open-source [Architecture Policy Kit](https://github.com/icesurf666/architecture-policy-kit). The task implementation and report generator remain in the [ProgressCut repository](https://github.com/icesurf666/progress-cut/tree/main/experiments/kaggle-safe-typescript-patches).
