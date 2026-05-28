/**
 * Normalize legacy json_rules / catalog rows to RuleDocumentV1.
 * Genetic tag: sdk.logic.blueprints.gen1
 */

import type { RuleDocumentV1 } from './types';

export class RuleDocumentError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

function chainDoBlocks(doSteps: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  const blocks = doSteps.map((step, i) => ({
    id: (step.id as string) || `step_${i}`,
    type: 'processor',
    processor: step.processor,
    action: step.action,
    parameters: step.parameters || {},
  }));
  for (let i = 0; i < blocks.length - 1; i += 1) {
    (blocks[i] as Record<string, unknown>).next = blocks[i + 1];
  }
  return blocks;
}

export function convertLegacyJsonRules(jsonRules: {
  when?: Record<string, unknown>;
  do?: Array<Record<string, unknown>>;
}): RuleDocumentV1 {
  const when = jsonRules.when || {};
  const doSteps = jsonRules.do || [];
  const triggers: Array<Record<string, unknown>> = [];
  if (Object.keys(when).length > 0) {
    triggers.push({ type: 'condition', when });
  } else if (doSteps.length > 0) {
    triggers.push({ type: 'manual', id: 'legacy_manual' });
  }
  return {
    schemaVersion: 1,
    triggers,
    space: chainDoBlocks(doSteps),
    editor_metadata: {},
  };
}

export function normalizeRuleDocument(raw: unknown): RuleDocumentV1 {
  if (!raw || typeof raw !== 'object') {
    throw new RuleDocumentError('unsupported_shape');
  }
  const obj = raw as Record<string, unknown>;
  if (obj.schemaVersion === 1) {
    return {
      schemaVersion: 1,
      triggers: (obj.triggers as Array<Record<string, unknown>>) || [],
      schedulers: (obj.schedulers as Array<Record<string, unknown>>) || [],
      space: (obj.space as Array<Record<string, unknown>>) || [],
      editor_metadata: (obj.editor_metadata as Record<string, unknown>) || {},
    };
  }
  const jr = obj.json_rules as { when?: Record<string, unknown>; do?: Array<Record<string, unknown>> } | undefined;
  if (jr && (jr.when || jr.do)) {
    return convertLegacyJsonRules(jr);
  }
  if (obj.triggers || obj.blocks) {
    return {
      schemaVersion: 1,
      triggers: (obj.triggers as Array<Record<string, unknown>>) || [],
      space: (obj.blocks as Array<Record<string, unknown>>) || (obj.space as Array<Record<string, unknown>>) || [],
      editor_metadata: { source_blueprint: obj.id },
    };
  }
  throw new RuleDocumentError('unsupported_shape');
}
