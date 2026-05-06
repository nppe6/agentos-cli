const fs = require('fs');
const path = require('path');

function pruneSpecScaffold(targetDirectory, options = {}) {
  const projectType = normalizeProjectType(options.projectType);
  const packages = Array.isArray(options.packages) ? options.packages : [];
  const specDirectory = path.join(path.resolve(targetDirectory), '.shelf', 'spec');

  if (!fs.existsSync(specDirectory) || !fs.statSync(specDirectory).isDirectory()) {
    return { removed: [] };
  }

  if (packages.length > 0) {
    return {
      removed: removeSpecDirectories(specDirectory, ['backend', 'frontend'])
    };
  }

  if (projectType === 'frontend') {
    return {
      removed: removeSpecDirectories(specDirectory, ['backend'])
    };
  }

  if (projectType === 'backend') {
    return {
      removed: removeSpecDirectories(specDirectory, ['frontend'])
    };
  }

  return { removed: [] };
}

function removeSpecDirectories(specDirectory, names) {
  const removed = [];

  for (const name of names) {
    const directory = path.join(specDirectory, name);
    if (!fs.existsSync(directory)) {
      continue;
    }

    fs.rmSync(directory, { force: true, recursive: true });
    removed.push(normalizeRelativePath(path.join('.shelf', 'spec', name)));
  }

  return removed;
}

function normalizeProjectType(projectType) {
  return projectType === 'frontend' || projectType === 'backend' || projectType === 'fullstack'
    ? projectType
    : 'fullstack';
}

function normalizeRelativePath(filePath) {
  return String(filePath).replace(/\\/g, '/').replace(/\/+$/g, '');
}

module.exports = {
  pruneSpecScaffold
};
