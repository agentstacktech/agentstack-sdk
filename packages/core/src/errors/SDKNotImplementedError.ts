/**
 * Thrown when an SDK method has no REST backing yet (stable surface, explicit failure).
 */
export class SDKNotImplementedError extends Error {
  readonly code = 'not_implemented' as const;

  constructor(method: string) {
    super(`${method} is not yet exposed on the REST API`);
    this.name = 'SDKNotImplementedError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
