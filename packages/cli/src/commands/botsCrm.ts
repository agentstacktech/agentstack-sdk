/**
 * Thin curated aliases — SDK only, <40 LOC pattern.
 * Genetic tag: repo.tooling.user_cli.gen1
 */

import type { CommandSpec } from './types.js';
import { parseFlagValue, positional } from './types.js';

export const botsCommands: CommandSpec[] = [
  {
    name: 'bots list',
    description: 'List project bots (sdk.bots.list)',
    sdkPath: 'bots.list',
    examples: ['agentstack bots list --project 1444'],
    async run(rt) {
      const res = await rt.sdk.bots.list(rt.requireProject());
      rt.print(res.data ?? res);
    },
  },
];

export const crmCommands: CommandSpec[] = [
  {
    name: 'crm contacts',
    description: 'List CRM contacts — optional --q',
    sdkPath: 'crm.listContacts',
    usage: '[--q <query>]',
    examples: [
      'agentstack crm contacts --project 1444',
      'agentstack crm contacts --q alice',
    ],
    async run(rt, args) {
      const q = parseFlagValue(args, 'q') || positional(args)[0];
      const res = await rt.sdk.crm.listContacts(rt.requireProject(), {
        ...(q ? { q } : {}),
      });
      rt.print(res.data ?? res);
    },
  },
];
