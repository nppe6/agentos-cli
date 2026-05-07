# Claude Code Projection

AgentOS Shelf currently installs a Claude Code projection that follows the shared `.shelf/` workflow while keeping Claude-specific files under `.claude/`.

## Generated Files

| Path | Purpose |
| --- | --- |
| `AGENTS.md` | Shared root rules entry that Claude Code reads alongside `.claude/`. |
| `.claude/skills/shelf-*` | Claude-local copies of Shelf skills. |
| `.claude/agents/shelf-*.md` | Research, implement, and check agent definitions. |
| `.claude/commands/shelf/continue.md` | Continue entry point. |
| `.claude/commands/shelf/finish-work.md` | Finish-work entry point. |
| `.claude/settings.json` | Registers the session-start hook. |
| `.claude/hooks/shelf-session-start.py` | Prints a short reminder to read Shelf context. |
| `.claude/hooks/shelf-inject-workflow-state.py` | Emits a per-turn workflow-state breadcrumb from `.shelf/workflow.md`. |

## Context Loading

The default install does not inject PRD/spec content into sub-agent prompts through hooks. Claude agents should pull context themselves:

1. Run `python3 ./.shelf/scripts/task.py current --source`.
2. Read the active task's `prd.md` and `info.md`.
3. Read `implement.jsonl` or `check.jsonl`.
4. Read referenced spec and research files.

## Not Installed By Default

- sub-agent context injection hooks
- quality-loop hook
- worktree orchestration
- dispatch agent

If a user project has those files, they are custom local additions. Inspect them directly before editing.
