# Shelf Continue

Continue the current AgentOS Shelf task.

First run:

```bash
agentos-cli shelf workspace context
agentos-cli shelf task current --source
```

Then:

1. Identify the active task path.
2. Read the task's `prd.md` and `info.md` if present.
3. Read `implement.jsonl` and every referenced file.
4. Read relevant `.shelf/spec/` files before changing code.
5. Continue the implementation using the project's existing patterns.

If there is no active task, ask the user which task or project context to use instead of guessing.
