# Core Systems Overview

These systems are file-backed and shared by the current Codex and Claude Code projections.

## Core Systems

| System | Purpose | Files |
|--------|---------|-------|
| Workspace | Session tracking and journals | `.shelf/workspace/` |
| Tasks | Work item tracking | `.shelf/tasks/` |
| Specs | Project coding guidelines | `.shelf/spec/` |
| Commands/skill projections | Explicit entry points | `.claude/commands/`, `.agents/skills/shelf-continue/`, `.agents/skills/shelf-finish-work/` |
| Scripts | Runtime utilities | `.shelf/scripts/` |

## Why These Are Portable

All core systems are file-based:

- `.shelf/` is the durable source of truth.
- Codex and Claude Code receive platform-specific projections.
- Agents and prompts read task/spec/workspace files instead of relying on chat memory.

## Platform Usage

### Codex

Codex reads `AGENTS.md`, shared skills in `.agents/skills/`, and agents in `.codex/agents/`.

### Claude Code

Claude Code reads `AGENTS.md`, `.claude/skills/`, `.claude/agents/`, `.claude/commands/shelf/`, and the installed hooks.

## Documents In This Directory

| Document | Content |
|----------|---------|
| `files.md` | Files in `.shelf/` and generated platform directories |
| `workspace.md` | Workspace system, journals, developer identity |
| `tasks.md` | Task system, directories, JSONL context files |
| `specs.md` | Spec system and guideline organization |
| `scripts.md` | Core scripts |
