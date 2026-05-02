const fs = require('fs');
const path = require('path');

const TEMPLATE_TOOLS_DIRECTORY = path.resolve(__dirname, '../../templates/tools');

const TOOL_DEFINITIONS = {
  claude: {
    capabilities: {
      agents: true,
      commands: true,
      hooks: true,
      managedEntryBlock: false,
      openAgentSkills: false,
      pullContextPrelude: false,
      settings: true
    },
    entrySource: 'claude-template',
    label: 'Claude Code'
  },
  codex: {
    capabilities: {
      agents: true,
      hooks: false,
      managedEntryBlock: true,
      openAgentSkills: true,
      pullContextPrelude: true,
      settings: false
    },
    entrySource: 'shared-rules',
    label: 'Codex'
  }
};

function loadPlatformRegistry() {
  const registry = {};

  for (const name of Object.keys(TOOL_DEFINITIONS)) {
    const toolJsonPath = path.join(TEMPLATE_TOOLS_DIRECTORY, name, 'tool.json');
    const metadata = JSON.parse(fs.readFileSync(toolJsonPath, 'utf8'));
    const skillsDirectory = metadata.skillsDirectory || metadata.skillsDir;
    const rootDirectory = path.dirname(skillsDirectory);
    const definition = TOOL_DEFINITIONS[metadata.name] || {};

    registry[metadata.name] = {
      agentsDirectory: metadata.agentsDirectory || metadata.agentsDir,
      capabilities: {
        agents: Boolean(metadata.agentsDirectory || metadata.agentsDir),
        commands: false,
        hooks: false,
        managedEntryBlock: false,
        openAgentSkills: false,
        pullContextPrelude: false,
        settings: false,
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
