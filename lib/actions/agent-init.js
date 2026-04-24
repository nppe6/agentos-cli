const path = require('path');
const {
  PACKAGE_SYNC_SCRIPT,
  collectConflicts,
  copyTemplateFiles,
  syncAgentOs,
  updatePackageJsonScript,
  validatePreset
} = require('../utils/agent-os');
const {
  GIT_MODE_IGNORE,
  GIT_MODE_TRACK,
  updateGitIgnore
} = require('../utils/gitignore');
const { ensureDirectory, removePathIfExists } = require('../utils/fs');

function createPrompt() {
  const inquirer = require('inquirer');
  return inquirer.createPromptModule();
}

function renderConflictList(conflicts) {
  return conflicts.map((conflict) => `- ${conflict.label}`).join('\n');
}

async function confirmOverwrite(conflicts, promptFactory = createPrompt) {
  console.log('检测到已有 Agent OS 工作流文件，继续执行会覆盖以下内容：');
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

async function selectGitMode(promptFactory = createPrompt) {
  const prompt = promptFactory();
  const { gitMode } = await prompt([
    {
      type: 'list',
      name: 'gitMode',
      message: '是否将注入的 AI 工作流文件加入 Git 忽略？',
      choices: [
        {
          name: '提交到 Git',
          value: GIT_MODE_TRACK
        },
        {
          name: '忽略并追加到 .gitignore',
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

  for (const conflict of conflicts) {
    if (conflict.kind === 'package-script') {
      continue;
    }

    removePathIfExists(conflict.absolutePath);
  }

  copyTemplateFiles({ preset, targetDirectory });
  syncAgentOs(targetDirectory);
  const packageResult = updatePackageJsonScript(targetDirectory);
  const gitignoreResult = updateGitIgnore(targetDirectory, gitMode);

  console.log('Agent OS 工作流注入完成。');
  console.log(`目标目录：${targetDirectory}`);
  console.log(`同步脚本：${PACKAGE_SYNC_SCRIPT}`);
  console.log(`Git 模式：${gitMode === GIT_MODE_IGNORE ? '忽略' : '提交'}`);
  if (packageResult.updated) {
    console.log('package.json：已更新 scripts.agent-os:sync');
  }
  else {
    console.log('package.json：未找到，已跳过脚本注入');
  }
  if (gitignoreResult.updated) {
    console.log('.gitignore：已按增量方式更新');
  }

  return {
    aborted: false,
    gitMode,
    gitignoreUpdated: gitignoreResult.updated,
    packageUpdated: packageResult.updated,
    targetDirectory
  };
}

module.exports = agentInit;
