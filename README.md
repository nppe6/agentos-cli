<p align="center">
  <img src="./docs/assets/shelf-logo.png" alt="AgentOS Shelf logo" width="360">
</p>

<h5 align="center">AgentOS Shelf CLI</h5>

<p align="center">
  将项目初始化为 Shelf 风格的 AgentOS 工作区，让 Codex、Claude Code 等多个 AI coding 工具共享同一套项目记忆。
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/agentos-cli">Npm</a>
  ·
  <a href="https://github.com/nppe6/agent-cli">GitHub</a>
  ·
  <a href="#快速开始">快速开始</a>
  ·
  <a href="#命令参考">命令参考</a>
</p>

<p align="center">
  <img alt="Node 18 plus" src="https://img.shields.io/badge/node-18%2B-339933">
  <img alt="Codex supported" src="https://img.shields.io/badge/Codex-supported-111827">
  <img alt="Claude Code supported" src="https://img.shields.io/badge/Claude%20Code-supported-6b46c1">
</p>

## 什么是 AgentOS Shelf

AgentOS Shelf CLI 是一个面向已有项目的轻量工作流注入工具。它会在项目中创建 `.shelf/` 统一源目录，并从这个目录生成 Codex、Claude Code 等工具可读取的投影文件。

它的核心目标不是替代你的框架、构建工具或团队规范，而是把 AI agent 工作时需要反复读取的上下文沉淀为项目文件：

- 项目规范放在 `.shelf/spec/`
- 任务生命周期放在 `.shelf/tasks/`
- 开发者工作记忆放在 `.shelf/workspace/`
- workflow skills 放在 `.shelf/skills/`
- research / implement / check agent 定义放在 `.shelf/agents/`
- 根目录只保留很薄的 `AGENTS.md` / `CLAUDE.md` 入口

## 为什么使用

AI coding 工具很擅长临时推理，但在真实项目里，经常缺少稳定、可复用、可审查的项目上下文。AgentOS Shelf 用文件系统补上这一层。

使用它之后：

- 不需要每次都向 AI 重复说明项目结构、代码风格、任务流程和注意事项。
- Codex 和 Claude Code 可以从同一份 `.shelf/` 源读取规则，减少工具之间的上下文漂移。
- 新任务、新成员和新 agent 都可以从 `.shelf/tasks/`、`.shelf/spec/`、`.shelf/workspace/` 接上项目状态。
- 生成文件和用户内容分层管理，`sync` / `update` 会尽量避免覆盖用户修改。
- 你可以先用最小 Shelf 工作流跑起来，再逐步补齐项目真实规范。

## 前置要求

- Node.js `>= 18`
- npm
- Python 3，且 `python` 或 `python3` 在 PATH 中
- 一个已有项目目录

Python 主要用于 `.shelf/scripts/` 下的任务、workspace 和 journal 脚本。没有 Python 时，`shelf init` 仍可完成，但 `shelf task`、`shelf developer`、`shelf workspace` 会提示环境缺失。

## 安装

本地开发链接：

```bash
npm install
npm link
```

验证：

```bash
agentos-cli --version
agentos-cli --help
```

如果 PowerShell 拦截脚本执行，可以改用：

```bash
agentos-cli.cmd --help
```

## 快速开始

进入你想增强的项目目录：

```bash
cd D:\work\your-project
agentos-cli shelf init
```

交互面板会询问：

- 要注入哪些工具：Codex、Claude Code
- Git 模式：提交到 Git，或追加到 `.gitignore` 作为个人临时增强

初始化完成后运行：

```bash
agentos-cli shelf doctor
agentos-cli shelf developer init Ada
agentos-cli shelf workspace context
agentos-cli shelf task list
```

一个健康的初始化项目通常会包含：

```text
.shelf/
AGENTS.md
CLAUDE.md
.codex/
.claude/
.agents/skills/
```

## 初始化后应该做什么

首次初始化会创建一个引导任务：

```text
.shelf/tasks/00-bootstrap-guidelines/
```

它的作用是提醒你把真实项目规范补进：

```text
.shelf/spec/backend/
.shelf/spec/frontend/
.shelf/spec/guides/
```

规范可以使用中文。建议保留路径、命令、代码符号为英文或原样，说明文字按团队习惯书写即可。

## 工作原理

AgentOS Shelf 使用“统一源 + 工具投影”的模型。

```text
.shelf/
├─ workflow.md
├─ config.yaml
├─ spec/
├─ tasks/
├─ workspace/
├─ skills/
├─ agents/
├─ scripts/
├─ rules/
└─ templates/
```

`.shelf/` 是共享源。CLI 会根据 manifest 和工具配置生成：

- Codex：`AGENTS.md`、`.codex/skills/`、`.codex/agents/`、`.agents/skills/`
- Claude Code：`CLAUDE.md`、`.claude/skills/`、`.claude/agents/`、`.claude/settings.json`、`.claude/hooks/`

根目录文件保持很薄，只负责指向 `.shelf/`。真正的 workflow、规范、任务和项目记忆都留在 Shelf 目录中。

## 核心概念

### Specs

`.shelf/spec/` 存放长期有效的项目规范。它应该描述当前代码库的真实约定，而不是理想化口号。

常见内容：

- 前端技术栈、目录结构、API 请求方式、状态管理
- 后端约定或“本仓库不包含后端”的说明
- 跨层复用、测试、错误处理和代码审查指南

### Tasks

`.shelf/tasks/` 存放任务级上下文。每个任务可以包含 PRD、实现记录、检查记录和状态信息。

`shelf task` 不在 Node 侧重写任务逻辑，而是透传给 `.shelf/scripts/task.py`。

### Workspace Memory

`.shelf/workspace/` 存放开发者本地工作记忆，例如 session journal。

```bash
agentos-cli shelf developer init Ada
agentos-cli shelf workspace context
agentos-cli shelf workspace add-session --title "Local test" --summary "Verified Shelf commands" --no-commit
```

### Tool Projections

Codex、Claude Code 读取的文件是投影结果。修改工作流源时，优先修改 `.shelf/`，再通过 `shelf sync` 或 `shelf update` 重新生成投影。

## 命令参考

```bash
agentos-cli shelf init [target]
agentos-cli shelf doctor [target]
agentos-cli shelf sync [target]
agentos-cli shelf update [target]
agentos-cli shelf developer init <name> [target]
agentos-cli shelf developer join <name> [target]
agentos-cli shelf task [args...]
agentos-cli shelf workspace context [target]
agentos-cli shelf workspace add-session [target]
agentos-cli shelf spec scaffold [target]
agentos-cli shelf skills import <source> [target]
```

### `shelf init`

向目标项目注入 AgentOS Shelf 工作流文件。

```bash
agentos-cli shelf init
agentos-cli shelf init --tools codex,claude --git-mode track
agentos-cli shelf init D:\work\your-project --tools codex --git-mode ignore --force
```

常用参数：

- `[target]`：目标目录，默认当前目录
- `-t, --target <path>`：显式指定目标目录
- `--stack <stack>`：能力包，当前支持 `core`
- `--tools <tools>`：逗号分隔的目标工具，当前支持 `codex`、`claude`
- `--git-mode <track|ignore>`：生成文件提交到 Git，或加入 `.gitignore`
- `-u, --user <name>`：指定开发者名称；不传时会优先读取 `git config user.name`
- `--skip-developer`：初始化时跳过开发者身份创建
- `-f, --force`：发现冲突时覆盖受管文件

不传 `--tools` 时会进入交互选择。

### `shelf doctor`

只读检查 AgentOS Shelf 安装状态。

```bash
agentos-cli shelf doctor
```

它会检查 `.shelf/manifest.json`、`.shelf/template-hashes.json`、workflow、skills、agents、runtime scripts、Python、工具投影文件，以及检测到的 workspace package 是否已有 package spec。

### `shelf sync`

从 `.shelf/` 重新生成已启用工具的投影文件。

```bash
agentos-cli shelf sync --dry-run
agentos-cli shelf sync --tools codex
```

`--dry-run` 会预览 `create`、`update`、`unchanged`、`user-modified`、`conflict` 等状态。实际同步会跳过用户修改和冲突文件。

### `shelf update`

保守更新已生成的工具投影，并在写入或删除前备份已有文件。

```bash
agentos-cli shelf update --dry-run
agentos-cli shelf update
agentos-cli shelf update --force
```

更新行为：

- 备份写入 `.shelf/backups/`
- 旧投影文件会在确认安全后删除
- `.shelf/spec/`、`.shelf/tasks/`、`.shelf/workspace/`、`.shelf/config.yaml` 等用户数据路径受保护
- `.shelf/update.skip` 可以冻结指定投影路径
- `.shelf/update-manifest.json` 会记录迁移、备份、删除、跳过写入和跳过删除

### `shelf developer`

初始化开发者身份，或为新成员生成 onboarding task。

```bash
agentos-cli shelf developer init Ada
agentos-cli shelf developer join Ada
```

`developer init` 会写入 `.shelf/.developer` 并创建 `.shelf/workspace/<name>/`。

`developer join` 会创建类似 `.shelf/tasks/00-join-ada/` 的轻量入门任务。

### `shelf task`

把参数透传给 `.shelf/scripts/task.py`。

```bash
agentos-cli shelf task list
agentos-cli shelf task create "Add login" --slug add-login
agentos-cli shelf task current --source
```

也可以直接运行：

```bash
python .shelf/scripts/task.py list
```

### `shelf workspace`

读取项目上下文或追加 session journal。

```bash
agentos-cli shelf workspace context
agentos-cli shelf workspace context --json
agentos-cli shelf workspace add-session --title "Improve update" --summary "Verified update safety" --no-commit
```

`context` 会输出当前 developer、git 状态、最近提交、活跃任务、journal 文件和 spec layer。

`add-session` 会写入当前 developer 的 `.shelf/workspace/` journal。默认会按 `.shelf/config.yaml` 的 `session_commit_message` 自动提交 workspace/task 变化；需要保留未提交状态时使用 `--no-commit`。

### `shelf spec scaffold`

为 monorepo workspace package 生成 package spec 骨架。

```bash
agentos-cli shelf spec scaffold --dry-run
agentos-cli shelf spec scaffold
agentos-cli shelf spec scaffold --package web=packages/web,api=packages/api
```

默认读取 `package.json` workspaces 和 `pnpm-workspace.yaml`，生成：

```text
.shelf/spec/packages/<package-id>/README.md
.shelf/spec/packages/<package-id>/architecture.md
.shelf/spec/packages/<package-id>/quality.md
```

单包项目不会自动生成 package spec。可以用 `--package web=.` 手动测试。

### `shelf skills import`

把已有项目级 skills 导入目标项目。

```bash
agentos-cli shelf skills import D:\old-project\.claude\skills
agentos-cli shelf skills import D:\skills\agentos-brainstorm --mode overwrite
agentos-cli shelf skills import D:\shared-skills --to codex
```

参数：

- `<source>`：单个 skill 目录，或包含多个 skill 子目录的根目录
- `[target]` / `-t, --target <path>`：目标项目目录，默认当前目录
- `--mode <skip|overwrite>`：导入模式，默认交互选择
- `--to <auto|shelf|agent-os|codex|claude>`：导入目标，默认 `auto`
- `-f, --force`：等价于 `--mode overwrite`

`auto` 模式会优先导入 `.shelf/skills`。单工具旧项目没有 `.shelf/` 时，会导入已存在的 `.codex/skills` 或 `.claude/skills`。

## Git 模式

初始化时可以选择：

- `track`：把 AI 工作流文件提交到 Git，适合团队共享规则。
- `ignore`：把生成文件追加到 `.gitignore`，适合个人临时增强。

如果你不确定，团队项目通常优先选择 `track`。个人试用或不想影响仓库历史时选择 `ignore`。

## 与 Trellis 的关系

AgentOS Shelf 参考了 Trellis 的一些耐用设计：文件化上下文、任务驱动工作流、轻量规则投影、可复用 skills、项目记忆和安全更新。

本项目不会完整复制 Trellis 的所有能力。当前方向是先把 Codex / Claude Code 双平台的轻量 Shelf 基础跑稳，再谨慎扩展更多平台、hooks、迁移和框架能力包。

更详细的已实现能力与后续路线参考见 [`docs/shelf-trellis-roadmap-reference.md`](docs/shelf-trellis-roadmap-reference.md)。

## 开发验证

```bash
npm test
npm pack --dry-run
```

本地全局测试：

```bash
npm install
npm link
agentos-cli --version
agentos-cli shelf --help
```

## FAQ

### 可以用中文写 `.shelf/spec/` 吗？

可以。`.shelf/spec/`、`.shelf/tasks/`、`.shelf/workspace/` 是给人和 AI 共同读取的项目记忆，中文完全可用。建议路径、命令、代码符号保持原样。

### `agent doctor` 提示 Python 缺失怎么办？

安装 Python 3，并确保 `python` 或 `python3` 在 PATH 中。没有 Python 时，`agent init` 可以完成，但 task、workspace 和 developer 命令不能运行。

### 单包项目执行 `shelf spec scaffold` 显示 0 packages 正常吗？

正常。自动检测只识别 `package.json` workspaces 或 `pnpm-workspace.yaml`。单包项目可以直接维护 `.shelf/spec/frontend/`，也可以用 `--package web=.` 手动生成 package spec。

### 应该直接修改 `.codex/` 或 `.claude/` 吗？

一般不建议。优先修改 `.shelf/`，然后运行 `shelf sync` 或 `shelf update` 生成投影。这样 Codex 和 Claude Code 能共享同一套源。

## 许可证

ISC
