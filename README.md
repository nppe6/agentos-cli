# agentos-cli

把现有项目初始化为 Shelf 风格的 AgentOS 工作区，并生成 Codex / Claude Code 等工具可读取的投影文件。

## 适用场景

- 希望在已有项目中注入统一的 AI Agent 工作流。
- 希望以 `.shelf/` 作为 spec、task、workspace memory、rules 和 skills 的统一源。
- 希望同一套项目结构复用到 Codex、Claude Code 等 AI coding 工具。
- 希望先落地基础工作流，后续再按需增加框架能力包和团队协作规则。

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

如果 PowerShell 拦截可改用 `agentos-cli.cmd`。

## 命令

```bash
agentos-cli agent init [target]
agentos-cli agent doctor [target]
agentos-cli agent sync [target]
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

- `[target]`：目标目录，默认当前目录
- `-t, --target <path>`：显式指定目标目录
- `--stack <stack>`：选择能力包，默认 `core`，当前仅支持 `core`
- `--tools <tools>`：指定目标工具，逗号分隔，当前支持 `codex`、`claude`
- `--git-mode <track|ignore>`：指定注入文件是否提交到 Git 或加入 `.gitignore`
- `-f, --force`：发现冲突时直接覆盖受管文件

未传 `--tools` 时，CLI 会交互选择目标工具。

生成内容：

- Codex：`AGENTS.md`、`.codex/skills/`
- Claude Code：`CLAUDE.md`、`.claude/skills/`
- 统一源：`.shelf/`（单工具和多工具安装都会生成）

`.shelf/` 基础结构：

- `.shelf/spec/`：项目规范和可复用上下文
- `.shelf/tasks/`：任务 PRD、实现上下文、检查上下文和任务状态
- `.shelf/workspace/`：journal 等项目记忆
- `.shelf/skills/`：项目级 workflow skills，当前使用 `agentos-*` 命名前缀
- `.shelf/rules/`：共享 Agent 规则
- `.shelf/templates/`：平台投影模板

说明：

- `.shelf/` 是共享源，`AGENTS.md`、`CLAUDE.md`、`.codex/`、`.claude/` 是由 CLI 生成的工具投影。
- 当前版本不再生成 `scripts/sync-agent-os.ps1`，也不再写入 `package.json` 的 `scripts.agent-os:sync`。
- 如果目标项目存在旧版 `scripts/sync-agent-os.ps1` 或 `scripts.agent-os:sync`，重新初始化时会作为旧受管内容清理。
- `track` 适合团队共享规则，`ignore` 更适合个人临时增强。
- 框架能力包和团队协作规则定义暂未启用，后续会在基础工作流稳定后补充。

## `agent doctor`

只读检查目标项目的 AgentOS Shelf 安装状态。

```bash
agentos-cli agent doctor -t D:\work\easy\test
```

检查内容包括 `.shelf/manifest.json`、`.shelf/template-hashes.json`、共享规则、skills 目录，以及 manifest 中启用工具的投影文件。

## `agent sync`

从 `.shelf/` 重新生成已启用工具的投影文件。

```bash
agentos-cli agent sync -t D:\work\easy\test --dry-run
agentos-cli agent sync -t D:\work\easy\test --tools codex
```

`--dry-run` 会预览 `create`、`update`、`unchanged`、`user-modified`、`conflict` 等状态。实际同步会跳过用户修改和冲突文件，避免盲目覆盖。

## `agent skills import`

把已有项目级 skills 导入到目标项目。

```bash
agentos-cli agent skills import <source> [target]
agentos-cli agent skills import D:\old-project\.claude\skills -t D:\work\easy\test
agentos-cli agent skills import D:\skills\agentos-planning -t D:\work\easy\test --mode overwrite
agentos-cli agent skills import D:\shared-skills -t D:\work\easy\test --to codex
```

参数：

- `<source>`：单个 skill 目录，或包含多个 skill 子目录的 skills 根目录；每个 skill 目录需要包含 `SKILL.md`
- `[target]` / `-t, --target <path>`：目标项目目录，默认当前目录
- `--mode <skip|overwrite>`：导入模式；默认交互选择
- `--to <auto|shelf|agent-os|codex|claude>`：导入目标，默认 `auto`；`agent-os` 作为旧别名保留
- `-f, --force`：等价于 `--mode overwrite`

`auto` 模式下：

- 如果目标项目存在 `.shelf/skills`，优先导入到统一源。
- 单工具项目没有 `.shelf/` 时，会导入到已存在的 `.codex/skills` 或 `.claude/skills`。

## 开发验证

```bash
npm test
npm pack --dry-run
```
