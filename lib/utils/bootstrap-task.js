const fs = require('fs');
const path = require('path');

const BOOTSTRAP_TASK_NAME = '00-bootstrap-guidelines';

function writeBootstrapTask(targetDirectory, options = {}) {
  const target = path.resolve(targetDirectory);
  const projectType = normalizeProjectType(options.projectType);
  const packages = Array.isArray(options.packages) ? options.packages : [];
  const taskDirectory = path.join(target, '.shelf', 'tasks', BOOTSTRAP_TASK_NAME);

  fs.mkdirSync(taskDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(taskDirectory, 'task.json'),
    `${JSON.stringify(getBootstrapTaskJson(projectType, packages), null, 2)}\n`,
    'utf8'
  );
  fs.writeFileSync(
    path.join(taskDirectory, 'prd.md'),
    getBootstrapPrdContent(projectType, packages),
    'utf8'
  );

  return {
    projectType,
    taskDirectory
  };
}

function getBootstrapChecklistItems(projectType, packages = []) {
  if (packages.length > 0) {
    return [
      ...packages.map((pkg) => `Fill guidelines for ${pkg.name || pkg.path}`),
      'Add code examples'
    ];
  }
  if (projectType === 'frontend') {
    return ['Fill frontend guidelines', 'Add code examples'];
  }
  if (projectType === 'backend') {
    return ['Fill backend guidelines', 'Add code examples'];
  }

  return ['Fill backend guidelines', 'Fill frontend guidelines', 'Add code examples'];
}

function getBootstrapRelatedFiles(projectType, packages = []) {
  if (packages.length > 0) {
    return packages.map((pkg) => `.shelf/spec/packages/${createPackageId(pkg.name || pkg.path)}/`);
  }
  if (projectType === 'frontend') {
    return ['.shelf/spec/frontend/'];
  }
  if (projectType === 'backend') {
    return ['.shelf/spec/backend/'];
  }

  return ['.shelf/spec/backend/', '.shelf/spec/frontend/'];
}

function getBootstrapTaskJson(projectType, packages = []) {
  return {
    id: BOOTSTRAP_TASK_NAME,
    name: BOOTSTRAP_TASK_NAME,
    title: 'Bootstrap Project Guidelines',
    description: 'AI-facing first-run task for filling .shelf/spec with this project\'s real development conventions.',
    status: 'in_progress',
    scope: 'docs',
    priority: 'P1',
    creator: 'agentos-cli',
    assignee: 'project-ai',
    createdAt: new Date().toISOString().slice(0, 10),
    relatedFiles: getBootstrapRelatedFiles(projectType, packages),
    subtasks: [],
    notes: `Created by AgentOS Shelf init as the Trellis-aligned first-run spec bootstrap task (${projectType} project).`
  };
}

function getBootstrapPrdContent(projectType, packages = []) {
  const checklistMarkdown = getBootstrapChecklistItems(projectType, packages)
    .map((item) => `- [ ] ${item}`)
    .join('\n');

  let content = `# Bootstrap Task: Fill Project Development Guidelines

**You (the AI) are running this task. The developer does not read this file.**

The developer just ran \`shelf init\` on this project for the first time.
\`.shelf/\` now exists with empty spec scaffolding, and this bootstrap task
exists under \`.shelf/tasks/\`. When they want to work on it, they should start
this task from a session that provides Shelf session identity.

**Your job**: help them populate \`.shelf/spec/\` with the team's real
coding conventions. Every future AI session uses those spec files as durable
project memory. Empty spec = agents write generic code. Real spec = agents
match the team's actual patterns.

Don't dump instructions. Open with a short greeting, figure out if the repo
has any existing convention docs (AGENTS.md, CLAUDE.md, .cursorrules, etc.),
and drive the rest conversationally.

---

## Status (update the checkboxes as you complete each item)

${checklistMarkdown}

---

## Spec files to populate
`;

  if (packages.length > 0) {
    content += renderPackageSections(packages);
  }
  else if (projectType === 'frontend') {
    content += renderFrontendSection('.shelf/spec/frontend');
  }
  else if (projectType === 'backend') {
    content += renderBackendSection('.shelf/spec/backend');
  }
  else {
    content += renderBackendSection('.shelf/spec/backend');
    content += renderFrontendSection('.shelf/spec/frontend');
  }

  content += `

### Thinking guides (already populated)

\`.shelf/spec/guides/\` contains general thinking guides pre-filled with
best practices. Customize only if something clearly doesn't fit this project.

---

## How to fill the spec

### Step 1: Import Existing Convention Sources First

Search the repo for existing convention docs. If any exist, read them and
extract the relevant rules into the matching \`.shelf/spec/\` files --
usually much faster than documenting from scratch.

| File / Directory | Tool |
|------|------|
| \`AGENTS.md\` | Codex / Claude Code / agent-compatible tools |
| \`CLAUDE.md\` / \`CLAUDE.local.md\` | Claude Code |
| \`.cursorrules\` | Cursor |
| \`.cursor/rules/*.mdc\` | Cursor (rules directory) |
| \`.windsurfrules\` | Windsurf |
| \`.clinerules\` | Cline |
| \`.roomodes\` | Roo Code |
| \`.github/copilot-instructions.md\` | GitHub Copilot |
| \`.vscode/settings.json\` -> \`github.copilot.chat.codeGeneration.instructions\` | VS Code Copilot |
| \`CONVENTIONS.md\` / \`.aider.conf.yml\` | aider |
| \`CONTRIBUTING.md\` | General project conventions |
| \`.editorconfig\` | Editor formatting rules |

### Step 2: Inspect Real Code

Scan real code to discover patterns. Before writing each spec file:
- Find 2-3 real examples of each pattern in the codebase.
- Reference real file paths (not hypothetical ones).
- Document anti-patterns the team clearly avoids.

### Step 3: Document Current Reality

**Critical**: write what the code *actually does*, not what it should do.
Agents match the spec, so aspirational patterns that don't exist in the
codebase will cause agents to write code that looks out of place.

If the team has known tech debt, document the current state. Improvement is a
separate conversation, not a bootstrap concern.

---

## Daily development after bootstrap

After normal feature work, use \`shelf-update-spec\` when you discover a new
durable convention, recurring bug, interface contract, testing requirement, or
architecture decision. Bootstrap fills the initial spec; \`shelf-update-spec\`
keeps it alive as the project evolves.

---

## Completion

When the developer confirms the checklist items above are done with real
examples (not placeholders), guide them to run:

\`\`\`bash
python ./.shelf/scripts/task.py finish
python ./.shelf/scripts/task.py archive 00-bootstrap-guidelines
\`\`\`

---

## Suggested opening line

"Welcome to Shelf! Your init just set me up to help you fill the project spec
-- a one-time setup so every future AI session follows the team's conventions
instead of writing generic code. Before we start, do you have any existing
convention docs (AGENTS.md, CLAUDE.md, .cursorrules, CONTRIBUTING.md, etc.) I
can pull from, or should I scan the codebase from scratch?"
`;

  return content;
}

function renderBackendSection(basePath) {
  return `

### Backend guidelines

| File | What to document |
|------|------------------|
| \`${basePath}/index.md\` | Backend spec overview and links |
| \`${basePath}/directory-structure.md\` | Where different file types go (routes, services, utils) |
| \`${basePath}/database-guidelines.md\` | ORM, migrations, query patterns, naming conventions |
| \`${basePath}/error-handling.md\` | How errors are caught, logged, and returned |
| \`${basePath}/logging-guidelines.md\` | Log levels, format, what to log |
| \`${basePath}/quality-guidelines.md\` | Code review standards, testing requirements |
`;
}

function renderFrontendSection(basePath) {
  return `

### Frontend guidelines

| File | What to document |
|------|------------------|
| \`${basePath}/index.md\` | Frontend spec overview and links |
| \`${basePath}/directory-structure.md\` | Component/page/hook organization |
| \`${basePath}/component-guidelines.md\` | Component patterns, props conventions |
| \`${basePath}/hook-guidelines.md\` | Custom hook naming, patterns |
| \`${basePath}/state-management.md\` | State library, patterns, what goes where |
| \`${basePath}/type-safety.md\` | TypeScript conventions, type organization |
| \`${basePath}/quality-guidelines.md\` | Linting, testing, accessibility |
`;
}

function renderPackageSections(packages) {
  let content = `

### Package-Specific Guidelines

This repository looks like a monorepo. Use shared \`.shelf/spec/\` docs for
cross-package rules, then fill package-specific specs for conventions that
only apply inside one package.

Run this once if package spec folders do not exist yet:

\`\`\`bash
agentos-cli shelf spec scaffold
\`\`\`
`;

  for (const pkg of packages) {
    const packageId = createPackageId(pkg.name || pkg.path);
    const packageType = normalizeProjectType(pkg.type || 'unknown');
    const specBase = `.shelf/spec/packages/${packageId}`;
    const focus = packageType === 'frontend'
      ? 'frontend directory structure, component patterns, state management, TypeScript rules, UI tests, and lint commands'
      : packageType === 'backend'
        ? 'backend directory structure, API boundaries, persistence patterns, error handling, logging, tests, and lint commands'
        : 'backend and frontend boundaries, shared contracts, package ownership, tests, and lint commands';
    content += `

### Package: ${pkg.name || pkg.path}

- Path: \`${pkg.path}\`
- Detected type: \`${packageType}\`
- Spec root: \`${specBase}/\`
- Focus: ${focus}

| File | What to document |
|------|------------------|
| \`${specBase}/README.md\` | Package responsibility, path, and links to package spec files |
| \`${specBase}/architecture.md\` | Package boundaries, imports/exports, API contracts, and structure |
| \`${specBase}/quality.md\` | Package-specific test, lint, typecheck, fixtures, and failure modes |
`;
  }

  return content;
}

function normalizeProjectType(projectType) {
  return projectType === 'frontend' || projectType === 'backend' || projectType === 'fullstack'
    ? projectType
    : 'fullstack';
}

function createPackageId(value) {
  return String(value || '')
    .trim()
    .replace(/^@/, '')
    .replace(/\\/g, '/')
    .replace(/\/package\.json$/, '')
    .replace(/[^a-zA-Z0-9._/-]+/g, '-')
    .replace(/[/.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

module.exports = {
  BOOTSTRAP_TASK_NAME,
  getBootstrapPrdContent,
  getBootstrapTaskJson,
  writeBootstrapTask
};
