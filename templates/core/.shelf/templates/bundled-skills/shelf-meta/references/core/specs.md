# Spec System

`.shelf/spec/` stores durable project conventions that agents must read before implementation and checking.

## Default Shape

```text
.shelf/spec/
├── backend/
├── frontend/
└── guides/
```

Monorepo projects can also use package-specific specs:

```text
.shelf/spec/packages/<package-id>/
├── README.md
├── architecture.md
└── quality.md
```

## What Belongs In Specs

- Current project patterns discovered from real files.
- Verification commands and quality expectations.
- API, UI, data, error-handling, and test conventions.
- Good/bad examples when they help future agents avoid drift.

Do not fill specs with generic best practices that the repository does not actually follow.

## JSONL Context

Task context files reference specs with one JSON object per line:

```jsonl
{"file": ".shelf/spec/frontend/index.md", "reason": "Frontend conventions"}
{"file": ".shelf/spec/guides/code-reuse-thinking-guide.md", "reason": "Reuse guidance"}
```

`implement.jsonl` is for implementation context. `check.jsonl` is for review and verification context.

## Creating New Specs

1. Choose the smallest relevant category.
2. Create the spec file under `.shelf/spec/`.
3. Update the nearest `index.md`.
4. Add the spec to relevant task JSONL files.
5. Prefer concrete examples from the current codebase.
