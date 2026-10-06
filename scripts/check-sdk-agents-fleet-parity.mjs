#!/usr/bin/env node
/**
 * Smoke check: agents fleet SDK paths mirror core MCP surface.
 * genetic: core.agents.fleet.gen1
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { findMonorepoFile } from './monorepo-layout.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const core = join(root, 'packages/core');
const toolsAgents = findMonorepoFile(root, 'agentstack-core', 'mcp', 'tools_agents.py');

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

if (!toolsAgents) {
  console.log('check:agents-fleet-parity: skip tools_agents.py (standalone SDK repo)');
} else {
  const toolsSrc = readFileSync(toolsAgents, 'utf8');
  for (const action of ['agents.list', 'agents.get', 'agents.run', 'agents.create']) {
    if (!toolsSrc.includes(action)) {
      console.error('tools_agents missing action:', action);
      process.exit(1);
    }
  }
}

console.log('check-sdk-agents-fleet-parity OK');
