/** W5-T01 — server wraps board frames as relay_envelope v1 (body = game payload). */
export type RelayEnvelopeV1 = {
  relay_envelope: 'v1';
  sender_connection_id?: string;
  sender_user_id?: number;
  seq?: number;
  ts?: number;
  body: Record<string, unknown>;
};

export function unwrapRelayBroadcastPayload(
  message: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!message || typeof message !== 'object') {
    return {};
  }
  const env = message as Partial<RelayEnvelopeV1>;
  if (env.relay_envelope === 'v1' && env.body && typeof env.body === 'object') {
    return env.body as Record<string, unknown>;
  }
  const payload = message.payload;
  if (payload && typeof payload === 'object') {
    const inner = payload as Partial<RelayEnvelopeV1>;
    if (inner.relay_envelope === 'v1' && inner.body && typeof inner.body === 'object') {
      return inner.body as Record<string, unknown>;
    }
    return payload as Record<string, unknown>;
  }
  return message;
}