---
title: Agent OS Trellis-Inspired Refactor Plan
date: 2026-04-30
status: active
origin:
  - docs/solutions/tooling-decisions/borrow-trellis-patterns-for-agent-template-maintenance-2026-04-30.md
  - docs/vue-template-review-issues.md
---

# Agent OS Trellis-Inspired Refactor Plan

## Problem Frame

The current project started as a Vue-focused workflow injector for Codex and Claude Code. That direction is too narrow for the intended product: the project should become a lightweight Agent OS initializer and maintenance CLI.

Trellis provides the right conceptual model: maintain one project source of truth, then generate platform-specific projections for each agent tool. The goal is to borrow that model without copying Trellis' heavier runtime, task orchestration, or full multi-platform matrix.

The refactor should improve:

- Terminal interaction: guide users through detection, choices, preview, confirmation, and next steps.
- Template architecture: separate core Agent OS, stack skill packs, and platform adapters.
- Synchronization model: generate Codex and Claude projections from `.agent-os`, not through a user-maintained explanatory sync script.
- Upgrade safety: record template provenance and hashes so updates do not blindly overwrite user edits.
- Extensibility: Vue becomes the first optional stack pack, not the only preset.

## Product Direction

`agentos-cli` should become:

> A lightweight CLI that initializes and maintains an Agent OS layer for an existing project, with a shared `.agent-os` source, optional stack skill packs, and platform-specific projections for Codex, Claude Code, and future tools.

This means the project should stop treating `templates/presets/vue` as the root design. Vue should become one installable stack pack layered on top of a core Agent OS template.

## Non-Goals

- Do not copy Trellis' full task JSONL runtime.
- Do not implement complex SessionStart hooks or agent runtime orchestration in the first refactor.
- Do not expand immediately to every Trellis-supported platform.
- Do not make Vue mandatory.
- Do not make users manually maintain duplicated Codex and Claude rule files.

## Target Template Architecture

Replace the current preset-first layout:

```text
templates/presets/vue/
```

with a layered layout:

```text
templates/
  core/
    .agent-os/
      rules/
      specs/
      skills/
      templates/
      manifest.template.json

  stacks/
    vue/
      skills/
      specs/
      stack.json
    react/
      skills/
      specs/
      stack.json
    nest/
      skills/
      specs/
      stack.json

  tools/
    codex/
      tool.json
      entry/
      prompts/
      skills/
    claude/
      tool.json
      entry/
      commands/
      agents/
      hooks/
      skills/
```

Only `core` and `stacks/vue` need to exist in the first implementation. `react` and `nest` are placeholders for the design, not immediate deliverables.

## Unified Source Model

`.agent-os/` is the source of truth. Platform directories are generated projections.

Source of truth:

```text
.agent-os/
  rules/
  specs/
  skills/
  stacks/
  workspace/
  manifest.json
  template-hashes.json
```

Generated Codex projection:

```text
AGENTS.md
.codex/
  skills/
  prompts/
  agents/
```

Generated Claude Code projection:

```text
CLAUDE.md
.claude/
  skills/
  commands/
  agents/
  hooks/
```

The CLI should synchronize by regenerating projections from `.agent-os`. Codex and Claude should not be synchronized from each other.

## Platform Projection Principles

Codex and Claude should not receive identical directory trees by default. The projection must respect each tool's capabilities.

Codex projection should focus on:

- `AGENTS.md` as the primary entry instruction.
- `.codex/skills` for Codex-readable skills.
- `.codex/prompts` when prompt-like reusable workflows are needed.
- `.codex/agents` only if the local Codex environment supports that convention.

Claude Code projection should focus on:

- `CLAUDE.md` as the primary entry instruction.
- `.claude/skills` for skills.
- `.claude/commands` for slash-command workflows when useful.
- `.claude/agents` for sub-agent definitions when useful.
- `.claude/hooks` only when a workflow genuinely needs automation.

The first refactor should support the directory model without requiring every directory to be populated.

## Terminal Interaction Design

The CLI should move from parameter-first injection to a guided install flow.

Recommended `agentos-cli init` flow:

1. Detect project context:
   - package manager
   - package.json
   - git status
   - existing `AGENTS.md`, `CLAUDE.md`, `.agent-os`, `.codex`, `.claude`
   - likely stack: Vue, React, Nest, unknown

2. Recommend install profile:
   - Core Agent OS only
   - Core Agent OS plus detected stack
   - Custom

3. Select platforms:
   - Codex
   - Claude Code
   - Codex plus Claude Code

4. Select stack packs:
   - Core only
   - Vue
   - Manual selection

5. Preview changes before writing:
   - files to create
   - files to update
   - files with conflicts
   - package.json script changes
   - files that will not be touched

6. Confirm and apply.

7. Show next steps:
   - `agentos-cli doctor`
   - `agentos-cli sync`
   - `agentos-cli update --dry-run`

The important behavior is: detect first, recommend second, preview third, write last.

## Command Set

First implementation target:

```bash
agentos-cli init
agentos-cli sync
agentos-cli doctor
agentos-cli update --dry-run
agentos-cli update
agentos-cli skills list
agentos-cli skills add vue
```

Later:

```bash
agentos-cli tools add codex
agentos-cli tools add claude
agentos-cli task new <name>
agentos-cli memory add
agentos-cli repair
```

## Template Hash and Manifest Design

Add generated metadata:

```text
.agent-os/manifest.json
.agent-os/template-hashes.json
```

`manifest.json` should record:

- CLI version
- installed core template version
- installed stack packs
- enabled tools
- generated file list
- source template ids

`template-hashes.json` should record:

- generated file path
- source template path or id
- hash at generation time
- generated hash
- timestamp

`agentos-cli update --dry-run` should classify files as:

- `safe-to-update`: user has not changed generated file.
- `user-modified`: user changed generated file, skip unless confirmed.
- `template-changed`: upstream template changed and local file is still clean.
- `conflict`: upstream template changed and user also changed local file.
- `missing`: generated file was deleted.

This replaces blind overwrite as the default upgrade model.

## Core Skill Pack

The base installation should include essential, non-framework-specific skills. These should be smaller than the current Vue-specific skill set.

Recommended core skills:

- `project-context`: understand project structure before changes.
- `planning`: decide scope, non-goals, and acceptance checks.
- `implementation`: protect user changes and follow existing patterns.
- `verification`: choose risk-based tests and checks.
- `debugging`: investigate errors without guessing.
- `documentation`: persist reusable decisions and lessons.

These core skills should not assume Vue, React, or Nest.

## Vue Stack Pack

The existing Vue preset should become `templates/stacks/vue`.

Vue pack should include:

- `vue-best-practices`
- `vue-router-best-practices`
- `vue-pinia-best-practices`
- `vue-testing-best-practices`
- `vue-debug-guides`
- `vue-jsx-best-practices`
- `vue-options-api-best-practices`

Vue-specific rules should move out of core rules and into Vue stack specs or skills.

## Sync Strategy

The current `scripts/sync-agent-os.ps1` should not remain the primary synchronization mechanism.

Preferred model:

- `agentos-cli sync` is the canonical sync command.
- It reads `.agent-os/manifest.json` and installed stack/tool metadata.
- It regenerates platform projections through tool adapters.
- It updates hash records after successful writes.
- It reports skipped files and conflicts clearly.

A generated script may remain as a convenience wrapper only if needed, but it should call the CLI rather than implementing independent sync logic.

## Implementation Units

### Unit 1: Template Layout Restructure

Files likely affected:

- `templates/core/**`
- `templates/stacks/vue/**`
- `templates/tools/codex/**`
- `templates/tools/claude/**`
- `lib/utils/agent-os.js`

Decision:

Move from preset-first to layered templates. This is a major-version refactor, so no `--preset vue` compatibility layer is required. The CLI should use `--stack`; `core` is the default base stack and `vue` is an optional stack pack.

Test scenarios:

- Init with no stack creates core files only.
- Init with `--stack vue` creates core plus Vue stack content.

### Unit 2: Tool Adapter Layer

Files likely affected:

- `lib/utils/agent-os.js`
- `lib/utils/tool-layouts.js`
- `lib/actions/agent-init.js`
- tests under `tests/`

Decision:

Represent Codex and Claude as adapters. Each adapter owns entry files, skill directories, optional prompt/command directories, and projection behavior.

Test scenarios:

- Codex-only init creates `AGENTS.md` and `.codex/skills`.
- Claude-only init creates `CLAUDE.md` and `.claude/skills`.
- Codex plus Claude init creates `.agent-os` and both projections.
- Skill content is generated from `.agent-os`, not copied from another platform directory.

### Unit 3: Guided Terminal Flow

Files likely affected:

- `lib/actions/agent-init.js`
- `bin/cli.js`
- tests under `tests/`

Decision:

Add detection, recommendation, preview, and confirmation before file writes. Keep non-interactive flags for automation.

Test scenarios:

- Interactive flow recommends Vue stack when Vue is detected.
- Non-interactive flags bypass prompts.
- Preview reports create/update/conflict groups.
- User cancellation writes no files.

### Unit 4: Manifest and Template Hashes

Files likely affected:

- `lib/utils/agent-os.js`
- `lib/utils/hash.js`
- `lib/actions/agent-init.js`
- `lib/actions/agent-update.js`
- tests under `tests/`

Decision:

Track generated file provenance and local hashes. Use this for update safety.

Test scenarios:

- Init writes `.agent-os/manifest.json`.
- Init writes `.agent-os/template-hashes.json`.
- `update --dry-run` identifies clean files.
- `update --dry-run` identifies user-modified files.
- `update --dry-run` identifies conflicts when template and user file both changed.

### Unit 5: Sync Command

Files likely affected:

- `bin/cli.js`
- `lib/actions/agent-sync.js`
- `lib/utils/agent-os.js`
- `templates/core/**`
- tests under `tests/`

Decision:

Make `agentos-cli sync` the canonical way to regenerate platform projections. Keep any generated PowerShell script as a wrapper only, or remove it after migration.

Test scenarios:

- Sync regenerates Codex projection from `.agent-os`.
- Sync regenerates Claude projection from `.agent-os`.
- Sync does not overwrite user-modified projection files unless forced.
- Sync reports missing, skipped, and regenerated files.

### Unit 6: Doctor Command

Files likely affected:

- `bin/cli.js`
- `lib/actions/agent-doctor.js`
- tests under `tests/`

Decision:

Add a read-only health check command to validate installed Agent OS structure.

Test scenarios:

- Doctor passes for a clean install.
- Doctor warns when `.agent-os` exists but Codex projection is missing.
- Doctor warns when installed stack pack is not projected to one enabled tool.
- Doctor flags unsupported or stale manifest versions.

## Migration Strategy

This refactor is intended for a major npm release, so compatibility with the old preset layout is not required.

1. Remove `templates/presets/vue`.
2. Use `templates/core` as the default install source.
3. Use `templates/stacks/vue` when `--stack vue` is selected.
4. Remove the `--preset` CLI option.
5. Update tests and documentation to use stack terminology only.

## Risks

- Large template moves may break npm package contents. Verify with `npm pack --dry-run`.
- Terminal UX can become too complex. Keep defaults recommended and make custom paths optional.
- Platform adapters can become over-abstracted. Start with Codex and Claude only.
- Hash tracking can be confusing if generated files are edited often. Reports must clearly explain safe, skipped, and conflict states.
- Removing the preset path is a breaking change. Call it out clearly in release notes.

## Validation Plan

Run after each implementation phase:

- `npm test`
- `npm pack --dry-run`
- Init into a temporary fixture project with Codex only.
- Init into a temporary fixture project with Claude only.
- Init into a temporary fixture project with Codex plus Claude plus Vue stack.
- Run `agentos-cli doctor` against generated fixtures.
- Run `agentos-cli update --dry-run` after editing a generated file to confirm conflict detection.

## Open Questions

- Should `.agent-os/template-hashes.json` be tracked by Git, or treated as local install metadata?
- Should generated platform projections be tracked by Git by default, or should only `.agent-os` be tracked?
- Should `agentos-cli sync` ever delete stale platform files automatically, or only report them?
- Should stack packs be installed into `.agent-os/stacks/<name>` or merged into `.agent-os/skills` and `.agent-os/specs`?
- Should the first release include `update`, or should `doctor` and `sync` land first?

## Initial Recommendation

Start with three changes before any broader rewrite:

1. Introduce the `core / stacks / tools` template layout.
2. Add a Codex/Claude adapter layer.
3. Add a dry-run preview for init output.

These create the foundation for Trellis-style projection without forcing the project into a heavy runtime model.
