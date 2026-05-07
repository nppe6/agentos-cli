const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { readJsonFile } = require('./json');

const HASHES_FILE = 'template-hashes.json';
const HASHES_SCHEMA_VERSION = 1;
const SOURCE_DIRECTORY_NAME = '.shelf';

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
  return path.join(targetDirectory, SOURCE_DIRECTORY_NAME, HASHES_FILE);
}

function loadTemplateHashes(targetDirectory) {
  const hashesPath = getHashesPath(targetDirectory);
  if (!fs.existsSync(hashesPath)) {
    return {};
  }

  try {
    const parsed = readJsonFile(hashesPath);
    if (parsed && parsed.schemaVersion === HASHES_SCHEMA_VERSION && parsed.files) {
      return parsed.files;
    }
  }
  catch {
    return {};
  }

  return {};
}

function writeTemplateHashes(targetDirectory, relativeFiles, options = {}) {
  const previousFiles = loadTemplateHashes(targetDirectory);
  const contentByPath = normalizeContentByPath(options.contentByPath || {});
  const preservePaths = new Set((options.preservePaths || []).map(normalizePath));
  const files = {};

  for (const relativeFile of relativeFiles) {
    const normalizedPath = normalizePath(relativeFile);
    const absolutePath = path.join(targetDirectory, relativeFile);
    if (preservePaths.has(normalizedPath) && previousFiles[normalizedPath]) {
      files[normalizedPath] = previousFiles[normalizedPath];
      continue;
    }

    if (!contentByPath[normalizedPath] && (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile())) {
      continue;
    }

    files[normalizedPath] = {
      hash: computeHash(contentByPath[normalizedPath] || fs.readFileSync(absolutePath, 'utf8')),
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

function normalizeContentByPath(contentByPath) {
  const normalized = {};
  for (const [filePath, content] of Object.entries(contentByPath)) {
    normalized[normalizePath(filePath)] = content;
  }

  return normalized;
}

module.exports = {
  HASHES_FILE,
  computeHash,
  loadTemplateHashes,
  normalizePath,
  writeTemplateHashes
};
