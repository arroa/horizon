import * as XLSX from "xlsx";

import type { FinancialStatement, StatementMonthNature, StatementRow, StatementRowKind } from "./types";
import { attachCollapseGroups } from "./statement-collapse";

type NamedRange = { name: string; ref: string };

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

function formatMonthLabel(raw: string, excelSerial?: number) {
  if (typeof excelSerial === "number" && Number.isFinite(excelSerial)) {
    const epoch = Date.UTC(1899, 11, 30);
    const date = new Date(epoch + excelSerial * 86400000);
    if (!Number.isNaN(date.getTime())) {
      const label = new Intl.DateTimeFormat("es-CL", { month: "short", year: "2-digit" }).format(date);
      return label.replace(".", "").replace(/^./, (c) => c.toUpperCase());
    }
  }

  const cleaned = String(raw || "").trim();
  if (!cleaned) return "Mes";
  const match = cleaned.match(/^([A-Za-z]{3})[-/ ]?(\d{2,4})$/);
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
    const month = map[match[1].toLowerCase()] || match[1];
    const yearNum = match[2].length === 2 ? match[2] : match[2].slice(-2);
    return `${month}-${yearNum}`;
  }
  return cleaned;
}

function classifyRow(label: string): StatementRowKind {
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

function classifyMonthNature(raw: string): StatementMonthNature {
  const value = raw.trim().toLowerCase();
  if (!value) return "unknown";
  if (/^real/.test(value) || /^actual/.test(value)) return "real";
  if (/^proy/.test(value) || /^forecast/.test(value) || /^budget/.test(value)) return "proy";
  return "unknown";
}

/** Prefer Excel's formatted text (`w`) so masks like `#,##0,` (miles) stay correct. */
function getStatementDisplay(sheet: XLSX.WorkSheet, address: string) {
  const cell = sheet[address];
  if (!cell) return "";

  if (typeof cell.w === "string" && cell.w.trim() !== "") {
    const cleaned = cell.w.trim().replace(/\s+/g, "");
    // US thousands → Spanish: 1,234,567 or (1,234)
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

export function parseBalanceStatement(
  workbook: XLSX.WorkBook,
  ranges: NamedRange[],
): FinancialStatement | null {
  const accounts = getNamedRange(ranges, "BGCuenta");
  const monthsRange = getNamedRange(ranges, "BGMeses");
  const values = getNamedRange(ranges, "BGValores");
  if (!accounts || !monthsRange || !values) return null;

  const sheetName =
    workbook.Sheets[accounts.sheet] ? accounts.sheet : workbook.SheetNames.find((n) => /balance/i.test(n));
  if (!sheetName || !workbook.Sheets[sheetName]) return null;
  const sheet = workbook.Sheets[sheetName];

  const accountCol = XLSX.utils.decode_col(accounts.startCol);
  const valueStartCol = XLSX.utils.decode_col(values.startCol);
  const valueEndCol = XLSX.utils.decode_col(values.endCol);
  const monthCount = valueEndCol - valueStartCol + 1;
  const headerRow = monthsRange.startRow;

  const months: string[] = [];
  const monthNatures: StatementMonthNature[] = [];
  // Fila tipica: Real/Proy justo encima de BGMeses (fila 2 si meses están en 3).
  const natureRow = Math.max(1, headerRow - 1);
  for (let i = 0; i < monthCount; i++) {
    const address = XLSX.utils.encode_cell({ r: headerRow - 1, c: valueStartCol + i });
    const cell = sheet[address];
    const raw = typeof cell?.w === "string" ? cell.w : cell?.v != null ? String(cell.v) : "";
    const serial = typeof cell?.v === "number" ? cell.v : undefined;
    months.push(formatMonthLabel(raw, serial));

    const natureAddress = XLSX.utils.encode_cell({ r: natureRow - 1, c: valueStartCol + i });
    const natureCell = sheet[natureAddress];
    const natureRaw =
      natureCell?.v != null ? String(natureCell.v) : typeof natureCell?.w === "string" ? natureCell.w : "";
    monthNatures.push(classifyMonthNature(natureRaw));
  }

  const sheetRows = sheet["!rows"] || [];
  const rows: StatementRow[] = [];
  for (let excelRow = accounts.startRow; excelRow <= accounts.endRow; excelRow++) {
    const labelAddress = XLSX.utils.encode_cell({ r: excelRow - 1, c: accountCol });
    const labelCell = sheet[labelAddress];
    const label = labelCell?.v != null ? String(labelCell.v).trim() : "";
    const kind = classifyRow(label);
    const rowMeta = sheetRows[excelRow - 1] || {};
    const outlineLevel = typeof rowMeta.level === "number" ? rowMeta.level : 0;
    const excelHidden = !!rowMeta.hidden;

    const rowValues: string[] = [];
    for (let i = 0; i < monthCount; i++) {
      const address = XLSX.utils.encode_cell({ r: excelRow - 1, c: valueStartCol + i });
      rowValues.push(kind === "spacer" ? "" : getStatementDisplay(sheet, address));
    }

    // Keep spacers (visual section breaks) and labeled rows.
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

  attachCollapseGroups(rows);

  return {
    sheet: sheetName,
    months,
    monthNatures,
    rows,
  };
}

export function balanceSheetNameFromRanges(ranges: NamedRange[]) {
  const accounts = getNamedRange(ranges, "BGCuenta");
  return accounts?.sheet ?? null;
}
