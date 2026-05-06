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

## 为什么用 Shelf？

| 能力 | 带来的变化 |
| --- | --- |
| **统一项目记忆** | 把规范写进 `.shelf/spec/` 后，Codex 和 Claude Code 可以读取同一套项目约定，不用每次重新解释。 |
| **任务驱动工作流** | PRD、实现上下文、检查上下文和任务状态放进 `.shelf/tasks/`，AI 开发过程更容易续接和审查。 |
| **动态 Bootstrap** | `shelf init` 会检测 frontend / backend / fullstack / monorepo，并生成匹配当前项目的首次 spec bootstrap 任务。 |
| **持续沉淀 Spec** | 任务完成后用 `shelf-update-spec` 把新约定、坑、接口契约、测试要求和架构决策写回 `.shelf/spec/`。 |
| **开发者 Workspace** | `.shelf/workspace/` 保存个人 journal 和会话脉络，让新会话不是从空白开始。 |
| **双平台投影** | `.shelf/` 是共享源，CLI 会为 Codex 和 Claude Code 生成各自需要的入口、skills、agents 和 hooks。 |

## 前置要求

- **Node.js** >= 18
- **npm**
- **Python** 3（`shelf task`、`shelf developer`、`shelf workspace` 脚本需要）

如果 PowerShell 拦截脚本执行，可以改用 `agentos-cli.cmd --help`。

## 快速开始

```bash
# 1. 本地开发安装
npm install
npm link

# 2. 在仓库里初始化
agentos-cli shelf init

# 3. 检查安装状态
agentos-cli shelf doctor
```

- 初始化时可选择 `codex`、`claude`，以及 Git 模式 `track` 或 `ignore`。
- 也可以直接指定：`agentos-cli shelf init --tools codex,claude --git-mode track`。
- `track` 适合团队共享工作流文件；`ignore` 适合个人临时增强。

## 使用场景

### 把项目知识一次性交给 AI

初始化后让 AI 执行 `.shelf/tasks/00-bootstrap-guidelines/`。Shelf 会像 Trellis 一样按项目类型动态生成 bootstrap PRD：frontend 写 `.shelf/spec/frontend/`，backend 写 `.shelf/spec/backend/`，fullstack/未知同时写两者，monorepo 写 `.shelf/spec/packages/<package-id>/`。

### 把项目历史变成可用记忆

`.shelf/tasks/` 保存任务 PRD、实现记录和检查上下文；`.shelf/workspace/` 保存开发者 journal。下一次会话可以从这些文件恢复任务脉络。

### 在 Codex 和 Claude Code 之间共享流程

优先维护 `.shelf/`，再运行 `shelf sync` 或 `shelf update` 重新生成投影。这样不同 AI coding 工具不会各自维护一份漂移的规则。

## 工作原理

Shelf 把核心工作流放在 `.shelf/` 里，再按启用的平台生成接入文件。

```text
.shelf/
├── spec/        # 项目规范、模式和指南
├── tasks/       # 任务 PRD、上下文文件和状态
├── workspace/   # Journal 和开发者级连续性
├── skills/      # 项目级 skills
├── agents/      # research / implement / check agent 定义
├── workflow.md  # 共享工作流规则
└── scripts/     # task、workspace、developer 脚本
```

Codex 会得到 `AGENTS.md`、`.codex/` 和 `.agents/skills/`；Claude Code 会得到 `CLAUDE.md`、`.claude/skills/`、`.claude/agents/`、`.claude/hooks/` 和 `.claude/settings.json`。

整体流程可以理解成四步：

1. 用 bootstrap 把真实项目约定写进 Spec。
2. 从 `.shelf/tasks/` 的 PRD 开始组织工作。
3. 让 agent 根据当前任务读取正确上下文。
4. 用检查、journal 和 `shelf-update-spec` 保证质量与连续性。

## 命令参考

```bash
agentos-cli shelf init [target]
agentos-cli shelf doctor [target]
agentos-cli shelf sync [target]
agentos-cli shelf update [target]
agentos-cli shelf developer init|join <name> [target]
agentos-cli shelf task [args...]
agentos-cli shelf workspace context|add-session [target]
agentos-cli shelf spec scaffold [target]
agentos-cli shelf skills import <source> [target]
```


## 常见问题

<details>
<summary><strong>它和 <code>AGENTS.md</code>、<code>CLAUDE.md</code> 有什么区别？</strong></summary>

这些入口文件仍然存在，但它们很薄。Shelf 在它们之外补上 `.shelf/spec/`、`.shelf/tasks/`、`.shelf/workspace/` 和工具投影，让项目记忆更结构化。

</details>

<details>
<summary><strong>是不是每个 Spec 都得手写？</strong></summary>

不需要。首次 bootstrap 可以让 AI 先根据已有文档和真实代码起草，再由团队收紧高信号规则。之后用 `shelf-update-spec` 持续沉淀。

</details>

<details>
<summary><strong>单包项目执行 <code>shelf spec scaffold</code> 显示 0 packages 正常吗？</strong></summary>

正常。自动检测只识别 workspace / monorepo。单包项目直接维护 `.shelf/spec/frontend/` 或 `.shelf/spec/backend/` 即可。

</details>

## 许可证

ISC
