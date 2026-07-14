// Minimal React shim for optional hooks usage in core package
declare module 'react' {
  export function useState<T = any>(
    initial?: T | (() => T),
  ): [T, (next: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useCallback<T extends (...args: any[]) => any>(fn: T, deps?: any[]): T;
  export function useMemo<T>(factory: () => T, deps?: any[]): T;
}

