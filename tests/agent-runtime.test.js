const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');
const assert = require('node:assert/strict');

const { agentDeveloperInit } = require('../lib/actions/agent-developer');
const { addWorkspaceSession, getWorkspaceContext } = require('../lib/actions/agent-workspace');
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

  requiredOption() {
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
    /Run shelf init first/
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

test('developer init can use native Node identity initialization', async () => {
  const projectDirectory = createTempProject();
  const calls = [];

  const result = await agentDeveloperInit('Ada', projectDirectory, { native: true }, {
    initializeDeveloperIdentity: (target, name, options) => {
      calls.push({ target, name, options });
      return { initialized: true, developer: name };
    },
    printBanner: () => {}
  });

  assert.equal(result.initialized, true);
  assert.equal(calls[0].target, path.resolve(projectDirectory));
  assert.equal(calls[0].name, 'Ada');
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

test('workspace context delegates to get_context.py', async () => {
  const projectDirectory = createTempProject();
  const calls = [];

  const result = await getWorkspaceContext(projectDirectory, { json: true }, {
    runShelfScript: (target, script, args) => {
      calls.push({ target, script, args });
      return { status: 0 };
    }
  });

  assert.equal(result.status, 0);
  assert.equal(calls[0].target, path.resolve(projectDirectory));
  assert.equal(calls[0].script, 'get_context.py');
  assert.deepEqual(calls[0].args, ['--json']);
});

test('workspace add-session delegates options to add_session.py', async () => {
  const projectDirectory = createTempProject();
  const calls = [];

  const result = await addWorkspaceSession(projectDirectory, {
    branch: 'feat/demo',
    commit: 'abc1234',
    contentFile: 'notes.md',
    noCommit: true,
    package: 'web',
    stdin: true,
    summary: 'Built the demo flow.',
    title: 'Demo session'
  }, {
    runShelfScript: (target, script, args) => {
      calls.push({ target, script, args });
      return { status: 0 };
    }
  });

  assert.equal(result.status, 0);
  assert.equal(calls[0].target, path.resolve(projectDirectory));
  assert.equal(calls[0].script, 'add_session.py');
  assert.deepEqual(calls[0].args, [
    '--title', 'Demo session',
    '--commit', 'abc1234',
    '--summary', 'Built the demo flow.',
    '--content-file', 'notes.md',
    '--package', 'web',
    '--branch', 'feat/demo',
    '--no-commit',
    '--stdin'
  ]);
});

test('workspace add-session requires a title', async () => {
  await assert.rejects(
    () => addWorkspaceSession('.', { summary: 'Missing title.' }, {
      runShelfScript: () => ({ status: 0 })
    }),
    /Session title is required/
  );
});

test('shelf task command forwards passthrough args', async () => {
  const program = new FakeCommand();
  const calls = [];

  registerAgentCommands(program, {
    agentTask: async (target, args) => {
      calls.push({ target, args });
    }
  });

  const agentCommand = program.find('shelf');
  const taskCommand = agentCommand.find('task [args...]');

  await taskCommand.actionHandler(['list', '--mine', '--status', 'in_progress'], { target: '.' });

  assert.equal(taskCommand.allowsUnknownOptions, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].target, '.');
  assert.deepEqual(calls[0].args, ['list', '--mine', '--status', 'in_progress']);
});

test('shelf spec scaffold command forwards target and options', async () => {
  const program = new FakeCommand();
  const calls = [];

  registerAgentCommands(program, {
    scaffoldPackageSpecs: async (target, options) => {
      calls.push({ target, options });
    }
  });

  const agentCommand = program.find('shelf');
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

test('shelf workspace commands forward target and options', async () => {
  const program = new FakeCommand();
  const calls = [];

  registerAgentCommands(program, {
    addWorkspaceSession: async (target, options) => {
      calls.push({ action: 'add-session', target, options });
    },
    getWorkspaceContext: async (target, options) => {
      calls.push({ action: 'context', target, options });
    }
  });

  const agentCommand = program.find('shelf');
  const workspaceCommand = agentCommand.find('workspace');
  const contextCommand = workspaceCommand.find('context [target]');
  const addSessionCommand = workspaceCommand.find('add-session [target]');

  await contextCommand.actionHandler('project-a', { json: true, target: 'project-b' });
  await addSessionCommand.actionHandler('project-a', {
    noCommit: true,
    summary: 'Summary',
    title: 'Session',
    target: 'project-c'
  });

  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((call) => call.action), ['context', 'add-session']);
  assert.equal(calls[0].target, 'project-b');
  assert.equal(calls[0].options.json, true);
  assert.equal(calls[1].target, 'project-c');
  assert.equal(calls[1].options.title, 'Session');
  assert.equal(calls[1].options.noCommit, true);
});

test('agent command remains a compatibility alias', async () => {
  const program = new FakeCommand();

  registerAgentCommands(program, {});

  assert.ok(program.find('shelf'));
  assert.ok(program.find('agent'));
});
