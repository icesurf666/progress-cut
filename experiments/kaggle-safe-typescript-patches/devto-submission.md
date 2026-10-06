---
title: "Green Tests, Broken Architecture: I Asked Four Models to Review TypeScript Diffs"
published: false
description: "Four models reviewed 13 small TypeScript changes that could pass functional tests while violating architecture, recovery or filesystem invariants."
tags: kagglechallenge, devchallenge, ai, typescript
cover_image: https://www.pkazantsev.com/writing/architecture-review-benchmark/hero.png
canonical_url: https://www.pkazantsev.com/writing/architecture-aware-code-review-benchmark/
---

*This is a submission for the [Kaggle Benchmarking Challenge](https://dev.to/challenges/kaggle-2026-09-23)*

In ProgressCut, it is possible to write a change that works, passes a narrow test, and still violates a boundary I care about. A renderer can reach for Electron directly. A recovery record can be overwritten halfway through a write. An exported filename can escape its session folder.

Those are review problems, not autocomplete problems. I made a small benchmark to see how four models handle explicit TypeScript architecture rules when the diff is short enough to inspect by hand.

![Four language models review 13 TypeScript changes against six architecture invariants](https://www.pkazantsev.com/writing/architecture-review-benchmark/hero.png)

## What I benchmarked

Safe TypeScript Change Review is a public Kaggle task with 13 compact synthetic diffs. Seven should be blocked; six should be approved. They are derived from the shape of a local-first Electron app, but do not include screenshots, sessions, or unreleased product code.

Every model gets the same diff and these six explicit rules:

1. Algorithm code cannot import Node or platform APIs.
2. Domain types cannot import runtime libraries.
3. Renderer UI cannot import Electron directly; it uses a narrow bridge.
4. Recovery metadata must write a temporary file, then rename it.
5. FFmpeg output must be capped at the computed story duration.
6. Exported files must remain inside the configured output directory.

The approval cases are deliberately close to the violations. A typed `DesktopBridge` call is fine in the renderer; a direct Electron import is not. A separator-bounded `resolve()` check is fine; `join(outputDir, requestedName)` is not.

Each case has three deterministic checks:

```text
case score = (correct verdict + correct violated rule + grounded evidence) / 3
benchmark score = mean(case scores)
```

The evaluator is not another LLM. It checks the structured response against the known decision and rule for each case.

## Models tested

I picked four current models with different providers and operating profiles:

| Model | Why include it |
| --- | --- |
| Gemini 3.7 Flash | General-purpose fast model |
| Claude Sonnet 5 | Strong proprietary coding baseline |
| GPT-5.4 mini | Fast OpenAI model |
| Qwen3 Coder 480B | Coder-focused open-weight model |

Each model got one run of the published task. Thirteen hand-written cases and one run per model are far too little for a universal ranking; this is a failure-mode probe.

## Findings

![Model scores and the different cases they missed](https://www.pkazantsev.com/writing/architecture-review-benchmark/failure-map.png)

| Model | Score | Server runtime |
| --- | ---: | ---: |
| Gemini 3.7 Flash | 1.000 | 10m 48s |
| Claude Sonnet 5 | 0.949 | 32.9s |
| GPT-5.4 mini | 0.949 | 14.2s |
| Qwen3 Coder 480B | 0.949 | 3m 29s |

I had no baseline for whether 0.95 is good or bad, so the number alone told me little. With 13 cases, one third-point miss is the whole gap. The failures were more informative than the scores.

The three `0.949` scores have the same arithmetic: twelve full points and one third-point case. They do not mean the same thing in practice.

- Claude Sonnet 5 blocked a direct Electron import, then returned `placeholder` for both the rule and evidence. The run cannot tell me whether that came from the model or its structured-output path. Either way, an automated gate needs schema validation and a retry path.
- GPT-5.4 mini rejected a safe path-boundary guard. The guard rejects an export to the directory itself; that may be inconvenient, but it is not a traversal. This is a false positive caused by treating a stricter policy as a vulnerability.
- Qwen3 Coder 480B treated a typed IPC bridge as though the renderer had imported Electron. The bridge exists precisely to keep Electron out of the renderer bundle.

Gemini's perfect score is a result on 13 hand-written cases. It is not evidence that Gemini is generally the best code reviewer. This task has one repository style, no tool use, no multi-file reasoning, one run per model, and no variance estimate.

What I would actually ship is a review pipeline with separate checks for the policy verdict, the structured response, the cited evidence and deterministic validation.

If the response is malformed, the policy decision is not accepted. If the rule has a deterministic check, the deterministic check wins. The model reviews, and the deterministic check has the final say.

## My benchmark

The public benchmark leaderboard is here: [Architecture-Aware TypeScript Code Review](https://www.kaggle.com/benchmarks/pavelkazantsev7776/architecture-aware-typescript-code-review/versions/1).

The underlying public task is [Safe TypeScript Change Review](https://www.kaggle.com/benchmarks/tasks/pavelkazantsev7776/safe-typescript-change-review-benchmark/1).

The benchmark source and a local Markdown report generator are open source in the [ProgressCut repository](https://github.com/icesurf666/progress-cut/tree/main/experiments/kaggle-safe-typescript-patches).
