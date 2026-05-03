# Trellis Alignment Gap Backlog

Date: 2026-05-03

This backlog records known differences between AgentOS Shelf CLI and the Trellis upstream project. It is not a commitment to clone every Trellis feature. Use it to decide, item by item, which differences should be aligned, deferred, or intentionally kept as Shelf's lighter product shape.

## Current Position

Shelf has absorbed the core Trellis model:

- `.shelf/` is the canonical project memory.
- Codex and Claude are generated projections.
- Tasks, specs, workspace memory, skills, agents, and update safety exist.
- Codex now uses native `.codex/agents/*.toml`, `.codex/config.toml`, and `.codex/hooks.json`.
- Shared skills use `.agents/skills/` for Codex and `.claude/skills/` for Claude Code.

The remaining gaps fall into two groups:

1. Runtime automation gaps: hooks, automatic context injection, workflow breadcrumbs, and task readiness automation.
2. Product/architecture gaps: platform breadth, CLI ergonomics, spec packs, migration depth, worktree orchestration, and documentation maturity.

---

## Runtime Automation Gaps

These are the differences most directly related to whether the AI automatically receives the right context at the right time.

| Gap | Shelf today | Plain-language purpose | Suggested priority |
| --- | --- | --- | --- |
| Rich Codex session-start injection | Lightweight Codex hook exists | When a new Codex session starts, Trellis injects richer project state, active task state, workflow index, and spec index. Shelf currently provides a smaller context payload. | Medium |
| Rich Codex per-turn workflow state | Simplified Codex `UserPromptSubmit` hook exists | Every user prompt reminds the AI what task is active, what phase it is in, and what the next expected action is. This keeps the AI from drifting. | Medium |
| Session-aware active task resolution in hooks | Shelf has `.shelf/.runtime/sessions/`, but hooks use a simpler path | Multiple AI windows can each remember a different active task without overwriting one another. | Medium |
| Task readiness classification | Basic task status and JSONL files exist | Trellis can say "not ready, missing PRD" or "ready, dispatch implement". Shelf mostly expects the agent to inspect files and judge. | High after Vue testing |
| Codex hook enablement diagnostics | Config comments exist | Users need a clear warning when Codex hooks are installed but ignored because the global Codex hook feature flag is off. | Medium |
| Codex platform-specific skills | Shared skills use `.agents/skills/`; no `.codex/skills` content | `.codex/skills` is useful only if Shelf needs Codex-only skills. Shared workflow skills should stay in `.agents/skills`. | Low |
| Claude PreToolUse sub-agent context injection | Not installed | Before Claude starts an implement/check sub-agent, Trellis can inject the exact JSONL context that sub-agent needs. Shelf makes agents pull it themselves. | Medium |
| Claude per-turn workflow-state injection | Not installed | Every user message can carry a small "current task/current phase" reminder. Shelf currently relies on agent instructions and commands. | Medium |
| Rich Claude SessionStart injection | Lightweight reminder only | Trellis injects richer startup context; Shelf tells Claude where to read the context. | Medium |
| Claude settings hook matrix | Only lightweight SessionStart | Trellis registers startup/clear/compact/session/sub-agent/per-turn hooks. Shelf intentionally keeps this smaller. | Low until real use proves need |
| Automatic journal capture | Explicit `shelf workspace add-session` | Trellis can move toward automatic session memory. Shelf currently asks users or agents to record sessions explicitly. | Medium |
| Hook failure reporting | Basic | If Python is missing, hook input is malformed, task state is stale, or no active task exists, users should get actionable messages. | Medium |

---

## Product And Architecture Gaps

These are differences outside the automatic hook/context system.

| Gap | Shelf today | Plain-language purpose | Suggested priority |
| --- | --- | --- | --- |
| Platform breadth | Codex and Claude only | Trellis can project the same memory into many AI tools. Shelf intentionally supports only the two current platforms. | Low until Codex/Claude are stable |
| Platform configurator layer | Generic projection loop plus capability registry | Trellis has per-platform installers. Shelf has a lighter shared generator, so platform-specific behavior is harder to express. | Medium if adding a third platform |
| Template renderer depth | File copy plus small transforms | Trellis can render shared templates differently per platform. Shelf currently does minimal transformation, such as markdown agent to Codex TOML. | Medium |
| CLI command surface | Smaller Node CLI, many task actions pass through Python | Trellis gives a more productized task/workflow command surface. Shelf works but some commands feel like script passthrough. | High for usability |
| Task command ergonomics | `shelf task [args...]` passthrough | Users should not need to remember lower-level Python script argument shapes for common create/start/current/finish flows. | High |
| Bootstrap task depth | Static generic bootstrap task | Trellis uses bootstrap to turn empty specs into real project conventions. Shelf needs stronger first-run guidance, especially for Vue/admin projects. | High |
| Framework/spec packs | Core backend/frontend/guides plus package scaffold | Vue, React, Rails, Node API, or full-stack packs would give projects more useful starting specs. | High for Vue test path |
| Workspace memory automation | Explicit context and add-session commands | The system can remember discoveries and sessions, but the user/agent must write them intentionally. | Medium |
| Developer onboarding depth | Developer init and join task exist | Trellis has a richer new-developer onboarding flow. Shelf has the basics. | Low |
| Full migration engine | Lightweight update manifest, backups, hashes, protected paths, `update.skip` | Trellis has a more complete versioned migration system. Shelf is safe enough for now but less powerful for schema changes. | Medium only when real migrations appear |
| Managed block coverage | Strongest for `AGENTS.md` and generated file hashes | Trellis can protect more runtime-critical blocks. Shelf protects user edits but at a simpler granularity. | Medium |
| Python runtime handling | `doctor` checks Python and CLI calls scripts | Trellis handles Python command/version/platform concerns more deeply. Shelf is simpler. | Medium |
| Worktree orchestration | Not implemented | Isolated task worktrees let agents work in parallel or on risky changes without dirtying the main workspace. | Low until task lifecycle is stable |
| Ralph loop / quality loop | `shelf-check` agent and manual checks | A quality loop can repeatedly check and fix until the work meets criteria. Shelf does not automate that loop. | Medium |
| Marketplace / capability ecosystem | `shelf skills import` only | Trellis has a stronger path toward reusable skills/commands/platform integrations. Shelf can import skills but is not an ecosystem yet. | Low |
| Documentation maturity | README, comparison docs, shelf-meta references still evolving | Trellis has mature official docs. Shelf documentation is being aligned with the implementation. | High |
| Product scope | Lightweight workflow injection CLI | Trellis is a broader AI development operating system. Shelf should decide deliberately when to stay lighter. | Ongoing decision |

---

## Recommended Near-Term Decisions

1. **Do not add more platforms yet.** Validate Codex and Claude in real Vue projects first.
2. **Prioritize bootstrap/spec quality.** The first real project test should prove that Shelf can turn a Vue codebase into useful project conventions.
3. **Improve task command ergonomics.** Add friendly wrappers for common task create/start/current/finish flows if passthrough feels clumsy in testing.
4. **Keep Claude heavy hook injection deferred.** Add it only if real usage shows agents regularly miss task/spec context.
5. **Validate Codex hooks in a real Codex session.** The file shape now matches Trellis more closely, but runtime behavior still needs hands-on testing.

## Triage Labels

Use these labels when turning backlog items into plans:

- `align-now`: needed for current Codex/Claude core reliability.
- `vue-test`: useful for the upcoming Vue project validation.
- `defer-lightweight`: intentionally deferred to preserve Shelf simplicity.
- `future-platform`: only relevant when adding another AI tool.
- `needs-evidence`: wait for real project testing before deciding.
