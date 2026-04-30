---
title: Trellis Deep Analysis and Current Agent OS Gaps
date: 2026-04-30
status: active
source:
  - https://github.com/mindfold-ai/Trellis
  - https://github.com/mindfold-ai/Trellis/blob/main/README.md
  - .cache/trellis-src
related:
  - docs/plans/agent-os-trellis-inspired-refactor-plan.md
  - docs/solutions/tooling-decisions/borrow-trellis-patterns-for-agent-template-maintenance-2026-04-30.md
  - docs/vue-template-review-issues.md
---

# Trellis Deep Analysis and Current Agent OS Gaps

## Analysis Scope

This document distills a local source review of `mindfold-ai/Trellis` cloned into `.cache/trellis-src` on 2026-04-30, plus a comparison against the current `agentos-cli` codebase.

The goal is not to copy Trellis. The goal is to understand why Trellis' architecture is durable, then identify where this project is currently fragile while it is being refactored toward a lighter Agent OS initializer.

## Trellis Architecture Summary

Trellis is a team-scale AI coding harness. It installs `.trellis/` as the project source of truth, then generates platform-specific files for tools such as Claude Code, Cursor, Codex, OpenCode, Gemini, GitHub Copilot, Factory Droid, Pi Agent, and others.

Important layers:

- `.trellis/spec/`: project and team coding standards. Trellis treats this as user-maintained knowledge, not a template that updates should overwrite.
- `.trellis/tasks/`: task PRDs, task metadata, context manifests, acceptance notes, and archives.
- `.trellis/workspace/`: developer-local session journals and handoff memory.
- `.trellis/workflow.md`: shared lifecycle and phase model.
- platform adapters: generated commands, skills, hooks, agents, prompts, config files, and settings for each AI tool.
- `.trellis/.template-hashes.json`: hash tracking for managed template files.
- `.trellis/.version`: installed Trellis version, used to decide update direction.

The Trellis CLI has two core commands:

- `trellis init`: detect project shape, create `.trellis`, configure selected platforms, initialize developer identity, write bootstrap or joiner tasks, and initialize template hashes.
- `trellis update`: compare installed version and current CLI version, collect configured platform templates, classify changes, preserve protected user data, apply migrations, and update hashes after accepted writes.

The source organization matters:

- `packages/cli/src/types/ai-tools.ts` is the platform data registry.
- `packages/cli/src/configurators/index.ts` is the platform behavior registry.
- `packages/cli/src/configurators/*.ts` owns each platform's generated layout.
- `packages/cli/src/configurators/workflow.ts` owns `.trellis` workflow structure.
- `packages/cli/src/utils/template-hash.ts` owns hash storage, LF normalization, POSIX path keys, and modification detection.
- `packages/cli/src/commands/update.ts` owns update classification, protected paths, backups, migrations, conflict resolution, and version stamping.

## Patterns Worth Borrowing

Borrow these patterns because they directly reduce risk in this project:

- A single registry for supported tools. Tool metadata and tool behavior should be derived from one place, instead of scattering `codex` and `claude` path checks across actions and utilities.
- Explicit source-of-truth boundaries. `.agent-os/` should be maintained source; `AGENTS.md`, `CLAUDE.md`, `.codex/`, and `.claude/` should be projections.
- Template hashes for managed generated files. Store hashes at init/sync/update time so the CLI can distinguish clean generated files from user-edited files.
- Protected user-data directories. Specs, tasks, workspace memory, and user journals should not be overwritten by template updates.
- Write modes. `ask`, `force`, `skip`, and eventually `create-new` are safer than all-or-nothing overwrite.
- Update classification. New, unchanged, auto-updateable, user-modified, deleted, protected, and migration-required files need different behavior.
- Platform-specific rendering. Codex and Claude do not have identical capabilities, so their projections should not be identical copies with different root paths.
- Version and migration metadata. Breaking template moves should be gated and documented instead of silently deleting old paths.

## Patterns To Avoid For Now

Avoid these Trellis patterns in the next phase because they would make this project too heavy:

- Full task runtime with Python scripts, JSONL context manifests, active task state, and automatic context injection.
- Broad platform matrix beyond Codex and Claude before the two current adapters are reliable.
- Hook-heavy automation as a default install requirement.
- Remote spec template marketplace and registry download flow.
- Sub-agent orchestration or task lifecycle commands before the initializer, sync, doctor, and update foundations are safe.

## Current Project Reality

This project has already moved partway toward the intended architecture:

- `templates/core/.agent-os` exists.
- `templates/stacks/vue/.agent-os` exists.
- `templates/tools/codex/tool.json` and `templates/tools/claude/tool.json` exist.
- `lib/utils/tool-layouts.js` exists.
- `agent init` accepts `--stack` and `--tools`.
- legacy `scripts/sync-agent-os.ps1` generation has been removed.

However, implementation is still structurally closer to a template copier than a maintainable Agent OS layer.

Current command surface:

- `agentos-cli agent init`
- `agentos-cli agent skills import`

Current implementation hotspots:

- `lib/actions/agent-init.js`
- `lib/utils/agent-os.js`
- `lib/utils/tool-layouts.js`
- `lib/actions/agent-skills-import.js`
- `templates/core/**`
- `templates/stacks/vue/**`

## Main Gaps

### 1. `.agent-os` Is Not Always The Source Of Truth

`usesAgentOs()` currently returns true only when more than one tool is selected. For Codex-only or Claude-only installs, `.agent-os/` is not written and projections are copied from template roots.

This conflicts with the project direction in `templates/core/.agent-os/rules/AGENTS.shared.md`, which says `.agent-os/` is the maintained source and platform files are generated projections.

Risk:

- single-tool projects cannot later run a true `.agent-os` sync/update workflow because the source was never installed.
- imported skills in auto mode behave differently depending on whether `.agent-os/skills` exists.
- future `sync`, `doctor`, and `update` commands will need special cases for single-tool installs.

Recommendation:

- always install `.agent-os/` as the source by default, even for a single selected tool.
- if a lightweight single-tool projection mode is kept, name it explicitly as a temporary/local mode and do not call it the main Agent OS model.

### 2. Tool Adapter Layer Is Too Thin

`lib/utils/tool-layouts.js` currently stores only entry file and skills directory metadata. Trellis' platform registry separates platform data from platform behavior and derives configured paths, managed paths, templates, hooks, agents, skills, and update collection from the registry.

Risk:

- adding commands, prompts, hooks, or agents will require scattered logic changes.
- update/sync cannot ask an adapter which files it owns.
- Codex/Claude projection differences will be flattened into copy behavior.

Recommendation:

- replace `TOOL_LAYOUTS` with a tool registry that includes `entryFile`, `rootDirectory`, `skillsDirectory`, optional paths, managed paths, and projection functions.
- require each adapter to expose `collectTemplates()` or equivalent so update and dry-run can reason about generated files.

### 3. No Hash-Based Update Safety

`templates/core/.agent-os/manifest.template.json` exists, but init does not write a real manifest or template hash record. Conflict handling is still path-level overwrite confirmation.

Risk:

- future update cannot distinguish user modifications from template changes.
- `--force` can wipe entire managed directories.
- sync/update behavior will become unsafe as soon as users edit generated `AGENTS.md`, `CLAUDE.md`, or skills.

Recommendation:

- add `.agent-os/template-hashes.json` or `.agent-os/.template-hashes.json`.
- normalize line endings before hashing.
- store POSIX-style relative paths even on Windows.
- hash only managed generated files; exclude user source data such as specs, tasks, workspace, and local identity.

### 4. Conflict Handling Is Directory-Destructive

`agent-init` removes whole conflict targets such as `.claude`, `.codex`, and `.agent-os` before copying templates. This is acceptable for a first scaffold prototype, but not for a maintainable Agent OS CLI.

Risk:

- user-added skills, commands, prompts, hooks, or local settings under managed roots can be deleted.
- reinitializing from two tools to one tool removes `.agent-os`, which undermines the source-of-truth model.
- future tool adapters cannot protect non-owned files inside a managed root.

Recommendation:

- move from root-directory deletion to file-level ownership.
- keep managed file lists in manifest/hash metadata.
- delete stale files only when they are hash-verified clean generated files or when the user explicitly confirms.

### 5. Existing Plan Mentions Commands That Do Not Exist Yet

The current refactor plan correctly names `sync`, `doctor`, and `update`, but the CLI currently exposes only `init` and `skills import`.

Risk:

- architecture docs are ahead of implementation.
- next contributors may implement template moves without creating the safety commands those moves depend on.

Recommendation:

- implement `doctor` before broad update behavior.
- implement `sync --dry-run` before destructive sync.
- implement `update --dry-run` before normal `update`.

### 6. Template Metadata Is Not Used

`templates/tools/*.json`, `templates/stacks/vue/stack.json`, and `manifest.template.json` currently act as static docs, not driving code.

Risk:

- code and template metadata drift.
- supported stack/tool lists stay hardcoded in `lib/utils/agent-os.js`.
- adding a stack or tool means editing several files manually.

Recommendation:

- load available stacks from `templates/stacks/*/stack.json`.
- load tools from `templates/tools/*/tool.json`.
- fail tests if metadata and code registry disagree.

### 7. Project Detection Is Missing

Trellis detects project type and monorepo shape to create relevant spec scaffolding. This project currently requires `--stack`, defaults to `core`, and does not inspect the target project.

Risk:

- Vue projects can receive only core unless the user knows the stack flag.
- non-Vue projects can accidentally receive Vue skills.
- guided init cannot make useful recommendations.

Recommendation:

- add read-only detection for package manager, `package.json`, Vue dependencies, existing agent files, and git status.
- use detection to recommend, not silently decide.

### 8. Vue Stack Is Still Too Heavy And Leaky

The Vue stack contains valuable knowledge, but the review in `docs/vue-template-review-issues.md` still applies:

- `mastergo-to-code` has platform path assumptions and missing runtime dependency documentation.
- `ui-ux-pro-max` still includes broad multi-stack content and can pull agents away from Vue web work.
- several skills have strong always-on language that can over-trigger.
- some script paths are not aligned with actual installed locations.

Risk:

- generated agents may fail at runtime even after the CLI install succeeds.
- Vue stack can pollute core Agent OS behavior.
- large skill packs increase maintenance cost before sync/update safety exists.

Recommendation:

- reduce Vue pack to a reliable minimum before expanding.
- make heavy skills opt-in or clearly stack-scoped.
- fix platform-relative paths before calling the stack production-ready.

## Immediate Problem Analysis

The biggest current problem is not that the project has failed to learn from Trellis. It has learned the right shape, but only at the document and directory level.

The implementation has not yet crossed the boundary from "copy selected files" to "own a lifecycle." Trellis' durability comes from lifecycle ownership:

- know what was generated.
- know what the user changed.
- know what must never be overwritten.
- know what each platform owns.
- know how to preview before writing.
- know how to migrate when paths change.

`agentos-cli` currently owns first install, but not maintenance. That is why further template expansion will increase risk until manifest, hash tracking, sync dry-run, and doctor are in place.

## Recommended Next Step

Do not add more stack packs yet.

Implement the next phase in this order:

1. Install `.agent-os` consistently as source of truth. Done in the first lifecycle foundation pass.
2. Add manifest and template hash tracking. Done in the first lifecycle foundation pass.
3. Add a tool registry that drives projection and managed file lists. Partially done: tool layouts now expose managed paths, but projection ownership should still move behind richer adapters.
4. Add `agent doctor` as a read-only consistency check. Done in the first lifecycle foundation pass.
5. Add `agent sync --dry-run`, then `agent sync`. Done in the first lifecycle foundation pass.
6. Only after sync is safe, add `agent update --dry-run`.

This keeps the project lightweight while borrowing the Trellis parts that matter most.
