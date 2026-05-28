/**
 * Network policy for deferring heavy boot/update work (`sdk.mobile.gen1`).
 */
import { getDeviceCapabilityProfile } from './deviceCapability';

export type NetworkPolicy = {
  deferHeavyNetwork: boolean;
  effectiveType: string;
  saveData: boolean;
};

export function getNetworkPolicy(): NetworkPolicy {
  const cap = getDeviceCapabilityProfile();
  return {
    deferHeavyNetwork: cap.deferHeavyNetwork,
    effectiveType: cap.effectiveType,
    saveData: cap.saveData,
  };
}
