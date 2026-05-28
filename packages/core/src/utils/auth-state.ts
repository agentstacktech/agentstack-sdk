import { SimpleEventEmitter } from './event-emitter';
import type { AuthSnapshot, AuthState, AuthStateReason } from '../types';

/**
 * Centralized auth state store for SDK core.
 * Emits 'auth:state-changed' with the latest snapshot.
 */
export class AuthStateStore extends SimpleEventEmitter {
  private snapshot: AuthSnapshot = {
    state: 'unauthenticated',
    reason: 'bootstrap',
    updatedAt: Date.now()
  };

  getSnapshot(): AuthSnapshot {
    return { ...this.snapshot };
  }

  getState(): AuthState {
    return this.snapshot.state;
  }

  isAuthenticated(): boolean {
    return this.snapshot.state === 'authenticated';
  }

  /**
   * Update state and emit change event with deep-cloned snapshot
   */
  setState(next: {
    state: AuthState;
    reason?: AuthStateReason;
    user?: AuthSnapshot['user'];
    tokens?: AuthSnapshot['tokens'];
  }): AuthSnapshot {
    this.snapshot = {
      ...this.snapshot,
      ...next,
      updatedAt: Date.now()
    };

    const cloned: AuthSnapshot = {
      ...this.snapshot,
      user: this.snapshot.user ? { ...this.snapshot.user } : undefined,
      tokens: this.snapshot.tokens ? { ...this.snapshot.tokens } : undefined
    };

    this.emit('auth:state-changed', cloned);
    return cloned;
  }

  /**
   * Force unauthenticated state (used after logout or hard failures)
   */
  reset(reason: AuthStateReason = 'forced_unauthenticated'): AuthSnapshot {
    return this.setState({
      state: 'unauthenticated',
      reason,
      user: undefined,
      tokens: undefined
    });
  }
}
