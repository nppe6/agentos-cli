const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const importSkills = require('../lib/actions/agent-skills-import');
const { renderResultTree, renderTree } = importSkills._private;

function createTempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'agentos-cli-skills-'));
}

function writeSkill(parentDirectory, name, content = '# Skill') {
  const skillDirectory = path.join(parentDirectory, name);
  fs.mkdirSync(skillDirectory, { recursive: true });
  fs.writeFileSync(path.join(skillDirectory, 'SKILL.md'), content, 'utf8');
  return skillDirectory;
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

test('imports a skill collection into .shelf skills in auto mode', async () => {
  const sourceDirectory = createTempProject();
  const targetDirectory = createTempProject();
  writeSkill(sourceDirectory, 'alpha', '# Alpha');
  writeSkill(sourceDirectory, 'beta', '# Beta');
  fs.mkdirSync(path.join(targetDirectory, '.shelf', 'skills'), { recursive: true });
  fs.mkdirSync(path.join(targetDirectory, '.agents', 'skills'), { recursive: true });

  const result = await runSilently(() => importSkills(sourceDirectory, { target: targetDirectory }));

  assert.equal(result.imported.length, 2);
  assert.equal(fs.readFileSync(path.join(targetDirectory, '.shelf', 'skills', 'alpha', 'SKILL.md'), 'utf8'), '# Alpha');
  assert.equal(fs.existsSync(path.join(targetDirectory, '.codex', 'skills', 'alpha')), false);
});

test('renders discovered skills as a readable tree', () => {
  assert.equal(renderTree(['alpha', 'beta', 'gamma']), [
    '\u251c\u2500 alpha',
    '\u251c\u2500 beta',
    '\u2514\u2500 gamma'
  ].join('\n'));
});

test('renders import results as a readable tree', () => {
  assert.equal(renderResultTree([
    { skill: 'alpha', destination: 'codex' },
    { skill: 'beta', destination: 'codex' }
  ]), [
    '\u251c\u2500 alpha -> codex',
    '\u2514\u2500 beta -> codex'
  ].join('\n'));
});

test('imports a single skill directory into existing single-tool destinations', async () => {
  const sourceDirectory = createTempProject();
  const targetDirectory = createTempProject();
  const skillDirectory = writeSkill(sourceDirectory, 'gamma', '# Gamma');
  fs.mkdirSync(path.join(targetDirectory, '.agents', 'skills'), { recursive: true });
  fs.mkdirSync(path.join(targetDirectory, '.claude', 'skills'), { recursive: true });

  const result = await runSilently(() => importSkills(skillDirectory, { target: targetDirectory }));

  assert.equal(result.imported.length, 2);
  assert.equal(fs.readFileSync(path.join(targetDirectory, '.agents', 'skills', 'gamma', 'SKILL.md'), 'utf8'), '# Gamma');
  assert.equal(fs.readFileSync(path.join(targetDirectory, '.claude', 'skills', 'gamma', 'SKILL.md'), 'utf8'), '# Gamma');
});

test('skip mode preserves existing project skills', async () => {
  const sourceDirectory = createTempProject();
  const targetDirectory = createTempProject();
  writeSkill(sourceDirectory, 'alpha', '# New Alpha');
  writeSkill(path.join(targetDirectory, '.shelf', 'skills'), 'alpha', '# Old Alpha');

  const result = await runSilently(() => importSkills(sourceDirectory, { target: targetDirectory, mode: 'skip' }));

  assert.equal(result.imported.length, 0);
  assert.equal(result.skipped.length, 1);
  assert.equal(fs.readFileSync(path.join(targetDirectory, '.shelf', 'skills', 'alpha', 'SKILL.md'), 'utf8'), '# Old Alpha');
});

test('force overwrites existing project skills', async () => {
  const sourceDirectory = createTempProject();
  const targetDirectory = createTempProject();
  writeSkill(sourceDirectory, 'alpha', '# New Alpha');
  writeSkill(path.join(targetDirectory, '.shelf', 'skills'), 'alpha', '# Old Alpha');

  const result = await runSilently(() => importSkills(sourceDirectory, { target: targetDirectory, force: true, mode: 'skip' }));

  assert.equal(result.imported.length, 1);
  assert.equal(result.overwritten.length, 1);
  assert.equal(fs.readFileSync(path.join(targetDirectory, '.shelf', 'skills', 'alpha', 'SKILL.md'), 'utf8'), '# New Alpha');
});

test('interactive import confirms destination and asks for mode', async () => {
  const sourceDirectory = createTempProject();
  const targetDirectory = createTempProject();
  const promptedQuestions = [];
  writeSkill(sourceDirectory, 'alpha', '# New Alpha');
  writeSkill(path.join(targetDirectory, '.shelf', 'skills'), 'alpha', '# Old Alpha');

  const promptFactory = () => async (questions) => {
    promptedQuestions.push(...questions);

    if (questions[0].name === 'confirmed') {
      return { confirmed: true };
    }

    return { mode: 'overwrite' };
  };

  const result = await runSilently(() => importSkills(sourceDirectory, {
    interactive: true,
    promptFactory,
    target: targetDirectory
  }));

  assert.equal(result.imported.length, 1);
  assert.equal(result.overwritten.length, 1);
  assert.deepEqual(promptedQuestions.map((question) => question.name), ['confirmed', 'mode']);
  assert.equal(fs.readFileSync(path.join(targetDirectory, '.shelf', 'skills', 'alpha', 'SKILL.md'), 'utf8'), '# New Alpha');
});

test('interactive import can be cancelled before writing', async () => {
  const sourceDirectory = createTempProject();
  const targetDirectory = createTempProject();
  writeSkill(sourceDirectory, 'alpha', '# Alpha');
  fs.mkdirSync(path.join(targetDirectory, '.shelf', 'skills'), { recursive: true });

  const promptFactory = () => async () => ({ confirmed: false });

  const result = await runSilently(() => importSkills(sourceDirectory, {
    interactive: true,
    promptFactory,
    target: targetDirectory
  }));

  assert.equal(result.aborted, true);
  assert.equal(fs.existsSync(path.join(targetDirectory, '.shelf', 'skills', 'alpha')), false);
});

test('explicit destination creates the requested skills directory', async () => {
  const sourceDirectory = createTempProject();
  const targetDirectory = createTempProject();
  writeSkill(sourceDirectory, 'delta', '# Delta');

  const result = await runSilently(() => importSkills(sourceDirectory, { target: targetDirectory, to: 'codex' }));

  assert.equal(result.imported.length, 1);
  assert.equal(fs.readFileSync(path.join(targetDirectory, '.agents', 'skills', 'delta', 'SKILL.md'), 'utf8'), '# Delta');
});

test('explicit shelf destination creates the shared skills directory', async () => {
  const sourceDirectory = createTempProject();
  const targetDirectory = createTempProject();
  writeSkill(sourceDirectory, 'delta', '# Delta');

  const result = await runSilently(() => importSkills(sourceDirectory, { target: targetDirectory, to: 'shelf' }));

  assert.equal(result.imported.length, 1);
  assert.equal(fs.readFileSync(path.join(targetDirectory, '.shelf', 'skills', 'delta', 'SKILL.md'), 'utf8'), '# Delta');
});

test('legacy agent-os destination aliases the shelf shared directory', async () => {
  const sourceDirectory = createTempProject();
  const targetDirectory = createTempProject();
  writeSkill(sourceDirectory, 'delta', '# Delta');

  const result = await runSilently(() => importSkills(sourceDirectory, { target: targetDirectory, to: 'agent-os' }));

  assert.equal(result.imported.length, 1);
  assert.equal(fs.readFileSync(path.join(targetDirectory, '.shelf', 'skills', 'delta', 'SKILL.md'), 'utf8'), '# Delta');
});

test('overwrite mode skips skills that are already in the destination', async () => {
  const targetDirectory = createTempProject();
  const sourceDirectory = path.join(targetDirectory, '.shelf', 'skills');
  writeSkill(sourceDirectory, 'alpha', '# Alpha');

  const result = await runSilently(() => importSkills(sourceDirectory, { target: targetDirectory, mode: 'overwrite' }));

  assert.equal(result.imported.length, 0);
  assert.equal(result.skipped.length, 1);
  assert.equal(fs.readFileSync(path.join(sourceDirectory, 'alpha', 'SKILL.md'), 'utf8'), '# Alpha');
});

test('auto mode requires an initialized destination', async () => {
  const sourceDirectory = createTempProject();
  const targetDirectory = createTempProject();
  writeSkill(sourceDirectory, 'alpha', '# Alpha');

  await assert.rejects(
    () => runSilently(() => importSkills(sourceDirectory, { target: targetDirectory })),
    /No skills destination found/
  );
});
