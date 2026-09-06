import { domains } from "@/lib/domains";
import type { ModelDomain, VariableGroup } from "@/lib/excel/types";

function toGroup(name: string, kind: "input" | "output"): VariableGroup {
  return { name, kind, variantCount: 1, variants: [] };
}

export function getFallbackDomains(): ModelDomain[] {
  return domains.map((domain) => ({
    id: domain.id,
    number: domain.number,
    title: domain.title,
    shortDesc: domain.question,
    longDesc: domain.summary,
    eyebrow: domain.eyebrow,
    question: domain.question,
    logic: domain.logic,
    formula: domain.formula,
    example: domain.example,
    note: domain.note,
    inputs: domain.variables
      .filter((item) => item.kind === "input")
      .map((item) => toGroup(item.name, "input")),
    outputs: domain.variables
      .filter((item) => item.kind === "output")
      .map((item) => toGroup(item.name, "output")),
  }));
}
