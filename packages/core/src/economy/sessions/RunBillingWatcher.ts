import type { AgentsFleet } from '../../modules/AgentsFleet';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function watchRunUntilTerminal(
  fleet: AgentsFleet,
  projectId: number,
  agentId: string,
  runUuid: string,
  opts?: { intervalMs?: number; timeoutMs?: number },
): Promise<{ status: string; output?: Record<string, unknown> }> {
  const intervalMs = opts?.intervalMs ?? 1500;
  const timeoutMs = opts?.timeoutMs ?? 300_000;
  const deadline = Date.now() + timeoutMs;
  const terminal = new Set(['completed', 'failed', 'cancelled', 'killed']);

  while (Date.now() < deadline) {
    const { runs } = await fleet.listRuns(projectId, agentId, { with_agc_purchase: true });
    const list = Array.isArray(runs) ? runs : [];
    const row = list.find(
      (r) =>
        r &&
        typeof r === 'object' &&
        String((r as { run_uuid?: string }).run_uuid) === runUuid,
    ) as { status?: string; output?: Record<string, unknown> } | undefined;
    if (row?.status && terminal.has(String(row.status).toLowerCase())) {
      return { status: String(row.status), output: row.output };
    }
    await sleep(intervalMs);
  }
  throw new Error(`Run ${runUuid} poll timeout`);
}

export function extractRunReceipt(
  output: Record<string, unknown> | undefined,
): { receipt?: Record<string, unknown>; receipt_hash?: string } | null {
  if (!output || typeof output !== 'object') {
    return null;
  }
  const receipt = output.receipt;
  const receipt_hash = output.receipt_hash;
  if (receipt && typeof receipt === 'object') {
    return {
      receipt: receipt as Record<string, unknown>,
      receipt_hash: typeof receipt_hash === 'string' ? receipt_hash : undefined,
    };
  }
  return null;
}
