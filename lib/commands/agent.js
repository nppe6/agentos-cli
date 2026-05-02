const agentInit = require('../actions/agent-init');
const agentDoctor = require('../actions/agent-doctor');
const agentSync = require('../actions/agent-sync');
const agentUpdate = require('../actions/agent-update');
const importSkills = require('../actions/agent-skills-import');
const { createJoinerTask } = require('../actions/agent-joiner');
const { agentDeveloperInit } = require('../actions/agent-developer');
const agentTask = require('../actions/agent-task');
const { scaffoldPackageSpecs } = require('../actions/agent-spec');
const { addWorkspaceSession, getWorkspaceContext } = require('../actions/agent-workspace');

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

function registerAgentCommands(program, dependencies = {}) {
  const actions = {
    agentDeveloperInit: dependencies.agentDeveloperInit || agentDeveloperInit,
    agentDoctor: dependencies.agentDoctor || agentDoctor,
    agentInit: dependencies.agentInit || agentInit,
    agentSync: dependencies.agentSync || agentSync,
    agentUpdate: dependencies.agentUpdate || agentUpdate,
    agentTask: dependencies.agentTask || agentTask,
    addWorkspaceSession: dependencies.addWorkspaceSession || addWorkspaceSession,
    getWorkspaceContext: dependencies.getWorkspaceContext || getWorkspaceContext,
    scaffoldPackageSpecs: dependencies.scaffoldPackageSpecs || scaffoldPackageSpecs,
    importSkills: dependencies.importSkills || importSkills,
    createJoinerTask: dependencies.createJoinerTask || createJoinerTask
  };

  registerShelfWorkflowCommand(program, 'shelf', 'AgentOS Shelf workflow commands.', actions);
  registerShelfWorkflowCommand(program, 'agent', 'Deprecated alias for `shelf` workflow commands.', actions);
}

function registerShelfWorkflowCommand(program, commandName, description, actions) {
  const agentCommand = program
    .command(commandName)
    .description(description);

  agentCommand
    .command('init [target]')
    .description('Inject selected AgentOS Shelf workflow files into a project.')
    .option('--stack <stack>', 'Stack skill pack to install: core.', 'core')
    .option('-t, --target <path>', 'Target directory. Overrides the positional argument.')
    .option('--tools <tools>', 'Comma-separated tools to inject: codex, claude. Omit to choose interactively.')
    .option('--git-mode <mode>', 'How git should treat injected files: track or ignore.')
    .option('-u, --user <name>', 'Developer name. Defaults to git config user.name when available.')
    .option('--skip-developer', 'Skip default developer identity initialization during init.')
    .option('-f, --force', 'Overwrite existing workflow files without prompt.')
    .action(handleAction((target, options) => actions.agentInit(options.target || target || '.', options)));

  agentCommand
    .command('doctor [target]')
    .description('Check an AgentOS Shelf installation without writing files.')
    .option('-t, --target <path>', 'Target directory. Overrides the positional argument.')
    .action(handleAction((target, options) => actions.agentDoctor(options.target || target || '.')));

  agentCommand
    .command('sync [target]')
    .description('Regenerate selected tool projections from .shelf.')
    .option('-t, --target <path>', 'Target directory. Overrides the positional argument.')
    .option('--tools <tools>', 'Comma-separated tools to sync. Defaults to manifest tools.')
    .option('--stack <stack>', 'Stack skill pack used for metadata, defaults to manifest stack.')
    .option('--dry-run', 'Preview projection changes without writing files.')
    .action(handleAction((target, options) => actions.agentSync(options.target || target || '.', options)));

  agentCommand
    .command('update [target]')
    .description('Preview or apply a conservative Shelf projection update with backups.')
    .option('-t, --target <path>', 'Target directory. Overrides the positional argument.')
    .option('--tools <tools>', 'Comma-separated tools to update. Defaults to manifest tools.')
    .option('--stack <stack>', 'Stack skill pack used for metadata, defaults to manifest stack.')
    .option('--dry-run', 'Preview update changes without writing files.')
    .option('-f, --force', 'Apply even when user-modified projection files are detected.')
    .action(handleAction((target, options) => actions.agentUpdate(options.target || target || '.', options)));

  const developerCommand = agentCommand
    .command('developer')
    .description('Shelf developer identity commands.')
    .action(() => developerCommand.help());

  developerCommand
    .command('init <name> [target]')
    .description('Initialize .shelf developer identity and workspace memory.')
    .option('-t, --target <path>', 'Target project directory. Overrides the positional argument.')
    .action(handleAction((name, target, options) => actions.agentDeveloperInit(name, options.target || target || '.')));

  developerCommand
    .command('join <name> [target]')
    .description('Create a lightweight onboarding task for a developer.')
    .option('-t, --target <path>', 'Target project directory. Overrides the positional argument.')
    .option('-f, --force', 'Overwrite an existing joiner task for this developer.')
    .action(handleAction((name, target, options) => actions.createJoinerTask(name, options.target || target || '.', options)));

  agentCommand
    .command('task [args...]')
    .description('Run .shelf task.py with passthrough arguments.')
    .allowUnknownOption(true)
    .option('-t, --target <path>', 'Target project directory.', '.')
    .action(handleAction((args, options) => actions.agentTask(options.target || '.', args || [])));

  const specCommand = agentCommand
    .command('spec')
    .description('Shelf spec scaffolding commands.')
    .action(() => specCommand.help());

  specCommand
    .command('scaffold [target]')
    .description('Generate package-specific spec folders for workspace packages.')
    .option('-t, --target <path>', 'Target project directory. Overrides the positional argument.')
    .option('--package <packages>', 'Comma-separated packages to scaffold manually, either path or name=path.')
    .option('--dry-run', 'Preview generated package spec files without writing.')
    .option('-f, --force', 'Overwrite existing package spec files.')
    .action(handleAction((target, options) => actions.scaffoldPackageSpecs(options.target || target || '.', options)));

  const workspaceCommand = agentCommand
    .command('workspace')
    .description('Shelf workspace memory commands.')
    .action(() => workspaceCommand.help());

  workspaceCommand
    .command('context [target]')
    .description('Print current Shelf workspace and git context.')
    .option('-t, --target <path>', 'Target project directory. Overrides the positional argument.')
    .option('--json', 'Print JSON context.')
    .action(handleAction((target, options) => actions.getWorkspaceContext(options.target || target || '.', options)));

  workspaceCommand
    .command('add-session [target]')
    .description('Add a session entry to the current developer workspace journal.')
    .option('-t, --target <path>', 'Target project directory. Overrides the positional argument.')
    .requiredOption('--title <title>', 'Session title.')
    .option('--commit <hashes>', 'Comma-separated commit hashes.', '-')
    .option('--summary <summary>', 'Brief session summary.')
    .option('--content-file <path>', 'Path to detailed session content.')
    .option('--package <name>', 'Package name tag for monorepos.')
    .option('--branch <branch>', 'Branch name. Defaults to task or git branch.')
    .option('--no-commit', 'Skip auto-commit of workspace changes.')
    .option('--stdin', 'Read extra session content from stdin.')
    .action(handleAction((target, options) => actions.addWorkspaceSession(options.target || target || '.', options)));

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
    .action(handleAction((source, target, options) => actions.importSkills(source, {
      force: options.force,
      interactive: true,
      mode: options.mode,
      target: options.target || target || '.',
      to: options.to
    })));

  return agentCommand;
}

module.exports = registerAgentCommands;
