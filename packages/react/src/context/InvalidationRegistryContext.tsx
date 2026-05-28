import React, { createContext, useContext } from 'react';
import type { InvalidationRegistry } from '../lib/invalidationRegistry';

const InvalidationRegistryContext = createContext<InvalidationRegistry | null>(null);

export function InvalidationRegistryProvider({
  registry,
  children,
}: {
  registry: InvalidationRegistry | null;
  children: React.ReactNode;
}) {
  return (
    <InvalidationRegistryContext.Provider value={registry}>
      {children}
    </InvalidationRegistryContext.Provider>
  );
}

export function useInvalidationRegistry(): InvalidationRegistry | null {
  return useContext(InvalidationRegistryContext);
}
