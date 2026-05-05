> ## Documentation Index
> Fetch the complete documentation index at: https://docs.trytrellis.app/llms.txt
> Use this file to discover all available pages before exploring further.

# Customizing the Workflow

## Customizing the Workflow

`/.trellis/workflow.md` defines how Trellis runs development. Phase definitions, skill routing, per-turn reminders, and the `task.py` command catalog all live in this one file. Forking the workflow means editing one markdown file — no Python, no hook code, no re-releasing Trellis.

Before 0.5, workflow behavior was scattered across three places: hook Python scripts, configurator TypeScript, and command markdown. Keeping them in sync while forking was painful. 0.5 collapses the three into `workflow.md`.

### What workflow\.md controls

| Section in `workflow.md`                                | Who reads it                                           | Effect                                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `## Phase Index` + `## Phase 1/2/3`                     | AI at session start (via `SessionStart` hook)          | Defines the three-phase flow and the step-by-step how-to inside each phase               |
| `### Skill Routing`                                     | AI at session start                                    | Maps user intent → which skill to load (e.g. "wants new feature" → `trellis-brainstorm`) |
| `### DO NOT skip skills`                                | AI at session start                                    | Inlines the common excuses for skipping skills and the reasons why they're wrong         |
| `[workflow-state:STATUS]` blocks under `## Phase Index` | `inject-workflow-state.py` on every `UserPromptSubmit` | Per-turn reminder shown as `<workflow-state>…</workflow-state>` based on task status     |
| `### Task System` (task.py command list)                | AI at session start                                    | Reference for the 16 `task.py` subcommands grouped by purpose                            |

All injection paths read `workflow.md` at runtime — you don't need to rebuild anything after editing.

### Changing the per-turn breadcrumbs

The per-turn `<workflow-state>` block is what nudges the AI at each message based on the current task's `status` field. The blocks live colocated with each phase under `## Phase Index` in `workflow.md` — edit them in place. The hook script is parser-only; it never embeds fallback content of its own.

```markdown theme={null}
## Phase Index

[workflow-state:no_task]
No active task. If the user describes multi-step work, load trellis-brainstorm skill…
[/workflow-state:no_task]

### Phase 1: Plan

[workflow-state:planning]
Complete prd.md via trellis-brainstorm skill; then run task.py start.
[/workflow-state:planning]

### Phase 2: Execute

[workflow-state:in_progress]
Flow: implement → check → update-spec → finish
Check conversation history + git status to determine current step; do NOT skip check.
[/workflow-state:in_progress]

### Phase 3: Finish

[workflow-state:completed]
User commits changes; then run task.py archive.
[/workflow-state:completed]
```

Rules:

* Tag `STATUS` matches `task.json.status`. Defaults: `planning` / `in_progress` / `completed`, plus `no_task` when no task is active.
* Hyphens and underscores are both allowed in the tag (`blocked` / `in-review` / `needs_qa` etc.).
* If a status has no matching tag block, the hook emits the generic line `Refer to workflow.md for current step.` and the AI falls back to reading the workflow contract directly. Delete blocks you don't need.
* `task.py create` now sets the active-task pointer alongside writing `status=planning`, so the `[workflow-state:planning]` block fires from the very next turn — during brainstorm and JSONL curation, not just after `task.py start`.
* Keep each block short (\~200 bytes). This is injected every turn; bloat means the AI pays attention cost on every message.

### Adding a custom workflow state

Want a `blocked` state that nudges the AI to escalate instead of guessing?

```markdown theme={null}
[workflow-state:blocked]
Task is blocked waiting on external input. Don't start new implementation —
surface the blocker to the user or spawn `trellis-research` if more investigation helps.
[/workflow-state:blocked]
```

Then set the status on the task by editing `task.json` directly:

```bash theme={null}
# Switch to a custom status
jq '.status = "blocked"' "$TASK_DIR/task.json" > "$TASK_DIR/task.json.tmp" && mv "$TASK_DIR/task.json.tmp" "$TASK_DIR/task.json"
```

From the next message onward, the AI sees the `blocked` breadcrumb injected per turn. Switch it back to `in_progress` the same way to resume the normal flow.

Built-in `task.py` subcommands only transition between the default statuses (`start` → `in_progress`, `archive` → `completed`). Custom statuses are plain strings in `task.json.status` — the breadcrumb system doesn't require pre-registering them, and `task.py list --status <name>` can filter by any string.

### Changing the skill routing table

The table under `### Skill Routing` is what the AI consults when deciding whether to load an auto-trigger skill.

```markdown theme={null}
| User intent                               | Skill               |
| ----------------------------------------- | ------------------- |
| Wants a new feature / requirement unclear | trellis-brainstorm  |
| About to write code / start implementing  | trellis-before-dev  |
| Finished writing / want to verify         | trellis-check       |
| Stuck / fixed same bug several times      | trellis-break-loop  |
| Spec needs update                         | trellis-update-spec |
```

Add a row for a custom skill you shipped (see [Custom Skills](./custom-skills)):

```markdown theme={null}
| User wants a test plan before writing code | trellis-test-plan |
```

No code change needed — next session, the AI reads the updated table and routes correctly.

### Adding or reshaping a Phase

The Phase sections in `workflow.md` are plain markdown. You can:

* **Add a Phase 4: Review** — define steps (4.1, 4.2, …) and their how-to text. Reference it from breadcrumbs (`[workflow-state:in_review]`).
* **Split Plan into two branches (A/B)** — replace step numbering with 1A.1 / 1B.1 naming; the AI follows what's in the text.
* **Shorten Finish** — delete steps you don't care about (e.g. drop 3.2 debug retrospective).

Keep the Phase Index in sync with the detailed Phase sections — the index is inlined at SessionStart so the AI sees both consistently.

<Note>
  `get_context.py --mode phase --step X.Y` parses `## Phase X` headings + `#### X.Y` step headings
  to extract the step body. If you rename or reshape sections, make sure the step anchors still
  parse (heading depth is significant).
</Note>

### What NOT to edit

A handful of conventions are consumed by scripts and shouldn't drift:

| Don't change                                                      | Why                                                                        |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| The tag format `[workflow-state:STATUS]…[/workflow-state:STATUS]` | `inject-workflow-state.py` parses this literally                           |
| Heading depth for Phase / step (`## Phase X` + `#### X.Y`)        | `get_context.py --mode phase --step X.Y` depends on it                     |
| `task.py` subcommand names in the task lifecycle list             | They must match the actual CLI; renaming in docs doesn't rename the script |

Everything else — phrasing, ordering, adding sections, rewriting how-to text — is fair game.

### When your change takes effect

| Change              | When AI sees it                                         |
| ------------------- | ------------------------------------------------------- |
| Breadcrumb text     | Next user message (re-read on every `UserPromptSubmit`) |
| Phase / step body   | Next session (re-read on `SessionStart`)                |
| Skill routing table | Next session                                            |

Forks don't need to republish anything. Commit your edited `workflow.md` to the repo and your team picks up the change on the next session start.

***
