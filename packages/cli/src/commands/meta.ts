/**
 * Meta commands (help / completion) — listed in ALL_COMMANDS for one SoT.
 * Bin may still fast-path these before createRuntime (no network).
 * Genetic tag: repo.tooling.user_cli.gen1
 */

import type { CommandSpec } from './types.js';

export const metaCommands: CommandSpec[] = [
  {
    name: 'help',
    description: 'Detailed help — agentstack help <command>',
    usage: '[<command> …]',
    examples: [
      'agentstack help',
      'agentstack help hosting quick-start',
      'agentstack help bots list',
    ],
    async run(_rt, args) {
      const { commandHelp } = await import('./help.js');
      process.stdout.write(`${commandHelp(args)}\n`);
    },
  },
  {
    name: 'completion',
    description: 'Shell completion script — bash | zsh | powershell',
    usage: '<bash|zsh|powershell>',
    examples: [
      'eval "$(agentstack completion bash)"',
      'agentstack completion powershell | Out-File -Append $PROFILE',
    ],
    async run(_rt, args) {
      const { completionScript } = await import('./completion.js');
      process.stdout.write(completionScript(args[0] || 'bash'));
    },
  },
];
