const path = require('path');

const SHARED_HOOKS_BY_PLATFORM = {
  claude: [
    'shelf-session-start.py',
    'shelf-inject-workflow-state.py'
  ],
  codex: [
    'shelf-inject-workflow-state.py'
  ]
};

function getSharedHooksDirectory(agentOsDirectory) {
  return path.join(agentOsDirectory, 'templates', 'shared-hooks');
}

function getSharedHookScriptsForPlatform(platform, agentOsDirectory) {
  const hookNames = SHARED_HOOKS_BY_PLATFORM[platform] || [];
  const sharedHooksDirectory = getSharedHooksDirectory(agentOsDirectory);

  return hookNames.map((hookName) => ({
    name: hookName,
    sourcePath: path.join(sharedHooksDirectory, hookName)
  }));
}

module.exports = {
  SHARED_HOOKS_BY_PLATFORM,
  getSharedHookScriptsForPlatform
};
