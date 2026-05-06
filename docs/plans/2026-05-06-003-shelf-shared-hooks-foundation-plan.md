---
status: completed
created: 2026-05-06
---

# Shelf Shared Hooks Foundation Plan

## Problem Frame

Shelf now injects richer SessionStart context, but hook projection is still directory-driven: Codex and Claude hook files are collected from separate template folders with no explicit capability table. Upstream Trellis has a shared-hooks layer that records which platforms receive which hook scripts, keeping install and update behavior from drifting.

This pass introduces the same structural idea for Shelf, scoped to the two supported platforms: Codex and Claude Code.

## Scope

- Add a Shelf shared hook registry in `lib/utils/shared-hooks.js`.
- Move platform-independent hook templates into `templates/core/.shelf/templates/shared-hooks/`.
- Keep Codex's SessionStart hook platform-specific, matching Trellis' Codex exception.
- Let Claude receive shared `session-start.py` and shared `inject-workflow-state.py`.
- Let Codex receive platform-specific `shelf-session-start.py` and shared `shelf-inject-workflow-state.py`.
- Keep hook filenames stable in generated projects to avoid breaking existing `hooks.json` / settings references.

Out of scope:

- Adding `inject-subagent-context.py`.
- Adding Cursor, Gemini, Qoder, Copilot, Droid, Kiro, or other Trellis platforms.
- Changing task lifecycle semantics or session active-task storage.

## Existing Patterns To Follow

- Upstream shared hook registry: `.tmp/Trellis-main/packages/cli/src/templates/shared-hooks/index.ts`
- Shelf projection collector: `lib/utils/agent-os.js`
- Shelf platform registry: `lib/utils/platform-registry.js`
- Shelf init tests: `tests/agent-init.test.js`
- Registry tests: `tests/platform-registry.test.js`

## Implementation Units

- U1. Shared hook registry

  Goal: Create a single capability table for supported Shelf hook distribution.

  Files:
  - Create: `lib/utils/shared-hooks.js`
  - Modify: `tests/platform-registry.test.js`

  Approach:
  - Declare supported hook names and per-platform mapping.
  - Expose `getSharedHookScriptsForPlatform(platform, templateRoot)`.
  - Keep Codex mapping to only `shelf-inject-workflow-state.py`; Codex keeps its platform-specific SessionStart hook.
  - Map Claude to both `shelf-session-start.py` and `shelf-inject-workflow-state.py`.

  Test scenarios:
  - Codex mapping excludes shared SessionStart.
  - Claude mapping includes shared SessionStart and workflow-state.
  - Every mapped hook resolves to a real template file.

- U2. Projection collector integration

  Goal: Make init/sync/update collect hooks through the shared hook registry instead of directly walking hook directories for shared files.

  Files:
  - Modify: `lib/utils/agent-os.js`
  - Test: `tests/agent-init.test.js`

  Approach:
  - Continue collecting platform-specific Codex hooks from `templates/codex-hooks/`.
  - Stop directly collecting Claude hook directory files.
  - Add shared hook templates for each platform from the registry.
  - Use `sourcePath` so hashing, sync, and update reuse existing projection logic.

  Test scenarios:
  - Init generates `.claude/hooks/shelf-session-start.py`.
  - Init generates `.claude/hooks/shelf-inject-workflow-state.py`.
  - Init generates `.codex/hooks/shelf-inject-workflow-state.py`.
  - Init still generates `.codex/hooks/shelf-session-start.py`.

- U3. Shared template source

  Goal: Move reusable Python hook templates into shared source without changing generated paths.

  Files:
  - Create: `templates/core/.shelf/templates/shared-hooks/shelf-session-start.py`
  - Create: `templates/core/.shelf/templates/shared-hooks/shelf-inject-workflow-state.py`
  - Delete: `templates/core/.shelf/templates/claude-hooks/shelf-session-start.py`
  - Delete: `templates/core/.shelf/templates/codex-hooks/shelf-inject-workflow-state.py`

  Approach:
  - Reuse the current Claude SessionStart implementation as the shared SessionStart template.
  - Reuse the current Codex workflow-state implementation as the shared workflow-state template.
  - Keep generated file names unchanged.

  Test scenarios:
  - Python templates compile.
  - Generated Claude settings can reference both hook files.

## Verification

- `python -m py_compile templates/core/.shelf/templates/shared-hooks/shelf-session-start.py templates/core/.shelf/templates/shared-hooks/shelf-inject-workflow-state.py templates/core/.shelf/templates/codex-hooks/shelf-session-start.py`
- `node --test --test-name-pattern "platform registry describes Codex and Claude capabilities|shared hook registry" tests/platform-registry.test.js`
- `node --test --test-name-pattern "injects full Shelf workflow|injects core-only workflow" tests/agent-init.test.js`

## Remaining Difference Notes

After this pass, Shelf will have the foundation Trellis uses for hook distribution, but it will still be smaller:

- No `inject-subagent-context.py` yet.
- No Cursor shell-session hook yet.
- No broad Trellis platform capability matrix yet.
- Shared hook registry is CommonJS and Shelf-specific rather than Trellis' TypeScript implementation.
