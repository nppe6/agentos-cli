# Trellis Core Alignment Dossier

Date: 2026-05-03

This document records the current understanding of Trellis after reviewing the complete official Markdown documentation snapshot and the local upstream source under `.tmp/Trellis-main`. It is meant to be the durable reference for deciding which Trellis ideas AgentOS Shelf should absorb, which ones should stay deferred, and where the current Shelf implementation is already aligned.

## Sources Reviewed

- Official docs snapshot: `.tmp/trellis-docs-cache/all/`, fetched from `https://docs.trytrellis.app/llms.txt` on 2026-05-03. The snapshot contains 102 linked Markdown pages plus the index file.
- Core official pages used most heavily: `index.md`, `start/install-and-first-task.md`, `start/everyday-use.md`, `start/how-it-works.md`, `advanced/architecture.md`, `advanced/multi-platform.md`, `advanced/custom-commands.md`, `advanced/custom-agents.md`, `advanced/custom-hooks.md`, `advanced/custom-skills.md`, `advanced/appendix-a.md`, `advanced/appendix-b.md`, `advanced/appendix-c.md`, `advanced/appendix-d.md`.
- Local upstream source: `.tmp/Trellis-main/packages/cli/src/commands/init.ts`, `.tmp/Trellis-main/packages/cli/src/configurators/`, `.tmp/Trellis-main/packages/cli/src/templates/common/`, `.tmp/Trellis-main/packages/cli/src/templates/shared-hooks/`, `.tmp/Trellis-main/packages/cli/src/templates/trellis/`, `.tmp/Trellis-main/packages/cli/src/templates/codex/`, `.tmp/Trellis-main/packages/cli/src/templates/claude/`.
- Current Shelf implementation: `lib/`, `templates/core/.shelf/`, `templates/tools/`, `README.md`, `docs/shelf-architecture-upstream-comparison.md`, `docs/shelf-trellis-roadmap-reference.md`.

## Core Thesis

Trellis is not mainly a command generator. Its core is a file-backed AI development operating system:

- `.trellis/` is the canonical project memory.
- Tool directories are projections that adapt the same memory to different AI coding platforms.
- Tasks, specs, workspace journals, workflow phases, skills, agents, and hooks are separate layers with clear responsibilities.
- Context is deliberately scoped through `implement.jsonl` and `check.jsonl` instead of dumping the whole repository into every agent.
- Project knowledge improves over time by promoting task learnings back into specs.

AgentOS Shelf is aligned with this foundation when it treats `.shelf/` as the source of truth and keeps Codex/Claude files as generated projections. It drifts when generated references, workflow text, or platform maps still describe the old `agentos-*` model or imply capabilities that Shelf does not currently install.

## Trellis Core Model

| Area | Trellis model | Why it matters |
|---|---|---|
| Canonical source | `.trellis/` contains workflow, config, specs, tasks, scripts, workspace memory, and template metadata. | AI tools can change, but the repo-local knowledge source remains stable. |
| Platform projection | Claude, Codex, Cursor, OpenCode, Gemini, Qoder, Copilot, Droid, Pi, Kilo, Antigravity, Windsurf, and others receive platform-specific files. | Teams can use multiple AI tools without forking project rules. |
| Shared skill layer | `.agents/skills/` is the open cross-platform skill layer. | Tools that support the agentskills convention can reuse the same workflow skills. |
| Task lifecycle | Each task owns `task.json`, `prd.md`, `implement.jsonl`, `check.jsonl`, optional `research/`, and optional `info.md`. | Work becomes resumable, reviewable, and context-addressable. |
| Session active task | `.trellis/.runtime/sessions/<session-key>.json` stores the active task per AI session/window. | Multiple sessions can work independently without one global current-task pointer. |
| Workflow-state | `[workflow-state:STATUS]` blocks in `workflow.md` are parsed by hooks/preludes and emitted as per-turn guidance. | The workflow document is the source for live guidance, not duplicated hook text. |
| Spec system | `.trellis/spec/` holds executable contracts, guides, package/layer conventions, and update targets. | The AI reads durable rules before writing code, and repeated learnings become future defaults. |
| Context manifests | `implement.jsonl` and `check.jsonl` list spec/research files the implement/check path must read. | Context stays targeted and auditable. |
| Skills vs commands | Commands are session-boundary entry points; phase behavior is mostly auto-trigger skills. | Users invoke fewer commands; the workflow responds to intent. |
| Agents | `trellis-research`, `trellis-implement`, and `trellis-check` divide investigation, implementation, and verification. | Main sessions stay orchestration-focused; specialized agents receive curated context. |
| Hooks/preludes | Hook-capable platforms push context; pull-based platforms instruct agents to read context themselves. | Trellis supports platforms with different automation primitives. |
| Update safety | Template hashes, protected paths, update manifests, backups, skip policy, and migrations protect user edits. | Generated workflow can evolve without clobbering project memory. |

## Current Shelf Alignment

| Trellis foundation | Current Shelf implementation | Alignment |
|---|---|---|
| Canonical source directory | `.shelf/` contains workflow, config, specs, tasks, scripts, skills, agents, workspace docs, and root rule templates. | Strong |
| Tool projection | `agentos-cli shelf init/sync/update` project `.shelf/` into Codex and Claude files. | Strong for two platforms |
| Shared open skills | Codex receives `.agents/skills/*` from `.shelf/skills`; Claude receives `.claude/skills/*`. | Strong and now consistent with Trellis direction |
| Claude scoped skills | Claude gets `.claude/skills/*` because Claude Code has its own skill directory. | Strong |
| Codex skill placement | Current Shelf no longer writes shared workflow skills to `.codex/skills`; it uses `.agents/skills`. | Strong |
| Agents | `.shelf/agents` projects to `.codex/agents` and `.claude/agents`; Codex implement/check get a pull-based context prelude. | Partial but directionally correct |
| Task lifecycle | `.shelf/tasks`, `task.py`, `task.json`, `prd.md`, `implement.jsonl`, `check.jsonl`, archive, list, current, and active task runtime exist. | Strong foundation |
| Session active task | Shelf uses `.shelf/.runtime/sessions/` and `SHELF_CONTEXT_ID`. | Strong foundation |
| Workspace memory | `developer init`, `workspace context`, `workspace add-session`, journals, and workspace README exist. | Good, mostly explicit rather than automatic |
| Spec system | Backend/frontend/guides specs and `spec scaffold` exist. | Good, but needs real-project bootstrap quality |
| Update safety | `manifest.json`, `template-hashes.json`, `update-manifest.json`, backups, protected paths, and `update.skip` exist. | Good lightweight equivalent |
| Multi-platform registry | `platform-registry.js` has capability flags for Codex and Claude. | Good small-scale base |
| Full hook matrix | Claude has lightweight hook/settings behavior; Codex is pull-based. | Intentional partial |
| Marketplace/spec packs | Not implemented beyond core scaffolding. | Deferred |
| Worktree orchestration | Not implemented. | Deferred |

## Important Gaps Found

### 1. Naming Drift Still Exists In Workflow And Meta References

The skill directories and `name:` frontmatter now use `shelf-*`, but several generated reference files still mention `agentos-*`, `/agentos:*`, and `agentos-local`. Examples found locally include:

- `templates/core/.shelf/workflow.md`
- `templates/core/.shelf/skills/shelf-meta/references/platform-files/*.md`
- `templates/core/.shelf/skills/shelf-meta/references/how-to-modify/*.md`
- `templates/core/.shelf/skills/shelf-meta/references/meta/*.md`
- `templates/core/.shelf/skills/shelf-meta/references/customize-local/*.md`

Impact: these files are read by agents when customizing Shelf. If left as-is, AI may generate the old command namespace or wrong agent names even though the CLI entry is now `agentos-cli shelf`.

Priority: high, because it affects future self-modification quality.

### 2. Agent Naming Is Not Yet A Deliberate Product Choice

Trellis uses platform agent names like `trellis-research`, `trellis-implement`, and `trellis-check`. Shelf currently keeps source files as `research.md`, `implement.md`, `check.md` and projects those names directly. The docs/meta references still talk about older `agentos-*` names.

Decision needed: choose one of these and document it everywhere:

- Keep generated agent names simple: `research`, `implement`, `check`.
- Rename generated agents to `shelf-research`, `shelf-implement`, `shelf-check` for clearer namespace parity with `shelf-*` skills.

Trellis leans toward namespaced agents. Shelf can stay simpler, but the choice should be explicit.

### 3. Commands And Skills Need A Clear Shelf Rule

Trellis 0.5 deliberately reduced slash commands. On agent-capable platforms, session-boundary actions are commands/prompts, while phase behavior moved to auto-trigger skills. For Codex, official docs describe `.codex/prompts/trellis-{name}.md` for prompt commands and `.agents/skills/` for shared skills. For Claude, docs describe `.claude/commands/trellis/` and `.claude/skills/`.

Current Shelf:

- Claude has `continue` and `finish-work` command templates under `.claude/commands/shelf/`.
- Codex currently relies on `.agents/skills` and `.codex/agents`; it does not generate `.codex/prompts`.

This is acceptable as a lightweight MVP, but docs should say clearly that Codex command/prompt support is not yet implemented, and that Codex users currently use skills/agents plus CLI commands.

### 4. Hook Behavior Is Intentionally Partial

Trellis distinguishes push-based hook injection and pull-based preludes. Shelf already applies the pull-based idea for Codex implement/check agents. Claude, however, is still reminder-oriented rather than full context injection.

This is not a core mismatch. It is a capability gap that should remain planned, not silently implied as complete.

### 5. Bootstrap Quality Is The Main User-Facing Proof Point

Trellis official docs repeatedly emphasize that the initial `00-bootstrap-guidelines` task turns empty spec placeholders into real project conventions. Shelf has the bootstrap task and spec folders, but the generated experience must clearly guide a user through turning a Vue/admin project or other brownfield repo into grounded specs.

This should stay near the top of the roadmap because it is where users first feel whether the workflow is real or decorative.

## Consistency Verdict

The core absorbed implementation is consistent with Trellis in these areas:

- File-backed project memory.
- `.shelf/` as the canonical source.
- Projection into AI tool directories.
- Shared open skills through `.agents/skills`.
- Claude-specific skills through `.claude/skills`.
- Task folders with PRD, JSONL context, status, archive, and active session runtime.
- Workspace/developer memory.
- Specs as durable contracts.
- Conservative update and sync safety.
- Pull-based context prelude for Codex.

The current implementation is not yet fully consistent in these areas:

- Generated workflow/meta references still mix `agentos-*` and `shelf-*`.
- Platform command behavior is not fully documented against Trellis' command-vs-skill distinction.
- Claude context injection is not equivalent to Trellis' stronger hook path.
- Agent naming has not been intentionally settled.
- Multi-platform support remains intentionally narrow.

Overall verdict: Shelf has absorbed the correct core architecture, but the next optimization should be normalization and truthfulness rather than adding broad new features. The highest-value next work is to make every generated instruction describe the current Shelf model exactly.

## Planning Inputs

This dossier should feed the next planning slice:

1. Normalize Shelf names and command namespaces across `workflow.md`, `shelf-meta`, and generated docs.
2. Decide and document generated agent naming.
3. Add explicit Codex prompt/command support or document that it is deferred.
4. Strengthen the bootstrap task as the first real project-spec workflow.
5. Keep Claude hook enrichment planned but gated by local testing evidence.
6. Expand platforms only after the Codex/Claude projection model stops drifting.
