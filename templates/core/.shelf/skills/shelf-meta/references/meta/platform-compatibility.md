# Platform Compatibility Reference

Current AgentOS Shelf CLI supports two generated platform projections:

- Codex
- Claude Code

Do not add documentation, settings, hooks, or path tables for another platform until the CLI has a concrete adapter and tests for that platform.

## Current Projection Matrix

| Capability | Codex | Claude Code |
| --- | --- | --- |
| Root entry file | `AGENTS.md` | `CLAUDE.md` |
| Shared skills | `.agents/skills/shelf-*` | `.claude/skills/shelf-*` |
| Agents | `.codex/agents/shelf-*.toml` | `.claude/agents/shelf-*.md` |
| User entry points | `.agents/skills/shelf-continue/`, `.agents/skills/shelf-finish-work/` | `.claude/commands/shelf/*.md` |
| Hook behavior | SessionStart plus UserPromptSubmit hooks when Codex hooks are enabled globally | Lightweight `SessionStart` reminder |
| Context loading | Hook breadcrumbs plus agent/skill pull | Agent/command pull plus startup reminder |

## Context Loading Model

Both current platforms should read Shelf context from files:

1. `agentos-cli shelf workspace context`
2. `agentos-cli shelf task current --source`
3. The active task's `prd.md` and `info.md`
4. `implement.jsonl` or `check.jsonl`
5. Spec/research files referenced by JSONL rows

Implementation and check agents must keep this read order explicit in their agent definitions.

## What Is Not Currently Installed

The default CLI does not install:

- other platform projections beyond Codex and Claude Code.
- Claude sub-agent context injection hooks.
- Quality-loop hooks or worktree orchestration.

If a user project has any of those directories, treat them as custom local files and inspect them directly before changing behavior.

## Adding A Future Platform

Add one platform at a time:

1. Extend the platform registry with capability flags.
2. Add a tool metadata file under `templates/tools/<platform>/`.
3. Add concrete projection templates.
4. Update `shelf-meta` platform tables for that platform only.
5. Add init/sync/update/doctor tests.

Keep `.shelf/` as the source of truth; platform files remain projections.
