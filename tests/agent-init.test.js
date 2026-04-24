const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const agentInit = require('../lib/actions/agent-init');
const { PACKAGE_SYNC_SCRIPT } = require('../lib/utils/agent-os');

function createTempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agentos-cli-'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

test('injects full workflow into a clean project', async () => {
  const projectDirectory = createTempProject();
  writeJson(path.join(projectDirectory, 'package.json'), {
    name: 'demo-project',
    version: '1.0.0',
    scripts: {
      dev: 'vite'
    }
  });

  await agentInit(projectDirectory, { preset: 'vue', force: true });

  assert.equal(fs.existsSync(path.join(projectDirectory, '.agent-os')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'CLAUDE.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'skills')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'scripts', 'sync-agent-os.ps1')), true);

  const packageJson = JSON.parse(fs.readFileSync(path.join(projectDirectory, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['agent-os:sync'], PACKAGE_SYNC_SCRIPT);
});

test('aborts when overwrite is rejected', async () => {
  const projectDirectory = createTempProject();
  fs.writeFileSync(path.join(projectDirectory, 'AGENTS.md'), 'legacy', 'utf8');

  const result = await agentInit(
    projectDirectory,
    { preset: 'vue' },
    { promptOverwrite: async () => false }
  );

  assert.equal(result.aborted, true);
  assert.equal(fs.readFileSync(path.join(projectDirectory, 'AGENTS.md'), 'utf8'), 'legacy');
});

test('overwrites existing workflow files after confirmation', async () => {
  const projectDirectory = createTempProject();
  fs.mkdirSync(path.join(projectDirectory, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(projectDirectory, 'AGENTS.md'), 'legacy', 'utf8');
  fs.writeFileSync(path.join(projectDirectory, '.claude', 'legacy.txt'), 'legacy', 'utf8');

  const result = await agentInit(
    projectDirectory,
    { preset: 'vue' },
    { promptOverwrite: async () => true }
  );

  assert.equal(result.aborted, false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'legacy.txt')), false);

  const agentsContent = fs.readFileSync(path.join(projectDirectory, 'AGENTS.md'), 'utf8');
  assert.match(agentsContent, /Compound Engineering/);
});
