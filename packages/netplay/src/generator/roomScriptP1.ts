/**
 * P1 room script generator (CursorDeploy official template, TG 2152 wave 2026-11-13).
 *
 * The live P1 compiler only accepts int locals, if/else, for/while, `return { ok, ... }` and
 * `ctx.dna.read/write` with declared `read_paths` / `write_paths`. Room state is keyed by one
 * `$room_id` segment: `ctx.dna.write([ns, input.room_id, 'state'], n)` with
 * `write_paths: ['<ns>.$room_id.state']`. No `throw` in export bodies (SS1202): errors are
 * `return { ok: false, error }`. No string building, arrays or CAS, so this script keeps only
 * integer counters (log seq, seated users, lobby ticket); entry bodies stay on the client relay
 * until the compiler grows strings. The full v1 log script is still `generateRoomScript`.
 */
import type { Game } from '../define.js';

export interface RoomScriptP1Options {
  /** Export prefix (`<prefix>.room.join`) and DNA namespace (`np_<prefix>`). Default: game id. */
  prefix?: string;
  /** Max distinct users per room. Default seats.max + 8. */
  maxUsers?: number;
  /** Max entries a room's log may hold. Default 100000. */
  maxLog?: number;
  /** Max entries per append. Default 16. */
  maxItems?: number;
}

const ID = /^[a-z0-9][a-z0-9-]*$/;

export function generateRoomScriptP1(game: Pick<Game<unknown, unknown>, 'id' | 'seats' | 'version'>, o: RoomScriptP1Options = {}): string {
  const prefix = o.prefix ?? game.id;
  if (!ID.test(prefix)) throw new Error('generateRoomScriptP1: prefix must be [a-z0-9-]');
  const ns = 'np_' + prefix.replace(/-/g, '_');
  const n = (v: number, name: string): number => {
    if (!Number.isInteger(v) || v <= 0) throw new Error(`generateRoomScriptP1: ${name} must be a positive integer`);
    return v;
  };
  const MAXU = n(o.maxUsers ?? game.seats.max + 8, 'maxUsers');
  const MAXLOG = n(o.maxLog ?? 100000, 'maxLog');
  const MAXI = n(o.maxItems ?? 16, 'maxItems');
  const SMIN = n(game.seats.min, 'seats.min');
  const SMAX = n(game.seats.max, 'seats.max');
  const VER = n(game.version, 'version');
  const R = (leaf: string) => `["${ns}", input.room_id, "${leaf}"]`;
  const P = (leaf: string) => `"${ns}.$room_id.${leaf}"`;
  return `import { defineCommand } from "@stack/runtime";

const NP_VERSION = ${VER};
const MAXU = ${MAXU};
const MAXLOG = ${MAXLOG};
const MAXI = ${MAXI};
const SMIN = ${SMIN};
const SMAX = ${SMAX};

export const roomJoin = defineCommand({
  name: "${prefix}.room.join",
  caps: ["dna.read", "dna.write"],
  read_paths: [${P('users')}, ${P('state')}],
  write_paths: [${P('users')}],
  run(ctx, input) {
    let u = ctx.dna.read(${R('users')});
    let s = ctx.dna.read(${R('state')});
    if (u >= MAXU) { return { ok: false, error: "ROOM_FULL" }; }
    ctx.dna.write(${R('users')}, u + 1);
    return { ok: true, users: u + 1, seq: s, v: NP_VERSION };
  },
});

export const roomAppend = defineCommand({
  name: "${prefix}.room.append",
  caps: ["dna.read", "dna.write"],
  read_paths: [${P('state')}, ${P('users')}],
  write_paths: [${P('state')}],
  run(ctx, input) {
    let u = ctx.dna.read(${R('users')});
    let s = ctx.dna.read(${R('state')});
    if (u < 1) { return { ok: false, error: "NOT_JOINED" }; }
    if (input.count < 1 || input.count > MAXI) { return { ok: false, error: "BAD_BODY" }; }
    if (input.after >= 0 && input.after != s) { return { ok: false, error: "RETRY", seq: s }; }
    if (s + input.count > MAXLOG) { return { ok: false, error: "LOG_FULL" }; }
    ctx.dna.write(${R('state')}, s + input.count);
    return { ok: true, seq: s + input.count };
  },
});

export const roomPoll = defineCommand({
  name: "${prefix}.room.poll",
  caps: ["dna.read"],
  read_paths: [${P('state')}, ${P('users')}],
  run(ctx, input) {
    let u = ctx.dna.read(${R('users')});
    let s = ctx.dna.read(${R('state')});
    if (u < 1) { return { ok: false, error: "NOT_JOINED", seq: s }; }
    return { ok: true, seq: s, users: u };
  },
});

export const roomLeave = defineCommand({
  name: "${prefix}.room.leave",
  caps: ["dna.read", "dna.write"],
  read_paths: [${P('users')}],
  write_paths: [${P('users')}],
  run(ctx, input) {
    let u = ctx.dna.read(${R('users')});
    if (u < 1) { return { ok: false, error: "NOT_JOINED" }; }
    ctx.dna.write(${R('users')}, u - 1);
    return { ok: true, users: u - 1 };
  },
});

export const lobbyFind = defineCommand({
  name: "${prefix}.lobby.find",
  caps: ["dna.read", "dna.write"],
  read_paths: ["${ns}_lobby.$seats.n", "${ns}_lobby.$seats.taken"],
  write_paths: ["${ns}_lobby.$seats.n", "${ns}_lobby.$seats.taken"],
  run(ctx, input) {
    if (input.seats < SMIN || input.seats > SMAX) { return { ok: false, error: "BAD_SEATS" }; }
    let q = ctx.dna.read(["${ns}_lobby", input.seats, "n"]);
    let t = ctx.dna.read(["${ns}_lobby", input.seats, "taken"]);
    if (t >= input.seats || q < 1) {
      ctx.dna.write(["${ns}_lobby", input.seats, "n"], q + 1);
      ctx.dna.write(["${ns}_lobby", input.seats, "taken"], 1);
      return { ok: true, ticket: q + 1, seatsTaken: 1 };
    }
    ctx.dna.write(["${ns}_lobby", input.seats, "taken"], t + 1);
    return { ok: true, ticket: q, seatsTaken: t + 1 };
  },
});
`;
}
