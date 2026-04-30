const TOOL_LAYOUTS = {
  codex: {
    entryFile: 'AGENTS.md',
    label: 'Codex',
    rootDirectory: '.codex',
    skillsDirectory: '.codex/skills'
  },
  claude: {
    entryFile: 'CLAUDE.md',
    label: 'Claude Code',
    rootDirectory: '.claude',
    skillsDirectory: '.claude/skills'
  }
};

function getToolLayout(tool) {
  const layout = TOOL_LAYOUTS[tool];
  if (!layout) {
    throw new Error(`Unsupported tool layout: ${tool}`);
  }

  return layout;
}

module.exports = {
  TOOL_LAYOUTS,
  getToolLayout
};
