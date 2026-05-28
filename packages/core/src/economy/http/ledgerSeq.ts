/** Parse tail ledger sequence from AgentNet response headers. */
export function readLedgerSeq(headers: Record<string, string>): number | undefined {
  const raw =
    headers['X-AgentNet-Ledger-Seq'] ??
    headers['x-agentnet-ledger-seq'] ??
    headers['x-agentcoin-ledger-seq'] ??
    headers['X-AGENTCOIN-LEDGER-SEQ'];
  if (raw == null || raw === '') {
    return undefined;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}
