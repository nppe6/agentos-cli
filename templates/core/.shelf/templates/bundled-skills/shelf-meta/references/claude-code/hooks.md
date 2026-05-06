# Claude Code Hooks

Current AgentOS Shelf installs one Claude Code hook:

```text
.claude/settings.json
.claude/hooks/shelf-session-start.py
```

The hook prints a short reminder when a Claude Code session starts. It does not mutate task state and does not inject sub-agent context.

## Modify The Reminder

Edit `.claude/hooks/shelf-session-start.py` when the project needs a different startup reminder.

Keep durable workflow rules in `.shelf/workflow.md` or `.shelf/spec/`; the hook should point to those files rather than duplicating long guidance.

## Test

```bash
python3 .claude/hooks/shelf-session-start.py
```

Then start a new Claude Code session and verify the reminder appears.

## Not Installed

The default Shelf projection does not install sub-agent context hooks, quality-loop hooks, or per-turn workflow-state hooks.
