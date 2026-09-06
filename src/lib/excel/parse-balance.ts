import * as XLSX from "xlsx";

import type {
  FinancialStatement,
  StatementColumn,
  StatementColumnKind,
  StatementMonthNature,
  StatementRow,
  StatementRowKind,
} from "./types";
import { attachCollapseGroups, attachColumnGroups, type RowCollapseOptions } from "./statement-collapse";

type NamedRange = { name: string; ref: string };

type StatementRangeNames = {
  cuenta: string;
  meses: string;
  valores: string;
};

type ParseStatementOptions = {
  ranges: StatementRangeNames;
  sheetFallbacks: string[];
  classifyRow: (label: string) => StatementRowKind;
  rowCollapse: RowCollapseOptions;
  /** EERR: el nombre EERRMeses empieza a mitad; completar periodos a la izquierda. */
  expandPeriodsLeft?: boolean;
};

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

function getNamedRange(ranges: NamedRange[], name: string) {
  const range = ranges.find((item) => item.name === name);
  return range && isValidNamedRef(range.ref) ? parseRangeRef(range.ref) : null;
}

function formatPeriodLabel(raw: string, excelSerial?: number) {
  const cleaned = String(raw || "").trim();
  if (/^T[1-4][-/ ]?\d{2,4}$/i.test(cleaned)) {
    const m = cleaned.match(/^T([1-4])[-/ ]?(\d{2,4})$/i);
    if (m) {
      const year = m[2].length === 2 ? m[2] : m[2].slice(-2);
      return `T${m[1]}-${year}`;
    }
  }
  if (/^(a[nñ]o)[-/ ]?\d{2,4}$/i.test(cleaned)) {
    const m = cleaned.match(/^(a[nñ]o)[-/ ]?(\d{2,4})$/i);
    if (m) {
      const year = m[2].length === 2 ? m[2] : m[2].slice(-2);
      return `Año-${year}`;
    }
  }

  // Preferir el texto formateado del Excel (ene-24) antes del serial:
  // el serial es medianoche UTC y en Chile cae al día anterior (ene-24 → Dic 23).
  const match = cleaned.match(/^([A-Za-zÁÉÍÓÚÜáéíóúü]{3})[-/ .]?(\d{2,4})$/);
  if (match) {
    const map: Record<string, string> = {
      jan: "Ene",
      feb: "Feb",
      mar: "Mar",
      apr: "Abr",
      may: "May",
      jun: "Jun",
      jul: "Jul",
      aug: "Ago",
      sep: "Sep",
      oct: "Oct",
      nov: "Nov",
      dec: "Dic",
      ene: "Ene",
      abr: "Abr",
      ago: "Ago",
      dic: "Dic",
    };
    const month = map[match[1].toLowerCase()] || match[1].replace(/^./, (c) => c.toUpperCase());
    const yearNum = match[2].length === 2 ? match[2] : match[2].slice(-2);
    return `${month}-${yearNum}`;
  }

  if (typeof excelSerial === "number" && Number.isFinite(excelSerial)) {
    const epoch = Date.UTC(1899, 11, 30);
    const date = new Date(epoch + excelSerial * 86400000);
    if (!Number.isNaN(date.getTime())) {
      const label = new Intl.DateTimeFormat("es-CL", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      }).format(date);
      return label.replace(".", "").replace(/^./, (c) => c.toUpperCase());
    }
  }

  return cleaned || "Mes";
}

function classifyMonthNature(raw: string): StatementMonthNature {
  const value = raw.trim().toLowerCase();
  if (!value) return "unknown";
  if (/^real/.test(value) || /^actual/.test(value)) return "real";
  if (/^proy/.test(value) || /^forecast/.test(value) || /^budget/.test(value)) return "proy";
  if (/^grupo/.test(value) || /^group/.test(value)) return "grupo";
  return "unknown";
}

function classifyColumnKind(label: string, nature: StatementMonthNature): StatementColumnKind {
  if (/^T[1-4]-?[0-9]{2}$/i.test(label)) return "quarter";
  if (/^A[nñ]o-[0-9]{2}$/i.test(label)) return "year";
  if (nature === "grupo") {
    if (/^T[1-4]/i.test(label)) return "quarter";
    if (/a[nñ]o/i.test(label)) return "year";
  }
  if (nature === "real" || nature === "proy") return "month";
  return "other";
}

function classifyBalanceRow(label: string): StatementRowKind {
  if (!label) return "spacer";
  if (
    /^(total|activos corrientes|activos no corrientes|pasivos corrientes|pasivos no corrientes|patrimonio total|patrimonio atribuible|total de patrimonios)/i.test(
      label,
    )
  ) {
    return "total";
  }
  return "account";
}

function classifyEerrRow(label: string): StatementRowKind {
  if (!label) return "spacer";
  if (/^%/i.test(label)) return "account";
  if (
    /^(total\b|resultado\b|margen de ventas(?:\s+depurado)?$|ventas$|costo de ventas$|acuerdos y bonificaciones comerciales$)/i.test(
      label,
    )
  ) {
    return "total";
  }
  return "account";
}

function looksLikePeriodHeader(label: string, nature: StatementMonthNature) {
  if (nature !== "unknown") return true;
  const cleaned = label.trim();
  if (!cleaned) return false;
  if (/^T[1-4]/i.test(cleaned)) return true;
  if (/a[nñ]o/i.test(cleaned)) return true;
  if (/^[A-Za-zÁÉÍÓÚÜáéíóúü]{3}[-/ .]?\d{2,4}$/.test(cleaned)) return true;
  return false;
}

function resolvePeriodColumnSpan(
  sheet: XLSX.WorkSheet,
  headerRow: number,
  natureRow: number,
  startCol: number,
  endCol: number,
  expandLeft: boolean,
) {
  let from = startCol;
  if (expandLeft) {
    while (from > 0) {
      const prev = from - 1;
      const natureCell = sheet[XLSX.utils.encode_cell({ r: natureRow - 1, c: prev })];
      const headerCell = sheet[XLSX.utils.encode_cell({ r: headerRow - 1, c: prev })];
      const natureRaw =
        natureCell?.v != null ? String(natureCell.v) : typeof natureCell?.w === "string" ? natureCell.w : "";
      const headerRaw =
        typeof headerCell?.w === "string" ? headerCell.w : headerCell?.v != null ? String(headerCell.v) : "";
      const serial = typeof headerCell?.v === "number" ? headerCell.v : undefined;
      const nature = classifyMonthNature(natureRaw);
      const label = formatPeriodLabel(headerRaw, serial);
      if (!looksLikePeriodHeader(label === "Mes" ? headerRaw : label, nature) && !looksLikePeriodHeader(headerRaw, nature)) {
        break;
      }
      from = prev;
    }
  }
  return { from, to: endCol };
}
function getStatementDisplay(sheet: XLSX.WorkSheet, address: string) {
  const cell = sheet[address];
  if (!cell) return "";

  if (typeof cell.w === "string" && cell.w.trim() !== "") {
    const cleaned = cell.w.trim().replace(/\s+/g, "");
    const paren = cleaned.match(/^\((.+)\)$/);
    const body = paren ? paren[1] : cleaned;
    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(body)) {
      const num = Number(body.replace(/,/g, ""));
      if (Number.isFinite(num)) {
        const formatted = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(num);
        return paren ? `(${formatted})` : formatted;
      }
    }
    if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
      const num = Number(cleaned);
      if (Number.isFinite(num)) {
        return new Intl.NumberFormat("es-CL", {
          maximumFractionDigits: Number.isInteger(num) ? 0 : 2,
        }).format(num);
      }
    }
    return cell.w.trim();
  }

  if (typeof cell.v === "number" && Number.isFinite(cell.v)) {
    return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(cell.v);
  }

  if (cell.v !== undefined && cell.v !== null && cell.v !== "") {
    return String(cell.v);
  }
  return "";
}

function parseFinancialStatement(
  workbook: XLSX.WorkBook,
  namedRanges: NamedRange[],
  options: ParseStatementOptions,
): FinancialStatement | null {
  const accounts = getNamedRange(namedRanges, options.ranges.cuenta);
  const monthsRange = getNamedRange(namedRanges, options.ranges.meses);
  const values = getNamedRange(namedRanges, options.ranges.valores);
  if (!accounts || !monthsRange || !values) return null;

  const sheetName =
    workbook.Sheets[accounts.sheet]
      ? accounts.sheet
      : workbook.SheetNames.find((n) => options.sheetFallbacks.some((f) => new RegExp(f, "i").test(n)));
  if (!sheetName || !workbook.Sheets[sheetName]) return null;
  const sheet = workbook.Sheets[sheetName];

  const accountCol = XLSX.utils.decode_col(accounts.startCol);
  const namedStartCol = XLSX.utils.decode_col(values.startCol);
  const namedEndCol = XLSX.utils.decode_col(values.endCol);
  const headerRow = monthsRange.startRow;
  const natureRow = Math.max(1, headerRow - 1);
  const { from: valueStartCol, to: valueEndCol } = resolvePeriodColumnSpan(
    sheet,
    headerRow,
    natureRow,
    namedStartCol,
    namedEndCol,
    !!options.expandPeriodsLeft,
  );
  const monthCount = valueEndCol - valueStartCol + 1;
  const sheetCols = sheet["!cols"] || [];

  const months: string[] = [];
  const monthNatures: StatementMonthNature[] = [];
  const columns: StatementColumn[] = [];

  for (let i = 0; i < monthCount; i++) {
    const address = XLSX.utils.encode_cell({ r: headerRow - 1, c: valueStartCol + i });
    const cell = sheet[address];
    const raw = typeof cell?.w === "string" ? cell.w : cell?.v != null ? String(cell.v) : "";
    const serial = typeof cell?.v === "number" ? cell.v : undefined;
    const label = formatPeriodLabel(raw, serial);
    months.push(label);

    const natureAddress = XLSX.utils.encode_cell({ r: natureRow - 1, c: valueStartCol + i });
    const natureCell = sheet[natureAddress];
    const natureRaw =
      natureCell?.v != null ? String(natureCell.v) : typeof natureCell?.w === "string" ? natureCell.w : "";
    const nature = classifyMonthNature(natureRaw);
    monthNatures.push(nature);

    const colMeta = sheetCols[valueStartCol + i] || {};
    const outlineLevel = typeof colMeta.level === "number" ? colMeta.level : Number(colMeta.level) || 0;
    columns.push({
      index: i,
      label,
      nature,
      kind: classifyColumnKind(label, nature),
      outlineLevel,
      excelHidden: !!colMeta.hidden,
    });
  }

  attachColumnGroups(columns);

  const sheetRows = sheet["!rows"] || [];
  const rows: StatementRow[] = [];
  for (let excelRow = accounts.startRow; excelRow <= accounts.endRow; excelRow++) {
    const labelAddress = XLSX.utils.encode_cell({ r: excelRow - 1, c: accountCol });
    const labelCell = sheet[labelAddress];
    const label = labelCell?.v != null ? String(labelCell.v).trim() : "";
    const kind = options.classifyRow(label);
    const rowMeta = sheetRows[excelRow - 1] || {};
    const outlineLevel = typeof rowMeta.level === "number" ? rowMeta.level : 0;
    const excelHidden = !!rowMeta.hidden;

    const rowValues: string[] = [];
    for (let i = 0; i < monthCount; i++) {
      const address = XLSX.utils.encode_cell({ r: excelRow - 1, c: valueStartCol + i });
      rowValues.push(kind === "spacer" ? "" : getStatementDisplay(sheet, address));
    }

    if (kind === "spacer" || label) {
      rows.push({
        label,
        kind,
        values: rowValues,
        excelRow,
        outlineLevel,
        excelHidden,
      });
    }
  }

  if (!rows.some((row) => row.kind !== "spacer")) return null;

  const collapsedRows = attachCollapseGroups(rows, options.rowCollapse);

  return {
    sheet: sheetName,
    months,
    monthNatures,
    columns,
    rows: collapsedRows,
    rowCollapse: options.rowCollapse,
  };
}

export function parseBalanceStatement(workbook: XLSX.WorkBook, ranges: NamedRange[]) {
  return parseFinancialStatement(workbook, ranges, {
    ranges: { cuenta: "BGCuenta", meses: "BGMeses", valores: "BGValores" },
    sheetFallbacks: ["Balance General", "Balance"],
    classifyRow: classifyBalanceRow,
    rowCollapse: { outlineChildren: "after", sectionTotals: true },
  });
}

export function parseEerrStatement(workbook: XLSX.WorkBook, ranges: NamedRange[]) {
  return parseFinancialStatement(workbook, ranges, {
    ranges: { cuenta: "EERRCuenta", meses: "EERRMeses", valores: "EERRValores" },
    sheetFallbacks: ["EERR MdS", "EERR"],
    classifyRow: classifyEerrRow,
    rowCollapse: { outlineChildren: "before", sectionTotals: false, defaultCollapsed: true },
    expandPeriodsLeft: true,
  });
}

export function balanceSheetNameFromRanges(ranges: NamedRange[]) {
  const accounts = getNamedRange(ranges, "BGCuenta");
  return accounts?.sheet ?? null;
}

export function eerrSheetNameFromRanges(ranges: NamedRange[]) {
  const accounts = getNamedRange(ranges, "EERRCuenta");
  return accounts?.sheet ?? null;
}
