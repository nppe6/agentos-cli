# Local Context Injection System

AgentOS Shelf context loading aims to make AI read the right files at the right time instead of relying on model memory. In a user project, context is loaded through `.shelf/` scripts together with platform agents, commands, hooks, and skills.

## Injected Context Types

| Type | Source | Purpose |
| --- | --- | --- |
| session context | `.shelf/scripts/get_context.py` | Current developer, git status, active task, active tasks, journal, packages. |
| workflow context | `.shelf/workflow.md` | Current AgentOS Shelf flow and next action. |
| spec context | `.shelf/spec/` + task JSONL | Specs that must be followed during implementation/checking. |
| task context | `.shelf/tasks/<task>/prd.md`, `info.md`, `research/` | Current task requirements, design, and research. |
| platform context | Platform agents, commands, hooks, and settings | Lets Codex and Claude Code read the files above through their own mechanisms. |

## session-start

Claude Code currently receives a lightweight session-start reminder when a session starts. Codex receives project-scoped hook wiring through `.codex/hooks.json` and `.codex/hooks/`, while still relying on `AGENTS.md`, `.agents/skills/`, and `.codex/agents/` for explicit pull-based work.

- Read `AGENTS.md`.
- Read `.shelf/workflow.md`.
- Use `.shelf/tasks` for PRD, `implement.jsonl`, and `check.jsonl` context.

If the user feels the AI does not know the current task in a new session, first run `agentos-cli shelf workspace context` and `agentos-cli shelf task current --source`, then inspect the relevant platform command, skill projection, or agent file.

## workflow-state

workflow-state blocks are the source for state-specific guidance in `.shelf/workflow.md`, such as `no_task`, `planning`, `in_progress`, or `completed`. The current CLI installs a per-turn workflow-state hook for both Codex and Claude Code, and the hook parses `.shelf/workflow.md` directly.

If the user wants to change "what the AI should do next in a given state," edit the corresponding state block in `.shelf/workflow.md` first.

## sub-agent context

Implement and check agents need task context. AgentOS Shelf has two loading modes:

1. **agent pull**: the agent definition instructs the agent to read the active task, PRD, and JSONL context after startup.
2. **command pull**: a command or projected skill tells the main session to run Shelf context commands and read the relevant files.

In both modes, JSONL files in the task directory are the key interface.

## JSONL Reading Rules

`implement.jsonl` and `check.jsonl` contain one JSON object per line:

```jsonl
{"file": ".shelf/spec/backend/index.md", "reason": "Backend rules"}
```

Readers should skip seed rows without a `file` field. When configuring JSONL, the AI should include only spec/research files, not pre-register code files that will be modified.

## Active Task And Context Key

Active task state lives in `.shelf/.runtime/sessions/` and is isolated per session. Scripts try to resolve the context key from platform/session environment variables or `SHELF_CONTEXT_ID`.

If shell commands cannot see the same context key, `task.py current --source` may report no active task. In that case, use `SHELF_CONTEXT_ID` or rerun `task.py start <task-dir>` in the current session.

## Local Customization Points

| Need | Edit location |
| --- | --- |
| Change session-start reminder content | `.claude/hooks/shelf-session-start.py` or `.codex/hooks/shelf-session-start.py`, depending on platform. |
| Change workflow-state rules | `[workflow-state:STATUS]` block in `.shelf/workflow.md`. |
| Change how sub-agents read context | Platform agent definitions or common command files. |
| Change JSONL validation/display | `.shelf/scripts/common/task_context.py`. |
| Change active task resolution | `.shelf/scripts/common/active_task.py`. |

When modifying context injection, verify two things: new sessions can see the correct task, and sub-agents can see the correct PRD/spec/research.
