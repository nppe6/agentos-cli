<!-- SHELF:START -->
# AgentOS Shelf Instructions

These instructions are for AI assistants working in this project.

This project is managed by AgentOS Shelf. The working knowledge you need lives under `.shelf/`:

- `.shelf/workflow.md`: development phases, when to create tasks, skill routing.
- `.shelf/spec/`: package- and layer-scoped coding guidelines; read relevant specs before writing code.
- `.shelf/workspace/`: per-developer journals and session traces.
- `.shelf/tasks/`: active and archived tasks, PRDs, research, and JSONL context.
- `.shelf/skills/`: reusable Shelf workflow skills.
- `.shelf/agents/`: optional project-scoped implement, check, and research agents.

If an Shelf command or skill is available on your platform, prefer it over manual steps. Not every platform exposes every command.

## Subagents

- Always wait for all subagents to complete before yielding.
- Spawn subagents automatically when work is parallelizable, long-running, blocking, or benefits from isolation.

Managed by AgentOS Shelf. Edits outside this block are preserved; edits inside may be overwritten by a future AgentOS update.

<!-- SHELF:END -->
