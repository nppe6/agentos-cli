let figlet = null

try {
  figlet = require('figlet')
} catch (_error) {
  figlet = null
}

const ANSI = {
  reset: '\x1b[0m',
  accent: '\x1b[38;2;208;209;254m',
  gray: '\x1b[90m'
}

function colorize(color, message) {
  return `${ANSI[color] || ''}${message}${ANSI.reset}`
}

function renderFigletLogo() {
  if (!figlet) {
    return null
  }

  try {
    return figlet.textSync('ShelfCli', { font: 'Rebel' }).trimEnd()
  } catch (_error) {
    return null
  }
}

function renderLogo() {
  const logo = renderFigletLogo()

  if (!logo) {
    return ''
  }

  return logo
    .split('\n')
    .map((line) => `  ${colorize('accent', line)}`)
    .join('\n')
}

function renderBanner(options = {}) {
  const developer = String(options.developer || '').trim()
  const logo = renderLogo()
  const lines = ['']

  if (logo) {
    lines.push(logo, '')
  }

  lines.push(
    `  ${colorize('gray', 'Shared AI workflow memory for Codex & Claude Code')}`
  )

  if (developer) {
    lines.push(
      '',
      `  ${colorize('accent', '👤 Developer:')} ${colorize('gray', developer)}`
    )
  }

  return lines.join('\n')
}

function printBanner(options = {}) {
  console.log(`${renderBanner(options)}\n`)
}

module.exports = {
  BANNER: renderBanner(),
  renderBanner,
  printBanner
}
