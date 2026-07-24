/**
 * GeneAddress SDK mirror — shared.diagnostics.gene_heat.gen1
 */

export interface GeneAddress {
  genetic_tag?: string;
  domain_path?: string;
  project_id?: number;
  user_id?: number;
  entity_key?: string;
}

export function tagDomainPrefix(tag: string): string {
  const parts = tag.split('.').filter((p) => p && p !== 'gen1' && p !== 'gen2');
  if (parts.length >= 2) return `${parts[0]}.${parts[1]}`;
  return parts[0] ?? '';
}

export function geneAddressCanonicalKey(addr: GeneAddress): string {
  const parts: string[] = [];
  if (addr.genetic_tag) parts.push(addr.genetic_tag);
  if (addr.domain_path) parts.push(addr.domain_path);
  if (addr.project_id != null) parts.push(`pid${addr.project_id}`);
  if (addr.user_id != null) parts.push(`uid${addr.user_id}`);
  if (addr.entity_key) parts.push(addr.entity_key);
  return parts.join('::');
}

export function geneAddressWithoutPii(addr: GeneAddress): GeneAddress {
  return { ...addr, user_id: undefined };
}
