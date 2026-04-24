#!/usr/bin/env node

const { program } = require('commander');
const packageJson = require('../package.json');
const registerAgentCommands = require('../lib/commands/agent');

program
  .name('agentos-cli')
  .description('Inject Agent OS workflow files into existing projects.')
  .version(packageJson.version, '-v, --version', 'output the version number');

registerAgentCommands(program);

program.parse(process.argv);
