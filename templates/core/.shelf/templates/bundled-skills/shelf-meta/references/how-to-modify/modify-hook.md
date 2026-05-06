# How To: Modify Hook

Change Claude Code hook behavior.

**Current hook support**: the default CLI installs a lightweight Claude Code `SessionStart` hook and Codex project hooks for `SessionStart` plus `UserPromptSubmit`. Codex hooks require the user's global Codex hook feature flag.

---

## Files to Modify

| File | Action | Required |
|------|--------|----------|
| `.claude/hooks/shelf-session-start.py` | Modify | Yes |
| `.claude/settings.json` | Modify if changing registration | Sometimes |
| `shelf-local/SKILL.md` or project-local notes | Document | Recommended |

---

## Current Hook Type

| Hook | File | Purpose |
|------|------|---------|
| SessionStart | `shelf-session-start.py` | Reminds Claude Code to read `AGENTS.md`, `.shelf/workflow.md`, and task context. |

The current default install does not include agent context hooks, workflow-state per-turn hooks, shell bridges, or quality-loop hooks.

---

## Step 1: Understand Current Hook

Read:

```text
.claude/settings.json
.claude/hooks/shelf-session-start.py
```

The default hook prints plain text. It intentionally avoids mutating task state.

---

## Step 2: Modify Session-Start Reminder

Example:

```python
print("AgentOS Shelf: read AGENTS.md and .shelf/workflow.md before changing code.")
print("AgentOS Shelf: run agentos-cli shelf workspace context when resuming work.")
```

Keep output short. If the hook becomes large, move durable rules into `.shelf/workflow.md` or `.shelf/spec/` and make the hook point there.

---

## Step 3: Modify Settings Optional

If the script path or hook event changes, update `.claude/settings.json`.

Do not register hook files that do not exist. If you add a new hook, create the script, document its event, and test it manually.

---

## Step 4: Document Locally

```markdown
## Hooks Changed

#### shelf-session-start.py
- **Hook Event**: SessionStart
- **Change**: Added project-specific reminder
- **Reason**: Help new sessions load Shelf context
```

---

## Testing

```bash
python3 .claude/hooks/shelf-session-start.py
```

Then start a new Claude Code session and verify the reminder appears.

---

## Checklist

- [ ] Hook script exists.
- [ ] Settings register the script path.
- [ ] Hook output is short and visible.
- [ ] No nonexistent hook files are referenced.
- [ ] Local customization documented.
