const fs = require('fs');
const path = require('path');
const {
  SOURCE_DIRECTORY_NAME,
  readAgentOsManifest,
  normalizeTools
} = require('../utils/agent-os');
const { getToolLayout } = require('../utils/tool-layouts');

function agentDoctor(target = '.') {
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

  checkRequiredFile(targetDirectory, `${SOURCE_DIRECTORY_NAME}/rules/AGENTS.shared.md`, issues);
  checkRequiredFile(targetDirectory, `${SOURCE_DIRECTORY_NAME}/templates/CLAUDE.md`, issues);
  checkRequiredDirectory(targetDirectory, `${SOURCE_DIRECTORY_NAME}/skills`, issues);

  const tools = manifest && Array.isArray(manifest.tools)
    ? normalizeTools(manifest.tools)
    : detectTools(targetDirectory);

  for (const tool of tools) {
    const layout = getToolLayout(tool);
    checkRequiredFile(targetDirectory, layout.entryFile, issues);
    checkRequiredDirectory(targetDirectory, layout.skillsDirectory, issues);
  }

  const hashesPath = path.join(targetDirectory, SOURCE_DIRECTORY_NAME, 'template-hashes.json');
  if (!fs.existsSync(hashesPath)) {
    warnings.push(`Missing ${SOURCE_DIRECTORY_NAME}/template-hashes.json; updates cannot detect user modifications safely.`);
  }

  if (manifest && manifest.schemaVersion !== 1) {
    warnings.push(`Unsupported manifest schema version: ${manifest.schemaVersion}.`);
  }

  printDoctorSummary({ issues, manifest, targetDirectory, tools, warnings });

  return {
    ok: issues.length === 0,
    issues,
    manifest,
    targetDirectory,
    tools,
    warnings
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
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    issues.push(`Missing file: ${relativePath}`);
  }
}

function checkRequiredDirectory(targetDirectory, relativePath, issues) {
  const absolutePath = path.join(targetDirectory, relativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isDirectory()) {
    issues.push(`Missing directory: ${relativePath}`);
  }
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
