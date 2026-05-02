const fs = require('fs');
const path = require('path');
const packageJson = require('../../package.json');
const { ensureDirectory, removeDirectoryIfEmpty, removePathIfExists } = require('./fs');
const { extractManagedBlock, replaceManagedBlock } = require('./managed-blocks');
const { getToolLayout } = require('./tool-layouts');
const { HASHES_FILE, loadTemplateHashes, writeTemplateHashes } = require('./template-hash');

const SOURCE_DIRECTORY_NAME = '.shelf';
const SUPPORTED_STACKS = new Set(['core']);
const TEMPLATE_ROOT = path.resolve(__dirname, '../../templates');
const CORE_TEMPLATE_ROOT = path.join(TEMPLATE_ROOT, 'core');
const STACKS_TEMPLATE_ROOT = path.join(TEMPLATE_ROOT, 'stacks');
const TOOL_CODEX = 'codex';
const TOOL_CLAUDE = 'claude';
const SUPPORTED_TOOLS = new Set([TOOL_CODEX, TOOL_CLAUDE]);
const DEFAULT_TOOLS = [TOOL_CODEX, TOOL_CLAUDE];

const CONFLICT_TARGETS = [
  { relativePath: 'AGENTS.md', label: 'AGENTS.md', kind: 'path' },
  { relativePath: 'CLAUDE.md', label: 'CLAUDE.md', kind: 'path' },
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

  if (fs.existsSync(coreAgentOs)) {
    fs.cpSync(coreAgentOs, destinationAgentOs, { recursive: true, force: true });
  }

  if (stack !== 'core') {
    const stackAgentOs = resolveAgentOsRoot(stack);
    if (fs.existsSync(stackAgentOs)) {
      fs.cpSync(stackAgentOs, destinationAgentOs, { recursive: true, force: true });
    }
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

  if (selectedTools.includes(TOOL_CODEX)) {
    labels.add('AGENTS.md');
    labels.add('.codex/');
  }

  if (selectedTools.includes(TOOL_CLAUDE)) {
    labels.add('CLAUDE.md');
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

  if (selectedTools.includes(TOOL_CODEX)) {
    entries.push('AGENTS.md', '.codex/');
  }

  if (selectedTools.includes(TOOL_CLAUDE)) {
    entries.push('CLAUDE.md', '.claude/');
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
  const hashes = loadTemplateHashes(targetDirectory);
  const files = new Set();

  if (manifest && Array.isArray(manifest.generatedFiles)) {
    for (const filePath of manifest.generatedFiles) {
      files.add(normalizeRelativePath(filePath));
    }
  }

  for (const filePath of Object.keys(hashes)) {
    files.add(normalizeRelativePath(filePath));
  }

  for (const tool of DEFAULT_TOOLS) {
    const layout = getToolLayout(tool);
    files.add(layout.entryFile);
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
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
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

  return Array.from(new Set(generatedFiles.map(normalizeRelativePath)));
}

function collectProjectionTemplates(targetDirectory, tools = DEFAULT_TOOLS, stack = 'core') {
  validateStack(stack);
  const selectedTools = normalizeTools(tools);
  const agentOsDirectory = path.join(targetDirectory, SOURCE_DIRECTORY_NAME);
  const sharedRulesPath = path.join(agentOsDirectory, 'rules', 'AGENTS.shared.md');
  const claudeTemplatePath = path.join(agentOsDirectory, 'templates', 'CLAUDE.md');
  const claudeSettingsPath = path.join(agentOsDirectory, 'templates', 'claude-settings.json');
  const claudeCommandsDirectory = path.join(agentOsDirectory, 'templates', 'claude-commands');
  const claudeHooksDirectory = path.join(agentOsDirectory, 'templates', 'claude-hooks');
  const skillsDirectory = path.join(agentOsDirectory, 'skills');
  const agentsDirectory = path.join(agentOsDirectory, 'agents');
  const templates = [];

  assertPathExists(sharedRulesPath, 'shared rules file');
  assertPathExists(claudeTemplatePath, 'Claude template');
  assertPathExists(skillsDirectory, 'skills directory');

  for (const tool of selectedTools) {
    const layout = getToolLayout(tool);
    const entrySourcePath = layout.entrySource === 'claude-template' ? claudeTemplatePath : sharedRulesPath;
    templates.push({
      managedBlock: Boolean(layout.capabilities && layout.capabilities.managedEntryBlock),
      path: normalizeRelativePath(layout.entryFile),
      sourcePath: entrySourcePath,
      tool
    });

    if (layout.capabilities && layout.capabilities.settings && fs.existsSync(claudeSettingsPath)) {
      templates.push({
        path: normalizeRelativePath(path.join(layout.rootDirectory, 'settings.json')),
        sourcePath: claudeSettingsPath,
        tool
      });
    }

    if (layout.capabilities && layout.capabilities.hooks && fs.existsSync(claudeHooksDirectory)) {
      for (const hookFile of collectFiles(claudeHooksDirectory, claudeHooksDirectory)) {
        templates.push({
          path: normalizeRelativePath(path.join(layout.rootDirectory, 'hooks', hookFile)),
          sourcePath: path.join(claudeHooksDirectory, hookFile),
          tool
        });
      }
    }

    if (layout.capabilities && layout.capabilities.commands && fs.existsSync(claudeCommandsDirectory)) {
      for (const commandFile of collectFiles(claudeCommandsDirectory, claudeCommandsDirectory)) {
        templates.push({
          path: normalizeRelativePath(path.join(layout.rootDirectory, 'commands', commandFile)),
          sourcePath: path.join(claudeCommandsDirectory, commandFile),
          tool
        });
      }
    }

    const skillFiles = collectFiles(skillsDirectory, skillsDirectory);
    for (const skillFile of skillFiles) {
      templates.push({
        path: normalizeRelativePath(path.join(layout.skillsDirectory, skillFile)),
        sourcePath: path.join(skillsDirectory, skillFile),
        tool
      });
    }

    if (layout.capabilities && layout.capabilities.openAgentSkills) {
      for (const skillFile of skillFiles) {
        templates.push({
          path: normalizeRelativePath(path.join('.agents', 'skills', skillFile)),
          sourcePath: path.join(skillsDirectory, skillFile),
          tool,
          virtualSharedPath: true
        });
      }
    }

    if (layout.agentsDirectory && fs.existsSync(agentsDirectory)) {
      for (const agentFile of collectFiles(agentsDirectory, agentsDirectory)) {
        templates.push({
          path: normalizeRelativePath(path.join(layout.agentsDirectory, agentFile)),
          sourcePath: path.join(agentsDirectory, agentFile),
          transform: getAgentTransform(tool, agentFile),
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
  if (tool !== TOOL_CODEX) {
    return null;
  }

  const normalizedAgentFile = normalizeRelativePath(agentFile);
  if (normalizedAgentFile === 'implement.md') {
    return (content) => injectCodexAgentPrelude(content, 'implement');
  }
  if (normalizedAgentFile === 'check.md') {
    return (content) => injectCodexAgentPrelude(content, 'check');
  }

  return null;
}

function injectCodexAgentPrelude(content, action) {
  const jsonlFile = action === 'check' ? 'check.jsonl' : 'implement.jsonl';
  const prelude = `## Required: Load Shelf Context First

Codex agents do not receive Shelf task context through hooks. Before doing any ${action === 'check' ? 'review or fixes' : 'implementation'} work:

1. Run \`python3 ./.shelf/scripts/task.py current --source\` to find the active task path.
2. Read the task's \`prd.md\` and \`info.md\` if present.
3. Read \`<task-path>/${jsonlFile}\`.
4. For every JSONL row with a \`"file"\` field, read that referenced spec or research file before proceeding.

If there is no active task, no \`prd.md\`, or the JSONL file has no curated entries, ask the user what context to use instead of guessing.

---

`;

  const frontmatter = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (!frontmatter) {
    return `${prelude}${content}`;
  }

  const body = content.slice(frontmatter[0].length).replace(/^(\r?\n)+/, '');
  return `${frontmatter[0]}\n${prelude}${body}`;
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
    generatedFiles: Array.from(new Set(generatedFiles.map(normalizeRelativePath))).sort(),
    updatedAt: new Date().toISOString()
  };

  ensureDirectory(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

function recordAgentOsMetadata(targetDirectory, { preserveHashPaths = [], stack = 'core', tools = DEFAULT_TOOLS, generatedFiles = [] } = {}) {
  const agentOsFiles = collectFiles(path.join(targetDirectory, SOURCE_DIRECTORY_NAME), targetDirectory)
    .filter((filePath) => normalizeRelativePath(filePath) !== `${SOURCE_DIRECTORY_NAME}/${HASHES_FILE}`);
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
    ...agentOsFiles,
    `${SOURCE_DIRECTORY_NAME}/manifest.json`,
    ...generatedFiles
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

  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
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

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
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
