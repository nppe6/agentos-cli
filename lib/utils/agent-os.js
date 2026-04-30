const fs = require('fs');
const path = require('path');
const { copyDirectoryContents, ensureDirectory } = require('./fs');
const { getToolLayout } = require('./tool-layouts');

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
  return normalizeTools(tools).length > 1;
}

function getSelectedLabels(tools) {
  const selectedTools = normalizeTools(tools);
  const labels = new Set();

  if (selectedTools.includes(TOOL_CODEX)) {
    labels.add('AGENTS.md');
    labels.add('.codex/');
  }

  if (selectedTools.includes(TOOL_CLAUDE)) {
    labels.add('CLAUDE.md');
    labels.add('.claude/');
  }

  if (usesAgentOs(selectedTools)) {
    labels.add('.agent-os/');
  }

  return labels;
}

function getGitignoreEntries(tools) {
  const selectedTools = normalizeTools(tools);
  const entries = [];

  if (selectedTools.includes(TOOL_CODEX)) {
    entries.push('AGENTS.md', '.codex/');
  }

  if (selectedTools.includes(TOOL_CLAUDE)) {
    entries.push('CLAUDE.md', '.claude/');
  }

  if (usesAgentOs(selectedTools)) {
    entries.push('.agent-os/');
  }

  return entries;
}

function copyTemplateFiles({ stack, targetDirectory, tools = DEFAULT_TOOLS }) {
  const selectedTools = normalizeTools(tools);
  const shouldUseAgentOs = usesAgentOs(selectedTools);

  if (shouldUseAgentOs) {
    copyLayeredAgentOs({ stack, targetDirectory });
  }
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
  const agentOsDirectory = usesAgentOs(selectedTools)
    ? path.join(targetDirectory, '.agent-os')
    : resolveAgentOsRoot(stack);
  const sharedRulesPath = path.join(agentOsDirectory, 'rules', 'AGENTS.shared.md');
  const claudeTemplatePath = path.join(agentOsDirectory, 'templates', 'CLAUDE.md');
  const skillsDirectory = path.join(agentOsDirectory, 'skills');

  assertPathExists(sharedRulesPath, 'shared rules file');
  assertPathExists(claudeTemplatePath, 'Claude template');
  assertPathExists(skillsDirectory, 'skills directory');

  if (selectedTools.includes(TOOL_CODEX)) {
    const layout = getToolLayout(TOOL_CODEX);
    fs.copyFileSync(sharedRulesPath, path.join(targetDirectory, layout.entryFile));
    ensureDirectory(path.join(targetDirectory, layout.rootDirectory));
    copyDirectoryContents(skillsDirectory, path.join(targetDirectory, layout.skillsDirectory));
  }

  if (selectedTools.includes(TOOL_CLAUDE)) {
    const layout = getToolLayout(TOOL_CLAUDE);
    fs.copyFileSync(
      usesAgentOs(selectedTools) ? claudeTemplatePath : sharedRulesPath,
      path.join(targetDirectory, layout.entryFile)
    );
    ensureDirectory(path.join(targetDirectory, layout.rootDirectory));
    copyDirectoryContents(skillsDirectory, path.join(targetDirectory, layout.skillsDirectory));
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
  resolveAgentOsRoot,
  resolveStackRoot,
  TOOL_CLAUDE,
  TOOL_CODEX,
  collectConflicts,
  copyTemplateFiles,
  getGitignoreEntries,
  getSelectedLabels,
  normalizeTools,
  removeLegacyPackageJsonScript,
  syncAgentOs,
  usesAgentOs,
  validateStack
};
