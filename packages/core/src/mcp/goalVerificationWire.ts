/**
 * Goal verification wire shape — shared by execute envelope readers (DRY).
 * Genetic tag: core.mcp.inverse_orchestrator.gen1
 */

export type GoalVerificationWire = {
  verified?: boolean;
  pending?: string[];
  satisfied?: string[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x)).filter((x) => x.length > 0);
}

/** Canonical wire normalizer (no legacy key aliases). */
export function normalizeGoalVerificationWire(gv: unknown): GoalVerificationWire | null {
  const row = asRecord(gv);
  if (!row) return null;
  const pending = stringList(row.pending);
  const satisfied = stringList(row.satisfied);
  const verified = row.verified === true;
  if (!verified && pending.length === 0 && satisfied.length === 0) {
    return null;
  }
  return { verified, pending, satisfied };
}

function layerFromBody(body: Record<string, unknown>, key: string): GoalVerificationWire | null {
  const raw = body[key];
  return normalizeGoalVerificationWire(raw);
}

/** Read release-criteria lane from execute / JSON-RPC envelope layers. */
export function goalVerificationFromEnvelope(
  body: Record<string, unknown>,
): GoalVerificationWire | null {
  const top = layerFromBody(body, 'goal_verification');
  if (top) return top;
  const wc = asRecord(body.workflow_completion);
  if (wc) {
    const wcGv = normalizeGoalVerificationWire(wc.goal_verification);
    if (wcGv) return wcGv;
  }
  const ip = asRecord(body.instruction_packet);
  if (ip) {
    const ipGv = normalizeGoalVerificationWire(ip.goal_verification);
    if (ipGv) return ipGv;
  }
  const obs = asRecord(body.observed);
  if (obs) {
    const obsGv = normalizeGoalVerificationWire(obs.goal_verification);
    if (obsGv) return obsGv;
  }
  return null;
}
