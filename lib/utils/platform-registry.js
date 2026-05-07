const fs = require('fs');
const path = require('path');
const { readJsonFile } = require('./json');

const TEMPLATE_TOOLS_DIRECTORY = path.resolve(__dirname, '../../templates/tools');

const TOOL_DEFINITIONS = {
  claude: {
    capabilities: {
      agents: true,
      agentPullContext: true,
      commands: true,
      hooks: true,
      managedEntryBlock: false,
      openAgentSkills: false,
      settings: true,
      toolScopedSkills: true
    },
    entrySource: 'claude-template',
    label: 'Claude Code'
  },
  codex: {
    capabilities: {
      agentPullContext: true,
      agents: true,
      hooks: true,
      managedEntryBlock: true,
      openAgentSkills: true,
      promptCommands: false,
      settings: true,
      toolScopedSkills: false
    },
    entrySource: 'shared-rules',
    label: 'Codex'
  }
};

function loadPlatformRegistry() {
  const registry = {};

  for (const name of Object.keys(TOOL_DEFINITIONS)) {
    const toolJsonPath = path.join(TEMPLATE_TOOLS_DIRECTORY, name, 'tool.json');
    const metadata = readJsonFile(toolJsonPath);
    const skillsDirectory = metadata.skillsDirectory || metadata.skillsDir || null;
    const rootDirectory = metadata.rootDirectory || metadata.rootDir || (
      skillsDirectory
        ? path.dirname(skillsDirectory)
        : path.dirname(metadata.agentsDirectory || metadata.agentsDir || metadata.entryFile)
    );
    const definition = TOOL_DEFINITIONS[metadata.name] || {};

    registry[metadata.name] = {
      agentsDirectory: metadata.agentsDirectory || metadata.agentsDir,
      capabilities: {
        agents: Boolean(metadata.agentsDirectory || metadata.agentsDir),
        agentPullContext: false,
        commands: false,
        hooks: false,
        managedEntryBlock: false,
        openAgentSkills: false,
        promptCommands: false,
        settings: false,
        toolScopedSkills: false,
        ...(definition.capabilities || {})
      },
      entryFile: metadata.entryFile,
      entrySource: definition.entrySource || 'shared-rules',
      label: definition.label || metadata.name,
      managedPaths: [metadata.entryFile, `${rootDirectory}/`],
      name: metadata.name,
      optionalDirs: metadata.optionalDirs || [],
      rootDirectory,
      skillsDirectory
    };
  }

  return registry;
}

const PLATFORM_REGISTRY = loadPlatformRegistry();

function getPlatform(tool) {
  const platform = PLATFORM_REGISTRY[tool];
  if (!platform) {
    throw new Error(`Unsupported tool layout: ${tool}`);
  }

  return platform;
}

function getAllPlatforms() {
  return PLATFORM_REGISTRY;
}

module.exports = {
  PLATFORM_REGISTRY,
  getAllPlatforms,
  getPlatform
};
