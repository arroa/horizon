import * as XLSX from "xlsx";

import { findNarrative, slugifyDomain } from "@/lib/stage-narratives";

import {
  formatDomainNumber,
  matchGlossaryEntry,
  orderAmbits,
  stripDomainPrefix,
} from "./domain-order";
import { balanceSheetNameFromRanges, parseBalanceStatement } from "./parse-balance";

import type {
  DataType,
  DomainGlossary,
  ModelDomain,
  ModelSnapshot,
  ModelVariable,
  MonthValue,
  VariableGroup,
} from "./types";

const PLACEHOLDER_VALUES = new Set(["", "**", "-", "n/a", "na"]);

type NamedRange = { name: string; ref: string };

type CatalogSchema = {
  mode: "MG" | "DR" | "HEADERS";
  sheet: string;
  startRow: number;
  endRow: number | null;
  ranges: Record<string, string | null>;
  logicaCol?: string;
  headerMap?: Record<string, string[]>;
};

function isPlaceholder(value: unknown) {
  if (value === undefined || value === null) return true;
  return PLACEHOLDER_VALUES.has(String(value).trim().toLowerCase());
}

function normalizeDataType(value: unknown): DataType | "" {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const lower = raw.toLowerCase();
  if (lower === "output" || lower === "out put") return "Output";
  if (lower === "input") return "Input";
  return raw as DataType;
}

function isValidNamedRef(ref: string | undefined) {
  return !!(ref && !/#REF!/i.test(ref));
}

function parseRangeRef(ref: string) {
  if (!isValidNamedRef(ref)) return null;
  const match = String(ref).match(/^(?:'([^']+)'|([^!]+))!\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?/i);
  if (!match) return null;
  return {
    sheet: match[1] || match[2],
    startCol: match[3].toUpperCase(),
    startRow: parseInt(match[4], 10),
    endCol: (match[5] || match[3]).toUpperCase(),
    endRow: parseInt(match[6] || match[4], 10),
  };
}

function findSheetName(candidates: string[], sheetNames: string[]) {
  for (const wanted of candidates) {
    const exact = sheetNames.find((name) => name === wanted);
    if (exact) return exact;
    const loose = sheetNames.find((name) => name.toLowerCase() === wanted.toLowerCase());
    if (loose) return loose;
    const partial = sheetNames.find((name) => name.toLowerCase().includes(wanted.toLowerCase()));
    if (partial) return partial;
  }
  return null;
}

function detectCatalogSchema(ranges: NamedRange[], sheetNames: string[]): CatalogSchema {
  const byName: Record<string, NamedRange> = {};
  ranges.forEach((range) => {
    byName[range.name] = range;
  });

  const mgParsed = byName.MGVariable ? parseRangeRef(byName.MGVariable.ref) : null;
  if (mgParsed) {
    return {
      mode: "MG",
      sheet: findSheetName([mgParsed.sheet, "Modelo de Proyección"], sheetNames) || mgParsed.sheet,
      startRow: mgParsed.startRow,
      endRow: mgParsed.endRow,
      ranges: {
        ambit: "MGAmbito",
        account: "MGCuenta",
        line: "MGLinea",
        family: "MGFamilia",
        variable: "MGVariable",
        dato: "MGDato",
        logica: "MGLogica",
        values: "MGValores",
      },
    };
  }

  const drParsed = byName.DRVariable ? parseRangeRef(byName.DRVariable.ref) : null;
  if (drParsed) {
    return {
      mode: "DR",
      sheet: findSheetName([drParsed.sheet, "Datos Reales"], sheetNames) || drParsed.sheet,
      startRow: drParsed.startRow,
      endRow: drParsed.endRow,
      ranges: {
        ambit: "DRAmbito",
        account: "DRCuenta",
        line: "DRLinea",
        family: "DRFamilia",
        variable: "DRVariable",
        dato: "DRDato",
        logica: null,
        values: "DRValores",
      },
      logicaCol: "G",
    };
  }

  const fallbackSheet = findSheetName(["Modelo de Proyección", "Datos Reales"], sheetNames) || sheetNames[0];
  return {
    mode: "HEADERS",
    sheet: fallbackSheet,
    startRow: 3,
    endRow: null,
    ranges: {},
    headerMap: {
      ambit: ["ambito", "ámbito"],
      account: ["cuenta"],
      line: ["linea", "línea"],
      family: ["familia"],
      variable: ["variable"],
      dato: ["tipo dato", "dato", "tipo"],
      logica: ["lógica del dato", "logica del dato", "lógica", "logica"],
    },
  };
}

function extractNamedRanges(workbook: XLSX.WorkBook): NamedRange[] {
  const extracted: NamedRange[] = [];
  const names = workbook.Workbook?.Names;
  if (names) {
    names.forEach((name) => {
      extracted.push({ name: name.Name, ref: name.Ref });
    });
  }
  return extracted;
}

function getCellFormula(sheet: XLSX.WorkSheet, address: string) {
  const cell = sheet[address];
  if (!cell) return "";
  if (cell.f) {
    const formula = String(cell.f).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    return formula.startsWith("=") ? formula : `=${formula}`;
  }
  // Prefer Excel's formatted display (e.g. " 300,000,000 ") for inputs.
  if (typeof cell.w === "string" && cell.w.trim() !== "") {
    return cell.w.trim();
  }
  if (cell.v !== undefined && cell.v !== null && cell.v !== "") {
    return String(cell.v);
  }
  return "";
}

function extractColumnByLetter(sheet: XLSX.WorkSheet, colLetter: string, startRow: number, endRow: number) {
  const data = new Map<number, string>();
  if (!sheet || !colLetter) return data;
  const col = XLSX.utils.decode_col(colLetter);
  for (let excelRow = startRow; excelRow <= endRow; excelRow++) {
    const address = XLSX.utils.encode_cell({ r: excelRow - 1, c: col });
    const cell = sheet[address];
    if (cell && cell.v !== undefined && cell.v !== null && cell.v !== "") {
      const value = String(cell.v).trim();
      if (value) data.set(excelRow, value);
    }
  }
  return data;
}

function getNamedRange(ranges: NamedRange[], name: string | null | undefined) {
  if (!name) return null;
  const range = ranges.find((item) => item.name === name);
  return range && isValidNamedRef(range.ref) ? parseRangeRef(range.ref) : null;
}

function extractMappedColumn(
  workbook: XLSX.WorkBook,
  sheet: XLSX.WorkSheet,
  ranges: NamedRange[],
  rangeName: string | null | undefined,
  schema: CatalogSchema,
  fallbackCol?: string,
) {
  const parsed = getNamedRange(ranges, rangeName);
  if (parsed) {
    const targetSheet = workbook.Sheets[parsed.sheet] || sheet;
    return extractColumnByLetter(targetSheet, parsed.startCol, parsed.startRow, parsed.endRow);
  }
  if (fallbackCol && schema.startRow) {
    const endRow = schema.endRow || schema.startRow + 2000;
    return extractColumnByLetter(sheet, fallbackCol, schema.startRow, endRow);
  }
  return new Map<number, string>();
}

function detectHeaderMap(sheet: XLSX.WorkSheet, schema: CatalogSchema) {
  const map: Record<string, { col: string; headerRow: number }> = {};
  const maxScanRows = 4;
  const maxCols = 16;
  for (let r = 0; r < maxScanRows; r++) {
    for (let c = 0; c < maxCols; c++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })];
      if (!cell || cell.v === undefined) continue;
      const header = String(cell.v).trim().toLowerCase();
      Object.entries(schema.headerMap || {}).forEach(([field, aliases]) => {
        if (!map[field] && aliases.includes(header)) {
          map[field] = { col: XLSX.utils.encode_col(c), headerRow: r + 1 };
        }
      });
    }
  }
  return map;
}

function getValuesStartCol(ranges: NamedRange[], schema: CatalogSchema) {
  const parsed = getNamedRange(ranges, schema.ranges.values);
  if (parsed) return parsed.startCol;
  if (schema.mode === "DR") return "H";
  if (schema.mode === "MG") return "W";
  return "H";
}

function getCellDisplay(sheet: XLSX.WorkSheet, address: string) {
  const cell = sheet[address];
  if (!cell) return "";

  // Prefer numeric value + Excel format mask. Parsing `w` and re-formatting in the UI
  // used to turn 1089 → "1.089" → 1,09 (thousand sep read as decimal).
  if (typeof cell.v === "number" && Number.isFinite(cell.v)) {
    return formatNumberUsingExcelFormat(cell.v, cell.z);
  }

  if (typeof cell.w === "string" && cell.w.trim() !== "") {
    return formatExcelDisplay(cell.w.trim(), cell.z);
  }

  if (cell.v !== undefined && cell.v !== null && cell.v !== "") {
    return String(cell.v);
  }
  return "";
}

function decimalsFromExcelFormat(z?: string) {
  if (!z || /^general$/i.test(z.trim())) return null;
  if (/%/.test(z)) {
    const match = z.match(/0\.(0+)/);
    return match ? match[1].length : 2;
  }
  const match = z.match(/0\.(0+)/);
  if (match) return match[1].length;
  // Formats like #,##0 or _-* #,##0_- imply no decimals.
  if (/#|0/.test(z) && !/\.0/.test(z)) return 0;
  return null;
}

function fractionDigitsFromValue(value: number) {
  if (Number.isInteger(value)) return 0;
  const raw = String(value);
  if (/e/i.test(raw)) {
    // Keep a small fixed precision for scientific floats from Excel cache.
    return Math.abs(value) >= 1 ? 2 : 4;
  }
  const frac = raw.split(".")[1] || "";
  // Cap noisy binary floats (e.g. 0.0105684055…) but keep real input decimals.
  return Math.min(frac.length, 6);
}

function formatNumberUsingExcelFormat(value: number, z?: string) {
  if (z && /%/.test(z)) {
    const decimals = decimalsFromExcelFormat(z) ?? 2;
    return `${new Intl.NumberFormat("es-CL", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value * 100)}%`;
  }

  const decimals = decimalsFromExcelFormat(z) ?? fractionDigitsFromValue(value);
  return new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Take Excel's `w` ("33,250,380" / "-50.31%") and show it in Spanish style. */
function formatExcelDisplay(raw: string, z?: string) {
  const cleaned = raw.replace(/\s/g, "");

  if (/%$/.test(cleaned) || (z && /%/.test(z) && /%$/.test(cleaned))) {
    const numPart = cleaned.replace(/%$/, "");
    const num = Number(numPart.replace(/,/g, ""));
    if (Number.isFinite(num)) {
      const decimals = decimalsFromExcelFormat(z) ?? 2;
      return `${new Intl.NumberFormat("es-CL", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(num)}%`;
    }
    return cleaned.replace(".", ",");
  }

  // US thousands: 33,250,380 or 33,250,380.50
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
    const num = Number(cleaned.replace(/,/g, ""));
    if (Number.isFinite(num)) {
      const decimals = decimalsFromExcelFormat(z);
      const fraction = cleaned.includes(".") ? cleaned.split(".")[1].length : 0;
      const digits = decimals ?? fraction;
      return new Intl.NumberFormat("es-CL", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(num);
    }
  }

  // Plain number in w
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
    const num = Number(cleaned);
    if (Number.isFinite(num)) return formatNumberUsingExcelFormat(num, z);
  }

  return raw;
}

function formatMonthLabel(raw: string, excelSerial?: number) {
  if (typeof excelSerial === "number" && Number.isFinite(excelSerial)) {
    // Excel serial date → JS date (Excel epoch 1899-12-30)
    const date = new Date(Date.UTC(1899, 11, 30) + excelSerial * 86400000);
    if (!Number.isNaN(date.getTime())) {
      const month = date.toLocaleDateString("es-ES", { month: "long", timeZone: "UTC" });
      const year = date.getUTCFullYear();
      return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`;
    }
  }

  const match = raw.match(/^([A-Za-z]{3})[-/]?(\d{2}|\d{4})$/);
  if (match) {
    const map: Record<string, string> = {
      jan: "Enero",
      feb: "Febrero",
      mar: "Marzo",
      apr: "Abril",
      may: "Mayo",
      jun: "Junio",
      jul: "Julio",
      aug: "Agosto",
      sep: "Septiembre",
      oct: "Octubre",
      nov: "Noviembre",
      dic: "Diciembre",
      ene: "Enero",
      abr: "Abril",
      ago: "Agosto",
    };
    const key = match[1].toLowerCase();
    const month = map[key] || match[1];
    const yearNum = match[2].length === 2 ? 2000 + Number(match[2]) : Number(match[2]);
    return `${month} ${yearNum}`;
  }

  return raw || "Mes";
}

function readMonthHeaders(sheet: XLSX.WorkSheet, ranges: NamedRange[], schema: CatalogSchema, count: number) {
  const valuesRange = getNamedRange(ranges, schema.ranges.values);
  const monthsRange = getNamedRange(ranges, schema.mode === "MG" ? "MGMeses" : schema.mode === "DR" ? "DRMeses" : null);
  const startColLetter = valuesRange?.startCol || getValuesStartCol(ranges, schema);
  const startCol = XLSX.utils.decode_col(startColLetter);
  const headerRow = monthsRange?.startRow || (valuesRange ? valuesRange.startRow - 1 : 2);

  const labels: string[] = [];
  for (let i = 0; i < count; i++) {
    const address = XLSX.utils.encode_cell({ r: headerRow - 1, c: startCol + i });
    const cell = sheet[address];
    const raw = getCellDisplay(sheet, address);
    const serial = typeof cell?.v === "number" ? cell.v : undefined;
    labels.push(formatMonthLabel(raw, serial));
  }
  return { startCol, labels };
}

function readMonthValues(
  sheet: XLSX.WorkSheet,
  excelRow: number,
  startCol: number,
  labels: string[],
): MonthValue[] {
  return labels.map((label, index) => {
    const address = XLSX.utils.encode_cell({ r: excelRow - 1, c: startCol + index });
    const cell = sheet[address];
    const display = getCellDisplay(sheet, address);

    // Prefer cached/formatted value for the month strip; formula lives in the formula panel.
    if (display) {
      return { label, value: display, isFormula: false };
    }

    if (cell?.f) {
      const formula = String(cell.f).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
      return {
        label,
        value: formula.startsWith("=") ? formula : `=${formula}`,
        isFormula: true,
      };
    }

    return { label, value: "", isFormula: false };
  });
}

function getRealFormula(
  workbook: XLSX.WorkBook,
  ranges: NamedRange[],
  schema: CatalogSchema,
  variable: ModelVariable,
) {
  const sheet = workbook.Sheets[variable.sheet];
  if (!sheet) return "";
  // Always the first column of MGValores/DRValores (start month of the model).
  const valuesCol = getValuesStartCol(ranges, schema);
  return getCellFormula(sheet, `${valuesCol}${variable.excelRow}`);
}

function parseGlossary(workbook: XLSX.WorkBook, ranges: NamedRange[]): DomainGlossary[] {
  const parsed = getNamedRange(ranges, "GlosarioDominio");
  if (!parsed) return [];

  const sheet = workbook.Sheets[parsed.sheet];
  if (!sheet) return [];

  const startCol = XLSX.utils.decode_col(parsed.startCol);
  const endCol = XLSX.utils.decode_col(parsed.endCol);
  const glossary: DomainGlossary[] = [];

  for (let row = parsed.startRow; row <= parsed.endRow; row++) {
    const dominio = String(sheet[XLSX.utils.encode_cell({ r: row - 1, c: startCol })]?.v ?? "").trim();
    const shortDesc = String(
      sheet[XLSX.utils.encode_cell({ r: row - 1, c: Math.min(startCol + 1, endCol) })]?.v ?? "",
    ).trim();
    const longDesc = String(
      sheet[XLSX.utils.encode_cell({ r: row - 1, c: Math.min(startCol + 2, endCol) })]?.v ?? "",
    ).trim();

    if (!dominio || dominio.toLowerCase() === "dominio") continue;
    glossary.push({ dominio, shortDesc, longDesc });
  }

  return glossary;
}

function groupVariables(items: ModelVariable[], kind: "input" | "output"): VariableGroup[] {
  const grouped = new Map<string, ModelVariable[]>();
  items
    .filter((item) => (kind === "input" ? item.dataType === "Input" : item.dataType === "Output"))
    .forEach((item) => {
      const list = grouped.get(item.name) ?? [];
      list.push(item);
      grouped.set(item.name, list);
    });

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([name, variants]) => ({
      name,
      kind,
      variantCount: variants.length,
      variants,
    }));
}

function buildDomains(variables: ModelVariable[], glossary: DomainGlossary[]): ModelDomain[] {
  const ambits = [...new Set(variables.map((item) => item.ambit).filter(Boolean))] as string[];
  const ambitOrder = orderAmbits(ambits, glossary);

  return ambitOrder.map((rawTitle, index) => {
    const id = slugifyDomain(rawTitle);
    const inAmbit = variables.filter((item) => item.ambit === rawTitle);
    const gloss = matchGlossaryEntry(glossary, rawTitle);
    const narrative = findNarrative(rawTitle, id);
    const displayTitle = stripDomainPrefix(rawTitle);

    return {
      id,
      number: formatDomainNumber(rawTitle, index),
      title: displayTitle,
      shortDesc: gloss?.shortDesc || narrative?.question || "",
      longDesc: gloss?.longDesc || narrative?.logic || "",
      eyebrow: narrative?.eyebrow || "Ámbito del modelo",
      question: gloss?.shortDesc || narrative?.question || `¿Qué ocurre en ${displayTitle}?`,
      logic: gloss?.longDesc || narrative?.logic || "",
      formula: narrative?.formula,
      example: narrative?.example || "",
      note: narrative?.note,
      inputs: groupVariables(inAmbit, "input"),
      outputs: groupVariables(inAmbit, "output"),
    };
  });
}

function processVariablesStructure(
  workbook: XLSX.WorkBook,
  sheet: XLSX.WorkSheet,
  sheetName: string,
  schema: CatalogSchema,
  ranges: NamedRange[],
): { variables: ModelVariable[]; monthLabels: string[] } {
  let ambitos: Map<number, string>;
  let cuentas: Map<number, string>;
  let lineas: Map<number, string>;
  let familias: Map<number, string>;
  let variables: Map<number, string>;
  let datos: Map<number, string>;
  let logicas: Map<number, string>;

  if (schema.mode === "HEADERS") {
    const headers = detectHeaderMap(sheet, schema);
    const headerRow = headers.variable?.headerRow || 2;
    schema.startRow = headerRow + 1;
    const ref = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : { e: { r: headerRow + 400 } };
    schema.endRow = ref.e.r + 1;
    ambitos = extractColumnByLetter(sheet, headers.ambit?.col || "A", schema.startRow, schema.endRow);
    cuentas = extractColumnByLetter(sheet, headers.account?.col || "B", schema.startRow, schema.endRow);
    lineas = extractColumnByLetter(sheet, headers.line?.col || "C", schema.startRow, schema.endRow);
    familias = extractColumnByLetter(sheet, headers.family?.col || "D", schema.startRow, schema.endRow);
    variables = extractColumnByLetter(sheet, headers.variable?.col || "E", schema.startRow, schema.endRow);
    datos = extractColumnByLetter(sheet, headers.dato?.col || "F", schema.startRow, schema.endRow);
    logicas = extractColumnByLetter(sheet, headers.logica?.col || "G", schema.startRow, schema.endRow);
  } else {
    ambitos = extractMappedColumn(workbook, sheet, ranges, schema.ranges.ambit, schema);
    cuentas = extractMappedColumn(workbook, sheet, ranges, schema.ranges.account, schema);
    lineas = extractMappedColumn(workbook, sheet, ranges, schema.ranges.line, schema);
    familias = extractMappedColumn(workbook, sheet, ranges, schema.ranges.family, schema);
    variables = extractMappedColumn(workbook, sheet, ranges, schema.ranges.variable, schema);
    datos = extractMappedColumn(workbook, sheet, ranges, schema.ranges.dato, schema);
    logicas = extractMappedColumn(workbook, sheet, ranges, schema.ranges.logica, schema, schema.logicaCol);
  }

  const allVariables: ModelVariable[] = [];
  const excelRows = new Set([...variables.keys(), ...datos.keys()]);
  const monthHeaders = readMonthHeaders(sheet, ranges, schema, 4);

  excelRows.forEach((excelRow) => {
    const variable = variables.get(excelRow) || "";
    const dato = normalizeDataType(datos.get(excelRow) || "");
    if (isPlaceholder(variable)) return;

    const record: ModelVariable = {
      id: `${sheetName}:${excelRow}`,
      name: variable,
      ambit: isPlaceholder(ambitos.get(excelRow)) ? "" : (ambitos.get(excelRow) || ""),
      account: isPlaceholder(cuentas.get(excelRow)) ? "" : (cuentas.get(excelRow) || ""),
      line: isPlaceholder(lineas.get(excelRow)) ? "" : (lineas.get(excelRow) || ""),
      family: isPlaceholder(familias.get(excelRow)) ? "" : (familias.get(excelRow) || ""),
      dataType: dato || "Output",
      logica: isPlaceholder(logicas.get(excelRow)) ? "" : (logicas.get(excelRow) || ""),
      formula: "",
      months: readMonthValues(sheet, excelRow, monthHeaders.startCol, monthHeaders.labels),
      excelRow,
      sheet: sheetName,
    };

    record.formula = getRealFormula(workbook, ranges, schema, record);
    allVariables.push(record);
  });

  return { variables: allVariables, monthLabels: monthHeaders.labels };
}

export type ParseProgress = {
  percent: number;
  label: string;
};

export async function parseModelFile(
  file: File,
  onProgress?: (progress: ParseProgress) => void,
): Promise<ModelSnapshot> {
  const report = (percent: number, label: string) => {
    onProgress?.({ percent, label });
  };

  report(5, "Leyendo archivo…");
  await yieldToUi();
  const buffer = await file.arrayBuffer();
  const data = new Uint8Array(buffer);

  report(18, "Detectando catálogo…");
  await yieldToUi();
  // bookSheets/bookProps alone does NOT load named ranges — probe one sheet to read Names.
  const probe = XLSX.read(data, { type: "array", sheets: [0] });
  const probeNames = extractNamedRanges(probe);
  let catalogSchema = detectCatalogSchema(probeNames, probe.SheetNames || []);

  const sheetsToLoad = new Set<string>([catalogSchema.sheet]);
  const glosarioRange = probeNames.find((item) => item.name === "GlosarioDominio");
  if (glosarioRange) {
    const glosarioParsed = parseRangeRef(glosarioRange.ref);
    if (glosarioParsed?.sheet) sheetsToLoad.add(glosarioParsed.sheet);
  } else {
    // Common typo in the workbook: sheet "Glorario"
    const glossarySheet = findSheetName(["Glorario", "Glosario"], probe.SheetNames || []);
    if (glossarySheet) sheetsToLoad.add(glossarySheet);
  }

  const balanceSheet = balanceSheetNameFromRanges(probeNames);
  if (balanceSheet) {
    sheetsToLoad.add(balanceSheet);
  } else {
    const fallbackBalance = findSheetName(["Balance General", "Balance"], probe.SheetNames || []);
    if (fallbackBalance) sheetsToLoad.add(fallbackBalance);
  }

  report(35, "Cargando hojas del modelo…");
  await yieldToUi();
  const workbook = XLSX.read(data, {
    type: "array",
    sheets: [...sheetsToLoad],
    cellFormula: true,
    cellNF: true,
    cellStyles: true,
  });

  const namedRanges = extractNamedRanges(workbook).length ? extractNamedRanges(workbook) : probeNames;
  // Re-detect after real Names are available (probe may have been enough; keep defensive).
  const detected = detectCatalogSchema(namedRanges, workbook.SheetNames || []);
  if (catalogSchema.mode === "HEADERS" && detected.mode !== "HEADERS") {
    catalogSchema = detected;
    if (!sheetsToLoad.has(catalogSchema.sheet) || !workbook.Sheets[catalogSchema.sheet]) {
      sheetsToLoad.add(catalogSchema.sheet);
      const reloaded = XLSX.read(data, {
        type: "array",
        sheets: [...sheetsToLoad],
        cellFormula: true,
        cellNF: true,
        cellStyles: true,
      });
      Object.assign(workbook.Sheets, reloaded.Sheets);
    }
  }

  const targetSheetName =
    findSheetName([catalogSchema.sheet], workbook.SheetNames) || workbook.SheetNames[0];
  const targetSheet = workbook.Sheets[targetSheetName];
  if (!targetSheet) {
    throw new Error("No se encontró la hoja del catálogo en el Excel.");
  }

  report(55, "Extrayendo variables…");
  await yieldToUi();
  const { variables, monthLabels } = processVariablesStructure(
    workbook,
    targetSheet,
    targetSheetName,
    catalogSchema,
    namedRanges,
  );
  if (!variables.length) {
    throw new Error("No se encontraron variables en el catálogo MG/DR.");
  }

  report(75, "Leyendo glosario de dominios…");
  await yieldToUi();
  const glossary = parseGlossary(workbook, namedRanges);

  report(85, "Leyendo Balance general…");
  await yieldToUi();
  const balance = parseBalanceStatement(workbook, namedRanges);

  report(92, "Armando el recorrido…");
  await yieldToUi();
  const domains = buildDomains(variables, glossary);

  report(100, "Listo");
  return {
    fileName: file.name,
    ingestedAt: new Date().toISOString(),
    domains,
    variables,
    glossary,
    monthLabels,
    balance: balance ?? undefined,
  };
}

function yieldToUi() {
  return new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}
