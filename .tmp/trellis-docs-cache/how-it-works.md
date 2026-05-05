> ## Documentation Index
> Fetch the complete documentation index at: https://docs.trytrellis.app/llms.txt
> Use this file to discover all available pages before exploring further.

# How It Works

This page walks through the normal Trellis task flow from a fresh AI session to an archived task. It focuses on concrete runtime behavior: which files are read, which files are written, which hooks run, and where platform behavior differs.

> This is the day-to-day usage flow. For module boundaries, customization points, and implementation details, see [Architecture Overview](/advanced/architecture).

## 1. A session opens

A Trellis project is a repository with `.trellis/` plus one or more platform directories such as `.claude/`, `.codex/`, `.cursor/`, `.opencode/`, `.kiro/`, or `.pi/`.

When an AI session starts, Trellis tries to load enough project context for the main session to make the next routing decision without guessing. The startup payload is an index and state report, not a full dump of every project file.

Typical startup context includes:

| Context             | Source                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------ |
| Developer identity  | `.trellis/.developer`                                                                      |
| Git state           | current branch, dirty files, recent commits                                                |
| Active task pointer | `.trellis/.runtime/sessions/<session-key>.json`, with `.trellis/.current-task` as fallback |
| Active task list    | `.trellis/tasks/*/task.json`                                                               |
| Workflow summary    | `.trellis/workflow.md`                                                                     |
| Spec index          | `.trellis/spec/**/index.md`                                                                |
| Workspace memory    | `.trellis/workspace/<developer>/index.md` and recent journal notes                         |

The delivery path depends on the platform:

| Platform group                                                                  | Startup behavior                                                                                                        |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Claude Code, Cursor, OpenCode, Gemini CLI, Qoder, CodeBuddy, Copilot, Droid, Pi | A SessionStart hook, plugin, or extension injects startup context automatically.                                        |
| Codex                                                                           | `AGENTS.md` loads automatically. The SessionStart hook also runs when `codex_hooks = true` is enabled.                  |
| Kiro                                                                            | Trellis content is delivered through `.kiro/` skills and agent files; there is no Trellis SessionStart hook by default. |
| Kilo, Antigravity, Windsurf                                                     | The main session reads a workflow or skill entry explicitly.                                                            |

After this step, the AI should know whether there is an active task, where the workflow lives, and where project specs are indexed. It still has to open the detailed files when the current task needs them.

## 2. Each prompt gets the current workflow state

On hook-capable platforms, every user message triggers a lightweight workflow-state injection. This is the per-turn guardrail that keeps the main session aligned with the current task status.

The hook resolves the active task for the current session:

```text theme={null}
cwd
  -> find .trellis/
  -> resolve session key
  -> read .trellis/.runtime/sessions/<session-key>.json
  -> read .trellis/tasks/<task>/task.json
  -> read task.json.status
```

Then it parses `.trellis/workflow.md` for the matching block:

```text theme={null}
[workflow-state:STATUS]
...
[/workflow-state:STATUS]
```

The block body is wrapped in `<workflow-state>...</workflow-state>` and injected into the current turn.

Important details:

* The hook is parser-only. Breadcrumb wording lives in `.trellis/workflow.md`.
* Python and JavaScript hooks do not carry duplicated fallback dictionaries.
* If no active task exists, the pseudo-status is `no_task`.
* If a matching block is missing, the hook emits `Refer to workflow.md for current step.`
* Sub-agents do not rely on this breadcrumb; they get task/spec context through their own injection or prelude path.

This means changing workflow-state behavior starts with `.trellis/workflow.md`, not the hook script.

## 3. Trellis chooses the route for your prompt

The main session reads your prompt plus the current workflow-state block and chooses one of three paths.

| Path                | When it applies                                                                  | What happens                                                 |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Direct answer       | No file writes; simple Q\&A, explanation, lookup, or chat                        | The AI answers and stops.                                    |
| Trellis task        | Any implementation, docs edit, refactor, build, migration, or other work product | Trellis creates or continues a task under `.trellis/tasks/`. |
| Inline escape hatch | You explicitly ask to skip Trellis for this turn                                 | The AI changes files inline for this turn only.              |

The strict default is intentional. Work products need durable task files because conversations compact, restart, and move across tools.

The rest of this page follows the Trellis task path.

## 4. Task creation writes the planning state

For real work, the main session creates a task:

```bash theme={null}
python3 ./.trellis/scripts/task.py create "<title>" --slug <name>
```

This command writes a task directory:

```text theme={null}
.trellis/tasks/<MM-DD-name>/
├── task.json
├── implement.jsonl
└── check.jsonl
```

The initial `task.json` status is `planning`. `task.py create` also best-effort sets the current session's active-task pointer, so the next prompt can receive the `[workflow-state:planning]` block without waiting for `task.py start`.

The seeded JSONL files start with an example row. They are not ready for implementation until the planning phase replaces that seed with real spec/research entries.

## 5. Planning turns the request into files

Planning is where Trellis converts a user request into task artifacts the implementation and check paths can trust.

The main session loads `trellis-brainstorm` and writes `prd.md`. For small, clear tasks this can be short; for ambiguous tasks it records decisions as they are made.

`prd.md` usually contains:

| Section             | Purpose                                               |
| ------------------- | ----------------------------------------------------- |
| Goal                | What the task changes and why.                        |
| Requirements        | Behaviors or docs that must change.                   |
| Acceptance Criteria | Checks that prove the task is complete.               |
| Definition of Done  | Quality bar: checks, docs sync, tests where relevant. |
| Out of Scope        | What this task deliberately does not change.          |
| Technical Notes     | Files inspected, constraints, and related tasks.      |

If research is needed, Trellis writes findings under the task:

```text theme={null}
.trellis/tasks/<task>/research/<topic>.md
```

Research files are preferred over chat-only conclusions because sub-agents and future sessions can read them after the conversation is gone.

## 6. Planning curates implementation context

Before implementation, Trellis curates `implement.jsonl` and `check.jsonl`.

Example:

```text theme={null}
{"file": ".trellis/spec/docs-site/docs/style-guide.md", "reason": "Docs writing style"}
{"file": ".trellis/tasks/04-30-example/research/platforms.md", "reason": "Platform behavior research"}
```

Rules:

* Include spec files and research files.
* Do not list source files that are about to be modified.
* Do not leave only the seed `_example` row.
* Put implementation-writing context in `implement.jsonl`.
* Put verification and quality context in `check.jsonl`.

This is the main read-before-write mechanism. It keeps the sub-agent prompt focused on the rules and background for this task, instead of dumping the whole repository.

## 7. Activation enters implementation

When `prd.md` and JSONL context are ready, Trellis activates the task:

```bash theme={null}
python3 ./.trellis/scripts/task.py start <task-dir>
```

This changes `task.json.status` from `planning` to `in_progress`.

On the next prompt, the workflow-state hook injects the `[workflow-state:in_progress]` block. That block covers implementation, checking, final verification, spec update, and the required Phase 3.4 commit plan.

## 8. Implementation reads PRD and specs

Execution always starts from the active task directory. The platform decides how context gets into the actor doing the work.

| Execution path          | Platforms                                           | How context loads                                                                                      |
| ----------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Hook-push sub-agent     | Claude Code, Cursor, OpenCode, CodeBuddy, Droid, Pi | A hook injects `prd.md`, `info.md`, and files listed in `implement.jsonl` before the sub-agent starts. |
| Pull-prelude sub-agent  | Codex, Copilot, Gemini CLI, Qoder, Kiro             | The sub-agent definition tells the agent to read the active task, PRD, and JSONL files on startup.     |
| Main-session skill flow | Kilo, Antigravity, Windsurf                         | The main session loads Trellis skills and reads the same task/spec files inline.                       |

Normal implementation sequence:

1. Read `prd.md`.
2. Read optional `info.md`.
3. Read `implement.jsonl`.
4. Read each listed spec/research file.
5. Inspect the relevant source files.
6. Make the change.
7. Run the task-appropriate project checks, usually lint and type-check.

The implement path does not commit. It produces a working diff and reports what changed.

## 9. Check reviews and self-fixes

After implementation, Trellis runs `trellis-check`.

The check path reads:

* `prd.md`
* `check.jsonl`
* relevant specs and research
* the changed files
* local test/lint/type-check commands

The goal is not only to report issues. `trellis-check` is allowed to fix findings directly, then rerun checks.

Typical check findings include:

| Finding type        | Example                                                                  |
| ------------------- | ------------------------------------------------------------------------ |
| PRD drift           | The implementation changed a behavior not listed in acceptance criteria. |
| Spec drift          | The code violates a local convention in `.trellis/spec/`.                |
| Missing sync        | English docs changed but Chinese mirror did not.                         |
| Broken checks       | Markdown lint, type-check, unit tests, or formatting fail.               |
| Wrong task boundary | The diff includes unrelated files or generated noise.                    |

If the check exposes a requirements problem, Trellis returns to planning, updates `prd.md`, and then runs implementation again. If the issue is only implementation quality, the check path fixes and reruns.

## 10. Finish updates durable knowledge

After checks pass, the main session performs final verification and loads `trellis-update-spec`.

This step asks whether the task taught a reusable rule. If yes, the rule is written into `.trellis/spec/` so future tasks can load it through JSONL.

Examples that belong in spec:

* a new docs writing convention
* a command contract or status transition rule
* a platform-specific gotcha
* a testing pattern that prevents a repeated bug

Examples that do not belong in spec:

* one-off task details
* temporary notes about this implementation
* facts that only matter to the current PRD

Task-local facts stay in `.trellis/tasks/<task>/`; stable team rules move to `.trellis/spec/`.

## 11. The main session drives the work commit

The commit boundary is separate from implementation and separate from `/trellis:finish-work`.

In Phase 3.4, the main session:

1. Reads `git status --porcelain`.
2. Separates files changed in this task from unrelated dirty files.
3. Groups task files into logical commits.
4. Prints the proposed commit plan.
5. Waits for one user confirmation.
6. Runs `git add` and `git commit` for the approved batches.

The main session does not push. It also does not silently include unrelated dirty files.

For docs-site changes, there is often a submodule boundary:

1. Commit inside `docs-site/`.
2. Return to the parent repository.
3. Commit the updated `docs-site` submodule pointer.

## 12. `/trellis:finish-work` archives and journals

Only after the work commit exists should `/trellis:finish-work` run.

`/trellis:finish-work` does bookkeeping:

* refuses to run if the working tree is still dirty
* archives the task under `.trellis/tasks/archive/YYYY-MM/`
* appends the session summary to `.trellis/workspace/<developer>/journal-N.md`
* updates workspace indexes

It is not the command that commits feature code.

## What survives the session

After the flow completes, durable state lives in files:

| Stored in                         | What survives                                                          |
| --------------------------------- | ---------------------------------------------------------------------- |
| `.trellis/tasks/<task>/`          | PRD, research, context manifests, metadata, and archived task history. |
| `.trellis/spec/`                  | Team conventions and reusable lessons.                                 |
| `.trellis/workspace/<developer>/` | Developer journals and cross-session notes.                            |
| Git commits                       | Reviewable units of code, docs, spec, archive, and journal changes.    |

The next AI session reads the repository state again. It does not need the previous chat transcript to know what the task was, what specs apply, or what workflow step comes next.
