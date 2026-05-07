const fs = require('fs');
const path = require('path');
const {
  collectProjectionTemplates,
  SOURCE_DIRECTORY_NAME,
  readAgentOsManifest,
  normalizeTools
} = require('../utils/agent-os');
const { getToolLayout } = require('../utils/tool-layouts');
const { findPythonCommand } = require('../utils/python-runtime');
const { resolveDetectedPackageSpecs } = require('./agent-spec');

const REQUIRED_RUNTIME_SCRIPTS = [
  'task.py',
  'init_developer.py',
  'get_context.py',
  'add_session.py'
];

function agentDoctor(target = '.', options = {}) {
  const targetDirectory = path.resolve(target);
  const issues = [];
  const warnings = [];

  if (!fs.existsSync(path.join(targetDirectory, SOURCE_DIRECTORY_NAME))) {
    issues.push(`Missing ${SOURCE_DIRECTORY_NAME} source directory.`);
  }

  const manifest = readAgentOsManifest(targetDirectory);
  if (!manifest) {
    issues.push(`Missing ${SOURCE_DIRECTORY_NAME}/manifest.json.`);
  }

  checkRequiredFile(targetDirectory, 'AGENTS.md', issues);
  checkRequiredFile(targetDirectory, `${SOURCE_DIRECTORY_NAME}/workflow.md`, issues);
  for (const script of REQUIRED_RUNTIME_SCRIPTS) {
    checkRequiredFile(targetDirectory, `${SOURCE_DIRECTORY_NAME}/scripts/${script}`, issues);
  }

  const tools = manifest && Array.isArray(manifest.tools)
    ? normalizeTools(manifest.tools)
    : detectTools(targetDirectory);
  const stack = manifest && Array.isArray(manifest.stacks) && manifest.stacks.length > 0
    ? manifest.stacks[0]
    : 'core';

  for (const tool of tools) {
    const layout = getToolLayout(tool);
    if (layout.entryFile) {
      checkRequiredFile(targetDirectory, layout.entryFile, issues);
    }
    if (layout.capabilities && layout.capabilities.toolScopedSkills) {
      checkRequiredDirectory(targetDirectory, layout.skillsDirectory, issues);
    }
    if (layout.capabilities && layout.capabilities.openAgentSkills) {
      checkRequiredDirectory(targetDirectory, path.join('.agents', 'skills'), issues);
    }
    if (layout.agentsDirectory) {
      checkRequiredDirectory(targetDirectory, layout.agentsDirectory, issues);
    }
  }

  if (manifest && fs.existsSync(path.join(targetDirectory, SOURCE_DIRECTORY_NAME))) {
    const plannedProjectionFiles = collectProjectionTemplates(targetDirectory, tools, stack)
      .map((template) => template.path)
      .filter(uniquePaths);

    for (const relativePath of plannedProjectionFiles) {
      checkRequiredFile(targetDirectory, relativePath, issues);
    }
  }

  const hashesPath = path.join(targetDirectory, SOURCE_DIRECTORY_NAME, 'template-hashes.json');
  if (!fs.existsSync(hashesPath)) {
    warnings.push(`Missing ${SOURCE_DIRECTORY_NAME}/template-hashes.json; updates cannot detect user modifications safely.`);
  }

  if (manifest && manifest.schemaVersion !== 1) {
    warnings.push(`Unsupported manifest schema version: ${manifest.schemaVersion}.`);
  }

  const missingPackageSpecs = manifest
    ? checkPackageSpecs(targetDirectory, warnings)
    : [];

  const pythonCommand = (options.findPythonCommand || findPythonCommand)();
  if (!pythonCommand) {
    warnings.push('Python runtime not found; developer and task commands require python or python3 on PATH.');
  }

  printDoctorSummary({ issues, manifest, targetDirectory, tools, warnings });

  return {
    ok: issues.length === 0,
    issues,
    manifest,
    missingPackageSpecs,
    targetDirectory,
    tools,
    warnings,
    pythonCommand
  };
}

function detectTools(targetDirectory) {
  const tools = [];
  if (fs.existsSync(path.join(targetDirectory, '.codex'))) {
    tools.push('codex');
  }
  if (fs.existsSync(path.join(targetDirectory, '.claude'))) {
    tools.push('claude');
  }
  return tools;
}

function checkRequiredFile(targetDirectory, relativePath, issues) {
  const absolutePath = path.join(targetDirectory, relativePath);
  const issue = `Missing file: ${relativePath}`;
  if ((!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) && !issues.includes(issue)) {
    issues.push(issue);
  }
}

function checkRequiredDirectory(targetDirectory, relativePath, issues) {
  const absolutePath = path.join(targetDirectory, relativePath);
  const issue = `Missing directory: ${relativePath}`;
  if ((!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isDirectory()) && !issues.includes(issue)) {
    issues.push(issue);
  }
}

function uniquePaths(value, index, array) {
  return array.indexOf(value) === index;
}

function checkPackageSpecs(targetDirectory, warnings) {
  const missing = [];

  for (const pkg of resolveDetectedPackageSpecs(targetDirectory)) {
    const readmePath = path.join(targetDirectory, pkg.specPath, 'README.md');
    if (fs.existsSync(readmePath) && fs.statSync(readmePath).isFile()) {
      continue;
    }

    missing.push(pkg);
    warnings.push(`Missing package spec for ${pkg.name || pkg.path}: ${pkg.specPath}/README.md. Run shelf spec scaffold.`);
  }

  return missing;
}

function printDoctorSummary({ issues, targetDirectory, tools, warnings }) {
  console.log(`AgentOS Shelf doctor: ${targetDirectory}`);
  console.log(`Tools: ${tools.length > 0 ? tools.join(', ') : 'none detected'}`);

  if (issues.length === 0 && warnings.length === 0) {
    console.log('Status: ok');
    return;
  }

  if (issues.length > 0) {
    console.log('Issues:');
    for (const issue of issues) {
      console.log(`- ${issue}`);
    }
  }

  if (warnings.length > 0) {
    console.log('Warnings:');
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }
}

module.exports = agentDoctor;
