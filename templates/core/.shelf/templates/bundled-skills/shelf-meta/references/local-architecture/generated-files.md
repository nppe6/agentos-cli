# Local Files Generated After Init

`agentos-cli shelf init` writes the AgentOS Shelf runtime into the user project. Later, `agentos-cli shelf update` tries to update AgentOS Shelf-managed template files, but it uses `.shelf/template-hashes.json` to determine which files have already been modified by the user.

This page only describes files that are visible and editable inside the user project.

## `.shelf/`

```text
.shelf/
鈹溾攢鈹€ workflow.md
鈹溾攢鈹€ config.yaml
鈹溾攢鈹€ .developer
|- manifest.json
|- template-hashes.json
|- update-manifest.json
|- .runtime/
鈹溾攢鈹€ scripts/
鈹溾攢鈹€ spec/
鈹溾攢鈹€ tasks/
鈹斺攢鈹€ workspace/
```

| Path | Usually editable? | Notes |
| --- | --- | --- |
| `.shelf/workflow.md` | Yes | Local workflow documentation and AI routing rules. |
| `.shelf/config.yaml` | Yes | Project configuration, hooks, packages, journal line limits, and related settings. |
| `.shelf/spec/` | Yes | Project specs, intended to be updated regularly by users and AI. |
| `.shelf/tasks/` | Yes | Task material and research artifacts, maintained by the task workflow. |
| `.shelf/workspace/` | Yes | Session records, usually written by `add_session.py`. |
| `.shelf/scripts/` | Carefully | Local runtime. It can be customized, but only after understanding the call chain. |
| `.shelf/skills/` | Yes | Optional project-local custom skills, separate from built-in package templates. |
| `.shelf/agents/` | Yes | Optional project-local agent overrides for implement/check/research behavior. |
| `.shelf/rules/` | Yes | Optional local managed-entry overrides such as `AGENTS.shared.md`. |
| `.shelf/manifest.json` | No | Records selected tools, generated files, and the CLI version used for the latest projection. |
| `.shelf/template-hashes.json` | No | Template hash record. Do not hand-write business rules here. |
| `.shelf/update-manifest.json` | No | Written by `shelf update` to describe backups, deletions, skips, and migrations. |
| `.shelf/.runtime/` | No | Runtime state, usually written automatically by hooks/scripts. |
| `.shelf/.developer` | Carefully | Current developer identity. |

## Platform Directories

Current AgentOS Shelf CLI projections support Codex and Claude Code. Add another platform only when the CLI has a concrete adapter for it.

| Category | Example paths | Purpose |
| --- | --- | --- |
| hooks | `.claude/hooks/` | Claude Code session-start reminder hook. |
| settings | `.claude/settings.json` | Registers the Claude Code hook. |
| agents | `.claude/agents/`, `.codex/agents/` | Define agents such as `shelf-research`, `shelf-implement`, and `shelf-check`; Codex agents are TOML. |
| skills | `.claude/skills/`, `.agents/skills/`, `.codex/skills/` | Skills that auto-trigger or can be read by AI. Codex uses shared skills from `.agents/skills/` and may also have Codex-specific local skills under `.codex/skills/`. |
| commands/skill projections | `.claude/commands/shelf/`, `.agents/skills/shelf-continue/`, `.agents/skills/shelf-finish-work/` | `continue` and `finish-work` come from shared common command templates, then project to Claude commands and Codex-readable shared skills. |
| hooks/config | `.claude/settings.json`, `.claude/hooks/`, `.codex/config.toml`, `.codex/hooks.json`, `.codex/hooks/` | Platform startup and workflow-state wiring. |

When modifying a platform directory, also confirm whether `.shelf/workflow.md` still describes the same flow.

## Meaning Of Template Hashes

`.shelf/template-hashes.json` records the content hash from the last time AgentOS Shelf wrote a template file. `agentos-cli shelf update` uses it to distinguish three cases:

| Case | Update behavior |
| --- | --- |
| File was not modified by the user | It can be updated automatically. |
| File was modified by the user | Prompt the user to overwrite, keep, or generate `.new`. |
| File is no longer a current template | It may be deleted, renamed, or preserved according to migration rules. |

When an AI customizes local AgentOS Shelf files, it does not need to maintain hashes manually. It is normal for AgentOS Shelf update to recognize the result as "modified by the user."

## Local Customization Boundaries

Editable by default:

- `.shelf/workflow.md`
- `.shelf/config.yaml`
- `.shelf/spec/**`
- `.shelf/scripts/**`
- Platform hooks, settings, agents, skills, and commands

Do not edit by default:

- Global npm install directory
- `node_modules/agentos-cli`
- AgentOS Shelf GitHub repository source code
- Concrete state files under `.shelf/.runtime/**`
- Hash contents inside `.shelf/template-hashes.json`

Switch to the AgentOS Shelf CLI source-code perspective only when the user explicitly wants to contribute upstream.
