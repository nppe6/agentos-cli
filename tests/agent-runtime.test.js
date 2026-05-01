const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { agentDeveloperInit } = require('../lib/actions/agent-developer');
const agentTask = require('../lib/actions/agent-task');
const registerAgentCommands = require('../lib/commands/agent');
const {
  findPythonCommand,
  resolveShelfScript,
  runShelfScript
} = require('../lib/utils/python-runtime');

function createTempProject() {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'agentos-cli-runtime-'));
  fs.mkdirSync(path.join(projectDirectory, '.shelf', 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(projectDirectory, '.shelf', 'scripts', 'init_developer.py'), 'print("init")\n', 'utf8');
  fs.writeFileSync(path.join(projectDirectory, '.shelf', 'scripts', 'task.py'), 'print("task")\n', 'utf8');
  return projectDirectory;
}

class FakeCommand {
  constructor(signature = 'root') {
    this.allowsUnknownOptions = false;
    this.children = [];
    this.signature = signature;
  }

  command(signature) {
    const child = new FakeCommand(signature);
    this.children.push(child);
    return child;
  }

  description() {
    return this;
  }

  option() {
    return this;
  }

  allowUnknownOption() {
    this.allowsUnknownOptions = true;
    return this;
  }

  action(handler) {
    this.actionHandler = handler;
    return this;
  }

  help() {
    return this;
  }

  find(signature) {
    return this.children.find((child) => child.signature === signature);
  }
}

test('findPythonCommand returns first working candidate', () => {
  const calls = [];
  const command = findPythonCommand({
    candidates: ['nope', 'python3'],
    spawnSync: (candidate) => {
      calls.push(candidate);
      return candidate === 'python3'
        ? { status: 0 }
        : { error: new Error('missing'), status: null };
    }
  });

  assert.equal(command, 'python3');
  assert.deepEqual(calls, ['nope', 'python3']);
});

test('resolveShelfScript requires initialized Shelf project', () => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'agentos-cli-runtime-missing-'));

  assert.throws(
    () => resolveShelfScript(projectDirectory, 'task.py'),
    /Run agent init first/
  );
});

test('runShelfScript invokes Shelf script with target cwd', () => {
  const projectDirectory = createTempProject();
  const calls = [];

  const result = runShelfScript(projectDirectory, 'task.py', ['list', '--mine'], {
    pythonCommand: 'python3',
    spawnSync: (command, args, options) => {
      calls.push({ command, args, cwd: options.cwd, stdio: options.stdio });
      return { status: 0 };
    }
  });

  assert.equal(result.status, 0);
  assert.equal(calls[0].command, 'python3');
  assert.equal(calls[0].args[0].endsWith(path.join('.shelf', 'scripts', 'task.py')), true);
  assert.deepEqual(calls[0].args.slice(1), ['list', '--mine']);
  assert.equal(calls[0].cwd, path.resolve(projectDirectory));
});

test('developer init delegates to init_developer.py', async () => {
  const projectDirectory = createTempProject();
  const calls = [];

  const result = await agentDeveloperInit('Ada', projectDirectory, {}, {
    runShelfScript: (target, script, args) => {
      calls.push({ target, script, args });
      return { status: 0 };
    }
  });

  assert.equal(result.status, 0);
  assert.equal(calls[0].target, path.resolve(projectDirectory));
  assert.equal(calls[0].script, 'init_developer.py');
  assert.deepEqual(calls[0].args, ['Ada']);
});

test('task action delegates arbitrary args to task.py', async () => {
  const projectDirectory = createTempProject();
  const calls = [];

  const result = await agentTask(projectDirectory, ['create', 'Demo task', '--slug', 'demo'], {}, {
    runShelfScript: (target, script, args) => {
      calls.push({ target, script, args });
      return { status: 0 };
    }
  });

  assert.equal(result.status, 0);
  assert.equal(calls[0].script, 'task.py');
  assert.deepEqual(calls[0].args, ['create', 'Demo task', '--slug', 'demo']);
});

test('agent task command forwards passthrough args', async () => {
  const program = new FakeCommand();
  const calls = [];

  registerAgentCommands(program, {
    agentTask: async (target, args) => {
      calls.push({ target, args });
    }
  });

  const agentCommand = program.find('agent');
  const taskCommand = agentCommand.find('task [args...]');

  await taskCommand.actionHandler(['list', '--mine', '--status', 'in_progress'], { target: '.' });

  assert.equal(taskCommand.allowsUnknownOptions, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].target, '.');
  assert.deepEqual(calls[0].args, ['list', '--mine', '--status', 'in_progress']);
});

test('agent spec scaffold command forwards target and options', async () => {
  const program = new FakeCommand();
  const calls = [];

  registerAgentCommands(program, {
    scaffoldPackageSpecs: async (target, options) => {
      calls.push({ target, options });
    }
  });

  const agentCommand = program.find('agent');
  const specCommand = agentCommand.find('spec');
  const scaffoldCommand = specCommand.find('scaffold [target]');

  await scaffoldCommand.actionHandler('project-a', {
    dryRun: true,
    force: true,
    package: 'web=apps/web',
    target: 'project-b'
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].target, 'project-b');
  assert.equal(calls[0].options.dryRun, true);
  assert.equal(calls[0].options.force, true);
  assert.equal(calls[0].options.package, 'web=apps/web');
});
