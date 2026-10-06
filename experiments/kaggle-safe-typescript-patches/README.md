# Safe TypeScript Change Review

This Kaggle Benchmark asks models to review small TypeScript changes from a
strict package-boundary architecture. A change can be functionally plausible
and still be rejected when it violates a local invariant.

The task returns the mean of three deterministic checks per case:

1. `decision` — approve or block;
2. `rule_id` — the exact violated invariant; approved changes must return `none`;
3. `evidence` — a non-empty explanation grounded in the diff.

The 13 fixtures are intentionally small and synthetic. They encode constraints
used by ProgressCut but are not copied from unreleased product work. Each
security or architecture rule has a closely related safe counterpart where
possible, including a path-prefix traversal trap.

## Local workflow

```bash
./.venv-kaggle/bin/python -m pip install -r requirements.txt
./.venv-kaggle/bin/python safe_typescript_patch_task.py
```

After downloading completed Kaggle runs, render a Markdown comparison table:

```bash
python3 summarize_results.py results > results/summary.md
```

Refresh the short-lived model proxy credentials before a run:

```bash
./.venv-kaggle/bin/kaggle benchmarks auth -y --env-file .env
```

Do not commit `.env`, virtual environments, or generated run files.
