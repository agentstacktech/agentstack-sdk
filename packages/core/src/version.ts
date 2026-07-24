/**
 * AgentStack SDK Version System
 * Philosophy v0.1.16: Elegant Minimalism - Clear versioning for confidence
 *
 * Product line version `semantic` is synced from monorepo `AGENTSTACK_CORE_VERSION`
 * (shared/constants.py) via `npm run sync:agentstack-version` → generated file.
 */

import { AGENTSTACK_CORE_VERSION } from './generated/agentstack-core-version';

/** Same string as Python `shared.constants.AGENTSTACK_CORE_VERSION` after sync. */
export { AGENTSTACK_CORE_VERSION };

export interface SDKVersion {
  /** Semantic version (major.minor.patch) */
  semantic: string;
  /** Build hash for exact identification */
  buildHash: string;
  /** Generation marker (Gen1, Gen2, etc.) */
  generation: string;
  /** Feature flags for capability detection */
  features: {
    urlMinimalism: boolean;
    universalDiagnostic: boolean;
    proteinCommands: boolean;
    revolutionaryDiagnostics: boolean;
  };
  /** Build timestamp */
  buildTime: string;
  /** Philosophy version applied */
  philosophy: string;
}

/**
 * Current SDK Version Information
 * Philosophy v0.2.11: URL Minimalism + v0.1.16: Elegant Minimalism
 */
/** Build hash from CI / Vite define when present. */
const BUILD_HASH: string =
  typeof process !== 'undefined' && typeof process.env?.AGENTSTACK_BUILD_HASH === 'string'
    ? process.env.AGENTSTACK_BUILD_HASH
    : typeof import.meta !== 'undefined' &&
        typeof (import.meta as { env?: { VITE_APP_BUILD_ID?: string } }).env?.VITE_APP_BUILD_ID ===
          'string'
      ? (import.meta as { env: { VITE_APP_BUILD_ID: string } }).env.VITE_APP_BUILD_ID
      : 'dev-local';

export const SDK_VERSION: SDKVersion = {
  semantic: AGENTSTACK_CORE_VERSION,
  buildHash: BUILD_HASH,
  generation: "Gen2",
  features: {
    urlMinimalism: true,        // v0.2.11: URL Minimalism applied
    universalDiagnostic: true,  // v0.1.16: Elegant Minimalism
    proteinCommands: true,      // v0.2.6: Protein Command Architecture
    revolutionaryDiagnostics: true, // v0.2.10: Revolutionary Diagnostics
  },
  buildTime: new Date().toISOString(),
  philosophy: "v0.1.16_Elegant_Minimalism"
};

/**
 * Version comparison utilities
 * Philosophy v0.1.16: Elegant Minimalism - Simple, clear operations
 */
export class VersionManager {
  /**
   * Check if SDK has required feature
   */
  static hasFeature(feature: keyof SDKVersion['features']): boolean {
    return SDK_VERSION.features[feature];
  }

  /**
   * Check if SDK version is compatible
   */
  static isCompatible(requiredVersion: string): boolean {
    const current = SDK_VERSION.semantic;
    const [currentMajor, currentMinor] = current.split('.').map(Number);
    const [requiredMajor, requiredMinor] = requiredVersion.split('.').map(Number);
    
    return currentMajor >= requiredMajor && currentMinor >= requiredMinor;
  }

  /**
   * Get version info for diagnostics
   */
  static getVersionInfo(): string {
    return `${SDK_VERSION.semantic}_${SDK_VERSION.generation}_${SDK_VERSION.buildHash}`;
  }

  /**
   * Check if SDK needs rebuild based on feature requirements
   */
  static needsRebuild(requiredFeatures: (keyof SDKVersion['features'])[]): boolean {
    return requiredFeatures.some(feature => !SDK_VERSION.features[feature]);
  }
}

/**
 * Global version exposure for diagnostics
 * Philosophy v0.1.16: Elegant Minimalism - Universal everywhere
 */
if (typeof window !== 'undefined') {
  (window as any).AgentStackSDKVersion = SDK_VERSION;
  (window as any).checkSDKFeature = VersionManager.hasFeature;
  (window as any).checkSDKCompatibility = VersionManager.isCompatible;
}



