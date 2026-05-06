const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const agentInit = require('../lib/actions/agent-init');
const { renderGeneratedTree, renderTree, selectTools } = agentInit._private;
const { renderBanner } = require('../lib/utils/banner');
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
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', '.gitignore')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'backend', 'index.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'frontend', 'component-guidelines.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'guides', 'cross-layer-thinking-guide.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'tasks', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'tasks', '00-bootstrap-guidelines', 'task.json')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'tasks', '00-bootstrap-guidelines', 'prd.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'tasks', '00-bootstrap-guidelines', 'implement.jsonl')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'workspace', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'workflow.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'scripts', 'task.py')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'CLAUDE.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'skills', 'shelf-brainstorm', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'shelf-brainstorm', 'SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-brainstorm', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-meta', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'skills', 'shelf-meta', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'agents', 'shelf-check.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'commands', 'shelf', 'continue.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'commands', 'shelf', 'finish-work.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'commands', 'shelf', 'start.md')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'settings.json')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'hooks', 'shelf-session-start.py')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'hooks', 'shelf-inject-workflow-state.py')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'agents', 'shelf-implement.toml')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'config.toml')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'hooks.json')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'hooks', 'shelf-session-start.py')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'hooks', 'shelf-inject-workflow-state.py')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'prompts', 'shelf-continue.md')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'prompts', 'shelf-finish-work.md')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-start', 'SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'planning')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'shelf-planning')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agent-os')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'scripts', 'sync-agent-os.ps1')), false);

  const packageJson = JSON.parse(fs.readFileSync(path.join(projectDirectory, 'package.json'), 'utf8'));
  assert.equal(packageJson.scripts['agent-os:sync'], undefined);
  assert.equal(packageJson.scripts.dev, 'vite');
  assert.equal(fs.existsSync(path.join(projectDirectory, '.gitignore')), false);

  const agentsContent = fs.readFileSync(path.join(projectDirectory, 'AGENTS.md'), 'utf8');
  const claudeContent = fs.readFileSync(path.join(projectDirectory, 'CLAUDE.md'), 'utf8');
  assert.match(agentsContent, /<!-- SHELF:START -->/);
  assert.match(agentsContent, /\.shelf\/workflow\.md/);
  assert.match(agentsContent, /\.shelf\/agents/);
  assert.doesNotMatch(agentsContent, /shelf-project-context/);
  assert.match(claudeContent, /Follow `AGENTS\.md`/);

  const bootstrapPrd = fs.readFileSync(path.join(projectDirectory, '.shelf', 'tasks', '00-bootstrap-guidelines', 'prd.md'), 'utf8');
  const bootstrapTaskJson = JSON.parse(fs.readFileSync(path.join(projectDirectory, '.shelf', 'tasks', '00-bootstrap-guidelines', 'task.json'), 'utf8'));
  assert.match(bootstrapPrd, /\.shelf\/spec/);
  assert.match(bootstrapPrd, /You \(the AI\) are running this task/);
  assert.match(bootstrapPrd, /Import Existing Convention Sources First/);
  assert.match(bootstrapPrd, /Inspect Real Code/);
  assert.match(bootstrapPrd, /Document Current Reality/);
  assert.match(bootstrapPrd, /shelf-update-spec/);
  assert.doesNotMatch(bootstrapPrd, /\.trellis/);
  assert.equal(bootstrapTaskJson.status, 'in_progress');
  assert.match(bootstrapTaskJson.description, /AI-facing first-run task/);

  const updateSpecSkill = fs.readFileSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-update-spec', 'SKILL.md'), 'utf8');
  assert.match(updateSpecSkill, /Code-Spec First Rule/);
  assert.match(updateSpecSkill, /Mandatory Output \(7 Sections\)/);
  assert.match(updateSpecSkill, /Code-specs are living documents/);
  assert.match(updateSpecSkill, /\.shelf\/spec/);
  assert.doesNotMatch(updateSpecSkill, /\.trellis\/spec/);
  assert.doesNotMatch(updateSpecSkill, /Daily workflow rule/);

  const codexImplementContent = fs.readFileSync(path.join(projectDirectory, '.codex', 'agents', 'shelf-implement.toml'), 'utf8');
  const codexCheckContent = fs.readFileSync(path.join(projectDirectory, '.codex', 'agents', 'shelf-check.toml'), 'utf8');
  const codexConfigContent = fs.readFileSync(path.join(projectDirectory, '.codex', 'config.toml'), 'utf8');
  const codexHooksContent = fs.readFileSync(path.join(projectDirectory, '.codex', 'hooks.json'), 'utf8');
  const claudeSettingsContent = fs.readFileSync(path.join(projectDirectory, '.claude', 'settings.json'), 'utf8');
  const codexSessionStartContent = fs.readFileSync(path.join(projectDirectory, '.codex', 'hooks', 'shelf-session-start.py'), 'utf8');
  const claudeSessionStartContent = fs.readFileSync(path.join(projectDirectory, '.claude', 'hooks', 'shelf-session-start.py'), 'utf8');
  const claudeWorkflowStateContent = fs.readFileSync(path.join(projectDirectory, '.claude', 'hooks', 'shelf-inject-workflow-state.py'), 'utf8');
  const claudeContinueContent = fs.readFileSync(path.join(projectDirectory, '.claude', 'commands', 'shelf', 'continue.md'), 'utf8');
  const claudeImplementContent = fs.readFileSync(path.join(projectDirectory, '.claude', 'agents', 'shelf-implement.md'), 'utf8');
  const shelfContinueSkillContent = fs.readFileSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-continue', 'SKILL.md'), 'utf8');
  const shelfFinishWorkSkillContent = fs.readFileSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-finish-work', 'SKILL.md'), 'utf8');
  const shelfBrainstormSkillContent = fs.readFileSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-brainstorm', 'SKILL.md'), 'utf8');
  const shelfMetaFilesContent = fs.readFileSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-meta', 'references', 'core', 'files.md'), 'utf8');
  assert.match(codexImplementContent, /name = "shelf-implement"/);
  assert.match(codexImplementContent, /developer_instructions = """/);
  assert.match(codexImplementContent, /Required Shelf Context/);
  assert.match(codexImplementContent, /implement\.jsonl/);
  assert.match(codexCheckContent, /check\.jsonl/);
  assert.match(codexConfigContent, /project_doc_fallback_filenames = \["AGENTS\.md"\]/);
  assert.match(codexHooksContent, /shelf-session-start\.py/);
  assert.match(codexHooksContent, /shelf-inject-workflow-state\.py/);
  assert.match(claudeSettingsContent, /UserPromptSubmit/);
  assert.match(claudeSettingsContent, /shelf-inject-workflow-state\.py/);
  assert.match(codexSessionStartContent, /<workflow>/);
  assert.match(codexSessionStartContent, /<guidelines>/);
  assert.match(codexSessionStartContent, /<task-status>/);
  assert.match(codexSessionStartContent, /\.shelf\/workflow\.md/);
  assert.match(codexSessionStartContent, /\.shelf\/spec/);
  assert.match(claudeSessionStartContent, /<workflow>/);
  assert.match(claudeSessionStartContent, /<guidelines>/);
  assert.match(claudeSessionStartContent, /<task-status>/);
  assert.match(claudeWorkflowStateContent, /UserPromptSubmit/);
  assert.match(claudeWorkflowStateContent, /\.shelf\/workflow\.md/);
  assert.match(claudeContinueContent, /00-bootstrap-guidelines/);
  assert.match(claudeContinueContent, /python(?:3)? \.\/\.shelf\/scripts\/get_context\.py --mode phase --step <X\.X> --platform claude/);
  assert.match(shelfContinueSkillContent, /Bootstrap fast path/);
  assert.match(shelfContinueSkillContent, /00-bootstrap-guidelines/);
  assert.match(shelfContinueSkillContent, /^---\r?\nname: shelf-continue\r?\ndescription:/);
  assert.match(shelfContinueSkillContent, /python(?:3)? \.\/\.shelf\/scripts\/get_context\.py --mode phase --step <X\.X> --platform codex/);
  assert.match(shelfFinishWorkSkillContent, /^---\r?\nname: shelf-finish-work\r?\ndescription:/);
  assert.match(shelfFinishWorkSkillContent, /python(?:3)? \.\/\.shelf\/scripts\/task\.py archive <task-name>/);
  assert.match(shelfBrainstormSkillContent, /^---\r?\nname: shelf-brainstorm\r?\ndescription:/);
  assert.match(shelfBrainstormSkillContent, /\$start/);
  assert.match(shelfBrainstormSkillContent, /\$update-spec/);
  assert.match(shelfMetaFilesContent, /\.shelf\/templates\/common-skills\//);
  assert.match(shelfMetaFilesContent, /\.shelf\/templates\/bundled-skills\//);
  assert.match(shelfMetaFilesContent, /\.shelf\/skills\/` \| Project-local custom skills/);
  assert.match(claudeImplementContent, /Required Shelf Context/);
  assert.match(claudeImplementContent, /implement\.jsonl/);
});

test('injects core-only workflow when the core stack is selected', async () => {
  const projectDirectory = createTempProject();

  await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'track', tools: ['codex'] });

  assert.equal(fs.existsSync(path.join(projectDirectory, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-before-dev', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-check', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-start', 'SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'agents', 'shelf-research.toml')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'config.toml')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'hooks.json')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-continue', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'prompts', 'shelf-continue.md')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'ui-ux-pro-max')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'manifest.json')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'template-hashes.json')), true);
});

test('generates frontend-only bootstrap guidance for frontend projects', async () => {
  const projectDirectory = createTempProject();
  writeJson(path.join(projectDirectory, 'package.json'), {
    name: 'frontend-project',
    dependencies: {
      vue: '^3.0.0'
    }
  });

  const result = await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'track', tools: ['codex'] });
  const bootstrapPrd = fs.readFileSync(path.join(projectDirectory, '.shelf', 'tasks', '00-bootstrap-guidelines', 'prd.md'), 'utf8');
  const bootstrapTaskJson = JSON.parse(fs.readFileSync(path.join(projectDirectory, '.shelf', 'tasks', '00-bootstrap-guidelines', 'task.json'), 'utf8'));

  assert.equal(result.projectType, 'frontend');
  assert.match(bootstrapPrd, /### Frontend guidelines/);
  assert.doesNotMatch(bootstrapPrd, /### Backend guidelines/);
  assert.deepEqual(bootstrapTaskJson.relatedFiles, ['.shelf/spec/frontend/']);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'frontend')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'backend')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'guides')), true);
});

test('generates backend-only bootstrap guidance for backend projects', async () => {
  const projectDirectory = createTempProject();
  writeJson(path.join(projectDirectory, 'package.json'), {
    name: 'backend-project',
    dependencies: {
      express: '^4.0.0'
    }
  });

  const result = await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'track', tools: ['codex'] });
  const bootstrapPrd = fs.readFileSync(path.join(projectDirectory, '.shelf', 'tasks', '00-bootstrap-guidelines', 'prd.md'), 'utf8');
  const bootstrapTaskJson = JSON.parse(fs.readFileSync(path.join(projectDirectory, '.shelf', 'tasks', '00-bootstrap-guidelines', 'task.json'), 'utf8'));

  assert.equal(result.projectType, 'backend');
  assert.match(bootstrapPrd, /### Backend guidelines/);
  assert.doesNotMatch(bootstrapPrd, /### Frontend guidelines/);
  assert.deepEqual(bootstrapTaskJson.relatedFiles, ['.shelf/spec/backend/']);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'backend')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'frontend')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'guides')), true);
});

test('keeps both backend and frontend specs for unknown fullstack bootstrap guidance', async () => {
  const projectDirectory = createTempProject();
  writeJson(path.join(projectDirectory, 'package.json'), {
    name: 'unknown-project',
    version: '1.0.0'
  });

  const result = await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'track', tools: ['codex'] });
  const bootstrapTaskJson = JSON.parse(fs.readFileSync(path.join(projectDirectory, '.shelf', 'tasks', '00-bootstrap-guidelines', 'task.json'), 'utf8'));

  assert.equal(result.projectType, 'fullstack');
  assert.deepEqual(bootstrapTaskJson.relatedFiles, ['.shelf/spec/backend/', '.shelf/spec/frontend/']);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'backend')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'frontend')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'guides')), true);
});

test('generates package-specific bootstrap guidance for monorepos', async () => {
  const projectDirectory = createTempProject();
  writeJson(path.join(projectDirectory, 'package.json'), {
    workspaces: ['packages/*']
  });
  fs.mkdirSync(path.join(projectDirectory, 'packages', 'web'), { recursive: true });
  writeJson(path.join(projectDirectory, 'packages', 'web', 'package.json'), {
    name: '@demo/web',
    dependencies: {
      react: '^18.0.0'
    }
  });
  fs.mkdirSync(path.join(projectDirectory, 'packages', 'api'), { recursive: true });
  writeJson(path.join(projectDirectory, 'packages', 'api', 'package.json'), {
    name: '@demo/api',
    dependencies: {
      express: '^4.0.0'
    }
  });

  const result = await agentInit(projectDirectory, { stack: 'core', force: true, gitMode: 'track', tools: ['codex'] });
  const bootstrapPrd = fs.readFileSync(path.join(projectDirectory, '.shelf', 'tasks', '00-bootstrap-guidelines', 'prd.md'), 'utf8');
  const bootstrapTaskJson = JSON.parse(fs.readFileSync(path.join(projectDirectory, '.shelf', 'tasks', '00-bootstrap-guidelines', 'task.json'), 'utf8'));

  assert.equal(result.detectedPackages.length, 2);
  assert.match(bootstrapPrd, /### Package-Specific Guidelines/);
  assert.match(bootstrapPrd, /Package: @demo\/api/);
  assert.match(bootstrapPrd, /Detected type: `backend`/);
  assert.match(bootstrapPrd, /\.shelf\/spec\/packages\/demo-api\/quality\.md/);
  assert.match(bootstrapPrd, /Package: @demo\/web/);
  assert.match(bootstrapPrd, /Detected type: `frontend`/);
  assert.match(bootstrapPrd, /agentos-cli shelf spec scaffold/);
  assert.deepEqual(bootstrapTaskJson.relatedFiles, [
    '.shelf/spec/packages/demo-api/',
    '.shelf/spec/packages/demo-web/'
  ]);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'backend')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'frontend')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'spec', 'guides')), true);
});

test('init initializes developer identity from git user name by default', async () => {
  const projectDirectory = createTempProject();
  let bannerOptions;

  const result = await agentInit(projectDirectory, {
    stack: 'core',
    force: true,
    gitMode: 'track',
    tools: ['codex']
  }, {
    findGitUserName: () => 'Ada',
    printBanner: (options) => {
      bannerOptions = options;
    }
  });

  assert.deepEqual(bannerOptions, { developer: 'Ada' });
  assert.equal(result.developer, 'Ada');
  assert.equal(result.developerInitialized, true);
  assert.match(fs.readFileSync(path.join(projectDirectory, '.shelf', '.developer'), 'utf8'), /name=Ada/);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf', 'workspace', 'Ada', 'journal-1.md')), true);

  const hashes = JSON.parse(fs.readFileSync(path.join(projectDirectory, '.shelf', 'template-hashes.json'), 'utf8'));
  assert.equal(hashes.files['.shelf/.developer'], undefined);
});

test('init accepts explicit developer user and can skip developer setup', async () => {
  const projectDirectory = createTempProject();

  const result = await agentInit(projectDirectory, {
    stack: 'core',
    force: true,
    gitMode: 'track',
    tools: ['codex'],
    user: 'Grace'
  }, {
    findGitUserName: () => 'Ada',
    printBanner: () => {}
  });

  assert.equal(result.developer, 'Grace');
  assert.match(fs.readFileSync(path.join(projectDirectory, '.shelf', '.developer'), 'utf8'), /name=Grace/);

  const skippedDirectory = createTempProject();
  const skipped = await agentInit(skippedDirectory, {
    stack: 'core',
    force: true,
    gitMode: 'track',
    tools: ['codex'],
    skipDeveloper: true
  }, {
    findGitUserName: () => 'Ada',
    printBanner: () => {}
  });

  assert.equal(skipped.developerInitialized, false);
  assert.equal(fs.existsSync(path.join(skippedDirectory, '.shelf', '.developer')), false);
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
  assert.match(fs.readFileSync(path.join(projectDirectory, 'AGENTS.md'), 'utf8'), /AgentOS Shelf Instructions/);
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
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'skills', 'shelf-brainstorm', 'SKILL.md')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-brainstorm', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-continue', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agents', 'skills', 'shelf-finish-work', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex', 'agents', 'shelf-check.toml')), true);
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
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agents', 'skills')), true);
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
  assert.equal(fs.existsSync(path.join(projectDirectory, '.claude', 'agents', 'shelf-implement.md')), true);
  assert.equal(fs.existsSync(path.join(projectDirectory, 'AGENTS.md')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.codex')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.agents')), false);
  assert.equal(fs.existsSync(path.join(projectDirectory, '.shelf')), true);

  const claudeContent = fs.readFileSync(path.join(projectDirectory, 'CLAUDE.md'), 'utf8');
  assert.match(claudeContent, /AGENTS\.md/);
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

test('renders banner with accent logo, muted description, spacing, and developer line', () => {
  const banner = renderBanner({ developer: 'nppe6' });

  assert.match(banner, /\x1b\[38;2;208;209;254m/);
  assert.match(banner, /  \x1b\[90mShared AI workflow memory for Codex & Claude Code\x1b\[0m/);
  assert.match(banner, /Developer:\x1b\[0m \x1b\[90mnppe6\x1b\[0m/);
  assert.match(banner, /Code\x1b\[0m\n\n  \x1b\[38;2;208;209;254m👤 Developer:/);
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
    '\u2502  \u251c\u2500 .codex/',
    '\u2502  \u2514\u2500 .agents/skills/',
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
  assert.match(output, /\.agents\/skills\//);
  assert.match(output, /\u251c\u2500 Claude Code/);
  assert.match(output, /\u2514\u2500 Shared Shelf source/);
  assert.match(output, /   \u2514\u2500 \.shelf\/\x1b\[0m/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

