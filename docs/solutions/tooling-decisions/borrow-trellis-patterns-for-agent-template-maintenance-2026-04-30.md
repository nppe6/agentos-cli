---
title: Borrow Trellis Patterns for Agent Template Maintenance
date: 2026-04-30
category: docs/solutions/tooling-decisions
module: agent template maintenance
problem_type: tooling_decision
component: tooling
severity: medium
applies_when:
  - "Maintaining agent workflow templates across Codex and Claude Code"
  - "Updating generated rules or skills without overwriting user changes blindly"
  - "Turning one-off external project research into reusable project memory"
tags: [agent-os, trellis, templates, codex, claude, persistence, update-strategy]
---

# Borrow Trellis Patterns for Agent Template Maintenance

## Context

The local `agentos-cli` project injects AI workflow files into existing projects. Its refactor direction is to install a core Agent OS layer first, then add optional stack packs such as Vue.

Research into [mindfold-ai/Trellis](https://github.com/mindfold-ai/Trellis) showed a broader pattern: Trellis treats agent configuration as a maintainable harness rather than a one-time rule dump. It keeps a shared `.trellis/` source of truth, generates platform-specific files, tracks tasks and workspace memory, and documents update behavior around template hashes and migration.

This matters because recent template review found several recurring risks in this project: rules can become too large, platform-specific paths can drift, generated files can overwrite user changes, and valuable research can be lost if it only remains in chat history.

## Guidance

Use Trellis as a reference for system shape, not as something to copy wholesale. Keep the current project narrower and Vue-focused, but borrow the parts that directly reduce maintenance risk.

Recommended borrowings:

- Add template hash tracking for generated files. Store install-time hashes in a generated metadata file so future updates can distinguish unchanged generated files, user-edited files, and true conflicts.
- Split large shared rules into indexed spec documents. Keep the entry files lightweight and make them point to task-relevant rule/spec files instead of continuously expanding one `AGENTS.shared.md`.
- Add a task or workspace memory directory for durable agent context, such as `.agent-os/tasks/<topic>/` or `.agent-os/workspace/<user>/journal.md`.
- Introduce platform adapters for Codex and Claude Code paths. Avoid hardcoding `.claude/skills` inside skills or scripts that should also work for Codex.
- Add safer lifecycle commands before broadening scope: `agent update --dry-run`, `agent doctor`, `agent add-tool`, and `agent repair`.
- Treat external research as documentation output when it changes future design decisions. A useful rule of thumb: if the finding should influence future template edits, it belongs under `docs/solutions/` or a project decision document.

Do not copy these Trellis ideas immediately:

- Full task orchestration with JSONL context files for every implementation step.
- Large multi-platform matrix support before Codex and Claude Code are stable.
- Complex sub-agent context routing unless the local CLI grows a real runtime harness instead of remaining a template injector.

## Why This Matters

The current project is valuable because it is lightweight. The risk is that lightweight template injection becomes fragile as soon as users customize generated files or multiple agent platforms need different paths, permissions, and skill formats.

Trellis demonstrates that the main scalability problem is not the first install. The hard part is maintaining the installed workflow over time:

- Users edit generated files.
- CLI templates evolve.
- Codex and Claude Code have different conventions.
- Rules grow until they contradict each other.
- Useful agent behavior is discovered during real work but not persisted.

Borrowing the update and memory patterns gives `agentos-cli` a path to remain small while avoiding destructive upgrades and repeated rediscovery.

## When to Apply

- When changing `lib/utils/agent-os.js`, `lib/actions/agent-init.js`, or `scripts/sync-agent-os.ps1`.
- When adding a new supported agent tool beyond Codex and Claude Code.
- When editing generated template paths inside skills, especially `mastergo-to-code`.
- When splitting or simplifying shared rules under `templates/core` or stack-specific rules under `templates/stacks/vue`.
- When a user asks to preserve lessons from an external tool, prior conversation, or real project usage.

## Examples

Template update behavior should move from simple overwrite toward a dry-run report:

```text
agentos-cli agent update --dry-run

Generated file status:
- AGENTS.md: unchanged since install, safe to update
- .codex/skills/vue-best-practices/SKILL.md: user modified, requires confirmation
- .claude/skills/mastergo-to-code/SKILL.md: template changed and user modified, conflict
```

Platform-specific paths should be resolved through an adapter:

```js
const TOOL_LAYOUTS = {
  codex: {
    entryFile: 'AGENTS.md',
    skillsDir: '.codex/skills'
  },
  claude: {
    entryFile: 'CLAUDE.md',
    skillsDir: '.claude/skills'
  }
};
```

Large shared rules should become an index:

```text
.agent-os/
  rules/
    AGENTS.shared.md
    specs/
      workflow.md
      verification.md
      vue-boundaries.md
      platform-adapters.md
```

`AGENTS.shared.md` should describe when to load these files rather than embedding every detailed rule directly.

## Related

- [Trellis GitHub README](https://github.com/mindfold-ai/Trellis)
- [Trellis install and first task guide](https://docs.trytrellis.app/start/install-and-first-task)
- [Trellis multi-platform guide](https://docs.trytrellis.app/advanced/multi-platform)
- [Vue template review issue list](../../vue-template-review-issues.md)
