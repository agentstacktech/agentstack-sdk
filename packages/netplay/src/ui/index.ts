/** `@agentstack/netplay/ui` — optional DOM widgets (room-code screen). The headless logic lives in the main entry (`createLobby`). */
export { mountNetStatus, describeNetStatus, NET_STATUS_LABELS, type NetStatusLabels } from './status.js';
export { mountLobby, LOBBY_LABELS, type LobbyLabels, type MountLobbyOptions, type LobbyUi } from './lobby.js';
