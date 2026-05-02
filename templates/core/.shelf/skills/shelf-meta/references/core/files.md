# AgentOS Shelf File Reference

Complete reference of all files in the `.shelf/` directory.

---

## Directory Structure

```
.shelf/
鈹溾攢鈹€ .developer              # Developer identity (gitignored)
鈹溾攢鈹€ .runtime/               # Session-scoped runtime state (gitignored)
鈹溾攢鈹€ .current-task           # Legacy ignored pointer; not an active-task source
鈹溾攢鈹€ .ralph-state.json       # Ralph Loop state (gitignored)
鈹溾攢鈹€ .template-hashes.json   # Template version tracking
鈹溾攢鈹€ .version                # Installed AgentOS Shelf version
鈹溾攢鈹€ .gitignore              # Git ignore rules
鈹溾攢鈹€ workflow.md             # Main workflow documentation
鈹溾攢鈹€ worktree.yaml           # Multi-session configuration
鈹?鈹溾攢鈹€ workspace/              # Developer workspaces
鈹溾攢鈹€ tasks/                  # Task tracking
鈹溾攢鈹€ spec/                   # Coding guidelines
鈹斺攢鈹€ scripts/                # Automation scripts
```

---

## Root Files

### `.developer`

**Purpose**: Store current developer identity.

**Created by**: `init_developer.py`

**Format**: Plain text, single line with developer name.

```
taosu
```

**Gitignored**: Yes - each machine has its own identity.

---

### `.runtime/sessions/<session-key>.json`

**Purpose**: Store active task state for one AI session/window.

**Created by**: `task.py start <task-dir>`

**Format**: JSON runtime context.

```json
{
  "current_task": ".shelf/tasks/01-31-add-login-taosu",
  "current_run": null,
  "platform": "claude",
  "last_seen_at": "2026-04-27T00:00:00Z"
}
```

**Gitignored**: Yes - each session/window has its own active task.

**Used by**:
- Hooks resolve this through `common.active_task`
- Scripts use this for active task operations

### `.current-task`

**Purpose**: Legacy ignored pointer from older AgentOS Shelf versions.

**Active-task behavior**: Not read or written as a fallback. Current AgentOS Shelf
uses `.runtime/sessions/<session-key>.json` only.

---

### `.ralph-state.json`

**Purpose**: Track Ralph Loop iteration state.

**Created by**: `ralph-loop.py` (Claude Code only)

**Format**: JSON

```json
{
  "task": ".shelf/tasks/01-31-add-login",
  "iteration": 2,
  "started_at": "2026-01-31T10:30:00"
}
```

**Gitignored**: Yes - runtime state.

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `task` | string | Task directory path |
| `iteration` | number | Current iteration (1-5) |
| `started_at` | ISO date | When loop started |

---

### `.template-hashes.json`

**Purpose**: Track template file versions for `agentos-cli shelf update`.

**Created by**: `agentos-cli shelf init` or `agentos-cli shelf update`

**Format**: JSON object mapping file paths to SHA-256 hashes.

```json
{
  ".shelf/workflow.md": "028891d1fe839a266...",
  ".claude/hooks/session-start.py": "0a9899e80f6bfe15...",
  ".claude/commands/start.md": "d1276dcbff880299..."
}
```

**Used by**:
- `agentos-cli shelf update` - Detect which files have been modified
- Determines if files can be auto-updated or need conflict resolution

**Behavior**:
- File hash matches template 鈫?Safe to update
- File hash differs 鈫?User modified, needs manual merge

---

### `.version`

**Purpose**: Track installed AgentOS Shelf CLI version.

**Created by**: `agentos-cli shelf init` or `agentos-cli shelf update`

**Format**: Plain text, semver version string.

```
0.3.0-beta.5
```

**Used by**:
- `agentos-cli shelf update` - Determine if update is needed
- Version mismatch detection

---

### `.gitignore`

**Purpose**: Define which files to exclude from git.

**Default content**:
```gitignore
# Developer identity (local only)
.developer

# Legacy current task pointer
.current-task

# Session runtime state
.runtime/

# Ralph Loop state
.ralph-state.json

# Agent runtime files
.agents/
.agent-log
.agent-runner.sh
.session-id

# Task directory runtime files
.plan-log

# Atomic update temp files
*.tmp
.backup-*
*.new

# Python cache
**/__pycache__/
**/*.pyc
```

---

### `workflow.md`

**Purpose**: Main workflow documentation for developers and AI.

**Created by**: `agentos-cli shelf init`

**Content sections**:
1. Quick Start guide
2. Workflow overview
3. Session start process
4. Development process
5. Session end
6. File descriptions
7. Best practices

**Injected by**: `session-start.py` hook (Claude Code)

**For Cursor**: Read manually at session start.

---

### `worktree.yaml`

**Purpose**: Configure Multi-Session and Ralph Loop.

**Created by**: `agentos-cli shelf init`

**Format**: YAML

```yaml
worktree_dir: ../worktrees
copy:
  - .shelf/.developer
  - .env
post_create:
  - npm install
verify:
  - pnpm lint
  - pnpm typecheck
```

鈫?See `claude-code/worktree-config.md` for details.

---

## Runtime Files (Gitignored)

### `.agents/`

**Purpose**: Agent registry for Multi-Session.

**Location**: `.shelf/workspace/{developer}/.agents/`

**Content**: `registry.json` tracking running agents.

---

### `.session-id`

**Purpose**: Store Claude Code session ID for resume.

**Created by**: Multi-Session `start.py`

**Format**: UUID string.

---

### `.agent-log`

**Purpose**: Agent execution log.

**Created by**: Multi-Session scripts.

---

### `.plan-log`

**Purpose**: Plan Agent execution log.

**Location**: Task directory.

---

## Directories

### `workspace/`

Developer workspaces with journals and indexes.

鈫?See `core/workspace.md`

### `tasks/`

Task directories with PRDs and session files.

鈫?See `core/tasks.md`

### `spec/`

Coding guidelines and specifications.

鈫?See `core/specs.md`

### `scripts/`

Automation scripts.

鈫?See `core/scripts.md` and `claude-code/scripts.md`

---

## Template Files

These files are managed by `agentos-cli shelf update`:

| File | Purpose |
|------|---------|
| `.shelf/workflow.md` | Workflow documentation |
| `.shelf/worktree.yaml` | Multi-session config |
| `.shelf/.gitignore` | Git ignore rules |
| `.claude/hooks/*.py` | Hook scripts |
| `.claude/commands/*.md` | Slash commands |
| `.claude/agents/*.md` | Agent definitions |
| `.cursor/commands/*.md` | Cursor commands (mirror) |

**Update behavior**:
1. Compare file hash with `.template-hashes.json`
2. If unchanged 鈫?Auto-update
3. If modified 鈫?Create `.new` file for manual merge
4. Update hashes after successful update

---

## File Lifecycle

### Created by `agentos-cli shelf init`

```
.shelf/
鈹溾攢鈹€ .template-hashes.json
鈹溾攢鈹€ .version
鈹溾攢鈹€ .gitignore
鈹溾攢鈹€ workflow.md
鈹溾攢鈹€ worktree.yaml
鈹溾攢鈹€ spec/
鈹?  鈹溾攢鈹€ frontend/
鈹?  鈹溾攢鈹€ backend/
鈹?  鈹斺攢鈹€ guides/
鈹斺攢鈹€ scripts/
```

### Created at runtime

```
.shelf/
鈹溾攢鈹€ .developer           # init_developer.py
鈹溾攢鈹€ .runtime/sessions/   # task.py start
鈹溾攢鈹€ .current-task        # legacy ignored file, not active-task source
鈹溾攢鈹€ .ralph-state.json    # ralph-loop.py
鈹溾攢鈹€ workspace/{dev}/     # init_developer.py
鈹?  鈹溾攢鈹€ index.md
鈹?  鈹溾攢鈹€ journal-1.md
鈹?  鈹斺攢鈹€ .agents/
鈹斺攢鈹€ tasks/{task}/        # task.py create
    鈹溾攢鈹€ task.json
    鈹溾攢鈹€ prd.md
    鈹斺攢鈹€ *.jsonl
```

### Cleaned up

```
# After task completion
.shelf/tasks/{task}/ 鈫?.shelf/tasks/archive/YYYY-MM/

# After worktree removal
.agents/registry.json entries removed
```
