import { describe, expect, it } from 'vitest';
import { unwrapRelayBroadcastPayload } from './relayEnvelope';

describe('unwrapRelayBroadcastPayload', () => {
  it('unwraps relay_envelope v1 body', () => {
    const msg = {
      relay_envelope: 'v1' as const,
      body: { board: { turn: 1 } },
    };
    expect(unwrapRelayBroadcastPayload(msg)).toEqual({ board: { turn: 1 } });
  });

  it('unwraps nested payload relay_envelope', () => {
    const msg = {
      type: 'broadcast',
      payload: {
        relay_envelope: 'v1' as const,
        body: { score: 2 },
      },
    };
    expect(unwrapRelayBroadcastPayload(msg)).toEqual({ score: 2 });
  });
});