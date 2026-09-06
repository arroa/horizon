export function isFormula(content: string) {
  if (!content) return false;
  const trimmed = content.trim();
  // Pure numbers / formatted amounts are input values, not formulas.
  if (/^[-+]?\d[\d.,\s]*$/.test(trimmed)) return false;
  return trimmed.startsWith("=") || /[+\-*/()]/.test(trimmed);
}

export function translateFormulaToSpanish(formula: string) {
  if (!formula) return "Sin fórmula";

  return formula
    .replace(/IFERROR\(/gi, "SI.ERROR(")
    .replace(/IF\(/gi, "SI(")
    .replace(/INDEX\(/gi, "INDICE(")
    .replace(/MATCH\(/gi, "COINCIDIR(")
    .replace(/SUMPRODUCT\(/gi, "SUMAPRODUCTO(")
    .replace(/SUMIFS\(/gi, "SUMAR.SI.CONJUNTO(")
    .replace(/SUMIF\(/gi, "SUMAR.SI(")
    .replace(/COUNTIFS\(/gi, "CONTAR.SI.CONJUNTO(")
    .replace(/COUNTIF\(/gi, "CONTAR.SI(")
    .replace(/MAX\(/gi, "MAXIMO(")
    .replace(/MIN\(/gi, "MINIMO(")
    .replace(/SUM\(/gi, "SUMA(")
    .replace(/AVERAGE\(/gi, "PROMEDIO(")
    .replace(/COUNT\(/gi, "CONTAR(")
    .replace(/YEAR\(/gi, "AÑO(")
    .replace(/MONTH\(/gi, "MES(")
    .replace(/DAY\(/gi, "DIA(")
    .replace(/DATE\(/gi, "FECHA(")
    .replace(/EDATE\(/gi, "FECHA.MES(")
    .replace(/OFFSET\(/gi, "DESREF(")
    .replace(/INDIRECT\(/gi, "INDIRECTO(")
    .replace(/VLOOKUP\(/gi, "BUSCARV(")
    .replace(/HLOOKUP\(/gi, "BUSCARH(")
    .replace(/XLOOKUP\(/gi, "BUSCARX(")
    .replace(/ABS\(/gi, "ABS(")
    .replace(/ROUND\(/gi, "REDONDEAR(")
    .replace(/AND\(/gi, "Y(")
    .replace(/OR\(/gi, "O(")
    .replace(/NOT\(/gi, "NO(");
}

export function prepareFormulaDisplay(formula: string) {
  // Solo traduce nombres de función; no reformatear saltos (vienen del Excel o no).
  return translateFormulaToSpanish(formula);
}

export type FormulaTokenType =
  | "function"
  | "string"
  | "number"
  | "operator"
  | "keyword"
  | "named-range"
  | "punctuation"
  | "plain";

export type FormulaToken = {
  type: FormulaTokenType;
  value: string;
};

const TOKEN_PATTERN =
  /("[^"]*"|'[^']*'|[A-ZÁÉÍÓÚÜ][A-ZÁÉÍÓÚÜ0-9_.]*(?=\()|MG[A-Za-z]+|DR[A-Za-z]+|BG[A-Za-z]+|EERR[A-Za-z]*|\d+(?:\.\d+)?|[+\-*/^=<>]|[:,()]|\s+)/gi;

function classifyToken(value: string): FormulaTokenType {
  if (/^".*"$|^'.*'$/.test(value)) return "string";
  if (/^(MG|DR|BG|EERR)/.test(value)) return "named-range";
  if (/^[A-ZÁÉÍÓÚÜ][A-ZÁÉÍÓÚÜ0-9_.]*$/.test(value)) return "function";
  if (/^\d/.test(value)) return "number";
  if (/^[+\-*/^=<>]$/.test(value)) return "operator";
  if (/^[,:()]$/.test(value)) return "punctuation";
  return "plain";
}

export function tokenizeFormula(formula: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  let lastIndex = 0;

  for (const match of formula.matchAll(TOKEN_PATTERN)) {
    const value = match[0];
    const index = match.index ?? 0;
    if (!value) continue;

    if (index > lastIndex) {
      tokens.push({ type: "plain", value: formula.slice(lastIndex, index) });
    }

    tokens.push({ type: classifyToken(value), value });
    lastIndex = index + value.length;
  }

  if (lastIndex < formula.length) {
    tokens.push({ type: "plain", value: formula.slice(lastIndex) });
  }

  return tokens.length ? tokens : [{ type: "plain", value: formula }];
}
