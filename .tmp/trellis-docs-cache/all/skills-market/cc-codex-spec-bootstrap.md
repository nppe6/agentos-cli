> ## Documentation Index
> Fetch the complete documentation index at: https://docs.trytrellis.app/llms.txt
> Use this file to discover all available pages before exploring further.

# cc-codex-spec-bootstrap

> Bootstrap coding specs with Claude Code + Codex parallel pipeline

A multi-agent pipeline where **Claude Code** orchestrates and **Codex** executes in parallel. CC analyzes the repo with GitNexus (knowledge graph) + ABCoder (AST), creates Trellis task PRDs with full architectural context, then Codex agents fill the coding spec files — each with access to the same code intelligence MCP tools.

## Why This Skill?

AI coding agents produce better code when they have project-specific coding guidelines. But writing those guidelines manually is tedious. This skill automates the bootstrap:

1. **Claude Code** analyzes your repo architecture using GitNexus + ABCoder
2. **Claude Code** creates Trellis tasks with rich PRDs containing architectural context + MCP tool instructions
3. **Codex agents** run those tasks in parallel, each filling one spec directory using the same MCP tools

The result: every spec file contains real code examples, actual patterns, and project-specific anti-patterns — not placeholder text.

## Prerequisites

| Tool                                                    | Purpose                                                 | Required |
| ------------------------------------------------------- | ------------------------------------------------------- | -------- |
| [Trellis](https://github.com/mindfold-ai/Trellis)       | Workflow framework with `.trellis/spec/` structure      | Yes      |
| [GitNexus](https://github.com/abhigyanpatwari/GitNexus) | Code → knowledge graph (Tree-sitter + KuzuDB)           | Yes      |
| [ABCoder](https://github.com/cloudwego/abcoder)         | Code → UniAST (ts-morph for TS, tree-sitter for others) | Yes      |
| [Codex CLI](https://github.com/openai/codex)            | Parallel task execution agent                           | Yes      |

## Install

```bash theme={null}
npx skills add mindfold-ai/marketplace --skill cc-codex-spec-bootstrap
```

Or install all available skills:

```bash theme={null}
npx skills add mindfold-ai/marketplace
```

Options:

| Flag             | Description                            |
| ---------------- | -------------------------------------- |
| `-g`             | Install globally (`~/.claude/skills/`) |
| `-a claude-code` | Target a specific agent                |
| `-y`             | Non-interactive mode                   |

## Verify Installation

Check if the skill is available:

```
What skills do you have access to?
```

Claude should list `cc-codex-spec-bootstrap` in the response.

## Usage

After installation, tell AI to bootstrap your specs:

```
Bootstrap coding specs for this project using Codex
```

```
Set up Trellis spec files with code intelligence
```

```
Run the CC + Codex spec pipeline
```

## How It Works

### Phase 1 — Analyze

Claude Code indexes the repo with GitNexus (knowledge graph) and ABCoder (AST), then maps the architecture: package boundaries, module clusters, key patterns, and cross-package data flows.

### Phase 2 — Plan

Claude Code creates one Trellis task per (package, layer) combination. Each task PRD contains the architectural context from Phase 1 plus MCP tool instructions so the Codex agent can independently explore the codebase.

### Phase 3 — Execute

Codex agents run all tasks in parallel. Each agent reads its PRD, uses GitNexus + ABCoder MCP tools to analyze the relevant code, and fills the spec files with real examples and patterns.

## What's Included

| File                      | Contents                                                             |
| ------------------------- | -------------------------------------------------------------------- |
| `SKILL.md`                | Full pipeline instructions (3 phases, checklists, PRD templates)     |
| `references/mcp-setup.md` | Detailed GitNexus + ABCoder MCP installation and configuration guide |
