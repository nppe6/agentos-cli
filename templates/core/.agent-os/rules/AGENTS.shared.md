# Project Agent OS Rules

This project uses Agent OS as the shared source of truth for agent workflows.

## Source Of Truth

- Treat `.agent-os/` as the maintained source.
- Treat `AGENTS.md`, `CLAUDE.md`, `.codex/`, and `.claude/` as generated platform projections.
- Do not copy rules from one platform projection into another. Regenerate projections from `.agent-os/` instead.

## Workflow

- Read the project context before making non-trivial changes.
- Protect user work: inspect existing changes before editing files, and do not revert unrelated changes.
- Prefer existing project patterns over new abstractions.
- Keep changes scoped to the requested task.
- Run validation that matches the risk and affected surface.
- Persist reusable findings in project documentation when they should guide future work.

## Skill Loading

Load project skills by task:

- `project-context`: project discovery and conventions.
- `planning`: scope, non-goals, and acceptance checks.
- `implementation`: safe code changes.
- `verification`: tests and risk-based checks.
- `debugging`: bug investigation.
- `documentation`: durable project knowledge.

Stack-specific skills are optional. Load them only when the task touches that stack.
