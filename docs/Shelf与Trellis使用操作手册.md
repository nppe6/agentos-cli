# Shelf 与 Trellis 使用操作手册

日期：2026-05-05

本文说明两个项目的真实使用方式：

- `.tmp/Trellis-main` / `.tmp/trellis-docs-cache` 对照的开源项目 Trellis 应该怎么用。
- 当前项目 `agentos-cli` 提供的 AgentOS Shelf CLI 应该怎么在 Vue 等前端项目中测试和使用。

重点结论：

- Trellis 和 Shelf 都不是 Vue 插件，也不会改变 Vue 运行时代码。
- 它们的作用是给已有项目注入一套 AI 工作流文件，让 AI agent 可以读取稳定的项目规范、任务上下文和工作记忆。
- 真实开发流程应该优先走 skill / workflow，而不是让用户手动记一串底层 `task.py` 命令。
- `task.py create/start/archive` 和 `agentos-cli shelf task ...` 是底层执行工具，主要由 skill / workflow 驱动；排查问题时才需要手动使用。

---

## 1. 两个项目分别是什么

### 1.1 Trellis

Trellis 是对照的完整开源项目。核心目录是：

```text
.trellis/
```

它把 AI 开发过程拆成：

```text
.trellis/spec/       项目规范
.trellis/tasks/      任务上下文
.trellis/workspace/  开发者 journal 和工作记忆
.trellis/workflow.md 工作流
.trellis/scripts/    Python 自动化脚本
```

Trellis 会把同一套 `.trellis/` 投影到多个 AI coding 平台，例如 Claude Code、Cursor、OpenCode、Codex、Gemini、Qoder、Copilot、Droid、Pi Agent 等。

Trellis 0.5 文档明确强调：它是 **skill-first**。用户日常不需要记很多阶段命令，AI 会根据 workflow、skills、hooks 和当前任务状态推进。

### 1.2 AgentOS Shelf CLI

当前项目 `agentos-cli` 是一个轻量 Shelf 实现。核心目录是：

```text
.shelf/
```

它参考 Trellis 的核心模型，但当前产品范围更小：

- 支持 Codex 和 Claude Code。
- 使用 `.shelf/` 作为统一源。
- 从 `.shelf/` 生成 Codex / Claude 可读的投影文件。
- 保留任务、spec、workspace、skills、agents、sync、update、doctor 等基础能力。
- 不完整复刻 Trellis 的 14 平台、完整 hook 矩阵、worktree orchestration 和 migration engine。

对应关系：

```text
Trellis: .trellis/spec/       Shelf: .shelf/spec/
Trellis: .trellis/tasks/      Shelf: .shelf/tasks/
Trellis: .trellis/workspace/  Shelf: .shelf/workspace/
Trellis: trellis-* skills     Shelf: shelf-* skills
Trellis: trellis-* agents     Shelf: shelf-* agents
```

---

## 2. Trellis 开源项目使用方式

### 2.1 安装

```powershell
npm install -g @mindfoldhq/trellis@rc
```

要求：

- Node.js 18+
- Python 3.9+
- Windows / macOS / Linux 都支持

### 2.2 在 Vue 项目中初始化

进入你的 Vue 项目：

```powershell
cd D:\work\your-vue-project
```

初始化 Codex 平台：

```powershell
trellis init -u XiaoSir --codex
```

初始化多个平台：

```powershell
trellis init -u XiaoSir --claude --cursor --opencode --codex
```

`-u XiaoSir` 会写入当前机器的开发者身份，并创建：

```text
.trellis/workspace/XiaoSir/
```

### 2.3 Trellis 初始化后生成什么

核心目录：

```text
.trellis/
```

Codex 场景通常会有：

```text
AGENTS.md
.codex/
.agents/skills/
```

Claude 场景通常会有：

```text
CLAUDE.md
.claude/
```

不同平台的目录会不同，但核心 `.trellis/` 是统一源。

### 2.4 Codex hooks 开启方式

Trellis 文档说明：Codex hooks 是实验能力，需要在用户级 Codex 配置中开启：

```toml
[features]
codex_hooks = true
```

通常位置：

```text
~/.codex/config.toml
```

没有开启时，Codex 仍会读取 `AGENTS.md` 作为 prelude，但不会执行 `.codex/hooks.json` 里的 hook。

### 2.5 Trellis 真实开始一个需求

Trellis 日常用法不是让用户手动执行一串脚本，而是在 AI 会话里直接描述任务：

```text
我要在 Vue 项目里新增用户设置页面，请按 Trellis 工作流处理。
```

AI 应该按 `.trellis/workflow.md` 推进：

```text
Phase 1 Plan
1. 创建任务目录
2. 触发 trellis-brainstorm
3. 边沟通边写 .trellis/tasks/<task>/prd.md
4. 必要时派发 trellis-research
5. 填写 implement.jsonl / check.jsonl
6. 执行 task.py start，进入 in_progress

Phase 2 Execute
7. 派发 trellis-implement 写代码
8. 派发 trellis-check 检查并自修复

Phase 3 Finish
9. 运行 trellis-update-spec，把新规则写回 .trellis/spec/
10. AI 整理提交计划，用户确认后提交
11. 用户运行 /trellis:finish-work 归档任务和记录 journal
```

### 2.6 continue 和 finish-work

如果 AI 停住了，或你想让它继续当前任务：

```text
/trellis:continue
```

`continue` 会读取当前 task 的状态和 workflow，判断下一步该做什么。

结束工作时：

```text
/trellis:finish-work
```

注意：

- `/trellis:finish-work` 不是业务代码提交命令。
- 业务代码应该已经在 Phase 3.4 由 AI 给出 commit plan，用户确认后提交。
- `finish-work` 负责归档任务和记录 session journal。
- 如果工作区还有未提交业务代码，`finish-work` 会拒绝继续。

### 2.7 Trellis 底层任务命令

这些是底层脚本，主要由 workflow / skill 调用。排查问题时可以手动使用：

```powershell
python .\.trellis\scripts\task.py list
python .\.trellis\scripts\task.py current --source
python .\.trellis\scripts\get_context.py
python .\.trellis\scripts\task.py validate <task-dir>
python .\.trellis\scripts\task.py list-context <task-dir>
```

不要把这些当作日常真实需求的主入口。

---

## 3. AgentOS Shelf CLI 使用方式

### 3.1 安装当前 CLI

在本项目目录：

```powershell
cd E:\MergeProject\agent\agentos-cli
npm install
npm link
```

验证：

```powershell
agentos-cli --version
agentos-cli shelf --help
```

如果 PowerShell 拦截脚本执行，可以使用：

```powershell
agentos-cli.cmd shelf --help
```

### 3.2 在 Vue 项目中初始化 Shelf

进入你的 Vue 项目：

```powershell
cd D:\work\your-vue-project
```

团队共享模式：

```powershell
agentos-cli shelf init --tools codex,claude --git-mode track -u XiaoSir
```

个人试用模式：

```powershell
agentos-cli shelf init --tools codex --git-mode ignore -u XiaoSir
```

检查初始化结果：

```powershell
agentos-cli shelf doctor
agentos-cli shelf workspace context
agentos-cli shelf task list
```

### 3.3 Shelf 初始化后生成什么

通用核心目录：

```text
.shelf/
```

Codex + Claude 初始化后通常会有：

```text
.shelf/
AGENTS.md
CLAUDE.md
.codex/
.claude/
.agents/skills/
```

Codex 投影实际包括：

```text
AGENTS.md
.agents/skills/shelf-*/
.codex/agents/shelf-*.toml
.codex/config.toml
.codex/hooks.json
.codex/hooks/*.py
.codex/prompts/shelf-continue.md
.codex/prompts/shelf-finish-work.md
```

Claude 投影实际包括：

```text
CLAUDE.md
.claude/skills/shelf-*/
.claude/agents/shelf-*.md
.claude/commands/shelf/continue.md
.claude/commands/shelf/finish-work.md
.claude/settings.json
.claude/hooks/shelf-session-start.py
```

### 3.4 Shelf 的真实需求入口

真实开发时，不建议手动先跑：

```text
task create -> task start -> 自己写 prd -> 自己实现
```

正确方式是在 AI 会话里说：

```text
请使用 shelf-brainstorm 开始一个新需求：在 Vue 项目里新增用户设置页面。
```

或者：

```text
请按 Shelf 工作流处理这个需求：在 Vue 项目里新增用户设置页面。
```

AI 应该按 `.shelf/workflow.md` 推进：

```text
Phase 1 Plan
1. task.py create 创建任务，状态为 planning
2. 加载 shelf-brainstorm
3. 写/更新 .shelf/tasks/<task>/prd.md
4. 必要时派发 shelf-research，研究结果写入任务目录
5. 配置 implement.jsonl / check.jsonl
6. task.py start <task-dir>，进入 in_progress

Phase 2 Execute
7. 派发 shelf-implement
8. 派发 shelf-check

Phase 3 Finish
9. 运行 shelf-update-spec
10. AI 提交代码前给出 commit plan
11. 运行 /shelf:finish-work 或对应 prompt / command，归档任务并记录 journal
```

### 3.5 关键注意：create 后不要马上 start

`task.py create` 只是创建任务目录，并让任务进入 planning 阶段。

`task.py start` 应该等这些内容准备好后再执行：

```text
.shelf/tasks/<task>/prd.md
.shelf/tasks/<task>/implement.jsonl
.shelf/tasks/<task>/check.jsonl
```

如果 create 后马上 start，就可能让 AI 跳过 Plan 阶段，直接进入实现阶段。

正确顺序：

```text
create
-> brainstorm
-> prd.md
-> research
-> curate implement.jsonl / check.jsonl
-> start
-> implement
-> check
-> update-spec
-> commit
-> finish-work
```

---

## 4. Vue 项目第一次应该做什么

Trellis 和 Shelf 都会生成 spec 模板。第一次真正使用前，应先把模板补成当前 Vue 项目的真实规范。

Shelf：

```text
.shelf/tasks/00-bootstrap-guidelines/
.shelf/spec/frontend/
```

Trellis：

```text
.trellis/tasks/00-bootstrap-guidelines/
.trellis/spec/frontend/
```

可以让 AI 做：

```text
请按 bootstrap-guidelines 任务，扫描当前 Vue 项目，把真实前端规范补充到 .shelf/spec/frontend/。
重点包括目录结构、Vue 组件规范、Pinia 状态管理、API 请求方式、TypeScript 规则、测试和 lint 命令。
```

如果使用 Trellis，把 `.shelf` 改成 `.trellis`。

### 4.1 Vue spec 建议内容

建议至少补这些文件：

```text
.shelf/spec/frontend/directory-structure.md
.shelf/spec/frontend/component-guidelines.md
.shelf/spec/frontend/state-management.md
.shelf/spec/frontend/type-safety.md
.shelf/spec/frontend/quality-guidelines.md
```

可以记录：

```markdown
# Vue Frontend Guidelines

- Framework: Vue 3 + Vite
- Language: TypeScript
- Components use `<script setup lang="ts">`
- Reusable composables live in `src/composables/`
- Route pages live in `src/views/` or `src/pages/`
- Shared UI components live in `src/components/`
- API clients live in `src/api/`
- Pinia stores live in `src/stores/`
- Prefer typed props and emits with `defineProps` / `defineEmits`
- Do not put business API calls directly inside low-level UI components
```

不要只写抽象口号。好的 spec 应该有：

- 真实目录路径
- 真实命令
- 真实代码示例
- 什么时候应该这样做
- 什么时候不要这样做
- lint / test / typecheck 命令

---

## 5. Skill、Agent、Command 的边界

### 5.1 Skill

Skill 是 AI 自动或手动触发的工作流能力。

Trellis 常见 skill：

```text
trellis-brainstorm
trellis-before-dev
trellis-check
trellis-update-spec
trellis-break-loop
```

Shelf 常见 skill：

```text
shelf-brainstorm
shelf-before-dev
shelf-check
shelf-update-spec
shelf-break-loop
shelf-continue
shelf-finish-work
```

真实需求开始、结束、更新文档，应该主要走 skill / workflow。

### 5.2 Agent

Agent 是专门执行某类工作的子代理。

Trellis：

```text
trellis-research
trellis-implement
trellis-check
```

Shelf：

```text
shelf-research
shelf-implement
shelf-check
```

职责：

- research：读代码、读文档、产出 research 文件
- implement：读取 PRD 和 `implement.jsonl`，写代码，不提交
- check：读取 PRD 和 `check.jsonl`，检查 diff，自修复，跑验证

### 5.3 Command / Prompt

Command 是用户在 AI 工具中显式调用的入口，通常用于会话边界。

Trellis：

```text
/trellis:continue
/trellis:finish-work
```

Shelf 在 Claude 中：

```text
/shelf:continue
/shelf:finish-work
```

Shelf 在 Codex 中投影为 prompt 文件：

```text
.codex/prompts/shelf-continue.md
.codex/prompts/shelf-finish-work.md
```

如果当前工具没有 slash command 入口，也可以直接对 AI 说：

```text
请按 shelf-continue 继续当前任务。
```

或：

```text
请按 shelf-finish-work 收尾当前任务。
```

---

## 6. 日常使用速查

### 6.1 Trellis 日常

初始化：

```powershell
trellis init -u XiaoSir --codex
```

开始任务：

```text
我要新增用户设置页面，请按 Trellis 工作流处理。
```

继续任务：

```text
/trellis:continue
```

结束任务：

```text
/trellis:finish-work
```

排查底层状态：

```powershell
python .\.trellis\scripts\task.py list
python .\.trellis\scripts\task.py current --source
python .\.trellis\scripts\get_context.py
```

### 6.2 Shelf 日常

初始化：

```powershell
agentos-cli shelf init --tools codex,claude --git-mode track -u XiaoSir
```

开始任务：

```text
请使用 shelf-brainstorm 开始一个新需求：新增用户设置页面。
```

继续任务：

```text
请按 shelf-continue 继续当前任务。
```

结束任务：

```text
请按 shelf-finish-work 收尾当前任务。
```

排查底层状态：

```powershell
agentos-cli shelf doctor
agentos-cli shelf task list
agentos-cli shelf task current --source
agentos-cli shelf workspace context
```

同步投影：

```powershell
agentos-cli shelf sync --dry-run
agentos-cli shelf sync
```

保守更新：

```powershell
agentos-cli shelf update --dry-run
agentos-cli shelf update
```

---

## 7. 常见误区

### 7.1 误区：真实需求一开始就手动 task start

不建议。

`start` 是进入实现阶段，不是创建需求的第一步。应该先通过 brainstorm 写 PRD 和配置 JSONL。

### 7.2 误区：finish-work 会提交业务代码

不对。

业务代码提交应该发生在 Phase 3.4。`finish-work` 负责归档和 journal。

### 7.3 误区：spec 只是普通说明文档

不对。

spec 应该是 AI 写代码时能执行的项目契约。它应该具体、可测试、带路径、命令和例子。

### 7.4 误区：Shelf 已经等同 Trellis

不对。

Shelf 当前是轻量实现，主要支持 Codex / Claude。Trellis 是更完整的多平台系统。

### 7.5 误区：Vue 项目需要安装运行时依赖

不需要。

Shelf / Trellis 不进入 Vue runtime。它们只是注入项目级 AI 工作流文件。

---

## 8. 推荐的 Vue 测试路径

如果要测试当前 Shelf 项目是否可用，建议按这个顺序：

```text
1. 准备一个真实 Vue 项目
2. agentos-cli shelf init --tools codex,claude --git-mode track -u XiaoSir
3. agentos-cli shelf doctor
4. 让 AI 执行 00-bootstrap-guidelines
5. 把 .shelf/spec/frontend/ 补成真实 Vue 规范
6. 让 AI 使用 shelf-brainstorm 开始一个小需求
7. 确认 prd.md、implement.jsonl、check.jsonl 是否生成和被正确填写
8. 让 AI 进入 shelf-implement
9. 让 AI 进入 shelf-check
10. 让 AI 执行 shelf-update-spec
11. 完成提交
12. 执行 shelf-finish-work
```

对照 Trellis 时，把命令替换为：

```text
trellis init -u XiaoSir --codex
.trellis/
trellis-* skills
/trellis:continue
/trellis:finish-work
```

这样可以清楚比较：

- Trellis 的完整多平台体验。
- Shelf 当前 Codex / Claude 双平台轻量体验。
- 两者在 task、spec、workspace、skill-first 工作流上的一致性。

