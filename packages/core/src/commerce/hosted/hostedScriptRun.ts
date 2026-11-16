/**
 * Single hosted player wire for `script.run` over `POST /s/{pid}/mcp` (SDK HTTPClient path).
 * Gene: sdk.commerce.hosted.gen1 — pairs with netplay `hostedMcpRunner` (raw fetch) via shared retry codes.
 */
import type { HTTPClient } from '../../client/http-client';
import {
  executeHostedMcpStepsWithRetry,
  type ExecuteHostedMcpStepsRetryOptions,
  type HostedMcpStepSpec,
} from './executeHostedMcpSteps';
import { hostedRunPhase, type HostedRunPhase } from './hostedMcpPlayerError';

export type HostedScriptRunParams = {
  scriptId: string;
  exportName: string;
  input?: Record<string, unknown>;
  version?: string;
};

export type CreateHostedWireOptions = Omit<
  ExecuteHostedMcpStepsRetryOptions,
  'pickStepId'
> & {
  /** Default step id for single script.run (default `run`). */
  stepId?: string;
};

export type HostedWire = {
  runScript(
    params: HostedScriptRunParams,
    options?: Pick<ExecuteHostedMcpStepsRetryOptions, 'signal'>,
  ): Promise<Record<string, unknown>>;
  runScriptPhase(
    params: HostedScriptRunParams,
    options?: Pick<ExecuteHostedMcpStepsRetryOptions, 'signal'>,
  ): Promise<{ row: Record<string, unknown>; phase: HostedRunPhase }>;
};

export function createHostedWire(
  http: HTTPClient,
  projectId: number,
  options: CreateHostedWireOptions = {},
): HostedWire {
  const stepId = options.stepId ?? 'run';

  const step = (params: HostedScriptRunParams): HostedMcpStepSpec => ({
    id: stepId,
    action: 'script.run',
    params: {
      project_id: projectId,
      script_id: params.scriptId,
      export: params.exportName,
      input: params.input ?? {},
      version: params.version ?? 'live',
    },
  });

  async function runScript(
    params: HostedScriptRunParams,
    callOpts?: Pick<ExecuteHostedMcpStepsRetryOptions, 'signal'>,
  ): Promise<Record<string, unknown>> {
    const row = await executeHostedMcpStepsWithRetry(
      http,
      projectId,
      [step(params)],
      {
        ...options,
        pickStepId: stepId,
        signal: callOpts?.signal ?? options.signal,
      },
    );
    return row;
  }

  return {
    runScript,
    async runScriptPhase(params, callOpts) {
      const row = await runScript(params, callOpts);
      return { row, phase: hostedRunPhase(row) };
    },
  };
}