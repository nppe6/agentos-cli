# Multi-Session Status

AgentOS Shelf does not currently install multi-session worktree orchestration.

Current supported workflow:

- Use `.shelf/tasks/` for task context.
- Use `.shelf/.runtime/sessions/` for session-scoped active task state.
- Use normal git branches or user-managed worktrees when isolation is needed.
- Use `.shelf/workspace/` journals to record session outcomes.

If a project contains `.shelf/worktree.yaml`, multi-agent registries, or custom worktree scripts, treat them as project-local additions and inspect their current contents before changing them.

Future worktree orchestration should be added as an explicit CLI capability with generated files, doctor checks, update safety, and tests.
