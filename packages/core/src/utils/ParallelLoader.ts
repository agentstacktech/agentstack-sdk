/**
 * ParallelLoader - Universal utility for parallel data loading with timeout, retries, and fallback
 * 
 * @example
 * ```typescript
 * const results = await ParallelLoader.load([
 *   { key: 'roles', loader: () => api.rbac.getRoles(1) },
 *   { key: 'users', loader: () => api.admin.getUsers() },
 *   { key: 'projects', loader: () => api.api.getProjects() }
 * ]);
 * 
 * console.log(results.roles.data); // Loaded roles
 * console.log(results.users.error); // Error if failed
 * ```
 */

export interface LoaderConfig<T = any> {
  key: string;
  loader: () => Promise<T>;
  timeout?: number; // ms, default 10000
  retries?: number; // default 0
  fallback?: T; // fallback value if all retries fail
  required?: boolean; // throw error if fails and no fallback, default false
}

export interface LoaderResult<T = any> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  success: boolean;
  duration: number; // ms
  attempts: number;
}

export type LoaderResults<T extends Record<string, any>> = {
  [K in keyof T]: LoaderResult<T[K]>;
};

export class ParallelLoader {
  /**
   * Load multiple data sources in parallel
   */
  static async load<T extends Record<string, any>>(
    configs: LoaderConfig[]
  ): Promise<LoaderResults<T>> {
    const results = {} as LoaderResults<T>;

    // Start all loaders in parallel
    const promises = configs.map(async (config) => {
      const startTime = Date.now();
      let attempts = 0;
      let lastError: Error | null = null;

      const executeLoader = async (): Promise<any> => {
        attempts++;
        
        try {
          // Create timeout promise
          const timeoutMs = config.timeout || 10000;
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
          );

          // Race between loader and timeout
          const data = await Promise.race([
            config.loader(),
            timeoutPromise
          ]);

          return {
            data,
            loading: false,
            error: null,
            success: true,
            duration: Date.now() - startTime,
            attempts
          };
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          // Retry if configured
          const maxRetries = config.retries || 0;
          if (attempts < maxRetries + 1) {
            // Exponential backoff: 100ms, 200ms, 400ms, etc.
            const backoff = Math.min(100 * Math.pow(2, attempts - 1), 3000);
            await new Promise(resolve => setTimeout(resolve, backoff));
            return executeLoader();
          }

          // All retries failed
          if (config.fallback !== undefined) {
            return {
              data: config.fallback,
              loading: false,
              error: lastError,
              success: false,
              duration: Date.now() - startTime,
              attempts
            };
          }

          if (config.required) {
            throw lastError;
          }

          return {
            data: null,
            loading: false,
            error: lastError,
            success: false,
            duration: Date.now() - startTime,
            attempts
          };
        }
      };

      const result = await executeLoader();
      results[config.key as keyof T] = result;
    });

    // Wait for all promises to settle
    await Promise.allSettled(promises);

    return results;
  }

  /**
   * Load data sources with progress callback
   */
  static async loadWithProgress<T extends Record<string, any>>(
    configs: LoaderConfig[],
    onProgress?: (completed: number, total: number, key: string) => void
  ): Promise<LoaderResults<T>> {
    const results = {} as LoaderResults<T>;
    const total = configs.length;
    let completed = 0;

    const promises = configs.map(async (config) => {
      const startTime = Date.now();
      let attempts = 0;
      let lastError: Error | null = null;

      try {
        const executeLoader = async (): Promise<any> => {
          attempts++;
          
          try {
            const timeoutMs = config.timeout || 10000;
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
            );

            const data = await Promise.race([
              config.loader(),
              timeoutPromise
            ]);

            return {
              data,
              loading: false,
              error: null,
              success: true,
              duration: Date.now() - startTime,
              attempts
            };
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            const maxRetries = config.retries || 0;
            if (attempts < maxRetries + 1) {
              const backoff = Math.min(100 * Math.pow(2, attempts - 1), 3000);
              await new Promise(resolve => setTimeout(resolve, backoff));
              return executeLoader();
            }

            if (config.fallback !== undefined) {
              return {
                data: config.fallback,
                loading: false,
                error: lastError,
                success: false,
                duration: Date.now() - startTime,
                attempts
              };
            }

            if (config.required) {
              throw lastError;
            }

            return {
              data: null,
              loading: false,
              error: lastError,
              success: false,
              duration: Date.now() - startTime,
              attempts
            };
          }
        };

        const result = await executeLoader();
        results[config.key as keyof T] = result;
        
        completed++;
        if (onProgress) {
          onProgress(completed, total, config.key);
        }
      } catch (error) {
        results[config.key as keyof T] = {
          data: null,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
          success: false,
          duration: Date.now() - startTime,
          attempts
        } as any;
        
        completed++;
        if (onProgress) {
          onProgress(completed, total, config.key);
        }
      }
    });

    await Promise.allSettled(promises);

    return results;
  }
}

export default ParallelLoader;




