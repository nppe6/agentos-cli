const fs = require('fs');
const path = require('path');
const { readJsonFile } = require('./json');
const { detectProjectType } = require('./project-detector');

function detectMonorepo(targetDirectory) {
  const target = path.resolve(targetDirectory);
  const packages = [];

  collectPackageJsonWorkspaces(target, packages);
  collectPnpmWorkspaces(target, packages);

  return dedupePackages(packages);
}

function collectPackageJsonWorkspaces(target, packages) {
  const packageJsonPath = path.join(target, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  try {
    const packageJson = readJsonFile(packageJsonPath);
    const workspaces = Array.isArray(packageJson.workspaces)
      ? packageJson.workspaces
      : packageJson.workspaces && Array.isArray(packageJson.workspaces.packages)
        ? packageJson.workspaces.packages
        : [];

    for (const pattern of workspaces) {
      collectSimpleWorkspacePattern(target, pattern, 'package.json', packages);
    }
  }
  catch {
    return;
  }
}

function collectPnpmWorkspaces(target, packages) {
  const workspacePath = path.join(target, 'pnpm-workspace.yaml');
  if (!fs.existsSync(workspacePath)) {
    return;
  }

  const content = fs.readFileSync(workspacePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s+['"]?([^'"]+)['"]?\s*$/);
    if (match) {
      collectSimpleWorkspacePattern(target, match[1], 'pnpm-workspace.yaml', packages);
    }
  }
}

function collectSimpleWorkspacePattern(target, pattern, source, packages) {
  const normalized = String(pattern || '').trim();
  if (!normalized || normalized.startsWith('!')) {
    return;
  }

  const base = normalized.endsWith('/*') ? normalized.slice(0, -2) : normalized;
  const baseDirectory = path.join(target, base);
  if (!fs.existsSync(baseDirectory) || !fs.statSync(baseDirectory).isDirectory()) {
    return;
  }

  if (normalized.endsWith('/*')) {
    for (const entry of fs.readdirSync(baseDirectory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        addPackage(target, path.join(base, entry.name), source, packages);
      }
    }
    return;
  }

  addPackage(target, base, source, packages);
}

function addPackage(target, relativePath, source, packages) {
  const normalizedPath = normalizeRelativePath(relativePath);
  if (!normalizedPath || normalizedPath === '.') {
    return;
  }

  const packagePath = path.join(target, normalizedPath);
  if (!fs.existsSync(packagePath) || !fs.statSync(packagePath).isDirectory()) {
    return;
  }

  packages.push({
    name: readPackageName(packagePath) || path.basename(packagePath),
    path: normalizedPath,
    source,
    type: detectProjectType(packagePath)
  });
}

function readPackageName(packagePath) {
  const packageJsonPath = path.join(packagePath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }

  try {
    const packageJson = readJsonFile(packageJsonPath);
    return packageJson.name || null;
  }
  catch {
    return null;
  }
}

function dedupePackages(packages) {
  const seen = new Set();
  const result = [];

  for (const pkg of packages) {
    if (seen.has(pkg.path)) {
      continue;
    }
    seen.add(pkg.path);
    result.push(pkg);
  }

  return result.sort((a, b) => a.path.localeCompare(b.path));
}

function normalizeRelativePath(relativePath) {
  return String(relativePath).replace(/\\/g, '/').replace(/\/+$/g, '');
}

module.exports = {
  detectMonorepo
};
