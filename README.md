# agentos-cli

把现有项目初始化为 Shelf 风格的 AgentOS 工作区，并生成 Codex / Claude Code 可读取的投影文件。

## 适用场景

- 希望在已有项目中注入统一的 AI Agent 工作流。
- 希望以 `.shelf/` 作为 workflow、spec、task、workspace memory、agents、rules 和 skills 的统一源。
- 希望让 `AGENTS.md` 保持很薄，把真正的流程、技能和项目记忆放进 Shelf 目录。
- 希望同一套项目结构先复用到 Codex / Claude Code，后续再谨慎扩展到更多 AI coding 工具。
- 希望先落地基础工作流，后续再补框架能力包、团队协作规则和更完整的平台集成。

## 安装

```bash
npm install
npm link
```

全局安装后可使用：

```bash
agentos-cli -h
agentos-cli -v
```

如果 PowerShell 拦截脚本执行，可改用 `agentos-cli.cmd`。

## 命令

```bash
agentos-cli agent init [target]
agentos-cli agent developer init <name> [target]
agentos-cli agent developer join <name> [target]
agentos-cli agent task [args...]
agentos-cli agent doctor [target]
agentos-cli agent sync [target]
agentos-cli agent update [target]
agentos-cli agent spec scaffold [target]
agentos-cli agent skills import <source> [target]
```

## `agent init`

向目标项目注入 AgentOS Shelf 工作流文件。

```bash
agentos-cli agent init -t D:\work\easy\test --git-mode track
agentos-cli agent init -t D:\work\easy\test --stack core --tools codex,claude --git-mode track
agentos-cli agent init -t D:\work\easy\test --stack core --tools codex --git-mode ignore --force
```

参数：

- `[target]`：目标目录，默认当前目录。
- `-t, --target <path>`：显式指定目标目录。
- `--stack <stack>`：选择能力包，默认 `core`，当前仅支持 `core`。
- `--tools <tools>`：指定目标工具，逗号分隔，当前支持 `codex`、`claude`。
- `--git-mode <track|ignore>`：指定注入文件是否提交到 Git 或加入 `.gitignore`。
- `-f, --force`：发现冲突时直接覆盖受管文件。

未传 `--tools` 时，CLI 会交互选择目标工具。

生成内容：

- Codex：`AGENTS.md`、`.codex/skills/`、`.codex/agents/`
- Codex open skills：`.agents/skills/`
- Claude Code：`CLAUDE.md`、`.claude/skills/`、`.claude/agents/`、`.claude/settings.json`、`.claude/hooks/`
- 统一源：`.shelf/`

`.shelf/` 基础结构：

- `.shelf/workflow.md`：任务生命周期、阶段路由、skill / agent 使用规则。
- `.shelf/spec/`：项目规范、后端/前端/指南模板和可复用上下文。
- `.shelf/tasks/`：任务 PRD、实现上下文、检查上下文和任务状态。
- `.shelf/tasks/00-bootstrap-guidelines/`：首次初始化后用于补齐真实项目规范的引导任务。
- `.shelf/workspace/`：journal 等项目记忆。
- `.shelf/skills/`：项目级 workflow skills，使用 `agentos-*` 命名前缀。
- `.shelf/agents/`：research / implement / check agent 定义。
- `.shelf/scripts/`：任务状态、上下文加载、journal、developer 初始化等本地脚本。
- `.shelf/rules/`：生成 `AGENTS.md` 的薄规则入口。
- `.shelf/templates/`：平台投影模板。

说明：

- `.shelf/` 是共享源，`AGENTS.md`、`CLAUDE.md`、`.codex/`、`.claude/` 是由 CLI 生成的工具投影。
- `.agents/skills/` 是 Codex 兼容的开放 skill 投影，来源仍然是 `.shelf/skills/`。
- `AGENTS.md` 保持简洁，只指向 `.shelf/` 中的 workflow、spec、tasks、workspace、skills 和 agents。
- `CLAUDE.md` 会引用 `AGENTS.md` 的共享规则，再补充 Claude Code 专用约束。
- Codex 的 implement / check agents 会带 Shelf 上下文读取 prelude，适配 Codex 偏 pull-based 的工作方式。
- 当前版本不生成旧式 `scripts/sync-agent-os.ps1`，也不写入 `package.json` 的 `scripts.agent-os:sync`。
- 如果目标项目存在旧版 `scripts/sync-agent-os.ps1` 或 `scripts.agent-os:sync`，重新初始化时会作为旧受管内容清理。
- `track` 适合团队共享规则，`ignore` 更适合个人临时增强。
- 框架能力包和团队协作规则定义暂未启用，后续会在基础工作流稳定后补充。

## `agent developer init`

初始化当前开发者身份和 Shelf workspace memory。它是 `.shelf/scripts/init_developer.py` 的轻量 CLI 包装。

```bash
agentos-cli agent developer init Ada -t D:\work\easy\test
```

这一步适合在项目初始化后执行，用来创建或更新本地 developer 相关的 workspace 记录。

## `agent developer join`

为新开发者生成一个轻量 onboarding task，不自动改变项目状态。

```bash
agentos-cli agent developer join Ada -t D:\work\easy\test
```

生成目录形如 `.shelf/tasks/00-join-ada/`，用于引导新成员阅读 workflow、spec、tasks 和 workspace memory。

## `agent task`

把参数透传给目标项目中的 `.shelf/scripts/task.py`，用于操作 Shelf 任务生命周期。

```bash
agentos-cli agent task -t D:\work\easy\test list
agentos-cli agent task -t D:\work\easy\test create "Add login" --slug add-login
agentos-cli agent task -t D:\work\easy\test current --source
```

这个命令不在 Node 侧重写任务逻辑，只负责找到目标项目、检测 Python，并调用 Shelf 自带脚本。需要时也可以直接运行：

```bash
python .shelf/scripts/task.py list
```

## `agent doctor`

只读检查目标项目的 AgentOS Shelf 安装状态。

```bash
agentos-cli agent doctor -t D:\work\easy\test
```

检查内容包括 `.shelf/manifest.json`、`.shelf/template-hashes.json`、workflow、共享规则、skills、agents、核心 runtime scripts、Python 是否可用、manifest 中启用工具的投影文件，以及检测到的 workspace package 是否已有 `.shelf/spec/packages/<package-id>/README.md`。

## `agent sync`

从 `.shelf/` 重新生成已启用工具的投影文件。

```bash
agentos-cli agent sync -t D:\work\easy\test --dry-run
agentos-cli agent sync -t D:\work\easy\test --tools codex
```

`--dry-run` 会预览 `create`、`update`、`unchanged`、`user-modified`、`conflict` 等状态。实际同步会跳过用户修改和冲突文件，避免盲目覆盖。

## `agent update`

保守更新已生成的工具投影，并在写入或删除前备份已有投影文件。

```bash
agentos-cli agent update -t D:\work\easy\test --dry-run
agentos-cli agent update -t D:\work\easy\test
agentos-cli agent update -t D:\work\easy\test --force
```

默认遇到用户修改或冲突的投影文件会阻断。确认后可使用 `--force`。

更新行为：

- 备份会写入 `.shelf/backups/`。
- 本次不再生成的旧投影文件会被安全删除。
- `.shelf/spec/`、`.shelf/tasks/`、`.shelf/workspace/`、`.shelf/config.yaml` 等用户数据路径会被保护，不会作为 obsolete 文件删除。
- 可在 `.shelf/update.skip` 写入需要冻结的投影路径。支持精确文件路径和以 `/` 结尾的目录前缀，例如 `AGENTS.md`、`.claude/`。
- 每次实际更新会写入 `.shelf/update-manifest.json`，记录版本迁移、备份、删除、跳过写入和跳过删除的路径。

## `agent spec scaffold`

为 monorepo workspace package 生成轻量 package spec 骨架。

```bash
agentos-cli agent spec scaffold -t D:\work\easy\test --dry-run
agentos-cli agent spec scaffold -t D:\work\easy\test
agentos-cli agent spec scaffold -t D:\work\easy\test --package web=packages/web,api=packages/api
```

默认读取 `package.json` workspaces 和 `pnpm-workspace.yaml`，并生成：

- `.shelf/spec/packages/<package-id>/README.md`
- `.shelf/spec/packages/<package-id>/architecture.md`
- `.shelf/spec/packages/<package-id>/quality.md`

默认不覆盖已有 spec 文件。确认需要重写时可使用 `--force`。

## `agent skills import`

把已有项目级 skills 导入到目标项目。

```bash
agentos-cli agent skills import <source> [target]
agentos-cli agent skills import D:\old-project\.claude\skills -t D:\work\easy\test
agentos-cli agent skills import D:\skills\agentos-brainstorm -t D:\work\easy\test --mode overwrite
agentos-cli agent skills import D:\shared-skills -t D:\work\easy\test --to codex
```

参数：

- `<source>`：单个 skill 目录，或包含多个 skill 子目录的 skills 根目录；每个 skill 目录需要包含 `SKILL.md`。
- `[target]` / `-t, --target <path>`：目标项目目录，默认当前目录。
- `--mode <skip|overwrite>`：导入模式；默认交互选择。
- `--to <auto|shelf|agent-os|codex|claude>`：导入目标，默认 `auto`；`agent-os` 作为旧别名保留。
- `-f, --force`：等价于 `--mode overwrite`。

`auto` 模式下：

- 如果目标项目存在 `.shelf/skills`，优先导入到统一源。
- 单工具项目没有 `.shelf/` 时，会导入到已存在的 `.codex/skills` 或 `.claude/skills`。

## 开发验证

```bash
npm test
npm pack --dry-run
```
