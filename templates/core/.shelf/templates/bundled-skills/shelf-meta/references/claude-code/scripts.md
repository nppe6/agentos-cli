# Claude Code Scripts

Current AgentOS Shelf installs only one Claude-specific script:

```text
.claude/hooks/shelf-session-start.py
```

It prints a short startup reminder. Shared runtime behavior lives under `.shelf/scripts/` and is used by both Codex and Claude Code through CLI wrappers and prompt/agent instructions.

## Shared Scripts To Know

| Script | Purpose |
| --- | --- |
| `.shelf/scripts/task.py` | Task lifecycle and active task commands. |
| `.shelf/scripts/get_context.py` | Workspace, package, and context summaries. |
| `.shelf/scripts/init_developer.py` | Developer identity setup. |
| `.shelf/scripts/add_session.py` | Workspace journal entry creation. |

The default install does not include Claude worktree orchestration scripts.
