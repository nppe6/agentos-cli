const fs = require('fs');
const path = require('path');
const { SOURCE_DIRECTORY_NAME } = require('../utils/agent-os');
const { printBanner } = require('../utils/banner');
const { ensureDirectory } = require('../utils/fs');

function createJoinerTask(name, target = '.', options = {}) {
  const renderBanner = options.printBanner || printBanner;
  renderBanner();

  const developer = normalizeDeveloperName(name);
  const targetDirectory = path.resolve(target);
  const tasksDirectory = path.join(targetDirectory, SOURCE_DIRECTORY_NAME, 'tasks');

  if (!fs.existsSync(tasksDirectory) || !fs.statSync(tasksDirectory).isDirectory()) {
    throw new Error(`Missing ${SOURCE_DIRECTORY_NAME}/tasks directory. Run shelf init first.`);
  }

  const slug = `00-join-${slugify(developer)}`;
  const taskDirectory = path.join(tasksDirectory, slug);

  if (fs.existsSync(taskDirectory) && !options.force) {
    throw new Error(`Joiner task already exists: ${SOURCE_DIRECTORY_NAME}/tasks/${slug}`);
  }

  ensureDirectory(taskDirectory);
  fs.writeFileSync(path.join(taskDirectory, 'task.json'), `${JSON.stringify(createTaskJson(developer, slug), null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(taskDirectory, 'prd.md'), createPrd(developer), 'utf8');
  fs.writeFileSync(path.join(taskDirectory, 'implement.jsonl'), createJsonl([
    {
      file: '.shelf/workflow.md',
      reason: 'Understand the Shelf task lifecycle before contributing.'
    },
    {
      file: '.shelf/spec/README.md',
      reason: 'Find the project guideline entry points.'
    },
    {
      file: '.shelf/workspace/README.md',
      reason: 'Understand workspace memory and journal expectations.'
    }
  ]), 'utf8');
  fs.writeFileSync(path.join(taskDirectory, 'check.jsonl'), createJsonl([
    {
      file: '.shelf/tasks/README.md',
      reason: 'Verify the onboarding task follows the local task model.'
    }
  ]), 'utf8');

  console.log(`Joiner task created: ${SOURCE_DIRECTORY_NAME}/tasks/${slug}`);

  return {
    developer,
    taskDirectory,
    taskPath: `${SOURCE_DIRECTORY_NAME}/tasks/${slug}`
  };
}

function createTaskJson(developer, slug) {
  return {
    id: slug,
    title: `Onboard ${developer} to AgentOS Shelf`,
    description: `Create a lightweight onboarding path for ${developer}.`,
    status: 'planning',
    priority: 'P2',
    assignee: developer,
    parent: null,
    children: [],
    createdAt: new Date().toISOString()
  };
}

function createPrd(developer) {
  return `# Onboard ${developer} to AgentOS Shelf

## Goal

Help ${developer} understand this project's Shelf workflow without copying every rule into root prompt files.

## Context To Read

- \`.shelf/workflow.md\`
- \`.shelf/spec/README.md\`
- \`.shelf/tasks/README.md\`
- \`.shelf/workspace/README.md\`
- \`AGENTS.md\`

## Acceptance Criteria

- ${developer} can explain where project rules, task state, and workspace memory live.
- ${developer} has run \`agentos-cli shelf developer init ${developer}\` or the equivalent runtime script.
- Any missing project-specific spec gaps are recorded in \`.shelf/spec/\` or a follow-up task.
`;
}

function createJsonl(rows) {
  return rows.map((row) => JSON.stringify(row)).join('\n') + '\n';
}

function normalizeDeveloperName(name) {
  const normalized = String(name || '').trim();
  if (!normalized) {
    throw new Error('Developer name is required.');
  }

  return normalized;
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'developer';
}

module.exports = {
  createJoinerTask
};
