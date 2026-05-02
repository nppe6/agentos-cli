const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { SOURCE_DIRECTORY_NAME } = require('./agent-os');
const { ensureDirectory } = require('./fs');

function findGitUserName(targetDirectory, dependencies = {}) {
  const spawn = dependencies.spawnSync || spawnSync;
  const result = spawn('git', ['config', 'user.name'], {
    cwd: targetDirectory,
    encoding: 'utf8'
  });

  if (result.status !== 0 || result.error) {
    return null;
  }

  const name = String(result.stdout || '').trim();
  return name || null;
}

function initializeDeveloperIdentity(targetDirectory, name, options = {}) {
  const developer = String(name || '').trim();
  if (!developer) {
    return { initialized: false, reason: 'missing-name' };
  }

  const shelfDirectory = path.join(targetDirectory, SOURCE_DIRECTORY_NAME);
  if (!fs.existsSync(shelfDirectory)) {
    throw new Error(`Missing ${SOURCE_DIRECTORY_NAME} source directory. Run shelf init first.`);
  }

  const developerFile = path.join(shelfDirectory, '.developer');
  if (fs.existsSync(developerFile) && !options.force) {
    return {
      developer: readDeveloperName(developerFile),
      initialized: false,
      reason: 'already-initialized'
    };
  }

  const workspaceDirectory = path.join(shelfDirectory, 'workspace', developer);
  const initializedAt = new Date().toISOString();
  ensureDirectory(workspaceDirectory);
  fs.writeFileSync(developerFile, `name=${developer}\ninitialized_at=${initializedAt}\n`, 'utf8');

  const journalPath = path.join(workspaceDirectory, 'journal-1.md');
  if (!fs.existsSync(journalPath)) {
    const today = initializedAt.slice(0, 10);
    fs.writeFileSync(journalPath, `# Journal - ${developer} (Part 1)

> AI development session journal
> Started: ${today}

---

`, 'utf8');
  }

  const indexPath = path.join(workspaceDirectory, 'index.md');
  if (!fs.existsSync(indexPath)) {
    fs.writeFileSync(indexPath, `# Workspace Index - ${developer}

> Journal tracking for AI development sessions.

---

## Current Status

<!-- @@@auto:current-status -->
- **Active File**: \`journal-1.md\`
- **Total Sessions**: 0
- **Last Active**: -
<!-- @@@/auto:current-status -->

---

## Active Documents

<!-- @@@auto:active-documents -->
| File | Lines | Status |
|------|-------|--------|
| \`journal-1.md\` | ~0 | Active |
<!-- @@@/auto:active-documents -->

---

## Session History

<!-- @@@auto:session-history -->
| # | Date | Title | Commits | Branch |
|---|------|-------|---------|--------|
<!-- @@@/auto:session-history -->

---

## Notes

- Sessions are appended to journal files
- New journal file created when current exceeds 2000 lines
- Use \`agentos-cli shelf workspace add-session\` to record sessions
`, 'utf8');
  }

  return {
    developer,
    developerFile,
    initialized: true,
    workspaceDirectory
  };
}

function readDeveloperName(developerFile) {
  try {
    const content = fs.readFileSync(developerFile, 'utf8');
    const line = content.split(/\r?\n/).find((entry) => entry.startsWith('name='));
    return line ? line.slice('name='.length).trim() : null;
  }
  catch (_error) {
    return null;
  }
}

module.exports = {
  findGitUserName,
  initializeDeveloperIdentity
};
