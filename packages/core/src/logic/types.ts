/**
 * Logic blueprints & RuleDocument V1 types.
 * Genetic tag: sdk.logic.blueprints.gen1
 */

export interface RuleDocumentV1 {
  schemaVersion: 1;
  triggers: Array<Record<string, unknown>>;
  schedulers?: Array<Record<string, unknown>>;
  space: Array<Record<string, unknown>>;
  editor_metadata?: Record<string, unknown>;
}

export interface BlueprintField {
  key: string;
  label: string;
  schema: Record<string, unknown>;
  required?: boolean;
}

export interface RuleBlueprint {
  id: string;
  name: string;
  description?: string;
  kind?: 'template' | 'snippet' | 'structure';
  project_type?: string;
  category?: string;
  triggers: Array<Record<string, unknown>>;
  blocks: Array<Record<string, unknown>>;
  fields?: BlueprintField[];
  integration_hints?: string[];
  tags?: string[];
  blueprintSchemaVersion?: number;
}

export interface LogicStructure {
  id: string;
  name: string;
  description?: string;
  rule_blueprint_ids: string[];
  shared_fields?: BlueprintField[];
  integration_hints?: string[];
}

export interface BlueprintDraft {
  name: string;
  description?: string;
  enabled?: boolean;
  priority?: number;
  fieldValues?: Record<string, unknown>;
}
