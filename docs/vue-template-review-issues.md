# Vue Template 审查问题清单

本文记录对 `templates/presets/vue` 当前 template 的审查发现，供后续逐项修复。审查范围包括共享规则、项目级 skills、同步脚本、CLI 注入逻辑、测试和发布包范围。

## 高优先级

- [ ] `mastergo-to-code` 在 Codex-only 安装后路径不可用
  - 证据：`lib/utils/agent-os.js` 中 Codex 单工具只生成 `.codex/skills`；但 `templates/presets/vue/.agent-os/skills/mastergo-to-code/SKILL.md` 的命令示例硬编码 `.claude/skills/mastergo-to-code/index.ts`。
  - 影响：只安装 Codex 的用户触发 MasterGo skill 后会直接找不到文件。
  - 建议：移除 `.claude` 硬编码，改为当前 skill 目录相对路径，或分别给出 Codex/Claude 路径。

- [ ] `mastergo-to-code` 运行依赖和 OSS 配置不自包含
  - 证据：`index.ts` 依赖 `dotenv`，`ossConfig.ts` 依赖 `minio`，但发布包根 `package.json` 只有 `commander`、`inquirer`；skill 文档还声称 OSS 配置已在项目中完成。
  - 影响：干净 Vue 项目会缺 `tsx`、`dotenv`、`minio` 或缺 `.env.local` OSS 配置而失败。
  - 建议：明确依赖安装方式；或将资源处理改成不强依赖 OSS，先本地落盘，大图上传作为可选路径。

- [ ] 同步脚本会删除工具 skills 目录中的额外 skill，但文档说明不足
  - 证据：`scripts/sync-agent-os.ps1` 的 `Remove-StaleEntries` 会镜像清理 `.claude/skills` 和 `.codex/skills` 中源目录不存在的条目；`.agent-os/README.md` 表述为不会主动清理 `.claude/`、`.codex/` 下额外文件，容易误导。
  - 影响：用户手动放在 `.codex/skills` 或 `.claude/skills` 的团队 skill 可能被 `pnpm agent-os:sync` 删除。
  - 建议：文档明确“skills 目录是镜像目录”；要求自定义 skill 先导入 `.agent-os/skills`，再同步。

- [ ] `ui-ux-pro-max` 在 Vue preset 中仍以 React Native 为默认栈
  - 证据：`AGENTS.shared.md` 限定 Vue preset 只采用通用 Web/Vue 规则；但 `ui-ux-pro-max/SKILL.md` 内存在 `React Native (this project's only tech stack)`、`--stack react-native`、App UI checklist 等主流程内容。
  - 影响：Vue Web 任务可能被移动端规则污染，输出错误实现方向或不可执行验证。
  - 建议：为 Vue preset 裁剪 UI skill，或增加 Vue 专用入口，默认使用 `data/stacks/vue.csv` 和 Web/Vue checklist。

## 中优先级

- [ ] `ui-ux-pro-max` 可执行脚本路径和实际安装落点不一致
  - 证据：skill 要求执行 `python3 skills/ui-ux-pro-max/scripts/search.py`；实际安装落点是 `.codex/skills/...` 或 `.claude/skills/...`。
  - 影响：Agent 按文档执行会找不到脚本。
  - 建议：改为“从当前 skill 目录执行脚本”，或在文档中显式说明 Codex/Claude 的实际路径。

- [ ] `test-driven-development` 触发范围过宽，且“删除重来”规则可能冲突
  - 证据：skill frontmatter 写实现任何 feature/bugfix 前使用；正文要求 bugfix/refactor/behavior change 总是 TDD，并写 “Write code before the test? Delete it. Start over.”
  - 影响：普通小修复或用户已有半成品改动时，可能和“不覆盖/不回滚用户改动”规则冲突。
  - 建议：收敛为高风险行为变更、逻辑缺陷、数据转换等优先 TDD；明确不得删除用户既有改动。

- [ ] MasterGo MCP 工具名和权限声明不一致
  - 证据：`mastergo-to-code/SKILL.md` 同时出现完整 MCP 工具名和简写；`settings.local.json` 只 allow `getDsl`，没有覆盖 `getComponentLink`。
  - 影响：DSL 包含 `componentDocumentLinks` 时，组件文档获取路径可能被权限或工具名不一致卡住。
  - 建议：统一工具名；补充 `getComponentLink` 权限或删除不应发布的本地权限文件。

- [ ] 多个 skill 的 `MUST` / `Always` / `REQUIRED` 措辞过强
  - 证据：`vue-best-practices`、`test-driven-development`、`ui-ux-pro-max` 均存在高强度默认触发和常驻 reference 要求。
  - 影响：`AGENTS.shared.md` 的轻量化规则可能被 skill 内部强措辞覆盖，普通任务被拉进重流程。
  - 建议：把强制措辞改为按风险和任务规模触发；对小改动给出轻量路径。

- [ ] `vue-best-practices` 默认读取量和拆分倾向偏重
  - 证据：普通 Vue task 要读取多个 reference，并要求复杂页面拆组件；CRUD/list 也倾向固定拆分。
  - 影响：普通 `.vue` 小任务可能产生过多上下文读取和过度组件化。
  - 建议：区分小改动、非平凡页面改造和架构性重构；小改动只读相关 reference。

## 低优先级

- [ ] 同步命令文档默认只写 `pnpm agent-os:sync`
  - 证据：`.agent-os/README.md` 多处要求执行 `pnpm agent-os:sync`；实际 package script 不依赖 pnpm。
  - 影响：npm/yarn 项目或未安装 pnpm 的机器上，用户可能不知道替代命令。
  - 建议：补充 `npm run agent-os:sync` / `yarn agent-os:sync`。

- [ ] `ui-ux-pro-max` 能力数量描述漂移
  - 证据：`SKILL.md` 写 `10 stacks`，平台模板和实际 `data/stacks` 显示 16 个 stack。
  - 影响：文档可信度下降，后续维护容易误判。
  - 建议：统一统计口径，或删除易漂移的数量承诺。

## 已确认无问题

- 发布包范围初步可覆盖模板文件：审查中通过 `npm pack --dry-run` 确认 `.agent-os`、`scripts/sync-agent-os.ps1` 和 reference 文件会进入 tarball，暂未发现隐藏模板目录被漏发的证据。

