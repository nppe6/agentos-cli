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

  await agentInit(projectDirectory, { stack: 'vue', force: true, gitMode: 'track', tools: ['codex', 'claude'] });

  assert.equal(fs.existsSync(path.join(projectDirectory, '.agent-os')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'CLAUDE.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'skills')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'scripts', 'sync-agent-os.ps1')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'skills', 'ui-ux-pro-max', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'ui-ux-pro-max', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'ui-ux-pro-max', 'scripts', 'search.py')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'ui-ux-pro-max', 'data')), true);

  const packageJson = JSON.parse(fs.readFileSync(path.join(projectDirectory, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['agent-os:sync'], undefined);
  assert.equal(packageJson.scripts.dev, 'vite');
  assert.equal(fs.existsSync(path.join(projectDirectory, '.gitignore')), false);

  const agentsContent = fs.readFileSync(path.join(projectDirectory, 'AGENTS.md'), 'utf8');
  const claudeContent = fs.readFileSync(path.join(projectDirectory, 'CLAUDE.md'), 'utf8');
  assert.match(agentsContent, /内置降级流程/);
  assert.match(agentsContent, /项目上下文初始化/);
  assert.match(agentsContent, /Spec \/ Task 约定/);
  assert.match(agentsContent, /ui-ux-pro-max/);
  assert.doesNotMatch(agentsContent, /注入模式/);
  assert.doesNotMatch(agentsContent, /单选|多选/);
  assert.match(claudeContent, /优先使用 `Compound Engineering`/);
  assert.match(claudeContent, /内置降级流程/);
});

test('injects core-only workflow when the core stack is selected', async () => {
  const projectDirectory = createTempProject();

  await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'track', tools: ['codex'] });

  assert.equal(fs.existsSync(path.join(projectDirectory, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'project-context', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'implementation', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'ui-ux-pro-max')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agent-os')), false);
});

test('stack option can install the vue stack through the layered template path', async () => {
  const projectDirectory = createTempProject();

  await agentInit(projectDirectory, { stack: 'vue', force: true, gitMode: 'track', tools: ['codex'] });

  assert.equal(fs.existsSync(path.join(projectDirectory, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'ui-ux-pro-max', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'vue-best-practices', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agent-os')), false);
});

test('aborts when overwrite is rejected', async () => {
  const projectDirectory = createTempProject();
  fs.writeFileSync(path.join(projectDirectory, 'AGENTS.md'), 'legacy', 'utf8');

  const result = await agentInit(
    projectDirectory,
    { stack: 'vue', gitMode: 'track', tools: ['codex', 'claude'] },
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
    { stack: 'vue', gitMode: 'track', tools: ['codex', 'claude'] },
    { promptOverwrite: async () => true }
  );

  assert.equal(result.aborted, false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'legacy.txt')), false);

  const agentsContent = fs.readFileSync(path.join(projectDirectory, 'AGENTS.md'), 'utf8');
  assert.match(agentsContent, /Compound Engineering/);
});

test('appends workflow ignore block at the end of .gitignore', async () => {
  const projectDirectory = createTempProject();
  fs.writeFileSync(path.join(projectDirectory, '.gitignore'), 'dist/\ncoverage/\n', 'utf8');

  const result = await agentInit(projectDirectory, { stack: 'vue', force: true, gitMode: 'ignore', tools: ['codex', 'claude'] });

  assert.equal(result.gitMode, 'ignore');
  const gitignoreContent = fs.readFileSync(path.join(projectDirectory, '.gitignore'), 'utf8');
  assert.match(gitignoreContent, /^dist\/\ncoverage\/\n\n/m);
  assert.match(gitignoreContent, new RegExp(escapeRegExp(GITIGNORE_BLOCK_START)));
  assert.match(gitignoreContent, /AGENTS\.md/);
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
      '.agent-os/',
      '.claude/',
      '.codex/',
      'scripts/sync-agent-os.ps1',
      GITIGNORE_BLOCK_END,
      ''
    ].join('\n'),
    'utf8'
  );

  const result = await agentInit(projectDirectory, { stack: 'vue', force: true, gitMode: 'track', tools: ['codex', 'claude'] });

  assert.equal(result.gitMode, 'track');
  const gitignoreContent = fs.readFileSync(path.join(projectDirectory, '.gitignore'), 'utf8');
  assert.equal(gitignoreContent, 'dist/\ncoverage/\n');
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

  const result = await agentInit(projectDirectory, { stack: 'vue', force: true, gitMode: 'track', tools: ['codex', 'claude'] });

  assert.equal(fs.existsSync(path.join(projectDirectory, 'scripts', 'sync-agent-os.ps1')), false);
  assert.equal(fs.existsSync(scriptsDirectory), false);
  assert.equal(result.packageUpdated, true);

  const packageJson = JSON.parse(fs.readFileSync(path.join(projectDirectory, 'package.json'), 'utf8'));
  assert.deepEqual(packageJson.scripts, { dev: 'vite' });
});

test('prompts for git mode when it is not provided', async () => {
  const projectDirectory = createTempProject();

  const result = await agentInit(
    projectDirectory,
    { stack: 'vue', force: true, tools: ['codex', 'claude'] },
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
    const result = await agentInit(projectDirectory, { stack: 'vue', force: true, gitMode: 'ignore', tools: ['codex', 'claude'] });
    assert.equal(result.gitMode, 'ignore');
  }
  finally {
    console.log = originalLog;
  }

  assert.match(logs.join('\n'), /团队项目通常建议提交 AI 工作流文件/);
});

test('injects only codex files when codex is the only selected tool', async () => {
  const projectDirectory = createTempProject();
  writeJson(path.join(projectDirectory, 'package.json'), {
    name: 'demo-project',
    version: '1.0.0'
  });

  const result = await agentInit(projectDirectory, { stack: 'vue', force: true, gitMode: 'track', tools: ['codex'] });

  assert.deepEqual(result.tools, ['codex']);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'ui-ux-pro-max', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'CLAUDE.md')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agent-os')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'scripts', 'sync-agent-os.ps1')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'scripts')), false);

  const packageJson = JSON.parse(fs.readFileSync(path.join(projectDirectory, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts, undefined);
});

test('ignore mode only writes selected tool entries', async () => {
  const projectDirectory = createTempProject();

  await agentInit(projectDirectory, { stack: 'vue', force: true, gitMode: 'ignore', tools: ['codex'] });

  const gitignoreContent = fs.readFileSync(path.join(projectDirectory, '.gitignore'), 'utf8');
  assert.match(gitignoreContent, /AGENTS\.md/);
  assert.match(gitignoreContent, /\.codex\//);
  assert.doesNotMatch(gitignoreContent, /CLAUDE\.md/);
  assert.doesNotMatch(gitignoreContent, /\.claude\//);
  assert.doesNotMatch(gitignoreContent, /\.agent-os\//);
  assert.doesNotMatch(gitignoreContent, /scripts\/sync-agent-os\.ps1/);
});

test('removing unified mode preserves unrelated package scripts', async () => {
  const projectDirectory = createTempProject();
  writeJson(path.join(projectDirectory, 'package.json'), {
    name: 'demo-project',
    version: '1.0.0',
    scripts: {
      dev: 'vite'
    }
  });

  await agentInit(projectDirectory, { stack: 'vue', force: true, gitMode: 'track', tools: ['codex', 'claude'] });
  await agentInit(projectDirectory, { stack: 'vue', force: true, gitMode: 'track', tools: ['codex'] });

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

  await agentInit(projectDirectory, { stack: 'vue', force: true, gitMode: 'track', tools: ['codex', 'claude'] });

  console.log = (message) => {
    logs.push(String(message));
  };

  try {
    await agentInit(projectDirectory, { stack: 'vue', force: true, gitMode: 'track', tools: ['codex'] });
  }
  finally {
    console.log = originalLog;
  }

  assert.equal(fs.existsSync(path.join(projectDirectory, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'CLAUDE.md')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agent-os')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'scripts', 'sync-agent-os.ps1')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'scripts')), false);

  const packageJson = JSON.parse(fs.readFileSync(path.join(projectDirectory, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts, undefined);
  assert.match(logs.join('\n'), /未选择的受管内容已删除/);
  assert.match(logs.join('\n'), /CLAUDE\.md/);
  assert.match(logs.join('\n'), /\.agent-os\//);
});

test('prompts for selected tools when tools are not provided', async () => {
  const projectDirectory = createTempProject();

  const result = await agentInit(
    projectDirectory,
    { stack: 'vue', force: true, gitMode: 'track' },
    { promptTools: async () => ['claude'] }
  );

  assert.deepEqual(result.tools, ['claude']);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'CLAUDE.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'skills')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'AGENTS.md')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agent-os')), false);

  const claudeContent = fs.readFileSync(path.join(projectDirectory, 'CLAUDE.md'), 'utf8');
  assert.match(claudeContent, /# 项目 Agent 规则/);
  assert.match(claudeContent, /内置降级流程/);
  assert.doesNotMatch(claudeContent, /注入模式/);
  assert.doesNotMatch(claudeContent, /单选|多选/);
  assert.doesNotMatch(claudeContent, /@AGENTS\.md/);
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
    '├─ codex',
    '└─ claude'
  ].join('\n'));
});

test('renders generated file summary as a readable tree', () => {
  assert.equal(renderGeneratedTree(['codex', 'claude'], true), [
    '├─ Codex',
    '│  ├─ AGENTS.md',
    '│  └─ .codex/',
    '├─ Claude Code',
    '│  ├─ CLAUDE.md',
    '│  └─ .claude/',
    '└─ 统一管理',
    '   └─ .agent-os/'
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
    await agentInit(projectDirectory, { stack: 'vue', force: true, gitMode: 'track', tools: ['codex', 'claude'] });
  }
  finally {
    console.log = originalLog;
  }

  const output = logs.join('\n');
  assert.match(output, /\x1b\[34m生成内容：\n├─ Codex/);
  assert.match(output, /│  ├─ AGENTS\.md/);
  assert.match(output, /├─ Claude Code/);
  assert.match(output, /└─ 统一管理/);
  assert.match(output, /   └─ \.agent-os\/\x1b\[0m/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
