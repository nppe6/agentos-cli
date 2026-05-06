# Development Workflow

---

## Core Principles

1. **Plan before code** — figure out what to do before you start
2. **Specs loaded, not remembered** — guidelines are loaded through hooks, preludes, skills, or prompts, not recalled from memory
3. **Persist everything** — research, decisions, and lessons all go to files; conversations get compacted, files don't
4. **Incremental development** — one task at a time
5. **Capture learnings** — after each task, review and write new knowledge back to spec

---

## AgentOS Shelf System

### Developer Identity

On first use, initialize your identity:

```bash
python3 ./.shelf/scripts/init_developer.py <your-name>
```

Creates `.shelf/.developer` (gitignored) + `.shelf/workspace/<your-name>/`.

### Spec System

`.shelf/spec/` holds coding guidelines organized by package and layer.

- `.shelf/spec/<package>/<layer>/index.md` — entry point with **Pre-Development Checklist** + **Quality Check**. Actual guidelines live in the `.md` files it points to.
- `.shelf/spec/guides/index.md` — cross-package thinking guides.

```bash
python3 ./.shelf/scripts/get_context.py --mode packages   # list packages / layers
```

**When to update spec**: new pattern/convention found · bug-fix prevention to codify · new technical decision.

### Task System

Every task has its own directory under `.shelf/tasks/{MM-DD-name}/` holding `prd.md`, `implement.jsonl`, `check.jsonl`, `task.json`, optional `research/`, `info.md`.

```bash
# Task lifecycle
python3 ./.shelf/scripts/task.py create "<title>" [--slug <name>] [--parent <dir>]
python3 ./.shelf/scripts/task.py start <name>          # set active task (session-scoped when available)
python3 ./.shelf/scripts/task.py current --source      # show active task and source
python3 ./.shelf/scripts/task.py finish                # clear active task (triggers after_finish hooks)
python3 ./.shelf/scripts/task.py archive <name>        # move to archive/{year-month}/
python3 ./.shelf/scripts/task.py list [--mine] [--status <s>]
python3 ./.shelf/scripts/task.py list-archive

# Code-spec context (injected into implement/check agents via JSONL).
# `implement.jsonl` / `check.jsonl` are seeded on `task create` for sub-agent-capable
# platforms; the AI curates real spec + research entries during Phase 1.3.
python3 ./.shelf/scripts/task.py add-context <name> <action> <file> <reason>
python3 ./.shelf/scripts/task.py list-context <name> [action]
python3 ./.shelf/scripts/task.py validate <name>

# Task metadata
python3 ./.shelf/scripts/task.py set-branch <name> <branch>
python3 ./.shelf/scripts/task.py set-base-branch <name> <branch>    # PR target
python3 ./.shelf/scripts/task.py set-scope <name> <scope>

# Hierarchy (parent/child)
python3 ./.shelf/scripts/task.py add-subtask <parent> <child>
python3 ./.shelf/scripts/task.py remove-subtask <parent> <child>

# PR creation
python3 ./.shelf/scripts/task.py create-pr [name] [--dry-run]
```

> Run `python3 ./.shelf/scripts/task.py --help` to see the authoritative, up-to-date list.

**Current-task mechanism**: `task.py create` creates the task directory and (when session identity is available) auto-sets the per-session active-task pointer so the planning breadcrumb fires immediately. `task.py start` writes the same pointer (idempotent if already set) and flips `task.json.status` from `planning` to `in_progress`. State is stored under `.shelf/.runtime/sessions/`. If no context key is available from hook input, `SHELF_CONTEXT_ID`, or a platform-native session environment variable, there is no active task and `task.py start` fails with a session identity hint. `task.py finish` deletes the current session file (status unchanged). `task.py archive <task>` writes `status=completed`, moves the directory to `archive/`, and deletes any runtime session files that still point at the archived task.

### Workspace System

Records every AI session for cross-session tracking under `.shelf/workspace/<developer>/`.

- `journal-N.md` — session log. **Max 2000 lines per file**; a new `journal-(N+1).md` is auto-created when exceeded.
- `index.md` — personal index (total sessions, last active).

```bash
python3 ./.shelf/scripts/add_session.py --title "Title" --commit "hash" --summary "Summary"
```

### Context Script

```bash
python3 ./.shelf/scripts/get_context.py                            # full session runtime
python3 ./.shelf/scripts/get_context.py --mode packages            # available packages + spec layers
python3 ./.shelf/scripts/get_context.py --mode phase --step <X.Y>  # detailed guide for a workflow step
```

---

<!--
  WORKFLOW-STATE BREADCRUMB CONTRACT (read this before editing the tag blocks below)

  The 4 [workflow-state:STATUS] blocks embedded in the ## Phase Index section
  below are the SINGLE source of truth for the per-turn `<workflow-state>`
  breadcrumb contract used by Shelf commands, prompts, hooks, and agents.
  Current AgentOS Shelf CLI projections support Codex and Claude Code. If a
  future platform is added, add only that platform's concrete parser/entry
  point here.

  STATUS charset: [A-Za-z0-9_-]+. When the hook can't find a tag, it
  degrades to a generic "Refer to workflow.md for current step." line —
  intentionally visible so users notice and fix a broken workflow.md.

  INVARIANT (test/regression.test.ts):
    Every workflow-walkthrough step marked `[required · once]` must have a
    matching enforcement line in its phase's [workflow-state:*] block. The
    breadcrumb is the only per-turn channel; if a mandatory step isn't
    mentioned there, the AI silently skips it (Phase 1.3 jsonl curation
    skip and Phase 3.4 commit skip both manifested via this gap).

  TAG ↔ PHASE scoping:
    [workflow-state:no_task]      → no active task; before Phase 1
    [workflow-state:planning]     → all of Phase 1 (status='planning')
    [workflow-state:in_progress]  → Phase 2 + Phase 3.1-3.4
                                    (status stays 'in_progress' from
                                    task.py start until task.py archive)
    [workflow-state:completed]    → currently DEAD: cmd_archive flips
                                    status and moves the dir in the same
                                    call, so the resolver loses the
                                    pointer (block kept for a future
                                    explicit in_progress→completed
                                    transition)

  Editing checklist:
    - When you change a [workflow-state:STATUS] block, also check the
      matching phase's `[required · once]` walkthrough steps for sync
    - Run `agentos-cli shelf update` after editing to push the new bodies to
      downstream user projects (block-level managed replacement)
    - Full runtime contract:
      .shelf/spec/cli/backend/workflow-state-contract.md
-->

## Phase Index

```
Phase 1: Plan    → figure out what to do (brainstorm + research → prd.md)
Phase 2: Execute → write code and pass quality checks
Phase 3: Finish  → distill lessons + wrap-up
```

<!-- Per-turn breadcrumb: shown when there is no active task (before Phase 1) -->

[workflow-state:no_task]
No active task. **A Direct answer** — pure Q&A / explanation / lookup / chat; no file writes + one-line answer + repo reads <= 2 files → AI judges, no override needed.
**B Create a task** — any implementation / code change / build / refactor work. After the user simply describes the work, the AI should enter the workflow automatically — do not ask the user to invoke `shelf-brainstorm`, `shelf-continue`, or another Shelf entrypoint first. Entry sequence: (1) `python3 ./.shelf/scripts/task.py create "<title>"` to create the task (status=planning, breadcrumb switches to [workflow-state:planning] for brainstorm + jsonl phase guidance) → (2) load `shelf-brainstorm` to discuss requirements with the user and iterate on prd.md → (3) once prd is done and jsonl is curated, run `task.py start <task-dir>` to enter [workflow-state:in_progress] for the implementation skeleton. For research-heavy work, dispatch `shelf-research` sub-agents — main agent must NOT do 3+ inline WebFetch / WebSearch / `gh api` calls. **"It looks small" is NOT grounds for downgrading B to A or C**.
**C Inline change** (per-turn only, escape hatch for B) — the user's CURRENT message MUST contain one of: "skip shelf" / "no task" / "just do it" / "don't create a task" / "跳过 shelf" / "别走流程" / "小修一下" / "直接改" / "先别建任务" → briefly acknowledge ("ok, skipping shelf flow this turn"), then inline. **Without seeing one of these phrases you must NOT inline on your own**; do not invent an override the user never said.
[/workflow-state:no_task]

### Phase 1: Plan
- 1.0 Create task `[required · once]` (just `task.py create`; status enters planning)
- 1.1 Requirement exploration `[required · repeatable]`
- 1.2 Research `[optional · repeatable]`
- 1.3 Configure context `[required · once]` — Codex and Claude Code
- 1.4 Activate task `[required · once]` (run `task.py start`; status → in_progress)
- 1.5 Completion criteria

<!-- Per-turn breadcrumb: shown throughout Phase 1 (status='planning') -->

[workflow-state:planning]
Load the `shelf-brainstorm` skill and iterate on prd.md with the user.
Phase 1.3 (required, once): before `task.py start`, you MUST curate `implement.jsonl` and `check.jsonl` — list the spec / research files sub-agents need so they get the right context injected. You may skip only if the jsonl already has agent-curated entries (the seed `_example` row alone doesn't count).
Then run `task.py start <task-dir>` to flip status to in_progress.
Research output **must** land in `{task_dir}/research/*.md`, written by `shelf-research` sub-agents. The main agent should not inline WebFetch / WebSearch — the PRD only links to research files.
[/workflow-state:planning]

### Phase 2: Execute
- 2.1 Implement `[required · repeatable]`
- 2.2 Quality check `[required · repeatable]`
- 2.3 Rollback `[on demand]`

<!-- Per-turn breadcrumb: shown while status='in_progress'.
     Scope: all of Phase 2 + Phase 3.1-3.4 (status stays 'in_progress' from
     task.py start until task.py archive; only archive flips it). The body
     therefore must cover every required step from implementation through
     commit, including Phase 3.3 spec update and Phase 3.4 commit. -->

[workflow-state:in_progress]
**Flow**: shelf-implement → shelf-check → shelf-update-spec → commit (Phase 3.4) → `/shelf:finish-work`.
**Default (no override)**: dispatch the `shelf-implement` / `shelf-check` sub-agents — the main agent does NOT edit code by default. Phase 3.4 commit (required, once): after shelf-update-spec, or whenever implementation is verifiably complete, the main agent **drives the commit** — state the commit plan in user-facing text, then run `git commit` — BEFORE suggesting `/shelf:finish-work`. `/finish-work` refuses to run on a dirty working tree (paths outside `.shelf/workspace/` and `.shelf/tasks/`).
**Inline override** (per-turn only, escape hatch for sub-agent dispatch): the user's CURRENT message MUST explicitly contain one of: "do it inline" / "no sub-agent" / "你直接改" / "别派 sub-agent" / "main session 写就行" / "不用 sub-agent". **Without seeing one of these phrases you must NOT inline on your own**; do not invent an override the user never said.
[/workflow-state:in_progress]

### Phase 3: Finish
- 3.1 Quality verification `[required · repeatable]`
- 3.2 Debug retrospective `[on demand]`
- 3.3 Spec update `[required · once]`
- 3.4 Commit changes `[required · once]`
- 3.5 Wrap-up reminder

<!-- Per-turn breadcrumb: shown while status='completed'.
     Currently DEAD in normal flow: cmd_archive writes status='completed' in
     the same call that moves the task dir to archive/, so the active-task
     resolver loses the pointer and the hook never fires on archived tasks.
     Block preserved for a future status-transition redesign (e.g. an
     explicit in_progress→completed command). Edit through the same spec
     channel as the live blocks. -->

[workflow-state:completed]
Code committed via Phase 3.4; run `/shelf:finish-work` to wrap up (archive the task + record session).
If you reach this state with uncommitted code, return to Phase 3.4 first — `/finish-work` refuses to run on a dirty working tree.
`task.py archive` deletes any runtime session files that still point at the archived task.
[/workflow-state:completed]

### Rules

1. Identify which Phase you're in, then continue from the next step there
2. Run steps in order inside each Phase; `[required]` steps can't be skipped
3. Phases can roll back (e.g., Execute reveals a prd defect → return to Plan to fix, then re-enter Execute)
4. Steps tagged `[once]` are skipped if the output already exists; don't re-run

### Skill Routing

When a user request matches one of these intents, load the corresponding skill (or dispatch the corresponding sub-agent) first — do not skip skills.

[Codex, Claude Code]

| User intent | Route |
|---|---|
| Wants a new feature / requirement unclear | `shelf-brainstorm` |
| About to write code / start implementing | Dispatch the `shelf-implement` sub-agent per Phase 2.1 |
| Finished writing / want to verify | Dispatch the `shelf-check` sub-agent per Phase 2.2 |
| Stuck / fixed same bug several times | `shelf-break-loop` |
| Spec needs update | `shelf-update-spec` |

**Why `shelf-before-dev` is NOT in this table:** you are not the one writing code — the `shelf-implement` sub-agent is. The agent reads task context from `implement.jsonl` and the referenced files before editing.

[/Codex, Claude Code]

### DO NOT skip skills

[Codex, Claude Code]

| What you're thinking | Why it's wrong |
|---|---|
| "This is simple, I'll just code it in the main thread" | Dispatching `shelf-implement` is the cheap path; skipping it tempts you to write code in the main thread and lose spec context — sub-agents get `implement.jsonl` injected, you don't |
| "I already thought it through in plan mode" | Plan-mode output lives in memory — sub-agents can't see it; must be persisted to prd.md |
| "I already know the spec" | The spec may have been updated since you last read it; the sub-agent gets the fresh copy, you may not |
| "Code first, check later" | `shelf-check` surfaces issues you won't notice yourself; earlier is cheaper |

[/Codex, Claude Code]

### Loading Step Detail

At each step, run this to fetch detailed guidance:

```bash
python3 ./.shelf/scripts/get_context.py --mode phase --step <step>
# e.g. python3 ./.shelf/scripts/get_context.py --mode phase --step 1.1
```

---

## Phase 1: Plan

Goal: figure out what to build, produce a clear requirements doc and the context needed to implement it.

#### 1.0 Create task `[required · once]`

Create the task directory (status enters `planning`, the session active-task pointer auto-targets the new task when session identity is available):

```bash
python3 ./.shelf/scripts/task.py create "<task title>" --slug <name>
```

`--slug` is the human-readable name only. Do **not** include the `MM-DD-` date prefix; `task.py create` adds that prefix automatically.

After this command succeeds, the per-turn breadcrumb auto-switches to `[workflow-state:planning]`, telling the AI to enter the brainstorm + jsonl curation phase.

⚠️ **Run only `create` here — do not also run `start`**. `start` flips status to `in_progress`, which switches the breadcrumb to the implementation phase before brainstorm + jsonl are done — the AI will silently skip them. Save `start` for step 1.4, after jsonl curation is complete.

Skip when `python3 ./.shelf/scripts/task.py current --source` already points to a task.

#### 1.1 Requirement exploration `[required · repeatable]`

Load the `shelf-brainstorm` skill and explore requirements interactively with the user per the skill's guidance.

The brainstorm skill will guide you to:
- Ask one question at a time
- Prefer researching over asking the user
- Prefer offering options over open-ended questions
- Update `prd.md` immediately after each user answer

Return to this step whenever requirements change and revise `prd.md`.

#### 1.2 Research `[optional · repeatable]`

Research can happen at any time during requirement exploration. It isn't limited to local code — you can use any available tool (MCP servers, skills, web search, etc.) to look up external information, including third-party library docs, industry practices, API references, etc.

[Codex, Claude Code]

Spawn the research sub-agent:

- **Agent type**: `shelf-research`
- **Task description**: Research <specific question>
- **Key requirement**: Research output MUST be persisted to `{TASK_DIR}/research/`

[/Codex, Claude Code]

**Research artifact conventions**:
- One file per research topic (e.g. `research/auth-library-comparison.md`)
- Record third-party library usage examples, API references, version constraints in files
- Note relevant spec file paths you discovered for later reference

Brainstorm and research can interleave freely — pause to research a technical question, then return to talk with the user.

**Key principle**: Research output must be written to files, not left only in the chat. Conversations get compacted; files don't.

#### 1.3 Configure context `[required · once]`

[Codex, Claude Code]

Curate `implement.jsonl` and `check.jsonl` so the Phase 2 sub-agents get the right spec context. These files were seeded on `task create` with a single self-describing `_example` line; your job here is to fill in real entries.

**Location**: `{TASK_DIR}/implement.jsonl` and `{TASK_DIR}/check.jsonl` (already exist).

**Format**: one JSON object per line — `{"file": "<path>", "reason": "<why>"}`. Paths are repo-root relative.

**What to put in**:
- **Spec files** — `.shelf/spec/<package>/<layer>/index.md` and any specific guideline files (`error-handling.md`, `conventions.md`, etc.) relevant to this task
- **Research files** — `{TASK_DIR}/research/*.md` that the sub-agent will need to consult

**What NOT to put in**:
- Code files (`src/**`, `packages/**/*.ts`, etc.) — those are read by the sub-agent during implementation, not pre-registered here
- Files you're about to modify — same reason

**Split between the two files**:
- `implement.jsonl` → specs + research the implement sub-agent needs to write code correctly
- `check.jsonl` → specs for the check sub-agent (quality guidelines, check conventions, same research if needed)

**How to discover relevant specs**:

```bash
python3 ./.shelf/scripts/get_context.py --mode packages
```

Lists every package + its spec layers with paths. Pick the entries that match this task's domain.

**How to append entries**:

Either edit the jsonl file directly in your editor, or use:

```bash
python3 ./.shelf/scripts/task.py add-context "$TASK_DIR" implement "<path>" "<reason>"
python3 ./.shelf/scripts/task.py add-context "$TASK_DIR" check "<path>" "<reason>"
```

Delete the seed `_example` line once real entries exist (optional — it's skipped automatically by consumers).

Skip when: `implement.jsonl` has agent-curated entries (the seed row alone doesn't count).

[/Codex, Claude Code]

#### 1.4 Activate task `[required · once]`

Once prd.md is complete and 1.3 jsonl curation is done, flip the task status to `in_progress`:

```bash
python3 ./.shelf/scripts/task.py start <task-dir>
```

After this command succeeds, the breadcrumb auto-switches to `[workflow-state:in_progress]`, and the rest of Phase 2 / 3 follows.

If `task.py start` errors with a session-identity message (no context key from hook input, `SHELF_CONTEXT_ID`, or platform-native session env), follow the hint in the error to set up session identity, then retry.

#### 1.5 Completion criteria

| Condition | Required |
|------|:---:|
| `prd.md` exists | ✅ |
| User confirms requirements | ✅ |
| `task.py start` has been run (status = in_progress) | ✅ |
| `research/` has artifacts (complex tasks) | recommended |
| `info.md` technical design (complex tasks) | optional |

[Codex, Claude Code]

| `implement.jsonl` has agent-curated entries (not just the seed row) | ✅ |

[/Codex, Claude Code]

---

## Phase 2: Execute

Goal: turn the prd into code that passes quality checks.

#### 2.1 Implement `[required · repeatable]`

[Claude Code]

Spawn the implement sub-agent:

- **Agent type**: `shelf-implement`
- **Task description**: Implement the requirements per prd.md, consulting materials under `{TASK_DIR}/research/`; finish by running project lint and type-check

The `shelf-implement` agent file instructs the agent to:
- Resolve the active task with `task.py current --source`
- Read `prd.md`, `info.md`, and `implement.jsonl`
- Load each referenced spec or research file before coding

[/Claude Code]

[Codex]

Spawn the implement sub-agent:

- **Agent type**: `shelf-implement`
- **Task description**: Implement the requirements per prd.md, consulting materials under `{TASK_DIR}/research/`; finish by running project lint and type-check

The Codex sub-agent definition auto-handles the context load requirement:
- Resolves the active task with `task.py current --source`, then reads `prd.md` and `info.md` if present
- Reads `implement.jsonl` and requires the agent to load each referenced spec file before coding

[/Codex]

#### 2.2 Quality check `[required · repeatable]`

[Codex, Claude Code]

Spawn the check sub-agent:

- **Agent type**: `shelf-check`
- **Task description**: Review all code changes against spec and prd; fix any findings directly; ensure lint and type-check pass

The check agent's job:
- Review code changes against specs
- Auto-fix issues it finds
- Run lint and typecheck to verify

[/Codex, Claude Code]

#### 2.3 Rollback `[on demand]`

- `check` reveals a prd defect → return to Phase 1, fix `prd.md`, then redo 2.1
- Implementation went wrong → revert code, redo 2.1
- Need more research → research (same as Phase 1.2), write findings into `research/`

---

## Phase 3: Finish

Goal: ensure code quality, capture lessons, record the work.

#### 3.1 Quality verification `[required · repeatable]`

Load the `shelf-check` skill and do a final verification:
- Spec compliance
- lint / type-check / tests
- Cross-layer consistency (when changes span layers)

If issues are found → fix → re-check, until green.

#### 3.2 Debug retrospective `[on demand]`

If this task involved repeated debugging (the same issue was fixed multiple times), load the `shelf-break-loop` skill to:
- Classify the root cause
- Explain why earlier fixes failed
- Propose prevention

The goal is to capture debugging lessons so the same class of issue doesn't recur.

#### 3.3 Spec update `[required · once]`

Load the `shelf-update-spec` skill and review whether this task produced new knowledge worth recording:
- Newly discovered patterns or conventions
- Pitfalls you hit
- New technical decisions

Update the docs under `.shelf/spec/` accordingly. Even if the conclusion is "nothing to update", walk through the judgment.

#### 3.4 Commit changes `[required · once]`

The AI drives a batched commit of this task's code changes so `/finish-work` can run cleanly afterwards. Goal: produce work commits FIRST, then bookkeeping (archive + journal) commits land after — never interleaved.

**Step-by-step**:

1. **Inspect dirty state**:
   ```bash
   git status --porcelain
   ```
   Snapshot every dirty path. If the working tree is clean, skip to 3.5.

2. **Learn commit style** from recent history (so drafted messages blend in):
   ```bash
   git log --oneline -5
   ```
   Note the prefix convention (`feat:` / `fix:` / `chore:` / `docs:` ...), language (中文/English), and length style.

3. **Classify dirty files into two groups**:
   - **AI-edited this session** — files you wrote/edited via Edit/Write/Bash tool calls in this session. You know what changed and why.
   - **Unrecognized** — dirty files you did NOT touch this session (could be the user's manual edits, leftover WIP from a previous session, or unrelated work). Do NOT silently include these.

4. **Draft a commit plan**. Group AI-edited files into logical commits (1 commit per coherent change unit, not 1 commit per file). Each entry: `<commit message>` + file list. List unrecognized files separately at the bottom.

5. **Present the plan once, ask for one-shot confirmation**. Format:
   ```
   Proposed commits (in order):
     1. <message>
        - <file>
        - <file>
     2. <message>
        - <file>

   Unrecognized dirty files (NOT in any commit — confirm include/exclude):
     - <file>
     - <file>

   Reply 'ok' / '行' to execute. Reply with edits, or '我自己来' / 'manual' to abort.
   ```

6. **On confirmation**: run `git add <files>` + `git commit -m "<msg>"` for each batch in order. Do not amend. Do not push.

7. **On rejection** (user replies "不行" / "我自己来" / "manual" / any pushback on the plan): stop. Do not attempt a second plan. The user will commit by hand; you skip ahead to 3.5 once they confirm.

**Rules**:
- No `git commit --amend` anywhere — three-stage three-commit flow (work commits → archive commit → journal commit).
- Never push to remote in this step.
- If the user wants different message wording but accepts the file grouping, edit the message and re-confirm once — but if they reject the grouping, exit to manual mode.
- The batched plan is one prompt; do not prompt per commit.

#### 3.5 Wrap-up reminder

After the above, remind the user they can run `/finish-work` to wrap up (archive the task, record the session).

---

## Customizing AgentOS Shelf (for forks)

This section is for developers who want to modify the AgentOS Shelf workflow itself. All customization is done by editing this file; the scripts are parsers only.

### Changing what a step means

Edit the corresponding step's walkthrough body in the Phase 1 / 2 / 3 sections above. **Critical constraint**: if you change a step's `[required · once]` marker or add a new `[required · once]` step, you MUST also add a matching enforcement line to that phase's `[workflow-state:STATUS]` tag block — otherwise the per-turn breadcrumb omits the reinforcement, and the AI silently skips the step. The regression tests assert this.

All 4 tag blocks live in the `## Phase Index` section above, immediately after each phase summary:

| Scope | Corresponding tag |
|---|---|
| No active task (before Phase 1) | `[workflow-state:no_task]` (after the Phase Index ASCII art) |
| All of Phase 1 (task created → ready for implementation) | `[workflow-state:planning]` (after Phase 1 summary) |
| Phase 2 + Phase 3.1–3.4 (implementation + check + wrap-up) | `[workflow-state:in_progress]` (after Phase 2 summary) |
| After Phase 3.5 (archived) | `[workflow-state:completed]` (after Phase 3 summary; **currently DEAD**) |

### Changing the per-turn prompt text

Directly edit the body of the corresponding `[workflow-state:STATUS]` block. After editing, run `agentos-cli shelf update` (if you're a template maintainer) or restart your AI session (if you're customizing your own project) — no script changes required.

### Adding a custom status

Add a new block:

```
[workflow-state:my-status]
your per-turn prompt text
[/workflow-state:my-status]
```

Constraints:
- STATUS charset: `[A-Za-z0-9_-]+` (underscores and hyphens allowed, e.g. `in-review`, `blocked-by-team`)
- A lifecycle hook must write `task.json.status` to your custom value, otherwise the tag is never read
- Lifecycle hooks live in `task.json.hooks.after_*` and bind to one of `after_create / after_start / after_finish / after_archive`

### Adding a lifecycle hook

Add a `hooks` field to your `task.json`:

```json
{
  "hooks": {
    "after_finish": [
      "your-script-or-command-here"
    ]
  }
}
```

Supported events: `after_create / after_start / after_finish / after_archive`. Note that `after_finish` is NOT a status change (it only clears the active-task pointer); use `after_archive` for "task is done" notifications.

### Full contract

For the workflow state machine's runtime contract, the locations of all status writers, pseudo-statuses (`no_task` / `stale_<source_type>`), the hook reachability matrix, and other deep details, see:

- `.shelf/spec/cli/backend/workflow-state-contract.md` — runtime contract + writer table + test invariants
- `.shelf/scripts/inject-workflow-state.py` — actual parser (reads workflow.md only, no embedded text)
