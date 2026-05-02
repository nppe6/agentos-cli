const fs = require('fs');
const path = require('path');
const packageJson = require('../../package.json');
const agentSync = require('./agent-sync');
const {
  SOURCE_DIRECTORY_NAME,
  collectProjectionTemplates,
  getProjectionTemplateContent,
  normalizeTools,
  readAgentOsManifest,
  recordAgentOsMetadata,
  syncAgentOs,
  validateStack
} = require('../utils/agent-os');
const { ensureDirectory, removeDirectoryIfEmpty } = require('../utils/fs');
const {
  applyUpdateSkipToObsoletePlan,
  createMigrationPlan,
  createUpdateManifest,
  getUpdateSkipReason,
  loadUpdateSkip,
  markMigrationsApplied,
  planObsoleteGeneratedFiles,
  resolveInside
} = require('../utils/update-safety');

async function agentUpdate(target = '.', options = {}) {
  const targetDirectory = path.resolve(target);
  const manifest = readAgentOsManifest(targetDirectory);

  if (!manifest) {
    throw new Error(`Missing ${SOURCE_DIRECTORY_NAME}/manifest.json. Run shelf init first.`);
  }

  const stack = validateStack(options.stack || firstStack(manifest) || 'core');
  const tools = normalizeTools(options.tools || manifest.tools || []);
  const preview = await agentSync(targetDirectory, { dryRun: true, stack, tools });
  const skipEntries = loadUpdateSkip(targetDirectory, SOURCE_DIRECTORY_NAME);
  const skippedChanges = getSkippedChanges(preview.changes, skipEntries);
  const skippedChangePaths = skippedChanges.map((change) => change.path);
  const skippedChangePathSet = new Set(skippedChangePaths);
  const riskyChanges = preview.changes
    .filter((change) => !skippedChangePathSet.has(change.path))
    .filter((change) => change.status === 'user-modified' || change.status === 'conflict');
  const templates = collectProjectionTemplates(targetDirectory, tools, stack);
  const plannedFiles = templates.map((template) => template.path);
  const obsoletePlan = applyUpdateSkipToObsoletePlan(
    planObsoleteGeneratedFiles(manifest.generatedFiles || [], plannedFiles, {
      existingFiles: collectExistingFiles(targetDirectory, manifest.generatedFiles || [])
    }),
    skipEntries
  );
  const fromVersion = manifest.cliVersion || null;
  const toVersion = packageJson.version;
  const migrations = createMigrationPlan({ fromVersion, toVersion });

  if (options.dryRun) {
    return {
      ...preview,
      backups: [],
      migrations,
      obsolete: obsoletePlan,
      skipped: skippedChanges,
      updated: false
    };
  }

  if (riskyChanges.length > 0 && !options.force) {
    printBlockedUpdate(riskyChanges);
    return {
      ...preview,
      backups: [],
      blocked: true,
      migrations,
      obsolete: obsoletePlan,
      skipped: skippedChanges,
      updated: false
    };
  }

  const backupRoot = path.join(targetDirectory, SOURCE_DIRECTORY_NAME, 'backups', createTimestamp());
  const backupPaths = [
    ...createProjectionBackups(targetDirectory, templates, { backupRoot }),
    ...createObsoleteBackups(targetDirectory, obsoletePlan, { backupRoot })
  ];
  const deleteResult = deleteObsoleteGeneratedFiles(targetDirectory, obsoletePlan, {
    force: Boolean(options.force)
  });
  const generatedFiles = syncAgentOs(targetDirectory, tools, stack, { skipPaths: skippedChangePaths });
  const metadataResult = recordAgentOsMetadata(targetDirectory, {
    generatedFiles: plannedFiles,
    preserveHashPaths: skippedChangePaths,
    stack,
    tools
  });
  const updateManifest = writeUpdateManifest(targetDirectory, createUpdateManifest({
    backups: backupPaths,
    deleted: deleteResult.deleted,
    fromVersion,
    migrations: markMigrationsApplied(migrations),
    skipped: skippedChanges,
    skippedDeletes: deleteResult.skipped,
    toVersion: metadataResult.manifest.cliVersion
  }));

  console.log(`AgentOS Shelf update complete: wrote ${generatedFiles.length} projection files, deleted ${deleteResult.deleted.length} obsolete files, and tracked ${Object.keys(metadataResult.hashes).length} hashes.`);
  if (backupPaths.length > 0) {
    console.log(`Backups: ${path.join(SOURCE_DIRECTORY_NAME, 'backups')}`);
  }
  if (deleteResult.skipped.length > 0) {
    console.log(`Skipped obsolete deletes: ${deleteResult.skipped.length}`);
  }
  if (skippedChanges.length > 0) {
    console.log(`Skipped by ${SOURCE_DIRECTORY_NAME}/update.skip: ${skippedChanges.length}`);
  }

  return {
    backups: backupPaths,
    blocked: false,
    changes: preview.changes,
    deleted: deleteResult.deleted,
    dryRun: false,
    generatedFiles,
    migrations,
    obsolete: obsoletePlan,
    skipped: skippedChanges,
    skippedDeletes: deleteResult.skipped,
    targetDirectory,
    tools,
    updated: true,
    updateManifest
  };
}

function getSkippedChanges(changes, skipEntries) {
  return changes
    .map((change) => ({
      ...change,
      reason: getUpdateSkipReason(change.path, skipEntries)
    }))
    .filter((change) => Boolean(change.reason));
}

function createProjectionBackups(targetDirectory, templates, options = {}) {
  const backupRoot = options.backupRoot || path.join(targetDirectory, SOURCE_DIRECTORY_NAME, 'backups', createTimestamp());
  const backups = [];

  for (const template of templates) {
    const relativePath = template.path;
    const absolutePath = path.join(targetDirectory, relativePath);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      continue;
    }

    const currentContent = fs.readFileSync(absolutePath, 'utf8');
    const desiredContent = getProjectionTemplateContent(template);
    if (currentContent === desiredContent || isManagedBlockUnchanged(template, currentContent, desiredContent)) {
      continue;
    }

    const backupPath = path.join(backupRoot, relativePath);
    ensureDirectory(path.dirname(backupPath));
    fs.copyFileSync(absolutePath, backupPath);
    backups.push(normalizeRelativePath(path.relative(targetDirectory, backupPath)));
  }

  return backups;
}

function createObsoleteBackups(targetDirectory, obsoletePlan, options = {}) {
  const backupRoot = options.backupRoot || path.join(targetDirectory, SOURCE_DIRECTORY_NAME, 'backups', createTimestamp());
  const backups = [];

  for (const item of obsoletePlan) {
    if (item.status !== 'delete') {
      continue;
    }

    const absolutePath = resolveInside(targetDirectory, item.path);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      continue;
    }

    const backupPath = path.join(backupRoot, item.path);
    ensureDirectory(path.dirname(backupPath));
    fs.copyFileSync(absolutePath, backupPath);
    backups.push(normalizeRelativePath(path.relative(targetDirectory, backupPath)));
  }

  return backups;
}

function deleteObsoleteGeneratedFiles(targetDirectory, obsoletePlan, options = {}) {
  const deleted = [];
  const skipped = [];

  for (const item of obsoletePlan) {
    if (item.status !== 'delete') {
      if (item.status === 'protected' || item.status === 'skipped') {
        skipped.push({ path: item.path, reason: item.reason });
      }
      continue;
    }

    const absolutePath = resolveInside(targetDirectory, item.path);
    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    if (!options.force && item.protected) {
      skipped.push({ path: item.path, reason: item.reason || 'protected' });
      continue;
    }

    fs.rmSync(absolutePath, { force: true });
    deleted.push(item.path);
    removeEmptyParents(path.dirname(absolutePath), targetDirectory);
  }

  return { deleted, skipped };
}

function collectExistingFiles(targetDirectory, relativeFiles) {
  const existing = new Set();
  for (const relativeFile of relativeFiles) {
    const normalized = normalizeRelativePath(relativeFile);
    const absolutePath = path.join(targetDirectory, normalized);
    if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
      existing.add(normalized);
    }
  }

  return existing;
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

function writeUpdateManifest(targetDirectory, manifest) {
  const manifestPath = path.join(targetDirectory, SOURCE_DIRECTORY_NAME, 'update-manifest.json');
  ensureDirectory(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return manifest;
}

function isManagedBlockUnchanged(template, currentContent, desiredContent) {
  if (!template.managedBlock) {
    return false;
  }

  const { extractManagedBlock } = require('../utils/managed-blocks');
  return extractManagedBlock(currentContent) === extractManagedBlock(desiredContent);
}

function printBlockedUpdate(riskyChanges) {
  console.log('AgentOS Shelf update blocked because user-modified or conflicting projection files were detected:');
  for (const change of riskyChanges) {
    console.log(`- ${change.path} (${change.status})`);
  }
  console.log('Run shelf sync --dry-run to inspect the changes, or rerun update with --force after reviewing.');
}

function createTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function firstStack(manifest) {
  return Array.isArray(manifest.stacks) && manifest.stacks.length > 0
    ? manifest.stacks[0]
    : 'core';
}

function normalizeRelativePath(filePath) {
  return String(filePath).replace(/\\/g, '/');
}

module.exports = agentUpdate;
module.exports._private = {
  createTimestamp
};
