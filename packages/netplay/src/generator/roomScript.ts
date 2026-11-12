/**
 * Generator for the server half: a StackScript that stores the room log in DNA, stamps server
 * identity/time, enforces private entries, body size, rate limits and room size, and runs the
 * quick-match queue. The client sessions fold the log; the script never needs the game rules,
 * so it does not depend on room ticks (onTick) and fits today's VM limits.
 *
 * Output follows the `defineCommand` + `ctx.dna.get/cas/put` contract (ts-backend-design §9.2,
 * same as the THERMOMORPHS server port). The text has no "/" characters and no decimal literals
 * outside the import line (StackScript lint SS2101 / SS1301) and no comments.
 */
import type { Game } from '../define.js';

export interface RoomScriptOptions {
  /** Export prefix and DNA namespace. Default: game id. */
  prefix?: string;
  /** Max serialized body length (chars). Default 4000. */
  maxBody?: number;
  /** Max entries appended per user per room per 10 s window (a batched append counts each entry). Default 120. */
  ratePer10s?: number;
  /** Max distinct users (players + spectators) per room. Default seats.max + 8. */
  maxUsers?: number;
  /** Entries per DNA chunk. Default 64. */
  chunk?: number;
  /** Max entries returned per poll. Default 256. */
  pollLimit?: number;
  /** A quick-match room with no join for this long is abandoned (ms). Default 120000. */
  lobbyTtlMs?: number;
}

const ID = /^[a-z0-9][a-z0-9-]*$/;

/** Generate the room script source for a game (or a bare `{ id, seats }`). */
export function generateRoomScript(game: Pick<Game<unknown, unknown>, 'id' | 'seats' | 'version'>, o: RoomScriptOptions = {}): string {
  const prefix = o.prefix ?? game.id;
  if (!ID.test(prefix)) throw new Error('generateRoomScript: prefix must be [a-z0-9-]');
  const ns = prefix.replace(/-/g, '_');
  const n = (v: number, name: string): number => {
    if (!Number.isInteger(v) || v <= 0) throw new Error(`generateRoomScript: ${name} must be a positive integer`);
    return v;
  };
  const C = {
    MAXB: n(o.maxBody ?? 4000, 'maxBody'),
    RATE: n(o.ratePer10s ?? 120, 'ratePer10s'),
    MAXU: n(o.maxUsers ?? game.seats.max + 8, 'maxUsers'),
    CHUNK: n(o.chunk ?? 64, 'chunk'),
    LIMIT: n(o.pollLimit ?? 256, 'pollLimit'),
    TTL: n(o.lobbyTtlMs ?? 120000, 'lobbyTtlMs'),
    SMIN: game.seats.min,
    SMAX: game.seats.max,
  };
  return `import { defineCommand, err, idiv } from "@stack/std";

const META = { gene: "sdk.netplay.room.gen1", game: "${game.id}", version: ${game.version}, prefix: "${prefix}" };
export const NP_META = META;
const E_ROOM = "np_${ns}_room";
const E_LOG = "np_${ns}_log";
const E_RATE = "np_${ns}_rate";
const E_LOBBY = "np_${ns}_lobby";
const MAXB = ${C.MAXB};
const RATE = ${C.RATE};
const MAXU = ${C.MAXU};
const CHUNK = ${C.CHUNK};
const LIMIT = ${C.LIMIT};
const TTL = ${C.TTL};
const SMIN = ${C.SMIN};
const SMAX = ${C.SMAX};
const WINDOW = 10000;
const MAXI = 16;

function uid(ctx) {
  const u = ctx.caller.userId;
  if (u === null || u === "") { throw err("AUTH", "sign in to play online"); }
  return String(u);
}
function roomId(raw) {
  const r = String(raw);
  if (r.length < 1 || r.length > 64) { throw err("BAD_ROOM", "room id length"); }
  for (let i = 0; i < r.length; i++) {
    const c = r.charCodeAt(i);
    const ok = (c >= 48 && c <= 57) || (c >= 97 && c <= 122) || c === 45 || c === 95;
    if (!ok) { throw err("BAD_ROOM", "room id chars"); }
  }
  return r;
}
function chunkId(room, seq) { return room + "#" + String(idiv(seq - 1, CHUNK)); }
function appendItems(raw) {
  const out = [];
  const list = raw.items;
  if (list === undefined || list === null) {
    out.push({ body: String(raw.body), to: raw.to ? String(raw.to) : "" });
    return out;
  }
  const n = Number(list.length) || 0;
  if (n < 1 || n > MAXI) { throw err("BAD_BODY", "1 to " + String(MAXI) + " entries per append"); }
  for (let k = 0; k < n; k++) {
    const x = list[k];
    if (x === null || x === undefined) { throw err("BAD_BODY", "empty entry"); }
    out.push({ body: String(x.body), to: x.to ? String(x.to) : "" });
  }
  return out;
}
function readLog(ctx, room, me, after, last) {
  const out = [];
  let seq = after + 1;
  while (seq <= last && out.length < LIMIT) {
    const ch = ctx.dna.get(E_LOG, chunkId(room, seq));
    if (ch === null) { break; }
    for (let k = 0; k < ch.e.length; k++) {
      const e = ch.e[k];
      if (e.seq < seq || out.length >= LIMIT) { continue; }
      if (e.to === "" || e.to === me || e.from === me) {
        out.push(e.to === "" ? { seq: e.seq, from: e.from, t: e.t, body: e.body } : e);
      }
    }
    seq = (idiv(seq - 1, CHUNK) + 1) * CHUNK + 1;
  }
  return out;
}

export const roomJoin = defineCommand({
  name: "${prefix}.room.join",
  caps: ["dna.read:" + E_ROOM, "dna.write:" + E_ROOM],
  validate: (raw) => ({ room: roomId(raw.room) }),
  run(ctx, i) {
    const me = uid(ctx);
    const doc = ctx.dna.get(E_ROOM, i.room);
    if (doc === null) {
      if (!ctx.dna.cas(E_ROOM, i.room, 0, { seq: 0, users: [me], created: ctx.now_ms })) { throw err("RETRY", "room changed"); }
      return { self: me, seq: 0 };
    }
    if (doc.users.indexOf(me) < 0) {
      if (doc.users.length >= MAXU) { throw err("ROOM_FULL", "room is full"); }
      const users = doc.users.slice();
      users.push(me);
      if (!ctx.dna.cas(E_ROOM, i.room, doc.$version, { seq: doc.seq, users: users, created: doc.created })) { throw err("RETRY", "room changed"); }
    }
    return { self: me, seq: doc.seq };
  },
});

export const roomAppend = defineCommand({
  name: "${prefix}.room.append",
  caps: ["dna.read:" + E_ROOM, "dna.write:" + E_ROOM, "dna.read:" + E_LOG, "dna.write:" + E_LOG, "dna.read:" + E_RATE, "dna.write:" + E_RATE],
  validate: (raw) => ({ room: roomId(raw.room), items: appendItems(raw), after: raw.after === undefined || raw.after === null ? -1 : Math.max(0, Math.trunc(Number(raw.after) || 0)) }),
  run(ctx, i) {
    const me = uid(ctx);
    const doc = ctx.dna.get(E_ROOM, i.room);
    if (doc === null || doc.users.indexOf(me) < 0) { throw err("NOT_JOINED", "join the room first"); }
    for (let k = 0; k < i.items.length; k++) {
      const it = i.items[k];
      if (it.body.length > MAXB) { throw err("TOO_BIG", "entry too large"); }
      if (it.body.charAt(0) !== "{" || it.body.indexOf("\\"k\\":") < 0) { throw err("BAD_BODY", "not a netplay entry"); }
      if (it.to !== "" && doc.users.indexOf(it.to) < 0) { throw err("BAD_TO", "unknown recipient"); }
    }
    const rk = i.room + "#" + me;
    const rate = ctx.dna.get(E_RATE, rk);
    let win = ctx.now_ms - (ctx.now_ms % WINDOW);
    let used = 0;
    if (rate !== null && rate.win === win) { used = rate.n; }
    if (used + i.items.length > RATE) { throw err("RATE_LIMIT", "too many entries, slow down"); }
    ctx.dna.put(E_RATE, rk, { win: win, n: used + i.items.length });
    const first = doc.seq + 1;
    const last = doc.seq + i.items.length;
    if (!ctx.dna.cas(E_ROOM, i.room, doc.$version, { seq: last, users: doc.users, created: doc.created })) { throw err("RETRY", "room changed"); }
    let cid = "";
    let list = [];
    for (let k = 0; k < i.items.length; k++) {
      const seq = first + k;
      const c = chunkId(i.room, seq);
      if (c !== cid) {
        if (cid !== "") { ctx.dna.put(E_LOG, cid, { e: list }); }
        cid = c;
        const ch = ctx.dna.get(E_LOG, c);
        list = ch === null ? [] : ch.e.slice();
      }
      list.push({ seq: seq, from: me, t: ctx.now_ms, to: i.items[k].to, body: i.items[k].body });
    }
    ctx.dna.put(E_LOG, cid, { e: list });
    if (i.after < 0) { return { seq: last }; }
    return { self: me, seq: last, entries: readLog(ctx, i.room, me, i.after, last) };
  },
});

export const roomPoll = defineCommand({
  name: "${prefix}.room.poll",
  caps: ["dna.read:" + E_ROOM, "dna.read:" + E_LOG],
  validate: (raw) => ({ room: roomId(raw.room), after: Math.max(0, Math.trunc(Number(raw.after) || 0)) }),
  run(ctx, i) {
    const me = uid(ctx);
    const doc = ctx.dna.get(E_ROOM, i.room);
    if (doc === null) { return { self: me, seq: 0, entries: [] }; }
    if (doc.users.indexOf(me) < 0) { throw err("NOT_JOINED", "join the room first"); }
    return { self: me, seq: doc.seq, entries: readLog(ctx, i.room, me, i.after, doc.seq) };
  },
});

export const lobbyFind = defineCommand({
  name: "${prefix}.lobby.find",
  caps: ["dna.read:" + E_LOBBY, "dna.write:" + E_LOBBY],
  validate: (raw) => ({ game: String(raw.game), seats: Math.trunc(Number(raw.seats) || SMAX) }),
  run(ctx, i) {
    const me = uid(ctx);
    if (i.game !== META.game) { throw err("BAD_GAME", "this script serves " + META.game); }
    if (i.seats < SMIN || i.seats > SMAX) { throw err("BAD_SEATS", "seats out of range"); }
    const key = i.game + "#" + String(i.seats);
    const q = ctx.dna.get(E_LOBBY, key);
    const n = q === null ? 0 : q.n;
    if (q !== null && q.users.indexOf(me) >= 0 && ctx.now_ms - q.at < TTL) { return { room: q.room, seatsTaken: q.users.length }; }
    const fresh = q === null || q.users.length >= i.seats || ctx.now_ms - q.at >= TTL;
    const room = fresh ? i.game + "-q" + String(i.seats) + "-" + String(n + 1) : q.room;
    const users = fresh ? [me] : q.users.concat([me]);
    const next = { room: room, users: users, at: ctx.now_ms, n: fresh ? n + 1 : n };
    if (!ctx.dna.cas(E_LOBBY, key, q === null ? 0 : q.$version, next)) { throw err("RETRY", "queue changed"); }
    return { room: room, seatsTaken: users.length };
  },
});
`;
}
