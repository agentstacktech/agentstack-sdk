import type { CommandSpec } from './types.js';
import { EXIT, isCapsFailure } from '../runtime/errors.js';

/** Stable JSON schema id for `agentstack doctor --json` consumers. */
export const DOCTOR_SCHEMA = 'agentstack.cli.doctor.v1';

export const doctorCommand: CommandSpec = {
  name: 'doctor',
  description: 'Health check — blockers + next_steps (JSON-friendly)',
  async run(rt) {
    const blockers: string[] = [];
    const next_steps: string[] = [];

    if (!rt.apiKey) {
      blockers.push('no_api_key');
      next_steps.push('agentstack auth login');
      next_steps.push('or set AGENTSTACK_API_KEY');
    }
    if (rt.projectId == null) {
      blockers.push('no_project_id');
      next_steps.push('agentstack auth use-project <id>');
      next_steps.push('or set AGENTSTACK_PROJECT_ID');
    }

    let connectivity: 'ok' | 'skipped' | 'fail' = 'skipped';
    let capsHint: unknown = null;
    if (rt.apiKey && rt.projectId != null) {
      try {
        const out = await rt.mcp([{ action: 'discovery.list', params: {} }]);
        connectivity = out.ok ? 'ok' : 'fail';
        if (!out.ok) {
          const err = String(out.error || '');
          blockers.push(`mcp_${err || 'error'}`);
          if (isCapsFailure(err)) {
            blockers.push('service_caps');
            next_steps.push(
              're-login with Device Code (full scopes) or mint PAT with preset',
            );
          }
          next_steps.push('agentstack doctor --json --trace');
        } else {
          capsHint = { discovery: 'ok' };
          next_steps.push('agentstack discover caps');
        }
        if (!out.ok) capsHint = out.error;
        if (rt.trace && !out.ok) {
          process.stderr.write(`[trace] ${JSON.stringify(out.raw)?.slice(0, 800)}\n`);
        }
      } catch (err) {
        connectivity = 'fail';
        blockers.push(err instanceof Error ? err.message : String(err));
      }
    }

    const report = {
      schema: DOCTOR_SCHEMA,
      ok: blockers.length === 0,
      gene: 'repo.tooling.user_cli.gen1',
      apiBase: rt.apiBase,
      mcpUrl: rt.mcpUrl,
      projectId: rt.projectId ?? null,
      hasToken: Boolean(rt.apiKey),
      connectivity,
      capsHint,
      blockers,
      next_steps,
    };
    rt.print(report);
    if (blockers.length) {
      if (blockers.includes('no_api_key')) process.exitCode = EXIT.AUTH;
      else if (blockers.includes('service_caps')) process.exitCode = EXIT.CAPS;
      else process.exitCode = EXIT.API;
    }
  },
};
