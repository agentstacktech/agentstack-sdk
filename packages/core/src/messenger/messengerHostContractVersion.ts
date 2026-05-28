/**
 * Monotonic version for the messenger embed / standalone **host wiring** contract
 * (ports, activity, QueryClient, etc.). Bump when integrators must add new
 * `setMessenger*Port` calls or equivalent — see `docs/adr/MESSENGER_STANDALONE_HOST_CONTRACT.md`.
 *
 * Not used for wire protocol; safe to compare at boot for logging / drift detection.
 */
export const MESSENGER_HOST_CONTRACT_VERSION = 3 as const;
