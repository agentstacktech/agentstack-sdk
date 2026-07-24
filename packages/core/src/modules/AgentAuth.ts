/**
 * AgentAuth - Аутентификация и авторизация
 * Модуль для работы с аутентификацией пользователей
 */

import { HTTPClient } from '../client/http-client';
import { AuthStateStore } from '../utils/auth-state';
import { SimpleEventEmitter } from '../utils/event-emitter';
import { logger } from '../utils/logger';
import { maskSecretForLog } from '../utils/maskSecretForLog';
import { SDKErrorHandler, NetworkError, ValidationError, NotFoundError, PermissionError, ServerError } from '../errors/ErrorHandler';
import { executeOrNotFoundFallback } from '../utils/httpDeleteIdempotent';
import { ConflictError, UnauthorizedError } from '../types/shared/HTTPTypes';
import { retryManager } from '../errors/RetryManager';
import { offlineManager } from '../errors/OfflineManager';
import { getStorageItem, setStorageItem, removeStorageItem } from '../utils/storage-utils';
import { writeBrowserAccessToken } from '../utils/browserAccessToken';
import {
  AGENTSTACK_PRODUCTION_API_BASE,
  AGENTSTACK_PRODUCTION_ORIGIN,
} from '../config/agentstackEndpoints';
import { normalizeProjectId } from '../config/projectContext';
import { isTypedDna503Code } from '../utils/classifyAuthFailure';
import type {
  UserSettings,
  NotificationSettings,
  PrivacySettings,
  DashboardSettings,
  AppearanceSettings,
} from '../types';

export interface LoginCredentials {
  email: string;
  password: string;
  project_id?: number;
  /** Client correlation id; echoed by mint for logs / multi-tab race debug. */
  mint_id?: string;
  /** Optional device binding hint (Session OS V3.1). */
  device_fingerprint?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user_id?: string;
  project_id?: string;
  permissions?: string[];
  /** Correlation from mint/refresh (auth resilience P1). */
  mint_id?: string;
  jti?: string;
  authz_generation?: number;
}

export interface UserProfile {
  user_id: number; // ✅ CRITICAL: Use user_id instead of id (database record ID)
  id?: number; // Deprecated - use user_id instead
  email: string;
  username?: string;
  role: string;
  project_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Optional piggyback from `GET /api/auth/me` (platform feature gates). */
  feature_availability?: Record<string, unknown>;
}

export interface SessionBootstrapSettingsSummary {
  theme?: string;
  language?: string;
  timezone?: string;
}

/** Full payload from `GET /api/auth/me/bootstrap` (single cold-start round-trip). */
export interface SessionBootstrapPayload {
  user: UserProfile;
  settings_summary?: SessionBootstrapSettingsSummary;
  accessible_project_ids?: number[];
  accessible_project_ids_digest?: string;
  membership_generation?: number;
}


// JSON Profile Data Interfaces
export interface ProfileData {
  display_name?: string;
  username?: string;
  bio?: string;
  avatar?: string; // Only for AgentStack
  location?: string;
  website?: string;
  social_links?: SocialLinks;
}

export interface SocialLinks {
  github?: string;
  twitter?: string;
  linkedin?: string;
  discord?: string;
  telegram?: string;
}

// Widget Configuration Interfaces
export interface WidgetConfig {
  projectId: string;
  theme?: 'light' | 'dark';
  language?: 'en' | 'ru';
  allowedOrigins?: string[];
  apiBase?: string;
}

export interface WidgetAuthMessage {
  type: 'AUTH_SUCCESS' | 'AUTH_ERROR' | 'AUTH_TOKEN' | 'AUTH_REQUEST';
  payload: {
    user?: UserProfile;
    token?: string;
    error?: string;
    email?: string;
    password?: string;
    username?: string;
    action?: 'login' | 'register';
  };
  timestamp: number;
  signature: string;
}

// OAuth Interfaces
export interface OAuthProvider {
  name: string;
  auth_url: string;
  token_url: string;
  user_info_url: string;
}

export interface ConnectedOAuthProvider {
  id: number;
  provider: string;
  provider_user_id: string;
  provider_email?: string;
  provider_username?: string;
  is_active: boolean;
  connected_at: string;
  last_used?: string;
  scopes: string[];
}

export interface OAuthConnectRequest {
  provider: string;
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  project_id: number;
}

export class AgentAuth extends SimpleEventEmitter {
  private client: HTTPClient;
  private errorHandler: SDKErrorHandler;
  private widgetConfig: WidgetConfig | null = null;
  private authStateStore?: AuthStateStore;
  /** Dedupe parallel `GET /auth/me` (Strict Mode double-mount, refreshUser + bootstrap). */
  private getCurrentUserInFlight: Promise<UserProfile> | null = null;
  /** Dedupe parallel `GET /auth/me/bootstrap`. */
  private sessionBootstrapInFlight: Promise<SessionBootstrapPayload> | null = null;
  private lastSessionBootstrap: SessionBootstrapPayload | null = null;
  /** Abort in-flight bootstrap when force-login discards a stale flight (AUTH-RACE-02). */
  private sessionBootstrapAbort: AbortController | null = null;

  constructor(client: HTTPClient, authStateStore?: AuthStateStore) {
    super();
    this.client = client;
    this.errorHandler = new SDKErrorHandler();
    this.authStateStore = authStateStore;
  }

  /**
   * Drop cached / in-flight session bootstrap (login start, logout, force refresh).
   * Does not abort other HTTP — pair with ``httpClient.cancelPendingRequests`` as needed.
   * Note: ``cancelPendingRequests`` alone does **not** abort fetch; call this for bootstrap.
   */
  invalidateSessionBootstrap(reason = 'manual'): void {
    try {
      this.sessionBootstrapAbort?.abort();
    } catch {
      /* ignore */
    }
    this.sessionBootstrapAbort = null;
    this.sessionBootstrapInFlight = null;
    this.lastSessionBootstrap = null;
    if (reason === 'force_login' || reason === 'login_start') {
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('agentstack.auth.bootstrap.stale_jti_discarded', {
              detail: { reason },
            }),
          );
        }
      } catch {
        /* ignore */
      }
    }
  }

  /**
   * Transform HTTP errors to SDK error types
   */
  private transformError(error: any): Error {
    if (
      error instanceof UnauthorizedError ||
      error instanceof ConflictError ||
      error instanceof PermissionError ||
      error instanceof ValidationError ||
      error instanceof NotFoundError ||
      error instanceof ServerError ||
      error instanceof NetworkError
    ) {
      return error;
    }

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.detail || error.message;
      
      switch (status) {
        case 400:
          return new ValidationError(message);
        case 401:
          return new PermissionError('authenticate', 'user');
        case 403:
          return new PermissionError('access', 'resource');
        case 404:
          return new NotFoundError('resource');
        case 409:
          // ✅ CRITICAL: 409 Conflict должен преобразовываться в ConflictError, а не в NetworkError
          // Это важно для правильной обработки ошибок регистрации (email уже существует)
          return new ConflictError(message);
        case 500:
        case 502:
        case 503:
        case 504:
          return new ServerError(message, status);
        default:
          return new NetworkError(message, status);
      }
    } else if (error.request) {
      return new NetworkError('Network request failed');
    } else {
      return new NetworkError(error.message || 'Unknown error');
    }
  }

  /**
   * Invalidate SDK HTTP + Protein caches for data that changes after profile/avatar mutations.
   */
  private evictProfileRelatedCaches(): void {
    void Promise.all([
      this.client.evictCacheByUrl('/profile'),
      this.client.evictCacheByUrl('/auth/profile-data'),
      this.client.evictCacheByUrl('/auth/me'),
      this.client.evictCacheByUrl('/auth/avatar'),
    ]).catch((e) => {
      logger.debug('evictProfileRelatedCaches: best-effort failed', e);
    });
  }

  private evictSessionsCaches(): void {
    void this.client.evictCacheByUrl('/sessions').catch((e) => {
      logger.debug('evictSessionsCaches: best-effort failed', e);
    });
  }

  private evictOAuthConnectedCaches(): void {
    void this.client.evictCacheByUrl('/auth/oauth/providers/connected').catch((e) => {
      logger.debug('evictOAuthConnectedCaches: best-effort failed', e);
    });
  }

  /**
   * Вход в систему
   */
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    // Auth must always throw on failure — never return null (502/restart mid-login).
    try {
        // Stable mint_id per login gesture in localStorage so cross-tab retries
        // share one fencing id (Session OS V3.1 M2 / incident 2026-07-17 G5/G12).
        const projectKey = String(credentials.project_id ?? '1');
        const mintStorageKey = `agentstack_login_mint:${projectKey}`;
        let mintId =
          (typeof credentials.mint_id === 'string' && credentials.mint_id.trim()) || '';
        const readMint = (store: Storage | undefined) => {
          if (!store) return '';
          try {
            return (store.getItem(mintStorageKey) || '').trim();
          } catch {
            return '';
          }
        };
        if (!mintId) {
          mintId =
            readMint(typeof localStorage !== 'undefined' ? localStorage : undefined) ||
            readMint(typeof sessionStorage !== 'undefined' ? sessionStorage : undefined);
        }
        if (!mintId) {
          mintId =
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `mint-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        }
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(mintStorageKey, mintId);
          }
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(mintStorageKey, mintId);
          }
        } catch {
          /* ignore */
        }

        const loginBody: LoginCredentials = { ...credentials, mint_id: mintId };
        const loginTimeoutMs = 60_000;
        // Cover server lease/create budget (~12s hard) + waiters; wall ≤ loginTimeoutMs.
        const maxMintPolls = 20;
        let response: { data?: any } | null = null;
        let lastErr: unknown = null;
        const mintDeadline = Date.now() + loginTimeoutMs;

        for (let attempt = 0; attempt < maxMintPolls; attempt++) {
          if (Date.now() >= mintDeadline) {
            break;
          }
          try {
            response = await retryManager.executeWithRetry(
              () =>
                this.client.post('/auth/login', loginBody, {
                  skipAuthStateCheck: true,
                  timeout: Math.max(5_000, mintDeadline - Date.now()),
                  headers: {
                    'Idempotency-Key': mintId,
                    'X-Mint-Id': mintId,
                  },
                }),
              { maxRetries: 0 }
            );
            const code =
              (response?.data as any)?.code ||
              (response?.data as any)?.detail?.code;
            if (
              isTypedDna503Code(code) ||
              code === 'api_warming_up' ||
              code === 'login_capacity' ||
              code === 'project_key_unavailable' ||
              code === 'auth_mint_timeout' ||
              code === 'auth_mint_in_progress' ||
              code === 'auth_crypto_timeout' ||
              code === 'auth_lookup_timeout' ||
              ((response as any)?.status === 503 && !code)
            ) {
              const retryAfterRaw =
                (response as any)?.headers?.['retry-after'] ||
                (response as any)?.headers?.['Retry-After'] ||
                '2';
              const retryAfterSec = Math.max(1, parseInt(String(retryAfterRaw), 10) || 2);
              const sleepMs = Math.min(
                retryAfterSec * 1000,
                Math.max(0, mintDeadline - Date.now()),
              );
              if (sleepMs <= 0) break;
              await new Promise((r) => setTimeout(r, sleepMs));
              continue;
            }
            lastErr = null;
            break;
          } catch (err: any) {
            lastErr = err;
            const detailCode =
              err?.apiCode ||
              err?.response?.data?.code ||
              err?.response?.data?.detail?.code ||
              err?.data?.code ||
              err?.data?.detail?.code;
            const status = err?.response?.status || err?.status;
            const isTimeout =
              err?.name === 'TimeoutError' ||
              /timeout/i.test(String(err?.message || ''));
            if (
              isTypedDna503Code(detailCode) ||
              detailCode === 'api_warming_up' ||
              detailCode === 'login_capacity' ||
              detailCode === 'project_key_unavailable' ||
              detailCode === 'auth_mint_timeout' ||
              detailCode === 'auth_mint_in_progress' ||
              detailCode === 'auth_crypto_timeout' ||
              detailCode === 'auth_lookup_timeout' ||
              (status === 503 && !detailCode) ||
              isTimeout
            ) {
              const retryAfterSec = Math.max(
                1,
                Number(err?.retryAfterSec) ||
                  parseInt(
                    String(
                      err?.response?.headers?.['retry-after'] ||
                        err?.response?.headers?.['Retry-After'] ||
                        '2',
                    ),
                    10,
                  ) ||
                  2,
              );
              const sleepMs = Math.min(
                retryAfterSec * 1000,
                Math.max(0, mintDeadline - Date.now()),
              );
              if (sleepMs <= 0) break;
              await new Promise((r) => setTimeout(r, sleepMs));
              continue;
            }
            throw err;
          }
        }
        if (!response && lastErr) {
          throw lastErr;
        }
        if (!response) {
          throw new Error('Login mint in progress — please retry');
        }

        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(mintStorageKey);
          }
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem(mintStorageKey);
          }
        } catch {
          /* ignore */
        }

        // Handle 8DNA response format
        const data = response.data;
        if (!data) {
          throw new UnauthorizedError('Invalid credentials');
        }
        if (data.success && data.session) {
          // Convert AgentStack session response to AuthTokens format
          const session = data.session;
          // ✅ CRITICAL: Use user_token for Authorization header (it's a valid JWT)
          // hybrid_key is a composite token and may not be a valid JWT for Authorization
          // Only use hybrid_key as fallback if user_token is not available
          const rawAccessToken = session.user_token || data.hybrid_key || session.api_key;
          
          if (!rawAccessToken || typeof rawAccessToken !== 'string') {
            throw new Error('Login failed: No access token received from server');
          }
          
          // Clean and validate token - remove any leading/trailing whitespace, newlines, and invalid characters
          // JWT tokens should only contain base64url characters: A-Z, a-z, 0-9, -, _, and dots
          let accessToken = rawAccessToken.trim()
            .replace(/^[,\s\n\r]+/g, '') // Remove leading commas, spaces, newlines
            .replace(/[,\s\n\r]+$/g, '')  // Remove trailing commas, spaces, newlines
            .replace(/\s+/g, '');         // Remove all internal whitespace
          
          // ✅ CRITICAL: hybrid_key may be a composite token (multiple JWTs combined)
          // Don't enforce strict 3-part JWT validation for hybrid_key
          // Instead, validate that it contains only valid base64url characters and dots
          // Check if the token we're using is actually the hybrid_key (not user_token)
          const isHybridKey = data.hybrid_key && (rawAccessToken === data.hybrid_key || accessToken === data.hybrid_key.trim());
          const jwtParts = accessToken.split('.');
          
          if (isHybridKey) {
            // For hybrid_key, accept any format (it's a composite token that may contain various formats)
            // Only validate that it's not empty and doesn't contain control characters
            // Don't enforce strict character validation as hybrid_key format may vary
            if (accessToken.length === 0) {
              throw new Error('Login failed: hybrid_key is empty');
            }
            // Check for control characters (but allow most printable characters)
            if (/[\x00-\x1F\x7F]/.test(accessToken)) {
              throw new Error('Login failed: hybrid_key contains control characters');
            }
            console.log(`✅ Hybrid key accepted (${jwtParts.length} parts, length: ${accessToken.length})`);
          } else {
            // For regular JWT tokens (user_token, api_key), enforce 3-part format
            if (jwtParts.length !== 3) {
              throw new Error(`Login failed: Invalid JWT token format (expected 3 parts, got ${jwtParts.length})`);
            }
            
            // Validate that each part contains only base64url characters
            const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
            for (let i = 0; i < jwtParts.length; i++) {
              if (!base64UrlRegex.test(jwtParts[i])) {
                throw new Error(`Login failed: Invalid JWT token part ${i + 1} contains invalid characters`);
              }
            }
          }
          
          if (accessToken.length === 0) {
            throw new Error('Login failed: Access token is empty after cleaning');
          }

          const authTokens: AuthTokens = {
            access_token: accessToken,
            refresh_token: session.api_key || session.user_token,
            token_type: 'Bearer',
            expires_in: 86400, // 24 hours
            user_id: session.user_id?.toString(),
            project_id: session.project_id?.toString() || data.project_id?.toString(),
            permissions: session.permissions || [],
            mint_id: typeof data.mint_id === 'string' ? data.mint_id : undefined,
            jti: typeof data.jti === 'string' ? data.jti : session.jti,
            authz_generation:
              typeof data.authz_generation === 'number'
                ? data.authz_generation
                : typeof session.authz_generation === 'number'
                  ? session.authz_generation
                  : undefined,
          };

          // ✅ CRITICAL: Set tokens and API key FIRST, then set auth state
          // This ensures tokens are available before auth state is set to 'authenticated'
          // which allows subsequent requests to proceed without being blocked

          // Set tokens in SDK and save to localStorage
          this.setTokens(authTokens);

          // ✅ CRITICAL: Set API key in HTTP client immediately after login
          // This ensures subsequent requests (like /api/auth/me) have the API key
          if (session.api_key && typeof session.api_key === 'string') {
            // Clean and validate API key - remove any leading/trailing whitespace, newlines, and invalid characters
            let cleanApiKey = session.api_key.trim()
              .replace(/^[,\s\n\r]+/g, '') // Remove leading commas, spaces, newlines
              .replace(/[,\s\n\r]+$/g, '')  // Remove trailing commas, spaces, newlines
              .replace(/\s+/g, '');         // Remove all internal whitespace
            
            // Validate JWT format (API key should also be a JWT)
            const jwtParts = cleanApiKey.split('.');
            if (jwtParts.length === 3) {
              // Validate that each part contains only base64url characters
              const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
              let isValid = true;
              for (let i = 0; i < jwtParts.length; i++) {
                if (!base64UrlRegex.test(jwtParts[i])) {
                  isValid = false;
                  break;
                }
              }
              if (isValid && cleanApiKey.length > 0) {
                this.client.setApiKey(cleanApiKey);
              }
            } else if (cleanApiKey.length > 0) {
              // If not a JWT, still set it (might be a different format)
              this.client.setApiKey(cleanApiKey);
            }
          }

          // ✅ CRITICAL: Save session data using unified storage module
          // This MUST happen AFTER tokens are set to ensure correct user_id is saved
          if (typeof window !== 'undefined') {
            // ✅ CRITICAL: Always update user_id and project_id to match new session
            // This ensures storage reflects the correct user after login
            const newUserId = session.user_id?.toString() || '';
            const newProjectId = session.project_id?.toString() || '1';
            
            // Try to import storage module (frontend only)
            try {
              // Dynamic import to avoid issues in SDK package
              const storageModule = require('../../../../agentstack-frontend/src/lib/storage');
              if (storageModule && storageModule.setAuthTokens) {
                const oldUserId = storageModule.getUserId();
            
            // Log user change for debugging
            if (oldUserId && oldUserId !== newUserId) {
                  console.log(`🔄 User changed in storage: ${oldUserId} -> ${newUserId}`);
                }
                
                // Save all tokens using unified storage
                storageModule.setAuthTokens({
                  access_token: authTokens.access_token,
                  refresh_token: authTokens.refresh_token,
                  api_key: session.api_key || '',
                  user_token: session.user_token || '',
                  user_id: newUserId,
                  project_id: newProjectId,
                  session_uuid: session.uuid || '',
                });
              } else {
                // Fallback: mirror access_token + session fields (session + local)
                writeBrowserAccessToken(authTokens.access_token);
                if (typeof window !== 'undefined' && window.localStorage) {
                  if (session.api_key) {
                    localStorage.setItem('api_key', session.api_key);
                    sessionStorage?.setItem('api_key', session.api_key);
                  }
                  if (session.user_token) localStorage.setItem('user_token', session.user_token);
                  localStorage.setItem('user_id', newUserId);
                  localStorage.setItem('project_id', newProjectId);
                  if (session.uuid) localStorage.setItem('session_uuid', session.uuid);
                  setStorageItem('user_id', newUserId);
                  setStorageItem('project_id', newProjectId);
                  setStorageItem('api_key', session.api_key || '');
                  setStorageItem('user_token', session.user_token || '');
                  setStorageItem('session_uuid', session.uuid || '');
                }
              }
            } catch (e) {
              // Fallback: mirror access_token + session fields (session + local)
              writeBrowserAccessToken(authTokens.access_token);
              if (typeof window !== 'undefined' && window.localStorage) {
                if (session.api_key) {
                  localStorage.setItem('api_key', session.api_key);
                  sessionStorage?.setItem('api_key', session.api_key);
                }
                if (session.user_token) localStorage.setItem('user_token', session.user_token);
                localStorage.setItem('user_id', newUserId);
                localStorage.setItem('project_id', newProjectId);
                if (session.uuid) localStorage.setItem('session_uuid', session.uuid);
                setStorageItem('user_id', newUserId);
                setStorageItem('project_id', newProjectId);
                setStorageItem('api_key', session.api_key || '');
                setStorageItem('user_token', session.user_token || '');
                setStorageItem('session_uuid', session.uuid || '');
              }
            }

            // ✅ CRITICAL: DO NOT save login credentials - security risk
            // Removed: localStorage.setItem('login_email', credentials.email) - security risk
            // Removed: localStorage.setItem('login_password', credentials.password) - NEVER store passwords!
            // Removed: localStorage.setItem('login_project_id', ...) - not needed
          }

          // ✅ CRITICAL: Set auth state AFTER tokens are set
          // This ensures tokens are available when state changes to 'authenticated'
          this.authStateStore?.setState({
            state: 'authenticated',
            reason: 'login_success',
            user: {
              id: session.user_id,
              user_id: session.user_id,
              project_id: session.project_id,
              role: session.role
            },
            tokens: {
              accessToken: authTokens.access_token,
              refreshToken: authTokens.refresh_token,
              apiKey: session.api_key || null,
              projectId: session.project_id
            }
          });

          this.client.markRecentLoginSuccess();

          const sessionProjectId = normalizeProjectId(session.project_id);
          if (sessionProjectId) {
            this.client.updateConfig({ projectId: sessionProjectId });
          }

          this.emit('auth:login', authTokens);
          return authTokens;
        } else {
          throw new Error(data.message || 'Login failed');
        }
    } catch (error) {
      this.emit('auth:login:failed', error);
      throw this.transformError(error);
    }
  }

  /**
   * Login by user API key (SPA). Session OS mint parity — stable mint_id + poll on 503.
   */
  async loginByUserApiKey(
    userApiKey: string,
    options?: { project_id?: number; mint_id?: string },
  ): Promise<Record<string, unknown>> {
    const projectKey = String(options?.project_id ?? 'key');
    const mintStorageKey = `agentstack_login_by_key_mint:${projectKey}`;
    let mintId = (options?.mint_id || '').trim();
    if (!mintId && typeof localStorage !== 'undefined') {
      try {
        mintId = (localStorage.getItem(mintStorageKey) || '').trim();
      } catch {
        /* ignore */
      }
    }
    if (!mintId) {
      mintId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `mint-key-${Date.now()}`;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(mintStorageKey, mintId);
      }
    } catch {
      /* ignore */
    }

    const body: Record<string, unknown> = {
      user_api_key: userApiKey,
      mint_id: mintId,
    };
    if (options?.project_id != null) {
      body.project_id = options.project_id;
    }

    const loginTimeoutMs = 60_000;
    const maxMintPolls = 20;
    const mintDeadline = Date.now() + loginTimeoutMs;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < maxMintPolls; attempt++) {
      if (Date.now() >= mintDeadline) break;
      try {
        const response = await this.client.post('/auth/login-by-key', body, {
          skipAuthStateCheck: true,
          timeout: Math.max(5_000, mintDeadline - Date.now()),
          headers: {
            'Idempotency-Key': mintId,
            'X-Mint-Id': mintId,
          },
        });
        const code =
          (response?.data as any)?.code || (response?.data as any)?.detail?.code;
        if (
          code === 'auth_mint_in_progress' ||
          code === 'login_capacity' ||
          code === 'project_key_unavailable' ||
          code === 'auth_mint_timeout' ||
          (response as any)?.status === 503
        ) {
          const retryAfterRaw =
            (response as any)?.headers?.['retry-after'] ||
            (response as any)?.headers?.['Retry-After'] ||
            '2';
          const retryAfterSec = Math.max(1, parseInt(String(retryAfterRaw), 10) || 2);
          const sleepMs = Math.min(
            retryAfterSec * 1000,
            Math.max(0, mintDeadline - Date.now()),
          );
          if (sleepMs <= 0) break;
          await new Promise((r) => setTimeout(r, sleepMs));
          continue;
        }
        const data = response.data as Record<string, unknown>;
        if (data?.success && data?.session) {
          await this.persistSessionFromLoginResponse(data);
        }
        return data;
      } catch (err: any) {
        lastErr = err;
        const detailCode =
          err?.response?.data?.code || err?.response?.data?.detail?.code;
        const status = err?.response?.status || err?.status;
        if (
          detailCode === 'auth_mint_in_progress' ||
          detailCode === 'login_capacity' ||
          detailCode === 'project_key_unavailable' ||
          detailCode === 'auth_mint_timeout' ||
          status === 503
        ) {
          const retryAfterSec = Math.max(
            1,
            parseInt(String(err?.response?.headers?.['retry-after'] || '2'), 10) || 2,
          );
          const sleepMs = Math.min(
            retryAfterSec * 1000,
            Math.max(0, mintDeadline - Date.now()),
          );
          if (sleepMs <= 0) break;
          await new Promise((r) => setTimeout(r, sleepMs));
          continue;
        }
        throw this.transformError(err);
      }
    }
    throw this.transformError(lastErr);
  }

  /**
   * Attach mint/login JSON to SDK client + auth state (password login + login-by-key).
   */
  async persistSessionFromLoginResponse(data: Record<string, unknown>): Promise<AuthTokens> {
    const session = data.session as Record<string, unknown>;
    if (!session || typeof session !== 'object') {
      throw new Error('Login failed: missing session');
    }
    const rawAccessToken =
      (data.access_token as string) ||
      (session.user_token as string) ||
      (data.hybrid_key as string) ||
      (session.api_key as string);
    if (!rawAccessToken || typeof rawAccessToken !== 'string') {
      throw new Error('Login failed: No access token received from server');
    }
    const accessToken = rawAccessToken
      .trim()
      .replace(/^[,\s\n\r]+/g, '')
      .replace(/[,\s\n\r]+$/g, '')
      .replace(/\s+/g, '');
    const authTokens: AuthTokens = {
      access_token: accessToken,
      refresh_token: String(session.api_key || session.user_token || accessToken),
      token_type: 'Bearer',
      expires_in: 86400,
      user_id: String(session.user_id ?? data.user_id ?? ''),
      project_id: String(session.project_id ?? data.project_id ?? ''),
      permissions: (session.permissions as string[]) || [],
      mint_id: typeof data.mint_id === 'string' ? data.mint_id : undefined,
      jti: typeof data.jti === 'string' ? data.jti : (session.jti as string | undefined),
      authz_generation:
        typeof data.authz_generation === 'number'
          ? data.authz_generation
          : typeof session.authz_generation === 'number'
            ? session.authz_generation
            : undefined,
    };
    this.setTokens(authTokens);
    const sessionApiKey = session.api_key;
    if (sessionApiKey && typeof sessionApiKey === 'string') {
      const cleanApiKey = sessionApiKey.trim().replace(/\s+/g, '');
      if (cleanApiKey.length > 0) {
        this.client.setApiKey(cleanApiKey);
      }
    }
    this.authStateStore?.setState({
      state: 'authenticated',
      reason: 'login_success',
      user: {
        id: session.user_id as number,
        user_id: session.user_id as number,
        project_id: session.project_id as number,
        role: session.role as string,
      },
      tokens: {
        accessToken: authTokens.access_token,
        refreshToken: authTokens.refresh_token,
        apiKey: (session.api_key as string) || null,
        projectId: session.project_id as number,
      },
    });
    this.client.markRecentLoginSuccess();
    const sessionProjectId = normalizeProjectId(session.project_id);
    if (sessionProjectId) {
      this.client.updateConfig({ projectId: sessionProjectId });
    }
    this.emit('auth:login', authTokens);
    return authTokens;
  }

  /** Headless integrator — set API key (+ optional project) without password mint. */
  useApiKey(apiKey: string, projectId?: number): void {
    this.client.setApiKey(apiKey);
    if (projectId != null) {
      this.client.updateConfig({ projectId });
    }
  }

  /**
   * Device Code grant wrapper — POST /oauth2/device/authorize then poll token endpoint.
   * Returns issued tokens / key metadata from the token response.
   */
  async loginWithDeviceCode(body: {
    client_id: string;
    scope?: string;
  }): Promise<Record<string, unknown>> {
    return this.errorHandler.executeWithErrorHandling(async () => {
      const authRes = await this.client.post(
        '/oauth2/device/authorize',
        { client_id: body.client_id, scope: body.scope || 'mcp:execute agents:run' },
        { skipAuthStateCheck: true },
      );
      const device = authRes.data as Record<string, unknown>;
      const deviceCode = String(device.device_code || '');
      const interval = Math.max(2, Number(device.interval) || 5);
      const expiresIn = Math.max(30, Number(device.expires_in) || 600);
      const deadline = Date.now() + expiresIn * 1000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, interval * 1000));
        try {
          const tokenRes = await this.client.post(
            '/oauth2/token',
            {
              grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
              device_code: deviceCode,
              client_id: body.client_id,
            },
            { skipAuthStateCheck: true },
          );
          return tokenRes.data as Record<string, unknown>;
        } catch (pollErr: any) {
          const errCode = pollErr?.response?.data?.error;
          if (errCode === 'authorization_pending' || errCode === 'slow_down') {
            continue;
          }
          throw pollErr;
        }
      }
      throw new Error('Device Code authorization timed out');
    }, { operation: 'login_with_device_code' }) as Promise<Record<string, unknown>>;
  }

  /** Convert anonymous account created via login-by-key to a full user. */
  async convertAnonymousUser(body: {
    user_api_key: string;
    name: string;
    email: string;
    password: string;
  }): Promise<Record<string, unknown>> {
    return this.errorHandler.executeWithErrorHandling(async () => {
      const response = await this.client.post('/auth/convert-anonymous', body, {
        skipAuthStateCheck: true,
      });
      return response.data as Record<string, unknown>;
    }, { operation: 'convert_anonymous_user' }) as Promise<Record<string, unknown>>;
  }

  /**
   * Bootstrap an anonymous user for a project (ecosystem demos).
   * POST ``/auth/anonymous/provision`` — returns at least ``api_key`` and ``user_id``.
   * Optional ``anonBootstrapKey`` becomes header ``X-Anon-Bootstrap-Key`` when set.
   */
  async anonymousProvision(
    body: { project_id: number },
    options?: { anonBootstrapKey?: string },
  ): Promise<Record<string, unknown>> {
    return this.errorHandler.executeWithErrorHandling(async () => {
      const headers: Record<string, string> = {};
      if (options?.anonBootstrapKey) {
        headers['X-Anon-Bootstrap-Key'] = options.anonBootstrapKey;
      }
      const response = await this.client.post('/auth/anonymous/provision', body, {
        skipAuthStateCheck: true,
        ...(Object.keys(headers).length ? { headers } : {}),
      } as any);
      return (response.data ?? {}) as Record<string, unknown>;
    }, { operation: 'anonymous_provision' }) as Promise<Record<string, unknown>>;
  }

  /**
   * Обновление токена
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    try {
      const mintId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `mint-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const response = await this.client.post(
        '/auth/refresh',
        { refresh_token: refreshToken, mint_id: mintId },
        {
          skipAuthStateCheck: true,
          headers: {
            'Idempotency-Key': mintId,
            'X-Mint-Id': mintId,
          },
        }
      );
      this.emit('auth:refresh', response.data);

      const data = response.data as Record<string, unknown> | null;
      if (!data || typeof data !== 'object') {
        throw new UnauthorizedError('Refresh failed: empty token response');
      }
      const access =
        (typeof data.access_token === 'string' && data.access_token) ||
        (typeof (data.session as { user_token?: string } | undefined)?.user_token === 'string'
          ? (data.session as { user_token: string }).user_token
          : null);
      if (!access) {
        throw new UnauthorizedError('Refresh failed: empty token response');
      }
      const tokens: AuthTokens = {
        access_token: access,
        refresh_token:
          (typeof data.refresh_token === 'string' && data.refresh_token) ||
          access,
        token_type:
          (typeof data.token_type === 'string' && data.token_type) || 'Bearer',
        expires_in:
          typeof data.expires_in === 'number' ? data.expires_in : 86400,
        user_id:
          typeof data.user_id === 'string' || typeof data.user_id === 'number'
            ? String(data.user_id)
            : undefined,
        project_id:
          typeof data.project_id === 'string' || typeof data.project_id === 'number'
            ? String(data.project_id)
            : undefined,
        mint_id: typeof data.mint_id === 'string' ? data.mint_id : mintId,
        jti: typeof data.jti === 'string' ? data.jti : undefined,
        authz_generation:
          typeof data.authz_generation === 'number'
            ? data.authz_generation
            : undefined,
      };
      this.authStateStore?.setState({
        state: 'authenticated',
        reason: 'refresh_success',
        tokens: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          apiKey: this.client.getApiKey(),
          projectId: tokens.project_id
        }
      });

      return tokens;
    } catch (error) {
      this.authStateStore?.setState({
        state: 'session_expired',
        reason: 'refresh_failed'
      });
      this.emit('auth:refresh:failed', error);
      throw error;
    }
  }

  async refreshToken(data: { refresh_token: string } | string): Promise<AuthTokens> {
    return this.refresh(typeof data === 'string' ? data : data.refresh_token);
  }

  /**
   * Выход из системы
   */
  async logout(): Promise<void> {
    this.invalidateSessionBootstrap('logout');
    this.getCurrentUserInFlight = null;
    try {
      this.authStateStore?.setState({
        state: 'logging_out',
        reason: 'manual_logout',
        tokens: {
          accessToken: this.client.getAuthToken(),
          apiKey: this.client.getApiKey()
        }
      });
      await this.client.post('/auth/logout', undefined, { skipAuthStateCheck: true });
      // Clear tokens both in client and storage
      this.client.setAuthToken(null);
      this.client.setApiKey(null);
      if (typeof window !== 'undefined') {
        [
          'access_token',
          'refresh_token',
          'api_key',
          'user_token',
          'session_uuid',
          'user_id',
          'project_id',
          'login_email',
          'login_password',
          'login_project_id',
          'oauth_attempt_id',
        ].forEach(k => {
          removeStorageItem(k);
          window.sessionStorage?.removeItem(k);
        });
      }
      this.authStateStore?.reset('manual_logout');
      // Clear all HTTP caches (in-memory + ProteinCache IndexedDB) so the next
      // user logging in doesn't receive stale responses from the previous session.
      if (typeof this.client.clearCache === 'function') {
        this.client.clearCache();
      }
      this.emit('auth:logout');
    } catch (error) {
      this.emit('auth:logout:failed', error);
      throw error;
    }
  }

  /**
   * Получение текущего пользователя (single-flight per SDK instance).
   */
  async getCurrentUser(options?: { force?: boolean }): Promise<UserProfile> {
    // H3b-02 / D5: reuse bootstrap user unless force (avoids duplicate /auth/me).
    if (!options?.force && this.lastSessionBootstrap?.user) {
      return this.lastSessionBootstrap.user;
    }
    if (!options?.force && this.getCurrentUserInFlight) {
      return this.getCurrentUserInFlight;
    }
    if (options?.force && this.getCurrentUserInFlight) {
      try {
        await this.getCurrentUserInFlight;
      } catch {
        /* prior flight failed — continue with refresh */
      }
    }
    const work = this.fetchCurrentUserOnce();
    this.getCurrentUserInFlight = work;
    try {
      return await work;
    } finally {
      if (this.getCurrentUserInFlight === work) {
        this.getCurrentUserInFlight = null;
      }
    }
  }

  /**
   * Session bootstrap (v1 alias of ``/auth/me``). Use for cold-start single round-trip.
   */
  async getSessionBootstrap(): Promise<UserProfile> {
    const payload = await this.getSessionBootstrapPayload();
    return payload.user;
  }

  /** Last successful bootstrap payload (for SPA prefetch dedupe without a second HTTP call). */
  getLastSessionBootstrap(): SessionBootstrapPayload | null {
    return this.lastSessionBootstrap;
  }

  /**
   * Cold-start session restore: user + settings_summary + accessible_project_ids in one GET.
   * ``force: true`` discards any in-flight bootstrap (abort) and never awaits the stale flight —
   * critical after mint when prior JTIs are terminated (AUTH-RACE-02 / Incident 21:37).
   */
  async getSessionBootstrapPayload(options?: { force?: boolean }): Promise<SessionBootstrapPayload> {
    if (!options?.force && this.sessionBootstrapInFlight) {
      return this.sessionBootstrapInFlight;
    }
    if (!options?.force && this.lastSessionBootstrap) {
      return this.lastSessionBootstrap;
    }
    if (options?.force) {
      // Never await stale in-flight — mint terminates other JTIs; awaiting old bootstrap = 401.
      this.invalidateSessionBootstrap('force_login');
    }
    const work = this.fetchSessionBootstrapPayloadOnce();
    this.sessionBootstrapInFlight = work;
    try {
      return await work;
    } finally {
      if (this.sessionBootstrapInFlight === work) {
        this.sessionBootstrapInFlight = null;
      }
    }
  }

  private async fetchSessionBootstrapPayloadOnce(): Promise<SessionBootstrapPayload> {
    const ac = new AbortController();
    this.sessionBootstrapAbort = ac;
    let response;
    try {
      response = await this.client.get('/auth/me/bootstrap', undefined, {
        skipBatching: true,
        skipCache: true,
        signal: ac.signal,
      });
      if (ac.signal.aborted) {
        throw new Error('Session bootstrap aborted (stale jti discarded)');
      }
      if (this.sessionBootstrapAbort === ac) {
        this.sessionBootstrapAbort = null;
      }
    } catch (err) {
      if (this.sessionBootstrapAbort === ac) {
        this.sessionBootstrapAbort = null;
      }
      if (ac.signal.aborted) {
        throw new Error('Session bootstrap aborted (stale jti discarded)');
      }
      if (err instanceof UnauthorizedError) {
        this.lastSessionBootstrap = null;
        throw err;
      }
      throw err;
    }
    if (response.status === 401) {
      this.lastSessionBootstrap = null;
      throw new UnauthorizedError('Session bootstrap failed', {
        status: 401,
        code: 'session_expired',
        traceId: response.traceId,
      });
    }
    const body = response.data as {
      success?: boolean;
      data?: Record<string, unknown>;
      settings_summary?: SessionBootstrapSettingsSummary;
      accessible_project_ids?: number[];
      accessible_project_ids_digest?: string;
      membership_generation?: number;
    };
    if (!body?.success || !body.data) {
      throw new UnauthorizedError('Session bootstrap failed', {
        status: response.status || 401,
        code: 'session_expired',
        traceId: response.traceId,
      });
    }
    const user = this.mapUserProfileFromMePayload(body.data);
    const payload: SessionBootstrapPayload = {
      user,
      settings_summary: body.settings_summary,
      accessible_project_ids: body.accessible_project_ids,
      accessible_project_ids_digest: body.accessible_project_ids_digest,
      membership_generation: body.membership_generation,
    };
    if (ac.signal.aborted) {
      throw new Error('Session bootstrap aborted (stale jti discarded)');
    }
    this.lastSessionBootstrap = payload;
    return payload;
  }

  private mapUserProfileFromMePayload(userData: Record<string, unknown>): UserProfile {
    const userId = (userData.user_id ?? userData.id) as number;
    if (!userId) {
      throw new Error('User ID is required but not found in response');
    }
    return {
      user_id: userId,
      email: (userData.email as string) || '',
      username: (userData.username as string) || 'dev_user',
      role: (userData.role as string) || 'admin',
      project_id: (userData.project_id as number) || 1,
      is_active: userData.is_active !== false,
      created_at: (userData.created_at as string) || new Date().toISOString(),
      updated_at: (userData.updated_at as string) || new Date().toISOString(),
      feature_availability: userData.feature_availability as Record<string, unknown> | undefined,
    };
  }

  private async fetchCurrentUserOnce(): Promise<UserProfile> {
    const tokenBeforeRequest = this.client.getAuthToken();
    const apiKeyBeforeRequest = this.client.getApiKey();
    const authState = this.authStateStore?.getState();

    logger.debug('🔍 AgentAuth.getCurrentUser - Before request', {
      hasToken: !!tokenBeforeRequest,
      tokenLength: tokenBeforeRequest?.length || 0,
      tokenPreview: tokenBeforeRequest ? maskSecretForLog(tokenBeforeRequest) : 'null',
      hasApiKey: !!apiKeyBeforeRequest,
      apiKeyLength: apiKeyBeforeRequest?.length || 0,
      apiKeyPreview: apiKeyBeforeRequest ? maskSecretForLog(apiKeyBeforeRequest) : 'null',
      authState: authState,
    });

    let response;
    try {
      response = await this.client.get('/auth/me', undefined, {
        skipBatching: true,
        skipCache: true,
      });
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        throw err;
      }
      throw err;
    }
    if (response.status === 401) {
      throw new UnauthorizedError('Failed to get current user', {
        status: 401,
        code: 'session_expired',
        traceId: response.traceId,
      });
    }
    const data = response.data;
    if (data?.success && data.data) {
      return this.mapUserProfileFromMePayload(data.data as Record<string, unknown>);
    }
    throw new UnauthorizedError('Failed to get current user', {
      status: response.status || 401,
      code: 'session_expired',
      traceId: response.traceId,
    });
  }

  /**
   * Persist mint tokens: sessionStorage (tab-scoped SPA) + localStorage (legacy mirror).
   * Session OS V3.3 / FLOW-06 — FE getAccessToken is session-first.
   */
  setTokens(tokens: AuthTokens | null | undefined): void {
    // Guard: aborted/OOM login historically yielded null →
    // "can't access property access_token, a is null" in minified clients.
    if (!tokens || typeof tokens !== 'object') {
      throw new UnauthorizedError('setTokens: empty token payload');
    }
    if (typeof window !== 'undefined' && tokens.access_token) {
      writeBrowserAccessToken(tokens.access_token);
      // Prefixed key for older readers
      setStorageItem('access_token', tokens.access_token);
    }
    if (typeof window !== 'undefined' && window.localStorage && tokens.refresh_token) {
      try {
        localStorage.setItem('refresh_token', tokens.refresh_token);
        sessionStorage?.setItem('refresh_token', tokens.refresh_token);
      } catch {
        /* ignore */
      }
      setStorageItem('refresh_token', tokens.refresh_token);
    }

    // Set token in HTTP client for immediate use
    this.client.setAuthToken(tokens.access_token ?? null);
  }


  /**
   * Получение профиля пользователя
   */
  async getProfile(): Promise<UserProfile> {
    // ✅ CRITICAL: Use /profile endpoint (new structure - /api/profile or /api/user/profile)
    const response = await this.client.get('/profile');
    return response.data;
  }

  /**
   * Обновление профиля пользователя
   */
  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const response = await this.client.put('/profile/', profileData);
    this.evictProfileRelatedCaches();
    return response.data;
  }

  /**
   * Изменение пароля пользователя
   */
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    return await this.errorHandler.executeWithErrorHandling(async () => {
      try {
        // Convert camelCase to snake_case for backend
        const backendData = {
          current_password: data.currentPassword,
          new_password: data.newPassword
        };
        const response = await retryManager.executeWithRetry(
          () => this.client.post('/auth/change-password', backendData)
        );
        return response.data;
      } catch (error) {
        throw this.transformError(error);
      }
    }, { operation: 'changePassword' }) as Promise<{ success: boolean; message: string }>;
  }


  /**
   * Получение статуса 2FA
   */
  async get2FAStatus(): Promise<{ enabled: boolean }> {
    const response = await this.client.get('/auth/2fa-status');
    return response.data;
  }

  /**
   * Получение предупреждений безопасности
   */
  async getSecurityAlerts(): Promise<{
    alerts: Array<{
      id: string;
      type: string;
      message: string;
      timestamp: string;
      is_read: boolean;
    }>;
  }> {
    const response = await this.client.get('/auth/security-alerts');
    return response.data;
  }



  /**
   * Управление сессиями пользователя
   */
  async getSessions(): Promise<{
    sessions_by_project: Record<number, Array<{
      session_uuid: string;
      user_id: number;
      project_id: number;
      project_name?: string;
      project_description?: string;
      device_fingerprint?: string;
      ip_address?: string;
      user_agent?: string;
      created_at: string;
      last_used?: string;
      expires_at: string;
      refresh_expires_at: string;
      is_active: boolean;
      is_current?: boolean;
      device_info?: {
        browser: string;
        os: string;
        device_type: string;
      };
      location_info?: {
        country: string;
        city: string;
        timezone: string;
      };
    }>>;
    total_sessions: number;
    active_sessions: number;
    expired_sessions: number;
    projects_count: number;
  }> {
    const response = await this.client.get('/sessions');
    return response.data;
  }

  /**
   * Установка имени пользователя
   */
  async setUsername(username: string): Promise<{
    success: boolean;
    message: string;
    username: string;
  }> {
    const response = await this.client.put('/profile/username', { username });
    this.evictProfileRelatedCaches();
    return response.data;
  }

  /**
   * Установка биографии пользователя
   */
  async setBio(bio: string): Promise<{
    success: boolean;
    message: string;
    bio: string;
  }> {
    const response = await this.client.put('/profile/bio', { bio });
    this.evictProfileRelatedCaches();
    return response.data;
  }

  /**
   * Создание API ключа (устаревший метод - используйте проектные ключи)
   * @deprecated Используйте проектные API ключи вместо персональных
   */
  async createApiKey(data: {
    name: string;
    project_id: number;
    scopes: string[];
    rate_limit_per_minute?: number;
    rate_limit_per_hour?: number;
  }): Promise<{
    success: boolean;
    message: string;
    api_key: string;
    key_id: string;
  }> {
    logger.warn('createApiKey is deprecated. Use project-level API keys instead.');
    const response = await this.client.post('/profile/api-keys', data);
    this.evictProfileRelatedCaches();
    return response.data;
  }

  /**
   * Получение списка API ключей пользователя (устаревший метод)
   * @deprecated API ключи теперь управляются на уровне проекта
   */
  async getApiKeys(): Promise<{
    success: boolean;
    message: string;
    keys: Array<{
      id: string;
      name: string;
      scopes: string[];
      created_at: string;
      last_used?: string;
      is_active: boolean;
    }>;
  }> {
    logger.warn('getApiKeys is deprecated. API keys are now managed at project level.');
    const response = await this.client.get('/profile/api-keys');
    return response.data;
  }

  /**
   * Удаление API ключа (устаревший метод)
   * @deprecated Используйте управление ключами на уровне проекта
   */
  async deleteApiKey(keyId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    logger.warn('deleteApiKey is deprecated. Use project-level API key management instead.');
    const data = await executeOrNotFoundFallback(
      async () => (await this.client.delete(`/profile/api-keys/${keyId}`)).data,
      { success: true, message: 'API key already removed' }
    );
    this.evictProfileRelatedCaches();
    return data;
  }

  /**
   * Включение/выключение 2FA
   */
  async toggle2FA(enabled: boolean): Promise<{
    success: boolean;
    message: string;
    enabled: boolean;
  }> {
    const response = await this.client.post('/profile/toggle-2fa', { enabled });
    this.evictProfileRelatedCaches();
    void this.client.evictCacheByUrl('/auth/2fa-status').catch((e) => {
      logger.debug('toggle2FA: evict 2fa-status cache failed', e);
    });
    return response.data;
  }

  /**
   * Загрузка аватара пользователя
   */
  async uploadAvatar(file: File): Promise<{
    success: boolean;
    message: string;
    avatar_url?: string;
  }> {
    logger.debug('SDK uploadAvatar: creating FormData with file:', { name: file.name, type: file.type, size: file.size });
    const formData = new FormData();
    formData.append('avatar', file);

    // Log FormData contents (for debugging)
    // Note: FormData.keys() and entries() may not be available in all TypeScript environments
    try {
      const formDataAny = formData as any;
      if (formDataAny.keys && formDataAny.entries) {
        logger.debug('SDK uploadAvatar: FormData created, keys:', [...formDataAny.keys()]);
        for (const [key, value] of formDataAny.entries()) {
          logger.debug(`SDK uploadAvatar: FormData entry ${key}:`, { value, type: typeof value });
        }
      } else {
        logger.debug('SDK uploadAvatar: FormData created');
      }
    } catch (e) {
      // FormData methods may not be available in all environments
      logger.debug('SDK uploadAvatar: FormData created (keys/entries not available)');
    }

    const response = await this.client.post('/profile/avatar', formData);
    logger.debug('SDK uploadAvatar: response received:', response.data);
    this.evictProfileRelatedCaches();
    return response.data;
  }

  /**
   * Установка отображаемого имени
   */
  async setDisplayName(displayName: string): Promise<{
    success: boolean;
    message: string;
    display_name: string;
  }> {
    const response = await this.client.put('/profile/display-name', { display_name: displayName });
    this.evictProfileRelatedCaches();
    return response.data;
  }

  /**
   * Завершение сессии
   */
  async terminateSession(sessionUuid: string, reason?: string): Promise<{
    success: boolean;
    message: string;
    session_uuid: string;
    terminated_at: string;
  }> {
    const data = await executeOrNotFoundFallback(
      async () =>
        (
          await this.client.delete(`/sessions/${sessionUuid}`, {
            body: reason ? { reason } : undefined
          })
        ).data,
      {
        success: true,
        message: 'Session already ended',
        session_uuid: sessionUuid,
        terminated_at: new Date().toISOString()
      }
    );
    this.evictSessionsCaches();
    return data;
  }

  async revokeSession(sessionUuid: string, reason?: string): Promise<{
    success: boolean;
    message: string;
    session_uuid: string;
    terminated_at: string;
  }> {
    return this.terminateSession(sessionUuid, reason);
  }

  /**
   * Завершение всех сессий
   */
  async terminateAllSessions(reason?: string): Promise<{
    success: boolean;
    message: string;
    terminated_count: number;
    failed_count: number;
    terminated_sessions: string[];
    failed_sessions: string[];
    terminated_at: string;
  }> {
    const response = await this.client.delete('/sessions/all', {
      body: reason ? { reason } : undefined
    });
    this.evictSessionsCaches();
    return response.data;
  }

  /**
   * Получение сессий текущего пользователя, сгруппированных по проектам
   */
  async getMySessions(): Promise<{
    sessions_by_project: Record<number, Array<{
      session_uuid: string;
      user_id: number;
      project_id: number;
      project_name: string;
      project_description?: string;
      device_info: {
        device_type: string;
        os: string;
        browser: string;
      };
      location_info: {
        country: string;
        city: string;
        ip_address: string;
      };
      created_at: string;
      last_used: string;
      expires_at: string;
      is_current: boolean;
    }>>;
    total_sessions: number;
    active_sessions: number;
    expired_sessions: number;
    projects_count: number;
  }> {
    // Use the new user sessions endpoint with project grouping
    const response = await this.client.get('/sessions');
    return response.data || response;
  }

  async getActiveSessions(): Promise<Awaited<ReturnType<AgentAuth['getSessions']>>> {
    return this.getSessions();
  }

  // ===== JSON Profile Data Methods =====

  /**
   * Получение JSON профильных данных пользователя
   */
  async getProfileData(): Promise<ProfileData> {
    const response = await this.client.get('/auth/profile-data');
    return response.data;
  }

  /**
   * Обновление JSON профильных данных пользователя
   */
  async updateProfileData(data: Partial<ProfileData>): Promise<ProfileData> {
    const response = await this.client.put('/auth/profile-data', data);
    this.evictProfileRelatedCaches();
    return response.data;
  }

  /**
   * Получение JSON настроек пользователя
   */
  async getSettings(options?: any): Promise<UserSettings> {
    const response = await this.client.get('/auth/settings', undefined, options);
    return response.data;
  }

  /**
   * Обновление JSON настроек пользователя
   */
  async updateSettings(data: Partial<UserSettings>, options?: any): Promise<UserSettings> {
    const response = await this.client.put('/auth/settings', data, options);
    return response.data;
  }

  // ===== Dot Notation Access Methods =====


  // ===== Type-Safe Profile Methods =====

  /**
   * Получение имени пользователя
   */
  async getUsername(): Promise<string | null> {
    try {
      const response = await this.getProfileValue('username');
      return response.value;
    } catch {
      return null;
    }
  }


  /**
   * Получение отображаемого имени
   */
  async getDisplayName(): Promise<string | null> {
    try {
      const response = await this.getProfileValue('display_name');
      return response.value;
    } catch {
      return null;
    }
  }


  /**
   * Получение биографии пользователя
   */
  async getBio(): Promise<string | null> {
    try {
      const response = await this.getProfileValue('bio');
      return response.value;
    } catch {
      return null;
    }
  }


  /**
   * Получение социальных ссылок
   */
  async getSocialLinks(): Promise<SocialLinks | null> {
    try {
      const response = await this.getProfileValue('social_links');
      return response.value;
    } catch {
      return null;
    }
  }

  /**
   * Установка социальной ссылки
   */
  async setSocialLink(platform: string, url: string): Promise<void> {
    try {
      new URL(url);
    } catch {
      throw new Error('Invalid URL format.');
    }
    await this.setProfileValue(`social_links.${platform}`, url);
  }

  // ===== Type-Safe Settings Methods =====

  /**
   * Получение темы пользователя
   */
  async getTheme(): Promise<'light' | 'dark' | 'system'> {
    try {
      const response = await this.getSettingsValue('theme');
      const theme = response.value;
      if (theme && ['light', 'dark', 'system'].includes(theme)) {
        return theme;
      }
      return 'system';
    } catch {
      return 'system';
    }
  }

  /**
   * Установка темы пользователя
   */
  async setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    await this.setSettingsValue('theme', theme);
  }

  /**
   * Получение языка пользователя
   */
  async getLanguage(): Promise<string> {
    try {
      const response = await this.getSettingsValue('language');
      const language = response.value;
      if (language && typeof language === 'string' && language.length === 2) {
        return language;
      }
      return 'en';
    } catch {
      return 'en';
    }
  }

  /**
   * Установка языка пользователя
   */
  async setLanguage(language: string): Promise<void> {
    if (!language || typeof language !== 'string' || language.length !== 2) {
      throw new Error('Language must be a 2-character code');
    }
    await this.setSettingsValue('language', language);
  }

  /**
   * Получение настроек уведомлений
   */
  async getNotifications(): Promise<NotificationSettings | null> {
    try {
      const response = await this.getSettingsValue('notifications');
      return response.value;
    } catch {
      return null;
    }
  }

  /**
   * Установка настройки уведомлений
   */
  async setNotification(type: string, enabled: boolean): Promise<void> {
    await this.setSettingsValue(`notifications.${type}`, enabled);
  }

  /**
   * Получение настроек приватности
   */
  async getPrivacy(): Promise<PrivacySettings | null> {
    try {
      const response = await this.getSettingsValue('privacy');
      return response.value;
    } catch {
      return null;
    }
  }

  /**
   * Установка настройки приватности
   */
  async setPrivacy(setting: string, value: boolean): Promise<void> {
    await this.setSettingsValue(`privacy.${setting}`, value);
  }

  /**
   * Получение настроек дашборда
   */
  async getDashboard(): Promise<DashboardSettings | null> {
    try {
      const response = await this.getSettingsValue('dashboard');
      return response.value;
    } catch {
      return null;
    }
  }

  /**
   * Установка макета дашборда
   */
  async setDashboardLayout(layout: 'compact' | 'comfortable'): Promise<void> {
    await this.setSettingsValue('dashboard.layout', layout);
  }

  // ===== Avatar Methods =====
  

  /**
   * Получение аватара пользователя (для внешних проектов)
   */
  async getUserAvatar(userId: number): Promise<{ user_id: number; avatar: string; has_avatar: boolean }> {
    const response = await this.client.get(`/auth/avatar/${userId}`);
    return response.data;
  }

  /**
   * Проверка наличия аватара у пользователя
   */
  async checkUserAvatar(userId: number): Promise<{ user_id: number; has_avatar: boolean; in_agentstack: boolean }> {
    const response = await this.client.get(`/auth/avatar/${userId}/check`);
    return response.data;
  }

  /**
   * Получение аватара текущего пользователя из profile_data
   */
  async getAvatar(): Promise<string | null> {
    try {
      const response = await this.getProfileValue('avatar');
      return response.value;
    } catch {
      return null;
    }
  }

  /**
   * Установка аватара текущего пользователя в profile_data
   */
  async setAvatar(avatarDataUrl: string): Promise<void> {
    await this.setProfileValue('avatar', avatarDataUrl);
  }

  // ============================================================================
  // OAUTH METHODS
  // ============================================================================

  /**
   * Получение списка поддерживаемых OAuth провайдеров
   */
  async getOAuthProviders(): Promise<OAuthProvider[]> {
    const response = await this.client.get('/auth/oauth/providers');
    return response.data;
  }

  /**
   * Получение подключенных OAuth провайдеров пользователя
   */
  async getConnectedOAuthProviders(): Promise<ConnectedOAuthProvider[]> {
    try {
      const response = await this.client.get('/auth/oauth/providers/connected');
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('Error getting connected OAuth providers:', error);
      return [];
    }
  }

  /**
   * Подключение OAuth провайдера
   */
  async connectOAuthProvider(oauthData: OAuthConnectRequest): Promise<{ message: string; provider: string }> {
    const response = await this.client.post('/auth/oauth/connect', oauthData);
    this.evictProfileRelatedCaches();
    this.evictOAuthConnectedCaches();
    return response.data;
  }

  /**
   * Отключение OAuth провайдера
   */
  async disconnectOAuthProvider(provider: string): Promise<{ message: string; provider: string }> {
    const data = await executeOrNotFoundFallback(
      async () => (await this.client.delete(`/auth/oauth/providers/${provider}`)).data,
      { message: 'Provider already disconnected', provider }
    );
    this.evictProfileRelatedCaches();
    this.evictOAuthConnectedCaches();
    return data;
  }

  /**
   * Проверка подключен ли OAuth провайдер
   */
  async isOAuthProviderConnected(provider: string): Promise<boolean> {
    try {
      const providers = await this.getConnectedOAuthProviders();
      return providers.some(p => p.provider === provider && p.is_active);
    } catch {
      return false;
    }
  }

  /**
   * Получение информации о конкретном OAuth провайдере
   */
  async getOAuthProviderInfo(provider: string): Promise<ConnectedOAuthProvider | null> {
    try {
      const providers = await this.getConnectedOAuthProviders();
      return providers.find(p => p.provider === provider) || null;
    } catch {
      return null;
    }
  }

  /**
   * Получение URL для авторизации OAuth провайдера
   */
  async getOAuthAuthorizationUrl(provider: string): Promise<{ authorization_url: string; state: string; provider: string }> {
    const response = await this.client.get(`/auth/oauth/authorize/${provider}`);
    return response.data;
  }

  /**
   * Обработка OAuth callback (для демонстрации)
   */
  async handleOAuthCallback(provider: string, code: string, state: string): Promise<{ message: string; user: any; provider: string }> {
    const response = await this.client.get(`/auth/oauth/callback/${provider}?code=${code}&state=${state}`);
    this.evictProfileRelatedCaches();
    this.evictOAuthConnectedCaches();
    return response.data;
  }

  // ===== Security Methods =====

  // ===== Dot Notation Access Methods =====

  /**
   * Получение значения из profile_data по dot notation пути
   */
  async getProfileValue(path: string): Promise<{ value: any }> {
    const response = await this.client.get(`/auth/profile-data/get?path=${encodeURIComponent(path)}`);
    return response.data;
  }

  /**
   * Установка значения в profile_data по dot notation пути
   */
  async setProfileValue(path: string, value: any): Promise<void> {
    await this.client.post('/auth/profile-data/set', { path, value });
    this.evictProfileRelatedCaches();
  }

  /**
   * Получение значения из settings по dot notation пути
   */
  async getSettingsValue(path: string): Promise<{ value: any }> {
    const response = await this.client.get(
      `/auth/settings/get?path=${encodeURIComponent(path)}`,
      undefined,
      { skipBatching: true, skipCache: true },
    );
    // Сервер возвращает { success: true, path: "...", value: ... }
    // Извлекаем value из ответа
    if (response.data && typeof response.data === 'object') {
      return { value: response.data.value ?? null };
    }
    return { value: null };
  }

  /**
   * Установка значения в settings по dot notation пути
   */
  async setSettingsValue(path: string, value: any): Promise<void> {
    await this.client.post('/auth/settings/set', { path, value });
  }

  // ===== Widget Methods =====
  
  /**
   * Инициализация безопасного виджета
   * Согласно философии - пароли НИКОГДА не покидают виджет
   */
  initSecureWidget(config: WidgetConfig): void {
    this.widgetConfig = config;
    
    // Устанавливаем глобальную переменную для виджета
    if (typeof window !== 'undefined') {
      (window as any).AGENTSTACK_WIDGET_CONFIG = config;
      (window as any).AGENTSTACK_API_BASE = config.apiBase || AGENTSTACK_PRODUCTION_API_BASE;
    }
  }

  /**
   * Получение URL для виджета
   */
  getWidgetUrl(): string {
    if (!this.widgetConfig) {
      throw new Error('Widget not initialized. Call initSecureWidget() first.');
    }

    const params = new URLSearchParams({
      project_id: this.widgetConfig.projectId,
      theme: this.widgetConfig.theme || 'light',
      language: this.widgetConfig.language || 'en'
    });

    const baseUrl = this.widgetConfig.apiBase || AGENTSTACK_PRODUCTION_ORIGIN;
    return `${baseUrl}/widget/auth?${params.toString()}`;
  }

  /**
   * Валидация origin для безопасности
   */
  private validateOrigin(origin: string): boolean {
    if (!this.widgetConfig) return false;
    
    const allowedOrigins = this.widgetConfig.allowedOrigins || ['*'];
    if (allowedOrigins.includes('*')) return true;
    
    return allowedOrigins.includes(origin);
  }

  /**
   * Подпись сообщения для безопасности
   */
  private signMessage(message: any): string {
    const timestamp = Date.now();
    const payload = JSON.stringify({ ...message, timestamp });
    // В реальном приложении здесь должно быть настоящее шифрование
    return btoa(payload + '_AGENTSTACK_SECURE');
  }

  /**
   * Обработка сообщений от виджета
   */
  handleWidgetMessage(event: MessageEvent): WidgetAuthMessage | null {
    // Валидация origin
    if (!this.validateOrigin(event.origin)) {
      console.warn('Invalid origin:', event.origin);
      return null;
    }

    try {
      const message: WidgetAuthMessage = event.data;
      
      // Валидация подписи (упрощенная для демонстрации)
      if (message.signature !== 'secure_signature') {
        console.warn('Invalid message signature');
        return null;
      }

      return message;
    } catch (error) {
      console.error('Invalid message format:', error);
      return null;
    }
  }

  /**
   * Отправка сообщения в виджет
   */
  sendMessageToWidget(iframe: HTMLIFrameElement, message: Partial<WidgetAuthMessage>): void {
    if (iframe.contentWindow) {
      const fullMessage: WidgetAuthMessage = {
        type: message.type || 'AUTH_REQUEST',
        payload: message.payload || {},
        timestamp: Date.now(),
        signature: this.signMessage(message)
      };
      
      iframe.contentWindow.postMessage(fullMessage, '*');
    }
  }

  /**
   * Создание iframe для виджета
   */
  createWidgetIframe(container: HTMLElement): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.src = this.getWidgetUrl();
    iframe.style.width = '100%';
    iframe.style.height = '300px';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
    iframe.setAttribute('title', 'AgentStack Secure Auth');
    
    container.appendChild(iframe);
    return iframe;
  }

  /**
   * Получение конфигурации виджета
   */
  getWidgetConfig(): WidgetConfig | null {
    return this.widgetConfig;
  }
}





