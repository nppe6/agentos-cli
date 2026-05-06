# How To: Add Slash Command

Add a new `/shelf:my-command` command from the shared command source.

**Current platforms**: Claude Code commands plus Codex shared-skill projection

---

## Files to Modify

| File | Action | Required |
|------|--------|----------|
| `.shelf/templates/common-commands/my-command.md` | Create | Yes |
| `shelf-local/SKILL.md` | Update | Yes |

---

## Step 1: Create Common Command Source

Create `.shelf/templates/common-commands/my-command.md`:

```markdown
# My Command

## Purpose

Detailed description of the command's purpose.

## When to Use

- Scenario 1
- Scenario 2

## Workflow

1. First step
2. Second step
3. Third step

## Output

What the command produces.
```

### Command Name Convention

- Use kebab-case: `my-command`, not `myCommand`
- Prefix with category if needed: `check-cross-layer`, `before-dev`

---

## Step 2: Let Platform Projections Regenerate

After sync/init:

- Claude projects get `.claude/commands/shelf/my-command.md`
- Codex projects can expose the same semantics through `.agents/skills/shelf-my-command/SKILL.md`

Keep the common source free of platform-specific frontmatter. The projection layer injects the right wrapper per platform.

---

## Step 3: Document in shelf-local

Update `.claude/skills/shelf-local/SKILL.md`:

```markdown
## Commands

### Added Commands

#### /shelf:my-command
- **Source**: `.shelf/templates/common-commands/my-command.md`
- **Platform output**: Claude command; Codex shared skill projection if enabled
- **Purpose**: What it does
- **Added**: 2026-01-31
- **Reason**: Why it was added
```

---

## Examples

### Simple Command

```markdown
# Check Types

Run `pnpm typecheck` and report results.

## Usage

Run this command after making code changes to verify type safety.
```

### Command with Parameters

Commands can reference user input or context:

```markdown
# Review File

## Input

User should specify which file to review.

## Workflow

1. Read the specified file
2. Check against relevant specs
3. Report issues found
```

---

## Testing

1. Regenerate platform projections.
2. Run the command: `/shelf:my-command`
3. Verify behavior matches description.
4. Confirm Codex reads the projected shared skill when relevant.

---

## Checklist

- [ ] Common command source created
- [ ] Platform projections regenerated
- [ ] Documented in shelf-local
- [ ] Tested the command
