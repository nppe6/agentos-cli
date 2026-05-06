# Change Local Hooks

Hooks are the automation layer that connects a platform to AgentOS Shelf. When the user wants to change "when context is injected," "how shell commands inherit a session," or "which files are read before an agent starts," hooks are usually the edit point.

## Read These Files First

1. Target platform settings/config, currently `.claude/settings.json` for Claude Code hooks
2. Target platform hooks directory, currently `.claude/hooks/`
3. `.shelf/scripts/common/active_task.py`
4. `.shelf/scripts/common/session_context.py`
5. `.shelf/workflow.md`

## Common Hook Types

| Hook | Purpose |
| --- | --- |
| session-start | Injects a AgentOS Shelf overview when a session starts, clears, or compacts. |
| future workflow-state | Would inject a state hint on each user input. Not installed by the current CLI. |
| agent pull | Current Codex/Claude agent files read PRD/spec/research after startup. |

## Modification Steps

1. Find the hook registration in settings/config.
2. Confirm the registered script path exists.
3. Read the hook script and identify inputs, outputs, and called `.shelf/scripts/`.
4. Modify hook behavior.
5. If the hook depends on workflow content, synchronize `.shelf/workflow.md`.

## Example: Change New-Session Injection Content

First find the session-start hook:

```text
.claude/settings.json
.claude/hooks/shelf-session-start.py
```

If the hook ultimately calls `.shelf/scripts/get_context.py` or `session_context.py`, editing the local script is usually more robust than hard-coding content in the hook.

## Example: Agent Did Not Read JSONL

First confirm:

```bash
python3 ./.shelf/scripts/task.py current --source
python3 ./.shelf/scripts/task.py validate <task>
```

If the task and JSONL are correct, edit the relevant `shelf-implement` or `shelf-check` agent file so its read-order instructions match the project.

## Notes

- Settings handle registration, hook scripts handle behavior; inspect both together.
- Different platforms support different hook events. Do not directly copy another platform's settings.
- Hooks should read project-local `.shelf/`; they should not depend on AgentOS Shelf upstream source paths.
- Hook failures should produce visible errors so AI does not silently lose context.
