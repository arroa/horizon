import type { DomainGlossary } from "./types";

export function normalizeDomainKey(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/^\d{1,2}\s+/, "")
    .replace(/\s+/g, " ");
}

export function extractDomainNumber(name: string): number | null {
  const match = name.trim().match(/^(\d{1,2})\s+/);
  return match ? parseInt(match[1], 10) : null;
}

export function formatDomainNumber(name: string, fallbackIndex: number) {
  const parsed = extractDomainNumber(name);
  if (parsed !== null) return String(parsed).padStart(2, "0");
  return String(fallbackIndex + 1).padStart(2, "0");
}

export function stripDomainPrefix(name: string) {
  const stripped = name.trim().replace(/^\d{1,2}\s+/, "").trim();
  return stripped || name.trim();
}

export function domainsMatch(ambit: string, dominio: string) {
  const a = normalizeDomainKey(ambit);
  const d = normalizeDomainKey(dominio);
  return a === d || a.includes(d) || d.includes(a);
}

export function compareAmbitsByNumber(a: string, b: string) {
  const na = extractDomainNumber(a) ?? 999;
  const nb = extractDomainNumber(b) ?? 999;
  if (na !== nb) return na - nb;
  return a.localeCompare(b, "es");
}

export function orderAmbits(ambits: string[], glossary: DomainGlossary[]) {
  const ordered: string[] = [];
  const remaining = new Set(ambits);

  for (const entry of glossary) {
    const match = ambits.find((ambit) => domainsMatch(ambit, entry.dominio));
    if (match && remaining.has(match)) {
      ordered.push(match);
      remaining.delete(match);
    }
  }

  const rest = [...remaining].sort(compareAmbitsByNumber);
  return [...ordered, ...rest];
}

export function matchGlossaryEntry(glossary: DomainGlossary[], ambit: string) {
  const exact = glossary.find((item) => domainsMatch(ambit, item.dominio));
  return exact ?? null;
}
