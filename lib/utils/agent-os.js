const fs = require('fs');
const path = require('path');
const packageJson = require('../../package.json');
const { readJsonFile } = require('./json');
const { ensureDirectory, removeDirectoryIfEmpty, removePathIfExists } = require('./fs');
const { extractManagedBlock, replaceManagedBlock } = require('./managed-blocks');
const { getToolLayout } = require('./tool-layouts');
const {
  getSharedHookScriptsForPlatform
} = require('./shared-hooks');
const { HASHES_FILE, writeTemplateHashes } = require('./template-hash');

const SOURCE_DIRECTORY_NAME = '.shelf';
const SUPPORTED_STACKS = new Set(['core']);
const TEMPLATE_ROOT = path.resolve(__dirname, '../../templates');
const CORE_TEMPLATE_ROOT = path.join(TEMPLATE_ROOT, 'core');
const STACKS_TEMPLATE_ROOT = path.join(TEMPLATE_ROOT, 'stacks');
const TOOL_CODEX = 'codex';
const TOOL_CLAUDE = 'claude';
const SUPPORTED_TOOLS = new Set([TOOL_CODEX, TOOL_CLAUDE]);
const DEFAULT_TOOLS = [TOOL_CODEX, TOOL_CLAUDE];
const RUNTIME_TEMPLATE_ENTRIES = [
  '.gitignore',
  'config.yaml',
  'workflow.md',
  'scripts',
  'spec',
  'tasks',
  'workspace'
];

const COMMON_SKILL_DESCRIPTIONS = {
  'before-dev': 'Discovers and injects project-specific coding guidelines from .shelf/spec/ before implementation begins. Reads spec indexes, pre-development checklists, and shared thinking guides for the target package. Use when starting a new coding task, before writing any code, switching to a different package, or needing to refresh project conventions and standards.',
  brainstorm: 'Guides collaborative requirements discovery before implementation. Creates task directory, seeds PRD, asks high-value questions one at a time, researches technical choices, and converges on MVP scope. Use when requirements are unclear, there are multiple valid approaches, or the user describes a new feature or complex task.',
  'break-loop': 'Deep bug analysis to break the fix-forget-repeat cycle. Analyzes root cause category, why fixes failed, prevention mechanisms, and captures knowledge into specs. Use after fixing a bug to prevent the same class of bugs.',
  check: 'Comprehensive quality verification: spec compliance, lint, type-check, tests, cross-layer data flow, code reuse, and consistency checks. Use when code is written and needs quality verification, before committing changes, or to catch context drift during long sessions.',
  'update-spec': 'Captures executable contracts and coding conventions into .shelf/spec/ documents. Use when learning something valuable from debugging, implementing, or discussion that should be preserved for future sessions.'
};

const COMMAND_SKILL_DESCRIPTIONS = {
  continue: 'Resume work on the current task. Loads the workflow Phase Index, figures out which phase/step to pick up at, then pulls the step-level detail via get_context.py --mode phase. Use when coming back to an in-progress task and you need to know what to do next.',
  'finish-work': 'Wrap up the current session: verify quality gate passed, remind user to commit, archive completed tasks, and record session progress to the developer journal. Use when done coding and ready to end the session.',
  start: 'Initializes an AI development session by reading workflow guides, developer identity, git status, active tasks, and project guidelines from .shelf/. Classifies incoming tasks and routes to brainstorm, direct edit, or task workflow. Use when beginning a new coding session, resuming work, starting a new task, or re-establishing project context.'
};

const TOOL_TEMPLATE_CONTEXT = {
  [TOOL_CLAUDE]: {
    cliFlag: 'claude',
    commandRefPrefix: '/shelf:'
  },
  [TOOL_CODEX]: {
    cliFlag: 'codex',
    commandRefPrefix: '$'
  }
};

const LEGACY_WORKFLOW_SKILL_NAMES = new Set([
  'shelf-before-dev',
  'shelf-brainstorm',
  'shelf-break-loop',
  'shelf-check',
  'shelf-update-spec'
]);

const LEGACY_BUNDLED_SKILL_NAMES = new Set([
  'shelf-meta'
]);

const BUILT_IN_SKILL_NAMES = new Set([
  ...LEGACY_WORKFLOW_SKILL_NAMES,
  ...LEGACY_BUNDLED_SKILL_NAMES,
  'shelf-continue',
  'shelf-finish-work'
]);

const LEGACY_MANAGED_FILE_PATHS = new Set([
  '.codex/prompts/shelf-continue.md',
  '.codex/prompts/shelf-finish-work.md'
]);

const CONFLICT_TARGETS = [
  { relativePath: 'AGENTS.md', label: 'AGENTS.md', kind: 'path' },
  { relativePath: SOURCE_DIRECTORY_NAME, label: `${SOURCE_DIRECTORY_NAME}/`, kind: 'path' },
  { relativePath: '.agent-os', label: 'legacy .agent-os/', kind: 'legacy-path' },
  { relativePath: '.claude', label: '.claude/', kind: 'path' },
  { relativePath: '.codex', label: '.codex/', kind: 'path' },
  { relativePath: path.join('scripts', 'sync-agent-os.ps1'), label: 'legacy scripts/sync-agent-os.ps1', kind: 'legacy-path' }
];

function validateStack(stack) {
  if (!SUPPORTED_STACKS.has(stack)) {
    throw new Error(`Unsupported stack "${stack}". Available stacks: ${Array.from(SUPPORTED_STACKS).join(', ')}`);
  }

  return stack;
}

function resolveStackRoot(stack) {
  if (stack === 'core') {
    return CORE_TEMPLATE_ROOT;
  }

  const stackRoot = path.join(STACKS_TEMPLATE_ROOT, stack);
  if (fs.existsSync(stackRoot)) {
    return stackRoot;
  }

  return stackRoot;
}

function resolveAgentOsRoot(stack) {
  return path.join(resolveStackRoot(stack), SOURCE_DIRECTORY_NAME);
}

function resolveCoreAgentOsRoot() {
  return path.join(CORE_TEMPLATE_ROOT, SOURCE_DIRECTORY_NAME);
}

function copyLayeredAgentOs({ stack, targetDirectory }) {
  const destinationAgentOs = path.join(targetDirectory, SOURCE_DIRECTORY_NAME);
  const coreAgentOs = resolveCoreAgentOsRoot();
  ensureDirectory(destinationAgentOs);

  if (fs.existsSync(coreAgentOs)) {
    copyRuntimeTemplateEntries(coreAgentOs, destinationAgentOs);
  }

  if (stack !== 'core') {
    const stackAgentOs = resolveAgentOsRoot(stack);
    if (fs.existsSync(stackAgentOs)) {
      copyRuntimeTemplateEntries(stackAgentOs, destinationAgentOs);
    }
  }
}

function copyRuntimeTemplateEntries(sourceRoot, destinationRoot) {
  for (const entry of RUNTIME_TEMPLATE_ENTRIES) {
    const sourcePath = path.join(sourceRoot, entry);
    if (!fs.existsSync(sourcePath)) {
      continue;
    }

    fs.cpSync(sourcePath, path.join(destinationRoot, entry), { recursive: true, force: true });
  }
}

function normalizeTools(tools) {
  const rawTools = Array.isArray(tools)
    ? tools
    : String(tools || '').split(',');
  const normalized = rawTools
    .map((tool) => String(tool).trim().toLowerCase())
    .filter(Boolean);
  const uniqueTools = Array.from(new Set(normalized));

  if (uniqueTools.length === 0) {
    throw new Error(`At least one tool must be selected. Available tools: ${Array.from(SUPPORTED_TOOLS).join(', ')}`);
  }

  for (const tool of uniqueTools) {
    if (!SUPPORTED_TOOLS.has(tool)) {
      throw new Error(`Unsupported tool "${tool}". Available tools: ${Array.from(SUPPORTED_TOOLS).join(', ')}`);
    }
  }

  return uniqueTools;
}

function usesAgentOs(tools) {
  normalizeTools(tools);
  return true;
}

function getSelectedLabels(tools) {
  const selectedTools = normalizeTools(tools);
  const labels = new Set([`${SOURCE_DIRECTORY_NAME}/`]);

  if (selectedTools.includes(TOOL_CODEX) || selectedTools.includes(TOOL_CLAUDE)) {
    labels.add('AGENTS.md');
  }

  if (selectedTools.includes(TOOL_CODEX)) {
    labels.add('.codex/');
  }

  if (selectedTools.includes(TOOL_CLAUDE)) {
    labels.add('.claude/');
  }

  if (selectedTools.includes(TOOL_CODEX)) {
    labels.add('.agents/skills/');
  }

  return labels;
}

function getGitignoreEntries(tools) {
  const selectedTools = normalizeTools(tools);
  const entries = [`${SOURCE_DIRECTORY_NAME}/`];

  if (selectedTools.includes(TOOL_CODEX) || selectedTools.includes(TOOL_CLAUDE)) {
    entries.push('AGENTS.md');
  }

  if (selectedTools.includes(TOOL_CODEX)) {
    entries.push('AGENTS.md', '.codex/');
  }

  if (selectedTools.includes(TOOL_CLAUDE)) {
    entries.push('.claude/');
  }

  if (selectedTools.includes(TOOL_CODEX)) {
    entries.push('.agents/skills/');
  }

  return entries;
}

function copyTemplateFiles({ stack, targetDirectory, tools = DEFAULT_TOOLS }) {
  normalizeTools(tools);
  copyLayeredAgentOs({ stack, targetDirectory });
}

function removeManagedInstallFiles(targetDirectory) {
  const managedFiles = collectManagedFiles(targetDirectory);
  const removedFiles = [];

  for (const relativeFile of managedFiles.sort((a, b) => b.length - a.length)) {
    const absolutePath = path.join(targetDirectory, relativeFile);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    if (fs.statSync(absolutePath).isDirectory()) {
      continue;
    }

    removePathIfExists(absolutePath);
    removedFiles.push(normalizeRelativePath(relativeFile));
    removeEmptyParents(path.dirname(absolutePath), targetDirectory);
  }

  return removedFiles;
}

function collectManagedFiles(targetDirectory) {
  const manifest = readAgentOsManifest(targetDirectory);
  const files = new Set();

  if (manifest && Array.isArray(manifest.generatedFiles)) {
    for (const filePath of manifest.generatedFiles) {
      if (isManagedInstallFile(filePath)) {
        files.add(normalizeRelativePath(filePath));
      }
    }
  }

  for (const legacyPath of LEGACY_MANAGED_FILE_PATHS) {
    if (fs.existsSync(path.join(targetDirectory, legacyPath))) {
      files.add(legacyPath);
    }
  }

  files.add(path.join('scripts', 'sync-agent-os.ps1'));

  return Array.from(files);
}

function collectConflicts(targetDirectory) {
  const conflicts = [];

  for (const item of CONFLICT_TARGETS) {
    const absolutePath = path.join(targetDirectory, item.relativePath);
    if (fs.existsSync(absolutePath)) {
      conflicts.push({ ...item, absolutePath });
    }
  }

  const packageJsonPath = path.join(targetDirectory, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = readJsonFile(packageJsonPath);
    if (packageJson.scripts && Object.prototype.hasOwnProperty.call(packageJson.scripts, 'agent-os:sync')) {
      conflicts.push({
        label: 'legacy package.json -> scripts.agent-os:sync',
        kind: 'legacy-package-script',
        absolutePath: packageJsonPath
      });
    }
  }

  return conflicts;
}

function syncAgentOs(targetDirectory, tools = DEFAULT_TOOLS, stack = 'core', options = {}) {
  const templates = collectProjectionTemplates(targetDirectory, tools, stack);
  const skipPaths = new Set((options.skipPaths || []).map(normalizeRelativePath));
  const generatedFiles = [];

  for (const template of templates) {
    if (template.skip || skipPaths.has(template.path)) {
      continue;
    }

    const destinationPath = path.join(targetDirectory, template.path);
    ensureDirectory(path.dirname(destinationPath));
    writeProjectionTemplate(destinationPath, template);
    generatedFiles.push(template.path);
  }

  ensureOptionalToolDirectories(targetDirectory, tools);

  return Array.from(new Set(generatedFiles.map(normalizeRelativePath)));
}

function collectProjectionTemplates(targetDirectory, tools = DEFAULT_TOOLS, stack = 'core') {
  validateStack(stack);
  const selectedTools = normalizeTools(tools);
  const agentOsDirectory = path.join(targetDirectory, SOURCE_DIRECTORY_NAME);
  const sharedRulesPath = resolveTemplateSourceFile(targetDirectory, stack, path.join('rules', 'AGENTS.shared.md'));
  const claudeSettingsPath = resolveTemplateSourceFile(targetDirectory, stack, path.join('templates', 'claude-settings.json'));
  const bundledSkillTemplates = collectTemplateSourceFiles(targetDirectory, stack, path.join('templates', 'bundled-skills'));
  const commonCommandTemplates = collectTemplateSourceFiles(targetDirectory, stack, path.join('templates', 'common-commands'));
  const commonSkillTemplates = collectTemplateSourceFiles(targetDirectory, stack, path.join('templates', 'common-skills'))
    .filter((skillFile) => shouldProjectCommonSkillTemplate(skillFile.relativePath));
  const codexConfigPath = resolveTemplateSourceFile(targetDirectory, stack, path.join('templates', 'codex-config.toml'));
  const codexHooksConfigPath = resolveTemplateSourceFile(targetDirectory, stack, path.join('templates', 'codex-hooks.json'));
  const codexHookTemplates = collectTemplateSourceFiles(targetDirectory, stack, path.join('templates', 'codex-hooks'));
  const sharedHookFilesByName = Object.fromEntries(
    collectTemplateSourceFiles(targetDirectory, stack, path.join('templates', 'shared-hooks'))
      .map((hookFile) => [path.basename(hookFile.relativePath), hookFile.sourcePath])
  );
  const customSkillsDirectory = path.join(agentOsDirectory, 'skills');
  const agentTemplates = collectTemplateSourceFiles(targetDirectory, stack, 'agents');
  const customSkillTemplates = collectSkillTemplates(customSkillsDirectory);
  const projectLocalSkillTemplates = customSkillTemplates
    .filter((skillFile) => !isBuiltInSkillName(skillFile.skillName));
  const legacyWorkflowSkillTemplates = customSkillTemplates
    .filter((skillFile) => LEGACY_WORKFLOW_SKILL_NAMES.has(skillFile.skillName));
  const legacyBundledSkillTemplates = customSkillTemplates
    .filter((skillFile) => LEGACY_BUNDLED_SKILL_NAMES.has(skillFile.skillName));
  const templates = [{
    managedBlock: true,
    path: 'AGENTS.md',
    sourcePath: sharedRulesPath
  }];

  assertPathExists(sharedRulesPath, 'shared rules file');

  for (const tool of selectedTools) {
    const layout = getToolLayout(tool);
    if (layout.entryFile && normalizeRelativePath(layout.entryFile) !== 'AGENTS.md') {
      templates.push({
        managedBlock: Boolean(layout.capabilities && layout.capabilities.managedEntryBlock),
        path: normalizeRelativePath(layout.entryFile),
        sourcePath: sharedRulesPath,
        tool
      });
    }

    if (tool === TOOL_CLAUDE && layout.capabilities && layout.capabilities.settings && fs.existsSync(claudeSettingsPath)) {
      templates.push({
        path: normalizeRelativePath(path.join(layout.rootDirectory, 'settings.json')),
        sourcePath: claudeSettingsPath,
        transform: getTemplatePlaceholderTransform(tool),
        tool
      });
    }

    if (tool === TOOL_CODEX && layout.capabilities && layout.capabilities.settings && fs.existsSync(codexConfigPath)) {
      templates.push({
        path: normalizeRelativePath(path.join(layout.rootDirectory, 'config.toml')),
        sourcePath: codexConfigPath,
        tool
      });
    }

    if (layout.capabilities && layout.capabilities.hooks) {
      for (const hook of getSharedHookScriptsForPlatform(tool, {
        agentOsDirectory,
        sharedHookFilesByName
      })) {
        templates.push({
          path: normalizeRelativePath(path.join(layout.rootDirectory, 'hooks', hook.name)),
          sourcePath: hook.sourcePath,
          tool
        });
      }
    }

    if (tool === TOOL_CODEX && layout.capabilities && layout.capabilities.hooks) {
      if (fs.existsSync(codexHooksConfigPath)) {
        templates.push({
          path: normalizeRelativePath(path.join(layout.rootDirectory, 'hooks.json')),
          sourcePath: codexHooksConfigPath,
          transform: getTemplatePlaceholderTransform(tool),
          tool
        });
      }

      if (codexHookTemplates.length > 0) {
        for (const hookFile of codexHookTemplates) {
          templates.push({
            path: normalizeRelativePath(path.join(layout.rootDirectory, 'hooks', hookFile.relativePath)),
            sourcePath: hookFile.sourcePath,
            tool
          });
        }
      }
    }

    if (layout.capabilities && layout.capabilities.commands && commonCommandTemplates.length > 0) {
      for (const commandFile of commonCommandTemplates) {
        if (!shouldProjectCommandTemplate(layout, commandFile.relativePath)) {
          continue;
        }

        templates.push({
          path: normalizeRelativePath(path.join(layout.rootDirectory, 'commands', 'shelf', commandFile.relativePath)),
          sourcePath: commandFile.sourcePath,
          transform: getCommandTransform(tool),
          tool
        });
      }
    }

    if (tool === TOOL_CODEX && layout.capabilities && layout.capabilities.openAgentSkills && commonCommandTemplates.length > 0) {
      for (const commandFile of commonCommandTemplates) {
        if (!shouldProjectCommandTemplate(layout, commandFile.relativePath)) {
          continue;
        }

        const commandName = path.basename(commandFile.relativePath, path.extname(commandFile.relativePath));
        templates.push({
          path: normalizeRelativePath(path.join('.agents', 'skills', `shelf-${commandName}`, 'SKILL.md')),
          sourcePath: commandFile.sourcePath,
          transform: getCommandSkillTransform(tool, commandFile.relativePath),
          tool,
          virtualSharedPath: true
        });
      }
    }

    if (commonSkillTemplates.length > 0) {
      for (const skillFile of commonSkillTemplates) {
        const skillName = `shelf-${path.basename(skillFile.relativePath, path.extname(skillFile.relativePath))}`;
        const transform = getCommonSkillTransform(tool, skillFile.relativePath);
        const skillTargetPath = `${skillName}/SKILL.md`;

        if (supportsSharedToolScopedSkills(tool, layout)) {
          templates.push({
            path: normalizeRelativePath(path.join(layout.skillsDirectory, skillTargetPath)),
            sourcePath: skillFile.sourcePath,
            transform,
            tool
          });
        }

        if (layout.capabilities && layout.capabilities.openAgentSkills) {
          templates.push({
            path: normalizeRelativePath(path.join('.agents', 'skills', skillTargetPath)),
            sourcePath: skillFile.sourcePath,
            transform,
            tool,
            virtualSharedPath: true
          });
        }
      }
    }
    else {
      for (const skillFile of legacyWorkflowSkillTemplates) {
        if (layout.capabilities && layout.capabilities.toolScopedSkills) {
          templates.push({
            path: normalizeRelativePath(path.join(layout.skillsDirectory, skillFile.relativePath)),
            sourcePath: skillFile.sourcePath,
            tool
          });
        }

        if (layout.capabilities && layout.capabilities.openAgentSkills) {
          templates.push({
            path: normalizeRelativePath(path.join('.agents', 'skills', skillFile.relativePath)),
            sourcePath: skillFile.sourcePath,
            tool,
            virtualSharedPath: true
          });
        }
      }
    }

    if (bundledSkillTemplates.length > 0) {
      for (const bundledSkill of bundledSkillTemplates) {
        const transform = getBundledSkillTransform(tool);

        if (supportsSharedToolScopedSkills(tool, layout)) {
          templates.push({
            path: normalizeRelativePath(path.join(layout.skillsDirectory, bundledSkill.relativePath)),
            sourcePath: bundledSkill.sourcePath,
            transform,
            tool
          });
        }

        if (layout.capabilities && layout.capabilities.openAgentSkills) {
          templates.push({
            path: normalizeRelativePath(path.join('.agents', 'skills', bundledSkill.relativePath)),
            sourcePath: bundledSkill.sourcePath,
            transform,
            tool,
            virtualSharedPath: true
          });
        }
      }
    }
    else {
      for (const bundledSkill of legacyBundledSkillTemplates) {
        if (layout.capabilities && layout.capabilities.toolScopedSkills) {
          templates.push({
            path: normalizeRelativePath(path.join(layout.skillsDirectory, bundledSkill.relativePath)),
            sourcePath: bundledSkill.sourcePath,
            tool
          });
        }

        if (layout.capabilities && layout.capabilities.openAgentSkills) {
          templates.push({
            path: normalizeRelativePath(path.join('.agents', 'skills', bundledSkill.relativePath)),
            sourcePath: bundledSkill.sourcePath,
            tool,
            virtualSharedPath: true
          });
        }
      }
    }

    if (supportsSharedToolScopedSkills(tool, layout)) {
      for (const skillFile of projectLocalSkillTemplates) {
        templates.push({
          path: normalizeRelativePath(path.join(layout.skillsDirectory, skillFile.relativePath)),
          sourcePath: skillFile.sourcePath,
          tool
        });
      }
    }

    if (layout.capabilities && layout.capabilities.openAgentSkills) {
      for (const skillFile of projectLocalSkillTemplates) {
        templates.push({
          path: normalizeRelativePath(path.join('.agents', 'skills', skillFile.relativePath)),
          sourcePath: skillFile.sourcePath,
          tool,
          virtualSharedPath: true
        });
      }
    }

    if (layout.agentsDirectory && agentTemplates.length > 0) {
      for (const agentFile of agentTemplates) {
        templates.push({
          path: getAgentProjectionPath(layout, tool, agentFile.relativePath),
          sourcePath: agentFile.sourcePath,
          transform: getAgentTransform(tool, agentFile.relativePath),
          tool
        });
      }
    }
  }

  return templates.sort((a, b) => a.path.localeCompare(b.path));
}

function getProjectionTemplateContent(template) {
  const content = fs.readFileSync(template.sourcePath, 'utf8');
  return template.transform ? template.transform(content) : content;
}

function shouldProjectCommandTemplate(layout, commandFile) {
  return !(layout.capabilities && layout.capabilities.agents && path.basename(commandFile).toLowerCase() === 'start.md');
}

function shouldProjectCommonSkillTemplate(skillFile) {
  return path.basename(skillFile).toLowerCase() !== 'start.md';
}

function isBuiltInSkillName(skillName) {
  return BUILT_IN_SKILL_NAMES.has(skillName);
}

function supportsSharedToolScopedSkills(tool, layout) {
  return Boolean(layout.capabilities && layout.capabilities.projectedToolScopedSkills);
}

function getAgentProjectionPath(layout, tool, agentFile) {
  if (tool === TOOL_CODEX && agentFile.endsWith('.md')) {
    const tomlFile = agentFile.replace(/\.md$/, '.toml');
    return normalizeRelativePath(path.join(layout.agentsDirectory, tomlFile));
  }

  return normalizeRelativePath(path.join(layout.agentsDirectory, agentFile));
}

function writeProjectionTemplate(destinationPath, template) {
  const desiredContent = getProjectionTemplateContent(template);

  if (template.managedBlock && fs.existsSync(destinationPath)) {
    const currentContent = fs.readFileSync(destinationPath, 'utf8');
    const result = replaceManagedBlock(currentContent, desiredContent);
    fs.writeFileSync(destinationPath, result.content, 'utf8');
    return;
  }

  fs.writeFileSync(destinationPath, desiredContent, 'utf8');
}

function getAgentTransform(tool, agentFile) {
  if (tool === TOOL_CODEX && agentFile.endsWith('.md')) {
    return transformMarkdownAgentToCodexToml;
  }

  return null;
}

function getCommandTransform(tool) {
  return (content) => resolveTemplatePlaceholders(content, tool).trimEnd() + '\n';
}

function getCommandSkillTransform(tool, commandFile) {
  const commandName = path.basename(commandFile, path.extname(commandFile));
  const skillName = `shelf-${commandName}`;

  return (content) => wrapCommandAsSkill(
    skillName,
    getCommandSkillDescription(commandName),
    resolveTemplatePlaceholders(content, tool)
  );
}

function getCommonSkillTransform(tool, skillFile) {
  const skillBaseName = path.basename(skillFile, path.extname(skillFile));
  const skillName = `shelf-${skillBaseName}`;

  return (content) => wrapCommonSkill(
    skillName,
    getCommonSkillDescription(skillBaseName),
    resolveTemplatePlaceholders(content, tool)
  );
}

function getBundledSkillTransform(tool) {
  return (content) => resolveTemplatePlaceholders(content, tool);
}

function getTemplatePlaceholderTransform(tool) {
  return (content) => resolveTemplatePlaceholders(content, tool);
}

function resolveTemplatePlaceholders(content, tool) {
  const context = getTemplateContext(tool);

  return String(content)
    .replace(/\{\{PYTHON_CMD\}\}/g, context.pythonCmd)
    .replace(/\{\{CLI_FLAG\}\}/g, context.cliFlag)
    .replace(/\{\{CMD_REF:([\w][\w-]*)\}\}/g, (_match, commandName) => `${context.commandRefPrefix}${commandName}`)
    .replace(/\{\{EXECUTOR_AI\}\}/g, context.executorAI)
    .replace(/\{\{USER_ACTION_LABEL\}\}/g, context.userActionLabel)
    .replace(/\{\{#AGENT_CAPABLE\}\}([\s\S]*?)\{\{\/AGENT_CAPABLE\}\}/g, context.agentCapable ? '$1' : '')
    .replace(/\{\{\^AGENT_CAPABLE\}\}([\s\S]*?)\{\{\/AGENT_CAPABLE\}\}/g, context.agentCapable ? '' : '$1')
    .replace(/\{\{#HAS_HOOKS\}\}([\s\S]*?)\{\{\/HAS_HOOKS\}\}/g, context.hasHooks ? '$1' : '')
    .replace(/\{\{\^HAS_HOOKS\}\}([\s\S]*?)\{\{\/HAS_HOOKS\}\}/g, context.hasHooks ? '' : '$1')
    .replace(/\n{3,}/g, '\n\n');
}

function getTemplateContext(tool) {
  const baseContext = TOOL_TEMPLATE_CONTEXT[tool] || {};
  return {
    agentCapable: isAgentCapable(tool),
    cliFlag: baseContext.cliFlag || '',
    commandRefPrefix: baseContext.commandRefPrefix || '',
    executorAI: getExecutorDescription(tool),
    hasHooks: layoutHasHooks(tool),
    pythonCmd: getPythonTemplateCommand(),
    userActionLabel: getUserActionLabel(tool)
  };
}

function getPythonTemplateCommand(platform = process.platform) {
  return platform === 'win32' ? 'python' : 'python3';
}

function getCommandSkillDescription(commandName) {
  const description = COMMAND_SKILL_DESCRIPTIONS[commandName];
  if (!description) {
    throw new Error(`Missing command skill description for "${commandName}".`);
  }

  return description;
}

function getCommonSkillDescription(skillName) {
  const description = COMMON_SKILL_DESCRIPTIONS[skillName];
  if (!description) {
    throw new Error(`Missing common skill description for "${skillName}".`);
  }

  return description;
}

function wrapCommandAsSkill(name, description, content) {
  return [
    '---',
    `name: ${name}`,
    `description: ${yamlDoubleQuoted(description)}`,
    '---',
    '',
    String(content).trim(),
    ''
  ].join('\n');
}

function wrapCommonSkill(name, description, content) {
  return [
    '---',
    `name: ${name}`,
    `description: ${yamlDoubleQuoted(description)}`,
    '---',
    '',
    String(content).trim(),
    ''
  ].join('\n');
}

function getExecutorDescription(tool) {
  if (tool === TOOL_CODEX) {
    return 'Bash scripts or tool calls';
  }

  return 'Bash scripts or Task calls';
}

function getUserActionLabel(tool) {
  if (tool === TOOL_CODEX) {
    return 'Skills';
  }

  return 'Slash commands';
}

function isAgentCapable(tool) {
  const layout = getToolLayout(tool);
  return Boolean(layout.capabilities && layout.capabilities.agents);
}

function layoutHasHooks(tool) {
  const layout = getToolLayout(tool);
  return Boolean(layout.capabilities && layout.capabilities.hooks);
}

function transformMarkdownAgentToCodexToml(content) {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!frontmatterMatch) {
    return content;
  }

  const frontmatter = frontmatterMatch[1];
  const body = content.slice(frontmatterMatch[0].length).trim();
  const name = readYamlScalar(frontmatter, 'name') || 'shelf-agent';
  const description = readYamlBlock(frontmatter, 'description') || readYamlScalar(frontmatter, 'description') || name;
  const sandboxMode = inferCodexSandboxMode(frontmatter, body);
  const instructions = body.replace(/\r\n/g, '\n').trim();

  return [
    `name = ${tomlString(name)}`,
    `description = ${tomlString(description.trim())}`,
    `sandbox_mode = ${tomlString(sandboxMode)}`,
    '',
    `developer_instructions = ${tomlMultilineString(instructions)}`,
    ''
  ].join('\n');
}

function readYamlScalar(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${escapeRegExp(key)}:\\s*(.+?)\\s*$`, 'm'));
  if (!match) {
    return null;
  }

  const value = match[1].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}

function readYamlBlock(frontmatter, key) {
  const lines = frontmatter.replace(/\r\n/g, '\n').split('\n');

  for (let index = 0; index < lines.length; index += 1) {
    if (!new RegExp(`^${escapeRegExp(key)}:\\s*[|>]\\s*$`).test(lines[index])) {
      continue;
    }

    const blockLines = [];
    for (let blockIndex = index + 1; blockIndex < lines.length; blockIndex += 1) {
      const line = lines[blockIndex];
      if (/^\S/.test(line)) {
        break;
      }
      blockLines.push(line.replace(/^  /, ''));
    }

    return blockLines.join('\n').trim();
  }

  return null;
}

function inferCodexSandboxMode(frontmatter, body) {
  const tools = readYamlScalar(frontmatter, 'tools') || '';
  const text = `${tools}\n${body}`;
  return /\b(edit|write)\b/i.test(text) ? 'workspace-write' : 'read-only';
}

function tomlString(value) {
  return JSON.stringify(String(value));
}

function tomlMultilineString(value) {
  return `"""\n${String(value).replace(/"""/g, '\\"\\"\\"')}\n"""`;
}

function yamlDoubleQuoted(value) {
  return `"${String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function writeAgentOsManifest(targetDirectory, { stack = 'core', tools = DEFAULT_TOOLS, generatedFiles = [] } = {}) {
  const selectedTools = normalizeTools(tools);
  const manifestPath = path.join(targetDirectory, SOURCE_DIRECTORY_NAME, 'manifest.json');
  const manifest = {
    schemaVersion: 1,
    cliVersion: packageJson.version,
    template: 'core',
    stacks: stack === 'core' ? [] : [stack],
    tools: selectedTools,
    generatedFiles: filterManagedGeneratedFiles(generatedFiles),
    updatedAt: new Date().toISOString()
  };

  ensureDirectory(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

function recordAgentOsMetadata(targetDirectory, { preserveHashPaths = [], stack = 'core', tools = DEFAULT_TOOLS, generatedFiles = [] } = {}) {
  const projectionTemplates = collectProjectionTemplates(targetDirectory, tools, stack);
  const projectionContentByPath = {};
  for (const template of projectionTemplates) {
    const content = getProjectionTemplateContent(template);
    projectionContentByPath[normalizeRelativePath(template.path)] = template.managedBlock
      ? extractManagedBlock(content) || content
      : content;
  }
  const manifest = writeAgentOsManifest(targetDirectory, { stack, tools, generatedFiles });
  const filesToHash = Array.from(new Set([
    `${SOURCE_DIRECTORY_NAME}/manifest.json`,
    ...filterManagedGeneratedFiles(generatedFiles)
  ].map(normalizeRelativePath)));

  const hashes = writeTemplateHashes(targetDirectory, filesToHash, {
    contentByPath: projectionContentByPath,
    preservePaths: preserveHashPaths
  });

  return {
    hashes,
    manifest
  };
}

function readAgentOsManifest(targetDirectory) {
  const manifestPath = path.join(targetDirectory, SOURCE_DIRECTORY_NAME, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  return readJsonFile(manifestPath);
}

function collectFiles(rootDirectory, relativeTo) {
  if (!fs.existsSync(rootDirectory)) {
    return [];
  }

  const files = [];
  for (const entry of fs.readdirSync(rootDirectory, { withFileTypes: true })) {
    const absolutePath = path.join(rootDirectory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(absolutePath, relativeTo));
    }
    else if (entry.isFile()) {
      files.push(path.relative(relativeTo, absolutePath));
    }
  }

  return files;
}

function collectBundledSkillTemplates(bundledSkillsDirectory) {
  if (!fs.existsSync(bundledSkillsDirectory)) {
    return [];
  }

  const templates = [];
  for (const skillEntry of fs.readdirSync(bundledSkillsDirectory, { withFileTypes: true })) {
    if (!skillEntry.isDirectory()) {
      continue;
    }

    const skillRoot = path.join(bundledSkillsDirectory, skillEntry.name);
    for (const filePath of collectFiles(skillRoot, skillRoot)) {
      templates.push({
        relativePath: normalizeRelativePath(path.join(skillEntry.name, filePath)),
        sourcePath: path.join(skillRoot, filePath)
      });
    }
  }

  return templates.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function collectSkillTemplates(skillsDirectory) {
  if (!fs.existsSync(skillsDirectory)) {
    return [];
  }

  const templates = [];
  for (const skillEntry of fs.readdirSync(skillsDirectory, { withFileTypes: true })) {
    if (!skillEntry.isDirectory()) {
      continue;
    }

    const skillRoot = path.join(skillsDirectory, skillEntry.name);
    if (!fs.existsSync(path.join(skillRoot, 'SKILL.md'))) {
      continue;
    }

    for (const filePath of collectFiles(skillRoot, skillRoot)) {
      templates.push({
        relativePath: normalizeRelativePath(path.join(skillEntry.name, filePath)),
        skillName: skillEntry.name,
        sourcePath: path.join(skillRoot, filePath)
      });
    }
  }

  return templates.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function normalizeRelativePath(relativePath) {
  return String(relativePath).replace(/\\/g, '/');
}

function removeEmptyParents(directoryPath, stopDirectory) {
  let currentDirectory = directoryPath;
  const resolvedStop = path.resolve(stopDirectory);

  while (path.resolve(currentDirectory).startsWith(resolvedStop) && path.resolve(currentDirectory) !== resolvedStop) {
    if (!removeDirectoryIfEmpty(currentDirectory)) {
      return;
    }
    currentDirectory = path.dirname(currentDirectory);
  }
}

function removeLegacyPackageJsonScript(targetDirectory) {
  const packageJsonPath = path.join(targetDirectory, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return { updated: false };
  }

  const packageJson = readJsonFile(packageJsonPath);
  packageJson.scripts = packageJson.scripts || {};

  if (!Object.prototype.hasOwnProperty.call(packageJson.scripts, 'agent-os:sync')) {
    return { updated: false, removed: false };
  }

  delete packageJson.scripts['agent-os:sync'];
  if (Object.keys(packageJson.scripts).length === 0) {
    delete packageJson.scripts;
  }
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

  return { updated: true, removed: true };
}

function assertPathExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Missing ${label}: ${targetPath}`);
  }
}

function ensureOptionalToolDirectories(targetDirectory, tools) {
  for (const tool of normalizeTools(tools)) {
    const layout = getToolLayout(tool);
    for (const relativeDir of layout.optionalDirs || []) {
      ensureDirectory(path.join(targetDirectory, relativeDir));
    }
    if (layout.skillsDirectory) {
      ensureDirectory(path.join(targetDirectory, layout.skillsDirectory));
    }
  }
}

function collectTemplateSourceFiles(targetDirectory, stack, relativePath) {
  const filesByRelativePath = new Map();

  for (const candidate of getTemplateOverlayCandidates(targetDirectory, stack, relativePath)) {
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isDirectory()) {
      continue;
    }

    for (const filePath of collectFiles(candidate, candidate)) {
      const normalizedRelativePath = normalizeRelativePath(filePath);
      filesByRelativePath.set(normalizedRelativePath, {
        relativePath: normalizedRelativePath,
        sourcePath: path.join(candidate, filePath)
      });
    }
  }

  return Array.from(filesByRelativePath.values())
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function resolveTemplateSourceFile(targetDirectory, stack, relativePath) {
  for (const candidate of getTemplateSourceCandidates(targetDirectory, stack, relativePath)) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return path.join(resolveCoreAgentOsRoot(), relativePath);
}

function resolveTemplateSourceDirectory(targetDirectory, stack, relativePath) {
  for (const candidate of getTemplateSourceCandidates(targetDirectory, stack, relativePath)) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
  }

  return path.join(resolveCoreAgentOsRoot(), relativePath);
}

function getTemplateSourceCandidates(targetDirectory, stack, relativePath) {
  const candidates = [
    path.join(targetDirectory, SOURCE_DIRECTORY_NAME, relativePath)
  ];

  if (stack !== 'core') {
    candidates.push(path.join(resolveAgentOsRoot(stack), relativePath));
  }

  candidates.push(path.join(resolveCoreAgentOsRoot(), relativePath));
  return candidates;
}

function getTemplateOverlayCandidates(targetDirectory, stack, relativePath) {
  const candidates = [
    path.join(resolveCoreAgentOsRoot(), relativePath)
  ];

  if (stack !== 'core') {
    candidates.push(path.join(resolveAgentOsRoot(stack), relativePath));
  }

  candidates.push(path.join(targetDirectory, SOURCE_DIRECTORY_NAME, relativePath));
  return candidates;
}

function isProjectionManagedPath(filePath) {
  const normalizedPath = normalizeRelativePath(filePath);
  return normalizedPath === 'AGENTS.md'
    || normalizedPath.startsWith('.codex/')
    || normalizedPath.startsWith('.claude/')
    || normalizedPath.startsWith('.agents/skills/');
}

function isManagedInstallFile(filePath) {
  const normalizedPath = normalizeRelativePath(filePath);
  return isProjectionManagedPath(normalizedPath)
    || LEGACY_MANAGED_FILE_PATHS.has(normalizedPath);
}

function filterManagedGeneratedFiles(generatedFiles = []) {
  return Array.from(new Set(
    generatedFiles
      .map(normalizeRelativePath)
      .filter((filePath) => isManagedInstallFile(filePath))
  )).sort();
}

module.exports = {
  DEFAULT_TOOLS,
  SOURCE_DIRECTORY_NAME,
  collectManagedFiles,
  resolveAgentOsRoot,
  resolveStackRoot,
  TOOL_CLAUDE,
  TOOL_CODEX,
  collectConflicts,
  collectProjectionTemplates,
  copyTemplateFiles,
  getProjectionTemplateContent,
  getGitignoreEntries,
  getSelectedLabels,
  normalizeTools,
  readAgentOsManifest,
  recordAgentOsMetadata,
  removeManagedInstallFiles,
  removeLegacyPackageJsonScript,
  syncAgentOs,
  usesAgentOs,
  writeAgentOsManifest,
  validateStack
};
