import type { AgentProtocolClient } from '../protocol/AgentProtocol';

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
  client: AgentProtocolClient,
  prefill: ReportPrefill,
): Promise<{ report_id: string; status: string }> {
  const res = await client.mcp.execute({
    actions: [{ action: 'diagnostics.report', params: { ...prefill } }],
  });
  const step = res?.data?.steps?.[0] ?? res?.steps?.[0];
  const data = (step?.data ?? step) as Record<string, unknown>;
  return {
    report_id: String(data.report_id ?? ''),
    status: String(data.status ?? 'open'),
  };
}