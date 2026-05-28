/**
 * SSRProvider - Server-Side Rendering support for AgentStack React
 * Provides SSR-safe context and hydration utilities
 */

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { AgentStackSDK, SDKConfig } from '@agentstack/sdk';

export interface SSRContextValue {
  isServer: boolean;
  isHydrated: boolean;
  sdk: AgentStackSDK | null;
  config: SDKConfig | null;
}

const SSRContext = createContext<SSRContextValue | null>(null);

export interface SSRProviderProps {
  children: ReactNode;
  config?: SDKConfig;
  sdk?: AgentStackSDK;
  isServer?: boolean;
}

export function SSRProvider({ 
  children, 
  config, 
  sdk, 
  isServer = typeof window === 'undefined' 
}: SSRProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [sdkInstance, setSdkInstance] = useState<AgentStackSDK | null>(sdk || null);

  // Handle hydration on client side
  useEffect(() => {
    if (!isServer) {
      setIsHydrated(true);
      
      // Initialize SDK on client if not provided
      if (!sdkInstance && config) {
        const clientSDK = new AgentStackSDK(config);
        setSdkInstance(clientSDK);
      }
    }
  }, [isServer, sdkInstance, config]);

  const value: SSRContextValue = {
    isServer,
    isHydrated: !isServer && isHydrated,
    sdk: sdkInstance,
    config: config || null,
  };

  return (
    <SSRContext.Provider value={value}>
      {children}
    </SSRContext.Provider>
  );
}

export function useSSR(): SSRContextValue {
  const context = useContext(SSRContext);
  
  if (!context) {
    throw new Error('useSSR must be used within an SSRProvider');
  }
  
  return context;
}

// Hook for checking if we're on server side
export function useIsServer(): boolean {
  const { isServer } = useSSR();
  return isServer;
}

// Hook for checking if component is hydrated
export function useIsHydrated(): boolean {
  const { isHydrated } = useSSR();
  return isHydrated;
}
