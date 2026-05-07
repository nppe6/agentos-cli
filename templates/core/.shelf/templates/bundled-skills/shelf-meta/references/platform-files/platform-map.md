# Platform File Map

This page lists current AgentOS Shelf file locations in a user project by platform. The current CLI supports Codex and Claude Code only. Add another platform one at a time when the CLI has a concrete adapter for it.

## Matrix

| Platform | CLI selection | Main directory | Skill directory | Agent directory | Hooks/commands |
| --- | --- | --- | --- | --- | --- |
| Claude Code | `--tools claude` | `.claude/` | `.claude/skills/` | `.claude/agents/` | `.claude/hooks/`, `.claude/settings.json`, `.claude/commands/shelf/` |
| Codex | `--tools codex` | `.codex/` | `.agents/skills/` (shared), `.codex/skills/` (Codex-specific) | `.codex/agents/` | `.codex/config.toml`, `.codex/hooks.json`, `.codex/hooks/` |

## Capability Groups

### AgentOS Shelf Agent Support

Codex and Claude Code both receive `shelf-research`, `shelf-implement`, and `shelf-check` files. Their implementation/check agents load task context by reading the active task and JSONL files.

### Shared `.agents/skills/`

Codex writes the shared `.agents/skills/` layer. Claude Code receives tool-scoped copies under `.claude/skills/`.

### Codex `.codex/skills/`

`.codex/skills/` is reserved for Codex-specific local skills. The current default Shelf projection creates the directory but does not duplicate shared skills into it.

## Decision Rules When Modifying Platform Files

1. User specified a platform: modify only that platform directory unless shared workflow/spec files must also change.
2. User says "all platforms should do this": synchronize Codex and Claude Code entry points; add more platforms only if they are actually generated in the project.
3. User only says "my AI": inspect the configuration directories that actually exist in the project and infer the current AI platform.
4. User wants project rules: prefer `.shelf/spec/` or a project-local skill.
5. User wants AgentOS Shelf behavior: edit `.shelf/workflow.md` plus the relevant Codex/Claude hooks, agents, skills, or commands.

## When Paths Differ

Platform ecosystems change, and user projects may already be customized. If this table disagrees with local files, use the actual settings/config in the user project as authoritative:

- Check the hook that settings registers.
- Check the script that a command/workflow or projected skill points to.
- Judge behavior by the read rules currently written in the agent file.

Do not delete a custom file just because it is not listed in this path table.
