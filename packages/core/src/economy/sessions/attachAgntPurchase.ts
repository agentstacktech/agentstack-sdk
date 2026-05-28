/** Mirror `AgentEconomyPort.attach_agc_purchase_to_run_input` (Python). */
export function attachAgntPurchaseToInput(
  input: Record<string, unknown>,
  purchase: Record<string, unknown>,
  traceId?: string,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...input };
  const rec =
    purchase.receipt && typeof purchase.receipt === 'object'
      ? (purchase.receipt as Record<string, unknown>)
      : {};
  const q = rec.quote && typeof rec.quote === 'object' ? (rec.quote as Record<string, unknown>) : {};
  let tid = (traceId ?? '').trim();
  if (!tid && typeof rec.trace_id === 'string') {
    tid = rec.trace_id.trim();
  }
  merged.__agnt_purchase__ = {
    batch_id: purchase.batch_id,
    status: purchase.status,
    ledger: purchase.ledger,
    receipt: purchase.receipt,
    trace_id: tid || null,
    quote_id: q.quote_id,
    quote_hash: q.quote_hash,
  };
  return merged;
}
