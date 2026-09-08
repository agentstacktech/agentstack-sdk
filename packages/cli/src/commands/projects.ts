import { readFile } from 'node:fs/promises';
import type { CommandSpec } from './types.js';
import { parseFlagValue, parseJsonFlag, positional } from './types.js';
import { mcpAction } from '../runtime/mcpAction.js';

export const discoverCommands: CommandSpec[] = [
  {
    name: 'discover list',
    description: 'List MCP actions',
    mcpAction: 'discovery.list',
    async run(rt) {
      rt.print(await mcpAction(rt, 'discovery.list'));
    },
  },
  {
    name: 'discover search',
    description: 'Intent search via POST /mcp/discover/by_intent',
    sdkPath: 'mcp.discoverByIntent',
    async run(rt, args) {
      const q = positional(args).join(' ') || parseFlagValue(args, 'q');
      if (!q) throw new Error('usage: discover search <intent>');
      rt.print(await rt.sdk.mcp.discoverByIntent(q, { projectId: rt.requireProject() }));
    },
  },
  {
    name: 'discover caps',
    description: 'Show API key capability context',
    sdkPath: 'mcp.getDiscovery',
    async run(rt) {
      rt.print(
        await rt.sdk.mcp.getDiscovery({
          ...(rt.projectId != null ? { projectId: rt.projectId } : {}),
        }),
      );
    },
  },
];

export const executeCommand: CommandSpec = {
  name: 'execute',
  description: 'Raw MCP — --action + --params or --file steps.json [--idempotency-key]',
  usage: '--action <mcp.action> [--params JSON] | --file steps.json [--idempotency-key K]',
  examples: [
    "agentstack execute --action discovery.list --params '{}'",
    'agentstack execute --file ./steps.json --idempotency-key batch-1',
  ],
  async run(rt, args) {
    const idem = parseFlagValue(args, 'idempotency-key');
    const file = parseFlagValue(args, 'file');
    if (file) {
      const raw = JSON.parse(await readFile(file, 'utf8')) as unknown;
      let steps: Array<{ action: string; params?: Record<string, unknown> }> | undefined;
      if (Array.isArray(raw)) {
        steps = raw as Array<{ action: string; params?: Record<string, unknown> }>;
      } else if (raw && typeof raw === 'object' && Array.isArray((raw as { steps?: unknown }).steps)) {
        steps = (raw as { steps: Array<{ action: string; params?: Record<string, unknown> }> }).steps;
      }
      if (!steps?.length) {
        throw new Error('--file must contain a steps array or { steps: [...] }');
      }
      const out = await rt.mcp(steps, { idempotencyKey: idem });
      rt.print(out);
      if (!out.ok) throw new Error(out.error || 'execute failed');
      return;
    }
    const action = parseFlagValue(args, 'action');
    if (!action) throw new Error('usage: execute --action X --params \'{…}\'');
    rt.print(
      await mcpAction(rt, action, parseJsonFlag(args, 'params'), {
        idempotencyKey: idem,
      }),
    );
  },
};

async function projectStatsRun(
  rt: Parameters<CommandSpec['run']>[0],
  args: string[],
): Promise<void> {
  const raw = positional(args)[0];
  const id = raw ? Number(raw) : rt.requireProject();
  rt.print(await rt.sdk.platform.api.getProjectStats(id));
}

export const projectsCommands: CommandSpec[] = [
  {
    name: 'projects list',
    description: 'List projects',
    sdkPath: 'platform.api.getProjects',
    async run(rt) {
      rt.requireAuth();
      rt.print(await rt.sdk.platform.api.getProjects());
    },
  },
  {
    name: 'projects create',
    description: 'Create project — --name',
    sdkPath: 'platform.api.createProject',
    async run(rt, args) {
      const name = parseFlagValue(args, 'name') || positional(args)[0];
      if (!name) throw new Error('usage: projects create --name <name>');
      rt.print(await rt.sdk.platform.api.createProject({ name }));
    },
  },
  {
    name: 'projects get',
    description: 'Get project stats',
    sdkPath: 'platform.api.getProjectStats',
    async run(rt, args) {
      await projectStatsRun(rt, args);
    },
  },
  {
    name: 'projects stats',
    description: 'Alias for projects get',
    sdkPath: 'platform.api.getProjectStats',
    async run(rt, args) {
      await projectStatsRun(rt, args);
    },
  },
];

export const dataCommands: CommandSpec[] = [
  {
    name: 'data get',
    description: 'Read DNA path — data get <path>',
    sdkPath: 'platform.api.getProjectData',
    async run(rt, args) {
      const path = positional(args)[0];
      if (!path) throw new Error('usage: data get <path>');
      rt.print(await rt.sdk.platform.api.getProjectData(rt.requireProject(), { path }));
    },
  },
  {
    name: 'data patch',
    description: 'Patch DNA path — --mode merge|replace|delete --value JSON',
    sdkPath: 'platform.protocol.patchProjectData',
    usage: '<path> --mode merge|replace|delete --value JSON',
    examples: [
      `agentstack data patch config.feature --mode merge --value '{"on":true}'`,
    ],
    async run(rt, args) {
      const path = positional(args)[0];
      const mode = (parseFlagValue(args, 'mode') || 'merge') as
        | 'merge'
        | 'replace'
        | 'delete';
      if (!path) throw new Error('usage: data patch <path> --mode merge --value \'{…}\'');
      if (mode === 'replace' && (path === '' || path === 'data' || path === '.')) {
        throw new Error(
          'refusing full-blob replace of project data — use a nested path (dna_protein_data_plane)',
        );
      }
      const valueRaw = parseFlagValue(args, 'value');
      const value = valueRaw ? JSON.parse(valueRaw) : null;
      rt.print(
        await rt.sdk.platform.protocol.patchProjectData(
          rt.requireProject(),
          path,
          value,
          mode,
        ),
      );
    },
  },
];

export const keysCommands: CommandSpec[] = [
  {
    name: 'keys create',
    description: 'Mint PAT — --name --preset agent_runner|readonly_data|full_project|…',
    mcpAction: 'apikeys.create',
    async run(rt, args) {
      const name = parseFlagValue(args, 'name') || 'cli-key';
      const preset = parseFlagValue(args, 'preset') || 'agent_runner';
      const projectId = Number(parseFlagValue(args, 'project') || rt.requireProject());
      rt.print(
        await mcpAction(rt, 'apikeys.create', {
          name,
          preset,
          project_id: projectId,
        }),
      );
    },
  },
  {
    name: 'keys list',
    description: 'List API keys',
    mcpAction: 'apikeys.list',
    async run(rt) {
      rt.print(
        await mcpAction(rt, 'apikeys.list', {
          project_id: rt.requireProject(),
        }),
      );
    },
  },
  {
    name: 'keys revoke',
    description: 'Revoke key — --id',
    async run(rt, args) {
      const id = parseFlagValue(args, 'id') || positional(args)[0];
      if (!id) throw new Error('usage: keys revoke --id <key_id>');
      rt.print(
        await mcpAction(rt, 'apikeys.delete', {
          key_id: id,
          project_id: rt.requireProject(),
        }),
      );
    },
  },
];
