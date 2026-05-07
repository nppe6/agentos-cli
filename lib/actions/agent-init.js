const path = require('path');
const {
  collectConflicts,
  copyTemplateFiles,
  getGitignoreEntries,
  getSelectedLabels,
  normalizeTools,
  recordAgentOsMetadata,
  removeManagedInstallFiles,
  removeLegacyPackageJsonScript,
  syncAgentOs,
  usesAgentOs,
  validateStack
} = require('../utils/agent-os');
const {
  GIT_MODE_IGNORE,
  updateGitIgnore
} = require('../utils/gitignore');
const { printBanner } = require('../utils/banner');
const {
  findGitUserName,
  initializeDeveloperIdentity
} = require('../utils/developer-identity');
const { ensureDirectory, removeDirectoryIfEmpty, removePathIfExists } = require('../utils/fs');
const { detectMonorepo } = require('../utils/monorepo');
const { detectProjectType } = require('../utils/project-detector');
const { writeBootstrapTask } = require('../utils/bootstrap-task');
const { pruneSpecScaffold } = require('../utils/spec-scaffold');

function createPrompt() {
  const inquirer = require('inquirer');
  return inquirer.createPromptModule();
}

function renderConflictList(conflicts) {
  return renderTree(conflicts.map((conflict) => conflict.label));
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

function renderTree(items) {
  return items
    .map((item, index) => {
      const prefix = index === items.length - 1 ? '\u2514\u2500' : '\u251c\u2500';
      return `${prefix} ${item}`;
    })
    .join('\n');
}

function describeGeneratedGroups(selectedTools, shouldUseAgentOs) {
  const groups = [];

  if (selectedTools.includes('codex') || selectedTools.includes('claude')) {
    groups.push({
      label: 'Shared',
      children: ['AGENTS.md']
    });
  }

  if (selectedTools.includes('codex')) {
    groups.push({
      label: 'Codex',
      children: ['.codex/', '.agents/skills/']
    });
  }

  if (selectedTools.includes('claude')) {
    groups.push({
      label: 'Claude Code',
      children: ['.claude/']
    });
  }

  if (shouldUseAgentOs) {
    groups.push({
      label: 'Shared Shelf source',
      children: ['.shelf/']
    });
  }

  return groups;
}

function renderGeneratedTree(selectedTools, shouldUseAgentOs) {
  return describeGeneratedGroups(selectedTools, shouldUseAgentOs)
    .map((group, groupIndex, groups) => {
      const isLastGroup = groupIndex === groups.length - 1;
      const groupPrefix = isLastGroup ? '\u2514\u2500' : '\u251c\u2500';
      const childIndent = isLastGroup ? '   ' : '\u2502  ';
      const children = group.children.map((child, childIndex) => {
        const childPrefix = childIndex === group.children.length - 1 ? '\u2514\u2500' : '\u251c\u2500';
        return `${childIndent}${childPrefix} ${child}`;
      });

      return [`${groupPrefix} ${group.label}`, ...children].join('\n');
    })
    .join('\n');
}

async function confirmOverwrite(conflicts, promptFactory = createPrompt) {
  console.log('检测到已有 AgentOS Shelf 工作流文件，继续执行会更新以下路径中的受管内容：');
  console.log(renderConflictList(conflicts));
  console.log('自定义文件会尽量保留；如需保留受管文件的手动修改，请先备份后再继续。');

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
          value: 'track'
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
  const renderBanner = dependencies.printBanner || printBanner;
  const stack = validateStack(options.stack || 'core');
  const targetDirectory = path.resolve(target);
  const promptOverwrite = dependencies.promptOverwrite || confirmOverwrite;
  const promptGitMode = dependencies.promptGitMode || selectGitMode;
  const promptTools = dependencies.promptTools || selectTools;
  const resolveGitUserName = dependencies.findGitUserName || findGitUserName;
  const initDeveloper = dependencies.initializeDeveloperIdentity || initializeDeveloperIdentity;
  const developerName = options.skipDeveloper
    ? null
    : String(options.user || '').trim() || resolveGitUserName(targetDirectory);

  renderBanner({ developer: developerName });

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
  const rawProjectType = detectProjectType(targetDirectory);
  const projectType = rawProjectType === 'unknown' ? 'fullstack' : rawProjectType;
  const detectedPackages = detectMonorepo(targetDirectory);

  const removedManagedFiles = removeManagedInstallFiles(targetDirectory);

  for (const conflict of conflicts) {
    if (conflict.kind === 'legacy-package-script') {
      if (!selectedLabels.has(conflict.label)) {
        removedLabels.push(conflict.label);
      }
      continue;
    }

    if (!selectedLabels.has(conflict.label) && removedManagedFiles.some((filePath) => pathMatchesConflict(filePath, conflict.relativePath))) {
      removedLabels.push(conflict.label);
    }
    if (conflict.relativePath === path.join('scripts', 'sync-agent-os.ps1')) {
      removePathIfExists(conflict.absolutePath);
      removeDirectoryIfEmpty(path.dirname(conflict.absolutePath));
    }
  }

  copyTemplateFiles({ stack, targetDirectory, tools: selectedTools });
  pruneSpecScaffold(targetDirectory, { packages: detectedPackages, projectType });
  writeBootstrapTask(targetDirectory, { packages: detectedPackages, projectType });
  const generatedFiles = syncAgentOs(targetDirectory, selectedTools, stack);
  const metadataResult = recordAgentOsMetadata(targetDirectory, {
    generatedFiles,
    stack,
    tools: selectedTools
  });
  const developerResult = developerName
    ? initDeveloper(targetDirectory, developerName, { force: false })
    : { initialized: false, reason: 'missing-name' };
  const packageResult = removeLegacyPackageJsonScript(targetDirectory);
  const gitignoreResult = updateGitIgnore(targetDirectory, gitMode, getGitignoreEntries(selectedTools));

  console.log('AgentOS Shelf 工作流注入完成。');
  console.log(`目标目录：${targetDirectory}`);
  console.log('已选择：');
  console.log(renderTree(selectedTools));
  console.log(colorize('blue', `生成内容：\n${renderGeneratedTree(selectedTools, shouldUseAgentOs)}`));
  console.log(colorize('cyan', '提示：已启用 .shelf 统一源，并从该源生成所选工具投影。'));
  if (developerResult.initialized) {
    console.log(colorize('green', `开发者：已初始化 ${developerResult.developer}`));
  }
  else if (developerResult.reason === 'already-initialized') {
    console.log(colorize('cyan', `开发者：已存在 ${developerResult.developer || '当前开发者'}，未覆盖。`));
  }
  else if (!options.skipDeveloper) {
    console.log(colorize('yellow', '开发者：未检测到 git user.name；可运行 agentos-cli shelf developer init <name> 设置。'));
  }
  console.log(colorize('green', `元数据：已写入 manifest，并跟踪 ${Object.keys(metadataResult.hashes).length} 个模板文件 hash。`));
  if (removedLabels.length > 0) {
    console.log(colorize('yellow', `提示：本次为全量覆盖，未选择的受管内容已删除：\n${renderTree(removedLabels)}`));
  }
  console.log(`Git 模式：${gitMode === GIT_MODE_IGNORE ? '忽略' : '提交'}`);
  if (gitMode === GIT_MODE_IGNORE) {
    console.log('提示：团队项目通常建议提交 AI 工作流文件；忽略模式更适合个人临时增强。');
  }
  if (packageResult.updated) {
    console.log('package.json：已移除旧版 scripts.agent-os:sync');
  }
  if (gitignoreResult.updated) {
    console.log('.gitignore：已按增量方式更新');
  }

  if (detectedPackages.length > 0) {
    console.log(colorize('cyan', `检测到 ${detectedPackages.length} 个 workspace package。可在 .shelf/config.yaml 中声明 packages，并为每个 package 补齐 .shelf/spec/<package>/。`));
  }

  return {
    aborted: false,
    detectedPackages,
    gitMode,
    gitignoreUpdated: gitignoreResult.updated,
    hashesTracked: Object.keys(metadataResult.hashes).length,
    developer: developerResult.developer || null,
    developerInitialized: Boolean(developerResult.initialized),
    manifest: metadataResult.manifest,
    packageUpdated: packageResult.updated,
    projectType,
    tools: selectedTools,
    targetDirectory
  };
}

function pathMatchesConflict(filePath, conflictPath) {
  const normalizedFile = String(filePath).replace(/\\/g, '/');
  const normalizedConflict = String(conflictPath).replace(/\\/g, '/').replace(/\/$/, '');

  return normalizedFile === normalizedConflict || normalizedFile.startsWith(`${normalizedConflict}/`);
}

module.exports = agentInit;
module.exports._private = {
  renderTree,
  renderGeneratedTree,
  selectTools
};
