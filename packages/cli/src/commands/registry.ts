import type { CommandSpec } from './types.js';
import { authCommands } from './auth.js';
import { doctorCommand } from './doctor.js';
import {
  dataCommands,
  discoverCommands,
  executeCommand,
  keysCommands,
  projectsCommands,
} from './projects.js';
import { hostingCommands, storageCommands } from './hosting.js';
import { agentsCommands, generationCommands, ragCommands } from './ragAgents.js';
import { botsCommands, crmCommands } from './botsCrm.js';
import { metaCommands } from './meta.js';
import { CLI_VERSION } from '../runtime/cliVersion.js';
import { SDK_VERSION } from '@agentstack/sdk';

const versionCommand: CommandSpec = {
  name: 'version',
  description: 'Print CLI + linked SDK identity',
  async run(rt) {
    rt.print({
      cli: CLI_VERSION,
      sdk: SDK_VERSION.semantic,
      sdkGeneration: SDK_VERSION.generation,
      apiBase: rt.apiBase,
      gene: 'repo.tooling.user_cli.gen1',
      note: 'CLI semver is independent of AGENTSTACK_CORE_VERSION',
    });
  },
};

export const ALL_COMMANDS: CommandSpec[] = [
  ...metaCommands,
  ...authCommands,
  doctorCommand,
  versionCommand,
  ...discoverCommands,
  executeCommand,
  ...projectsCommands,
  ...dataCommands,
  ...keysCommands,
  ...hostingCommands,
  ...storageCommands,
  ...ragCommands,
  ...agentsCommands,
  ...generationCommands,
  ...botsCommands,
  ...crmCommands,
];

export function findCommand(argv: string[]): {
  cmd: CommandSpec | null;
  rest: string[];
} {
  const cleaned = argv.filter((a) => a !== '--');
  // Match longest name first
  const sorted = [...ALL_COMMANDS].sort(
    (a, b) => b.name.split(' ').length - a.name.split(' ').length,
  );
  for (const cmd of sorted) {
    const parts = cmd.name.split(' ');
    if (parts.every((p, i) => cleaned[i] === p)) {
      return { cmd, rest: cleaned.slice(parts.length) };
    }
  }
  return { cmd: null, rest: cleaned };
}

export function helpText(): string {
  const lines = [
    'AgentStack CLI (@agentstack/cli) — repo.tooling.user_cli.gen1',
    '',
    'Usage: agentstack [--json] [--project N] [--profile name] <command>',
    '',
    'Commands:',
  ];
  for (const c of ALL_COMMANDS) {
    const tag = c.sdkPath ? `  [sdk:${c.sdkPath}]` : c.mcpAction ? `  [mcp:${c.mcpAction}]` : '';
    lines.push(`  ${c.name.padEnd(28)} ${c.description}${tag}`);
  }
  lines.push('');
  lines.push('Escape hatch: agentstack execute --action <mcp.action> --params \'{…}\'');
  lines.push('Docs: https://agentstack.tech — docs/CLI_QUICKSTART.md');
  return lines.join('\n');
}
