/**
 * Client prefixes for AgentSocial / chat REST (`/api/social/*`).
 * Use with TanStack Query: queryKey: ['social-chat', homeProjectId, channelId]
 */

export const SOCIAL_QUERY_PREFIXES = {
  friends: ['social', 'friends'] as const,
  friendUserIds: ['social', 'friend-user-ids'] as const,
  friendCards: ['social', 'friend-cards'] as const,
  /** GET /api/social/settings/privacy */
  privacy: ['social', 'privacy'] as const,
  /** GET /api/social/friends/requests/in|out */
  friendRequestsIn: ['social', 'friend-requests', 'in'] as const,
  friendRequestsOut: ['social', 'friend-requests', 'out'] as const,
  chatHistory: (homeProjectId: number, channelId: string) =>
    ['social-chat', 'history', homeProjectId, channelId] as const,
  chatIndex: ['social', 'chat-index'] as const,
  federation: (consumerProjectId: number) =>
    ['social', 'federation', consumerProjectId] as const,
  channels: (homeProjectId: number) => ['social', 'channels', homeProjectId] as const,
  /** GET/PUT /api/social/messenger/prefs */
  messengerPrefs: ['messenger', 'prefs'] as const,
  /** GET /api/social/chat/read-map */
  chatReadMap: ['messenger', 'chat-read-map'] as const,
} as const;

export type SocialPointer = {
  kind?: string;
  home_project_id: number;
  channel_id: string;
};
