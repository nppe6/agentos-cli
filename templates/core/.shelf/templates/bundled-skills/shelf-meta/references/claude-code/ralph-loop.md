# Quality Loop Status

AgentOS Shelf does not currently install a Ralph Loop or equivalent quality-loop hook.

Verification behavior belongs in:

- `.shelf/spec/**/quality-guidelines.md`
- `.claude/agents/shelf-check.md`
- `.codex/agents/shelf-check.toml`
- project test scripts such as `npm test`, `pnpm lint`, or `pytest`

If a user wants automatic quality-loop enforcement, design it as a new explicit platform capability with tests instead of assuming hidden hook files already exist.
