const fs = require('fs');
const path = require('path');
const { ensureDirectory, removePathIfExists } = require('../utils/fs');
const { SOURCE_DIRECTORY_NAME } = require('../utils/agent-os');

const IMPORT_MODE_SKIP = 'skip';
const IMPORT_MODE_OVERWRITE = 'overwrite';
const IMPORT_TARGET_AGENT_OS = 'agent-os';
const IMPORT_TARGET_SHELF = 'shelf';
const IMPORT_TARGET_CODEX = 'codex';
const IMPORT_TARGET_CLAUDE = 'claude';
const IMPORT_TARGET_AUTO = 'auto';

function createPrompt() {
  const inquirer = require('inquirer');
  return inquirer.createPromptModule();
}

function discoverSkills(sourceDirectory) {
  const resolvedSource = path.resolve(sourceDirectory);

  assertDirectoryExists(resolvedSource, 'skills source');

  if (isSkillDirectory(resolvedSource)) {
    return [{
      name: path.basename(resolvedSource),
      sourcePath: resolvedSource
    }];
  }

  return fs.readdirSync(resolvedSource, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const sourcePath = path.join(resolvedSource, entry.name);
      return { name: entry.name, sourcePath };
    })
    .filter((skill) => isSkillDirectory(skill.sourcePath));
}

async function importSkills(source, options = {}) {
  const targetDirectory = path.resolve(options.target || '.');
  const destinationKind = normalizeDestination(options.to || IMPORT_TARGET_AUTO);
  const skills = discoverSkills(source);

  if (skills.length === 0) {
    throw new Error(`No skills found in source: ${path.resolve(source)}`);
  }

  const destinations = resolveDestinations(targetDirectory, destinationKind);
  if (destinations.length === 0) {
    throw new Error('No skills destination found. Run shelf init first, or pass --to shelf, --to codex, or --to claude.');
  }

  const promptFactory = options.promptFactory || createPrompt;
  const confirmed = options.interactive
    ? await confirmMigration({ destinations, skills, source, targetDirectory }, promptFactory)
    : true;

  if (!confirmed) {
    console.log('已取消，未导入任何 skills。');
    return {
      aborted: true,
      imported: [],
      mode: null,
      overwritten: [],
      skipped: [],
      targetDirectory
    };
  }

  const mode = await resolveImportMode(options, promptFactory);

  const imported = [];
  const skipped = [];
  const overwritten = [];

  for (const destination of destinations) {
    ensureDirectory(destination.path);

    for (const skill of skills) {
      const destinationPath = path.join(destination.path, skill.name);
      if (isSamePath(skill.sourcePath, destinationPath)) {
        skipped.push({ skill: skill.name, destination: destination.label });
        continue;
      }

      const exists = fs.existsSync(destinationPath);

      if (exists && mode === IMPORT_MODE_SKIP) {
        skipped.push({ skill: skill.name, destination: destination.label });
        continue;
      }

      if (exists) {
        removePathIfExists(destinationPath);
        overwritten.push({ skill: skill.name, destination: destination.label });
      }

      fs.cpSync(skill.sourcePath, destinationPath, { recursive: true, force: true });
      imported.push({ skill: skill.name, destination: destination.label });
    }
  }

  printSummary({ imported, skipped, overwritten, targetDirectory, mode });

  return {
    imported,
    mode,
    overwritten,
    skipped,
    targetDirectory
  };
}

async function resolveImportMode(options, promptFactory) {
  if (options.force) {
    return IMPORT_MODE_OVERWRITE;
  }

  if (options.mode) {
    return normalizeImportMode(options.mode);
  }

  if (options.interactive) {
    return selectImportMode(promptFactory);
  }

  return IMPORT_MODE_SKIP;
}

async function selectImportMode(promptFactory = createPrompt) {
  const prompt = promptFactory();
  const { mode } = await prompt([
    {
      type: 'list',
      name: 'mode',
      message: '请选择 skills 导入模式：',
      choices: [
        {
          name: '增量导入：同名 skill 跳过',
          value: IMPORT_MODE_SKIP
        },
        {
          name: '覆盖导入：同名 skill 直接覆盖',
          value: IMPORT_MODE_OVERWRITE
        }
      ]
    }
  ]);

  return mode;
}

async function confirmMigration({ destinations, skills, source, targetDirectory }, promptFactory = createPrompt) {
  console.log('即将导入项目级 skills：');
  console.log(`来源目录：${path.resolve(source)}`);
  console.log(`目标项目：${targetDirectory}`);
  console.log('发现 skills：');
  console.log(renderTree(skills.map((skill) => skill.name)));
  console.log('导入位置：');
  console.log(renderTree(destinations.map((destination) => destination.path)));

  const prompt = promptFactory();
  const { confirmed } = await prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      default: true,
      message: '是否确认导入到以上 skills 目录？'
    }
  ]);

  return confirmed;
}

function renderTree(items) {
  return items
    .map((item, index) => {
      const prefix = index === items.length - 1 ? '└─' : '├─';
      return `${prefix} ${item}`;
    })
    .join('\n');
}

function resolveDestinations(targetDirectory, destinationKind) {
  if (destinationKind === IMPORT_TARGET_AGENT_OS || destinationKind === IMPORT_TARGET_SHELF) {
    return [createDestination(targetDirectory, SOURCE_DIRECTORY_NAME, 'shelf')];
  }

  if (destinationKind === IMPORT_TARGET_CODEX) {
    return [createOpenAgentSkillsDestination(targetDirectory, 'codex')];
  }

  if (destinationKind === IMPORT_TARGET_CLAUDE) {
    return [createDestination(targetDirectory, '.claude', 'claude')];
  }

  const agentOsDestination = createDestination(targetDirectory, SOURCE_DIRECTORY_NAME, 'shelf');
  if (fs.existsSync(agentOsDestination.path)) {
    return [agentOsDestination];
  }

  return [
    createOpenAgentSkillsDestination(targetDirectory, 'codex'),
    createDestination(targetDirectory, '.claude', 'claude')
  ].filter((destination) => fs.existsSync(destination.path));
}

function createDestination(targetDirectory, rootName, label) {
  return {
    label,
    path: path.join(targetDirectory, rootName, 'skills')
  };
}

function createOpenAgentSkillsDestination(targetDirectory, label) {
  return {
    label,
    path: path.join(targetDirectory, '.agents', 'skills')
  };
}

function isSkillDirectory(directoryPath) {
  return fs.existsSync(path.join(directoryPath, 'SKILL.md'));
}

function isSamePath(firstPath, secondPath) {
  return path.resolve(firstPath).toLowerCase() === path.resolve(secondPath).toLowerCase();
}

function normalizeImportMode(mode) {
  if (mode !== IMPORT_MODE_SKIP && mode !== IMPORT_MODE_OVERWRITE) {
    throw new Error('Import mode must be "skip" or "overwrite".');
  }

  return mode;
}

function normalizeDestination(destination) {
  const normalized = String(destination).trim().toLowerCase();
  const allowed = [
    IMPORT_TARGET_AUTO,
    IMPORT_TARGET_AGENT_OS,
    IMPORT_TARGET_SHELF,
    IMPORT_TARGET_CODEX,
    IMPORT_TARGET_CLAUDE
  ];

  if (!allowed.includes(normalized)) {
    throw new Error(`Import destination must be one of: ${allowed.join(', ')}.`);
  }

  return normalized;
}

function assertDirectoryExists(directoryPath, label) {
  if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) {
    throw new Error(`Missing ${label}: ${directoryPath}`);
  }
}

function printSummary({ imported, skipped, overwritten, targetDirectory, mode }) {
  console.log('项目级 skills 导入完成。');
  console.log(`目标目录：${targetDirectory}`);
  console.log(`导入模式：${mode === IMPORT_MODE_OVERWRITE ? '覆盖' : '增量跳过'}`);

  if (imported.length > 0) {
    console.log('已导入：');
    console.log(renderResultTree(imported));
  }

  if (overwritten.length > 0) {
    console.log('已覆盖：');
    console.log(renderResultTree(overwritten));
  }

  if (skipped.length > 0) {
    console.log('已跳过：');
    console.log(renderResultTree(skipped));
  }
}

function renderResultTree(items) {
  return renderTree(items.map((item) => `${item.skill} -> ${item.destination}`));
}

module.exports = importSkills;
module.exports._private = {
  confirmMigration,
  discoverSkills,
  renderResultTree,
  renderTree,
  resolveDestinations,
  selectImportMode
};
