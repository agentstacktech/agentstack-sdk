/**
 * Hosted multiplayer ladder: quick_match → poll_events → ws_ticket (KISS, one helper).
 * Gene: core.games.quick_match.gen1 · sdk.commerce.hosted.gen1
 */
import type { HTTPClient } from '../client/http-client';
import { executeHostedMcpSteps } from '../commerce/hosted/executeHostedMcpSteps';

export type HostedQuickMatchParams = {
  script_id: string;
  mode?: string;
  bot_fill_after_ms?: number;
  idempotency_key: string;
};

export type HostedRoomsLadderResult = {
  matchId: string;
  roomId: string;
  seat?: number;
  status?: string;
  wsConnectUrl?: string;
  wsToken?: string;
  pollAfterTs: number;
};

function pickWsUrl(data: Record<string, unknown>): string | undefined {
  const full = data.ws_connect_url;
  if (typeof full === 'string' && full.startsWith('wss://')) return full;
  return undefined;
}

export async function executeHostedRoomsLadder(
  http: HTTPClient,
  projectId: number,
  qm: HostedQuickMatchParams,
  options?: {
    hostedApiBase?: string;
    waitStarted?: boolean;
    pollTimeoutMs?: number;
    mintWs?: boolean;
    signal?: AbortSignal;
  },
): Promise<HostedRoomsLadderResult> {
  const qmRow = await executeHostedMcpSteps(
    http,
    projectId,
    [
      {
        id: 'qm',
        action: 'rooms.quick_match',
        params: {
          project_id: projectId,
          script_id: qm.script_id,
          mode: qm.mode ?? '1v1',
          bot_fill_after_ms: qm.bot_fill_after_ms ?? 15000,
          idempotency_key: qm.idempotency_key,
        },
      },
    ],
    { pickStepId: 'qm', hostedApiBase: options?.hostedApiBase, signal: options?.signal },
  );
  const matchId = String(qmRow.match_id ?? '');
  const roomId = String(qmRow.room_id ?? qmRow.room_name ?? '');
  const seat = typeof qmRow.seat === 'number' ? qmRow.seat : undefined;
  let afterTs = 0;
  let lastStatus = typeof qmRow.status === 'string' ? qmRow.status : undefined;

  if (options?.waitStarted !== false && matchId) {
    const deadline = Date.now() + (options?.pollTimeoutMs ?? 30_000);
    while (Date.now() < deadline) {
      if (options?.signal?.aborted) break;
      const poll = await executeHostedMcpSteps(
        http,
        projectId,
        [
          {
            id: 'poll',
            action: 'rooms.poll_events',
            params: {
              project_id: projectId,
              match_id: matchId,
              after_ts: afterTs,
            },
          },
        ],
        {
          pickStepId: 'poll',
          hostedApiBase: options?.hostedApiBase,
          signal: options?.signal,
        },
      );
      const events = Array.isArray(poll.events) ? poll.events : [];
      if (events.length) {
        const last = events[events.length - 1] as { ts?: number };
        if (typeof last.ts === 'number') afterTs = last.ts;
      } else if (typeof poll.next_after_ts === 'number') {
        afterTs = poll.next_after_ts;
      }
      if (typeof poll.match_status === 'string') {
        lastStatus = poll.match_status;
      }
      const started = events.some((e) => {
        if (!e || typeof e !== 'object') return false;
        const row = e as { type?: string; kind?: string };
        const tag = String(row.kind ?? row.type ?? '');
        return tag === 'started';
      });
      if (started || lastStatus === 'started') break;
      const delay =
        typeof poll.suggested_poll_ms === 'number'
          ? poll.suggested_poll_ms
          : 600;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  let wsConnectUrl: string | undefined;
  let wsToken: string | undefined;
  if (options?.mintWs !== false && roomId) {
    const ticket = await executeHostedMcpSteps(
      http,
      projectId,
      [
        {
          id: 'wst',
          action: 'stream.relay.ws_ticket',
          params: {
            project_id: projectId,
            room_id: roomId,
            ttl_seconds: 60,
          },
        },
      ],
      {
        pickStepId: 'wst',
        hostedApiBase: options?.hostedApiBase,
        signal: options?.signal,
      },
    );
    wsConnectUrl = pickWsUrl(ticket);
    wsToken = typeof ticket.token === 'string' ? ticket.token : undefined;
  }

  return {
    matchId,
    roomId,
    seat,
    status: lastStatus,
    wsConnectUrl,
    wsToken,
    pollAfterTs: afterTs,
  };
}
