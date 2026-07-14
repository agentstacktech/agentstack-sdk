/**
 * Portable Update Plane beacon shapes (`sdk.pwa.update_plane.gen2`).
 */

export type AppUpdateBeaconEvent =
  | { type: 'pwa.update.signal'; reason: string }
  | { type: 'pwa.update.need_refresh'; reason: string }
  | { type: 'pwa.update.reload_scheduled'; reason: string; mode: string }
  | { type: 'pwa.update.duplicate_suppressed'; reason: string }
  | { type: 'pwa.update.check_ms'; ms: number }
  | { type: 'pwa.update.controllerchange' }
  | { type: 'pwa.update.user_reload'; reason: string }
  | { type: 'pwa.update.state_transition'; from: string; to: string; reason: string }
  | { type: 'pwa.update.from_error_boundary'; reason: string }
  | { type: 'pwa.update.ineffective_reload'; identity: string }
  | { type: 'pwa.update.deep_recovery'; identity: string }
  | { type: 'pwa.update.force_floor'; local: string; min: string }
  | { type: 'pwa.probe.invalid_build_id'; source: string; bodyLen: number }
  | { type: 'pwa.probe.skipped'; reason: string }
  | { type: 'pwa.sw.precache_updated' };
