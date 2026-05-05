> ## Documentation Index
> Fetch the complete documentation index at: https://docs.trytrellis.app/llms.txt
> Use this file to discover all available pages before exploring further.

# trellis-meta

> The essential skill for customizing Trellis

The official meta-skill for understanding and customizing Trellis. Current Trellis projects get this skill automatically from `trellis init`, so AI can help you:

* Add specialized agents for your workflow
* Change how context gets injected
* Add project-specific commands
* Adapt local `.trellis/` and platform files to your project

## Install

Works with all Trellis platform skill roots: Claude Code, Cursor, OpenCode, Codex, Kilo, Kiro, Gemini CLI, Antigravity, Windsurf, Qoder, CodeBuddy, GitHub Copilot, Factory Droid, and Pi Agent.

For Trellis-managed projects, initialize or update the platform you use:

```bash theme={null}
trellis init --claude
trellis init --codex
trellis update
```

`trellis init` writes `trellis-meta` into the selected platform's skill directory and `trellis update` keeps it hash-tracked with the rest of the built-in templates.

For non-Trellis projects or older Trellis installs, use the marketplace compatibility path:

```bash theme={null}
npx skills add mindfold-ai/marketplace --skill trellis-meta
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

Your AI tool should list `trellis-meta` in the response.

## Usage

After installation, tell AI what you want:

```
I want to add a deploy agent to handle deployment workflow
```

```
Help me modify the check hook to add a custom verification command
```

```
I want to add a new workflow phase called review
```

AI will automatically use the skill's documentation and give you the correct modification steps.

## What's Included

| Directory             | Contents                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `local-architecture/` | How local `.trellis/` workflow, tasks, specs, workspace, scripts, and context injection fit together                          |
| `platform-files/`     | How platform settings, hooks, agents, skills, commands, prompts, and workflows connect to Trellis                             |
| `customize-local/`    | How to modify generated local files for workflow, task lifecycle, context loading, hooks, agents, skills, commands, and specs |
