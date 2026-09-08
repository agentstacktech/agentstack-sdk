/**
 * Live smoke — fail-closed when AGENTSTACK_LIVE=1.
 * Without env: skipped (not failed).
 * Genetic tag: repo.tooling.user_cli.gen1
 */
import { describe, expect, it } from 'vitest';
import { createRuntime } from '../runtime/createRuntime.js';
import { DOCTOR_SCHEMA, doctorCommand } from '../commands/doctor.js';

const live = process.env.AGENTSTACK_LIVE === '1';

describe.skipIf(!live)('cli live smoke', () => {
  it('doctor → discover caps → projects list → data get → discovery.list', async () => {
    expect(process.env.AGENTSTACK_API_KEY).toBeTruthy();
    expect(process.env.AGENTSTACK_PROJECT_ID).toBeTruthy();

    const rt = await createRuntime({ json: true });
    expect(rt.apiKey).toBeTruthy();
    expect(rt.projectId).toBeTruthy();

    const printed: unknown[] = [];
    const doctorRt = {
      ...rt,
      print: (data: unknown) => {
        printed.push(data);
      },
    };
    await doctorCommand.run(doctorRt, []);
    const doctorReport = printed[0] as { schema?: string; ok?: boolean };
    expect(doctorReport.schema).toBe(DOCTOR_SCHEMA);
    expect(doctorReport.ok).toBe(true);

    const caps = await rt.sdk.mcp.getDiscovery({ projectId: rt.projectId! });
    expect(caps).toBeTruthy();

    const projects = await rt.sdk.platform.api.getProjects();
    expect(projects).toBeTruthy();

    const data = await rt.sdk.platform.api.getProjectData(rt.projectId!, { path: 'config' });
    expect(data).toBeTruthy();

    const discovery = await rt.mcp([{ action: 'discovery.list', params: {} }]);
    expect(discovery.ok).toBe(true);

    const who = await rt.sdk.platform.auth.getProfile();
    expect(who).toBeTruthy();
  }, 120_000);
});
