const fs = require('fs');
const path = require('path');
const {
  readAgentOsManifest,
  recordAgentOsMetadata,
  syncAgentOs,
  validateStack,
  normalizeTools
} = require('../utils/agent-os');
const { getToolLayout } = require('../utils/tool-layouts');

async function agentSync(target = '.', options = {}) {
  const targetDirectory = path.resolve(target);
  const manifest = readAgentOsManifest(targetDirectory);

  if (!manifest) {
    throw new Error('Missing .agent-os/manifest.json. Run agent init first.');
  }

  const stack = validateStack(options.stack || firstStack(manifest) || 'core');
  const tools = normalizeTools(options.tools || manifest.tools || []);
  const plannedFiles = collectPlannedProjectionFiles(targetDirectory, tools);
  const changes = classifyProjectionFiles(targetDirectory, plannedFiles);

  printSyncSummary({ changes, dryRun: Boolean(options.dryRun), targetDirectory, tools });

  if (options.dryRun) {
    return {
      changes,
      dryRun: true,
      targetDirectory,
      tools
    };
  }

  const generatedFiles = syncAgentOs(targetDirectory, tools, stack);
  const metadataResult = recordAgentOsMetadata(targetDirectory, {
    generatedFiles,
    stack,
    tools
  });

  console.log(`同步完成：已更新 ${generatedFiles.length} 个投影文件，跟踪 ${Object.keys(metadataResult.hashes).length} 个模板文件 hash。`);

  return {
    changes,
    dryRun: false,
    generatedFiles,
    hashesTracked: Object.keys(metadataResult.hashes).length,
    targetDirectory,
    tools
  };
}

function collectPlannedProjectionFiles(targetDirectory, tools) {
  const agentOsDirectory = path.join(targetDirectory, '.agent-os');
  const skillsDirectory = path.join(agentOsDirectory, 'skills');
  const files = [];

  for (const tool of tools) {
    const layout = getToolLayout(tool);
    files.push(layout.entryFile);

    if (fs.existsSync(skillsDirectory)) {
      for (const skillFile of collectFiles(skillsDirectory, skillsDirectory)) {
        files.push(path.join(layout.skillsDirectory, skillFile));
      }
    }
  }

  return Array.from(new Set(files.map(normalizeRelativePath))).sort();
}

function classifyProjectionFiles(targetDirectory, plannedFiles) {
  return plannedFiles.map((relativePath) => {
    const absolutePath = path.join(targetDirectory, relativePath);
    return {
      path: relativePath,
      status: fs.existsSync(absolutePath) ? 'update' : 'create'
    };
  });
}

function collectFiles(rootDirectory, relativeTo) {
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

function firstStack(manifest) {
  return Array.isArray(manifest.stacks) && manifest.stacks.length > 0
    ? manifest.stacks[0]
    : 'core';
}

function normalizeRelativePath(relativePath) {
  return String(relativePath).replace(/\\/g, '/');
}

function printSyncSummary({ changes, dryRun, targetDirectory, tools }) {
  console.log(`Agent OS sync${dryRun ? ' dry-run' : ''}: ${targetDirectory}`);
  console.log(`Tools: ${tools.join(', ')}`);

  const creates = changes.filter((change) => change.status === 'create');
  const updates = changes.filter((change) => change.status === 'update');

  if (creates.length > 0) {
    console.log('Will create:');
    for (const change of creates) {
      console.log(`+ ${change.path}`);
    }
  }

  if (updates.length > 0) {
    console.log('Will update:');
    for (const change of updates) {
      console.log(`~ ${change.path}`);
    }
  }

  if (changes.length === 0) {
    console.log('No projection files planned.');
  }
}

module.exports = agentSync;
module.exports._private = {
  collectPlannedProjectionFiles
};
