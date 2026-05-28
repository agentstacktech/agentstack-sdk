import React from 'react';
import type { SDKCapability } from '../hooks/useCapability';
import { useCapability } from '../hooks/useCapability';

export interface RequireCapabilityProps {
  projectId: number | undefined;
  capability: SDKCapability;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Declarative gate: renders children only when capability is granted.
 */
export function RequireCapability({
  projectId,
  capability,
  fallback = null,
  loadingFallback = null,
  children,
}: RequireCapabilityProps) {
  const { allowed, loading } = useCapability(projectId, capability);

  if (loading) {
    return <>{loadingFallback}</>;
  }
  if (!allowed) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
