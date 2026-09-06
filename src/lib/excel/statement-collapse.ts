import type { StatementRow } from "./types";

const MAX_OUTLINE_DEPTH = 2;

function isGrandTotal(label: string) {
  return /^total\b/i.test(label) || /^patrimonio total$/i.test(label);
}

/**
 * Filas ocultas sin outlineLevel (a veces Excel las deja así al colapsar):
 * se promueven a level = padre+1 para respetar el grupo visual.
 */
function promoteHiddenOrphans(rows: StatementRow[]) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.kind === "spacer") continue;
    const level = row.outlineLevel ?? 0;
    if (row.excelHidden || level >= MAX_OUTLINE_DEPTH) continue;

    let j = i + 1;
    const orphans: number[] = [];
    while (
      j < rows.length &&
      rows[j].kind !== "spacer" &&
      (rows[j].outlineLevel ?? 0) === 0 &&
      rows[j].excelHidden
    ) {
      orphans.push(j);
      j += 1;
    }
    if (!orphans.length) continue;
    const childLevel = Math.min(MAX_OUTLINE_DEPTH, level + 1);
    for (const idx of orphans) {
      rows[idx].outlineLevel = childLevel;
    }
  }
}

/**
 * Nivel 2: outline Excel. Padre visible arriba; hijos debajo (abre hacia abajo).
 */
function attachOutlineGroups(rows: StatementRow[]) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.kind === "spacer" || row.kind === "total") continue;

    const parentLevel = Math.min(MAX_OUTLINE_DEPTH, row.outlineLevel ?? 0);
    if (parentLevel >= MAX_OUTLINE_DEPTH) continue;

    const childExcelRows: number[] = [];
    let hiddenCount = 0;
    for (let j = i + 1; j < rows.length; j++) {
      if (rows[j].kind === "spacer" || rows[j].kind === "total") break;
      const childLevel = Math.min(MAX_OUTLINE_DEPTH, rows[j].outlineLevel ?? 0);
      if (childLevel <= parentLevel) break;
      childExcelRows.push(rows[j].excelRow);
      if (rows[j].excelHidden) hiddenCount += 1;
    }

    if (!childExcelRows.length) continue;

    row.kind = "group";
    row.collapseLevel = 2;
    row.childExcelRows = childExcelRows;
    row.excelCollapsed = hiddenCount === childExcelRows.length;
  }
}

/**
 * Nivel 1: subtotales / totales de sección (en Excel vienen summary-below).
 * Luego se reordenan para mostrar el total arriba y el detalle debajo.
 */
function attachSectionTotalGroups(rows: StatementRow[]) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.kind !== "total") continue;

    let start = i - 1;
    if (isGrandTotal(row.label)) {
      while (start >= 0 && rows[start].kind !== "spacer") start -= 1;
      start += 1;
    } else {
      while (start >= 0 && rows[start].kind !== "spacer" && rows[start].kind !== "total") {
        start -= 1;
      }
      start += 1;
    }

    const childExcelRows: number[] = [];
    for (let j = start; j < i; j++) {
      if (rows[j].kind === "spacer") continue;
      childExcelRows.push(rows[j].excelRow);
    }
    if (!childExcelRows.length) continue;

    row.collapseLevel = 1;
    row.childExcelRows = childExcelRows;
    // Subtotales de sección parten colapsados; "Total …" queda expandido.
    row.excelCollapsed = !isGrandTotal(row.label);
  }
}

/**
 * Excel pone el total debajo del detalle; lo movemos arriba para que
 * expandir/colapsar abra hacia abajo (como el outline).
 */
function reorderSectionTotalsDownward(rows: StatementRow[]): StatementRow[] {
  const sectionParents = rows.filter(
    (row) => row.collapseLevel === 1 && (row.childExcelRows?.length ?? 0) > 0,
  );
  if (!sectionParents.length) {
    for (const row of rows) row.displayDepth = 0;
    return rows;
  }

  const exclusiveKids = new Map<number, number[]>();
  for (const parent of sectionParents) {
    const childSet = new Set(parent.childExcelRows);
    const nested = sectionParents.filter(
      (other) => other.excelRow !== parent.excelRow && childSet.has(other.excelRow),
    );
    const claimedByNested = new Set<number>();
    for (const nestedParent of nested) {
      for (const child of nestedParent.childExcelRows || []) {
        claimedByNested.add(child);
      }
    }
    exclusiveKids.set(
      parent.excelRow,
      (parent.childExcelRows || []).filter((id) => !claimedByNested.has(id)),
    );
  }

  const owned = new Set<number>();
  for (const kids of exclusiveKids.values()) {
    for (const id of kids) owned.add(id);
  }

  const byId = new Map(rows.map((row) => [row.excelRow, row]));
  const result: StatementRow[] = [];

  const emit = (row: StatementRow, depth: number) => {
    row.displayDepth = depth;
    result.push(row);
    const kids = exclusiveKids.get(row.excelRow);
    if (!kids?.length) return;
    for (const id of kids) {
      const child = byId.get(id);
      if (child) emit(child, depth + 1);
    }
  };

  for (const row of rows) {
    if (owned.has(row.excelRow)) continue;
    emit(row, 0);
  }

  return result;
}

/**
 * Dos niveles:
 * 1) Totales de sección (reordenados: total arriba, detalle abajo)
 * 2) Outline Excel (cuenta → desglose, abre hacia abajo)
 */
export function attachCollapseGroups(rows: StatementRow[]) {
  for (const row of rows) {
    if (row.kind === "group") row.kind = "account";
    row.childExcelRows = undefined;
    row.collapseLevel = undefined;
    row.excelCollapsed = undefined;
    row.displayDepth = undefined;
  }

  promoteHiddenOrphans(rows);
  attachOutlineGroups(rows);
  attachSectionTotalGroups(rows);

  return reorderSectionTotalsDownward(rows);
}
