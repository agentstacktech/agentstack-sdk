import type { BlueprintDraft, RuleBlueprint, RuleDocumentV1 } from '../types';
import { normalizeRuleDocument } from '../normalizeRuleDocument';

function applyFieldValues(
  blocks: Array<Record<string, unknown>>,
  fieldValues: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const json = JSON.stringify(blocks);
  let out = json;
  for (const [key, value] of Object.entries(fieldValues)) {
    out = out.split(`{{ field.${key} }}`).join(String(value));
    out = out.split(`{{field.${key}}}`).join(String(value));
  }
  return JSON.parse(out) as Array<Record<string, unknown>>;
}

export function materializeRule(
  blueprint: RuleBlueprint,
  draft: BlueprintDraft,
): RuleDocumentV1 {
  const base = normalizeRuleDocument({
    id: blueprint.id,
    triggers: blueprint.triggers,
    blocks: blueprint.blocks,
  });
  const fieldValues = draft.fieldValues || {};
  if (Object.keys(fieldValues).length > 0) {
    base.space = applyFieldValues(base.space, fieldValues);
  }
  base.editor_metadata = {
    ...base.editor_metadata,
    source_blueprint: blueprint.id,
    draft_name: draft.name,
  };
  return base;
}

export function ruleDocumentToCreatePayload(doc: RuleDocumentV1): {
  triggers: Array<Record<string, unknown>>;
  schedulers: Array<Record<string, unknown>>;
  space: Array<Record<string, unknown>>;
  editor_metadata: Record<string, unknown>;
} {
  return {
    triggers: doc.triggers,
    schedulers: doc.schedulers || [],
    space: doc.space,
    editor_metadata: doc.editor_metadata || {},
  };
}
