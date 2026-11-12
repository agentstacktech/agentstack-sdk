// Usage: npm run gen:room -- <id> <minSeats> <maxSeats> [version] [prefix] > room.ts
// (builds dist first). For a full GameDef use generateRoomScript(game, opts) from code.
import { generateRoomScript } from '../dist/generator/roomScript.js';
const [id, min, max, version, prefix] = process.argv.slice(2);
if (!id || !min || !max) { console.error('usage: gen-room <id> <minSeats> <maxSeats> [version] [prefix]'); process.exit(2); }
process.stdout.write(generateRoomScript({ id, seats: { min: Number(min), max: Number(max) }, version: Number(version ?? 1) }, prefix ? { prefix } : {}));
