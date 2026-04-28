const fs = require('fs');
const path = require('path');
const { copyDirectoryContents, ensureDirectory } = require('./fs');

const SUPPORTED_PRESETS = new Set(['vue']);
const TEMPLATE_ROOT = path.resolve(__dirname, '../../templates/presets');
const PACKAGE_SYNC_SCRIPT = 'powershell -ExecutionPolicy Bypass -File .\\scripts\\sync-agent-os.ps1';
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
  { relativePath: path.join('scripts', 'sync-agent-os.ps1'), label: 'scripts/sync-agent-os.ps1', kind: 'path' }
];

function validatePreset(preset) {
  if (!SUPPORTED_PRESETS.has(preset)) {
    throw new Error(`Unsupported preset "${preset}". Available presets: ${Array.from(SUPPORTED_PRESETS).join(', ')}`);
  }

  return preset;
}

function resolvePresetRoot(preset) {
  return path.join(TEMPLATE_ROOT, preset);
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
    labels.add('scripts/sync-agent-os.ps1');
    labels.add('package.json -> scripts.agent-os:sync');
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
    entries.push('.agent-os/', 'scripts/sync-agent-os.ps1');
  }

  return entries;
}

function copyTemplateFiles({ preset, targetDirectory, tools = DEFAULT_TOOLS }) {
  const presetRoot = resolvePresetRoot(preset);
  const selectedTools = normalizeTools(tools);
  const shouldUseAgentOs = usesAgentOs(selectedTools);
  const sourceAgentOs = path.join(presetRoot, '.agent-os');
  const sourceScriptsDirectory = path.join(presetRoot, 'scripts');
  const destinationAgentOs = path.join(targetDirectory, '.agent-os');
  const destinationScriptsDirectory = path.join(targetDirectory, 'scripts');

  if (shouldUseAgentOs) {
    fs.cpSync(sourceAgentOs, destinationAgentOs, { recursive: true, force: true });
    ensureDirectory(destinationScriptsDirectory);
    fs.cpSync(
      path.join(sourceScriptsDirectory, 'sync-agent-os.ps1'),
      path.join(destinationScriptsDirectory, 'sync-agent-os.ps1'),
      { force: true }
    );
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
        label: 'package.json -> scripts.agent-os:sync',
        kind: 'package-script',
        absolutePath: packageJsonPath
      });
    }
  }

  return conflicts;
}

function syncAgentOs(targetDirectory, tools = DEFAULT_TOOLS, preset = 'vue') {
  const selectedTools = normalizeTools(tools);
  const agentOsDirectory = usesAgentOs(selectedTools)
    ? path.join(targetDirectory, '.agent-os')
    : path.join(resolvePresetRoot(preset), '.agent-os');
  const sharedRulesPath = path.join(agentOsDirectory, 'rules', 'AGENTS.shared.md');
  const claudeTemplatePath = path.join(agentOsDirectory, 'templates', 'CLAUDE.md');
  const skillsDirectory = path.join(agentOsDirectory, 'skills');
  const claudeSkillsDirectory = path.join(targetDirectory, '.claude', 'skills');
  const codexSkillsDirectory = path.join(targetDirectory, '.codex', 'skills');

  assertPathExists(sharedRulesPath, 'shared rules file');
  assertPathExists(claudeTemplatePath, 'Claude template');
  assertPathExists(skillsDirectory, 'skills directory');

  if (selectedTools.includes(TOOL_CODEX)) {
    fs.copyFileSync(sharedRulesPath, path.join(targetDirectory, 'AGENTS.md'));
    ensureDirectory(path.join(targetDirectory, '.codex'));
    copyDirectoryContents(skillsDirectory, codexSkillsDirectory);
  }

  if (selectedTools.includes(TOOL_CLAUDE)) {
    fs.copyFileSync(claudeTemplatePath, path.join(targetDirectory, 'CLAUDE.md'));
    ensureDirectory(path.join(targetDirectory, '.claude'));
    copyDirectoryContents(skillsDirectory, claudeSkillsDirectory);
  }
}

function updatePackageJsonScript(targetDirectory, enabled = true) {
  const packageJsonPath = path.join(targetDirectory, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return { updated: false };
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.scripts = packageJson.scripts || {};

  if (!enabled) {
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

  packageJson.scripts['agent-os:sync'] = PACKAGE_SYNC_SCRIPT;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

  return { updated: true };
}

function assertPathExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Missing ${label}: ${targetPath}`);
  }
}

module.exports = {
  DEFAULT_TOOLS,
  PACKAGE_SYNC_SCRIPT,
  TOOL_CLAUDE,
  TOOL_CODEX,
  collectConflicts,
  copyTemplateFiles,
  getGitignoreEntries,
  getSelectedLabels,
  normalizeTools,
  syncAgentOs,
  updatePackageJsonScript,
  usesAgentOs,
  validatePreset
};
