const fs = require('fs');
const path = require('path');

const GIT_MODE_TRACK = 'track';
const GIT_MODE_IGNORE = 'ignore';
const GITIGNORE_BLOCK_START = '# agentos-cli: injected-agent-os:start';
const GITIGNORE_BLOCK_END = '# agentos-cli: injected-agent-os:end';
const DEFAULT_GITIGNORE_ENTRIES = [
  'AGENTS.md',
  'CLAUDE.md',
  '.shelf/',
  '.claude/',
  '.codex/'
];

function updateGitIgnore(targetDirectory, gitMode, entries = DEFAULT_GITIGNORE_ENTRIES) {
  const resolvedGitMode = resolveGitMode(gitMode);
  const resolvedEntries = normalizeEntries(entries);
  const gitignorePath = path.join(targetDirectory, '.gitignore');
  const currentContent = fs.existsSync(gitignorePath)
    ? fs.readFileSync(gitignorePath, 'utf8')
    : '';
  const contentWithoutBlock = stripManagedBlock(currentContent);

  if (resolvedGitMode === GIT_MODE_TRACK) {
    if (contentWithoutBlock === currentContent) {
      return { updated: false, gitMode: resolvedGitMode };
    }

    if (contentWithoutBlock.length === 0) {
      fs.rmSync(gitignorePath, { force: true });
      return { updated: true, gitMode: resolvedGitMode };
    }

    fs.writeFileSync(gitignorePath, contentWithoutBlock, 'utf8');
    return { updated: true, gitMode: resolvedGitMode };
  }

  const managedBlock = `${createManagedBlock(resolvedEntries)}\n`;
  const nextContent = currentContent.length === 0
    ? managedBlock
    : `${trimTrailingNewlines(contentWithoutBlock)}\n\n${createManagedBlock(resolvedEntries)}\n`;

  if (nextContent === currentContent) {
    return { updated: false, gitMode: resolvedGitMode };
  }

  fs.writeFileSync(gitignorePath, nextContent, 'utf8');
  return { updated: true, gitMode: resolvedGitMode };
}

function createManagedBlock(entries = DEFAULT_GITIGNORE_ENTRIES) {
  return [
    GITIGNORE_BLOCK_START,
    ...normalizeEntries(entries),
    GITIGNORE_BLOCK_END
  ].join('\n');
}

function normalizeEntries(entries) {
  const uniqueEntries = Array.from(new Set(entries.map((entry) => String(entry).trim()).filter(Boolean)));
  if (uniqueEntries.length === 0) {
    throw new Error('At least one .gitignore entry is required.');
  }

  return uniqueEntries;
}

function stripManagedBlock(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  const escapedStart = escapeRegExp(GITIGNORE_BLOCK_START);
  const escapedEnd = escapeRegExp(GITIGNORE_BLOCK_END);
  const blockPattern = new RegExp(`(?:\\n|^)${escapedStart}\\n[\\s\\S]*?\\n${escapedEnd}(?=\\n|$)`, 'g');
  const stripped = normalized.replace(blockPattern, '').replace(/\n{3,}/g, '\n\n');
  return normalizeTrailingNewline(stripped);
}

function normalizeTrailingNewline(content) {
  if (content.length === 0) {
    return '';
  }

  return `${trimTrailingNewlines(content)}\n`;
}

function trimTrailingNewlines(content) {
  return content.replace(/\r\n/g, '\n').replace(/\n+$/g, '');
}

function resolveGitMode(gitMode) {
  if (gitMode !== GIT_MODE_TRACK && gitMode !== GIT_MODE_IGNORE) {
    throw new Error('gitMode must be "track" or "ignore".');
  }

  return gitMode;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  GITIGNORE_BLOCK_END,
  GITIGNORE_BLOCK_START,
  GIT_MODE_IGNORE,
  GIT_MODE_TRACK,
  updateGitIgnore
};
