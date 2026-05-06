# Add Project-Local Conventions

Often the user does not need to change AgentOS Shelf mechanics; they need local AI to understand their team's conventions. In that case, prefer `.shelf/spec/` or a project-local skill instead of editing `shelf-meta`.

## Where To Put Things

| Content type | Location |
| --- | --- |
| Rules code must follow | `.shelf/spec/<layer>/` |
| Cross-layer thinking methods | `.shelf/spec/guides/` |
| AI capability for a project-specific flow | Platform-local skill |
| One-off task material | `.shelf/tasks/<task>/` |
| Session summary | `.shelf/workspace/<developer>/journal-N.md` |

## Create A Project-Local Skill

If the user wants AI to know "how this project customizes AgentOS Shelf," create a local skill:

```text
.claude/skills/shelf-local/
鈹斺攢鈹€ SKILL.md
```

Example:

```md
---
name: shelf-local
description: "Project-local AgentOS Shelf customizations for this repository. Use when changing this project's AgentOS Shelf workflow, hooks, local agents, or team-specific conventions."
---

# AgentOS Shelf Local

## Local Scope

This skill documents this repository's AgentOS Shelf customizations only.

## Custom Workflow Rules

- ...

## Local Hook Changes

- ...

## Local Agent Changes

- ...
```

For multi-platform projects, place equivalent versions in other platform skill directories, or use `.agents/skills/` for platforms that support the shared layer.

## Write To `.shelf/spec/`

If the content is a coding convention, write it to spec. Examples:

```text
.shelf/spec/backend/error-handling.md
.shelf/spec/frontend/components.md
.shelf/spec/guides/cross-platform-thinking-guide.md
```

After writing it, update the corresponding `index.md` so AI can find the new rule from the entry point.

## Make The Current Task Use New Conventions

After writing a spec, add it to the current task context:

```bash
python3 ./.shelf/scripts/task.py add-context <task> implement ".shelf/spec/backend/error-handling.md" "Error handling conventions"
python3 ./.shelf/scripts/task.py add-context <task> check ".shelf/spec/backend/error-handling.md" "Review error handling"
```

## Do Not Store Project-Private Rules In `shelf-meta`

`shelf-meta` is a public skill for understanding AgentOS Shelf architecture and local customization entry points. Put project-private content in:

- `.shelf/spec/`
- a project-local skill
- the current task
- workspace journal

This prevents future updates to AgentOS Shelf's built-in `shelf-meta` from overwriting the team's own conventions.
