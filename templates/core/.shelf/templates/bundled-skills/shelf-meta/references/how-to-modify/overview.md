# How-To Modification Guide

Common AgentOS Shelf customization scenarios and what files need to be modified.

---

## Quick Reference

| Task | Files to Modify | Platform |
|------|-----------------|----------|
| [Add slash command](#add-slash-command) | `.shelf/templates/common-commands/`, shelf-local | Codex/Claude |
| [Add agent](#add-agent) | `.claude/agents/`, `.codex/agents/`, JSONL, shelf-local | Codex/Claude |
| [Modify hook](#modify-hook) | `.claude/hooks/`, `.claude/settings.json`, shelf-local | Claude |
| [Add spec category](#add-spec-category) | `.shelf/spec/`, JSONL, shelf-local | Codex/Claude |
| [Change verify commands](#change-verify-commands) | `.shelf/spec/` or agent files | Codex/Claude |
| [Add workflow phase](#add-workflow-phase) | `.shelf/workflow.md`, common command files | Codex/Claude |
| [Add core script](#add-core-script) | `.shelf/scripts/`, shelf-local | Codex/Claude |
| [Change task types](#change-task-types) | task scripts, JSONL templates | Codex/Claude |

**Platform**: current built-in projections are Codex and Claude Code only.

---

## Detailed Guides

### Add Slash Command

**Scenario**: Add a new `/shelf:my-command` command.

**Files to modify**:

```
.shelf/templates/common-commands/my-command.md   # Create: Shared command source
.shelf-local/SKILL.md                            # Update: Document the change
```

**Steps**:
1. Create the common command source
2. Regenerate platform projections
3. Document in shelf-local

鈫?See `add-command.md` for details.

---

### Add Agent

**Scenario**: Add a new agent type like `my-agent`.

**Files to modify**:

```
.claude/agents/my-agent.md                          # Create: Agent definition
.codex/agents/my-agent.toml                         # Create: Codex agent if needed
.shelf/tasks/{template}/my-agent.jsonl            # Create: Context template
.shelf-local/SKILL.md                             # Update: Document the change
```

**Optional**:
```
.shelf/workflow.md                                  # Modify: If adding to pipeline
task template code                                  # Modify: Seed JSONL if needed
```

鈫?See `add-agent.md` for details.

---

### Modify Hook

**Scenario**: Change hook behavior (context injection, validation, etc.).

**Files to modify**:

```
.claude/hooks/{hook-name}.py              # Modify: Hook logic
.claude/settings.json                     # Modify: If changing matcher/timeout
.shelf-local/SKILL.md                   # Update: Document the change
```

鈫?See `modify-hook.md` for details.

---

### Add Spec Category

**Scenario**: Add a new spec category like `mobile/`.

**Files to modify**:

```
.shelf/spec/mobile/index.md             # Create: Category index
.shelf/spec/mobile/*.md                 # Create: Spec files
.shelf/tasks/{template}/*.jsonl         # Update: Reference new specs
.shelf-local/SKILL.md                   # Update: Document the change
```

鈫?See `add-spec.md` for details.

---

### Change Verify Commands

**Scenario**: Add or modify verification guidance for check agents.

**Files to modify**:

```
.shelf/spec/*/quality-guidelines.md     # Modify: project verification commands
.claude/agents/shelf-check.md           # Modify: Claude-specific check behavior if needed
.codex/agents/shelf-check.toml          # Modify: Codex-specific check behavior if needed
```

**Example**:
```yaml
verify:
  - pnpm lint
  - pnpm typecheck
  - pnpm test        # Add this
```

鈫?See `change-verify.md` for details.

---

### Add Workflow Phase

**Scenario**: Add a new phase to the task workflow.

**Files to modify**:

```
task.json (in task directories)           # Modify: next_action array
.claude/agents/{new-phase}.md             # Create: If new agent needed
.codex/agents/{new-phase}.toml            # Create: If Codex agent needed
.shelf-local/SKILL.md                   # Update: Document the change
```

鈫?See `add-phase.md` for details.

---

### Modify Session Start

**Scenario**: Change what context is injected at session start.

**Files to modify**:

```
.claude/hooks/shelf-session-start.py      # Modify: reminder logic
.shelf-local/SKILL.md                   # Update: Document the change
```

鈫?See `modify-session-start.md` for details.

---

### Add Core Script

**Scenario**: Add a new automation script.

**Files to modify**:

```
.shelf/scripts/my-script.py             # Create: Script
.shelf/scripts/common/*.py              # Create/Modify: If shared utilities
.shelf-local/SKILL.md                   # Update: Document the change
```

鈫?See `add-script.md` for details.

---

### Change Task Types

**Scenario**: Add or modify task dev_type (frontend, backend, etc.).

**Files to modify**:

```
.shelf/scripts/task.py                  # Modify: init-context logic
.shelf/tasks/{template}/*.jsonl         # Create: New JSONL templates
.shelf-local/SKILL.md                   # Update: Document the change
```

鈫?See `change-task-types.md` for details.

---

## Documents in This Directory

| Document | Scenario |
|----------|----------|
| `add-command.md` | Adding slash commands |
| `add-agent.md` | Adding new agent types |
| `modify-hook.md` | Modifying hook behavior |
| `add-spec.md` | Adding spec categories |
| `change-verify.md` | Changing verify commands |
| `add-phase.md` | Adding workflow phases |
| `modify-session-start.md` | Changing session start injection |
| `add-script.md` | Adding automation scripts |
| `change-task-types.md` | Adding task types |
