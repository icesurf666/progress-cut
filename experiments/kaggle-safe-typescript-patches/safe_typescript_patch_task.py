# %%
"""Kaggle task: can a model spot unsafe-looking-safe TypeScript changes?"""

from dataclasses import dataclass
import os
from statistics import mean
from typing import Any

import kaggle_benchmarks as kbench
import pandas as pd


RULES = """Rule IDs:
- engine-no-node: engine code cannot import node built-ins or platform APIs.
- domain-no-runtime-deps: domain code cannot import runtime libraries.
- renderer-no-electron: renderer UI cannot import Electron directly.
- atomic-recovery-write: recovery metadata must use temporary-write then rename.
- exact-render-duration: rendered video must be capped at the computed story duration.
- safe-output-path: exported files must stay inside the configured output directory.
- none: no listed invariant is violated.
"""


CASES = [
    {
        "case_id": "engine-filesystem-import",
        "decision": "BLOCK",
        "rule_id": "engine-no-node",
        "change": """packages/engine/src/report/readConfig.ts\n+import { readFile } from 'node:fs/promises';\n+export async function readConfig(path: string) { return JSON.parse(await readFile(path, 'utf8')); }""",
    },
    {
        "case_id": "domain-zod-import",
        "decision": "BLOCK",
        "rule_id": "domain-no-runtime-deps",
        "change": """packages/domain/src/session/id.ts\n+import { z } from 'zod';\n+export const SessionIdSchema = z.string().uuid();""",
    },
    {
        "case_id": "renderer-electron-import",
        "decision": "BLOCK",
        "rule_id": "renderer-no-electron",
        "change": """apps/desktop/src/renderer/openExport.ts\n+import { shell } from 'electron';\n+export function openExport(path: string) { return shell.openPath(path); }""",
    },
    {
        "case_id": "non-atomic-manifest",
        "decision": "BLOCK",
        "rule_id": "atomic-recovery-write",
        "change": """apps/desktop/src/main/recovery/save.ts\n+export async function save(path: string, manifest: object) {\n+  await writeFile(path, JSON.stringify(manifest));\n+}""",
    },
    {
        "case_id": "uncapped-video-duration",
        "decision": "BLOCK",
        "rule_id": "exact-render-duration",
        "change": """packages/render/src/ffmpeg/FfmpegRenderer.ts\n+await runFfmpeg(['-i', concatPath, '-c:v', 'libx264', '-y', outputPath]);\n// Story moments have variable durations; no output cap is supplied.""",
    },
    {
        "case_id": "output-path-escapes-session",
        "decision": "BLOCK",
        "rule_id": "safe-output-path",
        "change": """apps/desktop/src/main/export/writeExport.ts\n+export async function writeExport(outputDir: string, requestedName: string, data: Buffer) {\n+  const destination = join(outputDir, requestedName);\n+  await writeFile(destination, data);\n+}""",
    },
    {
        "case_id": "output-prefix-confusion",
        "decision": "BLOCK",
        "rule_id": "safe-output-path",
        "change": """apps/desktop/src/main/export/writeExport.ts\n+const root = resolve(outputDir);\n+const destination = resolve(root, requestedName);\n+if (!destination.startsWith(root)) throw new Error('Invalid export path');\n+await writeFile(destination, data);\n+// /sessions/run-17-copy passes this prefix check for root /sessions/run-17.""",
    },
    {
        "case_id": "safe-renderer-adapter",
        "decision": "APPROVE",
        "rule_id": "none",
        "change": """apps/desktop/src/renderer/openExport.ts\n+import type { DesktopBridge } from '../shared/bridge.js';\n+export function openExport(bridge: DesktopBridge, path: string) {\n+  bridge.openFile(path);\n+}""",
    },
    {
        "case_id": "atomic-manifest",
        "decision": "APPROVE",
        "rule_id": "none",
        "change": """apps/desktop/src/main/recovery/save.ts\n+const temporary = `${path}.${randomUUID()}.tmp`;\n+await writeFile(temporary, JSON.stringify(manifest));\n+await rename(temporary, path);""",
    },
    {
        "case_id": "duration-capped-render",
        "decision": "APPROVE",
        "rule_id": "none",
        "change": """packages/render/src/ffmpeg/FfmpegRenderer.ts\n+await runFfmpeg(['-i', concatPath, '-t', String(story.totalDurationMs / 1000), '-y', outputPath]);""",
    },
    {
        "case_id": "safe-output-path",
        "decision": "APPROVE",
        "rule_id": "none",
        "change": """apps/desktop/src/main/export/writeExport.ts\n+const root = resolve(outputDir);\n+const destination = resolve(root, requestedName);\n+if (!destination.startsWith(`${root}${sep}`)) throw new Error('Invalid export path');\n+await writeFile(destination, data);""",
    },
    {
        "case_id": "pure-engine-function",
        "decision": "APPROVE",
        "rule_id": "none",
        "change": """packages/engine/src/duration/sumDurations.ts\n+export function sumDurations(durations: readonly number[]): number {\n+  return durations.reduce((total, duration) => total + duration, 0);\n+}""",
    },
    {
        "case_id": "domain-branded-id",
        "decision": "APPROVE",
        "rule_id": "none",
        "change": """packages/domain/src/session/id.ts\n+export type SessionId = string & { readonly __brand: 'SessionId' };\n+export function sessionId(value: string): SessionId { return value as SessionId; }""",
    },
]


@dataclass
class Review:
    decision: str
    rule_id: str
    evidence: str


def normalize(value: str) -> str:
    return value.strip().lower().replace("_", "-")


@kbench.task(name="safe-typescript-change-review", store_task=False)
def review_change(llm: Any, case_id: str, change: str, decision: str, rule_id: str) -> dict:
    prompt = f"""You are reviewing a proposed change in a strict TypeScript monorepo.
Tests may pass, but architecture invariants still matter. Return an APPROVE or BLOCK decision,
one rule ID, and a concise explanation that cites the relevant code. If you APPROVE,
set rule_id to `none` even when the change demonstrates compliance with a named rule.

{RULES}
Proposed change for {case_id}:
```ts
{change}
```"""
    review = llm.prompt(prompt, schema=Review)
    decision_ok = normalize(review.decision) == normalize(decision)
    rule_ok = normalize(review.rule_id) == normalize(rule_id)
    evidence_ok = len(review.evidence.strip()) >= 12
    return {
        "case_id": case_id,
        "score": (decision_ok + rule_ok + evidence_ok) / 3,
        "decision_ok": decision_ok,
        "rule_ok": rule_ok,
        "evidence_ok": evidence_ok,
        "model_decision": review.decision,
        "model_rule_id": review.rule_id,
    }


# %%
@kbench.task(name="safe-typescript-change-review-benchmark")
def safe_typescript_change_review(llm: Any, cases: list[dict[str, str]]) -> float:
    dataframe = pd.DataFrame(cases)
    with kbench.client.enable_cache():
        runs = review_change.evaluate(
            llm=[llm],
            evaluation_data=dataframe,
            n_jobs=1,
            timeout=120,
            max_attempts=1,
            remove_run_files=True,
        )
    scores = [run.result["score"] for run in runs if run.result]
    return float(mean(scores)) if scores else 0.0


# %%
limit = int(os.environ.get("CASE_LIMIT", "0"))
safe_typescript_change_review.run(kbench.llm, cases=CASES[:limit] if limit else CASES)
