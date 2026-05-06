---
status: active
created: 2026-05-06
---

# Shelf Trellis Core Local Alignment Implementation Plan

## Problem Frame

Shelf has already aligned the highest-friction command projection gap: `continue` and `finish-work` now come from a shared common-command source instead of duplicated Claude/Codex files. Codex native projection shape is also much closer to Trellis: shared skills in `.agents/skills/`, TOML agents in `.codex/agents/`, project config in `.codex/config.toml`, and hook wiring in `.codex/hooks.json`.

What remains is no longer broad capability absence. Within the intentionally narrowed scope for this repository, the remaining differences are mostly structural: Trellis resolves common commands, common skills, and bundled skills through one shared rendering pipeline with a richer placeholder resolver and platform-aware filtering rules. Shelf still mixes pipeline-driven command projection with direct `.shelf/skills/` copying, local one-off transforms, and Shelf-specific bundled skill handling.

This plan covers the remaining local-core alignment work while explicitly excluding:

- Additional platform expansion beyond Codex and Claude Code.
- Remote init registry / marketplace / template download flows.

## Goal

Bring Shelf's remaining local init-time projection architecture into closer alignment with Trellis for the supported Codex and Claude Code flows, so commands, workflow skills, bundled meta skills, and related docs all flow through a single consistent rendering model.

## Scope Boundaries

### In Scope

- Unify common command and common workflow skill projection under one shared rendering pipeline.
- Add a proper bundled-skill projection path for `shelf-meta`.
- Expand the local placeholder resolver to match the current narrowed Shelf/Trellis needs rather than only command-specific substitutions.
- Align `start` handling with Trellis-style platform-aware command filtering.
- Strengthen local docs and tests so the generated architecture described to users matches the actual projection behavior.
- Improve bootstrap/joiner/runtime wording where needed to reflect the new unified model and reduce remaining Trellis-vs-Shelf drift.

### Out of Scope

- Adding Trellis' wider platform matrix.
- Adding registry-backed or remote template selection to `shelf init`.
- Rewriting Shelf into the full Trellis TypeScript configurator stack.
- Replacing Shelf naming (`.shelf/`, `shelf-*`) with Trellis naming.

## Requirements

1. Commands and workflow skills must no longer be sourced from separate ad hoc code paths; they should pass through one shared rendering model.
2. `shelf-meta` should behave like a bundled multi-file skill rather than a special direct-copy outlier.
3. The local rendering layer must support the placeholder subset Shelf now needs for Trellis-style common templates, including command references and platform capability-based filtering.
4. Platform-aware filtering rules must be explicit and testable, especially for `start`.
5. Generated Codex and Claude outputs must stay unchanged in the user project where current behavior is already correct, unless the new behavior is an intentional Trellis-alignment improvement.
6. Bootstrap, joiner, and meta docs must describe the generated architecture truthfully after the pipeline unification.

## Existing Patterns To Follow

- Trellis common template loader: `.tmp/Trellis-main/packages/cli/src/templates/common/index.ts`
- Trellis shared renderer and template wrappers: `.tmp/Trellis-main/packages/cli/src/configurators/shared.ts`
- Trellis Codex configurator: `.tmp/Trellis-main/packages/cli/src/configurators/codex.ts`
- Trellis Claude configurator: `.tmp/Trellis-main/packages/cli/src/configurators/claude.ts`
- Shelf projection collector: `lib/utils/agent-os.js`
- Shelf shared hook registry: `lib/utils/shared-hooks.js`
- Shelf bootstrap generator: `lib/utils/bootstrap-task.js`
- Shelf joiner task generator: `lib/actions/agent-joiner.js`

## Summary

We will finish the local-core alignment in three layers:

1. **Shared rendering layer**: move Shelf from command-only transforms to a Trellis-style common template rendering core that understands commands, skills, bundled skills, and platform filtering.
2. **Projection convergence**: feed Codex and Claude outputs from that shared layer so command and workflow-skill behavior comes from one source of truth.
3. **Local truthfulness**: update bootstrap/joiner/meta docs and tests so the generated workspace explains exactly how the pipeline works.

## Key Technical Decisions

- **Keep `.shelf/skills/` as the editable local source root for now, but split its role clearly.** Single-file workflow skills will move into a common-skill source area under `.shelf/templates/`, while bundled multi-file skills such as `shelf-meta` will remain directory-based. This preserves Shelf's local-editability while aligning its projection mechanics with Trellis.
- **Preserve `.shelf/skills/` as the project-local custom skill directory.** Built-in workflow and bundled skills should move to explicit template-source directories, while `.shelf/skills/` stays available for user-imported or team-local skills that still project into current platforms.
- **Use a shared render layer inside `lib/utils/agent-os.js` rather than introducing a parallel configurator subsystem.** This narrows the gap materially without a repo-wide CLI architecture rewrite.
- **Treat `start` as a common command that is filtered out for agent-capable current platforms.** This aligns behavior with Trellis while avoiding dead generated commands in Codex and Claude output.
- **Project Codex user entry points through `.agents/skills/`, not `.codex/prompts/`.** This preserves the newly aligned direction and prevents reintroducing duplicate command surfaces.
- **Model `shelf-meta` as a bundled skill in the rendering pipeline.** The goal is not to rename it or relocate its content arbitrarily; the goal is to remove the special-case copying path and make its projection rules explicit and testable.

## High-Level Technical Design

This plan introduces an internal projection pipeline with four source categories:

```text
.shelf/templates/
|- common-commands/
|- common-skills/
\- bundled-skills/

render phase
  -> resolve placeholders
  -> apply platform filters
  -> wrap commands/skills for target surface
  -> emit projection templates

projection targets
  -> Claude commands
  -> Claude tool-scoped skills
  -> Codex shared .agents skills
  -> Codex native agents/config/hooks
```

The render layer should separate:

- **source discovery**: which command / skill / bundled skill files exist
- **rendering**: placeholder substitution + wrapping
- **projection mapping**: where each rendered artifact lands per platform

## Implementation Units

- U1. **Introduce Common Skill Source And Rendering Pipeline**

**Goal:** Unify Shelf's single-file workflow skills with the same rendering model already used for common commands.

**Dependencies:** None

**Files:**
- Create: `templates/core/.shelf/templates/common-skills/before-dev.md`
- Create: `templates/core/.shelf/templates/common-skills/brainstorm.md`
- Create: `templates/core/.shelf/templates/common-skills/break-loop.md`
- Create: `templates/core/.shelf/templates/common-skills/check.md`
- Create: `templates/core/.shelf/templates/common-skills/update-spec.md`
- Modify: `lib/utils/agent-os.js`
- Modify: `tests/agent-init.test.js`
- Modify: `tests/agent-lifecycle.test.js`

**Approach:**
- Move the single-file workflow skill source of truth out of direct `.shelf/skills/*/SKILL.md` copying and into markdown source files under `templates/common-skills/`.
- Add local equivalents of Trellis' common-template discovery functions for command templates and skill templates.
- Render these skill templates into `.agents/skills/` for Codex and `.claude/skills/` for Claude with wrapped frontmatter and placeholder substitution.
- Keep the generated skill names stable (`shelf-before-dev`, `shelf-brainstorm`, etc.).
- Remove direct-copy projection for single-file workflow skills once the new pipeline is in place.

**Patterns to follow:**
- `.tmp/Trellis-main/packages/cli/src/templates/common/index.ts`
- `.tmp/Trellis-main/packages/cli/src/configurators/shared.ts`

**Test scenarios:**
- Happy path: Codex init generates `.agents/skills/shelf-brainstorm/SKILL.md` from the new common skill source.
- Happy path: Claude init generates `.claude/skills/shelf-before-dev/SKILL.md` from the new common skill source.
- Edge case: Generated skill content resolves `{{CMD_REF:*}}` correctly for both Codex and Claude contexts.
- Integration: sync/update hash tracking sees common-skill-rendered outputs as managed projection files and updates them without creating duplicates.

**Verification:**
- Workflow skills are rendered from the new common skill source for both current platforms.
- No direct-copy dependency remains for single-file workflow skill projection.

---

- U2. **Add Bundled Skill Projection For shelf-meta**

**Goal:** Make `shelf-meta` flow through an explicit bundled-skill pipeline instead of remaining a projection outlier.

**Dependencies:** U1

**Files:**
- Create: `templates/core/.shelf/templates/bundled-skills/shelf-meta/` (mirroring current content)
- Modify: `lib/utils/agent-os.js`
- Modify: `templates/core/.shelf/skills/shelf-meta/SKILL.md`
- Modify: `tests/agent-init.test.js`
- Modify: `tests/agent-lifecycle.test.js`

**Approach:**
- Introduce bundled-skill discovery for directory-based multi-file skills, following the Trellis `bundled-skills` pattern.
- Treat `shelf-meta` as the first bundled skill and render it to both target roots that consume it.
- Keep the generated output shape identical where possible: `SKILL.md` plus `references/`.
- Update references inside `shelf-meta` only where they still assume the older projection structure.

**Patterns to follow:**
- `.tmp/Trellis-main/packages/cli/src/templates/common/bundled-skills/trellis-meta/`
- `.tmp/Trellis-main/packages/cli/src/templates/common/index.ts`

**Test scenarios:**
- Happy path: Codex init generates `.agents/skills/shelf-meta/SKILL.md` plus bundled reference files.
- Happy path: Claude init generates `.claude/skills/shelf-meta/SKILL.md` plus bundled reference files.
- Integration: update and sync treat bundled reference files as managed generated artifacts.

**Verification:**
- `shelf-meta` no longer relies on a separate direct-copy branch in the projection logic.

---

- U3. **Expand Shared Placeholder Resolver And Platform Filter Rules**

**Goal:** Replace the current command-only substitution logic with a more Trellis-like shared resolver that can serve commands, skills, and bundled skills consistently.

**Dependencies:** U1

**Files:**
- Modify: `lib/utils/agent-os.js`
- Modify: `tests/agent-init.test.js`
- Modify: `tests/platform-registry.test.js`

**Approach:**
- Extract a shared placeholder resolver supporting at least:
  - `{{PYTHON_CMD}}`
  - `{{CMD_REF:*}}`
  - `{{CLI_FLAG}}`
  - `{{EXECUTOR_AI}}`
  - `{{USER_ACTION_LABEL}}`
  - capability-conditioned inclusion/exclusion for current platform needs
- Explicitly encode `start` filtering for agent-capable platforms.
- Keep the implementation local/CommonJS, but mirror Trellis behavior closely enough that future common templates can be added without bespoke transforms.

**Patterns to follow:**
- `.tmp/Trellis-main/packages/cli/src/configurators/shared.ts`

**Test scenarios:**
- Happy path: `continue` and `finish-work` still render the same platform-specific command refs after the refactor.
- Happy path: newly commonized workflow skills can use command references without post-hoc string surgery.
- Edge case: `start.md` is not projected into Codex or Claude command surfaces.
- Integration: both Codex and Claude projection outputs remain stable under sync/update after resolver changes.

**Verification:**
- There is one shared render path for placeholder resolution and platform filtering.

---

- U4. **Align start And Entry-Point Truth Table**

**Goal:** Complete the command/skill entry-point model so Shelf matches the current Trellis logic for agent-capable local platforms.

**Dependencies:** U3

**Files:**
- Create: `templates/core/.shelf/templates/common-commands/start.md`
- Modify: `lib/utils/agent-os.js`
- Modify: `templates/core/.shelf/skills/shelf-meta/references/**`
- Modify: `README.md`
- Modify: `docs/Shelf与Trellis使用操作手册.md`

**Approach:**
- Add a Shelf-specific `start` common command source based on Trellis semantics.
- Filter it out from Codex and Claude projections because both current platforms are agent-capable in Shelf's model.
- Update docs so they explain the rule truthfully: `start` exists in the source model, but current generated Codex/Claude outputs intentionally omit it.
- Remove remaining language that implies commands and skills are projected by unrelated mechanisms.

**Patterns to follow:**
- `.tmp/Trellis-main/packages/cli/src/templates/common/commands/start.md`
- `.tmp/Trellis-main/packages/cli/src/configurators/shared.ts`

**Test scenarios:**
- Happy path: no `.claude/commands/shelf/start.md` is generated.
- Happy path: no `.agents/skills/shelf-start/SKILL.md` is generated for Codex.
- Integration: docs and meta references explain this omission consistently.

**Verification:**
- Shelf's local truth table for commands vs skills is explicit, testable, and documented.

---

- U5. **Tighten Bootstrap, Joiner, And Local Runtime Wording**

**Goal:** Reduce remaining Shelf-vs-Trellis drift in the local onboarding/task surfaces now that the projection pipeline is more aligned.

**Dependencies:** U1, U2, U4

**Files:**
- Modify: `lib/utils/bootstrap-task.js`
- Modify: `lib/actions/agent-joiner.js`
- Modify: `templates/core/.shelf/skills/shelf-meta/references/local-architecture/*.md`
- Modify: `templates/core/.shelf/skills/shelf-meta/references/platform-files/*.md`
- Modify: `tests/agent-init.test.js`
- Modify: `tests/agent-lifecycle.test.js`

**Approach:**
- Make bootstrap and joiner wording explicitly reflect the unified common-command/common-skill/bundled-skill architecture.
- Keep Shelf-specific runtime decisions, but remove stale language implying older projection paths or simplified local behavior.
- Where Trellis has stronger onboarding/runtime explanation that now fits Shelf, absorb it selectively.

**Patterns to follow:**
- `.tmp/Trellis-main/packages/cli/src/commands/init.ts`
- `.tmp/Trellis-main/packages/cli/src/templates/common/bundled-skills/trellis-meta/`

**Test scenarios:**
- Happy path: bootstrap task text still points the AI at `.shelf/spec/` and real-code inspection, with no stale `.trellis` paths.
- Happy path: joiner task still initializes onboarding correctly after wording changes.
- Integration: generated meta/reference content matches the actual generated file layout and source-of-truth model.

**Verification:**
- Local onboarding/task docs no longer describe the projection architecture incorrectly.

## System-Wide Impact

- **Interaction graph:** Projection logic affects init, sync, update, hash tracking, doctor validation, runtime-facing docs, and tests.
- **Error propagation:** A resolver or projection regression can surface as missing generated files, stale hash comparisons, or misleading meta docs.
- **State lifecycle risks:** Moving source-of-truth skill files into common/bundled source directories must not break update behavior for existing generated installs.
- **API surface parity:** Codex and Claude must continue receiving semantically equivalent workflow entry points even though their output shapes differ.
- **Integration coverage:** The highest-value integration checks are real generated file shape, content assertions, and sync/update behavior on transformed outputs.
- **Unchanged invariants:** `.shelf/` remains the local source of truth, current supported platforms remain Codex and Claude Code only, and user project output paths should remain stable unless the plan explicitly changes them.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Refactoring source directories breaks sync/update hash expectations | Keep output paths stable, update lifecycle tests, and validate real init output with script-level checks |
| Common skill migration accidentally duplicates or drops skill files | Convert one source category at a time and assert generated file counts/paths in init and lifecycle tests |
| Bundled `shelf-meta` migration breaks its references | Preserve directory shape and reference paths; validate generated bundled files directly |
| Resolver expansion becomes an architectural rewrite | Limit this pass to the placeholder/filter subset needed by current Shelf templates and current platforms |

## Documentation / Operational Notes

- Historical plan/dossier docs that discuss older `.codex/prompts/` behavior should remain as history but carry current-state notes where they would otherwise mislead.
- README and local meta docs should describe the current source-of-truth model plainly enough that future work does not reintroduce duplicate command/skill sources.

## Sources & References

- Origin document: `docs/trellis-core-alignment-dossier.md`
- Related plans:
  - `docs/plans/2026-05-03-001-trellis-core-alignment-plan.md`
  - `docs/plans/2026-05-02-001-shelf-skill-projection-alignment-plan.md`
  - `docs/plans/2026-05-06-003-shelf-shared-hooks-foundation-plan.md`
- Trellis reference:
  - `.tmp/Trellis-main/packages/cli/src/templates/common/index.ts`
  - `.tmp/Trellis-main/packages/cli/src/configurators/shared.ts`
  - `.tmp/Trellis-main/packages/cli/src/configurators/codex.ts`
  - `.tmp/Trellis-main/packages/cli/src/configurators/claude.ts`
