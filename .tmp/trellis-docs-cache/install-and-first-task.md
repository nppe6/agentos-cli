> ## Documentation Index
> Fetch the complete documentation index at: https://docs.trytrellis.app/llms.txt
> Use this file to discover all available pages before exploring further.

# Install & First Task

## Quick Start

### Installation

```bash theme={null}
# Global install
npm install -g @mindfoldhq/trellis@rc

# Navigate to your project directory
cd your-project
```

<Note>
  **Requirements**: Mac, Linux, and Windows are fully supported. Requires Node.js 18+ and Python
  3.9+.
</Note>

`trellis init` auto-detects installed platforms. You can also specify them explicitly via flags. Each platform needs to be init'd at least once. Pick any combination:

```bash theme={null}
# Interactive: detects installed platforms and asks which to configure
trellis init -u your-name

# Explicit: configure one or more platforms
trellis init -u your-name --claude
trellis init -u your-name --claude --cursor --opencode
trellis init -u your-name --codex --gemini
trellis init -u your-name --pi
```

`your-name` becomes your developer identity and creates your personal workspace at `.trellis/workspace/your-name/`.

Supported flags: `--claude`, `--cursor`, `--opencode`, `--codex`, `--kiro`, `--gemini`, `--qoder`, `--codebuddy`, `--copilot`, `--droid`, `--pi`, `--antigravity`, `--windsurf`, `--kilo`.

Beyond these 14 configured platforms, any AI coding agent that reads the `.agents/skills/` standard (Amp, Cline, Deep Agents, Firebender, Kimi Code CLI, Warp, and more) can also consume Trellis: Codex writes its skills there, and the files are directly usable by the rest of that ecosystem.

### Platform Configuration

`trellis init` writes platform-specific config directories. Core concepts (`.trellis/`) are identical across platforms; the differences sit in how commands, skills, sub-agents, and hooks are delivered.

| Platform        | Config Directory                                                             |
| --------------- | ---------------------------------------------------------------------------- |
| **Claude Code** | `.claude/commands/trellis/`, `agents/`, `skills/`, `hooks/`                  |
| **Cursor**      | `.cursor/commands/`, `agents/`, `skills/`, `hooks/`                          |
| **OpenCode**    | `.opencode/commands/trellis/`, `agents/`, `skills/`, `plugins/`              |
| **Codex**       | `.codex/agents/`, `skills/`, `hooks/` + root `AGENTS.md`                     |
| **Kiro**        | `.kiro/agents/`, `skills/`, `hooks/`                                         |
| **Gemini CLI**  | `.gemini/commands/trellis/`, `agents/`, `skills/`, `hooks/`                  |
| **Qoder**       | `.qoder/commands/`, `agents/`, `skills/`, `hooks/`                           |
| **CodeBuddy**   | `.codebuddy/commands/trellis/`, `agents/`, `skills/`, `hooks/`               |
| **Copilot**     | `.github/copilot/`, `prompts/`, `agents/`, `skills/`, `hooks/`               |
| **Droid**       | `.factory/commands/trellis/`, `droids/`, `skills/`, `hooks/`                 |
| **Pi Agent**    | `.pi/prompts/`, `skills/`, `agents/`, `extensions/trellis/`, `settings.json` |
| **Kilo**        | `.kilocode/workflows/`, `skills/`                                            |
| **Antigravity** | `.agent/workflows/`, `skills/`                                               |
| **Windsurf**    | `.windsurf/workflows/`, `skills/`                                            |

`.agents/skills/` is a shared cross-platform layer ([agentskills.io](https://agentskills.io) standard). `trellis init` writes all skills into it too, so any agent that reads the `.agents/skills/` standard (Amp, Cline, Deep Agents, Firebender, Kimi Code CLI, Warp, etc.) can consume them.

### init Scenarios

`trellis init` dispatches on the presence of `.trellis/` and `.trellis/.developer`. Match your situation to the command:

| Scenario                                      | Command                                                                           | Result                                                                                                                                  |
| --------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **First-time project init**                   | `trellis init -u your-name --claude`                                              | Creates `.trellis/` + bootstrap task `00-bootstrap-guidelines` that walks you through filling project spec                              |
| **Add a new platform to an existing project** | `trellis init --cursor` (or no-arg interactive — it lists unconfigured platforms) | Writes the new platform's config dir on top of the existing `.trellis/`; no task generated                                              |
| **New developer joining an existing project** | `trellis init -u their-name`                                                      | Generates the joiner onboarding task `00-join-<slug>` and guides reading workflow + spec; start it in the current AI session when ready |
| **Same developer on a new machine**           | Same as above                                                                     | Also generates a joiner task (because `.developer` isn't committed). Archive it if you don't need the refresher.                        |
| **Same dev, same machine, re-run init**       | `trellis init -u your-name`                                                       | No-op — both `.trellis/` and `.developer` already exist                                                                                 |

`--force` / `--skip-existing` only affect **how file conflicts are resolved** (overwrite vs skip); they don't change the dispatch logic itself.

<Note>
  **Dispatch signal**: `.trellis/.developer` is a gitignored per-checkout identity file (by design, never committed), so a fresh clone never has one — this is the clean signal for "new developer on this checkout". `.trellis/workspace/<name>/` is committed and cannot serve this role.
</Note>

### Basic Flow

Describe what you want to do; AI follows `workflow.md` through Plan → Execute → Finish. If the current flow looks done, run `/trellis:continue`.

```text theme={null}
# 1. Describe what you want
"Add user login feature"

# 2. AI runs Plan → Execute → Finish per workflow.md

# 3. You test + commit, then
/trellis:finish-work
```

<Note>
  Agent-capable platforms (Claude Code, OpenCode, Cursor, Gemini, Qoder, CodeBuddy, Copilot, Droid,
  Pi Agent, and Codex with `codex_hooks` enabled) load workflow and context automatically via a
  SessionStart hook or extension on every new session — they don't ship `/trellis:start` as a slash
  command, so open a fresh session if you need a reload. Only agent-less platforms (Kilo,
  Antigravity, Windsurf) ship `/trellis:start` (or `/start.md`) as an explicit entry point.
</Note>

### Directory Structure

Below is the layout after `trellis init` with Claude Code. Other platforms write to their own sub-directories but share the same `.trellis/` core.

```
your-project/
├── .trellis/                          # Trellis core (platform-independent)
│   ├── .developer                     # Developer identity (gitignored)
│   ├── .version                       # Trellis version
│   ├── .template-hashes.json          # Template file hashes (for update)
│   ├── workflow.md                    # Development workflow guide
│   ├── config.yaml                    # Project config (packages, update.skip, hooks)
│   │
│   ├── .runtime/                      # Session-scoped runtime state (gitignored)
│   │   └── sessions/                  #   Active task per AI session/window
│   │       └── <session-key>.json
│   │
│   ├── spec/                          # Project spec library
│   │   ├── frontend/                  #   Frontend specs (or per-package in monorepo)
│   │   ├── backend/                   #   Backend specs
│   │   └── guides/                    #   Thinking guides
│   │
│   ├── workspace/                     # Developer workspaces
│   │   ├── index.md
│   │   └── {developer-name}/
│   │       ├── index.md
│   │       └── journal-N.md
│   │
│   ├── tasks/                         # Task directory
│   │   ├── {MM-DD-task-name}/         #   Active tasks
│   │   │   ├── task.json              #     Task metadata
│   │   │   ├── prd.md                 #     Requirements document
│   │   │   ├── info.md                #     Technical design (optional)
│   │   │   ├── implement.jsonl        #     Context for trellis-implement
│   │   │   ├── check.jsonl            #     Context for trellis-check
│   │   │   └── research.jsonl         #     Context for trellis-research
│   │   └── archive/                   #   Archived tasks
│   │       └── {YYYY-MM}/
│   │
│   └── scripts/                       # Automation scripts (Python)
│       ├── task.py                    #   Task management
│       ├── get_context.py             #   Session context
│       ├── add_session.py             #   Record session
│       ├── create_bootstrap.py        #   First-time spec bootstrap
│       └── common/                    #   Shared libraries
│
├── .claude/                           # Claude Code configuration
│   ├── settings.json                  #   Hook and permission config
│   ├── commands/trellis/              #   Explicit commands
│   │   ├── start.md
│   │   ├── finish-work.md
│   │   └── continue.md
│   ├── agents/                        #   Sub-agent definitions
│   │   ├── trellis-implement.md
│   │   ├── trellis-check.md
│   │   └── trellis-research.md
│   ├── skills/                        #   Auto-trigger skills
│   │   ├── trellis-brainstorm/
│   │   ├── trellis-before-dev/
│   │   ├── trellis-check/
│   │   ├── trellis-update-spec/
│   │   └── trellis-break-loop/
│   └── hooks/                         #   Hook scripts
│       ├── session-start.py
│       ├── inject-subagent-context.py
│       └── inject-workflow-state.py
│
├── .cursor/           # Cursor: commands/ + rules/
├── .opencode/         # OpenCode: commands/trellis/, agents/, skills/, plugins/
├── .codex/            # Codex: prompts/, skills/ + AGENTS.md at repo root
├── .kiro/             # Kiro: steering/, prompts/, skills/
├── .gemini/           # Gemini CLI: commands/trellis/
├── .qoder/            # Qoder: commands/, skills/, agents/, hooks/
├── .codebuddy/        # CodeBuddy: commands/trellis/
├── .factory/          # Droid: commands/trellis/, skills/, hooks/
├── .pi/               # Pi Agent: prompts/, skills/, agents/, extensions/trellis/
└── .github/           # Copilot: copilot-instructions.md, prompts/
```

***

## Your First Task

### Starting a Session

<Tabs>
  <Tab title="General">
    Open the terminal. The SessionStart hook fires automatically, so Trellis context is already in the AI's context:

    * `workflow.md` TOC + Phase 1/2/3 step-level details
    * Identity, git status, active task list
    * Spec indexes

    **Just describe your task.**

    If you suspect auto-injection didn't run or you want to reload context, just open a new session — the SessionStart hook re-runs `workflow.md` + `get_context.py` and asks **"What would you like to work on?"**. These platforms don't expose `/trellis:start` as a slash command (the hook already owns `start`), so don't go looking for it.
  </Tab>

  <Tab title="Codex">
    Enable in `~/.codex/config.toml`:

    ```toml theme={null}
    [features]
    codex_hooks = true
    ```

    After that it's the same as the Class-1 tab: open the terminal, the SessionStart hook injects Trellis context automatically, describe your task directly.
  </Tab>

  <Tab title="Kiro">
    Kiro delivers Trellis content via its `.kiro/` agent / skill files. Kiro's Agent Hooks are user-configured (triggered on file save, build success, etc.); Trellis does not ship any Agent Hook wiring. Describe your task and Kiro's skill matcher enters the brainstorm flow; run `@trellis:start` when you want a full context report.
  </Tab>

  <Tab title="Kilo / Antigravity / Windsurf">
    These three platforms have workflows + skills only, no hooks and no sub-agents. Entry:

    * Kilo: `/start.md`
    * Antigravity: open `.agent/workflows/start.md`
    * Windsurf: `/trellis-start`

    The AI follows the workflow: reads `workflow.md`, runs `get_context.py`, reads spec indexes, asks what you want to do. The subsequent implement / check phases run inline in the main session instead of spawning sub-agents.
  </Tab>
</Tabs>

### AI Creates the Task and Develops

You say: "Add user login feature". The AI walks the three phases from `workflow.md`:

```text theme={null}
Phase 1 — Plan (interactive)
 1.0 task.py create creates the task directory (.trellis/tasks/MM-DD-user-login/)
 1.1 AI activates the trellis-brainstorm skill and walks through the requirement
     one question at a time, iterating prd.md
 1.2 When research is needed, AI spawns the trellis-research sub-agent; findings
     land in research/
 1.3 AI curates implement.jsonl / check.jsonl (seeded on create) with the
     spec + research files Phase 2 sub-agents will need — spec/research
     paths only, not code paths
 1.4 task.py start writes this task into the current session runtime

Phase 2 — Execute
 2.1 AI spawns the trellis-implement sub-agent (class-1 hook auto-injects
     implement.jsonl) → writes the code per prd.md, no git commit
 2.2 AI spawns the trellis-check sub-agent (hook auto-injects check.jsonl)
     → reviews diff vs specs + runs lint / typecheck / test, self-fixing

Phase 3 — Finish
 3.1 AI activates the trellis-check skill for final verification
 3.2 (on demand) AI activates the trellis-break-loop skill for debug retrospective
 3.3 AI activates the trellis-update-spec skill and writes new learnings to
     .trellis/spec/
 3.4 AI reminds you to run /trellis:finish-work
```

**When AI stalls or is skipping ahead**: run `/trellis:continue`. AI uses the active task's status plus the per-turn workflow-state breadcrumb and, per `workflow.md`, figures out the next step (before-dev / check / update-spec, etc.) and continues.

### Finishing the Session

```
/trellis:finish-work
```

`finish-work` calls `add_session.py` to append a journal entry and update your personal index. If the task is actually done (code merged, acceptance criteria met), it also archives the task via `task.py archive`.

### Cross-Session Memory

Next time you open a session, the SessionStart hook (or the platform's prelude) reads your workspace journal and active task list, so AI can recall what you did last:

```
AI: "Hi Alice — last session you finished the user login feature (commit abc1234),
     covering the LoginForm component, JWT middleware, and users table.
     What next?"
```

Journals live under `.trellis/workspace/{name}/journal-N.md`; every `/trellis:finish-work` appends one. Trellis tracks each AI session's active task internally so you can pick it up next time; `task.py finish` clears that pointer.

***

## Remote Spec Templates

Instead of writing specs from scratch, pull pre-built spec templates during init.

### Official Marketplace

```bash theme={null}
# Interactive: browse and pick from available templates
trellis init -u your-name

# Non-interactive: specify a template by ID
trellis init -u your-name --template electron-fullstack
```

The interactive picker shows all templates from the [official marketplace](https://github.com/mindfold-ai/Trellis/tree/main/marketplace). Choose one or start with blank specs.

### Custom Registry (`--registry`)

Pull specs from your own GitHub, GitLab, or Bitbucket repository:

```bash theme={null}
# Direct download: repo directory becomes .trellis/spec/
trellis init --registry gh:myorg/myrepo/my-team-spec

# Marketplace mode: repo has index.json with multiple templates
trellis init --registry gh:myorg/myrepo/marketplace

# Pick a specific template from a custom marketplace
trellis init --registry gh:myorg/myrepo/marketplace --template my-template

# Specify a branch
trellis init --registry gh:myorg/myrepo/specs#develop

# GitLab or Bitbucket
trellis init --registry gitlab:myorg/myrepo/specs
trellis init --registry bitbucket:myorg/myrepo/specs
```

**Source format**: `provider:user/repo[/subdir][#ref]`

| Provider  | Prefix             |
| --------- | ------------------ |
| GitHub    | `gh:` or `github:` |
| GitLab    | `gitlab:`          |
| Bitbucket | `bitbucket:`       |

The ref (branch/tag) defaults to `main` if omitted.

### Handling Existing Specs

When `.trellis/spec/` already exists, use a strategy flag:

| Flag          | Behavior                                      |
| ------------- | --------------------------------------------- |
| `--overwrite` | Delete existing spec directory, then download |
| `--append`    | Only copy files that don't already exist      |
| *(neither)*   | Interactive prompt asks what to do            |

### Building a Custom Marketplace

Create an `index.json` in your repository:

```json theme={null}
{
  "version": 1,
  "templates": [
    {
      "id": "my-backend-spec",
      "type": "spec",
      "name": "My Backend Spec",
      "description": "Backend conventions for our team",
      "path": "marketplace/specs/my-backend-spec",
      "tags": ["backend", "node"]
    }
  ]
}
```

The `path` field is relative to the repository root. Only `type: "spec"` is supported currently.

### Private Repositories

For private repos, set the `GIGET_AUTH` environment variable with a personal access token:

```bash theme={null}
GIGET_AUTH=ghp_xxxxx trellis init --registry gh:myorg/private-repo/specs
```

For GitHub fine-grained tokens, you need **Contents** and **Metadata** read permissions.
