# Shelf Architecture Upstream Comparison

Date: 2026-05-01

This document compares the current AgentOS Shelf implementation in this repository with the local upstream reference at `.tmp/Trellis-main`.

Scope: architecture, templates, projection behavior, runtime workflow support, update safety, and future extension opportunities. Team collaboration rule definition and Vue/framework customization remain out of scope.

## Executive Summary

The current project has successfully moved from a small Agent OS scaffold toward a Shelf-style workflow source model:

- `.shelf/` is now the shared source of truth.
- Workflow skills were migrated from the upstream workflow set and renamed to `agentos-*`.
- Shared agents now exist under `.shelf/agents` and project into `.codex/agents` / `.claude/agents`.
- `AGENTS.md` is intentionally thin, while `CLAUDE.md` references `AGENTS.md` instead of duplicating all rules.
- `init`, `sync`, `doctor`, and `skills import` support the current Codex/Claude projection model.

This project should remain a lightweight AgentOS Shelf CLI rather than becoming a full Trellis clone. The upstream reference is valuable because its core foundation matches the intended direction: file-backed context, task-driven work, lightweight rule projection, reusable skills, and project memory. Future work should selectively absorb the parts that strengthen those foundations without inheriting every platform integration, migration layer, or hook system.

The next priority is therefore not "close every upstream gap." It is to keep strengthening the local foundation: runtime context loading, conservative updates, useful spec templates, and explicit commands that turn generic templates into project reality without making init heavy.

## Current Project Architecture

### CLI Entrypoint

Files:

- `bin/cli.js`
- `lib/commands/agent.js`

Current commands:

- `agent init`: writes `.shelf` plus selected tool projections.
- `agent developer init`: delegates developer identity setup to `.shelf/scripts/init_developer.py`.
- `agent task`: delegates task lifecycle operations to `.shelf/scripts/task.py`.
- `agent doctor`: checks required Shelf files, selected tool directories, and warns when detected workspace packages do not yet have package specs.
- `agent sync`: regenerates projections from `.shelf`.
- `agent update`: conservatively updates projections with backups and protected deletes.
- `agent spec scaffold`: generates package-specific spec folders for workspace packages.
- `agent skills import`: imports external skill directories into Shelf or tool-specific destinations.

Assessment:

- Good fit for a small, npm-distributed CLI.
- Command surface is intentionally smaller than upstream.
- The CLI now has light wrappers for developer setup, task operations, update safety, and package spec scaffolding, but still has no platform hook installation command or worktree orchestration command.
- This is an intentional product direction for now: the CLI should stay approachable while the Shelf foundation stabilizes.

## Directional Choice: Same Foundation, Different Trajectory

AgentOS Shelf should copy the upstream project's durable ideas, not its full weight:

- **Keep:** `.shelf` as source of truth, thin root rules, task folders, specs, skills, agents, workspace memory, safe projection sync.
- **Add carefully:** richer context-loading hooks, one platform at a time, concrete migrations only when the Shelf schema needs them, and worktree orchestration after task lifecycle commands are stable.
- **Defer:** 14-platform configurators, full hook matrix, update/migration engine, framework-specific packs, and team collaboration policy authoring.

This means an upstream feature being absent is not automatically a defect. It is a candidate only if it improves the lightweight AgentOS/Shelf workflow.

### Shelf Source Template

Files/directories:

- `templates/core/.shelf/workflow.md`
- `templates/core/.shelf/config.yaml`
- `templates/core/.shelf/scripts/`
- `templates/core/.shelf/skills/`
- `templates/core/.shelf/agents/`
- `templates/core/.shelf/spec/README.md`
- `templates/core/.shelf/tasks/README.md`
- `templates/core/.shelf/workspace/README.md`
- `templates/core/.shelf/rules/AGENTS.shared.md`
- `templates/core/.shelf/templates/CLAUDE.md`

Assessment:

- The migrated workflow, scripts, core skills, and agents have direct upstream counterparts.
- The spec/tasks/workspace directories now include generic templates and a static bootstrap guidelines task, but do not yet include upstream's dynamic onboarding generation.
- `.shelf/config.yaml` contains upstream-style runtime settings, but the CLI does not yet use most of them.
- `.shelf/workflow.md` includes runtime breadcrumb contracts that assume hooks or platform preludes exist; Codex implement/check agents now get a pull-based prelude, while hook-based injection is still deferred.

### Projection Model

Files:

- `templates/tools/codex/tool.json`
- `templates/tools/claude/tool.json`
- `lib/utils/tool-layouts.js`
- `lib/utils/agent-os.js`

Current behavior:

- Codex receives:
  - `AGENTS.md`
  - `.codex/skills/*`
  - `.codex/agents/*`
- Claude receives:
  - `CLAUDE.md`
  - `.claude/skills/*`
  - `.claude/agents/*`

Assessment:

- The shared-source-to-tool-projection architecture is clean and easy to reason about.
- The projection is file-copy based; there is no upstream-style placeholder resolver per platform.
- Tool definitions are JSON-driven, but only Codex and Claude are supported.
- `optionalDirs` is metadata only; it does not currently drive hook/settings generation.

### Manifest and Hash Tracking

Files:

- `lib/utils/template-hash.js`
- `lib/actions/agent-sync.js`
- `lib/utils/agent-os.js`

Current behavior:

- `.shelf/manifest.json` stores selected tools, generated files, CLI version, and stack metadata.
- `.shelf/template-hashes.json` stores template hashes.
- `sync` classifies projection files as create, update, unchanged, user-modified, or conflict.
- User-modified projection files are skipped during sync.
- For managed root blocks such as `AGENTS.md`, hash comparison is scoped to the Shelf block so user-authored text outside the block is preserved.
- `agent update` writes `.shelf/update-manifest.json` with from/to CLI versions, lightweight migration records, backups, deletes, skipped writes, and skipped deletes.
- `.shelf/update.skip` can freeze exact generated files or generated directories during update.

Assessment:

- This is enough for safe projection regeneration and conservative updates.
- It is intentionally simpler than upstream's migration engine, but now covers the lightweight versioned update record and operator-controlled skip file needed for safe iteration.

### Rules Model

Files:

- `templates/core/.shelf/rules/AGENTS.shared.md`
- `templates/core/.shelf/templates/CLAUDE.md`

Current behavior:

- `AGENTS.md` gets a small managed Shelf block.
- `CLAUDE.md` tells Claude to follow `AGENTS.md` and adds Claude-specific behavioral guidance.

Assessment:

- This matches the desired direction: rules stay thin and avoid dumping all workflow content into the root files.
- It is conceptually aligned with upstream's managed-block approach.
- `sync` now replaces only the managed Shelf block in `AGENTS.md`; user-authored content outside the block remains intact.

## Upstream Architecture Reference

The upstream reference is broader than the checked-in `.trellis/agents` and `.agents/skills` directories. Important architecture lives in:

- `.tmp/Trellis-main/.trellis/`
- `.tmp/Trellis-main/.agents/skills/`
- `.tmp/Trellis-main/packages/cli/src/types/ai-tools.ts`
- `.tmp/Trellis-main/packages/cli/src/configurators/`
- `.tmp/Trellis-main/packages/cli/src/templates/common/`
- `.tmp/Trellis-main/packages/cli/src/templates/shared-hooks/`
- `.tmp/Trellis-main/packages/cli/src/templates/trellis/`
- `.tmp/Trellis-main/packages/cli/src/commands/init.ts`
- `.tmp/Trellis-main/packages/cli/src/commands/update.ts`
- `.tmp/Trellis-main/packages/cli/src/utils/template-hash.ts`
- `.tmp/Trellis-main/packages/cli/src/migrations/`

Key upstream ideas:

- Central `AI_TOOLS` registry for platform capabilities.
- Platform configurators instead of one generic copy loop.
- Common workflow templates rendered differently per platform.
- Shared hooks for session start, per-turn workflow state, and sub-agent context injection.
- Rich spec scaffolding for backend/frontend/guides and monorepo packages.
- Bootstrap and joiner onboarding tasks.
- Python version detection and platform-specific Python command rendering.
- Version file, update command, migration manifests, safe file deletion, protected paths, and backups.
- Managed block replacement for root files and runtime-critical workflow blocks.

## Capability Matrix

| Capability | Current Project | Upstream Reference | Status |
|---|---|---|---|
| Shared workflow source directory | `.shelf/` | `.trellis/` | Covered |
| Core workflow skills | `agentos-before-dev`, `agentos-brainstorm`, `agentos-break-loop`, `agentos-check`, `agentos-continue`, `agentos-finish-work`, `agentos-meta`, `agentos-update-spec` | `trellis-*` skills | Covered |
| Shared implement/check/research agents | `.shelf/agents` projects to Codex/Claude | Platform-specific agents | Partially covered |
| Thin root AGENTS rules | `AGENTS.shared.md` with block-level sync | managed `AGENTS.md` block | Covered |
| Claude references AGENTS | `CLAUDE.md` shim | upstream also treats AGENTS as shared rules source | Covered |
| Task directory model | `.shelf/tasks`, bootstrap task, and `agent task` passthrough | full `.trellis/tasks` lifecycle | Partially covered |
| Project memory | workspace directory, journal scripts, and `agent developer init` wrapper | journal/index system with init/onboarding | Partially covered |
| Spec injection | generic specs exist; Codex implement/check agents load context explicitly | hooks/preludes inject curated specs | Partially covered |
| Automatic session context injection | pull-based Codex prelude plus lightweight Claude session-start hook | shared hooks/plugins/settings | Selective |
| Platform capability registry | Codex/Claude registry with capability flags | 14-platform `AI_TOOLS` registry | Partial |
| Rich spec bootstrap | backend/frontend/guides templates plus explicit package spec scaffolding without framework-specific packs | backend/frontend/guides templates and monorepo detection | Selective |
| Bootstrap task | static `00-bootstrap-guidelines` template | `00-bootstrap-guidelines` | Selective |
| Joiner onboarding | explicit `agent developer join <name>` task generator | `00-join-<developer>` | Selective |
| Native update/migration | conservative `agent update` with backups, protected paths, safe deletes, `update.skip`, and lightweight versioned update manifest | full `update` with migrations | Selective |
| Internal `.shelf` ignore rules | `.shelf/.gitignore` template | `.trellis/.gitignore` | Covered |
| Python requirement check | `doctor` warns when Python is missing | Python >= 3.9 check | Partial |
| Managed block replacement | block-level `AGENTS.md` handling | block-level AGENTS/workflow handling | Partial |
| Open Agent Skills projection | `.agents/skills` generated from `.shelf/skills` for Codex | `.agents/skills` shared layer | Covered for Codex |
| Multi-platform reuse | Codex + Claude only | 14 platforms | Partial by design |

## Core Advantages Coverage

### Automatic Spec Injection

Current state:

- `.shelf/spec/` exists.
- `agentos-before-dev`, `agentos-check`, and workflow docs instruct agents to read relevant specs.
- `implement.jsonl` and `check.jsonl` are part of the task model.
- Generic backend/frontend/guides spec templates are included.
- Codex implement/check agents include a pull-based Shelf context prelude.
- Claude installs a minimal session-start hook/settings pair that reminds sessions to read Shelf context.

Gap:

- Claude hook generation is intentionally reminder-only; it does not yet inject curated task/spec context.

Recommended next step:

- Decide whether Claude should remain reminder-only or grow into curated hook injection once real usage proves the need.

### Task-Driven Workflow

Current state:

- `.shelf/tasks/` exists.
- `task.py` and common task utilities are present.
- `agent task [args...]` delegates to `.shelf/scripts/task.py`.
- A static `00-bootstrap-guidelines` task is included in the template.
- `agent developer join <name>` creates an explicit onboarding task when needed.
- Workflow skills reference PRD, `info.md`, `implement.jsonl`, `check.jsonl`, research files, and task status.

Gap:

- `agent init` does not automatically generate developer-specific onboarding tasks.
- The Node wrapper intentionally does not reimplement task logic.

Recommended next step:

- Keep task logic in Python for now and improve docs/examples around the passthrough CLI.
- Keep developer-specific onboarding explicit through `agent developer join`.

### Parallel Agent Execution

Current state:

- `.shelf/agents` has research/implement/check definitions.
- Tool projections write agents to `.codex/agents` and `.claude/agents`.
- `AGENTS.md` tells agents to spawn subagents when useful.

Gap:

- No worktree orchestration or platform-specific agent capability model exists in this CLI.
- Current agents are copied verbatim and are not adapted per platform.

Recommended next step:

- Keep first implementation simple: add per-platform agent transformations first.
- Defer full worktree orchestration until task lifecycle commands are stable.

### Project Memory

Current state:

- `.shelf/workspace/` exists.
- `add_session.py` and journal utilities are present.
- `agent developer init <name>` delegates to `.shelf/scripts/init_developer.py`.
- Claude receives a lightweight session-start reminder hook.

Gap:

- No automatic session-start or finish-work hook writes journal entries.
- Developer initialization is available as an explicit command, not as an automatic `agent init` step.

Recommended next step:

- Consider hook-based journal capture later; keep the current hook reminder-only for now.

### Multi-Platform Reuse

Current state:

- The structure is portable in principle.
- Codex and Claude are supported.
- Platform capabilities are now centralized in a small registry.
- Codex receives `.agents/skills` as an open skills projection.

Gap:

- No upstream-scale `AI_TOOLS` registry, template context renderer, or configurator layer.
- Many references inside workflow mention platforms that this CLI cannot install yet.

Recommended next step:

- Add one new platform only after Codex/Claude runtime behavior is correct.

## Next-Step Priorities

### 1. Hook and Session Context Strategy

The project now has pull-based Codex prelude behavior, script wrappers, and a reminder-only Claude session-start hook, but no automatic task/spec context injection or journal capture.

Recommendation:

- Keep Codex pull-based for now.
- Let Claude hook behavior remain conservative until real projects show a stronger need.

### 2. Update Safety

The project now has `agent update` with projection backups, protected paths, safe deletes, `.shelf/update.skip`, and `.shelf/update-manifest.json` version/migration records.

Recommendation:

- Keep this update layer lightweight. Add real file migrations only when a concrete Shelf schema change requires one.
- Continue avoiding a wholesale upstream migration engine until there are multiple real migrations to manage.

### 3. Monorepo Spec Scaffolding

The CLI detects simple `package.json` and `pnpm-workspace.yaml` workspace packages and can now generate per-package spec trees through `agent spec scaffold`.

Recommendation:

- Keep package scaffolding explicit rather than automatic during init.
- Keep framework-specific Vue packs deferred.

## Good Upstream Ideas To Extend Into This Project

Recommended order after the current foundation:

1. Decide whether Claude hook behavior should stay reminder-only or support curated context injection.
2. Add one new platform only after the registry shape holds up for Codex/Claude.
3. Add worktree orchestration only after task lifecycle commands are stable.
4. Promote the lightweight migration manifest into concrete migrations only when schema drift requires it.

## Implementation Guidance

Do not try to port the whole upstream CLI at once. The current repository is CommonJS, small, and easy to maintain; upstream is a larger TypeScript CLI with many platform configurators and migration machinery. A direct wholesale port would add complexity before the current two-platform foundation is fully verified.

Best next slice:

- Evaluate richer Claude hook context injection.
- Then add one additional platform only if Codex/Claude behavior remains stable.
- Then add concrete migrations only when the Shelf schema changes, using the existing update manifest as the base.

This sequence preserves the current project's simplicity while steadily importing the upstream design where it creates real user-facing leverage.
