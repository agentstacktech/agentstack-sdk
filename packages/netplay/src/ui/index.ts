/** `@agentstack/netplay/ui` — optional DOM widgets (room-code screen). The headless logic lives in the main entry (`createLobby`). */
export { mountNetStatus, describeNetStatus, NET_STATUS_LABELS, type NetStatusLabels } from './status.js';
export { mountLobby, seatTag, turnChoice, choiceLine, LOBBY_LABELS, type LobbyLabels, type MountLobbyOptions, type LobbyUi, type LobbyChoice } from './lobby.js';
export { localName, cleanName, type LocalName, type IdChannel } from './name.js';
export { mountMatchBar, matchBar, MATCH_BAR_LABELS, MATCH_BAR_CSS, type MatchBarLabels, type MatchBarOptions, type MatchBarModel, type MatchBarUi } from './matchbar.js';
export { applyTheme, themeCss, type ThemeOptions } from './theme.js';
export { bindVisibility } from './visibility.js';

export { mountQuickPlay, guessSignedIn, QUICK_LABELS, type QuickLabels, type QuickPlayOptions, type QuickPlayUi } from './quick.js';
