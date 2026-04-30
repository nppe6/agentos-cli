const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HASHES_FILE = 'template-hashes.json';
const HASHES_SCHEMA_VERSION = 1;

function computeHash(content) {
  return crypto
    .createHash('sha256')
    .update(String(content).replace(/\r\n/g, '\n'), 'utf8')
    .digest('hex');
}

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function getHashesPath(targetDirectory) {
  return path.join(targetDirectory, '.agent-os', HASHES_FILE);
}

function loadTemplateHashes(targetDirectory) {
  const hashesPath = getHashesPath(targetDirectory);
  if (!fs.existsSync(hashesPath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(hashesPath, 'utf8'));
    if (parsed && parsed.schemaVersion === HASHES_SCHEMA_VERSION && parsed.files) {
      return parsed.files;
    }
  }
  catch {
    return {};
  }

  return {};
}

function writeTemplateHashes(targetDirectory, relativeFiles) {
  const files = {};

  for (const relativeFile of relativeFiles) {
    const normalizedPath = normalizePath(relativeFile);
    const absolutePath = path.join(targetDirectory, relativeFile);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      continue;
    }

    files[normalizedPath] = {
      hash: computeHash(fs.readFileSync(absolutePath, 'utf8')),
      updatedAt: new Date().toISOString()
    };
  }

  const hashesPath = getHashesPath(targetDirectory);
  fs.mkdirSync(path.dirname(hashesPath), { recursive: true });
  fs.writeFileSync(
    hashesPath,
    `${JSON.stringify({ schemaVersion: HASHES_SCHEMA_VERSION, files }, null, 2)}\n`,
    'utf8'
  );

  return files;
}

module.exports = {
  HASHES_FILE,
  computeHash,
  loadTemplateHashes,
  normalizePath,
  writeTemplateHashes
};
