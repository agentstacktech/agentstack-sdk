/**
 * @agentstack/netplay — game-agnostic deterministic multiplayer (gene `sdk.netplay.gen1`).
 * Start with README.md (5-minute quickstart) and AGENTS.md (guide for AI agents).
 */
export { defineGame, type Game } from './define.js';
export { createSession, Session, type SessionOptions, type Listener } from './session.js';
export { createRoom, reduceRoom, foldLog, commitHash, absentSeats, type RoomModel, type RoomPlayer, type RoomOptions } from './room.js';
export { createRng, deriveSeed, seedFromString, mix32, type Rng, type RngState } from './rng.js';
export { hashState, hashString, canonicalJson } from './hash.js';
export { memoryHub, type MemoryHub, type MemoryHubOptions } from './transports/memory.js';
export { pollingTransport, type RoomApi, type PollingOptions } from './transports/polling.js';
export { stackscriptRoomApi, stackscriptTransport, type ScriptRunner, type StackscriptRoomOptions } from './transports/stackscript.js';
export { wssTransport, type WssOptions } from './transports/wss.js';
/** DEV ONLY (LAN relay, no auth): see tools/dev-relay.mjs. */
export { devRelayTransport, devRelayRoomApi } from './transports/devrelay.js';
export { createMatchmaker, memoryMatchmaker, type Matchmaker, type MatchTicket, type QueueApi } from './matchmaking.js';
export { createLobby, roomCode, parseRoomCode, roomIdFor, inviteLink, codeFromUrl, CODE_ALPHABET, CODE_LENGTH, type LobbyController, type LobbyOptions, type LobbyState, type LobbyScreen, type LobbyError } from './lobby.js';
export { netStatus, type NetStatus } from './status.js';
export { generateRoomScript, type RoomScriptOptions } from './generator/roomScript.js';
export type * from './types.js';
