# Worktree Configuration Status

AgentOS Shelf does not currently install worktree orchestration or `.shelf/worktree.yaml`.

Use normal git branches or user-managed worktrees. Keep task state in `.shelf/tasks/`, specs in `.shelf/spec/`, and session notes in `.shelf/workspace/`.

If worktree orchestration is added later, add it as a concrete CLI feature with generated files, doctor checks, update safety, and tests.
