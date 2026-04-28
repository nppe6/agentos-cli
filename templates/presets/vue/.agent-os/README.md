# Agent OS

`.agent-os` 只在多工具注入模式下生成，是 Claude 和 Codex 工作流文件的唯一项目级源目录。

单选 Codex 或单选 Claude Code 时，不生成 `.agent-os` 和同步脚本；对应工具入口文件会直接承载所需规则。

## 管理内容

- `rules/AGENTS.shared.md`
  - 多工具模式下共享规则的唯一真源
- `templates/CLAUDE.md`
  - 面向 Claude 的精简入口模板
- `skills/`
  - 可选的项目级 skills，会同步到 `.claude/skills/` 和 `.codex/skills/`

## 同步方式

多工具模式下，修改 `.agent-os` 下任意文件后，执行 `pnpm agent-os:sync`。

同步命令会更新：

- `AGENTS.md`
- `CLAUDE.md`
- `.claude/skills/`
- `.codex/skills/`

脚本只管理这些路径，会原地覆盖受管文件；不会主动清理其他工具将来在 `.claude/`、`.codex/` 下创建的额外文件。

同步脚本内部会校验这些受管路径是否生成成功；命令成功结束且不报错，即表示本地项目级规则和 skills 已经就位。无需额外提供 `agent-os:doctor` 或 `agent-os:check` 命令。

## Compound Engineering 依赖边界

`Compound Engineering` 是优先使用的全局增强流程，不是这个脚手架的硬依赖。

如果用户本机 Codex / Claude Code 没有安装或无法读取 `Compound Engineering`，Agent 应按 `rules/AGENTS.shared.md` 中的“内置降级流程”继续工作。项目级 Vue skills 由本目录同步到 `.claude/skills/` 和 `.codex/skills/`，属于脚手架自带能力。
