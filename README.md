# agentos-cli

用于将现有的 AI 工作流配置整套注入到任意现有项目。

## 适用场景

- 你的项目不是从模板新建的。
- 你希望快速补齐 `AGENTS.md`、`.agent-os`、`.claude`、`.codex` 等配置。
- 你接受“整套覆盖”，而不是增量合并。

## 安装

```bash
npm install
npm link
```

全局安装后可直接使用 `agentos-cli`。
如果 PowerShell 拦截脚本，可改用 `agentos-cli.cmd`。

## 命令说明

```bash
agentos-cli -h
agentos-cli -v
agentos-cli agent init [target]
```

- `-h, --help`：查看帮助信息。
- `-v, --version`：查看当前 CLI 版本。
- `agent init`：向目标项目注入整套 AI 工作流配置。

## 参数说明

- `[target]`：目标目录，默认当前目录。
- `-t, --target <path>`：显式指定目标目录，优先级高于位置参数。
- `-p, --preset <preset>`：选择预设，当前仅支持 `vue`。
- `-f, --force`：跳过确认，发现冲突时直接覆盖。

## 执行结果

命令会写入或生成以下内容：

- `.agent-os/`
- `scripts/sync-agent-os.ps1`
- `AGENTS.md`
- `CLAUDE.md`
- `.claude/skills/`
- `.codex/skills/`
- `package.json` 中的 `scripts.agent-os:sync`（若存在 `package.json`）

## 覆盖规则

- 检测到已有配置时，默认会提示确认。
- 确认后执行全量覆盖，不做合并。
- 如需保留旧配置，请先手动备份。

## 示例

```bash
agentos-cli agent init
agentos-cli agent init D:\work\easy\test
agentos-cli agent init -t D:\work\easy\test --force
```

## 发布与更新

- 本地开发完成后，可重新执行 `npm link`，全局命令会同步到最新代码。
- 如果后续发布到 npm，建议先更新 `package.json` 中的 `version`。
- 已安装全局包的机器可通过 `npm update -g agentos-cli` 获取新版本。
- 如果只是不再需要本地全局链接，可执行 `npm unlink -g agentos-cli`。
