> ## Documentation Index
> Fetch the complete documentation index at: https://docs.trytrellis.app/llms.txt
> Use this file to discover all available pages before exploring further.

# Workflow Demo

> See the full Trellis workflow in action: from brainstorm to ship

<div className="td-wrap">
  <div className="td-inner">
    <div className="td-glow" />

    <div className="td-window">
      <div className="td-titlebar">
        <div className="td-dots">
          <div className="td-dot td-dot-r" />

          <div className="td-dot td-dot-y" />

          <div className="td-dot td-dot-g" />
        </div>
      </div>

      <div className="td-body">
        <div className="td-line td-line-user td-d0">
          <span className="td-prompt">❯ </span>
          <span className="td-cmd">New AI session</span>
        </div>

        <div className="td-line td-line-ai td-d1">
          <span className="td-bullet">● </span>
          Loaded: workflow, 3 active tasks, branch <span className="td-link">feat/v0.5.0-rc</span>
        </div>

        <div className="td-line td-line-ai td-d2">
          <span className="td-bullet">● </span>
          What would you like to work on?
        </div>

        <div className="td-line td-line-user td-d3">
          <span className="td-prompt">❯ </span>
          Add Gemini CLI support, similar to how Cursor is integrated
        </div>

        <div className="td-line td-line-ai td-d4">
          <span className="td-tool-name">● Bash</span>
          <span className="td-tool-args">(task.py create "Gemini CLI support" --slug gemini-cli)</span>
        </div>

        <div className="td-line td-line-agent td-d5">
          <span className="td-agent-icon">▶ </span>
          <span className="td-agent-name">research</span>
          <span className="td-agent-desc">(Find platform integration specs and code patterns)</span>
        </div>

        <div className="td-line td-line-loading" style={{animationDelay: '5.4s'}}>
          └ Initializing...
        </div>

        <div className="td-line td-line-sub td-d6">
          └ Done <span className="td-dim">(36 tool uses · 86.5k tokens · 2m 25s)</span> <span className="td-success">✓</span>
        </div>

        <div className="td-line td-line-ai td-d7">
          <span className="td-tool-name">● Bash</span>
          <span className="td-tool-args">(task.py add-context ... platform-integration.md, cursor.ts, ai-tools.ts)</span>
        </div>

        <div className="td-line td-line-sub td-d8">
          └ 6 spec files added to <span className="td-link">implement.jsonl</span>
        </div>

        <div className="td-line td-line-ai td-d9">
          <span className="td-tool-name">● Bash</span>
          <span className="td-tool-args">(task.py start ...)</span>
          <span>: hooks will inject context into agents</span>
        </div>

        <div className="td-line td-line-agent td-d10">
          <span className="td-agent-icon">▶ </span>
          <span className="td-agent-name">implement</span>
          <span className="td-agent-desc">(Implement Gemini CLI platform)</span>
        </div>

        <div className="td-line td-line-loading" style={{animationDelay: '12.8s'}}>
          └ Writing src/configurators/gemini.ts...
        </div>

        <div className="td-line td-line-sub td-d11">
          └ Done <span className="td-dim">(99 tool uses · 162.5k tokens · 12m 3s)</span> <span className="td-success">✓</span>
        </div>

        <div className="td-line td-line-ai td-d12">
          <span className="td-bullet">● </span>
          TypeCheck <span className="td-success">✓</span> · Lint <span className="td-success">✓</span> · Tests: 337/337 <span className="td-success">✓</span>
        </div>

        <div className="td-line td-line-agent td-d13">
          <span className="td-agent-icon">▶ </span>
          <span className="td-agent-name">check</span>
          <span className="td-agent-desc">(Review implementation against code-specs)</span>
        </div>

        <div className="td-line td-line-loading" style={{animationDelay: '17.6s'}}>
          └ Reading diff... 14 files changed
        </div>

        <div className="td-line td-line-sub td-d14">
          └ Found 1 issue: missing EXCLUDE\_PATTERNS entry
        </div>

        <div className="td-line td-line-sub" style={{animationDelay: '19.8s'}}>
          └ Fixed automatically <span className="td-success">✓</span>
        </div>

        <div className="td-line td-line-user td-d15">
          <span className="td-prompt">❯ </span>
          <span className="td-cmd">Capture Gemini CLI conventions in specs</span>
        </div>

        <div className="td-line td-line-ai td-d16">
          <span className="td-tool-name">● Read</span>
          <span className="td-tool-args">(.trellis/spec/backend/platform-integration.md)</span>
        </div>

        <div className="td-line td-line-ai td-d17">
          <span className="td-tool-name">● Update</span>
          <span className="td-tool-args">(platform-integration.md)</span>
          <span>: added Gemini CLI conventions</span>
        </div>

        <div className="td-line td-line-user td-d18">
          <span className="td-prompt">❯ </span>
          <span className="td-cmd">/trellis:finish-work</span>
        </div>

        <div className="td-line td-line-ai td-d19">
          <span className="td-tool-name">● Bash</span>
          <span className="td-tool-args">(task.py archive gemini-cli)</span>
        </div>

        <div className="td-line td-line-ai td-d20">
          <span className="td-tool-name">● Bash</span>
          <span className="td-tool-args">(add\_session.py --title "feat: Gemini CLI support" --commit "ec6114a")</span>
        </div>

        <div className="td-line td-line-sub td-d21">
          └ Task archived. Session recorded to <span className="td-link">journal-4.md</span>.
        </div>

        <div className="td-line td-line-ai td-d22">
          <span className="td-prompt">❯ </span>

          <span className="td-cursor" />
        </div>
      </div>
    </div>

    <div className="td-timeline">
      <div className="td-timeline-track" />

      <div className="td-timeline-fill" />

      <div className="td-step-dot" title="Start" />

      <div className="td-step-dot" title="Describe" />

      <div className="td-step-dot" title="Research" />

      <div className="td-step-dot" title="Implement" />

      <div className="td-step-dot" title="Check" />

      <div className="td-step-dot" title="Update Spec" />

      <div className="td-step-dot" title="Ship" />
    </div>

    <div className="td-descs">
      <div className="td-desc td-desc-0">
        <p className="td-desc-title">Session loaded</p>
        <p className="td-desc-text">AI reads your project context: workflow rules, active tasks, git status, and recent journal entries.</p>
      </div>

      <div className="td-desc td-desc-1">
        <p className="td-desc-title">Natural language input</p>
        <p className="td-desc-text">Describe your feature in plain language. Trellis creates a tracked task with a structured PRD.</p>
      </div>

      <div className="td-desc td-desc-2">
        <p className="td-desc-title">Research & configure</p>
        <p className="td-desc-text">trellis-research sub-agent finds relevant specs and code patterns. Context files configured in jsonl: hooks auto-inject them into agents.</p>
      </div>

      <div className="td-desc td-desc-3">
        <p className="td-desc-title">Implement</p>
        <p className="td-desc-text">Agent writes code across 5 layers following project conventions. 99 tool calls, all 337 tests pass on first try.</p>
      </div>

      <div className="td-desc td-desc-4">
        <p className="td-desc-title">Quality check</p>
        <p className="td-desc-text">trellis-check sub-agent reviews every changed file against code-specs. Issues found and fixed automatically.</p>
      </div>

      <div className="td-desc td-desc-5">
        <p className="td-desc-title">Update specs</p>
        <p className="td-desc-text">New patterns captured into the spec library: making future sessions even better.</p>
      </div>

      <div className="td-desc td-desc-6">
        <p className="td-desc-title">Session archived</p>
        <p className="td-desc-text">5 atomic commits, session recorded to journal. The branch is ready for review.</p>
      </div>
    </div>
  </div>
</div>

***

## What just happened?

This demo replays a real Trellis session where we added **Gemini CLI platform support**: a feature touching types, templates, configurators, CLI flags, Python adapters, and documentation.

### The workflow

<Steps>
  <Step title="Start session">
    SessionStart hook or extension loads your project context: workflow rules, active tasks, git
    status, and recent journal entries. The AI is immediately oriented.
  </Step>

  <Step title="Describe the feature">
    You describe what you want in natural language. Trellis creates a tracked task with a structured
    PRD.
  </Step>

  <Step title="Research & configure">
    trellis-research sub-agent reads 36 files to find relevant specs and code patterns. Context
    files are configured in jsonl so agents receive the right conventions via hooks.
  </Step>

  <Step title="Implement">
    trellis-implement sub-agent writes code across 5 layers (types → templates → configurator → CLI
    → Python). 99 tool calls. All 337 tests pass on first try.
  </Step>

  <Step title="Quality check">
    trellis-check sub-agent reviews every changed file against code-specs. Finds 1 missing
    `EXCLUDE_PATTERNS` entry and fixes it automatically.
  </Step>

  <Step title="Update specs">
    The `trellis-update-spec` skill captures new patterns learned from this session into the spec
    library: making future sessions even better.
  </Step>

  <Step title="Finish & ship">
    `/trellis:finish-work` archives the task and records the session to your journal. 5 atomic
    commits on the feature branch, ready for review.
  </Step>
</Steps>

### Key metrics

| Metric            | Value                                                    |
| ----------------- | -------------------------------------------------------- |
| **Total time**    | \~20 minutes                                             |
| **Tool calls**    | 169 (explore + research + implement + check)             |
| **Files changed** | 14 TOML templates + 5 source files                       |
| **Tests**         | 337/337 passed                                           |
| **Commits**       | 5 atomic commits                                         |
| **Human input**   | 3 messages (feature request + update-spec + finish-work) |

<Card title="Try it yourself" icon="rocket" href="/start/install-and-first-task">
  Install Trellis, open a new AI session, and describe your feature request.
</Card>
