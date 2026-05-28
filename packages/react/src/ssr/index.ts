/**
 * AgentStack React SSR Integration
 * Export file for all SSR utilities and hooks
 */

// SSR Provider and Context
export { SSRProvider, useSSR, useIsServer, useIsHydrated } from './SSRProvider';

// SSR Hooks
export { useSSRAuth } from './useSSRAuth';
export { useSSRProfile } from './useSSRProfile';
export { useSSRSettings } from './useSSRSettings';

// SSR Components
export { SSRProfileComponent } from './SSRProfileComponent';

// Re-export types for convenience
export type { SSRAuthState, SSRAuthActions } from './useSSRAuth';
export type { SSRProfileState, SSRProfileActions } from './useSSRProfile';
export type { SSRSettingsState, SSRSettingsActions } from './useSSRSettings';
