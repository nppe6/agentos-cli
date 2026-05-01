const fs = require('fs');
const path = require('path');

const UPDATE_MANIFEST_SCHEMA_VERSION = 1;
const UPDATE_SKIP_FILE = 'update.skip';

const PROTECTED_PATHS = [
  '.shelf/spec/',
  '.shelf/tasks/',
  '.shelf/workspace/',
  '.shelf/.developer',
  '.shelf/.current-task',
  '.shelf/config.yaml',
  '.shelf/manifest.json',
  '.shelf/template-hashes.json',
  `.shelf/${UPDATE_SKIP_FILE}`
];

function createUpdateManifest({
  backups = [],
  deleted = [],
  fromVersion = null,
  migrations = [],
  skipped = [],
  skippedDeletes = [],
  toVersion = null,
  version = null
} = {}) {
  return {
    schemaVersion: UPDATE_MANIFEST_SCHEMA_VERSION,
    version: toVersion || version,
    fromVersion,
    toVersion: toVersion || version,
    updatedAt: new Date().toISOString(),
    backups: normalizeList(backups),
    deleted: normalizeList(deleted),
    skipped: normalizeSkipped(skipped),
    migrations: normalizeMigrations(migrations),
    skippedDeletes: normalizeSkippedDeletes(skippedDeletes)
  };
}

function createMigrationPlan({ fromVersion = null, toVersion = null } = {}) {
  if (!fromVersion || !toVersion || fromVersion === toVersion) {
    return [];
  }

  return [{
    id: `cli-${fromVersion}-to-${toVersion}`,
    description: 'Refresh Shelf projections and metadata for the current AgentOS CLI version.',
    fromVersion,
    status: 'planned',
    toVersion
  }];
}

function markMigrationsApplied(migrations = []) {
  const appliedAt = new Date().toISOString();
  return migrations.map((migration) => ({
    ...migration,
    appliedAt,
    status: 'applied'
  }));
}

function loadUpdateSkip(targetDirectory, sourceDirectoryName = '.shelf') {
  const skipPath = path.join(targetDirectory, sourceDirectoryName, UPDATE_SKIP_FILE);
  if (!fs.existsSync(skipPath)) {
    return [];
  }

  return fs.readFileSync(skipPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map(normalizeSkipEntry);
}

function planObsoleteGeneratedFiles(previousGeneratedFiles = [], plannedGeneratedFiles = [], options = {}) {
  const planned = new Set(plannedGeneratedFiles.map(normalizeRelativePath));
  const currentGenerated = new Set((previousGeneratedFiles || []).map(normalizeRelativePath));
  const obsolete = Array.from(currentGenerated)
    .filter((filePath) => !planned.has(filePath))
    .sort();

  return obsolete.map((filePath) => {
    const reason = getProtectedReason(filePath);
    if (reason) {
      return {
        path: filePath,
        protected: true,
        reason,
        status: 'protected'
      };
    }

    if (options.existingFiles && !options.existingFiles.has(filePath)) {
      return {
        path: filePath,
        protected: false,
        reason: 'missing',
        status: 'missing'
      };
    }

    return {
      path: filePath,
      protected: false,
      reason: 'not planned by current projection',
      status: 'delete'
    };
  });
}

function applyUpdateSkipToObsoletePlan(obsoletePlan = [], skipEntries = []) {
  return obsoletePlan.map((item) => {
    const reason = getUpdateSkipReason(item.path, skipEntries);
    if (!reason) {
      return item;
    }

    return {
      ...item,
      protected: false,
      reason,
      status: 'skipped'
    };
  });
}

function getUpdateSkipReason(filePath, skipEntries = []) {
  const normalized = normalizeRelativePath(filePath);

  for (const entry of skipEntries) {
    if (entry.directory) {
      if (normalized.startsWith(entry.path)) {
        return `update.skip: ${entry.raw}`;
      }
    }
    else if (normalized === entry.path) {
      return `update.skip: ${entry.raw}`;
    }
  }

  return null;
}

function isProtectedPath(filePath) {
  return Boolean(getProtectedReason(filePath));
}

function getProtectedReason(filePath) {
  const normalized = normalizeRelativePath(filePath);
  for (const protectedPath of PROTECTED_PATHS) {
    if (protectedPath.endsWith('/')) {
      if (normalized.startsWith(protectedPath)) {
        return `protected path: ${protectedPath}`;
      }
    }
    else if (normalized === protectedPath) {
      return `protected file: ${protectedPath}`;
    }
  }

  return null;
}

function normalizeRelativePath(filePath) {
  return String(filePath).replace(/\\/g, '/').replace(/^\/+/, '');
}

function normalizeList(items) {
  return Array.from(new Set((items || []).map(normalizeRelativePath))).sort();
}

function normalizeSkippedDeletes(items) {
  return normalizeSkipped(items);
}

function normalizeSkipped(items) {
  return (items || [])
    .map((item) => ({
      path: normalizeRelativePath(item.path),
      reason: item.reason || 'skipped'
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function normalizeMigrations(migrations) {
  return (migrations || [])
    .map((migration) => ({
      id: migration.id,
      description: migration.description,
      fromVersion: migration.fromVersion || null,
      toVersion: migration.toVersion || null,
      status: migration.status,
      ...(migration.appliedAt ? { appliedAt: migration.appliedAt } : {})
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function normalizeSkipEntry(entry) {
  const directory = entry.endsWith('/');
  const normalized = normalizeRelativePath(entry);

  return {
    directory,
    path: directory ? normalized : normalized.replace(/\/+$/, ''),
    raw: entry
  };
}

function resolveInside(rootDirectory, relativePath) {
  const root = path.resolve(rootDirectory);
  const absolutePath = path.resolve(root, relativePath);
  if (absolutePath !== root && !absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to operate outside target directory: ${relativePath}`);
  }

  return absolutePath;
}

module.exports = {
  PROTECTED_PATHS,
  applyUpdateSkipToObsoletePlan,
  createUpdateManifest,
  createMigrationPlan,
  getUpdateSkipReason,
  isProtectedPath,
  loadUpdateSkip,
  markMigrationsApplied,
  planObsoleteGeneratedFiles,
  resolveInside
};
