# How To: Modify Hook

Change Claude Code or Codex hook behavior.

**Current hook support**: the default CLI installs Claude Code and Codex hooks for `SessionStart` and `UserPromptSubmit` where the platform supports them. Codex hooks require the user's global Codex hook feature flag.

---

## Files to Modify

| File | Action | Required |
|------|--------|----------|
| `.claude/hooks/shelf-session-start.py` | Modify | Sometimes |
| `.claude/hooks/shelf-inject-workflow-state.py` | Modify | Sometimes |
| `.claude/settings.json` | Modify if changing registration | Sometimes |
| `.codex/hooks/shelf-session-start.py` | Modify | Sometimes |
| `.codex/hooks/shelf-inject-workflow-state.py` | Modify | Sometimes |
| `.codex/hooks.json` | Modify if changing registration | Sometimes |
| `shelf-local/SKILL.md` or project-local notes | Document | Recommended |

---

## Current Hook Type

| Hook | File | Purpose |
|------|------|---------|
| SessionStart | `shelf-session-start.py` | Reminds the platform to read `AGENTS.md`, `.shelf/workflow.md`, and task context. |
| UserPromptSubmit | `shelf-inject-workflow-state.py` | Injects the current workflow-state breadcrumb from `.shelf/workflow.md`. |

The current default install does not include agent context hooks, shell bridges, or quality-loop hooks.

---

## Step 1: Understand Current Hook

Read:

```text
.claude/settings.json
.claude/hooks/shelf-session-start.py
.claude/hooks/shelf-inject-workflow-state.py
.codex/hooks.json
.codex/hooks/shelf-session-start.py
.codex/hooks/shelf-inject-workflow-state.py
```

The default hook prints plain text. It intentionally avoids mutating task state.

---

## Step 2: Modify Hook Behavior

Example:

```python
print("AgentOS Shelf: read AGENTS.md and .shelf/workflow.md before changing code.")
print("AgentOS Shelf: run agentos-cli shelf workspace context when resuming work.")
```

Keep output short. If the hook becomes large, move durable rules into `.shelf/workflow.md` or `.shelf/spec/` and make the hook point there.

For workflow-state hooks, prefer editing `[workflow-state:STATUS]` blocks in `.shelf/workflow.md` before changing parser logic.

---

## Step 3: Modify Settings Optional

If the script path or hook event changes, update the relevant platform registration file:

- `.claude/settings.json`
- `.codex/hooks.json`

Do not register hook files that do not exist. If you add a new hook, create the script, document its event, and test it manually.

---

## Step 4: Document Locally

```markdown
## Hooks Changed

#### shelf-session-start.py / shelf-inject-workflow-state.py
- **Hook Event**: SessionStart or UserPromptSubmit
- **Change**: Added project-specific reminder or workflow-state override
- **Reason**: Help sessions load or resume Shelf context
```

---

## Testing

```bash
python3 .claude/hooks/shelf-session-start.py
python3 .claude/hooks/shelf-inject-workflow-state.py
python3 .codex/hooks/shelf-session-start.py
python3 .codex/hooks/shelf-inject-workflow-state.py
```

Then start a new Claude Code session and verify the reminder appears.

---

## Checklist

- [ ] Hook script exists.
- [ ] Settings register the script path.
- [ ] Hook output is short and visible.
- [ ] No nonexistent hook files are referenced.
- [ ] Local customization documented.
