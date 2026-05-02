# AgentOS Shelf 与 Trellis 对照路线参考

日期：2026-05-02

本文记录当前 AgentOS Shelf CLI 对照 Trellis 已经实现的能力、暂未覆盖的差异，以及后续适合扩展的方向。它用于后续产品调整、技术取舍和 README 更新时作为参考。

## 当前定位

本项目已经不再只是简单的 AgentOS 文件注入脚手架，而是一个轻量版的 Shelf 风格 Agent 工作区 CLI。

当前方向是吸收 Trellis 的文件化上下文、任务流、项目记忆和多工具投影思想，但不完整复刻 Trellis 的多平台、重型迁移和复杂 hook 系统。

一句话定位：

> AgentOS Shelf CLI 是一个把现有项目初始化为 Shelf 风格 Agent 工作区的轻量工具，让 Codex、Claude Code 和未来更多 AI coding 工具共享同一套项目记忆。

## 已对照实现的能力

| Trellis 思路 | 当前项目实现情况 |
|---|---|
| 统一项目记忆源 | 已实现 `.shelf/` 作为统一源目录 |
| 工具投影 | 已支持从 `.shelf/` 投影到 Codex、Claude Code |
| 薄入口规则 | 已实现根目录 `AGENTS.md` / `CLAUDE.md` 作为薄入口 |
| Agent 工作流技能 | 已迁移并改造为 `agentos-*` skills |
| Research / Implement / Check agents | 已支持 `.shelf/agents` 投影到 `.codex/agents` / `.claude/agents` |
| 初始化面板 | 已支持 `agentos-cli shelf init` 交互选择 Codex / Claude 和 Git 模式 |
| 安全同步 | 已支持 `shelf sync`，避免覆盖用户修改 |
| 安全更新 | 已支持 `shelf update`、备份、跳过用户数据、`update.skip` |
| 健康检查 | 已支持 `shelf doctor` 检查 Shelf、工具投影、Python 环境 |
| 开发者身份 | 已支持 `shelf developer init <name>` |
| 工作区上下文 | 已支持 `shelf workspace context` / `shelf workspace add-session` |
| 任务流 | 已支持 `shelf task ...` 透传 `.shelf/scripts/task.py` |
| Bootstrap 任务 | 已生成 `.shelf/tasks/00-bootstrap-guidelines/` |
| Monorepo spec | 已支持 `shelf spec scaffold` 为 workspace package 生成 spec |
| skills 导入 | 已支持 `shelf skills import` |
| npm 分发 | 已整理 `package.json files`，包含 README、模板和 logo 资源 |

## 与 Trellis 的主要差异

当前项目是轻量 CLI，Trellis 是更完整的平台化系统。

尚未完整覆盖的能力包括：

- 多平台支持目前只有 Codex / Claude Code，还没有扩展到 Cursor、Gemini、Windsurf 等更多工具。
- Claude hook 目前偏提醒式，没有完整实现任务和 spec 的自动上下文注入。
- 还没有 worktree orchestration，不能自动为每个任务创建隔离开发目录。
- 迁移系统保持轻量，目前是 `update-manifest`、backup、protected paths 和 `update.skip`，不是 Trellis 式完整 migration engine。
- 还没有框架级能力包，例如 Vue、React、Rails、Node backend 专项 spec pack。
- session journal 目前主要通过显式命令写入，没有自动 finish hook。
- 任务系统仍依赖 `.shelf/scripts/` 下的 Python 脚本，Node 侧主要负责包装和透传。

这些差异不全是缺陷。当前产品策略是先让 Codex / Claude 双平台的 Shelf 基础稳定，再按真实使用反馈逐步扩展。

## 下一步可扩展方向

### 1. 完善 README 和展示层

README 已经改成中文结构化说明，但 logo 图片仍需要继续检查显示效果。若 GitHub 上图片和标题间距过大，通常是图片本身存在透明留白，应优先裁剪图片透明边距。

建议动作：

- 裁剪 `docs/assets/shelf-logo.png` 的透明边距。
- 保持 README 顶部结构简洁。
- 确认 npm 包内包含 README 和 logo 资源。

### 2. 增强 Bootstrap 规范案例

`.shelf/tasks/00-bootstrap-guidelines/` 是用户初始化后最先看到的任务，适合作为“如何把真实项目规范沉淀进 Shelf”的示范。

建议动作：

- 提供中文 Vue 项目规范案例。
- 补充 frontend spec、API 请求规范、组件规范、测试规范示例。
- 说明哪些内容应进入 `.shelf/spec/`，哪些内容应留在任务目录。

### 3. 加强上下文注入

当前 Codex 侧有 pull-based prelude，Claude 侧有轻量提醒 hook。后续可以逐步增强 agent 进入任务时读取上下文的稳定性。

建议动作：

- 明确当前 task、spec、workspace context 的读取顺序。
- 为 Codex / Claude 分别整理平台适配差异。
- 如果 Claude 实测需要更强能力，再加入 curated context injection。

### 4. 增加框架能力包

当前 `--stack` 主要是 `core`。后续可以为常见技术栈提供更贴近真实项目的 spec 模板。

可选方向：

- `--stack vue`
- `--stack node-api`
- `--stack fullstack`
- `--stack react`

优先建议从 Vue 开始，因为当前本地测试项目就是 Vue 项目。

### 5. 扩展更多 AI 工具平台

Codex / Claude 稳定后，可以选择一个新平台扩展，避免一次性引入过多平台复杂度。

候选方向：

- Cursor
- Gemini CLI
- Windsurf

扩展前应先确认平台的规则文件、skills/agents 支持方式、hook 能力和安全更新策略。

### 6. 增强任务生命周期命令

当前 `shelf task` 是透传 Python 脚本。为了降低用户理解成本，可以在 Node CLI 层增加更明确的子命令。

候选命令：

```bash
agentos-cli shelf task create
agentos-cli shelf task start
agentos-cli shelf task current
agentos-cli shelf task finish
```

目标是让普通用户少记透传参数，同时保持 Python 任务脚本作为底层实现。

### 7. 加入 worktree 模式

当任务生命周期更稳定后，可以考虑加入 Trellis 风格的隔离工作目录能力。

候选命令：

```bash
agentos-cli shelf task worktree
```

目标是为每个任务创建独立分支和目录，支持并行开发、降低主工作区污染。

## 推荐优先级

短期优先：

1. 修正 README 视觉问题。
2. 完善 `00-bootstrap-guidelines` 中文案例。
3. 补充 README 中对命令意义和测试方式的说明。

中期优先：

1. 增强 Codex / Claude 的上下文读取稳定性。
2. 增加 Vue stack spec 模板。
3. 优化 `shelf task` 的 Node 子命令体验。

长期优先：

1. 扩展第三个 AI 工具平台。
2. 加入 worktree orchestration。
3. 在真实 schema 变化出现后，再升级 migration engine。

## 结论

当前阶段可以认为：Shelf 核心骨架已经完成，Codex + Claude 双平台 MVP 已经跑通。

下一阶段重点不是继续堆功能，而是把真实项目使用体验打磨顺，包括 README 展示、初始化后的规范案例、上下文读取稳定性和任务命令易用性。
