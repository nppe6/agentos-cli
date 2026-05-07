# Claude Code Hooks

Current AgentOS Shelf installs two Claude Code hooks:

```text
.claude/settings.json
.claude/hooks/shelf-session-start.py
.claude/hooks/shelf-inject-workflow-state.py
```

The default hooks do two things:

- `shelf-session-start.py` prints a short reminder when a Claude Code session starts.
- `shelf-inject-workflow-state.py` injects the current workflow-state breadcrumb parsed from `.shelf/workflow.md`.

They do not mutate task state and do not inject sub-agent context.

## Modify The Reminder

Edit:

- `.claude/hooks/shelf-session-start.py` for a different startup reminder
- `.claude/hooks/shelf-inject-workflow-state.py` only if the parser behavior itself must change

For most "what should Claude do next?" changes, edit the `[workflow-state:STATUS]` block in `.shelf/workflow.md` instead.

Keep durable workflow rules in `.shelf/workflow.md` or `.shelf/spec/`; the hook should point to those files rather than duplicating long guidance.

## Test

```bash
python3 .claude/hooks/shelf-session-start.py
python3 .claude/hooks/shelf-inject-workflow-state.py
```

Then start a new Claude Code session and verify the reminder appears.

## Not Installed

The default Shelf projection does not install sub-agent context hooks or quality-loop hooks.
