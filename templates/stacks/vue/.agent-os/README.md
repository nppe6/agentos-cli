# Agent OS

`.agent-os` 只在多工具注入模式下生成，是 Claude 和 Codex 工作流文件的唯一项目级源目录。

单选 Codex 或单选 Claude Code 时，不生成 `.agent-os` 和同步脚本；对应工具入口文件会直接承载所需规则。

## 管理内容

- `rules/AGENTS.shared.md`
  - 多工具模式下共享规则的唯一真源
- `templates/CLAUDE.md`
  - 面向 Claude 的精简入口模板
- `skills/`
  - 多工具模式下的项目级 skills，同步脚本会同步到 `.claude/skills/` 和 `.codex/skills/`

## 同步方式

多工具模式下，修改 `.agent-os` 下任意文件后，执行 `pnpm agent-os:sync`。

同步命令会更新：

- `AGENTS.md`
- `CLAUDE.md`
- `.claude/skills/`
- `.codex/skills/`

脚本只管理这些路径，会原地覆盖受管文件；不会主动清理其他工具将来在 `.claude/`、`.codex/` 下创建的额外文件。

同步脚本内部会校验多工具模式的受管路径是否生成成功；命令成功结束且不报错，即表示本地项目级规则和 skills 已经就位。无需额外提供 `agent-os:doctor` 或 `agent-os:check` 命令。

## skills 迁移

需要把其他项目的本地 skills 迁移进来时，使用：

```bash
agentos-cli agent skills import <source>
```

未指定 `--mode` 时会先确认导入位置，再选择增量或覆盖；需要直接覆盖时加 `--mode overwrite`。导入完成后执行 `pnpm agent-os:sync`，把 `.agent-os/skills/` 同步到已启用的 Agent 工具目录。

## Compound Engineering 依赖边界

`Compound Engineering` 是优先使用的全局增强流程，不是这个脚手架的硬依赖。

如果用户本机 Codex / Claude Code 没有安装或无法读取 `Compound Engineering`，Agent 应按 `rules/AGENTS.shared.md` 中的“内置降级流程”继续工作。项目级 Vue skills 由本目录同步或复制到所选工具目录，属于项目自带能力。
