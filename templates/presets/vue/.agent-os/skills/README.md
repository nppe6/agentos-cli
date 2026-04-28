# Project Skills

这里存放多工具统一管理模式下的项目级本地 skills。

在多工具模式中，更新这个目录后执行 `pnpm agent-os:sync`，内容会同步到当前项目已启用的 Agent 工具目录：

- `.claude/skills/`
- `.codex/skills/`

单工具模式不会生成 `.agent-os/`，CLI 会在初始化时直接把这些 skills 复制到所选工具目录。

这些项目级 skills 是项目自带的本地兜底能力，不依赖用户提前安装全局 `Compound Engineering` 插件。同步或初始化成功结束后，Agent 就可以直接按对应工具目录中的 `SKILL.md` 加载能力。
