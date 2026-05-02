const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { SOURCE_DIRECTORY_NAME } = require('./agent-os');

function getPythonCandidates(platform = process.platform) {
  return platform === 'win32'
    ? ['python', 'python3']
    : ['python3', 'python'];
}

function findPythonCommand(options = {}) {
  const spawn = options.spawnSync || spawnSync;
  const candidates = options.candidates || getPythonCandidates(options.platform);

  for (const command of candidates) {
    const result = spawn(command, ['--version'], {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    if (!result.error && result.status === 0) {
      return command;
    }
  }

  return null;
}

function resolveShelfScript(targetDirectory, scriptName) {
  const target = path.resolve(targetDirectory);
  const shelfDirectory = path.join(target, SOURCE_DIRECTORY_NAME);
  const scriptPath = path.join(shelfDirectory, 'scripts', scriptName);

  if (!fs.existsSync(shelfDirectory) || !fs.statSync(shelfDirectory).isDirectory()) {
    throw new Error(`Missing ${SOURCE_DIRECTORY_NAME} source directory. Run shelf init first.`);
  }

  if (!fs.existsSync(scriptPath) || !fs.statSync(scriptPath).isFile()) {
    throw new Error(`Missing runtime script: ${SOURCE_DIRECTORY_NAME}/scripts/${scriptName}`);
  }

  return {
    scriptPath,
    targetDirectory: target
  };
}

function runShelfScript(targetDirectory, scriptName, args = [], options = {}) {
  const { scriptPath, targetDirectory: cwd } = resolveShelfScript(targetDirectory, scriptName);
  const python = options.pythonCommand || findPythonCommand(options);

  if (!python) {
    throw new Error('Python runtime not found. Install Python 3 and ensure python or python3 is on PATH.');
  }

  const spawn = options.spawnSync || spawnSync;
  const result = spawn(python, [scriptPath, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: options.stdio || 'inherit'
  });

  if (result.error) {
    throw result.error;
  }

  return {
    command: python,
    scriptPath,
    status: result.status ?? 0
  };
}

module.exports = {
  findPythonCommand,
  getPythonCandidates,
  resolveShelfScript,
  runShelfScript
};
