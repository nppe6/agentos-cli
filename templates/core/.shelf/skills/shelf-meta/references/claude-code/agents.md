# Agents Reference

Documentation for the AgentOS Shelf agent system - specialized AI agents for different development phases.

---

## Overview

AgentOS Shelf uses **specialized agents** for different tasks. Each agent has specific capabilities, restrictions, and context injection.

**Key Insight**: Agents work in the **current directory** - no worktree needed. Multi-Session (worktree isolation) is a separate concept.

---

## Agent Types

| Agent | Purpose | Can Write | Git Commit |
|-------|---------|-----------|------------|
| `dispatch` | Orchestrate phases | No | Only via script |
| `plan` | Evaluate requirements | Yes (task dir) | No |
| `research` | Find patterns | No | No |
| `implement` | Write code | Yes | No |
| `check` | Review & self-fix | Yes | No |
| `debug` | Fix issues | Yes | No |

---

## Agent Definitions

Location: `.claude/agents/*.md`

### Format

```markdown
---
name: agent-name
description: |
  What this agent does.
tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
---
# Agent Name

## Core Responsibilities
...

## Workflow
...

## Forbidden Operations
...
```

---

## Dispatch Agent

**File**: `.claude/agents/dispatch.md`

**Purpose**: Pure orchestrator - calls other agents in sequence.

**Key Principle**: Does NOT read specs directly. Hooks inject context to subagents.

**Tools**: `Read, Bash`

**Workflow**:
```
1. Run task.py current --source 鈫?find session active task directory
2. Read task.json 鈫?get next_action array
3. For each phase:
   - implement 鈫?Task(subagent_type="implement")
   - check 鈫?Task(subagent_type="check")
   - finish 鈫?Task(subagent_type="check", prompt="[finish]...")
   - create-pr 鈫?Bash("python3 ... create_pr.py")
```

**Forbidden**:
- Reading spec files directly
- Modifying code
- Git operations (except via create-pr script)

---

## Plan Agent

**File**: `.claude/agents/plan.md`

**Purpose**: Evaluate requirements and configure task directory.

**Tools**: `Read, Bash, Glob, Grep, Task`

**Capabilities**:
- **REJECT** unclear/vague requirements
- Call Research Agent to analyze codebase
- Create `prd.md` with requirements
- Configure `task.json` (branch, scope, phases)
- Initialize JSONL session files

**Rejection Criteria**:
- Vague requirements ("make it better")
- Incomplete information
- Out of scope
- Potentially harmful
- Too large (should split)

**Output**:
```
task-dir/
鈹溾攢鈹€ task.json      # Configured with branch, scope, dev_type
鈹溾攢鈹€ prd.md         # Clear requirements
鈹溾攢鈹€ implement.jsonl
鈹溾攢鈹€ check.jsonl
鈹斺攢鈹€ debug.jsonl
```

---

## Research Agent

**File**: `.claude/agents/shelf-research.md`

**Purpose**: Find and explain code patterns. Pure research, no modifications.

**Tools**: `Read, Glob, Grep, web search, chrome-devtools`

**Allowed**:
- Describe what exists
- Describe where it is
- Describe how it works
- Describe interactions

**Forbidden** (unless explicitly asked):
- Suggest improvements
- Criticize implementation
- Recommend refactoring
- Modify any files
- Git operations

**Output Format**:
```markdown
## Query Summary
...

## Files Found
- path/to/file.ts - description

## Code Patterns
...

## Related Specs
...
```

---

## Implement Agent

**File**: `.claude/agents/shelf-implement.md`

**Purpose**: Write code following injected specs.

**Tools**: `Read, Write, Edit, Bash, Glob, Grep`

**Workflow**:
1. Understand specs (from injected context)
2. Understand requirements (prd.md, info.md)
3. Implement features
4. Self-check (run lint/typecheck)

**Forbidden**:
- `git commit`
- `git push`
- `git merge`

**Context Injection**: Hook injects `implement.jsonl` + `prd.md` + `info.md`

---

## Check Agent

**File**: `.claude/agents/shelf-check.md`

**Purpose**: Review code and **self-fix** issues.

**Tools**: `Read, Write, Edit, Bash, Glob, Grep`

**Key Principle**: Fix issues yourself, don't just report them.

**Workflow**:
1. Get changes: `git diff`
2. Check against specs
3. Self-fix issues directly
4. Run verification (lint, typecheck)
5. Output completion markers

**Controlled by**: Ralph Loop (SubagentStop hook)

**Completion Markers**:
```
TYPECHECK_FINISH
LINT_FINISH
CODEREVIEW_FINISH
```

---

## Debug Agent

**File**: `.claude/agents/debug.md`

**Purpose**: Fix specific reported issues.

**Tools**: `Read, Write, Edit, Bash, Glob, Grep`

**Workflow**:
1. Parse issues (prioritize P1 > P2 > P3)
2. Research if needed
3. Fix one by one
4. Verify each fix (run typecheck)

**Forbidden**:
- Refactor surrounding code
- Add new features
- Modify unrelated files
- Use non-null assertion (`x!`)
- Git commit

---

## Invoking Agents

Use the `Task` tool with `subagent_type`:

```javascript
Task(
  subagent_type: "implement",
  prompt: "Implement the login feature",
  model: "opus",
  run_in_background: true  // optional
)
```

### Agent Resolution

1. Claude Code looks for `.claude/agents/{subagent_type}.md`
2. Loads agent definition (tools, model, instructions)
3. **PreToolUse hook fires** 鈫?`inject-subagent-context.py`
4. Hook injects context from JSONL files
5. Agent runs with full context

---

## Context Injection

### How It Works

```
Task(subagent_type="implement") called
            鈹?            鈻?    PreToolUse hook fires
            鈹?            鈻?inject-subagent-context.py runs
            鈹?            鈹溾攢鈹€ Resolve session active task
            鈹?            鈹溾攢鈹€ Find task directory from .runtime/sessions/<session-key>.json
            鈹?            鈹溾攢鈹€ Load implement.jsonl
            鈹?  {"file": ".shelf/spec/cli/backend/index.md", "reason": "..."}
            鈹?  {"file": "src/services/auth.ts", "reason": "..."}
            鈹?            鈹溾攢鈹€ Read each file content
            鈹?            鈹斺攢鈹€ Build new prompt:
                # Implement Agent Task
                ## Your Context
                === .shelf/spec/cli/backend/index.md ===
                [content]
                === src/services/auth.ts ===
                [content]
                ## Your Task
                [original prompt]
```

### JSONL Files

| File | Agent | Purpose |
|------|-------|---------|
| `implement.jsonl` | implement | Dev specs, patterns to follow |
| `check.jsonl` | check | Check specs, quality criteria |
| `debug.jsonl` | debug | Debug context, error reports |
| `research.jsonl` | research | (optional) Research scope |

---

## Multi-Agent Workflow

In the **current directory** (no worktree):

```
User request
    鈹?    鈻?Orchestrator (you or dispatch)
    鈹?    鈹溾攢鈹€ Task(subagent_type="research")
    鈹?  鈹斺攢鈹€ Returns: code patterns, relevant files
    鈹?    鈹溾攢鈹€ Task(subagent_type="implement")
    鈹?  鈹斺攢鈹€ Returns: implemented code
    鈹?    鈹溾攢鈹€ Task(subagent_type="check")
    鈹?  鈹斺攢鈹€ Returns: reviewed & fixed code
    鈹?    鈹斺攢鈹€ Human commits
```

### Task Workflow (from /shelf:start)

```
1. User describes task
2. AI classifies (Question / Trivial / Development Task)
3. For Development Task:
   a. Research Agent 鈫?analyze codebase
   b. Create task directory + JSONL files
   c. task.py start 鈫?set session active task
   d. Implement Agent 鈫?write code
   e. Check Agent 鈫?review & fix
   f. Human tests and commits
```

---

## Adding Custom Agents

### 1. Create Definition

`.claude/agents/my-agent.md`:
```markdown
---
name: my-agent
description: |
  What this agent specializes in.
tools: Read, Write, Edit, Bash, Glob, Grep
model: opus
---
# My Agent

## Core Responsibilities
1. ...

## Workflow
1. ...

## Forbidden Operations
- ...
```

### 2. Update Hook

Edit `.claude/hooks/inject-subagent-context.py`:

```python
# Add constant
AGENT_MY_AGENT = "my-agent"

# Add to list
AGENTS_ALL = (..., AGENT_MY_AGENT)

# Add context function
def get_my_agent_context(repo_root, task_dir):
    # Load my-agent.jsonl or fallback
    ...

# Add to main switch
elif subagent_type == AGENT_MY_AGENT:
    context = get_my_agent_context(repo_root, task_dir)
    new_prompt = build_my_agent_prompt(original_prompt, context)
```

### 3. Create JSONL

In task directories, create `my-agent.jsonl`:
```jsonl
{"file": ".shelf/spec/my-spec.md", "reason": "My agent spec"}
```

### 4. (Optional) Add to Dispatch

Update `task.json` default phases:
```json
"next_action": [
  {"phase": 1, "action": "my-agent"},
  ...
]
```

---

## vs Multi-Session

| Aspect | Multi-Agent | Multi-Session |
|--------|-------------|---------------|
| **What** | Multiple agents in sequence | Parallel isolated sessions |
| **Where** | Current directory | Separate worktrees |
| **Isolation** | Shared filesystem | Separate filesystems |
| **Use case** | Normal development | Parallel tasks |
| **Worktree** | Not needed | Required |

Multi-Agent is the **agent system** - dispatch calling implement, check, etc.

Multi-Session is **parallel execution** - multiple worktrees running simultaneously.

They can combine: Multi-Session runs Multi-Agent workflows in each worktree.
