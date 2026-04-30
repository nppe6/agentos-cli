const TOOL_LAYOUTS = {
  codex: {
    entryFile: 'AGENTS.md',
    label: 'Codex',
    managedPaths: ['AGENTS.md', '.codex/'],
    rootDirectory: '.codex',
    skillsDirectory: '.codex/skills'
  },
  claude: {
    entryFile: 'CLAUDE.md',
    label: 'Claude Code',
    managedPaths: ['CLAUDE.md', '.claude/'],
    rootDirectory: '.claude',
    skillsDirectory: '.claude/skills'
  }
};

function getAllToolLayouts() {
  return TOOL_LAYOUTS;
}

function getToolLayout(tool) {
  const layout = TOOL_LAYOUTS[tool];
  if (!layout) {
    throw new Error(`Unsupported tool layout: ${tool}`);
  }

  return layout;
}

module.exports = {
  TOOL_LAYOUTS,
  getAllToolLayouts,
  getToolLayout
};
