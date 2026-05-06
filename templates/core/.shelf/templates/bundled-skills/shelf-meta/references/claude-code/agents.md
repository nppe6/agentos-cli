# Claude Code Agents

Current AgentOS Shelf projects generate three Claude Code agents:

- `.claude/agents/shelf-research.md`
- `.claude/agents/shelf-implement.md`
- `.claude/agents/shelf-check.md`

## Responsibilities

| Agent | Purpose |
| --- | --- |
| `shelf-research` | Investigate and write findings to the active task's `research/` directory. |
| `shelf-implement` | Read active task context and implement code. |
| `shelf-check` | Review changes, fix issues, and run verification. |

## Context Loading

The default Claude projection does not inject agent context through hooks. Implement/check agents must pull context themselves:

1. Run `python3 ./.shelf/scripts/task.py current --source`.
2. Read the active task's `prd.md` and `info.md`.
3. Read `implement.jsonl` or `check.jsonl`.
4. Read referenced spec and research files.

## Changing Agents

Edit `.claude/agents/shelf-*.md` for Claude-specific behavior. If Codex is also enabled, usually update the `.shelf/agents/` source and resync so Codex receives matching `.codex/agents/shelf-*.toml` files.

The default install does not include a dispatch agent or sub-agent context hook. Do not reference those files unless they exist as local customizations.
