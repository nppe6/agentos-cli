---
status: active
created: 2026-05-02
---

# Shelf Skill Projection Alignment Plan

## Problem Frame

The current Shelf projection model over-applies workflow skills into Codex-specific paths. Trellis' actual Claude + Codex output shows a clearer split: Claude gets tool-scoped skills under `.claude/skills`, while Codex and other Open Agent Skills-compatible tools consume shared skills from `.agents/skills`. Shelf should follow that model and use `shelf-*` as the workflow skill prefix.

## Scope

- Rename core workflow skills from `shelf-*` to `shelf-*`.
- Stop projecting shared workflow skills into `.codex/skills`.
- Keep Claude-specific `.claude/skills` projection.
- Keep shared `.agents/skills` projection for Codex.
- Trim Claude command templates to the Trellis-aligned slash command set: `continue` and `finish-work`.
- Update tests and documentation so generated output expectations match the new structure.

## Key Decisions

- Codex remains an Open Agent Skills consumer via `.agents/skills`; `.codex/skills` is not used for Shelf workflow skills.
- Claude keeps its own `.claude/skills` because Claude Code does not read `.agents/skills` in the same way.
- `templates/core/.shelf/skills` remains the single source for workflow skill content; generated tool directories are projections.
- Slash commands are separate from skills. Shelf should expose only the commands currently justified by the Trellis comparison rather than duplicating every skill as a command.

## Implementation Units

- U1. **Rename Workflow Skills**

**Files:**
- Modify/move: `templates/core/.shelf/skills/*`
- Modify: docs and tests referencing `shelf-*`

**Test scenarios:**
- Fresh init generates `shelf-brainstorm` skill paths.
- Old placeholder or old prefix paths are not generated.

- U2. **Correct Skill Projection Capabilities**

**Files:**
- Modify: `lib/utils/platform-registry.js`
- Modify: `lib/utils/agent-os.js`
- Modify: `lib/actions/agent-doctor.js`
- Modify: `templates/tools/codex/tool.json` if metadata needs to reflect no tool-scoped skills

**Test scenarios:**
- Codex-only init creates `.agents/skills/shelf-brainstorm/SKILL.md`.
- Codex-only init does not create `.codex/skills/shelf-brainstorm/SKILL.md`.
- Claude init creates `.claude/skills/shelf-brainstorm/SKILL.md`.
- Doctor accepts Codex projects without `.codex/skills`.

- U3. **Align Claude Commands**

**Files:**
- Delete: `templates/core/.shelf/templates/claude-commands/shelf/context.md`
- Delete: `templates/core/.shelf/templates/claude-commands/shelf/update-spec.md`
- Keep: `templates/core/.shelf/templates/claude-commands/shelf/continue.md`
- Keep: `templates/core/.shelf/templates/claude-commands/shelf/finish-work.md`

**Test scenarios:**
- Claude init creates `.claude/commands/shelf/continue.md` and `finish-work.md`.
- Removed command templates are not generated.

## Verification

- Run the Node test suite.
- Inspect generated-file tests to confirm the new paths encode the intended architecture.

