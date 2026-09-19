import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { CommandSpec } from './types.js';
import { parseFlagValue, positional } from './types.js';
import { mcpAction } from '../runtime/mcpAction.js';

function ragOpts(rt: { requireProject: () => number }) {
  return { homeProjectId: rt.requireProject() };
}

export const ragCommands: CommandSpec[] = [
  {
    name: 'rag collections',
    description: 'List RAG collections',
    sdkPath: 'rag.listCollections',
    async run(rt) {
      rt.print(await rt.sdk.rag.listCollections(ragOpts(rt)));
    },
  },
  {
    name: 'rag create-collection',
    description: 'Create collection — --name',
    sdkPath: 'rag.createCollection',
    async run(rt, args) {
      const name = parseFlagValue(args, 'name') || positional(args)[0];
      if (!name) throw new Error('usage: rag create-collection --name <name>');
      rt.print(
        await rt.sdk.rag.createCollection({
          name,
          home_project_id: rt.requireProject(),
        }),
      );
    },
  },
  {
    name: 'rag ingest',
    description: 'Ingest document — --collection --file',
    sdkPath: 'rag.ingestDocument',
    async run(rt, args) {
      const collectionId = parseFlagValue(args, 'collection');
      const filePath = parseFlagValue(args, 'file');
      if (!collectionId || !filePath) {
        throw new Error('usage: rag ingest --collection <id> --file <path>');
      }
      const content = await readFile(filePath, 'utf8');
      const source = basename(filePath);
      rt.print(
        await rt.sdk.rag.ingestDocument(
          collectionId,
          { content, source_doc_id: source, metadata: { title: source } },
          ragOpts(rt),
        ),
      );
    },
  },
  {
    name: 'rag search',
    description: 'Semantic search — --collection --q',
    sdkPath: 'rag.search',
    async run(rt, args) {
      const collectionId = parseFlagValue(args, 'collection');
      const q = parseFlagValue(args, 'q') || positional(args).join(' ');
      if (!collectionId || !q) {
        throw new Error('usage: rag search --collection <id> --q <query>');
      }
      rt.print(
        await rt.sdk.rag.search(collectionId, { query: q }, ragOpts(rt)),
      );
    },
  },
  {
    name: 'rag memory',
    description: 'memory add|search — --session --text|--q [--role]',
    async run(rt, args) {
      const op = positional(args)[0] || 'search';
      const sessionId = parseFlagValue(args, 'session');
      if (!sessionId) throw new Error('usage: rag memory <add|search> --session <id>');
      if (op === 'add') {
        const text = parseFlagValue(args, 'text');
        if (!text) throw new Error('--text required for add');
        rt.print(
          await rt.sdk.rag.memoryAdd(
            sessionId,
            { role: parseFlagValue(args, 'role') || 'user', content: text },
            ragOpts(rt),
          ),
        );
        return;
      }
      const q = parseFlagValue(args, 'q') || '';
      rt.print(
        await rt.sdk.rag.memorySearch(sessionId, { query: q }, ragOpts(rt)),
      );
    },
  },
];

export const agentsCommands: CommandSpec[] = [
  {
    name: 'agents list',
    description: 'List fleet agents',
    sdkPath: 'agentsFleet.list',
    async run(rt) {
      rt.print(await rt.sdk.agentsFleet.list(rt.requireProject()));
    },
  },
  {
    name: 'agents create-from-template',
    description: 'Create from template — --template [--name]',
    sdkPath: 'agentsFleet.createFromTemplate',
    async run(rt, args) {
      const template = parseFlagValue(args, 'template') || positional(args)[0];
      if (!template) throw new Error('usage: agents create-from-template --template <id>');
      rt.print(
        await rt.sdk.agentsFleet.createFromTemplate(rt.requireProject(), {
          template_id: template,
          name: parseFlagValue(args, 'name') || 'Agent',
        }),
      );
    },
  },
  {
    name: 'agents run',
    description: 'Start run — --id [--input JSON] [--idempotency-key]',
    sdkPath: 'agentsFleet.startRun',
    usage: '--id <agent_id> [--input JSON] [--idempotency-key K]',
    examples: [
      `agentstack agents run --id <uuid> --input '{"prompt":"hi"}' --idempotency-key run-1`,
    ],
    async run(rt, args) {
      const agentId = parseFlagValue(args, 'id') || positional(args)[0];
      if (!agentId) throw new Error('usage: agents run --id <agent_id>');
      const inputRaw = parseFlagValue(args, 'input');
      const input = inputRaw ? JSON.parse(inputRaw) : {};
      const idem = parseFlagValue(args, 'idempotency-key');
      const body = idem
        ? { input, idempotency_key: idem }
        : input;
      rt.print(
        await rt.sdk.agentsFleet.startRun(rt.requireProject(), agentId, body),
      );
    },
  },
  {
    name: 'agents runs',
    description: 'List runs — --agent',
    async run(rt, args) {
      const agentId = parseFlagValue(args, 'agent');
      if (!agentId) throw new Error('usage: agents runs --agent <agent_id>');
      rt.print(await rt.sdk.agentsFleet.listRuns(rt.requireProject(), agentId));
    },
  },
  {
    name: 'agents approve',
    description: 'Approve run — --agent --run',
    async run(rt, args) {
      const agentId = parseFlagValue(args, 'agent');
      const runId = parseFlagValue(args, 'run') || positional(args)[0];
      if (!agentId || !runId) {
        throw new Error('usage: agents approve --agent <id> --run <run_id>');
      }
      rt.print(
        await rt.sdk.agentsFleet.approveRun(rt.requireProject(), agentId, runId),
      );
    },
  },
  {
    name: 'agents get-run',
    description: 'Get run — --agent --run',
    async run(rt, args) {
      const agentId = parseFlagValue(args, 'agent');
      const runId = parseFlagValue(args, 'run') || positional(args)[0];
      if (!agentId || !runId) {
        throw new Error('usage: agents get-run --agent <id> --run <run_id>');
      }
      rt.print(
        await rt.sdk.agentsFleet.getRun(rt.requireProject(), agentId, runId),
      );
    },
  },
];

function envUuid(args: string[]): string {
  const v = parseFlagValue(args, 'env-uuid');
  if (!v) throw new Error('requires --env-uuid <uuid>');
  return v;
}

/** DRY MCP runner for generation.* (project_id + optional env_uuid). */
function genMcp(action: string, needsEnvUuid = false): CommandSpec['run'] {
  return async (rt, args) => {
    const params: Record<string, unknown> = { project_id: rt.requireProject() };
    if (needsEnvUuid) params.env_uuid = envUuid(args);
    rt.print(await mcpAction(rt, action, params));
  };
}

function genPromoteMcp(): CommandSpec['run'] {
  return async (rt, args) => {
    const params: Record<string, unknown> = {
      project_id: rt.requireProject(),
      env_uuid: envUuid(args),
    };
    const strategy = parseFlagValue(args, 'strategy');
    const rolloutMode = parseFlagValue(args, 'rollout-mode');
    if (strategy) params.strategy = strategy;
    if (rolloutMode) params.rollout_mode = rolloutMode;
    if (parseFlagValue(args, 'require-gates-passed') !== undefined) {
      params.require_gates_passed = true;
    }
    rt.print(await mcpAction(rt, 'generation.promote', params));
  };
}

function genSettingsPatchMcp(): CommandSpec['run'] {
  return async (rt, args) => {
    const params: Record<string, unknown> = { project_id: rt.requireProject() };
    if (parseFlagValue(args, 'auto-generation-mode') === 'true') {
      params.auto_generation_mode = true;
    }
    if (parseFlagValue(args, 'auto-generation-mode') === 'false') {
      params.auto_generation_mode = false;
    }
    const strategy = parseFlagValue(args, 'auto-promote-strategy');
    if (strategy) params.auto_promote_strategy = strategy;
    if (parseFlagValue(args, 'auto-checkpoint-before-promote') === 'true') {
      params.auto_checkpoint_before_promote = true;
    }
    if (parseFlagValue(args, 'require-gates-on-promote') === 'true') {
      params.require_gates_passed_on_promote = true;
    }
    rt.print(await mcpAction(rt, 'generation.settings.patch', params));
  };
}

export const generationCommands: CommandSpec[] = [
  {
    name: 'generation fork',
    description: 'Fork sandbox for project',
    mcpAction: 'generation.fork',
    run: genMcp('generation.fork'),
  },
  {
    name: 'generation diff',
    description: 'Diff vs prod — --env-uuid',
    mcpAction: 'generation.diff_vs_prod',
    run: genMcp('generation.diff_vs_prod', true),
  },
  {
    name: 'generation gates',
    description: 'Run gates — --env-uuid',
    mcpAction: 'generation.gates',
    usage: '--env-uuid <uuid>',
    examples: ['agentstack generation gates --env-uuid <uuid>'],
    run: genMcp('generation.gates', true),
  },
  {
    name: 'generation promote',
    description: 'Promote sandbox — --env-uuid [--rollout-mode test] [--require-gates-passed]',
    mcpAction: 'generation.promote',
    usage: '--env-uuid <uuid> [--strategy immediate|canary|blue_green] [--rollout-mode standard|test]',
    examples: [
      'agentstack generation promote --env-uuid <uuid> --require-gates-passed',
      'agentstack generation promote --env-uuid <uuid> --rollout-mode test',
    ],
    run: genPromoteMcp(),
  },
  {
    name: 'generation settings patch',
    description: 'Patch auto_generation settings — --auto-generation-mode true|false',
    mcpAction: 'generation.settings.patch',
    usage: '[--auto-generation-mode true|false] [--auto-promote-strategy immediate|canary|blue_green]',
    run: genSettingsPatchMcp(),
  },
  {
    name: 'generation notify',
    description: 'Manual generation notify — --env-uuid [--message]',
    mcpAction: 'generation.notify',
    usage: '--env-uuid <uuid> [--message <text>]',
    run: async (rt, args) => {
      const params: Record<string, unknown> = {
        project_id: rt.requireProject(),
        env_uuid: envUuid(args),
      };
      const message = parseFlagValue(args, 'message');
      if (message) params.message = message;
      rt.print(await mcpAction(rt, 'generation.notify', params));
    },
  },
];
