# agentos-cli

用于把 Vue 项目补齐一整套 AI 工作流配置。

## 适用场景

- 仅适用于Vue项目中进行注入使用
- 项目不是从模板新建的
- 需要按选择快速注入 Codex、Claude Code 或多工具统一管理配置
- 接受整套覆盖，不做内容合并

## 安装

```bash
npm install
npm link
```

全局安装后可使用 `agentos-cli`，如 PowerShell 拦截可改用 `agentos-cli.cmd`。

## 更新全局包

如果是通过 npm 全局安装，使用以下命令更新到最新版本：

```bash
npm install -g agentos-cli@latest
```

更新后确认版本：

```bash
agentos-cli -v
```

如果是本地开发时通过 `npm link` 链接的版本，需要先更新本仓库代码，再重新安装依赖并链接：

```bash
npm install
npm link
```

## 命令

```bash
agentos-cli -h
agentos-cli -v
agentos-cli agent init [target]
agentos-cli agent skills import <source> [target]
```

- `-h, --help`：查看帮助
- `-v, --version`：查看版本
- `agent init`：按选择向目标项目注入 AI 工作流
- `agent skills import`：把已有项目级 skills 快速迁移到目标项目

## 参数

- `[target]`：目标目录，默认当前目录
- `-t, --target <path>`：显式指定目标目录
- `--stack <stack>`：选择技术栈能力包，默认 `core`，可选 `vue`
- `--tools <tools>`：指定要注入的工具，使用逗号分隔，支持 `codex`、`claude`
- `--git-mode <track|ignore>`：指定注入后的文件是提交到 Git 还是追加到 `.gitignore`
- `-f, --force`：发现冲突时直接覆盖

未传 `--tools` 时，CLI 会提供多选：

- 只选 `codex`：生成 `AGENTS.md` 和 `.codex/`
- 只选 `claude`：生成 `CLAUDE.md` 和 `.claude/`
- 同时选择 `codex`、`claude`：额外生成 `.agent-os/` 和 `scripts/sync-agent-os.ps1`，用于统一维护共享规则和 skills

`git mode` 是必选策略：未传 `--git-mode` 时，CLI 会主动询问。

- `track`：提交到 Git，推荐团队项目使用，确保所有成员共享同一套 AI 工作流规则。
- `ignore`：追加到 `.gitignore`，适合个人临时增强，不推荐团队项目长期使用。

## 注入内容

- Codex：`AGENTS.md`、`.codex/skills/`
- Claude Code：`CLAUDE.md`、`.claude/skills/`
- 多工具统一管理：`.agent-os/`、`scripts/sync-agent-os.ps1`
- 多工具统一管理时，会写入 `package.json` 中的 `scripts.agent-os:sync`（若存在 `package.json`）

## 规则

- 发现已有配置时，默认先确认再覆盖
- 确认后执行全量覆盖，不做合并；未选择的受管配置会被删除，并在完成时提示
- 选择 `ignore` 时，只会把本次选择对应的忽略规则增量追加到目标项目 `.gitignore` 末尾
- 选择 `track` 时，只会移除 `agentos-cli` 自己追加的忽略块
- 注入后的工具规则优先使用 `Compound Engineering`；如果本机没有全局插件，会按内置降级流程继续工作
- 只有选择两个以上工具时才生成同步脚本；同步脚本内部会校验受管文件和项目级 skills 是否生成成功，不额外提供 `doctor/check` 命令

## 示例

```bash
agentos-cli agent init -t D:\work\easy\test --git-mode track
agentos-cli agent init -t D:\work\easy\test --tools codex --git-mode track
agentos-cli agent init -t D:\work\easy\test --tools claude --git-mode track
agentos-cli agent init -t D:\work\easy\test --tools codex,claude --git-mode track
agentos-cli agent init -t D:\work\easy\test --git-mode ignore --force
```

## 项目级 skills 迁移

如果把这个工具分享给其他人使用，对方项目里可能已经有自己的本地 skills。可以用迁移命令把单个 skill 目录或一整个 skills 目录导入到当前脚手架生成的项目结构中：

```bash
agentos-cli agent skills import <source> [target]
```

- `<source>`：已有 skill 目录，或包含多个 skill 子目录的 skills 根目录；每个 skill 目录需要包含 `SKILL.md`
- `[target]` / `-t, --target <path>`：目标项目目录，默认当前目录
- `--mode <skip|overwrite>`：导入模式；未传时会交互选择，`skip` 表示已有同名 skill 时跳过
- `-f, --force`：等价于 `--mode overwrite`
- `--to <auto|agent-os|codex|claude>`：导入目标，默认 `auto`

`auto` 模式下，如果目标项目存在 `.agent-os/skills`，会优先导入到这里，适合多工具统一管理；导入后再执行 `pnpm agent-os:sync` 同步到已启用工具目录。单工具项目没有 `.agent-os/` 时，会导入到已存在的 `.codex/skills` 或 `.claude/skills`。

推荐先执行 `agent init` 再执行 `agent skills import`，这样 `auto` 可以自动识别当前项目结构；如果需要在未初始化项目中提前导入 skills，则必须显式指定 `--to agent-os`、`--to codex` 或 `--to claude`。

只传一个路径时，这个路径表示 skills 来源目录，目标项目默认为当前目录；传两个路径时，第一个路径表示来源目录，第二个路径表示目标项目目录。

```bash
agentos-cli agent skills import D:\old-project\.claude\skills -t D:\work\easy\test
agentos-cli agent skills import D:\skills\ui-ux-pro-max -t D:\work\easy\test --mode overwrite
agentos-cli agent skills import D:\shared-skills -t D:\work\easy\test --to codex
```
