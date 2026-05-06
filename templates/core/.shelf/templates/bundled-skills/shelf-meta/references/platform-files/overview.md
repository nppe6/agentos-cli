# Platform Files Overview

AgentOS Shelf connects the same local architecture to different AI tools. `.shelf/` stores the shared runtime; platform directories store adapter files that define how each AI tool enters AgentOS Shelf.

When a local AI modifies AgentOS Shelf, it should distinguish two file categories first:

- **Shared files**: `.shelf/workflow.md`, `.shelf/tasks/`, `.shelf/spec/`, `.shelf/scripts/`.
- **Platform files**: `.claude/` and `.codex/` in the current CLI. Add another platform only when the CLI has a concrete adapter and generated file set for it.

Platform files do not store business state. They let the corresponding AI tool read AgentOS Shelf state, call AgentOS Shelf scripts, and load AgentOS Shelf skills/agents/hooks.

## Platform File Categories

| Category | Common paths | Purpose |
| --- | --- | --- |
| settings/config | `.claude/settings.json` | Registers Claude Code hook behavior. |
| hooks | `.claude/hooks/` | Lightweight Claude Code session-start reminder. |
| agents | `.claude/agents/`, `.codex/agents/` | Define `shelf-research`, `shelf-implement`, and `shelf-check`. |
| skills | `.claude/skills/`, `.agents/skills/` | Capability descriptions that auto-trigger or can be read on demand. |
| commands/skill projections | `.claude/commands/shelf/`, `.agents/skills/shelf-continue/`, `.agents/skills/shelf-finish-work/` | Entry points explicitly invoked by the user or projected into Codex-readable shared skills. |

## Three Platform Integration Modes

### 1. Hook / Extension Driven

Claude Code can trigger scripts on specific events. Current Shelf installs only a lightweight session-start reminder hook.

Common capabilities:

- session-start reminder that points the AI at `AGENTS.md` and `.shelf/workflow.md`.

To change Claude startup behavior, inspect `.claude/settings.json` and `.claude/hooks/`.

### 2. Agent Prelude / Pull-Based

Codex and Claude agent files instruct the agent to read the active task, PRD, and JSONL context after startup.

To change how sub-agents load context, inspect the agent files themselves.

## Local Modification Order

When the user asks to customize behavior for a platform, the AI should inspect files in this order:

1. Read `.shelf/workflow.md` to confirm the shared flow.
2. Read the target platform's settings/config to see which hooks/agents/skills/commands are registered.
3. Read the target platform's agents/skills/commands/hooks.
4. Modify the local file closest to the user's need.
5. If the change affects the shared flow, synchronize `.shelf/workflow.md` or `.shelf/spec/`.

Do not modify only platform files and forget the shared workflow. Do not modify only `.shelf/workflow.md` and forget that platform entry points may still contain old descriptions.
