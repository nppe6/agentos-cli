> ## Documentation Index
> Fetch the complete documentation index at: https://docs.trytrellis.app/llms.txt
> Use this file to discover all available pages before exploring further.

# Multi-Platform and Team Configuration

## Multi-Platform and Team Configuration

Trellis ships on 14 platforms (Claude Code, Cursor, OpenCode, Codex, Kiro, Kilo, Gemini CLI, Antigravity, Windsurf, Qoder, CodeBuddy, GitHub Copilot, Droid, Pi Agent) and additionally supports any AI coding agent that reads the `.agents/skills/` standard (Amp, Cline, Deep Agents, Firebender, Kimi Code CLI, Warp, and more). The `.trellis/` core is identical everywhere; what differs is **how hooks, extensions, skills, sub-agents, and commands are delivered** on each platform.

### Joining an Already-Initialized Trellis Project

Someone else already ran `trellis init` on the repo and you're joining as a new team member. Just run `trellis init` — the CLI detects the existing setup and offers three choices:

```
? Trellis is already initialized. What would you like to do?
❯ Add AI platform(s)
  Set up developer identity on this device
  Full re-initialize
```

| Option                                       | When to pick                                                                                                    |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Add AI platform(s)**                       | You want to add a platform others haven't configured (e.g. you use Cursor but the team only set up Claude Code) |
| **Set up developer identity on this device** | You're a new member, you just need to write your **identity** on your machine                                   |
| **Full re-initialize**                       | Project config is broken and you want a clean slate                                                             |

New members pick the second option. The CLI asks for your developer name (defaulting to your Git user), then:

* Writes `.trellis/.developer` with your developer name (gitignored, per-machine)
* Creates `.trellis/workspace/<your-name>/` for your own journal

After that, on platforms with a SessionStart hook or extension, opening a new session auto-injects Trellis context. On platforms without automatic session injection, run `/trellis:start` or the platform's start workflow.

<Note>
  Don't pick **Full re-initialize** — it overwrites existing `.trellis/`, `.claude/`, etc.
  configuration and affects the whole team.
</Note>

### Capability Matrix

| Capability                           | Claude Code | Cursor | OpenCode | Codex | Kiro | Gemini | Qoder | CodeBuddy | Copilot | Droid | Pi Agent |
| ------------------------------------ | :---------: | :----: | :------: | :---: | :--: | :----: | :---: | :-------: | :-----: | :---: | :------: |
| SessionStart / extension auto-inject |      ✅      |    ✅   |     ✅    |   ⚡   |   ⚡  |    ✅   |   ✅   |     ✅     |    ✅    |   ✅   |     ✅    |
| Sub-agent context injection          |      ✅      |    ✅   |     ✅    |   ❌   |   ❌  |    ❌   |   ❌   |     ✅     |    ❌    |   ✅   |     ✅    |
| Sub-agents (`trellis-*`)             |      ✅      |    ✅   |     ✅    |   ✅   |   ✅  |    ✅   |   ✅   |     ✅     |    ✅    |   ✅   |     ✅    |
| Auto-trigger skills                  |      ✅      |    ✅   |     ✅    |   ✅   |   ✅  |    ✅   |   ✅   |     ✅     |    ✅    |   ✅   |     ✅    |
| Explicit `/trellis:*` commands       |      ✅      |    ✅   |     ✅    |   —   |   —  |    ✅   |   ✅   |     ✅     |    ✅    |   ✅   |     ✅    |

Legend: ✅ Trellis wires the config and the platform executes it · ⚡ Partial (Codex requires `codex_hooks = true` opt-in; Kiro's Agent Hooks are user-configured, not auto-executed) · ❌ the platform does not expose this event · — the platform has no command primitive; start / finish-work / continue are delivered as skills instead. Qoder uses `/trellis-{name}` (hyphen, not colon) via its native Custom Commands for `finish-work` / `continue`; `start` is covered by its SessionStart hook. Pi Agent uses an extension rather than Python hook files, but the behavior is the same: session context, Bash environment propagation, and sub-agent context injection are handled before the agent acts.

`.kilocode/`, `.agent/` (Antigravity), and `.windsurf/` are workflow-and-skill only: no sub-agents and no hooks. `.agents/skills/` is written by every platform as a cross-platform shared layer.

### Claude Code

Most complete automation. Hook layout:

| Hook                         | Trigger           | Effect                                         |
| ---------------------------- | ----------------- | ---------------------------------------------- |
| `session-start.py`           | SessionStart      | Injects identity, git status, active tasks     |
| `inject-workflow-state.py`   | UserPromptSubmit  | Nudges the AI toward the current task's state  |
| `inject-subagent-context.py` | PreToolUse (Task) | Loads `implement.jsonl` / `check.jsonl` / etc. |

Sub-agents: `trellis-implement`, `trellis-check`, `trellis-research` under `.claude/agents/`.
Skills: `trellis-brainstorm`, `trellis-before-dev`, `trellis-check`, `trellis-update-spec`, `trellis-break-loop` under `.claude/skills/`.
Commands: `start`, `finish-work`, `continue` under `.claude/commands/trellis/`.

### Cursor

```bash theme={null}
trellis init -u your-name --cursor
```

Cursor is a full class-1 platform since Trellis 0.5: real hooks, real sub-agents, real skills.

Layout:

* `.cursor/commands/trellis-{name}.md`: `start`, `finish-work`, `continue` (flat file naming with `trellis-` prefix, invoked as `/trellis-start` etc.)
* `.cursor/skills/trellis-{name}/SKILL.md`: the 5 trellis skills
* `.cursor/agents/`: `trellis-implement.md`, `trellis-check.md`, `trellis-research.md`
* `.cursor/hooks/`: shared Python hook scripts (Claude-Code-compatible)
* `.cursor/hooks.json`: hook configuration (Cursor uses a separate file, not `settings.json`)

### OpenCode

```bash theme={null}
trellis init -u your-name --opencode
```

OpenCode 1.2.x is a class-1 platform (real hooks + real sub-agents):

* `.opencode/commands/trellis/`: start / finish-work / continue
* `.opencode/agents/`: `trellis-implement.md`, `trellis-check.md`, `trellis-research.md`
* `.opencode/skills/`: the 5 trellis skills
* `.opencode/plugins/`: JS plugins: `session-start.js`, `inject-subagent-context.js`, `inject-workflow-state.js`

Plugins are factory functions (OpenCode 1.2+). Trellis generates them so behavior parity with Claude Code is the goal.

### Codex

```bash theme={null}
trellis init -u your-name --codex
```

Layout:

* `AGENTS.md` (repo root): entry file; Codex auto-reads it every session (acts as the prelude)
* `.codex/prompts/`: `trellis-start.md`, `trellis-finish-work.md`, `trellis-continue.md`
* `.codex/skills/`: the 5 trellis skills
* `.codex/agents/`: TOML sub-agents: `trellis-implement.toml`, `trellis-check.toml`, `trellis-research.toml`
* `.codex/hooks/session-start.py` + `.codex/hooks.json`: SessionStart hook (experimental)

<Note>
  Codex hooks are experimental. Enable by adding to `~/.codex/config.toml`:

  ```toml theme={null}
  [features]
  codex_hooks = true
  ```

  Without this, Codex falls back to prelude-only (reads `AGENTS.md` every session): same content, just no event-driven injection.
</Note>

### Kiro

```bash theme={null}
trellis init -u your-name --kiro
```

Layout:

* `.kiro/steering/trellis.md`: Trellis prelude, loaded every session
* `.kiro/prompts/trellis-*.md`: prompt-style commands
* `.kiro/skills/*/SKILL.md`: auto-trigger skills (Kiro matches by description/YAML)

Kiro's Agent Hooks can auto-run Trellis skills on file save or build success, but that's user-configured; Trellis doesn't install any Kiro Agent Hook out of the box.

### Gemini CLI

```bash theme={null}
trellis init -u your-name --gemini
```

Layout:

* `.gemini/commands/trellis/{name}.toml`: TOML command files — `start.toml`, `finish-work.toml`, `continue.toml`
* `.gemini/skills/trellis-{name}/SKILL.md`: the 5 trellis skills
* `.gemini/agents/{name}.md`: sub-agent definitions with pull-based prelude (sub-agents `Read` their own JSONL because Gemini has no sub-agent `PreToolUse` hook)
* `.gemini/hooks/session-start.py`: SessionStart hook
* `.gemini/settings.json`: hook configuration (SessionStart only)

### Qoder

```bash theme={null}
trellis init -u your-name --qoder
```

Qoder supports native Custom Commands (typed with `/` in the agent input, stored under `<project>/.qoder/commands/{name}.md` with required `name` + `description` YAML frontmatter). Trellis delivers session-boundary entry points there so you can invoke them deterministically, and keeps the phase-level workflows as auto-trigger skills.

Layout:

* `.qoder/commands/trellis-{name}.md`: session-boundary commands — `finish-work`, `continue` — invoked as `/trellis-finish-work`, `/trellis-continue` (Qoder's SessionStart hook already injects the "start" context, so there is no `trellis-start` command)
* `.qoder/skills/trellis-{name}/SKILL.md`: auto-trigger workflow skills — `brainstorm`, `before-dev`, `check`, `update-spec`, `break-loop`
* `.qoder/agents/{name}.md`: sub-agent definitions with pull-based prelude
* `.qoder/hooks/session-start.py`: SessionStart hook
* `.qoder/settings.json`: hook configuration (SessionStart only — Qoder has no sub-agent `PreToolUse` hook)

### CodeBuddy

```bash theme={null}
trellis init -u your-name --codebuddy
```

CodeBuddy is a full class-1 platform (real hooks + real sub-agents).

Layout:

* `.codebuddy/commands/trellis/{name}.md`: `start`, `finish-work`, `continue`
* `.codebuddy/skills/trellis-{name}/SKILL.md`: the 5 trellis skills
* `.codebuddy/agents/{name}.md`: sub-agent definitions
* `.codebuddy/hooks/*.py`: shared Python hook scripts
* `.codebuddy/settings.json`: hook configuration (SessionStart + `PreToolUse` sub-agent injection)

### GitHub Copilot

```bash theme={null}
trellis init -u your-name --copilot
```

Layout:

* `.github/copilot-instructions.md`: the Trellis prelude, loaded automatically every session
* `.github/prompts/trellis-{name}.prompt.md`: prompt files for `start` / `finish-work` / `continue`
* `.github/skills/trellis-{name}/SKILL.md`: the 5 trellis skills
* `.github/agents/{name}.agent.md`: sub-agent definitions with pull-based prelude (Copilot's sub-agent hook does not fire reliably, so sub-agents `Read` their own JSONL)
* `.github/copilot/hooks/*.py`: Copilot-specific + shared Python hook scripts
* `.github/copilot/hooks.json`: hook configuration (SessionStart only — sub-agent `PreToolUse` is absent)

### Droid

```bash theme={null}
trellis init -u your-name --droid
```

Droid (factory.ai) is a class-1 platform with hooks + sub-agents:

* `.factory/commands/trellis/`: start / finish-work / continue
* `.factory/agents/`: the three `trellis-*` sub-agents
* `.factory/skills/`: the five trellis skills
* `.factory/hooks/`: SessionStart + sub-agent injection

### Pi Agent

```bash theme={null}
trellis init -u your-name --pi
```

Pi Agent is extension-backed rather than Python-hook-backed. Trellis writes the same workflow primitives, then the extension resolves the current session id and injects task context before Bash commands and sub-agent runs.

Layout:

* `.pi/prompts/trellis-{name}.md`: session-boundary prompts (`finish-work`, `continue`; `start` only where applicable)
* `.pi/skills/trellis-{name}/SKILL.md`: the five Trellis workflow skills
* `.pi/agents/{name}.md`: `trellis-implement`, `trellis-check`, `trellis-research`
* `.pi/extensions/trellis/index.ts`: session context, Bash `TRELLIS_CONTEXT_ID` propagation, and sub-agent JSONL injection
* `.pi/settings.json`: extension registration

The extension stores active task state under `.trellis/.runtime/sessions/<session-key>.json`, so each Pi window/session can work on its own task without taking over another window.

### Other supported platforms

Trellis also ships configurators for platforms not covered by the capability matrix:

* **Kilo** (`--kilo`): writes `.kilocode/workflows/` (commands: `start`, `finish-work`) and `.kilocode/skills/trellis-{name}/SKILL.md` (the 5 trellis skills). No hook integration.
* **Antigravity** (`--antigravity`): writes Antigravity-native workflow files for the three commands.
* **Windsurf** (`--windsurf`): writes Windsurf-native command and rule files.

Beyond the 14 configured platforms, Trellis can be consumed by any AI coding agent that follows the `.agents/skills/` convention (the [agentskills.io](https://agentskills.io) standard). Codex writes its skills there, and the files are directly usable by other agents in that ecosystem (Amp, Cline, Deep Agents, Firebender, Kimi Code CLI, Warp, and more). On those platforms you manage Trellis through the `.trellis/` core plus whatever prelude file the agent reads.

### Operating Systems

| OS          | Status | Notes                                                                                                             |
| ----------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| **macOS**   | ✅ Full | Primary platform                                                                                                  |
| **Linux**   | ✅ Full | Verified                                                                                                          |
| **Windows** | ✅ Full | Scripts are Python; Claude Code sets `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1` so hooks cwd resolves correctly |

Python 3.9+ is required for `.trellis/scripts/` and any Python hooks. OpenCode plugins use Node.js 18+.

### Multi-Developer Collaboration

Per-developer isolation (no conflicts):

* `.trellis/workspace/{name}/`: each developer's own journals and index
* `.trellis/.developer`: gitignored
* `.trellis/.runtime/`: gitignored session runtime; each AI session/window has its own active task file

Shared state (coordinate via PR):

* `.trellis/spec/`: team conventions, PR-reviewed like any code
* `.trellis/tasks/`: task JSONs; explicit `--assignee` avoids collisions

Important spec changes should be discussed in reviews; treat the spec library as team code.

### `trellis update` and Version Management

```bash theme={null}
cat .trellis/.version          # current version
trellis update                  # update to latest
trellis update --dry-run        # preview
trellis update --migrate        # apply breaking-change migrations (required for major)
trellis update -f               # force overwrite locally-modified files
trellis update -s               # skip locally-modified files
```

Template hash mechanism (`.trellis/.template-hashes.json`):

1. Compute local file hash.
2. Compare against recorded template hash.
3. Match ⇒ file unchanged by user ⇒ safe to update.
4. Differ ⇒ prompt (overwrite / skip), or silently respect policy with `-f` / `-s`.

Breaking changes (for example, removing the Multi-Agent Pipeline in 0.5.0) ship as migration manifests: running `trellis update` without `--migrate` on a breaking-manifest exits with instructions instead of silently renaming files. `trellis update --migrate` applies the rename / delete entries, asking once per conflict.

***
