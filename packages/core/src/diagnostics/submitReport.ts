import type { AgentStackSDK } from '../sdk';

export type ReportPrefill = {
  summary: string;
  severity: 's0' | 's1' | 's2' | 's3';
  category: string;
  detail?: string;
  project_id?: number;
  context?: Record<string, unknown>;
  links?: Record<string, unknown>;
  idempotency_key?: string;
};

export async function submitReport(
  client: AgentStackSDK,
  prefill: ReportPrefill,
): Promise<{ report_id: string; status: string }> {
  if (!client.mcp) {
    throw new Error('submitReport requires sdk.mcp');
  }
  const projectId = prefill.project_id ?? client.getProjectId() ?? 1;
  const batch = await client.mcp.execute(
    [{ action: 'diagnostics.report', params: { ...prefill } }],
    {
      projectId: Number(projectId),
      stopOnError: true,
      idempotencyKey: prefill.idempotency_key,
    },
  );
  const step = batch.results?.[0];
  const payload =
    step?.result && typeof step.result === 'object'
      ? (step.result as Record<string, unknown>)
      : {};
  const data =
    payload.data && typeof payload.data === 'object'
      ? (payload.data as Record<string, unknown>)
      : payload;
  return {
    report_id: String(data.report_id ?? ''),
    status: String(data.status ?? 'open'),
  };
}