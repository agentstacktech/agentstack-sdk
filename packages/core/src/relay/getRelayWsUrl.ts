/**
 * Mint a short-lived JWT for stream-relay WebSocket URLs (WS-01).
 *
 * Do not pass API keys in `?token=` — use this helper after Bearer auth.
 */

import type { HTTPClient } from '../client/http-client';

export type RelayWsTicketResponse = {
  ok: boolean;
  token: string;
  room_id: string;
  project_id: number;
  expires_in_seconds: number;
};

export type GetRelayWsUrlOptions = {
  roomId: string;
  projectId: number;
  ttlSeconds?: number;
  /** Override WS origin (defaults to API base with http→ws). */
  wsBaseUrl?: string;
};

function apiBaseToWs(base: string): string {
  const trimmed = base.replace(/\/$/, '');
  if (trimmed.startsWith('https://')) return `wss://${trimmed.slice('https://'.length)}`;
  if (trimmed.startsWith('http://')) return `ws://${trimmed.slice('http://'.length)}`;
  return trimmed;
}

/**
 * POST /api/stream-relay/ws-ticket then build `wss://…/api/stream-relay/ws/rooms/{id}?token=…`.
 */
export async function getRelayWsUrl(
  http: HTTPClient,
  options: GetRelayWsUrlOptions,
): Promise<{ url: string; ticket: RelayWsTicketResponse }> {
  const body = {
    room_id: options.roomId,
    project_id: options.projectId,
    ...(options.ttlSeconds != null ? { ttl_seconds: options.ttlSeconds } : {}),
  };
  const res = await http.post<RelayWsTicketResponse>('/stream-relay/ws-ticket', body);
  const ticket =
    (res as { data?: RelayWsTicketResponse }).data ?? (res as unknown as RelayWsTicketResponse);
  const wsRoot = options.wsBaseUrl ?? apiBaseToWs(http.getApiOrigin());
  const url = `${wsRoot}/api/stream-relay/ws/rooms/${encodeURIComponent(
    options.roomId,
  )}?token=${encodeURIComponent(ticket.token)}`;
  return { url, ticket };
}
