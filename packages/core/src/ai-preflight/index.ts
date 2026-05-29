/**
 * Client-side validation before network calls — AI Application Factory.
 * Genetic tag: repo.platform.sdk.ai_app_factory.gen1
 */
import { appManifestSchema } from '../manifest/schema';
import type { AgentStackSDK } from '../sdk';
import type { AppManifestV1 } from '../manifest/schema';
import {
  assertPlatformOperatorSurface,
  PLATFORM_OPERATOR_MODULE_IDS,
} from '../config/integratorScope';

export function validateAppManifest(input: unknown) {
  return appManifestSchema.safeParse(input) as {
    success: boolean;
    data?: AppManifestV1;
    error?: unknown;
  };
}

export function assertModuleEnabled(sdk: AgentStackSDK, moduleId: string): void {
  const matrix = sdk.getCapabilityMatrix();
  const domain = matrix.domain?.find((d) => d.id === moduleId);
  if (domain && domain.enabled === false) {
    throw new Error(`module_disabled:${moduleId}`);
  }
}

/** Reject ecosystem admin modules for tenant integrator SDK instances. */
export function assertIntegratorModule(sdk: AgentStackSDK, moduleId: string): void {
  if (!PLATFORM_OPERATOR_MODULE_IDS.has(moduleId)) return;
  assertPlatformOperatorSurface(sdk.getConfig(), `module:${moduleId}`);
}

export { appManifestSchema };
