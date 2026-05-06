# Claude Code Projection

AgentOS Shelf currently installs a lightweight Claude Code projection. It is intentionally smaller than Trellis-style heavy hook automation.

## Generated Files

| Path | Purpose |
| --- | --- |
| `CLAUDE.md` | Thin entry file that points Claude Code to `AGENTS.md`. |
| `.claude/skills/shelf-*` | Claude-local copies of Shelf skills. |
| `.claude/agents/shelf-*.md` | Research, implement, and check agent definitions. |
| `.claude/commands/shelf/continue.md` | Continue entry point. |
| `.claude/commands/shelf/finish-work.md` | Finish-work entry point. |
| `.claude/settings.json` | Registers the session-start hook. |
| `.claude/hooks/shelf-session-start.py` | Prints a short reminder to read Shelf context. |

## Context Loading

The default install does not inject PRD/spec content into sub-agent prompts through hooks. Claude agents should pull context themselves:

1. Run `python3 ./.shelf/scripts/task.py current --source`.
2. Read the active task's `prd.md` and `info.md`.
3. Read `implement.jsonl` or `check.jsonl`.
4. Read referenced spec and research files.

## Not Installed By Default

- sub-agent context injection hooks
- per-turn workflow-state hook
- quality-loop hook
- worktree orchestration
- dispatch agent

If a user project has those files, they are custom local additions. Inspect them directly before editing.
