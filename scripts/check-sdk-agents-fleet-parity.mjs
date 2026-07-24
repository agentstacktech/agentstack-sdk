#!/usr/bin/env node
/**
 * Smoke check: agents fleet SDK paths mirror core MCP surface.
 * genetic: core.agents.fleet.gen1
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const core = join(root, 'packages/core');
const toolsAgents = join(root, '../agentstack-core/mcp/tools_agents.py');

if (!existsSync(toolsAgents)) {
  console.error('missing tools_agents.py');
  process.exit(1);
}

const toolsSrc = readFileSync(toolsAgents, 'utf8');
const fleetModule = join(core, 'src/modules/AgentsFleet.ts');
if (!existsSync(fleetModule)) {
  console.error('missing AgentsFleet.ts');
  process.exit(1);
}
const fleetSrc = readFileSync(fleetModule, 'utf8');

for (const sym of ['async list(', 'async get(', 'async create(', 'async startRun(']) {
  if (!fleetSrc.includes(sym)) {
    console.error('AgentsFleet missing:', sym);
    process.exit(1);
  }
}

for (const action of ['agents.list', 'agents.get', 'agents.run', 'agents.create']) {
  if (!toolsSrc.includes(action)) {
    console.error('tools_agents missing action:', action);
    process.exit(1);
  }
}

console.log('check-sdk-agents-fleet-parity OK');
