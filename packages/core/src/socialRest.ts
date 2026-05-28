/**
 * Thin REST helpers for `/api/social` (friend requests, privacy).
 * Pass `sdk.httpClient` from the browser or Node.
 */

const BASE = '/api/social';

export type FriendRequestSourcePayload = {
  kind:
    | 'public_channel'
    | 'profile'
    | 'dm'
    | 'search'
    | 'game'
    | 'other';
  home_project_id?: number;
  channel_id?: string | null;
  channel_title_snapshot?: string | null;
  context_user_id?: number | null;
};

export type SocialPrivacyPayload = {
  incoming_friend_requests?: { mode: 'accept_all' | 'reject_all' | 'subscribers_only' };
  dm_policy?: {
    default_mode: 'everyone' | 'friends_only' | 'whitelist' | 'nobody';
    whitelist_user_ids?: number[];
  };
};

type HttpLike = {
  get<T = unknown>(path: string, params?: unknown, opts?: unknown): Promise<{ data: T }>;
  post<T = unknown>(path: string, body?: unknown, opts?: unknown): Promise<{ data: T }>;
  put<T = unknown>(path: string, body?: unknown, opts?: unknown): Promise<{ data: T }>;
};

export async function socialGetPrivacy(client: HttpLike) {
  const r = await client.get<SocialPrivacyPayload>(`${BASE}/settings/privacy`);
  return r.data;
}

export async function socialPutPrivacy(client: HttpLike, body: SocialPrivacyPayload) {
  const r = await client.put<SocialPrivacyPayload>(`${BASE}/settings/privacy`, body);
  return r.data;
}

export async function socialGetFriendRequestsIn(
  client: HttpLike,
  expandCards?: boolean
) {
  const r = await client.get<{ requests: unknown[]; cards?: unknown[] }>(
    `${BASE}/friends/requests/in`,
    expandCards ? { expand: 'cards' } : undefined
  );
  return r.data;
}

export async function socialGetFriendRequestsOut(
  client: HttpLike,
  expandCards?: boolean
) {
  const r = await client.get<{ requests: unknown[]; cards?: unknown[] }>(
    `${BASE}/friends/requests/out`,
    expandCards ? { expand: 'cards' } : undefined
  );
  return r.data;
}

/**
 * Send friend request. On the API, `source` may be omitted (server defaults to `other`);
 * for new integrations always pass an explicit `source`.
 */
export async function socialSendFriendRequest(
  client: HttpLike,
  toUserId: number,
  source?: FriendRequestSourcePayload
) {
  const body: Record<string, unknown> = { to_user_id: toUserId };
  if (source !== undefined) {
    body.source = source;
  }
  const r = await client.post<{ success: boolean; result?: string }>(
    `${BASE}/friends/request`,
    body
  );
  return r.data;
}

export async function socialRespondFriendRequest(
  client: HttpLike,
  body: {
    from_user_id: number;
    request_id?: string | null;
    action: 'accept' | 'reject' | 'subscriber' | 'block';
  }
) {
  const r = await client.post<{ success: boolean }>(
    `${BASE}/friends/request/respond`,
    body
  );
  return r.data;
}
