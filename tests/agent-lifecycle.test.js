const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');
const packageJson = require('../package.json');

const agentDoctor = require('../lib/actions/agent-doctor');
const agentInit = require('../lib/actions/agent-init');
const { createJoinerTask } = require('../lib/actions/agent-joiner');
const { scaffoldPackageSpecs } = require('../lib/actions/agent-spec');
const agentSync = require('../lib/actions/agent-sync');
const agentUpdate = require('../lib/actions/agent-update');

function createTempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agentos-cli-lifecycle-'));
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

test('init writes manifest and template hashes for a single-tool install', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const manifest = JSON.parse(fs.readFileSync(path.join(projectDirectory, '.shelf', 'manifest.json'), 'utf8'));
  const hashes = JSON.parse(fs.readFileSync(path.join(projectDirectory, '.shelf', 'template-hashes.json'), 'utf8'));

  assert.equal(manifest.schemaVersion, 1);
  assert.deepEqual(manifest.tools, ['codex']);
  assert.match(manifest.generatedFiles.join('\n'), /AGENTS\.md/);
  assert.doesNotMatch(manifest.generatedFiles.join('\n'), /\.codex\/skills\/brainstorm\/SKILL\.md/);
  assert.doesNotMatch(manifest.generatedFiles.join('\n'), /\.codex\/skills\/start\/SKILL\.md/);
  assert.match(manifest.generatedFiles.join('\n'), /\.agents\/skills\/shelf-brainstorm\/SKILL\.md/);
  assert.match(manifest.generatedFiles.join('\n'), /\.agents\/skills\/shelf-meta\/SKILL\.md/);
  assert.match(manifest.generatedFiles.join('\n'), /\.codex\/agents\/shelf-implement\.toml/);
  assert.match(manifest.generatedFiles.join('\n'), /\.codex\/config\.toml/);
  assert.match(manifest.generatedFiles.join('\n'), /\.codex\/hooks\.json/);
  assert.match(manifest.generatedFiles.join('\n'), /\.agents\/skills\/shelf-continue\/SKILL\.md/);
  assert.match(manifest.generatedFiles.join('\n'), /\.agents\/skills\/shelf-finish-work\/SKILL\.md/);
  assert.doesNotMatch(manifest.generatedFiles.join('\n'), /\.agents\/skills\/shelf-start\/SKILL\.md/);
  assert.equal(hashes.schemaVersion, 1);
  assert.equal(typeof hashes.files['AGENTS.md'].hash, 'string');
  assert.equal(typeof hashes.files['.agents/skills/shelf-brainstorm/SKILL.md'].hash, 'string');
  assert.equal(typeof hashes.files['.agents/skills/shelf-meta/SKILL.md'].hash, 'string');
  assert.equal(typeof hashes.files['.codex/agents/shelf-implement.toml'].hash, 'string');
  assert.equal(typeof hashes.files['.codex/config.toml'].hash, 'string');
  assert.equal(typeof hashes.files['.codex/hooks.json'].hash, 'string');
  assert.equal(typeof hashes.files['.agents/skills/shelf-continue/SKILL.md'].hash, 'string');
  assert.equal(typeof hashes.files['.agents/skills/shelf-finish-work/SKILL.md'].hash, 'string');
  assert.equal(typeof hashes.files['.shelf/manifest.json'].hash, 'string');
});

test('doctor reports a clean initialized project as ok', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex', 'claude']
  }));

  const result = await runSilently(() => agentDoctor(projectDirectory, { findPythonCommand: () => 'python3' }));

  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.tools, ['codex', 'claude']);
  assert.equal(result.pythonCommand, 'python3');
});

test('doctor reports missing runtime scripts', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  fs.rmSync(path.join(projectDirectory, '.shelf', 'scripts', 'task.py'), { force: true });

  const result = await runSilently(() => agentDoctor(projectDirectory, { findPythonCommand: () => 'python3' }));

  assert.equal(result.ok, false);
  assert.equal(result.issues.some((issue) => issue.includes('.shelf/scripts/task.py')), true);
});

test('doctor reports missing projected tool files', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex', 'claude']
  }));

  fs.rmSync(path.join(projectDirectory, '.codex', 'hooks.json'), { force: true });

  const result = await runSilently(() => agentDoctor(projectDirectory, { findPythonCommand: () => 'python3' }));

  assert.equal(result.ok, false);
  assert.equal(result.issues.some((issue) => issue.includes('.codex/hooks.json')), true);
});

test('doctor reports multiple missing projected files across platforms', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex', 'claude']
  }));

  fs.rmSync(path.join(projectDirectory, '.codex', 'config.toml'), { force: true });
  fs.rmSync(path.join(projectDirectory, '.codex', 'hooks', 'shelf-session-start.py'), { force: true });
  fs.rmSync(path.join(projectDirectory, '.claude', 'settings.json'), { force: true });
  fs.rmSync(path.join(projectDirectory, '.claude', 'hooks', 'shelf-inject-workflow-state.py'), { force: true });

  const result = await runSilently(() => agentDoctor(projectDirectory, { findPythonCommand: () => 'python3' }));

  assert.equal(result.ok, false);
  assert.equal(result.issues.some((issue) => issue.includes('.codex/config.toml')), true);
  assert.equal(result.issues.some((issue) => issue.includes('.codex/hooks/shelf-session-start.py')), true);
  assert.equal(result.issues.some((issue) => issue.includes('.claude/settings.json')), true);
  assert.equal(result.issues.some((issue) => issue.includes('.claude/hooks/shelf-inject-workflow-state.py')), true);
});

test('doctor reports missing shared skill projections', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex', 'claude']
  }));

  fs.rmSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-check', 'SKILL.md'), { force: true });

  const result = await runSilently(() => agentDoctor(projectDirectory, { findPythonCommand: () => 'python3' }));

  assert.equal(result.ok, false);
  assert.equal(result.issues.some((issue) => issue.includes('.agents/skills/shelf-check/SKILL.md')), true);
});

test('doctor warns when Python runtime is missing', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const result = await runSilently(() => agentDoctor(projectDirectory, { findPythonCommand: () => null }));

  assert.equal(result.ok, true);
  assert.equal(result.warnings.some((warning) => warning.includes('Python runtime not found')), true);
});

test('doctor warns when detected workspace packages lack package specs', async () => {
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

  const result = await runSilently(() => agentDoctor(projectDirectory, { findPythonCommand: () => 'python3' }));

  assert.equal(result.ok, true);
  assert.equal(result.missingPackageSpecs.length, 1);
  assert.equal(result.missingPackageSpecs[0].specPath, '.shelf/spec/packages/demo-web');
  assert.equal(result.warnings.some((warning) => warning.includes('Run shelf spec scaffold')), true);
});

test('doctor accepts workspace packages after package specs are scaffolded', async () => {
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
  await runSilently(() => scaffoldPackageSpecs(projectDirectory));

  const result = await runSilently(() => agentDoctor(projectDirectory, { findPythonCommand: () => 'python3' }));

  assert.equal(result.ok, true);
  assert.deepEqual(result.missingPackageSpecs, []);
  assert.equal(result.warnings.some((warning) => warning.includes('Run shelf spec scaffold')), false);
});

test('sync renders python3 into generated hook configs on non-Windows platforms', async () => {
  const projectDirectory = createTempProject();
  const originalPlatform = process.platform;

  Object.defineProperty(process, 'platform', {
    configurable: true,
    value: 'linux'
  });

  try {
    await runSilently(() => agentInit(projectDirectory, {
      force: true,
      gitMode: 'track',
      stack: 'core',
      tools: ['codex', 'claude']
    }));
  }
  finally {
    Object.defineProperty(process, 'platform', {
      configurable: true,
      value: originalPlatform
    });
  }

  const codexHooksContent = fs.readFileSync(path.join(projectDirectory, '.codex', 'hooks.json'), 'utf8');
  const claudeSettingsContent = fs.readFileSync(path.join(projectDirectory, '.claude', 'settings.json'), 'utf8');

  assert.match(codexHooksContent, /python3 \.codex\/hooks\/shelf-session-start\.py/);
  assert.match(codexHooksContent, /python3 \.codex\/hooks\/shelf-inject-workflow-state\.py/);
  assert.match(claudeSettingsContent, /python3 \.claude\/hooks\/shelf-session-start\.py/);
  assert.match(claudeSettingsContent, /python3 \.claude\/hooks\/shelf-inject-workflow-state\.py/);
});

test('sync dry-run reports missing projection files without writing them', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  fs.rmSync(path.join(projectDirectory, 'AGENTS.md'), { force: true });

  const result = await runSilently(() => agentSync(projectDirectory, { dryRun: true }));

  assert.equal(result.dryRun, true);
  assert.equal(result.changes.some((change) => change.path === 'AGENTS.md' && change.status === 'create'), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'AGENTS.md')), false);
});

test('sync dry-run classifies clean generated files as unchanged', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const result = await runSilently(() => agentSync(projectDirectory, { dryRun: true }));

  assert.equal(result.dryRun, true);
  assert.equal(result.changes.some((change) => change.path === 'AGENTS.md' && change.status === 'unchanged'), true);
});

test('sync preserves user content outside the managed AGENTS block', async () => {
  const projectDirectory = createTempProject();
  const agentsPath = path.join(projectDirectory, 'AGENTS.md');

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const original = fs.readFileSync(agentsPath, 'utf8');
  fs.writeFileSync(agentsPath, `# Local Notes\n\nKeep this.\n\n${original}`, 'utf8');
  const sharedRulesPath = path.join(projectDirectory, '.shelf', 'rules', 'AGENTS.shared.md');
  fs.mkdirSync(path.dirname(sharedRulesPath), { recursive: true });
  fs.writeFileSync(
    sharedRulesPath,
    fs.readFileSync(path.join(__dirname, '..', 'templates', 'core', '.shelf', 'rules', 'AGENTS.shared.md'), 'utf8'),
    'utf8'
  );
  fs.writeFileSync(
    sharedRulesPath,
    fs.readFileSync(sharedRulesPath, 'utf8').replace('<!-- SHELF:END -->', 'New source rule.\n\n<!-- SHELF:END -->'),
    'utf8'
  );

  const result = await runSilently(() => agentSync(projectDirectory));
  const updated = fs.readFileSync(agentsPath, 'utf8');

  assert.equal(result.skippedPaths.includes('AGENTS.md'), false);
  assert.match(updated, /# Local Notes/);
  assert.match(updated, /Keep this\./);
  assert.match(updated, /New source rule\./);
});

test('sync dry-run classifies clean files as update when source changes', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const sharedRulesPath = path.join(projectDirectory, '.shelf', 'rules', 'AGENTS.shared.md');
  fs.mkdirSync(path.dirname(sharedRulesPath), { recursive: true });
  fs.writeFileSync(
    sharedRulesPath,
    fs.readFileSync(path.join(__dirname, '..', 'templates', 'core', '.shelf', 'rules', 'AGENTS.shared.md'), 'utf8'),
    'utf8'
  );
  fs.writeFileSync(
    sharedRulesPath,
    fs.readFileSync(sharedRulesPath, 'utf8').replace('<!-- SHELF:END -->', 'New source rule.\n\n<!-- SHELF:END -->'),
    'utf8'
  );

  const result = await runSilently(() => agentSync(projectDirectory, { dryRun: true }));

  assert.equal(result.changes.some((change) => change.path === 'AGENTS.md' && change.status === 'update'), true);
});

test('sync dry-run compares transformed Codex agent templates', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const localAgentsDirectory = path.join(projectDirectory, '.shelf', 'agents');
  fs.mkdirSync(localAgentsDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(localAgentsDirectory, 'shelf-implement.md'),
    fs.readFileSync(path.join(__dirname, '..', 'templates', 'core', '.shelf', 'agents', 'shelf-implement.md'), 'utf8'),
    'utf8'
  );
  fs.appendFileSync(path.join(localAgentsDirectory, 'shelf-implement.md'), '\nSource agent update.\n', 'utf8');

  const result = await runSilently(() => agentSync(projectDirectory, { dryRun: true }));

  assert.equal(result.changes.some((change) => change.path === '.codex/agents/shelf-implement.toml' && change.status === 'update'), true);
});

test('sync preserves default managed-entry behavior when a local rules override exists', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const sharedRulesPath = path.join(projectDirectory, '.shelf', 'rules', 'AGENTS.shared.md');
  fs.mkdirSync(path.dirname(sharedRulesPath), { recursive: true });
  fs.writeFileSync(
    sharedRulesPath,
    fs.readFileSync(path.join(__dirname, '..', 'templates', 'core', '.shelf', 'rules', 'AGENTS.shared.md'), 'utf8'),
    'utf8'
  );
  fs.appendFileSync(sharedRulesPath, '\nLocal rule addition.\n', 'utf8');

  await runSilently(() => agentSync(projectDirectory));

  const agentsContent = fs.readFileSync(path.join(projectDirectory, 'AGENTS.md'), 'utf8');
  assert.match(agentsContent, /AgentOS Shelf Instructions/);
  assert.match(agentsContent, /Local rule addition\./);
});

test('update preserves unrelated common skills when a local common-skill override exists', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const localCommonSkillsDirectory = path.join(projectDirectory, '.shelf', 'templates', 'common-skills');
  fs.mkdirSync(localCommonSkillsDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(localCommonSkillsDirectory, 'brainstorm.md'),
    fs.readFileSync(path.join(__dirname, '..', 'templates', 'core', '.shelf', 'templates', 'common-skills', 'brainstorm.md'), 'utf8'),
    'utf8'
  );
  fs.appendFileSync(path.join(localCommonSkillsDirectory, 'brainstorm.md'), '\nLocal brainstorm change.\n', 'utf8');

  await runSilently(() => agentUpdate(projectDirectory));

  assert.equal(fs.existsSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-brainstorm', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-check', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-update-spec', 'SKILL.md')), true);
  assert.match(
    fs.readFileSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-brainstorm', 'SKILL.md'), 'utf8'),
    /Local brainstorm change\./
  );
});

test('update preserves unrelated shared hooks when a local shared-hook override exists', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex', 'claude']
  }));

  const localSharedHooksDirectory = path.join(projectDirectory, '.shelf', 'templates', 'shared-hooks');
  fs.mkdirSync(localSharedHooksDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(localSharedHooksDirectory, 'shelf-inject-workflow-state.py'),
    fs.readFileSync(path.join(__dirname, '..', 'templates', 'core', '.shelf', 'templates', 'shared-hooks', 'shelf-inject-workflow-state.py'), 'utf8'),
    'utf8'
  );
  fs.appendFileSync(path.join(localSharedHooksDirectory, 'shelf-inject-workflow-state.py'), '\n# local hook override\n', 'utf8');

  await runSilently(() => agentUpdate(projectDirectory));

  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'hooks', 'shelf-inject-workflow-state.py')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'hooks', 'shelf-inject-workflow-state.py')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'hooks', 'shelf-session-start.py')), true);
  assert.match(
    fs.readFileSync(path.join(projectDirectory, '.codex', 'hooks', 'shelf-inject-workflow-state.py'), 'utf8'),
    /# local hook override/
  );
});

test('sync dry-run classifies user-modified projection files without writing them', async () => {
  const projectDirectory = createTempProject();
  const agentsPath = path.join(projectDirectory, 'AGENTS.md');

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  fs.writeFileSync(
    agentsPath,
    fs.readFileSync(agentsPath, 'utf8').replace('<!-- SHELF:END -->', 'User edited managed block.\n\n<!-- SHELF:END -->'),
    'utf8'
  );
  const before = fs.readFileSync(agentsPath, 'utf8');

  const result = await runSilently(() => agentSync(projectDirectory, { dryRun: true }));

  assert.equal(result.changes.some((change) => change.path === 'AGENTS.md' && change.status === 'user-modified'), true);
  assert.equal(fs.readFileSync(agentsPath, 'utf8'), before);
});

test('sync dry-run classifies projection conflicts when source and user file both changed', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const sharedRulesPath = path.join(projectDirectory, '.shelf', 'rules', 'AGENTS.shared.md');
  fs.mkdirSync(path.dirname(sharedRulesPath), { recursive: true });
  fs.writeFileSync(
    sharedRulesPath,
    fs.readFileSync(path.join(__dirname, '..', 'templates', 'core', '.shelf', 'rules', 'AGENTS.shared.md'), 'utf8'),
    'utf8'
  );
  fs.writeFileSync(
    sharedRulesPath,
    fs.readFileSync(sharedRulesPath, 'utf8').replace('<!-- SHELF:END -->', 'New source rule.\n\n<!-- SHELF:END -->'),
    'utf8'
  );
  fs.writeFileSync(
    path.join(projectDirectory, 'AGENTS.md'),
    fs.readFileSync(path.join(projectDirectory, 'AGENTS.md'), 'utf8').replace('<!-- SHELF:END -->', 'User edited managed block.\n\n<!-- SHELF:END -->'),
    'utf8'
  );

  const result = await runSilently(() => agentSync(projectDirectory, { dryRun: true }));

  assert.equal(result.changes.some((change) => change.path === 'AGENTS.md' && change.status === 'conflict'), true);
});

test('sync skips user-modified projection files during writes', async () => {
  const projectDirectory = createTempProject();
  const agentsPath = path.join(projectDirectory, 'AGENTS.md');

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  fs.writeFileSync(
    agentsPath,
    fs.readFileSync(agentsPath, 'utf8').replace('<!-- SHELF:END -->', 'User edited managed block.\n\n<!-- SHELF:END -->'),
    'utf8'
  );
  const before = fs.readFileSync(agentsPath, 'utf8');

  const result = await runSilently(() => agentSync(projectDirectory));

  assert.deepEqual(result.skippedPaths, ['AGENTS.md']);
  assert.equal(fs.readFileSync(agentsPath, 'utf8'), before);
});

test('sync still skips user edits inside the managed AGENTS block', async () => {
  const projectDirectory = createTempProject();
  const agentsPath = path.join(projectDirectory, 'AGENTS.md');

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const content = fs.readFileSync(agentsPath, 'utf8').replace('<!-- SHELF:END -->', 'User edited managed block.\n\n<!-- SHELF:END -->');
  fs.writeFileSync(agentsPath, content, 'utf8');
  const result = await runSilently(() => agentSync(projectDirectory));

  assert.deepEqual(result.skippedPaths, ['AGENTS.md']);
});

test('sync regenerates missing projection files from .shelf', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  fs.rmSync(path.join(projectDirectory, 'AGENTS.md'), { force: true });

  const result = await runSilently(() => agentSync(projectDirectory));

  assert.equal(result.dryRun, false);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'AGENTS.md')), true);
  assert.equal(result.generatedFiles.includes('AGENTS.md'), true);
});

test('sync dry-run reports missing projected agent files', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  fs.rmSync(path.join(projectDirectory, '.codex', 'agents', 'shelf-research.toml'), { force: true });

  const result = await runSilently(() => agentSync(projectDirectory, { dryRun: true }));

  assert.equal(result.dryRun, true);
  assert.equal(result.changes.some((change) => change.path === '.codex/agents/shelf-research.toml' && change.status === 'create'), true);
});

test('update creates backups before applying projection changes', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const localAgentsDirectory = path.join(projectDirectory, '.shelf', 'agents');
  fs.mkdirSync(localAgentsDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(localAgentsDirectory, 'shelf-research.md'),
    fs.readFileSync(path.join(__dirname, '..', 'templates', 'core', '.shelf', 'agents', 'shelf-research.md'), 'utf8'),
    'utf8'
  );
  fs.appendFileSync(path.join(localAgentsDirectory, 'shelf-research.md'), '\nUpdated research agent.\n', 'utf8');

  const result = await runSilently(() => agentUpdate(projectDirectory));

  assert.equal(result.updated, true);
  assert.equal(result.backups.some((backup) => backup.endsWith('.codex/agents/shelf-research.toml')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'backups')), true);
});

test('update deletes obsolete generated projection files after backing them up', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex', 'claude']
  }));

  const result = await runSilently(() => agentUpdate(projectDirectory, { tools: ['codex'] }));

  assert.equal(result.deleted.some((filePath) => filePath === '.claude/settings.json'), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'settings.json')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'CLAUDE.md')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'update-manifest.json')), true);
});

test('sync preserves built-in Codex agents when a project overrides only one local agent template', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const localAgentsDirectory = path.join(projectDirectory, '.shelf', 'agents');
  fs.mkdirSync(localAgentsDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(localAgentsDirectory, 'shelf-implement.md'),
    fs.readFileSync(path.join(__dirname, '..', 'templates', 'core', '.shelf', 'agents', 'shelf-implement.md'), 'utf8'),
    'utf8'
  );
  fs.appendFileSync(path.join(localAgentsDirectory, 'shelf-implement.md'), '\nSource agent update.\n', 'utf8');

  await runSilently(() => agentUpdate(projectDirectory));

  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'agents', 'shelf-implement.toml')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'agents', 'shelf-check.toml')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'agents', 'shelf-research.toml')), true);
});

test('re-init preserves project-local .shelf skills after sync', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const localSkillPath = path.join(projectDirectory, '.shelf', 'skills', 'local-skill', 'SKILL.md');
  fs.mkdirSync(path.dirname(localSkillPath), { recursive: true });
  fs.writeFileSync(localSkillPath, '# Local Skill\n', 'utf8');

  await runSilently(() => agentSync(projectDirectory));
  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  assert.equal(fs.existsSync(localSkillPath), true);
});

test('re-init preserves project-local spec task and workspace files', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const specPath = path.join(projectDirectory, '.shelf', 'spec', 'frontend', 'local-note.md');
  const taskPath = path.join(projectDirectory, '.shelf', 'tasks', 'custom-task', 'prd.md');
  const workspacePath = path.join(projectDirectory, '.shelf', 'workspace', 'notes.md');
  fs.mkdirSync(path.dirname(specPath), { recursive: true });
  fs.mkdirSync(path.dirname(taskPath), { recursive: true });
  fs.mkdirSync(path.dirname(workspacePath), { recursive: true });
  fs.writeFileSync(specPath, '# Local Spec Note\n', 'utf8');
  fs.writeFileSync(taskPath, '# Custom Task\n', 'utf8');
  fs.writeFileSync(workspacePath, '# Workspace Note\n', 'utf8');

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  assert.equal(fs.existsSync(specPath), true);
  assert.equal(fs.existsSync(taskPath), true);
  assert.equal(fs.existsSync(workspacePath), true);
});

test('update does not delete protected Shelf user data from stale manifests', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const manifestPath = path.join(projectDirectory, '.shelf', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.generatedFiles.push('.shelf/tasks/custom-task/prd.md');
  fs.mkdirSync(path.join(projectDirectory, '.shelf', 'tasks', 'custom-task'), { recursive: true });
  fs.writeFileSync(path.join(projectDirectory, '.shelf', 'tasks', 'custom-task', 'prd.md'), '# Keep me\n', 'utf8');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const result = await runSilently(() => agentUpdate(projectDirectory));

  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'tasks', 'custom-task', 'prd.md')), true);
  assert.equal(result.skippedDeletes.some((item) => item.path === '.shelf/tasks/custom-task/prd.md'), true);
});

test('update dry-run reports obsolete generated files without deleting them', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex', 'claude']
  }));

  const result = await runSilently(() => agentUpdate(projectDirectory, { dryRun: true, tools: ['codex'] }));

  assert.equal(result.updated, false);
  assert.equal(result.obsolete.some((item) => item.path === '.claude/settings.json' && item.status === 'delete'), true);
});

test('update.skip prevents selected projection files from being rewritten', async () => {
  const projectDirectory = createTempProject();
  const agentsPath = path.join(projectDirectory, 'AGENTS.md');

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  fs.writeFileSync(path.join(projectDirectory, '.shelf', 'update.skip'), 'AGENTS.md\n', 'utf8');
  const before = fs.readFileSync(agentsPath, 'utf8');
  const sharedRulesPath = path.join(projectDirectory, '.shelf', 'rules', 'AGENTS.shared.md');
  fs.mkdirSync(path.dirname(sharedRulesPath), { recursive: true });
  fs.writeFileSync(
    sharedRulesPath,
    fs.readFileSync(path.join(__dirname, '..', 'templates', 'core', '.shelf', 'rules', 'AGENTS.shared.md'), 'utf8'),
    'utf8'
  );
  fs.writeFileSync(
    sharedRulesPath,
    fs.readFileSync(sharedRulesPath, 'utf8').replace('<!-- SHELF:END -->', 'Skipped source rule.\n\n<!-- SHELF:END -->'),
    'utf8'
  );

  const result = await runSilently(() => agentUpdate(projectDirectory));
  const updateManifest = JSON.parse(fs.readFileSync(path.join(projectDirectory, '.shelf', 'update-manifest.json'), 'utf8'));

  assert.equal(fs.readFileSync(agentsPath, 'utf8'), before);
  assert.equal(result.skipped.some((item) => item.path === 'AGENTS.md' && item.reason === 'update.skip: AGENTS.md'), true);
  assert.equal(updateManifest.skipped.some((item) => item.path === 'AGENTS.md'), true);
});

test('update.skip prevents obsolete generated files from being deleted', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex', 'claude']
  }));

  fs.writeFileSync(path.join(projectDirectory, '.shelf', 'update.skip'), '.claude/\n', 'utf8');

  const result = await runSilently(() => agentUpdate(projectDirectory, { tools: ['codex'] }));
  const updateManifest = JSON.parse(fs.readFileSync(path.join(projectDirectory, '.shelf', 'update-manifest.json'), 'utf8'));

  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'settings.json')), true);
  assert.equal(result.skippedDeletes.some((item) => item.path === '.claude/settings.json' && item.reason === 'update.skip: .claude/'), true);
});

test('update manifest records version migrations', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const manifestPath = path.join(projectDirectory, '.shelf', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.cliVersion = '0.0.1';
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const result = await runSilently(() => agentUpdate(projectDirectory));
  const updateManifest = JSON.parse(fs.readFileSync(path.join(projectDirectory, '.shelf', 'update-manifest.json'), 'utf8'));

  assert.equal(result.migrations.some((migration) => migration.id === `cli-0.0.1-to-${packageJson.version}`), true);
  assert.equal(updateManifest.fromVersion, '0.0.1');
  assert.equal(updateManifest.toVersion, packageJson.version);
  assert.equal(updateManifest.migrations.some((migration) => migration.status === 'applied'), true);
});

test('joiner task creates onboarding task files', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'core',
    tools: ['codex']
  }));

  const result = await runSilently(() => createJoinerTask('Ada Lovelace', projectDirectory));

  assert.equal(result.taskPath, '.shelf/tasks/00-join-ada-lovelace');
  assert.equal(fs.existsSync(path.join(projectDirectory, result.taskPath, 'task.json')), true);
  assert.match(fs.readFileSync(path.join(projectDirectory, result.taskPath, 'prd.md'), 'utf8'), /Onboard Ada Lovelace/);
});
