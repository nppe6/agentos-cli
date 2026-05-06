---
status: completed
created: 2026-05-06
---

# Shelf Session Context And Bootstrap Alignment Plan

## Problem Frame

Shelf already has Trellis-derived task scripts, `get_context.py --mode phase`, `get_context.py --mode packages`, session-scoped active tasks, and `shelf-update-spec`. The remaining first-run gap is not the context script itself; it is how platform entrypoints surface that context after `shelf init`.

Compared with the upstream Trellis templates, Shelf's Codex SessionStart hook only injects a short current-state block, and the Claude hook only prints reminders. The `/shelf-continue` entrypoints also route `status=in_progress` generically, which can mislead the AI on the generated `00-bootstrap-guidelines` first task.

## Scope

This iteration aligns the first-session path for the currently supported Shelf platforms, Codex and Claude Code:

- Inject workflow overview, current state, available spec indexes, and task status from SessionStart templates.
- Keep `get_context.py` as the canonical runtime reader; do not fork or duplicate its mode implementation.
- Add an explicit `00-bootstrap-guidelines` fast path to Shelf continue prompts/skill.
- Add focused tests so future template edits do not regress this behavior.

Out of scope for this pass: adding Trellis' full shared hook capability table, additional platforms, remote marketplace/template registry, or changing Shelf's task lifecycle semantics.

## Existing Patterns To Follow

- Upstream Trellis Codex hook pattern: `packages/cli/src/templates/codex/hooks/session-start.py`
- Upstream Trellis continue command: `packages/cli/src/templates/common/commands/continue.md`
- Shelf runtime context entry: `templates/core/.shelf/scripts/get_context.py`
- Shelf workflow source of truth: `templates/core/.shelf/workflow.md`
- Shelf projection tests: `tests/agent-init.test.js`

## Implementation Units

- U1. SessionStart context parity

  Goal: Make Codex and Claude SessionStart templates inject enough context for a new AI session to understand workflow, current tasks, and spec indexes without manual explanation.

  Files:
  - Modify: `templates/core/.shelf/templates/codex-hooks/shelf-session-start.py`
  - Modify: `templates/core/.shelf/templates/claude-hooks/shelf-session-start.py`
  - Test: `tests/agent-init.test.js`

  Approach:
  - Reuse the local `.shelf/scripts/get_context.py` command for current state.
  - Read `.shelf/workflow.md` directly to build a compact workflow overview with table of contents plus Phase Index through Phase 3.
  - List available `.shelf/spec/**/index.md` paths and inline `spec/guides/index.md` when present.
  - Resolve active task status using `.shelf/scripts/common/active_task.py` when a session key is available; otherwise state that there is no active task and point the AI at the active task list.

  Test scenarios:
  - Init with Codex and Claude writes SessionStart hooks containing `<workflow>`, `<guidelines>`, `<task-status>`, `.shelf/workflow.md`, and `.shelf/spec/`.

- U2. Bootstrap continue fast path

  Goal: Ensure the generated first-run `00-bootstrap-guidelines` task is treated as a spec-bootstrap task, not a normal implementation task.

  Files:
  - Modify: `templates/core/.shelf/templates/codex-prompts/shelf-continue.md`
  - Modify: `templates/core/.shelf/templates/claude-commands/shelf/continue.md`
  - Modify: `templates/core/.shelf/skills/shelf-continue/SKILL.md`
  - Test: `tests/agent-init.test.js`

  Approach:
  - Before normal phase routing, check whether the active task path is `.shelf/tasks/00-bootstrap-guidelines`.
  - If no current task exists but `task list` shows `00-bootstrap-guidelines/ (in_progress)`, treat it as the bootstrap task.
  - In that path, read its `prd.md` and execute the bootstrap instructions: inspect existing convention docs and real code, then write `.shelf/spec/`.

  Test scenarios:
  - Generated Codex prompt, Claude command, and `.agents` skill all mention `00-bootstrap-guidelines` and the bootstrap path.

## Verification

- Run focused Node tests for init template generation:
  - `node --test --test-name-pattern "injects full Shelf workflow|injects core-only workflow" tests/agent-init.test.js`
- Run Python syntax checks for edited hook templates:
  - `python -m py_compile templates/core/.shelf/templates/codex-hooks/shelf-session-start.py templates/core/.shelf/templates/claude-hooks/shelf-session-start.py`

## Remaining Difference Notes

After this pass, Shelf will be closer to Trellis for first-session behavior, but still intentionally smaller:

- Shelf supports Codex and Claude Code projection today; Trellis has a wider platform matrix.
- Shelf does not yet have Trellis' full shared hook distribution layer.
- Shelf does not yet implement Trellis' remote template marketplace/registry flow.
- Shelf's `00-bootstrap-guidelines` remains an AI-facing task; it is not an automatic code scanner that writes spec without an AI session executing it.
