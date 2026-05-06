# AgentOS Shelf Self-Iteration Guide

When customizing AgentOS Shelf inside a user project, document the change in a project-local place so future agents can understand what changed and why.

## Decision Rule

| Change type | Documentation target |
| --- | --- |
| Project coding convention | `.shelf/spec/` |
| Project-local Shelf customization | `.claude/skills/shelf-local/SKILL.md` or equivalent local note |
| Upstream AgentOS Shelf CLI behavior | AgentOS Shelf source docs and tests |

Do not edit upstream package files for a local project customization.

## Workflow

1. Read the current generated files before editing.
2. Make the narrow customization.
3. Update `shelf-local` or `.shelf/spec/`.
4. Record affected files, reason, date, and verification.

## Templates

### Command Or Prompt

```markdown
#### /shelf:my-command
- **Files**: `.shelf/templates/common-commands/my-command.md`, plus generated platform outputs
- **Purpose**:
- **Reason**:
- **Verification**:
```

### Agent

```markdown
#### my-agent
- **Files**: `.claude/agents/my-agent.md`, `.codex/agents/my-agent.toml`
- **Context loading**: active task -> PRD -> JSONL -> referenced files
- **Purpose**:
- **Reason**:
- **Verification**:
```

### Hook

```markdown
#### shelf-session-start.py
- **File**: `.claude/hooks/shelf-session-start.py`
- **Hook event**: SessionStart
- **Change**:
- **Reason**:
- **Verification**: `python3 .claude/hooks/shelf-session-start.py`
```

### Spec Change

```markdown
#### .shelf/spec/frontend/quality-guidelines.md
- **Change**:
- **Reason**:
- **Example source files**:
- **Verification**:
```

## Changelog Format

```markdown
### 2026-01-31 - Change: Check Verification
- Updated `.shelf/spec/frontend/quality-guidelines.md`.
- Updated `.claude/agents/shelf-check.md` and `.codex/agents/shelf-check.toml`.
- Reason: project verification commands needed clearer guidance.
```
