/**
 * Canonical relay / stream-relay constants shared between SDK, frontend,
 * and agent integrations.
 *
 * Genetic tag: frontend.sdk.relay.unified.gen1
 *
 * Philosophy (v0.4.5 — One SDK facade): these constants are the single source
 * of truth for topic names and envelope field types so frontend and agents do
 * not diverge with magic strings.
 */

// ─── User-mux topics ─────────────────────────────────────────────────────────

/** Canonical mux topic for cross-channel messenger inbox events. */
export const MESSENGER_INBOX_MUX_TOPIC = 'messenger.inbox' as const;

// ─── Envelope event types ────────────────────────────────────────────────────

/** Incremental message append (live subscriber hot path). */
export const RELAY_EVT_CHAT_APPEND = 'social.chat.append' as const;
/** Full message appended signal (may include body). */
export const RELAY_EVT_CHAT_MESSAGE_APPENDED = 'social.chat.message_appended' as const;
/** Message edited. */
export const RELAY_EVT_CHAT_MESSAGE_EDITED = 'social.chat.message_edited' as const;
/** Message deleted (tombstoned). */
export const RELAY_EVT_CHAT_MESSAGE_DELETED = 'social.chat.message_deleted' as const;
/** Pins changed — client should refetch history. */
export const RELAY_EVT_CHAT_PINS_CHANGED = 'social.chat.pins_changed' as const;
/** Read receipt from another participant. */
export const RELAY_EVT_CHAT_READ_RECEIPT = 'social.chat.read_receipt' as const;
/** Presence snapshot for channel (online user ids). */
export const RELAY_EVT_MESSENGER_PRESENCE = 'messenger.presence' as const;

// ─── Relay message types ──────────────────────────────────────────────────────

/** Server→client broadcast frame. */
export const RELAY_FRAME_BROADCAST = 'broadcast' as const;
/** Client→server ACK for reliable delivery. */
export const RELAY_FRAME_ACK = 'relay.ack' as const;
/** Server→client delivery confirmation. */
export const RELAY_FRAME_READ = 'relay.read' as const;
/** Client→server mux subscription. */
export const RELAY_FRAME_MUX_SUBSCRIBE = 'mux.subscribe' as const;
/** Client→server mux unsubscribe (topic retained until socket closes). */
export const RELAY_FRAME_MUX_UNSUBSCRIBE = 'mux.unsubscribe' as const;
/** Server→client mux subscription confirmed. */
export const RELAY_FRAME_MUX_SUBSCRIBED = 'mux.subscribed' as const;

/**
 * Server→client resume/replay envelope (instant-contour B2 / `core.social.chat.relay_resume.gen1`).
 *
 * Sent once immediately after the ``connected`` frame. Clients opt in by passing
 * ``last_seen_seq`` on the WS URL; the envelope carries:
 *
 *   - ``status``: ``'OK'`` (caught up), ``'REPLAY'`` (missed frames included), or ``'STALE'``
 *     (gap exceeded ring buffer — client must do one HTTP history GET).
 *   - ``frames``: ordered array of missed frames for REPLAY, empty otherwise.
 *   - ``replay_min_seq`` / ``replay_max_seq``: the server ring buffer window (diagnostic).
 *
 * @see [docs/adr/MESSENGER_WS_RESUME_PROTOCOL.md](../../../../docs/adr/MESSENGER_WS_RESUME_PROTOCOL.md)
 */
export const RELAY_FRAME_RESUME = 'resume' as const;

export const RELAY_RESUME_STATUS_OK = 'OK' as const;
export const RELAY_RESUME_STATUS_REPLAY = 'REPLAY' as const;
export const RELAY_RESUME_STATUS_STALE = 'STALE' as const;

export type RelayResumeStatus =
  | typeof RELAY_RESUME_STATUS_OK
  | typeof RELAY_RESUME_STATUS_REPLAY
  | typeof RELAY_RESUME_STATUS_STALE;

/** Shape of the ``resume`` envelope (see {@link RELAY_FRAME_RESUME}). */
export interface RelayResumeEnvelope {
  type: typeof RELAY_FRAME_RESUME;
  room_id: string;
  status: RelayResumeStatus;
  last_seen_seq: number | null;
  frames: unknown[];
  replay_min_seq: number | null;
  replay_max_seq: number | null;
}

// ─── Envelope schema version ──────────────────────────────────────────────────

/**
 * Current envelope schema version.  Clients MUST ignore envelopes with
 * unknown ``v`` values (forward compatibility).
 */
export const RELAY_ENVELOPE_VERSION = 1 as const;

// ─── Room-id helpers ──────────────────────────────────────────────────────────

/**
 * Canonical social chat relay room id.
 * Matches `chat_dna_store.social_chat_relay_room_id(hp, storage_key)`.
 */
export function socialChatRelayRoomId(homeProjectId: number, storageKey: string): string {
  return `social-${homeProjectId}-${storageKey}`;
}

/** User-mux room id. */
export function userMuxRoomId(userId: number): string {
  return `user-mux-${Math.trunc(userId)}`;
}

// ─── Type helpers ────────────────────────────────────────────────────────────

export type RelayEventType =
  | typeof RELAY_EVT_CHAT_APPEND
  | typeof RELAY_EVT_CHAT_MESSAGE_APPENDED
  | typeof RELAY_EVT_CHAT_MESSAGE_EDITED
  | typeof RELAY_EVT_CHAT_MESSAGE_DELETED
  | typeof RELAY_EVT_CHAT_PINS_CHANGED
  | typeof RELAY_EVT_CHAT_READ_RECEIPT
  | typeof RELAY_EVT_MESSENGER_PRESENCE;

export type RelayFrameType =
  | typeof RELAY_FRAME_BROADCAST
  | typeof RELAY_FRAME_ACK
  | typeof RELAY_FRAME_READ
  | typeof RELAY_FRAME_MUX_SUBSCRIBE
  | typeof RELAY_FRAME_MUX_UNSUBSCRIBE
  | typeof RELAY_FRAME_MUX_SUBSCRIBED
  | typeof RELAY_FRAME_RESUME;
