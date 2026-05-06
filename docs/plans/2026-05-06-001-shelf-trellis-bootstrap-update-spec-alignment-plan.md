---
status: active
created: 2026-05-06
type: implementation-plan
---

# Shelf Trellis Bootstrap And Update-Spec Alignment Plan

## Problem Frame

AgentOS Shelf already creates `.shelf/spec/`, `.shelf/tasks/00-bootstrap-guidelines/`, and `shelf-update-spec`, but the first-run guidance is still lighter and more static than the Trellis core model it intentionally follows. Trellis treats the bootstrap task as an AI-facing onboarding task: the AI reads existing convention files, scans real code, and fills project specs with current reality. Trellis then relies on `trellis-update-spec` during normal development to distill new conventions, pitfalls, contracts, and decisions back into `.trellis/spec/`.

Shelf needs to make these two guarantees explicit and testable:

- `shelf init` creates a clear first-run bootstrap task that tells the AI how to fill `.shelf/spec/` from real project evidence.
- `shelf-update-spec` is the required daily-development path for preserving durable project memory after tasks.

---

## Requirements Traceability

- R1: Align Shelf first initialization with Trellis: create `.shelf/spec/` structure and `00-bootstrap-guidelines` as a proper AI-facing bootstrap task.
- R2: Make clear that bootstrap does not auto-fill specs; it gives AI a disciplined flow to import existing rules, inspect code, and document current reality.
- R3: Align daily development with Trellis: `shelf-update-spec` records new conventions, bugs, contracts, testing requirements, and architecture decisions into `.shelf/spec/`.
- R4: Match Trellis init's project-shape awareness: detect frontend, backend, fullstack, and monorepo layouts before writing the bootstrap task.
- R5: Generate the bootstrap PRD and task metadata from detected project shape so the first-run task only asks the AI to fill relevant spec areas.
- R6: Keep remote templates and marketplace skills out of this implementation; they are future work, not required for this alignment slice.

---

## Scope Boundaries

### In Scope

- Remove static `templates/core/.shelf/tasks/00-bootstrap-guidelines/prd.md` and `task.json` as source files now that init generates them dynamically.
- Verify `templates/core/.shelf/skills/shelf-update-spec/SKILL.md` remains an upstream `trellis-update-spec` migration with Shelf naming and paths.
- Update README usage guidance so users invoke the bootstrap task through AI rather than manually editing spec files from scratch.
- Add or update tests proving the bootstrap and update-spec wording is projected by init.
- Add lightweight project type detection aligned with Trellis' frontend/backend/fullstack/unknown model.
- Generate `.shelf/tasks/00-bootstrap-guidelines/prd.md` and `task.json` during `shelf init` from project type and detected workspace packages.

### Deferred to Follow-Up Work

- Add `agentos-cli shelf init --template` / `--registry`.
- Add a dedicated `shelf-spec-bootstrap` skill.
- Add remote marketplace integration.

### Non-Goals

- Do not change task lifecycle scripts.
- Do not change Codex / Claude projection layout.
- Do not implement actual repository scanning inside `agentos-cli`; the AI performs scanning from the bootstrap task instructions.

---

## Key Technical Decisions

- **Keep bootstrap as a task, not a new command.** This matches Trellis core and uses the existing Shelf task system without creating another CLI surface.
- **Generate the bootstrap after template copy.** Shelf still ships the task directory with static jsonl manifests, but `shelf init` writes the bootstrap PRD and task metadata before projection and manifest hashing, matching Trellis' dynamic init behavior.
- **Make the bootstrap PRD AI-facing.** The PRD should explicitly say the AI is running the task, the developer does not need to read it, and the AI should open conversationally while doing the repo inspection itself.
- **Treat unknown as fullstack for guidance.** Trellis maps unknown projects to fullstack bootstrap guidance so new projects still receive complete backend/frontend coverage.
- **Use package-specific sections for monorepos.** When workspaces are detected, bootstrap should point the AI at package-specific spec layers and include each package's detected shape.
- **Use current reality as the quality bar.** The bootstrap PRD must prioritize existing convention docs and real code examples over aspirational rules.
- **Leave template registry for later.** The user asked to align the two core behaviors first; remote templates are acknowledged but not implemented here.

---

## Implementation Units

- U1. **Make Bootstrap Task Trellis-Aligned**

**Goal:** Rewrite the bootstrap PRD and task metadata so first init creates a proper AI-facing task for filling `.shelf/spec/`.

**Requirements:** R1, R2

**Dependencies:** None

**Files:**
- Delete: `templates/core/.shelf/tasks/00-bootstrap-guidelines/prd.md`
- Delete: `templates/core/.shelf/tasks/00-bootstrap-guidelines/task.json`
- Test: `tests/agent-init.test.js`

**Approach:**
- Move the Trellis bootstrap structure into the dynamic generator with Shelf naming and paths.
- Include sections for existing convention files, codebase scanning, real examples, frontend/backend/guides spec targets, and completion commands.
- Keep only `implement.jsonl` and `check.jsonl` in the static template directory.
- Set generated task metadata so the task is immediately actionable after first init.

**Patterns to follow:**
- `.tmp/Trellis-main/packages/cli/src/commands/init.ts`
- `lib/utils/bootstrap-task.js`

**Test scenarios:**
- Happy path: `agentInit` creates bootstrap PRD containing AI-facing wording, `.shelf/spec/` targets, existing convention import guidance, and no `.trellis` paths.
- Edge case: generated `task.json` marks bootstrap as actionable and references `.shelf/spec/`.

**Verification:**
- Init tests assert the generated bootstrap task now documents the Trellis-aligned flow.

---

- U2. **Preserve Update-Spec Upstream Parity**

**Goal:** Keep `shelf-update-spec` aligned with the upstream Trellis `update-spec` skill while using Shelf paths and command references.

**Requirements:** R3

**Dependencies:** None

**Files:**
- Modify: `templates/core/.shelf/skills/shelf-update-spec/SKILL.md`
- Test: `tests/agent-init.test.js`

**Approach:**
- Do not introduce Shelf-only workflow prose into the migrated skill.
- Preserve the upstream update process, mandatory code-spec depth, templates, interactive prompts, and command relationship sections.
- Keep only necessary Shelf substitutions such as `.shelf/spec/` and `$update-spec`.

**Patterns to follow:**
- `.tmp/Trellis-main/packages/cli/src/templates/common/skills/update-spec.md`
- `templates/core/.shelf/workflow.md`

**Test scenarios:**
- Happy path: generated Shelf skill contains upstream phrases such as "Code-Spec First Rule", mandatory 7-section output, and "Code-specs are living documents."
- Regression: generated skill references `.shelf/spec/`, does not reference `.trellis/spec/`, and does not contain Shelf-only daily workflow prose.

**Verification:**
- Init tests assert the skill wording is present in projected `.agents/skills/shelf-update-spec/SKILL.md`.

---

- U3. **Document The Recommended User Flow**

**Goal:** Update README so users understand bootstrap and update-spec as first-run and ongoing behaviors, not one-off manual file editing.

**Requirements:** R1, R2, R3, R4

**Dependencies:** U1, U2

**Files:**
- Modify: `README.md`

**Approach:**
- Expand "初始化后应该做什么" with the AI prompt to run bootstrap.
- Add a concise note that daily work should run `shelf-update-spec` during Phase 3.3.
- Mention remote templates and a dedicated bootstrap skill as future alignment, not current capability.

**Patterns to follow:**
- `docs/Shelf与Trellis使用操作手册.md`
- `.tmp/trellis-docs-cache/install-and-first-task.md`

**Test scenarios:**
- Test expectation: none -- README-only documentation update.

**Verification:**
- README accurately describes current behavior and does not claim template registry support.

---

- U4. **Detect Project Shape During Init**

**Goal:** Add Trellis-aligned detection for frontend, backend, fullstack, unknown, and monorepo package types.

**Requirements:** R4

**Dependencies:** None

**Files:**
- Add: `lib/utils/project-detector.js`
- Modify: `lib/utils/monorepo.js`
- Test: `tests/platform-registry.test.js`

**Approach:**
- Port the useful subset of Trellis' `project-detector.ts` into CommonJS.
- Detect frontend/backend from common config files and package dependencies.
- Enrich detected workspace packages with `type` while preserving existing `name`, `path`, and `source` fields.

**Patterns to follow:**
- `.tmp/Trellis-main/packages/cli/src/utils/project-detector.ts`

**Test scenarios:**
- Frontend package dependencies produce `frontend`.
- Backend server files produce `backend`.
- Mixed signals produce `fullstack`.
- Workspace packages include detected `type`.

**Verification:**
- Unit tests cover single-project and workspace-package detection.

---

- U5. **Generate Dynamic Bootstrap Task**

**Goal:** Rewrite the copied bootstrap task during init so its PRD and metadata are tailored to detected project shape.

**Requirements:** R1, R2, R4, R5

**Dependencies:** U4

**Files:**
- Add: `lib/utils/bootstrap-task.js`
- Modify: `lib/actions/agent-init.js`
- Test: `tests/agent-init.test.js`

**Approach:**
- Detect project type and packages before copying templates.
- After `copyTemplateFiles`, write `.shelf/tasks/00-bootstrap-guidelines/prd.md` and `task.json` from generation functions.
- Run `syncAgentOs` after dynamic generation so Codex/Claude projections receive the final task content.
- Return `projectType` from `agentInit` for testability and diagnostics.

**Patterns to follow:**
- `.tmp/Trellis-main/packages/cli/src/commands/init.ts` bootstrap helpers.

**Test scenarios:**
- Frontend project PRD contains frontend spec targets and omits backend guideline section.
- Backend project PRD contains backend spec targets and omits frontend guideline section.
- Unknown project defaults to fullstack guidance.
- Monorepo PRD lists package-specific specs and package detected types.

**Verification:**
- Focused init tests assert dynamic PRD content and task metadata.

---

## System-Wide Impact

- **Interaction graph:** `shelf init` still copies templates and projects them through existing `syncAgentOs`; improved source templates propagate to Codex and Claude projections.
- **Dynamic init graph:** `shelf init` now detects project shape, copies the task manifest skeleton, writes bootstrap task content, then projects and hashes the final generated Shelf source.
- **Error propagation:** No runtime error behavior changes.
- **State lifecycle risks:** Changing bootstrap status affects only newly initialized projects; existing user projects are updated only through normal `shelf update` / `shelf sync` behavior.
- **API surface parity:** CLI command names and options remain unchanged.
- **Integration coverage:** Existing `agentInit` integration tests cover template copy and projection.
- **Unchanged invariants:** `.shelf/spec/`, `.shelf/tasks/`, `.shelf/workspace/`, and `.shelf/config.yaml` remain protected user-data areas during updates.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Bootstrap PRD becomes too long or too Trellis-specific | Keep paths and names Shelf-specific; test that `.trellis` does not appear. |
| Users think specs are auto-generated | State clearly that the AI follows the task and scans the repo; the CLI only creates the task and scaffold. |
| Update-spec duplicates bootstrap guidance | Keep bootstrap focused on first-run spec population; keep update-spec focused on post-task learning. |
| Dynamic detection misclassifies edge-case projects | Keep detection best-effort and treat unknown as fullstack, matching Trellis' safe default. |

---

## Documentation / Operational Notes

- This plan deliberately does not add `--template` / `--registry`. Those belong in a later plan because they introduce network behavior, registry parsing, conflict strategy, and publish-facing docs.

---

## Sources & References

- Related code: `lib/actions/agent-init.js`
- Related code: `lib/utils/monorepo.js`
- Related code: `lib/utils/bootstrap-task.js`
- Related code: `templates/core/.shelf/skills/shelf-update-spec/SKILL.md`
- Trellis reference: `.tmp/Trellis-main/packages/cli/src/commands/init.ts`
- Trellis reference: `.tmp/Trellis-main/packages/cli/src/utils/project-detector.ts`
- Trellis reference: `.tmp/Trellis-main/packages/cli/src/templates/common/skills/update-spec.md`
- Docs reference: `.tmp/trellis-docs-cache/install-and-first-task.md`
