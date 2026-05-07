const fs = require('fs');
const path = require('path');
const {
  SOURCE_DIRECTORY_NAME,
  collectProjectionTemplates,
  getProjectionTemplateContent,
  readAgentOsManifest,
  recordAgentOsMetadata,
  syncAgentOs,
  validateStack,
  normalizeTools
} = require('../utils/agent-os');
const { extractManagedBlock } = require('../utils/managed-blocks');
const { computeHash, loadTemplateHashes } = require('../utils/template-hash');

async function agentSync(target = '.', options = {}) {
  const targetDirectory = path.resolve(target);
  const manifest = readAgentOsManifest(targetDirectory);

  if (!manifest) {
    throw new Error(`Missing ${SOURCE_DIRECTORY_NAME}/manifest.json. Run shelf init first.`);
  }

  const stack = validateStack(options.stack || firstStack(manifest) || 'core');
  const tools = normalizeTools(options.tools || manifest.tools || []);
  const templates = collectProjectionTemplates(targetDirectory, tools, stack);
  const changes = classifyProjectionFiles(targetDirectory, templates);

  printSyncSummary({ changes, dryRun: Boolean(options.dryRun), targetDirectory, tools });

  if (options.dryRun) {
    return {
      changes,
      dryRun: true,
      targetDirectory,
      tools
    };
  }

  const skippedPaths = changes
    .filter((change) => change.status === 'user-modified' || change.status === 'conflict')
    .map((change) => change.path);
  const generatedFiles = syncAgentOs(targetDirectory, tools, stack, { skipPaths: skippedPaths });
  const plannedFiles = templates.map((template) => template.path);
  const metadataResult = recordAgentOsMetadata(targetDirectory, {
    generatedFiles: mergeGeneratedFiles(manifest.generatedFiles || [], plannedFiles),
    preserveHashPaths: skippedPaths,
    stack,
    tools
  });

  console.log(`AgentOS Shelf sync complete: wrote ${generatedFiles.length} projection files, skipped ${skippedPaths.length} user-modified or conflicting files, and tracked ${Object.keys(metadataResult.hashes).length} template hashes.`);

  return {
    changes,
    dryRun: false,
    generatedFiles,
    hashesTracked: Object.keys(metadataResult.hashes).length,
    skippedPaths,
    targetDirectory,
    tools
  };
}

function classifyProjectionFiles(targetDirectory, templates) {
  const recordedHashes = loadTemplateHashes(targetDirectory);

  return templates.map((template) => {
    const relativePath = normalizeRelativePath(template.path);
    const absolutePath = path.join(targetDirectory, relativePath);
    const desiredContent = getProjectionTemplateContent(template);
    const comparableDesiredContent = getComparableDesiredContent(desiredContent, template);
    const desiredHash = computeHash(comparableDesiredContent);
    const recordedHash = recordedHashes[relativePath] && recordedHashes[relativePath].hash;

    if (!fs.existsSync(absolutePath)) {
      return {
        path: relativePath,
        status: 'create'
      };
    }

    const currentContent = fs.readFileSync(absolutePath, 'utf8');
    const currentHash = computeHash(getComparableCurrentContent(currentContent, desiredContent, template));

    if (currentHash === desiredHash) {
      return {
        path: relativePath,
        status: 'unchanged'
      };
    }

    if (!recordedHash) {
      return {
        path: relativePath,
        status: 'update'
      };
    }

    const userModified = currentHash !== recordedHash;
    const templateChanged = desiredHash !== recordedHash;

    if (userModified && templateChanged) {
      return {
        path: relativePath,
        status: 'conflict'
      };
    }

    if (userModified) {
      return {
        path: relativePath,
        status: 'user-modified'
      };
    }

    return {
      path: relativePath,
      status: 'update'
    };
  });
}

function getComparableCurrentContent(currentContent, desiredContent, template) {
  if (!template.managedBlock) {
    return currentContent;
  }

  return extractManagedBlock(currentContent) || currentContent;
}

function getComparableDesiredContent(desiredContent, template) {
  if (!template.managedBlock) {
    return desiredContent;
  }

  return extractManagedBlock(desiredContent) || desiredContent;
}

function firstStack(manifest) {
  return Array.isArray(manifest.stacks) && manifest.stacks.length > 0
    ? manifest.stacks[0]
    : 'core';
}

function normalizeRelativePath(relativePath) {
  return String(relativePath).replace(/\\/g, '/');
}

function mergeGeneratedFiles(previousFiles, plannedFiles) {
  const planned = new Set(plannedFiles.map(normalizeRelativePath));
  const merged = new Set();

  for (const filePath of previousFiles) {
    const normalized = normalizeRelativePath(filePath);
    if (!isProjectionFile(normalized)) {
      merged.add(normalized);
    }
  }

  for (const filePath of planned) {
    merged.add(filePath);
  }

  return Array.from(merged).sort();
}

function isProjectionFile(filePath) {
  return filePath === 'AGENTS.md'
    || filePath.startsWith('.codex/')
    || filePath.startsWith('.claude/')
    || filePath.startsWith('.agents/skills/');
}

function printSyncSummary({ changes, dryRun, targetDirectory, tools }) {
  console.log(`AgentOS Shelf sync${dryRun ? ' dry-run' : ''}: ${targetDirectory}`);
  console.log(`Tools: ${tools.join(', ')}`);

  const creates = changes.filter((change) => change.status === 'create');
  const updates = changes.filter((change) => change.status === 'update');
  const unchanged = changes.filter((change) => change.status === 'unchanged');
  const userModified = changes.filter((change) => change.status === 'user-modified');
  const conflicts = changes.filter((change) => change.status === 'conflict');

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

  if (userModified.length > 0) {
    console.log('Will skip user-modified files:');
    for (const change of userModified) {
      console.log(`! ${change.path}`);
    }
  }

  if (conflicts.length > 0) {
    console.log('Conflicts:');
    for (const change of conflicts) {
      console.log(`x ${change.path}`);
    }
  }

  if (unchanged.length > 0) {
    console.log(`Unchanged: ${unchanged.length}`);
  }

  if (changes.length === 0) {
    console.log('No projection files planned.');
  }
}

module.exports = agentSync;
module.exports._private = {
  classifyProjectionFiles
};
