const fs = require('fs');
const path = require('path');
const { SOURCE_DIRECTORY_NAME, readAgentOsManifest } = require('../utils/agent-os');
const { ensureDirectory } = require('../utils/fs');
const { detectMonorepo } = require('../utils/monorepo');

function scaffoldPackageSpecs(target = '.', options = {}) {
  const targetDirectory = path.resolve(target);
  const manifest = readAgentOsManifest(targetDirectory);

  if (!manifest) {
    throw new Error(`Missing ${SOURCE_DIRECTORY_NAME}/manifest.json. Run shelf init first.`);
  }

  const packages = resolvePackages(targetDirectory, options);
  const plannedFiles = [];
  const writtenFiles = [];
  const skippedFiles = [];

  for (const pkg of packages) {
    for (const file of buildPackageSpecFiles(pkg)) {
      const absolutePath = path.join(targetDirectory, file.path);
      plannedFiles.push(file.path);

      if (fs.existsSync(absolutePath) && !options.force) {
        skippedFiles.push(file.path);
        continue;
      }

      if (options.dryRun) {
        continue;
      }

      ensureDirectory(path.dirname(absolutePath));
      fs.writeFileSync(absolutePath, file.content, 'utf8');
      writtenFiles.push(file.path);
    }
  }

  printScaffoldSummary({ dryRun: Boolean(options.dryRun), packages, plannedFiles, skippedFiles, writtenFiles });

  return {
    dryRun: Boolean(options.dryRun),
    packages,
    plannedFiles,
    skippedFiles,
    targetDirectory,
    writtenFiles
  };
}

function resolvePackages(targetDirectory, options = {}) {
  if (options.package) {
    return parsePackageOptions(options.package);
  }

  return detectMonorepo(targetDirectory).map((pkg) => ({
    id: createPackageId(pkg.name || pkg.path),
    name: pkg.name,
    path: pkg.path,
    source: pkg.source
  }));
}

function resolveDetectedPackageSpecs(targetDirectory) {
  return detectMonorepo(targetDirectory).map((pkg) => ({
    id: createPackageId(pkg.name || pkg.path),
    name: pkg.name,
    path: pkg.path,
    specPath: normalizeRelativePath(path.join(SOURCE_DIRECTORY_NAME, 'spec', 'packages', createPackageId(pkg.name || pkg.path))),
    source: pkg.source
  }));
}

function parsePackageOptions(value) {
  const values = Array.isArray(value)
    ? value
    : String(value || '').split(',');

  return values
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [nameOrPath, explicitPath] = item.split('=').map((part) => part.trim()).filter(Boolean);
      const packagePath = explicitPath || nameOrPath;
      return {
        id: createPackageId(nameOrPath),
        name: explicitPath ? nameOrPath : path.basename(packagePath),
        path: normalizeRelativePath(packagePath),
        source: 'manual'
      };
    });
}

function buildPackageSpecFiles(pkg) {
  const basePath = normalizeRelativePath(path.join(SOURCE_DIRECTORY_NAME, 'spec', 'packages', pkg.id));

  return [
    {
      path: `${basePath}/README.md`,
      content: renderPackageReadme(pkg)
    },
    {
      path: `${basePath}/architecture.md`,
      content: renderPackageArchitecture(pkg)
    },
    {
      path: `${basePath}/quality.md`,
      content: renderPackageQuality(pkg)
    }
  ];
}

function renderPackageReadme(pkg) {
  return `# ${pkg.name || pkg.id} Specs

Package path: \`${pkg.path}\`

Use this package spec layer for conventions that are more specific than the shared \`.shelf/spec/\` guidance.

## Start Here

- Read \`architecture.md\` before changing this package's structure or boundaries.
- Read \`quality.md\` before final verification.
- Link task-specific research or decisions from the active \`.shelf/tasks/\` folder when they become durable package knowledge.
`;
}

function renderPackageArchitecture(pkg) {
  return `# ${pkg.name || pkg.id} Architecture

Package path: \`${pkg.path}\`

## Responsibility

- Describe what this package owns.
- Describe what this package should not own.

## Boundaries

- Record important imports, exports, API contracts, build outputs, or runtime entry points.
- Prefer concrete examples from the package over aspirational rules.
`;
}

function renderPackageQuality(pkg) {
  return `# ${pkg.name || pkg.id} Quality

Package path: \`${pkg.path}\`

## Verification

- List the package-specific test command or manual check.
- Record fixtures, environment variables, or generated files that matter for this package.

## Common Failure Modes

- Add recurring bugs, integration risks, and review checks as they are discovered.
`;
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

function normalizeRelativePath(filePath) {
  return String(filePath).replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/g, '');
}

function printScaffoldSummary({ dryRun, packages, plannedFiles, skippedFiles, writtenFiles }) {
  console.log(`AgentOS Shelf spec scaffold${dryRun ? ' dry-run' : ''}: ${packages.length} packages`);

  if (packages.length === 0) {
    console.log('No workspace packages found. Pass --package name=path to scaffold manually.');
    return;
  }

  if (dryRun) {
    console.log(`Would create or update ${plannedFiles.length} package spec files.`);
    return;
  }

  console.log(`Wrote ${writtenFiles.length} package spec files.`);
  if (skippedFiles.length > 0) {
    console.log(`Skipped ${skippedFiles.length} existing files. Use --force to overwrite.`);
  }
}

module.exports = {
  resolveDetectedPackageSpecs,
  scaffoldPackageSpecs
};
module.exports._private = {
  buildPackageSpecFiles,
  createPackageId,
  parsePackageOptions
};
