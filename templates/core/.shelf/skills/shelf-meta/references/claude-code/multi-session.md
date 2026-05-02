# Multi-Session Reference

Documentation for parallel isolated sessions using Git worktrees.

---

## Overview

Multi-Session enables **parallel, isolated development sessions** using Git worktrees. Each session runs in its own directory with its own branch.

**Key Distinction**:
- **Multi-Agent** = Multiple agents in current directory (dispatch 鈫?implement 鈫?check)
- **Multi-Session** = Parallel sessions in separate worktrees (this document)

---

## When to Use Multi-Session

| Scenario | Use Multi-Session? |
|----------|-------------------|
| Normal task in current branch | No - use Multi-Agent |
| Long-running task, want to work on other things | Yes |
| Multiple independent tasks in parallel | Yes |
| Task needs clean isolated environment | Yes |
| Quick fix or small change | No |

---

## Architecture

```
鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?                        MAIN REPOSITORY                                     鈹?鈹?                        (your current directory)                            鈹?鈹?                                                                            鈹?鈹? /shelf:parallel 鈫?Configure task 鈫?start.py                             鈹?鈹?                                          鈹?                                鈹?鈹?                                          鈹?Creates worktree               鈹?鈹?                                          鈹?Starts agent                   鈹?鈹?                                          鈻?                                鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹尖攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?                                            鈹?              鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹尖攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?              鈹?                            鈹?                                鈹?              鈻?                            鈻?                                鈻?鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹? 鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹? 鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?WORKTREE 1           鈹? 鈹?WORKTREE 2           鈹? 鈹?WORKTREE 3           鈹?鈹?feature/add-login    鈹? 鈹?feature/user-profile 鈹? 鈹?fix/api-bug          鈹?鈹?                     鈹? 鈹?                     鈹? 鈹?                     鈹?鈹?鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹? 鈹?鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹? 鈹?鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?鈹?鈹?Dispatch Agent   鈹?鈹? 鈹?鈹?Dispatch Agent   鈹?鈹? 鈹?鈹?Dispatch Agent   鈹?鈹?鈹?鈹?      鈫?         鈹?鈹? 鈹?鈹?      鈫?         鈹?鈹? 鈹?鈹?      鈫?         鈹?鈹?鈹?鈹?Implement Agent  鈹?鈹? 鈹?鈹?Implement Agent  鈹?鈹? 鈹?鈹?Implement Agent  鈹?鈹?鈹?鈹?      鈫?         鈹?鈹? 鈹?鈹?      鈫?         鈹?鈹? 鈹?鈹?      鈫?         鈹?鈹?鈹?鈹?Check Agent      鈹?鈹? 鈹?鈹?Check Agent      鈹?鈹? 鈹?鈹?Check Agent      鈹?鈹?鈹?鈹?      鈫?         鈹?鈹? 鈹?鈹?      鈫?         鈹?鈹? 鈹?鈹?      鈫?         鈹?鈹?鈹?鈹?create_pr.py     鈹?鈹? 鈹?鈹?create_pr.py     鈹?鈹? 鈹?鈹?create_pr.py     鈹?鈹?鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹? 鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹? 鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?鈹?                     鈹? 鈹?                     鈹? 鈹?                     鈹?鈹?Session: abc123      鈹? 鈹?Session: def456      鈹? 鈹?Session: ghi789      鈹?鈹?PID: 12345           鈹? 鈹?PID: 12346           鈹? 鈹?PID: 12347           鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹? 鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹? 鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?
Location: ../worktrees/  (default)
```

---

## Git Worktree

### What is a Worktree?

Git worktrees allow multiple working directories from one repository:

```
/project/                              # Main repo (main branch)
/project/../worktrees/                 # Default: ../worktrees
鈹溾攢鈹€ feature/add-login/                # Worktree 1 (own branch)
鈹溾攢鈹€ feature/user-profile/             # Worktree 2 (own branch)
鈹斺攢鈹€ fix/api-bug/                      # Worktree 3 (own branch)
```

### Benefits

| Benefit | Description |
|---------|-------------|
| **True isolation** | Separate filesystem per session |
| **Own branch** | Each worktree on its own branch |
| **Parallel execution** | Multiple agents work simultaneously |
| **Clean state** | Start fresh, no interference |
| **Session persistence** | Each has `.session-id` for resume |
| **Easy cleanup** | Remove worktree = remove everything |

---

## Configuration

### worktree.yaml

Location: `.shelf/worktree.yaml`

```yaml
# Where worktrees are created (relative to project)
# Default: ../worktrees
worktree_dir: ../worktrees

# Files to copy to each worktree (default: [])
copy:
  - .shelf/.developer      # Developer identity
  - .env                      # Environment variables
  - .env.local                # Local overrides

# Commands after worktree creation (default: [])
post_create:
  - npm install               # Install dependencies
  # - pnpm install --frozen-lockfile

# Verification commands for Ralph Loop (default: [])
verify:
  - pnpm lint
  - pnpm typecheck
```

### Task Configuration

Each session needs a configured task:

```json
// task.json
{
  "branch": "feature/add-login",     // Required for worktree
  "base_branch": "main",
  "worktree_path": null,             // Set by start.py
  "current_phase": 0,
  "next_action": [
    {"phase": 1, "action": "implement"},
    {"phase": 2, "action": "check"},
    {"phase": 3, "action": "finish"},
    {"phase": 4, "action": "create-pr"}
  ]
}
```

---

## Scripts

### start.py - Start Session

Creates worktree and starts agent.

```bash
python3 .shelf/scripts/multi_agent/start.py <task-dir>
```

**Actions**:
1. Read `task.json` for branch name
2. Create git worktree:
   ```bash
   git worktree add -b <branch> ../shelf-worktrees/<branch>
   ```
3. Copy files from `worktree.yaml` copy list
4. Copy task directory to worktree
5. Run `post_create` hooks
6. Set the session-scoped active task for the worktree run
7. Start Claude Dispatch Agent:
   ```bash
   claude -p --agent dispatch \
     --session-id <uuid> \
     --dangerously-skip-permissions \
     --output-format stream-json \
     --verbose "Start the pipeline"
   ```
8. Register to `registry.json`

**Example**:
```bash
python3 .shelf/scripts/multi_agent/start.py .shelf/tasks/01-31-add-login-taosu
# Output: Started agent in ../shelf-worktrees/feature/add-login
```

---

### status.py - Monitor Sessions

Check all running sessions.

```bash
# Overview
python3 .shelf/scripts/multi_agent/status.py

# Detailed view
python3 .shelf/scripts/multi_agent/status.py --detail <task-name>

# Watch mode
python3 .shelf/scripts/multi_agent/status.py --watch <task-name>

# View logs
python3 .shelf/scripts/multi_agent/status.py --log <task-name>

# Show registry
python3 .shelf/scripts/multi_agent/status.py --registry
```

**Output**:
```
Active Sessions:
鈹屸攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?Task         鈹?Status   鈹?Phase          鈹?Elapsed  鈹?Files     鈹?鈹溾攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹尖攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹尖攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹尖攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹尖攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?鈹?add-login    鈹?Running  鈹?2/4 (check)    鈹?15m 32s  鈹?5 changed 鈹?鈹?fix-api      鈹?Stopped  鈹?1/4 (implement)鈹?8m 15s   鈹?2 changed 鈹?鈹斺攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹粹攢鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹?
Resume stopped sessions:
  cd ../shelf-worktrees/feature/fix-api && claude --resume <session-id>
```

---

### create_pr.py - Create PR

Creates PR from worktree changes.

```bash
python3 .shelf/scripts/multi_agent/create_pr.py [--dry-run]
```

**Actions**:
1. Stage changes: `git add -A`
2. Exclude: `git reset .shelf/workspace/`
3. Commit: `feat(<scope>): <task-name>`
4. Push to remote
5. Create Draft PR: `gh pr create --draft`
6. Update task.json: `status: "completed"`, `pr_url`

---

### cleanup.py - Remove Worktrees

Clean up after completion.

```bash
# Specific worktree
python3 .shelf/scripts/multi_agent/cleanup.py <branch-name>

# All merged worktrees
python3 .shelf/scripts/multi_agent/cleanup.py --merged

# All worktrees (with confirmation)
python3 .shelf/scripts/multi_agent/cleanup.py --all
```

**Actions**:
1. Archive task to `.shelf/tasks/archive/YYYY-MM/`
2. Remove from registry
3. Remove worktree: `git worktree remove <path>`
4. Optionally delete branch

---

### plan.py - Auto-Configure Task

Launches Plan Agent to create task configuration.

```bash
python3 .shelf/scripts/multi_agent/plan.py \
  --name <task-slug> \
  --type <backend|frontend|fullstack> \
  --requirement "<description>"
```

**Plan Agent**:
1. Evaluates requirements (can REJECT)
2. Calls Research Agent
3. Creates `prd.md`
4. Configures `task.json`
5. Initializes JSONL files

---

## Session Registry

Tracks all running sessions.

**Location**: `.shelf/workspace/<developer>/.agents/registry.json`

```json
{
  "agents": [
    {
      "id": "feature-add-login",
      "worktree_path": "/abs/path/to/shelf-worktrees/feature/add-login",
      "pid": 12345,
      "started_at": "2026-01-31T10:30:00",
      "task_dir": ".shelf/tasks/01-31-add-login-taosu"
    }
  ]
}
```

**API** (`common/registry.py`):
```python
registry_add_agent(agent_id, worktree_path, pid, task_dir)
registry_remove_by_id(agent_id)
registry_remove_by_worktree(worktree_path)
registry_search_agent(pattern)
registry_list_agents()
```

---

## Complete Workflow

### 1. Configure Task

```bash
# Create task
python3 .shelf/scripts/task.py create "Add login" --slug add-login

# Configure
python3 .shelf/scripts/task.py init-context <task-dir> fullstack
python3 .shelf/scripts/task.py set-branch <task-dir> feature/add-login

# Write prd.md
# ...
```

### 2. Start Session

```bash
python3 .shelf/scripts/multi_agent/start.py <task-dir>
```

### 3. Monitor

```bash
python3 .shelf/scripts/multi_agent/status.py --watch add-login
```

### 4. After Completion

```bash
# PR auto-created
# Review on GitHub, merge

# Cleanup
python3 .shelf/scripts/multi_agent/cleanup.py feature/add-login
```

---

## Parallel Execution

Start multiple sessions:

```bash
# Session 1
python3 .shelf/scripts/multi_agent/start.py .shelf/tasks/01-31-add-login

# Session 2 (immediately)
python3 .shelf/scripts/multi_agent/start.py .shelf/tasks/01-31-fix-api

# Session 3
python3 .shelf/scripts/multi_agent/start.py .shelf/tasks/01-31-update-docs

# Monitor all
python3 .shelf/scripts/multi_agent/status.py
```

Each runs independently:
- Own worktree
- Own branch
- Own Claude process
- Own registry entry

---

## Resuming Sessions

If a session stops:

```bash
# Find session info
python3 .shelf/scripts/multi_agent/status.py --detail <task-name>

# Resume
cd ../shelf-worktrees/feature/task-name
claude --resume <session-id>
```

---

## Ralph Loop

Quality enforcement for Check Agent in sessions.

**Mechanism**:
1. Check Agent completes
2. SubagentStop hook fires
3. `ralph-loop.py` runs verify commands
4. All pass 鈫?allow stop
5. Any fail 鈫?block, continue agent

**Constants**:
| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_ITERATIONS` | 5 | Maximum loop iterations |
| `STATE_TIMEOUT_MINUTES` | 30 | State timeout |
| Command timeout | 120s | Per verify command |

**Configuration** (`worktree.yaml`):
```yaml
verify:
  - pnpm lint
  - pnpm typecheck
```

**State** (`.shelf/.ralph-state.json`):
```json
{
  "task": ".shelf/tasks/01-31-add-login",
  "iteration": 2,
  "started_at": "2026-01-31T10:30:00"
}
```

**Limits**: Max 5 iterations (`MAX_ITERATIONS`), 30min timeout (`STATE_TIMEOUT_MINUTES`), 120s per command

---

## Troubleshooting

### Session Not Starting

1. Check `worktree.yaml` exists
2. Verify branch name doesn't exist
3. Check `post_create` hooks
4. Look at start.py output

### Session Stuck

1. Check Ralph Loop iteration (max 5)
2. Verify `verify` commands
3. Manually run verify commands
4. Check `.shelf/.ralph-state.json`

### Worktree Issues

```bash
# Force remove
git worktree remove --force <path>

# Prune stale
git worktree prune

# List all
git worktree list
```

### Registry Out of Sync

```bash
# View
python3 .shelf/scripts/multi_agent/status.py --registry

# Manual edit
vim .shelf/workspace/<dev>/.agents/registry.json
```
