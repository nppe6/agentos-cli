const agentInit = require('../actions/agent-init');

function handleAction(action) {
  return async (...args) => {
    try {
      await action(...args);
    }
    catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
  };
}

function registerAgentCommands(program) {
  const agentCommand = program
    .command('agent')
    .description('Agent OS workflow commands.');

  agentCommand
    .command('init [target]')
    .description('Inject selected Agent OS workflow files into a project.')
    .option('-p, --preset <preset>', 'Preset name to inject.', 'vue')
    .option('-t, --target <path>', 'Target directory. Overrides the positional argument.')
    .option('--tools <tools>', 'Comma-separated tools to inject: codex, claude. Omit to choose interactively.')
    .option('--git-mode <mode>', 'How git should treat injected files: track or ignore.')
    .option('-f, --force', 'Overwrite existing workflow files without prompt.')
    .action(handleAction((target, options) => agentInit(options.target || target || '.', options)));
}

module.exports = registerAgentCommands;
