/**
 * Matchmaking = "which room should I join?". Waiting happens in the room lobby itself
 * (players appear as `hello` entries), so a matchmaker only hands out room ids.
 */
export interface MatchTicket {
  room: string;
  /** Seats already taken when the ticket was issued (UI hint only; the room log is the truth). */
  seatsTaken?: number;
}

/** Server side of quick match. The generated StackScript implements this as `<id>.lobby.find`. */
export interface QueueApi {
  find(game: string, seats: number, user?: string): Promise<MatchTicket>;
}

export interface Matchmaker {
  /** Quick match: an open room of this game with a free seat, or a new one. */
  quickMatch(game: string, seats: number): Promise<MatchTicket>;
  /** Private room: share the code, friends join with `createSession({ room: code })`. */
  privateRoom(game: string): MatchTicket;
}

function code(): string {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)];
  return s;
}

export function createMatchmaker(api: QueueApi): Matchmaker {
  return {
    quickMatch: (game, seats) => api.find(game, seats),
    privateRoom: (game) => ({ room: `${game}-p-${code()}` }),
  };
}

/** In-memory queue for tests: fills rooms in order (`<game>-q1`, `<game>-q2`, …). */
export function memoryMatchmaker(): Matchmaker & { readonly api: QueueApi } {
  const open = new Map<string, { room: string; taken: number; users: Set<string> }>();
  let n = 0;
  const api: QueueApi = {
    async find(game, seats, user) {
      let cur = open.get(game);
      if (cur && user && cur.users.has(user)) return { room: cur.room, seatsTaken: cur.taken };
      if (!cur || cur.taken >= seats) { cur = { room: `${game}-q${++n}`, taken: 0, users: new Set() }; open.set(game, cur); }
      cur.taken += 1;
      if (user) cur.users.add(user);
      return { room: cur.room, seatsTaken: cur.taken };
    },
  };
  return { ...createMatchmaker(api), api };
}
