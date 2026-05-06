# Start Session

Initialize an AgentOS Shelf development session. This platform can load workflow context through agents and hooks, so a dedicated user-facing `start` entry is usually unnecessary. Follow these steps only when you need to reconstruct the session state manually.

---

## Step 1: Current state

Identity, git status, current task, active tasks, journal location.

```bash
{{PYTHON_CMD}} ./.shelf/scripts/get_context.py
```

## Step 2: Workflow overview

Phase Index + skill routing table + DO-NOT-skip rules.

```bash
{{PYTHON_CMD}} ./.shelf/scripts/get_context.py --mode phase
```

Full guide in `.shelf/workflow.md` (read on demand).

## Step 3: Guideline indexes

Discover packages + spec layers, then read each relevant index file.

```bash
{{PYTHON_CMD}} ./.shelf/scripts/get_context.py --mode packages
cat .shelf/spec/guides/index.md
cat .shelf/spec/<package>/<layer>/index.md   # for each relevant layer
```

Index files list the specific guideline docs to read when you actually start coding.

## Step 4: Decide next action

From Step 1 you know the current task. Check the task directory:

- **Active task + `prd.md` exists** -> load the current phase detail:
  ```bash
  {{PYTHON_CMD}} ./.shelf/scripts/get_context.py --mode phase --step 2.1 --platform {{CLI_FLAG}}
  ```
- **Active task + no `prd.md`** -> Phase 1.1. Load the `shelf-brainstorm` skill.
- **No active task** -> when the user describes multi-step work, load the `shelf-brainstorm` skill to clarify requirements, then create a task via `task.py create`. For simple one-off questions or trivial edits, skip this and just answer directly -- no task needed.

---

## Skill routing (quick reference)

| User intent | Skill |
|---|---|
| New feature / unclear requirements | `shelf-brainstorm` |
| About to write code | `shelf-before-dev` |
| Done coding / quality check | `shelf-check` |
| Stuck / fixed same bug multiple times | `shelf-break-loop` |
| Learned something worth capturing | `shelf-update-spec` |

Full rules and anti-rationalization guidance live in `.shelf/workflow.md`.
