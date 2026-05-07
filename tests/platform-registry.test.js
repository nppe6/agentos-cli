const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const agentInit = require('../lib/actions/agent-init');
const { scaffoldPackageSpecs } = require('../lib/actions/agent-spec');
const { detectMonorepo } = require('../lib/utils/monorepo');
const { detectProjectType } = require('../lib/utils/project-detector');
const { getPlatform } = require('../lib/utils/platform-registry');
const {
  SHARED_HOOKS_BY_PLATFORM,
  getSharedHookScriptsForPlatform
} = require('../lib/utils/shared-hooks');

function createTempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agentos-cli-platform-'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function runSilently(action) {
  const originalLog = console.log;
  console.log = () => {};

  try {
    return await action();
  }
  finally {
    console.log = originalLog;
  }
}

test('platform registry describes Codex and Claude capabilities', () => {
  const codex = getPlatform('codex');
  const claude = getPlatform('claude');

  assert.equal(codex.capabilities.openAgentSkills, true);
  assert.equal(codex.capabilities.promptCommands, false);
  assert.equal(codex.capabilities.agentPullContext, true);
  assert.equal(codex.capabilities.hooks, true);
  assert.equal(codex.capabilities.settings, true);
  assert.equal(codex.capabilities.toolScopedSkills, true);
  assert.equal(codex.capabilities.projectedToolScopedSkills, false);
  assert.equal(codex.rootDirectory, '.codex');
  assert.equal(codex.skillsDirectory, '.codex/skills');
  assert.equal(claude.capabilities.hooks, true);
  assert.equal(claude.capabilities.agentPullContext, true);
  assert.equal(claude.capabilities.commands, true);
  assert.equal(claude.capabilities.settings, true);
  assert.equal(claude.capabilities.toolScopedSkills, true);
  assert.equal(claude.capabilities.projectedToolScopedSkills, true);
  assert.equal(claude.entryFile, undefined);
  assert.equal(claude.skillsDirectory, '.claude/skills');
});

test('core template source uses common skill and bundled skill directories', () => {
  const templateRoot = path.join(__dirname, '..', 'templates', 'core', '.shelf', 'templates');

  assert.equal(fs.existsSync(path.join(templateRoot, 'common-skills', 'brainstorm.md')), true);
  assert.equal(fs.existsSync(path.join(templateRoot, 'bundled-skills', 'shelf-meta', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'templates', 'core', '.shelf', 'templates', 'common-commands', 'start.md')), true);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'templates', 'core', '.shelf', 'skills', 'shelf-brainstorm', 'SKILL.md')), false);
});

test('monorepo detector reads package.json workspaces', () => {
  const projectDirectory = createTempProject();
  writeJson(path.join(projectDirectory, 'package.json'), {
    workspaces: ['packages/*']
  });
  writeJson(path.join(projectDirectory, 'packages', 'web', 'package.json'), {
    name: '@demo/web'
  });
  writeJson(path.join(projectDirectory, 'packages', 'api', 'package.json'), {
    name: '@demo/api'
  });

  const packages = detectMonorepo(projectDirectory);

  assert.deepEqual(packages.map((pkg) => pkg.path), ['packages/api', 'packages/web']);
  assert.deepEqual(packages.map((pkg) => pkg.name), ['@demo/api', '@demo/web']);
});

test('shared hook registry maps supported hooks by platform', () => {
  assert.deepEqual(SHARED_HOOKS_BY_PLATFORM.codex, [
    'shelf-inject-workflow-state.py'
  ]);
  assert.deepEqual(SHARED_HOOKS_BY_PLATFORM.claude, [
    'shelf-session-start.py',
    'shelf-inject-workflow-state.py'
  ]);
});

test('shared hook registry resolves real template files', () => {
  const agentOsDirectory = path.join(__dirname, '..', 'templates', 'core', '.shelf');
  const sharedHooksDirectory = path.join(agentOsDirectory, 'templates', 'shared-hooks');
  const hooks = [
    ...getSharedHookScriptsForPlatform('codex', { agentOsDirectory, sharedHooksDirectory }),
    ...getSharedHookScriptsForPlatform('claude', { agentOsDirectory, sharedHooksDirectory })
  ];

  assert.equal(hooks.length, 3);
  for (const hook of hooks) {
    assert.equal(fs.existsSync(hook.sourcePath), true, hook.sourcePath);
  }
});

test('project detector classifies frontend backend and fullstack projects', () => {
  const frontendDirectory = createTempProject();
  writeJson(path.join(frontendDirectory, 'package.json'), {
    dependencies: {
      vue: '^3.0.0'
    }
  });

  const backendDirectory = createTempProject();
  fs.writeFileSync(path.join(backendDirectory, 'server.js'), 'require("express")();\n', 'utf8');

  const fullstackDirectory = createTempProject();
  writeJson(path.join(fullstackDirectory, 'package.json'), {
    dependencies: {
      express: '^4.0.0',
      react: '^18.0.0'
    }
  });

  assert.equal(detectProjectType(frontendDirectory), 'frontend');
  assert.equal(detectProjectType(backendDirectory), 'backend');
  assert.equal(detectProjectType(fullstackDirectory), 'fullstack');
});

test('monorepo detector includes package project type', () => {
  const projectDirectory = createTempProject();
  writeJson(path.join(projectDirectory, 'package.json'), {
    workspaces: ['packages/*']
  });
  writeJson(path.join(projectDirectory, 'packages', 'web', 'package.json'), {
    name: '@demo/web',
    dependencies: {
      react: '^18.0.0'
    }
  });
  writeJson(path.join(projectDirectory, 'packages', 'api', 'package.json'), {
    name: '@demo/api',
    dependencies: {
      express: '^4.0.0'
    }
  });

  const packages = detectMonorepo(projectDirectory);

  assert.deepEqual(packages.map((pkg) => [pkg.name, pkg.type]), [
    ['@demo/api', 'backend'],
    ['@demo/web', 'frontend']
  ]);
});

test('init reports detected workspace packages', async () => {
  const projectDirectory = createTempProject();
  writeJson(path.join(projectDirectory, 'package.json'), {
    workspaces: ['packages/*']
  });
  writeJson(path.join(projectDirectory, 'packages', 'web', 'package.json'), {
    name: '@demo/web'
  });

  const result = await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  assert.equal(result.detectedPackages.length, 1);
  assert.equal(result.detectedPackages[0].path, 'packages/web');
});

test('spec scaffold creates package spec folders from workspaces', async () => {
  const projectDirectory = createTempProject();
  writeJson(path.join(projectDirectory, 'package.json'), {
    workspaces: ['packages/*']
  });
  writeJson(path.join(projectDirectory, 'packages', 'web', 'package.json'), {
    name: '@demo/web'
  });

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const result = await runSilently(() => scaffoldPackageSpecs(projectDirectory));

  assert.equal(result.packages[0].id, 'demo-web');
  assert.equal(result.writtenFiles.includes('.shelf/spec/packages/demo-web/README.md'), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'packages', 'demo-web', 'architecture.md')), true);
  assert.match(
    fs.readFileSync(path.join(projectDirectory, '.shelf', 'spec', 'packages', 'demo-web', 'README.md'), 'utf8'),
    /Package path: `packages\/web`/
  );
});

test('spec scaffold dry-run does not write package spec files', async () => {
  const projectDirectory = createTempProject();
  writeJson(path.join(projectDirectory, 'package.json'), {
    workspaces: ['packages/*']
  });
  writeJson(path.join(projectDirectory, 'packages', 'api', 'package.json'), {
    name: '@demo/api'
  });

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const result = await runSilently(() => scaffoldPackageSpecs(projectDirectory, { dryRun: true }));

  assert.equal(result.plannedFiles.includes('.shelf/spec/packages/demo-api/quality.md'), true);
  assert.equal(result.writtenFiles.length, 0);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'packages', 'demo-api')), false);
});

test('spec scaffold preserves existing package spec files unless forced', async () => {
  const projectDirectory = createTempProject();
  writeJson(path.join(projectDirectory, 'package.json'), {
    workspaces: ['packages/*']
  });
  writeJson(path.join(projectDirectory, 'packages', 'web', 'package.json'), {
    name: '@demo/web'
  });

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));
  const readmePath = path.join(projectDirectory, '.shelf', 'spec', 'packages', 'demo-web', 'README.md');
  await runSilently(() => scaffoldPackageSpecs(projectDirectory));
  fs.writeFileSync(readmePath, '# Custom package spec\n', 'utf8');

  const result = await runSilently(() => scaffoldPackageSpecs(projectDirectory));

  assert.equal(fs.readFileSync(readmePath, 'utf8'), '# Custom package spec\n');
  assert.equal(result.skippedFiles.includes('.shelf/spec/packages/demo-web/README.md'), true);
});

test('spec scaffold supports manual package declarations', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const result = await runSilently(() => scaffoldPackageSpecs(projectDirectory, {
    package: 'web=apps/web,api=services/api'
  }));

  assert.deepEqual(result.packages.map((pkg) => pkg.id), ['web', 'api']);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'packages', 'web', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'packages', 'api', 'quality.md')), true);
});
