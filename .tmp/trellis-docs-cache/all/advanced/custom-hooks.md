> ## Documentation Index
> Fetch the complete documentation index at: https://docs.trytrellis.app/llms.txt
> Use this file to discover all available pages before exploring further.

# Custom Hooks

## Custom Hooks

<Note>Hook support varies by platform and by event — see the per-event matrix below.</Note>

* **`SessionStart` hook / extension** ships on Claude Code, Cursor, OpenCode, Gemini CLI, Qoder, CodeBuddy, Copilot, Droid, Pi Agent (and Codex with `codex_hooks = true` in `~/.codex/config.toml`). Kiro's Agent Hooks are user-configured — Trellis does not install any out of the box.
* **`PreToolUse` / extension sub-agent context injection** ships on Claude Code, Cursor, OpenCode, CodeBuddy, Droid, Pi Agent. The other hook-capable platforms rely on a pull-based prelude inside each sub-agent instead.
* **`UserPromptSubmit` / workflow-state nudge** ships on the same platforms as `SessionStart`.
* **Kilo, Antigravity, Windsurf** have no hook primitive at all; behavior is delivered via workflow files + skills.

### Hook types

| Hook               | Trigger                  | Purpose                                      |
| ------------------ | ------------------------ | -------------------------------------------- |
| `SessionStart`     | A new session starts     | Load context, initialize environment         |
| `UserPromptSubmit` | User submits a prompt    | Nudge the AI toward the current task state   |
| `PreToolUse`       | Before a tool invocation | Intercept, modify parameters, inject context |
| `PostToolUse`      | After a tool invocation  | Log activity, trigger follow-up actions      |

Claude Code, Cursor, CodeBuddy, and Droid share a Python-hook layout compatible with CC's event model (`settings.json` or `hooks.json` referencing Python scripts). OpenCode uses JS plugins (factory functions in `.opencode/plugins/`) with the same event semantics. Pi Agent uses `.pi/extensions/trellis/index.ts` instead of Python hook files. The rest of the hook-capable platforms (Codex, Gemini, Qoder, Copilot) run a `session-start.py` only — no `PreToolUse` — and configure it via a platform-native config file.

### `settings.json` configuration (Claude Code)

Configure hooks in `.claude/settings.json`:

```json theme={null}
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/session-start.py\"",
            "timeout": 10
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/inject-workflow-state.py\"",
            "timeout": 5
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Task",
        "hooks": [
          {
            "type": "command",
            "command": "python3 \"$CLAUDE_PROJECT_DIR/.claude/hooks/inject-subagent-context.py\"",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

Notes:

* Each event type is an array of `{ matcher, hooks }` blocks.
* `matcher`: pattern to match (`"startup"` matches session start, `"Task"` matches Task tool calls, `"*"` matches everything).
* `hooks`: array of commands that run when matched, in order.
* `$CLAUDE_PROJECT_DIR`: expanded by Claude Code to the project root.
* `timeout`: seconds; if exceeded, the hook is skipped.

Trellis does not install a Claude Code `statusLine` by default. New installs do not create `.claude/hooks/statusline.py` or add `statusLine` to `.claude/settings.json`. Existing projects that already have a `statusLine` keep it during update. If your project needs a custom status line, add a local Claude Code `statusLine` command manually; Trellis does not manage that file.

### Shipped hooks

#### `session-start.py`: context loading

**Trigger**: `SessionStart`.

**What it does**:

* Reads `.trellis/.developer` for developer identity.
* Reads `.trellis/workflow.md` for the workflow contract.
* Reads `.trellis/workspace/{name}/index.md` for session history.
* Reads `git log` for recent commits.
* Reads active tasks.

**Output**: emits all the context as a system message at the start of the session.

#### `inject-workflow-state.py`: workflow-state nudge

**Trigger**: `UserPromptSubmit`.

**What it does**: parses `[workflow-state:STATUS]` blocks from `.trellis/workflow.md` and emits the body matching the active task's `status` as a `<workflow-state>` preamble for the turn. Parser-only — the hook does not embed any fallback body text. When the active task's status has no matching block, the hook emits the generic line `Refer to workflow.md for current step.` so the AI re-reads the workflow contract.

To customize per-turn wording, edit the `[workflow-state:STATUS]` block in `.trellis/workflow.md`. No script change required.

#### `inject-subagent-context.py`: spec injection engine

**Trigger**: `PreToolUse`, matching `Task` tool calls.

**What it does**:

* Intercepts Task tool calls.
* Reads the JSONL matching the `subagent_type` (`implement.jsonl`, `check.jsonl`, `research.jsonl`).
* Reads all files referenced in the JSONL.
* Assembles the sub-agent prompt (specs + requirements + original instructions).

Design decisions:

* Each sub-agent receives its full context at launch; there is no resume.
* Only `trellis-*` sub-agents are hooked; custom sub-agents must opt in by editing this file or using their own injection.

#### Pi extension: equivalent hook behavior

Pi Agent does not load `.py` hook scripts. Trellis writes `.pi/extensions/trellis/index.ts`, which implements the same three behaviors in extension form:

* session start context injection
* workflow-state breadcrumb injection
* sub-agent JSONL context injection

It also passes `TRELLIS_CONTEXT_ID` into Bash commands so `task.py start/current/finish` can resolve the correct `.trellis/.runtime/sessions/<session-key>.json` file for the current Pi session.

### Writing a custom hook

Hooks receive JSON input on stdin and emit JSON results on stdout.

**Input format** (PreToolUse example):

```json theme={null}
{
  "hook_event_name": "PreToolUse",
  "tool_name": "Task",
  "tool_input": {
    "subagent_type": "trellis-implement",
    "prompt": "..."
  },
  "cwd": "/path/to/project"
}
```

**Output format**:

```json theme={null}
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {
      "subagent_type": "trellis-implement",
      "prompt": "modified prompt..."
    }
  }
}
```

### Example: an auto-test hook

`.claude/hooks/auto-test.py`:

```python theme={null}
#!/usr/bin/env python3
"""Run tests automatically after an Edit tool call."""

import json
import subprocess
import sys

def main():
    input_data = json.load(sys.stdin)

    hook_event = input_data.get("hook_event_name", "")
    tool_name = input_data.get("tool_name", "")

    if hook_event != "PostToolUse" or tool_name != "Edit":
        sys.exit(0)

    file_path = input_data.get("tool_input", {}).get("file_path", "")

    if not file_path.endswith((".ts", ".tsx")):
        sys.exit(0)

    result = subprocess.run(
        ["pnpm", "typecheck"],
        capture_output=True,
        timeout=30,
    )

    if result.returncode != 0:
        output = {
            "hookSpecificOutput": {
                "message": f"TypeCheck failed after editing {file_path}:\n{result.stderr.decode()}"
            }
        }
        print(json.dumps(output))

    sys.exit(0)


if __name__ == "__main__":
    main()
```

Register it in `settings.json`:

```json theme={null}
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .claude/hooks/auto-test.py"
          }
        ]
      }
    ]
  }
}
```

***
