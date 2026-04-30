const fs = require('fs');
const path = require('path');
const packageJson = require('../../package.json');
const { copyDirectoryContents, ensureDirectory } = require('./fs');
const { getToolLayout } = require('./tool-layouts');
const { HASHES_FILE, writeTemplateHashes } = require('./template-hash');

const SUPPORTED_STACKS = new Set(['core', 'vue']);
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
  { relativePath: '.agent-os', label: '.agent-os/', kind: 'path' },
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
  return path.join(resolveStackRoot(stack), '.agent-os');
}

function resolveCoreAgentOsRoot() {
  return path.join(CORE_TEMPLATE_ROOT, '.agent-os');
}

function copyLayeredAgentOs({ stack, targetDirectory }) {
  const destinationAgentOs = path.join(targetDirectory, '.agent-os');
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
  const labels = new Set(['.agent-os/']);

  if (selectedTools.includes(TOOL_CODEX)) {
    labels.add('AGENTS.md');
    labels.add('.codex/');
  }

  if (selectedTools.includes(TOOL_CLAUDE)) {
    labels.add('CLAUDE.md');
    labels.add('.claude/');
  }

  return labels;
}

function getGitignoreEntries(tools) {
  const selectedTools = normalizeTools(tools);
  const entries = ['.agent-os/'];

  if (selectedTools.includes(TOOL_CODEX)) {
    entries.push('AGENTS.md', '.codex/');
  }

  if (selectedTools.includes(TOOL_CLAUDE)) {
    entries.push('CLAUDE.md', '.claude/');
  }

  return entries;
}

function copyTemplateFiles({ stack, targetDirectory, tools = DEFAULT_TOOLS }) {
  normalizeTools(tools);
  copyLayeredAgentOs({ stack, targetDirectory });
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

function syncAgentOs(targetDirectory, tools = DEFAULT_TOOLS, stack = 'core') {
  const selectedTools = normalizeTools(tools);
  const agentOsDirectory = path.join(targetDirectory, '.agent-os');
  const sharedRulesPath = path.join(agentOsDirectory, 'rules', 'AGENTS.shared.md');
  const claudeTemplatePath = path.join(agentOsDirectory, 'templates', 'CLAUDE.md');
  const skillsDirectory = path.join(agentOsDirectory, 'skills');
  const generatedFiles = [];

  assertPathExists(sharedRulesPath, 'shared rules file');
  assertPathExists(claudeTemplatePath, 'Claude template');
  assertPathExists(skillsDirectory, 'skills directory');

  if (selectedTools.includes(TOOL_CODEX)) {
    const layout = getToolLayout(TOOL_CODEX);
    fs.copyFileSync(sharedRulesPath, path.join(targetDirectory, layout.entryFile));
    generatedFiles.push(layout.entryFile);
    ensureDirectory(path.join(targetDirectory, layout.rootDirectory));
    copyDirectoryContents(skillsDirectory, path.join(targetDirectory, layout.skillsDirectory));
    generatedFiles.push(...collectFiles(path.join(targetDirectory, layout.skillsDirectory), targetDirectory));
  }

  if (selectedTools.includes(TOOL_CLAUDE)) {
    const layout = getToolLayout(TOOL_CLAUDE);
    fs.copyFileSync(
      claudeTemplatePath,
      path.join(targetDirectory, layout.entryFile)
    );
    generatedFiles.push(layout.entryFile);
    ensureDirectory(path.join(targetDirectory, layout.rootDirectory));
    copyDirectoryContents(skillsDirectory, path.join(targetDirectory, layout.skillsDirectory));
    generatedFiles.push(...collectFiles(path.join(targetDirectory, layout.skillsDirectory), targetDirectory));
  }

  return Array.from(new Set(generatedFiles.map(normalizeRelativePath)));
}

function writeAgentOsManifest(targetDirectory, { stack = 'core', tools = DEFAULT_TOOLS, generatedFiles = [] } = {}) {
  const selectedTools = normalizeTools(tools);
  const manifestPath = path.join(targetDirectory, '.agent-os', 'manifest.json');
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

function recordAgentOsMetadata(targetDirectory, { stack = 'core', tools = DEFAULT_TOOLS, generatedFiles = [] } = {}) {
  const agentOsFiles = collectFiles(path.join(targetDirectory, '.agent-os'), targetDirectory)
    .filter((filePath) => normalizeRelativePath(filePath) !== `.agent-os/${HASHES_FILE}`);
  const manifest = writeAgentOsManifest(targetDirectory, { stack, tools, generatedFiles });
  const filesToHash = Array.from(new Set([
    ...agentOsFiles,
    '.agent-os/manifest.json',
    ...generatedFiles
  ].map(normalizeRelativePath)));

  const hashes = writeTemplateHashes(targetDirectory, filesToHash);

  return {
    hashes,
    manifest
  };
}

function readAgentOsManifest(targetDirectory) {
  const manifestPath = path.join(targetDirectory, '.agent-os', 'manifest.json');
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
  resolveAgentOsRoot,
  resolveStackRoot,
  TOOL_CLAUDE,
  TOOL_CODEX,
  collectConflicts,
  copyTemplateFiles,
  getGitignoreEntries,
  getSelectedLabels,
  normalizeTools,
  readAgentOsManifest,
  recordAgentOsMetadata,
  removeLegacyPackageJsonScript,
  syncAgentOs,
  usesAgentOs,
  writeAgentOsManifest,
  validateStack
};
