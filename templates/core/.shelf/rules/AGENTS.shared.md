# Project AgentOS Shelf Rules

This project uses AgentOS Shelf as the shared source of truth for agent workflows.

## Source Of Truth

- Treat `.shelf/` as the maintained source.
- Treat `AGENTS.md`, `CLAUDE.md`, `.codex/`, and `.claude/` as generated platform projections.
- Do not copy rules from one platform projection into another. Regenerate projections from `.shelf/` instead.
- Keep reusable specs in `.shelf/spec/`, task context in `.shelf/tasks/`, and project memory in `.shelf/workspace/`.

## Workflow

- Read the project context before making non-trivial changes.
- Protect user work: inspect existing changes before editing files, and do not revert unrelated changes.
- Prefer existing project patterns over new abstractions.
- Keep changes scoped to the requested task.
- Run validation that matches the risk and affected surface.
- Persist reusable findings in project documentation when they should guide future work.

## Skill Loading

Load project skills by task:

- `agentos-project-context`: project discovery and conventions.
- `agentos-planning`: scope, non-goals, and acceptance checks.
- `agentos-implementation`: safe code changes.
- `agentos-verification`: tests and risk-based checks.
- `agentos-debugging`: bug investigation.
- `agentos-documentation`: durable project knowledge.

Framework-specific skills are deferred for now. Load them only after they are intentionally added to this project.
