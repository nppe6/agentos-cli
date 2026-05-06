# Change Local Skills, Commands, And Workflows

When the user wants to change AI entry points, auto-trigger rules, or explicit command behavior, edit skills, commands, or workflows in local platform directories.

## Read These Files First

1. `.shelf/workflow.md`
2. Target platform skill/command/workflow directory
3. Related agent or hook files
4. Whether project rules already exist in `.shelf/spec/`

## Which Entry Type To Choose

| Goal | Recommendation |
| --- | --- |
| AI should automatically know a capability | Add or modify a skill. |
| User wants to trigger manually with a command | Add or modify a common command source or platform command output. |
| Team project conventions | Prefer `.shelf/spec/` or a project-local skill. |
| Change AgentOS Shelf flow semantics | Synchronize `.shelf/workflow.md`. |

## Modify A Skill

A skill is usually:

```text
<skill-name>/
|- SKILL.md
\- references/
```

`SKILL.md` should be short and responsible for triggering/routing. Put long content in `references/` so AI can read it on demand.

The frontmatter description should specify when to use the skill. Example:

```yaml
description: "Use when customizing this project's deployment workflow and release checklist."
```

Do not write vague descriptions such as "helpful project skill"; they can trigger incorrectly.

## Modify A Command/Workflow

Explicit entry points should state:

- How the user triggers it.
- Which `.shelf/` files to read.
- Which scripts to run.
- How to report after completion.

If a command only repeats workflow rules, prefer making it reference/read `.shelf/workflow.md` instead of maintaining a second copy of the flow.

## Common Paths

| Platform | Entry directories |
| --- | --- |
| Claude Code | `.claude/skills/`, `.claude/commands/` |
| Codex | `.agents/skills/`, `.codex/agents/` |

## Add A Project-Local Skill

If the user wants to document team-private customizations, create a project-local skill, for example:

```text
.claude/skills/project-shelf-local/
\- SKILL.md
```

For current multi-platform projects, add `.claude/skills/` for Claude Code and `.agents/skills/` for Codex.

## Notes

- Do not mix every platform's syntax into one file.
- Do not change only one platform entry point while claiming all platforms are supported.
- Do not hide long-term engineering conventions inside a command; write them to `.shelf/spec/`.
