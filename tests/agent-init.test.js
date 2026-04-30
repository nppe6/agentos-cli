const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const agentInit = require('../lib/actions/agent-init');
const { renderGeneratedTree, renderTree, selectTools } = agentInit._private;
const {
  GITIGNORE_BLOCK_END,
  GITIGNORE_BLOCK_START
} = require('../lib/utils/gitignore');
const { validateStack } = require('../lib/utils/agent-os');

function createTempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agentos-cli-'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

test('injects full Shelf workflow into a clean project', async () => {
  const projectDirectory = createTempProject();
  writeJson(path.join(projectDirectory, 'package.json'), {
    name: 'demo-project',
    version: '1.0.0',
    scripts: {
      dev: 'vite'
    }
  });

  await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'track', tools: ['codex', 'claude'] });

  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'tasks', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'workspace', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'CLAUDE.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'skills', 'agentos-planning', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'agentos-planning', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'planning')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agent-os')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'scripts', 'sync-agent-os.ps1')), false);

  const packageJson = JSON.parse(fs.readFileSync(path.join(projectDirectory, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['agent-os:sync'], undefined);
  assert.equal(packageJson.scripts.dev, 'vite');
  assert.equal(fs.existsSync(path.join(projectDirectory, '.gitignore')), false);

  const agentsContent = fs.readFileSync(path.join(projectDirectory, 'AGENTS.md'), 'utf8');
  const claudeContent = fs.readFileSync(path.join(projectDirectory, 'CLAUDE.md'), 'utf8');
  assert.match(agentsContent, /\.shelf\/spec/);
  assert.match(agentsContent, /agentos-project-context/);
  assert.match(claudeContent, /\.shelf\//);
});

test('injects core-only workflow when the core stack is selected', async () => {
  const projectDirectory = createTempProject();

  await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'track', tools: ['codex'] });

  assert.equal(fs.existsSync(path.join(projectDirectory, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'agentos-project-context', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'agentos-implementation', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'ui-ux-pro-max')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'manifest.json')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'template-hashes.json')), true);
});

test('rejects deferred vue stack', () => {
  assert.throws(() => validateStack('vue'), /Available stacks: core/);
});

test('aborts when overwrite is rejected', async () => {
  const projectDirectory = createTempProject();
  fs.writeFileSync(path.join(projectDirectory, 'AGENTS.md'), 'legacy', 'utf8');

  const result = await agentInit(
    projectDirectory,
    { stack: 'core', gitMode: 'track', tools: ['codex', 'claude'] },
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
    { stack: 'core', gitMode: 'track', tools: ['codex', 'claude'] },
    { promptOverwrite: async () => true }
  );

  assert.equal(result.aborted, false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'legacy.txt')), true);
  assert.match(fs.readFileSync(path.join(projectDirectory, 'AGENTS.md'), 'utf8'), /AgentOS Shelf/);
});

test('appends workflow ignore block at the end of .gitignore', async () => {
  const projectDirectory = createTempProject();
  fs.writeFileSync(path.join(projectDirectory, '.gitignore'), 'dist/\ncoverage/\n', 'utf8');

  const result = await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'ignore', tools: ['codex', 'claude'] });

  assert.equal(result.gitMode, 'ignore');
  const gitignoreContent = fs.readFileSync(path.join(projectDirectory, '.gitignore'), 'utf8');
  assert.match(gitignoreContent, /^dist\/\ncoverage\/\n\n/m);
  assert.match(gitignoreContent, new RegExp(escapeRegExp(GITIGNORE_BLOCK_START)));
  assert.match(gitignoreContent, /AGENTS\.md/);
  assert.match(gitignoreContent, /\.shelf\//);
  assert.doesNotMatch(gitignoreContent, /scripts\/sync-agent-os\.ps1/);
  assert.match(gitignoreContent, new RegExp(escapeRegExp(GITIGNORE_BLOCK_END)));
});

test('track mode only removes the managed block from .gitignore', async () => {
  const projectDirectory = createTempProject();
  fs.writeFileSync(
    path.join(projectDirectory, '.gitignore'),
    [
      'dist/',
      'coverage/',
      '',
      GITIGNORE_BLOCK_START,
      'AGENTS.md',
      'CLAUDE.md',
      '.shelf/',
      '.claude/',
      '.codex/',
      GITIGNORE_BLOCK_END,
      ''
    ].join('\n'),
    'utf8'
  );

  const result = await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'track', tools: ['codex', 'claude'] });

  assert.equal(result.gitMode, 'track');
  assert.equal(fs.readFileSync(path.join(projectDirectory, '.gitignore'), 'utf8'), 'dist/\ncoverage/\n');
});

test('removes legacy sync script and package script during init', async () => {
  const projectDirectory = createTempProject();
  const scriptsDirectory = path.join(projectDirectory, 'scripts');
  fs.mkdirSync(scriptsDirectory, { recursive: true });
  fs.writeFileSync(path.join(scriptsDirectory, 'sync-agent-os.ps1'), 'legacy', 'utf8');
  writeJson(path.join(projectDirectory, 'package.json'), {
    name: 'demo-project',
    version: '1.0.0',
    scripts: {
      dev: 'vite',
      'agent-os:sync': 'powershell -ExecutionPolicy Bypass -File .\\scripts\\sync-agent-os.ps1'
    }
  });

  const result = await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'track', tools: ['codex', 'claude'] });

  assert.equal(fs.existsSync(path.join(projectDirectory, 'scripts', 'sync-agent-os.ps1')), false);
  assert.equal(fs.existsSync(scriptsDirectory), false);
  assert.equal(result.packageUpdated, true);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(projectDirectory, 'package.json'), 'utf8')).scripts, { dev: 'vite' });
});

test('prompts for git mode when it is not provided', async () => {
  const projectDirectory = createTempProject();

  const result = await agentInit(
    projectDirectory,
    { stack: 'core', force: true, tools: ['codex', 'claude'] },
    { promptGitMode: async () => 'ignore' }
  );

  assert.equal(result.gitMode, 'ignore');
  assert.equal(fs.existsSync(path.join(projectDirectory, '.gitignore')), true);
});

test('warns that ignore mode is for personal temporary workflows', async () => {
  const projectDirectory = createTempProject();
  const logs = [];
  const originalLog = console.log;

  console.log = (message) => {
    logs.push(String(message));
  };

  try {
    const result = await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'ignore', tools: ['codex', 'claude'] });
    assert.equal(result.gitMode, 'ignore');
  }
  finally {
    console.log = originalLog;
  }

  assert.match(logs.join('\n'), /忽略模式更适合个人临时增强/);
});

test('injects only codex files when codex is the only selected tool', async () => {
  const projectDirectory = createTempProject();
  writeJson(path.join(projectDirectory, 'package.json'), {
    name: 'demo-project',
    version: '1.0.0'
  });

  const result = await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'track', tools: ['codex'] });

  assert.deepEqual(result.tools, ['codex']);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'agentos-planning', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'CLAUDE.md')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'scripts')), false);

  const packageJson = JSON.parse(fs.readFileSync(path.join(projectDirectory, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts, undefined);
});

test('ignore mode only writes selected tool entries', async () => {
  const projectDirectory = createTempProject();

  await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'ignore', tools: ['codex'] });

  const gitignoreContent = fs.readFileSync(path.join(projectDirectory, '.gitignore'), 'utf8');
  assert.match(gitignoreContent, /AGENTS\.md/);
  assert.match(gitignoreContent, /\.codex\//);
  assert.doesNotMatch(gitignoreContent, /CLAUDE\.md/);
  assert.doesNotMatch(gitignoreContent, /\.claude\//);
  assert.match(gitignoreContent, /\.shelf\//);
});

test('removing a tool preserves unrelated package scripts', async () => {
  const projectDirectory = createTempProject();
  writeJson(path.join(projectDirectory, 'package.json'), {
    name: 'demo-project',
    version: '1.0.0',
    scripts: {
      dev: 'vite'
    }
  });

  await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'track', tools: ['codex', 'claude'] });
  await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'track', tools: ['codex'] });

  const packageJson = JSON.parse(fs.readFileSync(path.join(projectDirectory, 'package.json'), 'utf8'));
  assert.deepEqual(packageJson.scripts, { dev: 'vite' });
});

test('reinitializing from both tools to codex removes unselected managed files', async () => {
  const projectDirectory = createTempProject();
  writeJson(path.join(projectDirectory, 'package.json'), {
    name: 'demo-project',
    version: '1.0.0'
  });
  const logs = [];
  const originalLog = console.log;

  await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'track', tools: ['codex', 'claude'] });
  fs.writeFileSync(path.join(projectDirectory, '.claude', 'custom-command.md'), 'custom', 'utf8');

  console.log = (message) => {
    logs.push(String(message));
  };

  try {
    await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'track', tools: ['codex'] });
  }
  finally {
    console.log = originalLog;
  }

  assert.equal(fs.existsSync(path.join(projectDirectory, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'CLAUDE.md')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'custom-command.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'skills')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'scripts')), false);

  const packageJson = JSON.parse(fs.readFileSync(path.join(projectDirectory, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts, undefined);
  assert.match(logs.join('\n'), /未选择的受管内容已删除/);
  assert.match(logs.join('\n'), /CLAUDE\.md/);
  assert.doesNotMatch(logs.join('\n'), /未选择的受管内容已删除：[\s\S]*\.shelf\//);
});

test('prompts for selected tools when tools are not provided', async () => {
  const projectDirectory = createTempProject();

  const result = await agentInit(
    projectDirectory,
    { stack: 'core', force: true, gitMode: 'track' },
    { promptTools: async () => ['claude'] }
  );

  assert.deepEqual(result.tools, ['claude']);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'CLAUDE.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'skills')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'AGENTS.md')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf')), true);

  const claudeContent = fs.readFileSync(path.join(projectDirectory, 'CLAUDE.md'), 'utf8');
  assert.match(claudeContent, /\.shelf\//);
});

test('tool prompt starts with no default selections and concise labels', async () => {
  let capturedQuestions;
  const tools = await selectTools(() => async (questions) => {
    capturedQuestions = questions;
    return { tools: ['codex'] };
  });

  assert.deepEqual(tools, ['codex']);
  assert.equal(capturedQuestions[0].type, 'checkbox');
  assert.deepEqual(capturedQuestions[0].choices.map((choice) => choice.name), ['Codex', 'Claude Code']);
  assert.equal(capturedQuestions[0].choices.some((choice) => choice.checked), false);
});

test('renders simple CLI lists as a readable tree', () => {
  assert.equal(renderTree(['codex', 'claude']), [
    '\u251c\u2500 codex',
    '\u2514\u2500 claude'
  ].join('\n'));
});

test('renders generated file summary as a readable tree', () => {
  assert.equal(renderGeneratedTree(['codex', 'claude'], true), [
    '\u251c\u2500 Codex',
    '\u2502  \u251c\u2500 AGENTS.md',
    '\u2502  \u2514\u2500 .codex/',
    '\u251c\u2500 Claude Code',
    '\u2502  \u251c\u2500 CLAUDE.md',
    '\u2502  \u2514\u2500 .claude/',
    '\u2514\u2500 Shared Shelf source',
    '   \u2514\u2500 .shelf/'
  ].join('\n'));
});

test('prints generated file summary tree in blue after completion', async () => {
  const projectDirectory = createTempProject();
  const logs = [];
  const originalLog = console.log;

  console.log = (message) => {
    logs.push(String(message));
  };

  try {
    await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'track', tools: ['codex', 'claude'] });
  }
  finally {
    console.log = originalLog;
  }

  const output = logs.join('\n');
  assert.match(output, /\x1b\[34m生成内容：\n\u251c\u2500 Codex/);
  assert.match(output, /\u2502  \u251c\u2500 AGENTS\.md/);
  assert.match(output, /\u251c\u2500 Claude Code/);
  assert.match(output, /\u2514\u2500 Shared Shelf source/);
  assert.match(output, /   \u2514\u2500 \.shelf\/\x1b\[0m/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
