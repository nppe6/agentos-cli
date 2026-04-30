# AgentOS Shelf

`.shelf/` is the shared source of truth for agent rules, workflow skills, specs, task context, and lightweight project memory.

Platform-specific files such as `AGENTS.md`, `CLAUDE.md`, `.codex/`, and `.claude/` are generated projections.

## Structure

- `spec/`: durable product and technical specs that should be injected as relevant context.
- `tasks/`: task-scoped PRDs, implementation notes, review context, and state.
- `workspace/`: project memory such as journal notes and reusable working context.
- `skills/`: portable workflow skills projected into AI coding platforms.
- `rules/`: shared agent instructions.
- `templates/`: platform-specific entry file templates.
