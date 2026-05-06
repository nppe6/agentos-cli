# How To: Change Verify Commands

Change the commands agents should run during quality checks.

**Current platforms**: Codex and Claude Code.

## Preferred Location

Put project-level verification expectations in `.shelf/spec/**/quality-guidelines.md`, for example:

```markdown
## Verification

- Run `npm test` before finishing JavaScript changes.
- Run `npm run lint` before committing changes that touch source files.
```

Then make sure the active task's `check.jsonl` references the relevant quality spec.

## Platform Agent Overrides

If one platform needs different wording, edit:

- `.claude/agents/shelf-check.md`
- `.codex/agents/shelf-check.toml`

Keep the core expectation the same across platforms whenever possible.

## Testing

1. Create or choose a task with `check.jsonl` pointing at the quality spec.
2. Invoke `shelf-check`.
3. Confirm the agent reads the quality spec and runs the expected commands.

## Not Installed

The default CLI does not install `.shelf/worktree.yaml` or quality-loop hooks. Do not reference those files unless they exist as project-local customizations.
