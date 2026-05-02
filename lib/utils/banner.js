const BANNER = String.raw`
 ███████╗██╗  ██╗███████╗██╗     ███████╗ ██████╗██╗     ██╗
 ██╔════╝██║  ██║██╔════╝██║     ██╔════╝██╔════╝██║     ██║
 ███████╗███████║█████╗  ██║     █████╗  ██║     ██║     ██║
 ╚════██║██╔══██║██╔══╝  ██║     ██╔══╝  ██║     ██║     ██║
 ███████║██║  ██║███████╗███████╗██║     ╚██████╗███████╗██║
 ╚══════╝╚═╝  ╚═╝╚══════╝╚══════╝╚═╝      ╚═════╝╚══════╝╚═╝

 shelfcli
 Shared AI workflow memory for Codex & Claude Code
`;

function printBanner() {
  console.log(BANNER.trimEnd());
}

module.exports = {
  BANNER,
  printBanner
};
