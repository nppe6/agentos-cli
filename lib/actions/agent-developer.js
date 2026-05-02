const path = require('path');
const { printBanner } = require('../utils/banner');
const { initializeDeveloperIdentity } = require('../utils/developer-identity');
const { runShelfScript } = require('../utils/python-runtime');

async function agentDeveloperInit(name, target = '.', options = {}, dependencies = {}) {
  if (!name || !String(name).trim()) {
    throw new Error('Developer name is required.');
  }

  const renderBanner = dependencies.printBanner || printBanner;
  renderBanner();

  if (dependencies.initializeDeveloperIdentity || options.native) {
    return (dependencies.initializeDeveloperIdentity || initializeDeveloperIdentity)(
      path.resolve(target),
      String(name).trim(),
      { force: options.force }
    );
  }

  const runner = dependencies.runShelfScript || runShelfScript;
  const result = runner(path.resolve(target), 'init_developer.py', [String(name).trim()], options);

  if (result.status !== 0) {
    throw new Error(`Developer initialization failed with exit code ${result.status}.`);
  }

  return result;
}

module.exports = {
  agentDeveloperInit
};
