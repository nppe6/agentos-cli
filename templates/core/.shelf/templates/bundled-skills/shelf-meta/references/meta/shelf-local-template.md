# AgentOS Shelf Local Skill Template

Use this template to document project-local Shelf customizations.

## Create

```bash
mkdir -p .claude/skills/shelf-local
```

Create `.claude/skills/shelf-local/SKILL.md`:

```markdown
---
name: shelf-local
description: "Project-local AgentOS Shelf customizations for this repository. Use when changing this project's Shelf workflow, agents, hooks, prompts, commands, or team-specific conventions."
---

# Shelf Local

## Base Information

| Field | Value |
| --- | --- |
| AgentOS Shelf version | <version> |
| Date initialized | <date> |
| Last updated | <date> |

## Summary

- Commands/prompts added:
- Agents changed:
- Hooks changed:
- Specs changed:
- Workflow changes:

## Commands And Prompts

### Added

#### /shelf:example
- **Files**: generated platform outputs, plus upstream CLI common-command source if this is a Shelf source change
- **Platform**: Claude Code and/or Codex
- **Purpose**:
- **Reason**:

## Agents

### Added Or Changed

#### shelf-example
- **Files**: `.claude/agents/shelf-example.md`, `.codex/agents/shelf-example.toml`
- **Context**: active task -> PRD -> JSONL -> referenced files
- **Purpose**:
- **Reason**:

## Hooks

### Changed

#### shelf-session-start.py
- **File**: `.claude/hooks/shelf-session-start.py`
- **Hook event**: SessionStart
- **Change**:
- **Reason**:

## Specs

### Changed

#### .shelf/spec/<path>
- **Change**:
- **Reason**:
- **Example source files**:

## Changelog

### <date>
- Change:
- Reason:
```

Keep project rules in `.shelf/spec/` whenever possible. Use `shelf-local` to explain how this project customized Shelf itself.
