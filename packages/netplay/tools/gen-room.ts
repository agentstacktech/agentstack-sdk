// Usage: node --experimental-strip-types tools/gen-room.ts <id> <minSeats> <maxSeats> [version] > room.ts
import { generateRoomScript } from '../src/generator/roomScript.ts';
const [id, min, max, version] = process.argv.slice(2);
if (!id || !min || !max) { console.error('usage: gen-room <id> <minSeats> <maxSeats> [version]'); process.exit(2); }
process.stdout.write(generateRoomScript({ id, seats: { min: Number(min), max: Number(max) }, version: Number(version ?? 1) }));
