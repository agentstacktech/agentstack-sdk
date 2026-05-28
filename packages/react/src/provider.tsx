/**
 * React Provider for AgentStack SDK
 * Provides SDK context to all child components
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AgentStackSDK, SDKConfig } from '@agentstack/sdk';

// ============================================================================
// Context Types
// ============================================================================

interface AgentStackContextType {
  sdk: AgentStackSDK | null;
  isInitialized: boolean;
  error: Error | null;
  config: SDKConfig | null;
}

interface AgentStackProviderProps {
  config: SDKConfig;
  children: ReactNode;
  onError?: (error: Error) => void;
  onInitialized?: (sdk: AgentStackSDK) => void;
}

// ============================================================================
// Context
// ============================================================================

const AgentStackContext = createContext<AgentStackContextType | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export function AgentStackProvider({
  config,
  children,
  onError,
  onInitialized
}: AgentStackProviderProps) {
  const [sdk, setSdk] = useState<AgentStackSDK | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const initializeSDK = async () => {
      try {
        const agentStackSDK = new AgentStackSDK(config);
        
        if (mounted) {
          setSdk(agentStackSDK);
          setIsInitialized(true);
          setError(null);
          
          // Call initialization callback
          onInitialized?.(agentStackSDK);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize AgentStack SDK');
        
        if (mounted) {
          setError(error);
          setIsInitialized(false);
          
          // Call error callback
          onError?.(error);
        }
      }
    };

    initializeSDK();

    return () => {
      mounted = false;
      // Cleanup SDK when component unmounts
      if (sdk) {
        sdk.destroy();
      }
    };
  }, [config, onError, onInitialized]);

  const contextValue: AgentStackContextType = {
    sdk,
    isInitialized,
    error,
    config
  };

  return (
    <AgentStackContext.Provider value={contextValue}>
      {children}
    </AgentStackContext.Provider>
  );
}

// ============================================================================
// Hook to use AgentStack context
// ============================================================================

export function useAgentStack(): AgentStackContextType {
  const context = useContext(AgentStackContext);
  
  if (!context) {
    throw new Error('useAgentStack must be used within an AgentStackProvider');
  }
  
  return context;
}

// ============================================================================
// Hook to get SDK instance
// ============================================================================

export function useSDK(): AgentStackSDK {
  const { sdk } = useAgentStack();
  
  if (!sdk) {
    throw new Error('SDK is not initialized. Make sure AgentStackProvider is properly configured.');
  }
  
  return sdk;
}

// ============================================================================
// Higher-Order Component for SDK access
// ============================================================================

export function withAgentStack<P extends object>(
  Component: React.ComponentType<P & { sdk: AgentStackSDK }>
) {
  return function WrappedComponent(props: P) {
    const sdk = useSDK();
    return <Component {...props} sdk={sdk} />;
  };
}

// ============================================================================
// Error Boundary for SDK errors
// ============================================================================

interface AgentStackErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AgentStackErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  AgentStackErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AgentStackErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AgentStack Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong with AgentStack</h2>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Loading component
// ============================================================================

interface AgentStackLoadingProps {
  children?: ReactNode;
  fallback?: ReactNode;
}

export function AgentStackLoading({ children, fallback }: AgentStackLoadingProps) {
  const { isInitialized, error } = useAgentStack();

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h3>Failed to initialize AgentStack</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  if (!isInitialized) {
    return fallback || (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Initializing AgentStack...</p>
      </div>
    );
  }

  return <>{children}</>;
}
