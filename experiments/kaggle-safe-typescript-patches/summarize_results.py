"""Render downloaded Kaggle task runs as a compact Markdown report."""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def duration_seconds(result: dict[str, Any]) -> float:
    started = datetime.fromisoformat(result["started_at"].replace("Z", "+00:00"))
    finished = datetime.fromisoformat(result["finished_at"].replace("Z", "+00:00"))
    return (finished - started).total_seconds()


def collect_runs(results_dir: Path) -> list[dict[str, Any]]:
    runs: list[dict[str, Any]] = []
    for result_path in results_dir.rglob("*.result.json"):
        run_path = result_path.with_suffix("").with_suffix(".run.json")
        if not run_path.exists():
            continue
        result = read_json(result_path)
        run = read_json(run_path)
        score = result["verifier_result"]["rewards"]["score"]
        runs.append(
            {
                "model": result["agent_info"]["model_info"]["name"],
                "score": float(score),
                "duration": duration_seconds(result),
                "subruns": run.get("subruns", []),
            }
        )
    return sorted(runs, key=lambda item: item["model"])


def case_scores(subruns: list[dict[str, Any]]) -> dict[str, float]:
    scores: dict[str, float] = {}
    for subrun in subruns:
        results = subrun.get("results", [])
        if not results:
            continue
        result = results[0].get("dictResult", {})
        case_id = result.get("case_id")
        score = result.get("score")
        if isinstance(case_id, str) and isinstance(score, (int, float)):
            scores[case_id] = float(score)
    return scores


def markdown(runs: list[dict[str, Any]]) -> str:
    lines = ["# Benchmark results", "", "## Model scores", "", "| Model | Score | Runtime |", "| --- | ---: | ---: |"]
    for run in runs:
        lines.append(f"| {run['model']} | {run['score']:.3f} | {run['duration']:.1f}s |")

    per_case: dict[str, dict[str, float]] = defaultdict(dict)
    for run in runs:
        for case_id, score in case_scores(run["subruns"]).items():
            per_case[case_id][run["model"]] = score
    if not per_case:
        return "\n".join(lines) + "\n"

    models = [run["model"] for run in runs]
    lines.extend(["", "## Per-case score", "", f"| Case | {' | '.join(models)} |", f"| --- | {' | '.join(['---:' for _ in models])} |"])
    for case_id in sorted(per_case):
        row = [case_id]
        for model in models:
            score = per_case[case_id].get(model)
            row.append(f"{score:.3f}" if score is not None else "—")
        lines.append("| " + " | ".join(row) + " |")
    return "\n".join(lines) + "\n"


def main() -> None:
    directory = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("results")
    runs = collect_runs(directory)
    if not runs:
        raise SystemExit(f"No Kaggle result pairs found in {directory}")
    print(markdown(runs), end="")


if __name__ == "__main__":
    main()
