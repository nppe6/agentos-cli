# Agents

AgentOS Shelf agent files define specialized roles. Common AgentOS Shelf agents in a user project are:

- `shelf-research`
- `shelf-implement`
- `shelf-check`

File locations and formats differ by platform, but responsibility boundaries should stay consistent.

## Agent Responsibilities

| Agent | Responsibility |
| --- | --- |
| `shelf-research` | Investigate the question and write findings into the current task's `research/`. |
| `shelf-implement` | Implement against `prd.md`, `info.md`, `implement.jsonl`, and related spec/research. |
| `shelf-check` | Review changes, fix discovered issues, and run necessary checks. |

Agent files should not become generic chat prompts. They should define input sources, write boundaries, whether code may be changed, and how results are reported.

## Common Paths

| Platform | Agent path |
| --- | --- |
| Claude Code | `.claude/agents/shelf-*.md` |
| Cursor | `.cursor/agents/shelf-*.md` |
| OpenCode | `.opencode/agents/shelf-*.md` |
| Codex | `.codex/agents/shelf-*.md` |
| Kiro | `.kiro/agents/shelf-*.json` |
| Gemini CLI | `.gemini/agents/shelf-*.md` |
| Qoder | `.qoder/agents/shelf-*.md` |
| CodeBuddy | `.codebuddy/agents/shelf-*.md` |
| Factory Droid | `.factory/droids/shelf-*.md` |
| Pi Agent | `.pi/agents/shelf-*.md` |

GitHub Copilot agent/prompt support is provided by a combination of directories such as `.github/agents/`, `.github/prompts/`, and `.github/skills/`; inspect the files actually generated in the user project.

Main-session workflow platforms such as Kilo, Antigravity, and Windsurf may not have AgentOS Shelf sub-agent files. They usually rely on workflows/skills to guide the main session.

## Two Context Loading Modes

### hook push

The platform hook injects task context before the agent starts. The agent file itself can focus more on responsibilities and boundaries.

Common on platforms that support agent hooks.

### agent pull

The agent file instructs the agent to read after startup:

- `python3 ./.shelf/scripts/task.py current --source`
- current task `prd.md`
- `info.md`
- `implement.jsonl` or `check.jsonl`
- spec/research files referenced by JSONL

This mode fits platforms whose hooks cannot reliably rewrite sub-agent prompts.

## Local Change Scenarios

| User need | Edit location |
| --- | --- |
| Implement agent must follow extra restrictions | The platform's `shelf-implement` agent file. |
| Check agent must run project-specific commands | `shelf-check` agent file, and `.shelf/spec/` if needed. |
| Research agent must output a fixed format | `shelf-research` agent file. |
| Agent cannot read task context | Agent prelude or `inject-subagent-context` hook. |
| Add a project-specific agent | Platform agent directory + related workflow/command/skill entry point. |

## Modification Principles

1. **Keep responsibilities single-purpose**. Do not mix research, implement, and check responsibilities into one agent.
2. **Specify the read order**. Agents must know to start from the active task and then find the PRD and JSONL.
3. **Specify write boundaries**. Research usually only writes `research/`; implement can write code; check can fix issues.
4. **Keep semantics synchronized in multi-platform projects**. If the user configured Claude, Codex, and Cursor together, decide whether changes to one platform's agent also need to be applied to others.

## Do Not Default To Editing Upstream Templates

Local AI should default to modifying platform agent files inside the user project. Discuss upstream template source only when the user explicitly wants to contribute the change back to AgentOS Shelf.
