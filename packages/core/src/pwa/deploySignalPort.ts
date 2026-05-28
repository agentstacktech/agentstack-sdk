/**
 * Deploy probe transport types (`sdk.pwa.update_plane.gen1`).
 */

export type DeploySignal =
  | { kind: 'server_restart'; serverStartedAt: string }
  | { kind: 'stale_assets_hint' };

export interface DeploySignalPort {
  subscribe(handler: (signal: DeploySignal) => void): () => void;
  markReloading?(serverStartedAt: string): void;
}
