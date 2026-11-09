/**
 * Directed-edit vocabulary (behavioral SoT: shared/atoms/edit_intent.py).
 * For preview/apply use REST/MCP dry_run or port apply_edits from Python tests.
 */

export { DIRECTED_EDIT_OPS, MAX_EDIT_OPS } from './directedEditConstants';
export type { ApplyEditsOptions, ApplyEditsResult } from './applyEdits';
export { applyEdits, leafDigest } from './applyEdits';
