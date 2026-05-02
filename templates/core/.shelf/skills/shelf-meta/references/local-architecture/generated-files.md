# Local Files Generated After Init

`agentos init` writes the AgentOS Shelf runtime into the user project. Later, `agentos update` tries to update AgentOS Shelf-managed template files, but it uses `.shelf/.template-hashes.json` to determine which files have already been modified by the user.

This page only describes files that are visible and editable inside the user project.

## `.shelf/`

```text
.shelf/
├── workflow.md
├── config.yaml
├── .developer
├── .version
├── .template-hashes.json
├── .runtime/
├── scripts/
├── spec/
├── tasks/
└── workspace/
```

| Path | Usually editable? | Notes |
| --- | --- | --- |
| `.shelf/workflow.md` | Yes | Local workflow documentation and AI routing rules. |
| `.shelf/config.yaml` | Yes | Project configuration, hooks, packages, journal line limits, and related settings. |
| `.shelf/spec/` | Yes | Project specs, intended to be updated regularly by users and AI. |
| `.shelf/tasks/` | Yes | Task material and research artifacts, maintained by the task workflow. |
| `.shelf/workspace/` | Yes | Session records, usually written by `add_session.py`. |
| `.shelf/scripts/` | Carefully | Local runtime. It can be customized, but only after understanding the call chain. |
| `.shelf/.runtime/` | No | Runtime state, usually written automatically by hooks/scripts. |
| `.shelf/.developer` | Carefully | Current developer identity. |
| `.shelf/.version` | No | AgentOS Shelf version record used by update/migration logic. |
| `.shelf/.template-hashes.json` | No | Template hash record. Do not hand-write business rules here. |

## Platform Directories

Different platforms generate different directories. Common categories:

| Category | Example paths | Purpose |
| --- | --- | --- |
| hooks | `.claude/hooks/`, `.codex/hooks/`, `.cursor/hooks/` | Inject session context, workflow-state, and sub-agent context. |
| settings | `.claude/settings.json`, `.codex/hooks.json`, `.qoder/settings.json` | Tell the platform when to run hooks or plugins. |
| agents | `.claude/agents/`, `.codex/agents/`, `.kiro/agents/` | Define agents such as `agentos-research`, `agentos-implement`, and `shelf-check`. |
| skills | `.claude/skills/`, `.agents/skills/`, `.qoder/skills/` | Skills that auto-trigger or can be read by AI. |
| commands/prompts/workflows | `.cursor/commands/`, `.github/prompts/`, `.windsurf/workflows/` | Explicit user-invoked command or workflow entry points. |

When modifying a platform directory, also confirm whether `.shelf/workflow.md` still describes the same flow.

## Meaning Of Template Hashes

`.shelf/.template-hashes.json` records the content hash from the last time AgentOS Shelf wrote a template file. `agentos update` uses it to distinguish three cases:

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
- Platform hooks, settings, agents, skills, commands, prompts, and workflows

Do not edit by default:

- Global npm install directory
- `node_modules/@mindfoldhq/agentos`
- AgentOS Shelf GitHub repository source code
- Concrete state files under `.shelf/.runtime/**`
- Hash contents inside `.shelf/.template-hashes.json`

Switch to the AgentOS Shelf CLI source-code perspective only when the user explicitly wants to contribute upstream.
