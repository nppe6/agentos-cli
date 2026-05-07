---
status: in_progress
created: 2026-05-07
---

# Shelf Runtime Footprint And Codex Skills Review Findings

## Purpose

This document records the current review backlog after the runtime-footprint slimming and `.codex/skills/` restoration work. It separates:

1. **code-review findings** from multi-angle review,
2. **behavior findings** that were reproduced with real init/sync/update/doctor verification, and
3. **cleanup drift** that is lower-risk but still worth resolving before calling the alignment done.

The goal is to turn review feedback into an execution-ready checklist rather than lose it across chat turns.

## Summary

The recent changes did achieve two visible output goals:

- default generated `.shelf/` runtime is much slimmer and closer to upstream Trellis,
- `.codex/skills/` exists again alongside shared `.agents/skills/`.

The highest-risk runtime safety issues are now partially resolved, but the alignment is **not yet complete**. At this point:

- local override directories no longer shadow whole built-in source directories,
- project-local `.shelf` user data is no longer treated as removable managed install content,
- doctor now catches at least missing `.codex/hooks.json`,
- hook settings/config now render `python3` on non-Windows via `{{PYTHON_CMD}}`,
- but capability-model cleanup and documentation drift still remain.

## Findings By Priority

### P0

#### F-P0-001: Re-init can delete user-owned `.shelf` files after metadata capture

- **Status**: fixed and script-verified
- **Severity**: P0
- **Why it matters**: user-owned task/spec/workspace/custom-skill data under `.shelf/` can be deleted by a later forced init, which is data loss.

**Code path**

- `lib/utils/agent-os.js`
  - [recordAgentOsMetadata](../../../lib/utils/agent-os.js:888)
  - [collectManagedFiles](../../../lib/utils/agent-os.js:238)
  - [removeManagedInstallFiles](../../../lib/utils/agent-os.js:216)

**Mechanism**

- `recordAgentOsMetadata()` hashes every file under `.shelf/`.
- `collectManagedFiles()` later treats every hash entry as managed.
- `removeManagedInstallFiles()` deletes those managed file paths during init.

**Reproduced behavior**

Verified with:

1. `init`
2. add `.shelf/skills/local-skill/SKILL.md`
3. run `agentSync()`
4. run forced `agentInit()` again

Result before fix: the local skill was deleted.

**Current verification status**

Re-tested after the fix:

1. `init`
2. add `.shelf/skills/local-skill/SKILL.md`
3. run `agentSync()`
4. run forced `agentInit()` again

Result now: the local skill survives.

**Fix direction**

- Stop hashing all `.shelf/**` blindly.
- Track only generated/managed `.shelf` files.
- Explicitly exclude user-owned mutable areas such as:
  - `.shelf/spec/**`
  - `.shelf/tasks/**`
  - `.shelf/workspace/**`
  - `.shelf/skills/**`
  - optional local override roots unless explicitly generated.

**Verification to add**

- [x] A regression test now exists proving `.shelf/skills/local-skill/SKILL.md` survives `sync` + forced `init`.
- A regression test that proves task/spec/workspace user content is not deleted by re-init.

### P1

#### F-P1-001: Local override directories shadow entire built-in directories

- **Status**: fixed and script-verified
- **Severity**: P1
- **Why it matters**: a partial local override can silently remove unrelated built-in skills, agents, hooks, or bundled files from generated outputs.

**Code path**

- `lib/utils/agent-os.js`
  - [resolveTemplateSourceDirectory](../../../lib/utils/agent-os.js:1050)
  - [common source resolution](../../../lib/utils/agent-os.js:314)
  - [agentsDirectory resolution](../../../lib/utils/agent-os.js:322)
  - [bundled/common projection loops](../../../lib/utils/agent-os.js:429)
  - [agent projection loop](../../../lib/utils/agent-os.js:570)
- `lib/actions/agent-update.js`
  - [obsolete file planning path](../../../lib/utils/agent-os.js:582)
  - [update planning/obsolete delete flow](../../../lib/actions/agent-update.js:45)

**Mechanism**

- source resolution returns the first existing directory,
- projection then enumerates only that directory,
- unrelated built-in files disappear from `plannedFiles`,
- update treats them as obsolete and deletes them.

**Reproduced behavior**

Verified with:

1. `init`
2. create only `.shelf/agents/shelf-implement.md`
3. run `agentUpdate()`

Result before fix:

- `.codex/agents/shelf-implement.toml` remains
- `.codex/agents/shelf-check.toml` is deleted
- `.codex/agents/shelf-research.toml` is deleted

**Current verification status**

Re-tested after the fix with the same partial override flow.

Result now:

- `.codex/agents/shelf-implement.toml` remains
- `.codex/agents/shelf-check.toml` remains
- `.codex/agents/shelf-research.toml` remains

**Fix direction**

- Replace directory-level shadowing with per-file overlay semantics.
- Alternative: introduce an explicit “full replacement” override mechanism and keep default behavior additive.

**Verification to add**

- [x] Local `.shelf/agents/shelf-implement.md` override now preserves built-in check/research agents.
- Equivalent tests for local:
  - `.shelf/rules/`
  - `.shelf/templates/common-skills/`
  - `.shelf/templates/bundled-skills/`
  - `.shelf/templates/shared-hooks/`

#### F-P1-002: Codex-only init can delete a user-authored `CLAUDE.md`

- **Status**: effectively fixed by removing generated root `CLAUDE.md`; broader managed-file boundary cleanup still worth keeping in mind
- **Severity**: P1
- **Why it matters**: unselected-tool user files can be deleted even when there is no evidence they were generated by Shelf.

**Code path**

- `lib/utils/agent-os.js`
  - [collectManagedFiles](../../../lib/utils/agent-os.js:238)
  - [default tool entry file insertion](../../../lib/utils/agent-os.js:253)

**Mechanism**

- `collectManagedFiles()` always adds `AGENTS.md` and `CLAUDE.md`,
- later removal logic can delete those files during init even if they were user-authored and not selected.

**Reproduced behavior**

Verified with:

1. create hand-written `CLAUDE.md`
2. run Codex-only `agentInit(... tools: ['codex'])`

Result before fix: `CLAUDE.md` was deleted.

**Current verification status**

- Shelf no longer generates root `CLAUDE.md` for Claude alignment.
- Claude-only output is now `AGENTS.md` + `.claude/`.
- Codex+Claude output is now `AGENTS.md` + `.codex/` + `.agents/skills/` + `.claude/`.

**Fix direction**

- Only treat tool entry files as managed if the manifest or template hashes prove they were generated.
- Do not auto-assume all default tool entry files are safe to remove.

**Verification to add**

- A hand-written `CLAUDE.md` should survive Codex-only init.
- This second check is no longer relevant in the same form because root `CLAUDE.md` is no longer generated.

#### F-P1-003: Lifecycle test still writes into a runtime directory that no longer exists by default

- **Status**: fixed
- **Severity**: P1
- **Why it matters**: local full test runs can fail for the wrong reason, obscuring actual product regressions.

**Code path**

- `tests/agent-lifecycle.test.js`
  - [sync dry-run classifies clean files as update when source changes](../../../tests/agent-lifecycle.test.js:245)
  - [direct write to `.shelf/rules/AGENTS.shared.md`](../../../tests/agent-lifecycle.test.js:255)

**Mechanism**

- this test assumes `.shelf/rules/` exists by default,
- but the new runtime layout intentionally omits it unless the project creates an override.

**Fix direction**

- Match the other updated override tests:
  - create the directory,
  - seed the local override source,
  - then mutate it.

### P2

#### F-P2-001: Doctor misses broken projection states

- **Status**: fixed for the verified missing-file case
- **Severity**: P2
- **Why it matters**: a project can report healthy while key runtime projection files are missing.

**Code path**

- `lib/actions/agent-doctor.js`
  - [tool checks only file/dir skeletons](../../../lib/actions/agent-doctor.js:42)

**Mechanism**

- doctor checks entry file and broad directories,
- but not required generated files like:
  - `.codex/config.toml`
  - `.codex/hooks.json`
  - `.codex/hooks/*.py`
  - `.codex/skills/start/SKILL.md`
  - `.claude/settings.json`
  - `.claude/hooks/*.py`

**Reproduced behavior**

Verified before fix by deleting `.codex/hooks.json` and running `agentDoctor()`:

- doctor returned `ok: true`
- no issues were reported

**Current verification status**

Re-tested after the fix:

- doctor returns `ok: false`
- issue list includes `Missing file: .codex/hooks.json`
- doctor also reports these missing files when removed from a dual-platform install:
  - `.codex/config.toml`
  - `.codex/hooks/shelf-session-start.py`
  - `.claude/settings.json`
  - `.claude/hooks/shelf-inject-workflow-state.py`

**Fix direction**

- Add per-platform required-file checks, not just directory checks.

**Verification to add**

- [x] doctor now fails when `.codex/hooks.json` is missing
- [x] doctor now fails when `.codex/config.toml` is missing
- [x] doctor now fails when required hook scripts are missing in the verified Codex/Claude cases
- doctor should still fail when:
  - required skill projection file is missing

#### F-P2-002: Hook command templates still hard-code `python`

- **Status**: fixed and script-verified
- **Severity**: P2
- **Why it matters**: POSIX environments that only expose `python3` can lose hook execution and therefore lose workflow context injection.

**Code path**

- generation path bypasses transform:
  - [agent-os.js Codex hooks/config projection](../../../lib/utils/agent-os.js:356)
  - [agent-os.js Claude settings projection](../../../lib/utils/agent-os.js:348)
- hard-coded templates:
  - [templates/core/.shelf/templates/codex-hooks.json](../../../templates/core/.shelf/templates/codex-hooks.json:8)
  - [templates/core/.shelf/templates/claude-settings.json](../../../templates/core/.shelf/templates/claude-settings.json:10)

**Fix direction**

- Move hook/settings command strings onto `{{PYTHON_CMD}}` or equivalent transform path.

**Verification to add**

- [x] Generated hook config now uses `python3` on non-Windows where appropriate.

#### F-P2-003: Codex skill capability model is now overloaded

- **Status**: fixed
- **Severity**: P2
- **Why it matters**: future platform work will misread `toolScopedSkills` because Codex now uses that flag differently from Claude.

**Code path**

- [lib/utils/platform-registry.js:22](../../../lib/utils/platform-registry.js:22)
- [lib/utils/agent-os.js:542](../../../lib/utils/agent-os.js:542)
- [lib/utils/agent-os.js:607](../../../lib/utils/agent-os.js:607)
- [lib/actions/agent-doctor.js:45](../../../lib/actions/agent-doctor.js:45)

**Previous mechanism**

- Codex was marked `toolScopedSkills: true`,
- but shared skill projection still excluded Codex via `supportsSharedToolScopedSkills()`,
- then Codex got different behavior through special-casing.

**Current fix**

- The capability model now distinguishes:
  - `toolScopedSkills`: the platform owns a tool-local skills directory
  - `projectedToolScopedSkills`: shared skill projections should be written into that directory

This removes the `tool !== TOOL_CODEX` style special-case from shared skill projection.

#### F-P2-004: Platform map doc is missing `.codex/skills/`

- **Status**: fixed
- **Severity**: P2
- **Why it matters**: maintenance docs disagree on where Codex skills live.

**Docs**

- stale:
  - [platform-map.md](../../../templates/core/.shelf/templates/bundled-skills/shelf-meta/references/platform-files/platform-map.md:7)
- already updated elsewhere:
  - [skills-and-commands.md](../../../templates/core/.shelf/templates/bundled-skills/shelf-meta/references/platform-files/skills-and-commands.md:19)
  - [core/files.md](../../../templates/core/.shelf/templates/bundled-skills/shelf-meta/references/core/files.md:48)

**Fix direction**

- Update `platform-map.md` so Codex lists both `.agents/skills/` and `.codex/skills/`.

### P3

#### F-P3-001: Shelf-meta references still describe stale runtime state files

- **Status**: fixed for the tracked references
- **Severity**: P3
- **Why it matters**: future AI/customization work will inspect or protect the wrong files.

**Docs**

- [templates/core/.shelf/templates/bundled-skills/shelf-meta/SKILL.md:65](../../../templates/core/.shelf/templates/bundled-skills/shelf-meta/SKILL.md:65)
- [generated-files.md:3](../../../templates/core/.shelf/templates/bundled-skills/shelf-meta/references/local-architecture/generated-files.md:3)
- [generated-files.md:36](../../../templates/core/.shelf/templates/bundled-skills/shelf-meta/references/local-architecture/generated-files.md:36)
- [generated-files.md:56](../../../templates/core/.shelf/templates/bundled-skills/shelf-meta/references/local-architecture/generated-files.md:56)
- [local-architecture/overview.md:34](../../../templates/core/.shelf/templates/bundled-skills/shelf-meta/references/local-architecture/overview.md:34)

**Stale references**

- `.shelf/.template-hashes.json`
- `.shelf/.version`

**Current implementation truth**

- `template-hashes.json`
- `manifest.json`
- `update-manifest.json`
- `cliVersion` on manifest/update records

#### F-P3-002: Hook/settings reference doc under-describes Claude hook surface

- **Status**: fixed
- **Severity**: P3
- **Why it matters**: docs describe Claude as if only the session-start hook matters, while generated output now includes workflow-state injection too.

**Docs**

- [hooks-and-settings.md](../../../templates/core/.shelf/templates/bundled-skills/shelf-meta/references/platform-files/hooks-and-settings.md:26)

**Implementation truth**

- [lib/utils/shared-hooks.js](../../../lib/utils/shared-hooks.js:4)
- Claude gets both:
  - `shelf-session-start.py`
  - `shelf-inject-workflow-state.py`

## Execution Order Recommendation

### First wave: data-safety and output-integrity blockers

1. F-P0-001 re-init deletes user-owned `.shelf` files
2. F-P1-001 directory override shadowing
3. F-P1-002 user-authored `CLAUDE.md` deletion

### Second wave: runtime correctness and observability

4. F-P1-003 lifecycle test regression
5. F-P2-001 doctor missing required generated files
6. F-P2-002 hook command Python portability

### Third wave: maintainability and doc truthfulness

7. F-P3-001 stale state-file references

## Verification Checklist After Fixes

- [x] Default `init --tools codex,claude` produces slim `.shelf/` runtime only.
- [x] Default `init --tools codex` still generates:
  - [x] `.agents/skills/shelf-*`
  - [x] `.codex/skills/` directory
  - [x] `.codex/agents/*`
  - [x] `.codex/config.toml`
  - [x] `.codex/hooks.json`
- [x] Partial local `.shelf/agents/` override preserves built-in agents.
- [x] Partial local `.shelf/rules/` override preserves default managed-entry behavior.
- [x] Partial local common-skill / shared-hook override preserves unrelated built-ins in the verified cases.
- [x] Hand-written `CLAUDE.md` survives Codex-only init.
- [x] Project-local `.shelf/skills/local-skill/SKILL.md` survives sync + forced re-init.
- [x] Project-local `.shelf/spec/`, `.shelf/tasks/`, and `.shelf/workspace/` files survive forced re-init.
- [x] doctor fails when required generated files are missing for the verified Codex/Claude file and shared-skill cases.
- [x] Generated hook command strings use the correct Python command for the platform.
