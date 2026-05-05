> ## Documentation Index
> Fetch the complete documentation index at: https://docs.trytrellis.app/llms.txt
> Use this file to discover all available pages before exploring further.

# Appendix D: JSONL Configuration Format Reference

## Appendix D: JSONL Configuration Format Reference

<Note>
  JSONL entries should point at **spec files** (`.trellis/spec/**`) or the task's **research outputs** (`{TASK_DIR}/research/*.md`) — things the sub-agent needs to read *before* writing code (rules + background). Don't add raw source files or directories (`src/services/foo.ts`, `packages/<pkg>/`, etc.) — sub-agents already have `Read` / `Grep` and will fetch code when they need it. Injecting code into context just burns tokens.
</Note>

### File entry

```jsonl theme={null}
{"file": ".trellis/spec/backend/index.md", "reason": "Backend development guide"}
```

### Directory entry

```jsonl theme={null}
{"file": ".trellis/tasks/02-27-user-login/research/", "type": "directory", "reason": "Research outputs for this task"}
```

For directory entries, the hook reads all `.md` files in the directory, up to 20. Common use: point at the task's own `research/` directory so the sub-agent picks up any upstream investigations.

### Complete example (fullstack `implement.jsonl`)

```jsonl theme={null}
{"file": ".trellis/workflow.md", "reason": "Project workflow and conventions"}
{"file": ".trellis/spec/backend/index.md", "reason": "Backend development guide"}
{"file": ".trellis/spec/backend/api-module.md", "reason": "API module conventions"}
{"file": ".trellis/spec/backend/quality.md", "reason": "Code quality requirements"}
{"file": ".trellis/spec/frontend/index.md", "reason": "Frontend development guide"}
{"file": ".trellis/spec/frontend/components.md", "reason": "Component conventions"}
{"file": ".trellis/tasks/02-27-user-login/research/", "type": "directory", "reason": "Research outputs for this task"}
```

### JSONL files used by each sub-agent

| File              | Sub-agent           | Typical content                                                        |
| ----------------- | ------------------- | ---------------------------------------------------------------------- |
| `implement.jsonl` | `trellis-implement` | workflow + relevant spec indexes + task `research/` dir                |
| `check.jsonl`     | `trellis-check`     | quality-related specs + finish-work / check command specs              |
| `research.jsonl`  | `trellis-research`  | reference material for investigations (specs or external doc excerpts) |

***
