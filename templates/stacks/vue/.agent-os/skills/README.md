# Project Skills

这里存放多工具统一管理模式下的项目级本地 skills。

在多工具模式中，更新这个目录后执行 `pnpm agent-os:sync`，内容会同步到当前项目已启用的 Agent 工具目录：

- `.claude/skills/`
- `.codex/skills/`

单工具模式不会生成 `.agent-os/`，CLI 会在初始化时直接把这些 skills 复制到所选工具目录。

这些项目级 skills 是项目自带的本地兜底能力，不依赖用户提前安装全局 `Compound Engineering` 插件。同步或初始化成功结束后，Agent 就可以直接按对应工具目录中的 `SKILL.md` 加载能力。

## 迁移已有 skills

如果其他项目已经有自己的本地 skills，可以在项目根目录执行迁移命令：

```bash
agentos-cli agent skills import <source>
```

未指定 `--mode` 时会先确认导入位置，再选择增量或覆盖；需要直接覆盖时使用：

```bash
agentos-cli agent skills import <source> --mode overwrite
```

多工具统一管理模式会优先导入到 `.agent-os/skills/`，导入后执行 `pnpm agent-os:sync` 同步到已启用的 Agent 工具目录。
