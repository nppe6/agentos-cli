# Plan

Created: 2026-05-07
Status: active

## Goal

Bring Shelf's generated runtime footprint closer to upstream Trellis for Claude/Codex projects by:
1. stopping projection of generator-internal `.shelf` source directories into user projects by default,
2. restoring the `.codex/skills/` directory as the Codex-specific skill layer,
3. preserving current shared-skill behavior through `.agents/skills/`, and
4. updating tests and docs to reflect the new runtime layout.

## Scope

In scope:
- Init/sync source-resolution changes so built-in projection sources come from the CLI package, not copied `.shelf/templates/` in the target project.
- Runtime `.shelf/` minimization for fresh init output.
- `.codex/skills/` directory restoration, with support for Codex-specific skill sources when present.
- Test updates for generated layout and doctor/runtime expectations.

Out of scope:
- New platform expansion.
- Registry/download/template-fetching work.
- Broad redesign of user-local customization UX beyond keeping current custom-skill behavior working.

## Implementation Units

### U1: Separate built-in projection sources from project runtime
- Move `collectProjectionTemplates()` off target-project `.shelf/templates`, `.shelf/rules`, `.shelf/agents`, and built-in `.shelf/skills`.
- Read built-in projection sources from package-internal template roots instead.
- Keep project-local custom skills optional from target `.shelf/skills/` when present.
- Ensure built-in projection continues to work for Claude and Codex without `.shelf/templates/` in the target project.

Files:
- `lib/utils/agent-os.js`
- `lib/utils/platform-registry.js`

### U2: Minimize generated `.shelf/` runtime footprint
- Restrict `copyTemplateFiles()` / layered copy to runtime directories and files only.
- Stop emitting generator-internal directories by default on fresh init:
  - `.shelf/templates/`
  - `.shelf/rules/`
  - `.shelf/agents/`
  - built-in `.shelf/skills/`
  - `.shelf/README.md`
  - `.shelf/manifest.template.json`
- Leave runtime-critical contents intact: scripts, spec, tasks, workspace, config, workflow, manifest, hashes.

Files:
- `lib/utils/agent-os.js`
- `lib/actions/agent-doctor.js`

### U3: Restore Codex-specific skills layer
- Reintroduce `.codex/skills/` as a managed generated directory.
- Support package-internal Codex-only skill sources when present.
- Ensure the directory exists even when there are currently no Codex-only skills, matching upstream shape.
- Keep shared skills in `.agents/skills/`.

Files:
- `templates/tools/codex/tool.json`
- `lib/utils/agent-os.js`
- `lib/utils/platform-registry.js`

### U4: Lock behavior with tests and docs
- Update init/layout tests to assert the slimmer `.shelf/` runtime and restored `.codex/skills/`.
- Update doctor expectations if needed.
- Adjust architecture/usage docs where they still describe the older project-runtime source layout.

Files:
- `tests/agent-init.test.js`
- `tests/platform-registry.test.js`
- `tests/agent-lifecycle.test.js` (if needed)
- `docs/Shelf与Trellis使用操作手册.md`
- focused architecture/alignment docs if they directly describe generated runtime layout

## Verification

- `node --test` locally
- Real smoke init for:
  - `--tools codex`
  - `--tools codex,claude`
- Verify generated runtime shape:
  - `.shelf/` no longer contains generator-only built-in source dirs by default
  - `.agents/skills/` still contains shared skills
  - `.codex/skills/` exists
  - `.codex/agents`, hooks, config still exist
