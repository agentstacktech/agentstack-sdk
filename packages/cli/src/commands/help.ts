/**
 * Detailed help for one command — usage + related MCP + examples from CommandSpec.
 */

import { ALL_COMMANDS, findCommand, helpText } from './registry.js';

export function commandHelp(argv: string[]): string {
  if (!argv.length) return helpText();
  const { cmd } = findCommand(argv);
  if (!cmd) {
    const partial = argv.join(' ');
    const matches = ALL_COMMANDS.filter((c) => c.name.startsWith(partial));
    if (matches.length) {
      return [
        `Commands matching "${partial}":`,
        ...matches.map((c) => `  ${c.name.padEnd(28)} ${c.description}`),
      ].join('\n');
    }
    return `unknown command: ${partial}\n\n${helpText()}`;
  }
  const lines = [`agentstack ${cmd.name}`, '', cmd.description];
  if (cmd.sdkPath) lines.push(`SDK: ${cmd.sdkPath}`);
  else if (cmd.mcpAction) lines.push(`MCP: ${cmd.mcpAction}`);
  if (cmd.usage) lines.push(`Usage: agentstack ${cmd.name} ${cmd.usage}`);
  if (cmd.examples?.length) {
    lines.push('', 'Examples:');
    for (const e of cmd.examples) lines.push(`  ${e}`);
  }
  lines.push('', 'Global: --json --quiet --trace --project N --profile name --api-base URL');
  return lines.join('\n');
}
