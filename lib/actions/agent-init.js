const path = require('path');
const {
  PACKAGE_SYNC_SCRIPT,
  collectConflicts,
  copyTemplateFiles,
  getGitignoreEntries,
  getSelectedLabels,
  normalizeTools,
  syncAgentOs,
  updatePackageJsonScript,
  usesAgentOs,
  validatePreset
} = require('../utils/agent-os');
const {
  GIT_MODE_IGNORE,
  GIT_MODE_TRACK,
  updateGitIgnore
} = require('../utils/gitignore');
const { ensureDirectory, removeDirectoryIfEmpty, removePathIfExists } = require('../utils/fs');

function createPrompt() {
  const inquirer = require('inquirer');
  return inquirer.createPromptModule();
}

function renderConflictList(conflicts) {
  return conflicts.map((conflict) => `- ${conflict.label}`).join('\n');
}

function colorize(color, message) {
  const colors = {
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m'
  };

  return `${colors[color] || ''}${message}\x1b[0m`;
}

function describeGeneratedFiles(selectedTools, shouldUseAgentOs) {
  const descriptions = [];

  if (selectedTools.includes('codex')) {
    descriptions.push('Codex：AGENTS.md、.codex/');
  }

  if (selectedTools.includes('claude')) {
    descriptions.push('Claude Code：CLAUDE.md、.claude/');
  }

  if (shouldUseAgentOs) {
    descriptions.push('统一管理：.agent-os/、scripts/sync-agent-os.ps1');
  }

  return descriptions;
}

async function confirmOverwrite(conflicts, promptFactory = createPrompt) {
  console.log('检测到已有 Agent OS 工作流文件，继续执行会覆盖或删除以下受管内容：');
  console.log(renderConflictList(conflicts));
  console.log('如需保留，请先备份后再继续。');

  const prompt = promptFactory();
  const { overwrite } = await prompt([
    {
      type: 'confirm',
      name: 'overwrite',
      default: false,
      message: '是否覆盖已有工作流文件？'
    }
  ]);

  return overwrite;
}

async function selectTools(promptFactory = createPrompt) {
  const prompt = promptFactory();
  const { tools } = await prompt([
    {
      type: 'checkbox',
      name: 'tools',
      message: '请选择要注入的 Agent 工具配置：',
      choices: [
        {
          name: 'Codex',
          value: 'codex'
        },
        {
          name: 'Claude Code',
          value: 'claude'
        }
      ],
      validate: (value) => value.length > 0 || '至少选择一个 Agent 工具。'
    }
  ]);

  return tools;
}

async function selectGitMode(promptFactory = createPrompt) {
  const prompt = promptFactory();
  const { gitMode } = await prompt([
    {
      type: 'list',
      name: 'gitMode',
      message: '是否将注入的 AI 工作流文件加入 Git 忽略？',
      choices: [
        {
          name: '提交到 Git（推荐，团队共享规则）',
          value: GIT_MODE_TRACK
        },
        {
          name: '忽略并追加到 .gitignore（个人临时增强）',
          value: GIT_MODE_IGNORE
        }
      ]
    }
  ]);

  return gitMode;
}

async function agentInit(target = '.', options = {}, dependencies = {}) {
  const preset = validatePreset(options.preset || 'vue');
  const targetDirectory = path.resolve(target);
  const promptOverwrite = dependencies.promptOverwrite || confirmOverwrite;
  const promptGitMode = dependencies.promptGitMode || selectGitMode;
  const promptTools = dependencies.promptTools || selectTools;
  const selectedTools = normalizeTools(options.tools || await promptTools());
  const shouldUseAgentOs = usesAgentOs(selectedTools);
  const gitMode = options.gitMode || await promptGitMode();

  ensureDirectory(targetDirectory);

  const conflicts = collectConflicts(targetDirectory);
  if (conflicts.length > 0 && !options.force) {
    const confirmed = await promptOverwrite(conflicts);
    if (!confirmed) {
      console.log('已取消，未写入任何文件。');
      return { aborted: true };
    }
  }

  const selectedLabels = getSelectedLabels(selectedTools);
  const removedLabels = [];

  for (const conflict of conflicts) {
    if (conflict.kind === 'package-script') {
      if (!selectedLabels.has(conflict.label)) {
        removedLabels.push(conflict.label);
      }
      continue;
    }

    if (!selectedLabels.has(conflict.label)) {
      removedLabels.push(conflict.label);
    }
    removePathIfExists(conflict.absolutePath);
    if (conflict.relativePath === path.join('scripts', 'sync-agent-os.ps1')) {
      removeDirectoryIfEmpty(path.dirname(conflict.absolutePath));
    }
  }

  copyTemplateFiles({ preset, targetDirectory, tools: selectedTools });
  syncAgentOs(targetDirectory, selectedTools, preset);
  const packageResult = updatePackageJsonScript(targetDirectory, shouldUseAgentOs);
  const gitignoreResult = updateGitIgnore(targetDirectory, gitMode, getGitignoreEntries(selectedTools));

  console.log('Agent OS 工作流注入完成。');
  console.log(`目标目录：${targetDirectory}`);
  console.log(`已选择：${selectedTools.join(', ')}`);
  for (const description of describeGeneratedFiles(selectedTools, shouldUseAgentOs)) {
    console.log(colorize('blue', `生成内容：${description}`));
  }
  if (shouldUseAgentOs) {
    console.log(colorize('cyan', '提示：当前选择了多个 Agent 工具，已启用 .agent-os 和 scripts/sync-agent-os.ps1 统一配置管理。'));
    console.log(`同步脚本：${PACKAGE_SYNC_SCRIPT}`);
  }
  else {
    console.log(colorize('green', '提示：当前只选择了一个 Agent 工具，已跳过 .agent-os 和同步脚本，仅生成对应工具配置。'));
  }
  if (removedLabels.length > 0) {
    console.log(colorize('yellow', `提示：本次为全量覆盖，未选择的受管内容已删除：${removedLabels.join('、')}`));
  }
  console.log(`Git 模式：${gitMode === GIT_MODE_IGNORE ? '忽略' : '提交'}`);
  if (gitMode === GIT_MODE_IGNORE) {
    console.log('提示：团队项目通常建议提交 AI 工作流文件；忽略模式更适合个人临时增强。');
  }
  if (packageResult.updated) {
    console.log(packageResult.removed
      ? 'package.json：已移除 scripts.agent-os:sync'
      : 'package.json：已更新 scripts.agent-os:sync');
  }
  else {
    console.log(shouldUseAgentOs
      ? 'package.json：未找到，已跳过脚本注入'
      : 'package.json：未找到或无需同步脚本');
  }
  if (gitignoreResult.updated) {
    console.log('.gitignore：已按增量方式更新');
  }

  return {
    aborted: false,
    gitMode,
    gitignoreUpdated: gitignoreResult.updated,
    packageUpdated: packageResult.updated,
    tools: selectedTools,
    targetDirectory
  };
}

module.exports = agentInit;
module.exports._private = {
  selectTools
};
