const agentInit = require('../actions/agent-init');
const agentDoctor = require('../actions/agent-doctor');
const agentSync = require('../actions/agent-sync');
const importSkills = require('../actions/agent-skills-import');

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
    .description('AgentOS Shelf workflow commands.');

  agentCommand
    .command('init [target]')
    .description('Inject selected AgentOS Shelf workflow files into a project.')
    .option('--stack <stack>', 'Stack skill pack to install: core.', 'core')
    .option('-t, --target <path>', 'Target directory. Overrides the positional argument.')
    .option('--tools <tools>', 'Comma-separated tools to inject: codex, claude. Omit to choose interactively.')
    .option('--git-mode <mode>', 'How git should treat injected files: track or ignore.')
    .option('-f, --force', 'Overwrite existing workflow files without prompt.')
    .action(handleAction((target, options) => agentInit(options.target || target || '.', options)));

  agentCommand
    .command('doctor [target]')
    .description('Check an AgentOS Shelf installation without writing files.')
    .option('-t, --target <path>', 'Target directory. Overrides the positional argument.')
    .action(handleAction((target, options) => agentDoctor(options.target || target || '.')));

  agentCommand
    .command('sync [target]')
    .description('Regenerate selected tool projections from .shelf.')
    .option('-t, --target <path>', 'Target directory. Overrides the positional argument.')
    .option('--tools <tools>', 'Comma-separated tools to sync. Defaults to manifest tools.')
    .option('--stack <stack>', 'Stack skill pack used for metadata, defaults to manifest stack.')
    .option('--dry-run', 'Preview projection changes without writing files.')
    .action(handleAction((target, options) => agentSync(options.target || target || '.', options)));

  const skillsCommand = agentCommand
    .command('skills')
    .description('Project-level skills commands.')
    .action(() => skillsCommand.help());

  skillsCommand
    .command('import <source> [target]')
    .description('Import project-level skills into an AgentOS Shelf project.')
    .option('-t, --target <path>', 'Target project directory. Overrides the positional argument.')
    .option('--mode <mode>', 'Import mode: skip or overwrite. Omit to choose interactively.')
    .option('--to <destination>', 'Destination: auto, shelf, agent-os, codex, or claude.', 'auto')
    .option('-f, --force', 'Alias for --mode overwrite.')
    .action(handleAction((source, target, options) => importSkills(source, {
      force: options.force,
      interactive: true,
      mode: options.mode,
      target: options.target || target || '.',
      to: options.to
    })));
}

module.exports = registerAgentCommands;
