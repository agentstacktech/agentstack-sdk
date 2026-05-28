/**
 * Client-side validation before network calls — AI Application Factory.
 * Genetic tag: repo.platform.sdk.ai_app_factory.gen1
 */
import { appManifestSchema } from '../manifest/schema';
import type { AgentStackSDK } from '../sdk';
import type { AppManifestV1 } from '../manifest/schema';

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

export { appManifestSchema };
