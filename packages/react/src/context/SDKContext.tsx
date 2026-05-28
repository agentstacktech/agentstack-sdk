/**
 * SDKContext - React Context for AgentStack SDK
 * Provides SDK instance and configuration to all components
 */

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { AgentStackSDK, SDKConfig, AuthSnapshot } from '@agentstack/sdk';

export interface SDKContextValue {
  sdk: AgentStackSDK;
  config: SDKConfig;
  isInitialized: boolean;
  authState: AuthSnapshot;
}

const SDKContext = createContext<SDKContextValue | null>(null);

export interface SDKProviderProps {
  children: ReactNode;
  config: SDKConfig;
  sdk?: AgentStackSDK;
}

export function SDKProvider({ children, config, sdk }: SDKProviderProps) {
  const [sdkInstance] = React.useState(() => {
    return sdk || new AgentStackSDK(config);
  });

  const [isInitialized] = React.useState(true);
  const [authState, setAuthState] = useState<AuthSnapshot>(() => sdkInstance.getAuthStateSnapshot());

  useEffect(() => {
    const handler = (next: AuthSnapshot) => setAuthState(next);
    sdkInstance.authStateStore.on('auth:state-changed', handler);
    return () => {
      sdkInstance.authStateStore.off('auth:state-changed', handler);
    };
  }, [sdkInstance]);

  const value: SDKContextValue = {
    sdk: sdkInstance,
    config,
    isInitialized,
    authState
  };

  return (
    <SDKContext.Provider value={value}>
      {children}
    </SDKContext.Provider>
  );
}

export function useSDK(): SDKContextValue {
  const context = useContext(SDKContext);
  
  if (!context) {
    throw new Error('useSDK must be used within an SDKProvider');
  }
  
  return context;
}

// Hook for accessing SDK instance directly
export function useSDKInstance(): AgentStackSDK {
  const { sdk } = useSDK();
  return sdk;
}

// Hook for accessing SDK configuration
export function useSDKConfig(): SDKConfig {
  const { config } = useSDK();
  return config;
}

export function useAuthState(): AuthSnapshot {
  const { authState } = useSDK();
  return authState;
}
