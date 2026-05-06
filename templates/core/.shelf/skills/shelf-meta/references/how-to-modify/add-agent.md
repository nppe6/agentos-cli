# How To: Add Agent

Add a project-local agent type such as `my-agent`.

**Current platforms**: Claude Code and Codex.

---

## Files to Modify

| File | Action | Required |
|------|--------|----------|
| `.claude/agents/my-agent.md` | Create if Claude is enabled | Yes for Claude |
| `.codex/agents/my-agent.toml` | Create if Codex is enabled | Yes for Codex |
| `.shelf/workflow.md` | Update routing if this agent becomes part of the normal flow | Sometimes |
| `.shelf/scripts/common/task_store.py` | Update only if new tasks should seed a new JSONL file | Sometimes |
| `shelf-local/SKILL.md` or project-local notes | Document | Recommended |

---

## Step 1: Create Agent Definition

Create the agent in each enabled platform directory. Keep the name and responsibility the same across platforms.

```markdown
---
name: my-agent
description: |
  What this agent specializes in.
tools: read, bash, edit, write, grep, find, ls
---

# My Agent

## Required Shelf Context

1. Run `python3 ./.shelf/scripts/task.py current --source`.
2. Read the active task's `prd.md` and `info.md` if present.
3. Read the JSONL file this agent uses.
4. Read every referenced spec or research file before acting.

## Core Responsibilities

1. Primary responsibility.
2. Secondary responsibility.

## Forbidden Operations

- `git commit`, unless explicitly allowed.

## Output Format

What the agent should produce.
```

---

## Step 2: Decide Context File

Reuse `implement.jsonl` or `check.jsonl` when the new agent is part of implementation or review. Create a new JSONL file only when the agent needs a genuinely separate context set.

Example:

```jsonl
{"file": ".shelf/spec/guides/index.md", "reason": "Thinking guides"}
```

If every new task should seed this file, update the task creation code in `.shelf/scripts/common/task_store.py`.

---

## Step 3: Add To Workflow Optional

If the agent should become part of the standard workflow, update `.shelf/workflow.md`:

- Add the new routing step in the relevant phase.
- Add or update the matching `[workflow-state:STATUS]` block.
- Update any common command or platform command text that resumes the workflow.

Do not reference `dispatch.md` or sub-agent context hooks unless those files actually exist in the project. Current default Shelf agents use pull-based context loading from the agent file.

---

## Step 4: Document Locally

Record the customization in a project-local skill or note:

```markdown
## Agents

### my-agent
- **Files**: `.claude/agents/my-agent.md`, `.codex/agents/my-agent.toml`
- **Purpose**: What it does
- **Context**: Which JSONL file it reads
- **Reason**: Why it was added
```

---

## Testing

1. Create or choose a task with the expected JSONL entries.
2. Set it as current: `python3 ./.shelf/scripts/task.py start <task-dir>`.
3. Invoke the new agent from the target platform.
4. Verify it reads the active task and referenced files before acting.

---

## Checklist

- [ ] Agent definition created for each enabled platform.
- [ ] Context read order is explicit.
- [ ] Workflow routing updated if needed.
- [ ] Task JSONL seeding updated if needed.
- [ ] Local customization documented.
- [ ] Agent tested in the target platform.
