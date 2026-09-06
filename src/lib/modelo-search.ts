import type { ModelDomain, VariableGroup } from "@/lib/excel/types";
import { variableSlug } from "@/lib/model-helpers";

export type ModeloSearchHit = {
  id: string;
  kind: "domain" | "input" | "output";
  href: string;
  title: string;
  subtitle: string;
  score: number;
  snippet?: string;
};

const SYNONYMS: Record<string, string[]> = {
  venta: ["ingreso", "proyeccion", "facturacion", "comercial"],
  ventas: ["ingreso", "ingresos", "proyeccion", "facturacion"],
  ingreso: ["venta", "ventas", "facturacion", "revenue"],
  ingresos: ["venta", "ventas", "facturacion"],
  costo: ["coste", "gasto", "cogs", "margen"],
  costos: ["costes", "gastos", "margen"],
  gasto: ["costo", "coste", "opex"],
  precio: ["tarifa", "ticket", "pvp"],
  cantidad: ["volumen", "unidades", "qty"],
  volumen: ["cantidad", "unidades"],
  margen: ["markup", "rentabilidad", "contribucion"],
  stock: ["inventario", "existencia", "inventarios"],
  inventario: ["stock", "existencia"],
  prestamo: ["credito", "deuda", "financiamiento", "financiacion"],
  credito: ["prestamo", "deuda", "financiamiento"],
  deuda: ["prestamo", "credito", "pasivo"],
  caja: ["cash", "liquidez", "tesoreria"],
  liquidez: ["caja", "cash", "tesoreria"],
  bonificacion: ["acuerdo", "descuento", "rebate"],
  acuerdo: ["bonificacion", "descuento"],
  devolucion: ["retorno", "return", "rechazo"],
  linea: ["canal", "segmento"],
  familia: ["categoria", "producto"],
  cuenta: ["rubro", "concepto"],
  balance: ["bg", "activo", "pasivo", "patrimonio"],
  eerr: ["resultado", "pyg", "perdidas", "ganancias"],
  input: ["entrada", "dato", "parametro"],
  output: ["salida", "resultado", "calculado"],
};

function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%\s./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string) {
  return fold(text)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function expandQueryTokens(query: string) {
  const base = tokens(query);
  const expanded = new Set<string>(base);
  for (const token of base) {
    const syns = SYNONYMS[token];
    if (syns) syns.forEach((s) => expanded.add(s));
    // prefix helpers: "bonif" → match "bonificacion"
    if (token.length >= 4) expanded.add(token);
  }
  return { base, expanded: [...expanded] };
}

function scoreField(field: string, queryTokens: string[], weight: number) {
  if (!field) return 0;
  const hay = fold(field);
  if (!hay) return 0;

  let score = 0;
  for (const token of queryTokens) {
    if (hay === token) score += weight * 4;
    else if (hay.startsWith(token)) score += weight * 3;
    else if (hay.includes(` ${token} `) || hay.includes(token)) score += weight * 2;
    else {
      // soft stem: token is prefix of a word in field
      const words = hay.split(" ");
      if (words.some((w) => w.startsWith(token) || token.startsWith(w))) {
        score += weight;
      }
    }
  }
  return score;
}

function groupSearchText(group: VariableGroup) {
  const variantBits = group.variants
    .slice(0, 8)
    .map((v) => [v.account, v.line, v.family, v.logica, v.name].filter(Boolean).join(" "))
    .join(" ");
  return {
    title: group.name,
    body: `${group.name} ${group.kind} ${variantBits}`,
  };
}

function snippetFrom(text: string, query: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return undefined;
  const foldedQuery = fold(query).split(" ")[0];
  const folded = fold(clean);
  const idx = foldedQuery ? folded.indexOf(foldedQuery) : -1;
  if (idx < 0) return clean.slice(0, 90) + (clean.length > 90 ? "…" : "");
  const start = Math.max(0, idx - 24);
  const end = Math.min(clean.length, idx + 70);
  return `${start > 0 ? "…" : ""}${clean.slice(start, end)}${end < clean.length ? "…" : ""}`;
}

export function searchModelo(domains: ModelDomain[], query: string, limit = 24): ModeloSearchHit[] {
  const q = query.trim();
  if (!q) return [];

  const { base, expanded } = expandQueryTokens(q);
  if (!base.length) return [];

  const hits: ModeloSearchHit[] = [];

  for (const domain of domains) {
    let domainScore =
      scoreField(domain.title, expanded, 6) +
      scoreField(domain.number, base, 5) +
      scoreField(domain.shortDesc, expanded, 3) +
      scoreField(domain.longDesc, expanded, 2) +
      scoreField(domain.question, expanded, 2) +
      scoreField(domain.logic, expanded, 2) +
      scoreField(domain.eyebrow, expanded, 1);

    // Boost if all base tokens appear somewhere in domain corpus
    const corpus = fold(
      [domain.title, domain.shortDesc, domain.longDesc, domain.logic, domain.question].join(" "),
    );
    if (base.every((t) => corpus.includes(t))) domainScore += 8;

    if (domainScore > 0) {
      hits.push({
        id: `domain:${domain.id}`,
        kind: "domain",
        href: `/modelo/${domain.id}`,
        title: `${domain.number} ${domain.title}`,
        subtitle: "Ámbito",
        score: domainScore,
        snippet: snippetFrom(domain.shortDesc || domain.question || domain.longDesc, q),
      });
    }

    const scanGroups = (groups: VariableGroup[], kind: "input" | "output") => {
      for (const group of groups) {
        const { title, body } = groupSearchText(group);
        let score =
          scoreField(title, expanded, 7) +
          scoreField(body, expanded, 2) +
          scoreField(domain.title, expanded, 1);

        const foldedBody = fold(body);
        if (base.every((t) => foldedBody.includes(t) || fold(title).includes(t))) score += 6;
        if (fold(title).includes(fold(q))) score += 10;

        if (score <= 0) continue;

        const first = group.variants[0];
        const dim = [first?.account, first?.line, first?.family].filter(Boolean).join(" · ");
        hits.push({
          id: `${kind}:${domain.id}:${variableSlug(group.name)}`,
          kind,
          href: `/modelo/${domain.id}/${variableSlug(group.name)}`,
          title: group.name,
          subtitle: `${domain.number} ${domain.title} · ${kind}`,
          score,
          snippet: snippetFrom(first?.logica || dim || body, q),
        });
      }
    };

    scanGroups(domain.inputs, "input");
    scanGroups(domain.outputs, "output");
  }

  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "es")).slice(0, limit);
}
