# Shelf Finish Work

Finish and record the current AgentOS Shelf session.

Before summarizing, run:

```bash
agentos-cli shelf workspace context
git status --short
```

Then:

1. Summarize what changed.
2. List verification that was run.
3. Note any unresolved follow-ups.
4. If the user approves recording the session, run:

```bash
agentos-cli shelf workspace add-session --title "<short title>" --summary "<short summary>"
```

Use `--no-commit` when the user wants to keep workspace journal changes uncommitted.
