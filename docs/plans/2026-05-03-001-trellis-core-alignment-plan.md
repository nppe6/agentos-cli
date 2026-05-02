# Trellis Core Alignment Plan

Date: 2026-05-03
Status: planned
Reference: `docs/trellis-core-alignment-dossier.md`

## Goal

Bring the generated Shelf workspace into tighter alignment with the Trellis core model, without turning AgentOS Shelf CLI into a full Trellis clone. The priority is consistency and truthful generated guidance: every file that an AI reads should describe the current `shelf` command namespace, `shelf-*` skills, actual projection layout, and current platform capability level.

## Non-Goals

- Do not port Trellis' 14-platform configurator layer in this slice.
- Do not build a full migration engine unless a concrete Shelf schema change requires one.
- Do not add worktree orchestration before task lifecycle and generated guidance are stable.
- Do not make Claude hook injection heavy until local testing shows that reminder-only behavior is insufficient.

## Requirements

1. Generated workflow and meta references must not instruct users or agents to use stale `/agentos:*`, `agentos-*`, or `agentos-local` names unless explicitly describing legacy migration.
2. The docs must distinguish the CLI command namespace (`agentos-cli shelf ...`) from AI tool slash commands such as `/shelf:continue`.
3. Codex and Claude projections must be documented according to their actual generated files.
4. The project must make an explicit decision about generated agent names: simple names (`research`, `implement`, `check`) or namespaced names (`shelf-research`, `shelf-implement`, `shelf-check`).
5. The bootstrap task must guide the user from empty specs to real project conventions.
6. Future platform expansion must use capability flags rather than ad hoc copy rules.

## Proposed Work Slices

### Slice 1: Naming Normalization

Audit and update:

- `templates/core/.shelf/workflow.md`
- `templates/core/.shelf/skills/shelf-meta/references/**`
- `templates/core/.shelf/templates/claude-commands/shelf/**`
- README command examples where needed

Expected result:

- `shelf-*` skills everywhere.
- `/shelf:*` where Claude slash commands are meant.
- `agentos-cli shelf ...` where shell CLI commands are meant.
- No stale `agentos-*` guidance except in an intentional migration note.

### Slice 2: Agent Naming Decision

Compare two options:

- Keep source and generated agents as `research`, `implement`, `check`.
- Rename generated/projected agents to `shelf-research`, `shelf-implement`, `shelf-check`.

Recommendation to evaluate: use namespaced generated agents for clarity, while allowing source files under `.shelf/agents/` to remain simple if the projection transform maps them.

Acceptance criteria:

- Workflow text, meta references, Codex TOML, Claude agent files, and tests agree on the same names.
- Codex pull-based prelude still applies to implement/check agents.

### Slice 3: Command And Skill Projection Truth Table

Document and test:

- Claude: `CLAUDE.md`, `.claude/skills/shelf-*`, `.claude/agents/*`, `.claude/commands/shelf/continue.md`, `.claude/commands/shelf/finish-work.md`, hooks/settings if enabled.
- Codex: `AGENTS.md`, `.agents/skills/shelf-*`, `.codex/agents/*`, no shared workflow skills in `.codex/skills`.

Decision point:

- Either add `.codex/prompts/shelf-continue.md` and `.codex/prompts/shelf-finish-work.md`, or explicitly defer Codex prompt commands in README and roadmap.

### Slice 4: Bootstrap Task Quality

Improve `00-bootstrap-guidelines` so it is a practical first-run guide:

- Explain how to inspect a real repo.
- Show what belongs in `.shelf/spec/` versus a task `research/` file.
- Include a concrete Vue/admin example because current local testing is happening in a Vue project.
- Ensure the resulting specs are specific contracts, not generic principles.

### Slice 5: Hook Strategy Checkpoint

After local testing:

- Keep Codex pull-based prelude unless a real issue appears.
- Keep Claude reminder hook if users reliably follow it.
- Consider curated Claude context injection only if users repeatedly miss task/spec context.

## Verification Checklist

- Run `rg -n "agentos-|/agentos|agentos-local" templates/core/.shelf README.md docs` and classify every remaining hit as legacy-only or a bug.
- Run `rg -n "^name:" templates/core/.shelf/skills` and confirm every built-in skill is `shelf-*`.
- Run tests covering `shelf init`, `shelf doctor`, `shelf sync`, `shelf update`, and `shelf skills import`.
- Initialize a temporary project with Codex only and confirm `.agents/skills` exists while `.codex/skills` is not used for shared workflow skills.
- Initialize a temporary project with Claude only and confirm `.claude/skills` and `.claude/commands/shelf` are generated.
- Run `agentos-cli shelf doctor` in both temporary projects.

## Open Decisions

- Should generated agents be namespaced as `shelf-*`?
- Should Codex receive prompt commands now, or should the current skill/agent flow remain the Codex MVP?
- Should `shelf-meta` keep a project-local customization template named `shelf-local` instead of `agentos-local`?
- Should `shelf finish-work` become a CLI wrapper in addition to the AI command/skill workflow?
