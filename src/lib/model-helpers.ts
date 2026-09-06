import type { ModelDomain, VariableGroup } from "@/lib/excel/types";
import { slugifyDomain } from "@/lib/stage-narratives";

export function formatVariableLabel(group: VariableGroup) {
  if (group.variantCount > 1) {
    return `${group.name} (${group.variantCount} variantes)`;
  }
  return group.name;
}

/** Slug único por nombre + input/output (pueden repetirse nombres entre tipos). */
export function variableSlug(name: string, kind: "input" | "output") {
  return `${slugifyDomain(name)}--${kind}`;
}

export function getDomainById(domains: ModelDomain[], id: string) {
  return domains.find((domain) => domain.id === id) ?? null;
}

export function getDomainNeighbors(domains: ModelDomain[], id: string) {
  const index = domains.findIndex((domain) => domain.id === id);
  return {
    prev: index > 0 ? domains[index - 1] : null,
    next: index >= 0 && index < domains.length - 1 ? domains[index + 1] : null,
    position: index + 1,
    total: domains.length,
  };
}

export function findVariableGroup(domain: ModelDomain, slug: string) {
  const keyed = [...domain.inputs, ...domain.outputs].find(
    (group) => variableSlug(group.name, group.kind) === slug,
  );
  if (keyed) return keyed;

  // Compat con URLs viejas sin --input/--output.
  return (
    [...domain.inputs, ...domain.outputs].find((group) => slugifyDomain(group.name) === slug) ?? null
  );
}
