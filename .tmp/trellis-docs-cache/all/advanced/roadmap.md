> ## Documentation Index
> Fetch the complete documentation index at: https://docs.trytrellis.app/llms.txt
> Use this file to discover all available pages before exploring further.

# Roadmap

## v0.6

### Spec → Wiki concept migration

Inspired by [Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). Expand the `spec` concept into a more general "project memory / knowledge base" layer. Today `.trellis/spec/` carries only coding constraints, but what users actually want to put there goes far beyond that — decision logs, user interview findings, domain knowledge, cross-task "why we designed it this way" notes. These don't fit "spec," and one-off PRDs don't preserve them.

Also borrowing Karpathy's pattern of **interlinking + ongoing maintenance**: the wiki isn't a pile of isolated markdown — it has wikilinks, cross-references, and stale markers; it's a living document. Spec narrows back to pure coding constraints; wiki takes over the broader project memory role.

### Trace + Session insight

**Trace** is replayable cross-task history — which task changed which files, why, referencing which specs, who reviewed it. The current journal is per-developer session continuity; trace is a project-level activity stream across developers and tasks, useful for tracing how a change came about after the fact.

**Session insight** is the companion auto-distillation layer: at `finish-work` time, each task automatically extracts key decisions, gotchas, and invariants from PRD / diff / journal and writes them into the matching wiki entries (see the Spec → Wiki concept migration above) — no reliance on developers remembering to "write this down." Trace is the activity log; session insight is the highlights and summary on top of it.

### Auto runner

After multiple tasks are discussed and approved, auto-run the full `implement` → `check` → `finish-work` → next task chain without manual `/trellis:continue` per phase. A shorter path for teams that trust Trellis.

### More configurable hooks

Hook behavior toggleable via config file, possibly scoped to the current session (different sessions can run different hook combinations). The content hooks inject also moves out of hardcoded Python into `workflow.md`, so editing hook prompts becomes a markdown edit with no source change needed.

***

## v0.7

### Better memory system

Built on 0.6's wiki layer: team-level memory (not just personal journal). Session insight auto-writes back to wiki; cross-task, cross-member retrieval. Significantly drops the "find context" cost on large legacy repos. Strongest repeat signal across user interviews.

### TDD template

Optional test-first workflow template that turns `implement → check` into `test → implement → check`. Current `trellis-check` is post-hoc. The TDD switch ships through `trellis-meta` skill; default lightweight workflow stays unchanged.

### Stronger brainstorm

Have brainstorm do deeper code / history investigation before asking business questions, leaving questions for what truly can't be inferred from the code. Today brainstorm asks shallow questions too easily.

### Chinese localization

Chinese versions of CLI output, built-in skill / sub-agent prompts, and default templates. `.trellis/spec/` and `workflow.md` are already model-agnostic markdown — writing them in Chinese works fine. This work targets Trellis's own bundled English copy.

***
