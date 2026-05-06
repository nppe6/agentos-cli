# Hooks And Settings

Hooks/settings are the entry layer that connects a platform to AgentOS Shelf. Current AgentOS Shelf CLI installs Claude Code and Codex session-start wiring, plus a Codex per-turn workflow-state hook. Implement/check agents still pull task context from `.shelf/tasks` before editing.

## Settings Responsibilities

settings/config files may register:

- session-start hook: injects a AgentOS Shelf overview when a new session starts or context resets.
- future workflow-state hooks.
- future shell/session bridges.

Common files:

| Platform | settings/config |
| --- | --- |
| Claude Code | `.claude/settings.json` |
| Codex | `.codex/config.toml` and `.codex/hooks.json` |

Whether these files exist in a project depends on which tools were selected with `agentos-cli shelf init --tools codex,claude`.

## Hook Script Types

| Script | Purpose |
| --- | --- |
| `.claude/hooks/shelf-session-start.py` | Prints a lightweight Claude Code reminder to read `AGENTS.md`, `.shelf/workflow.md`, and task context. |
| `.codex/hooks/shelf-session-start.py` | Emits Codex SessionStart context from `.shelf/scripts/get_context.py`. |
| `.codex/hooks/shelf-inject-workflow-state.py` | Emits a Codex UserPromptSubmit breadcrumb from `.shelf/workflow.md` and the active task. |

Not every platform has every hook. Do not copy files from another platform just because a platform lacks a hook; first confirm whether that platform supports the corresponding event.

## Local Change Scenarios

| User need | Edit location |
| --- | --- |
| AI should see more/less context in a new session | Platform `session-start` hook. |
| Per-turn hint policy should change | `[workflow-state:STATUS]` block in `.shelf/workflow.md`. The hook parses workflow.md verbatim 鈥?no script edit required. |
| Sub-agent cannot read PRD/spec | Agent read-order instructions in `shelf-implement` or `shelf-check`. |
| `task.py current` in shell has no active task | `SHELF_CONTEXT_ID` or the platform session identity available to shell commands. |
| Disable an automatic injection | The corresponding hook registration in settings/config. |

## Modification Principles

1. **Settings wire things up; hooks define behavior**. If only the hook changes, the platform may never call it. If only settings change, behavior may not change.
2. **Confirm platform event names first**. Different platforms use different names for SessionStart, UserPromptSubmit, AgentSpawn, shell execution, and similar events.
3. **Hooks read local `.shelf/`, not upstream source**. `.shelf/scripts/` and `.shelf/workflow.md` in the user project are the default targets.
4. **Errors must be visible**. Hook failures should tell the user what was not injected instead of silently leaving the AI without context.

## Troubleshooting Path

If the user says "AI did not read AgentOS Shelf state":

1. Check whether the platform settings/config register the hook.
2. Check whether the hook file exists.
3. Manually run the `.shelf/scripts/get_context.py` or `task.py current --source` command that the hook depends on.
4. Check whether active task state exists in `.shelf/.runtime/sessions/`.
5. Check whether the platform shell passes session identity.
