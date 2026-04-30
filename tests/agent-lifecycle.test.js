const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const agentDoctor = require('../lib/actions/agent-doctor');
const agentInit = require('../lib/actions/agent-init');
const agentSync = require('../lib/actions/agent-sync');

function createTempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agentos-cli-lifecycle-'));
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

  const manifest = JSON.parse(fs.readFileSync(path.join(projectDirectory, '.agent-os', 'manifest.json'), 'utf8'));
  const hashes = JSON.parse(fs.readFileSync(path.join(projectDirectory, '.agent-os', 'template-hashes.json'), 'utf8'));

  assert.equal(manifest.schemaVersion, 1);
  assert.deepEqual(manifest.tools, ['codex']);
  assert.match(manifest.generatedFiles.join('\n'), /AGENTS\.md/);
  assert.match(manifest.generatedFiles.join('\n'), /\.codex\/skills\/project-context\/SKILL\.md/);
  assert.equal(hashes.schemaVersion, 1);
  assert.equal(typeof hashes.files['AGENTS.md'].hash, 'string');
  assert.equal(typeof hashes.files['.agent-os/manifest.json'].hash, 'string');
});

test('doctor reports a clean initialized project as ok', async () => {
  const projectDirectory = createTempProject();

  await runSilently(() => agentInit(projectDirectory, {
    force: true,
    gitMode: 'track',
    stack: 'vue',
    tools: ['codex', 'claude']
  }));

  const result = await runSilently(() => agentDoctor(projectDirectory));

  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.tools, ['codex', 'claude']);
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

test('sync regenerates missing projection files from .agent-os', async () => {
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
