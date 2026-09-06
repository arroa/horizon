import type { StatementColumn, StatementRow } from "./types";

const MAX_OUTLINE_DEPTH = 2;

export type RowCollapseOptions = {
  /** Balance: hijos debajo del padre. EERR: hijos encima (summary below). */
  outlineChildren: "after" | "before";
  /** Totales de sección tipo Activos corrientes (Balance). */
  sectionTotals?: boolean;
  /** Partir con todos los grupos de fila colapsados (vista Excel “todo colapsado”). */
  defaultCollapsed?: boolean;
};

function isGrandTotal(label: string) {
  return /^total\b/i.test(label) || /^patrimonio total$/i.test(label) || /^resultado neto$/i.test(label);
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

function collectOutlineChildren(rows: StatementRow[], parentIndex: number, direction: "after" | "before") {
  const parentLevel = Math.min(MAX_OUTLINE_DEPTH, rows[parentIndex].outlineLevel ?? 0);
  if (parentLevel >= MAX_OUTLINE_DEPTH) return { childExcelRows: [] as number[], hiddenCount: 0 };

  const childExcelRows: number[] = [];
  let hiddenCount = 0;

  if (direction === "after") {
    for (let j = parentIndex + 1; j < rows.length; j++) {
      if (rows[j].kind === "spacer") break;
      const childLevel = Math.min(MAX_OUTLINE_DEPTH, rows[j].outlineLevel ?? 0);
      if (childLevel <= parentLevel) break;
      childExcelRows.push(rows[j].excelRow);
      if (rows[j].excelHidden) hiddenCount += 1;
    }
  } else {
    for (let j = parentIndex - 1; j >= 0; j--) {
      // En EERR hay filas vacías entre el detalle y el total (p. ej. Impuestos → Resultado Neto).
      if (rows[j].kind === "spacer") continue;
      const childLevel = Math.min(MAX_OUTLINE_DEPTH, rows[j].outlineLevel ?? 0);
      if (childLevel <= parentLevel) break;
      childExcelRows.unshift(rows[j].excelRow);
      if (rows[j].excelHidden) hiddenCount += 1;
    }
  }

  return { childExcelRows, hiddenCount };
}

/**
 * Outline Excel → grupos colapsables.
 * collapseLevel 2 (detalle de cuenta / línea).
 */
function attachOutlineGroups(
  rows: StatementRow[],
  direction: "after" | "before",
  defaultCollapsed?: boolean,
) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.kind === "spacer") continue;
    if (row.childExcelRows?.length) continue;

    const { childExcelRows, hiddenCount } = collectOutlineChildren(rows, i, direction);
    if (!childExcelRows.length) continue;

    if (row.kind === "account") row.kind = "group";
    row.collapseLevel = 2;
    row.childExcelRows = childExcelRows;
    row.excelCollapsed = defaultCollapsed || hiddenCount === childExcelRows.length;
  }
}

/**
 * Nivel 1: subtotales / totales de sección (en Excel vienen summary-below).
 */
function attachSectionTotalGroups(rows: StatementRow[]) {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.kind !== "total") continue;
    if (row.childExcelRows?.length) continue;

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
    row.excelCollapsed = !isGrandTotal(row.label);
  }
}

/**
 * Si el padre venía debajo del detalle (Excel), lo subimos para abrir hacia abajo.
 */
function reorderGroupsDownward(rows: StatementRow[]): StatementRow[] {
  const parents = rows.filter((row) => (row.childExcelRows?.length ?? 0) > 0);
  if (!parents.length) {
    for (const row of rows) row.displayDepth = 0;
    return rows;
  }

  const exclusiveKids = new Map<number, number[]>();
  for (const parent of parents) {
    const childSet = new Set(parent.childExcelRows);
    const nested = parents.filter(
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
 * Agrupaciones de columnas Excel (meses bajo trimestre, trimestres bajo año).
 * Summary a la derecha: hijos = columnas contiguas a la izquierda con mayor outlineLevel.
 */
export function attachColumnGroups(columns: StatementColumn[]) {
  for (let i = 0; i < columns.length; i++) {
    const parent = columns[i];
    const parentLevel = parent.outlineLevel ?? 0;
    const childIndexes: number[] = [];
    let hiddenCount = 0;

    for (let j = i - 1; j >= 0; j--) {
      const childLevel = columns[j].outlineLevel ?? 0;
      if (childLevel <= parentLevel) break;
      childIndexes.unshift(columns[j].index);
      if (columns[j].excelHidden) hiddenCount += 1;
    }

    if (!childIndexes.length) continue;
    parent.childIndexes = childIndexes;
    parent.excelCollapsed = hiddenCount === childIndexes.length;
  }
  return columns;
}

export function attachCollapseGroups(
  rows: StatementRow[],
  options: RowCollapseOptions = { outlineChildren: "after", sectionTotals: true },
) {
  // El outline de Excel asume orden de filas del libro. Si el snapshot ya viene
  // reordenado (padre arriba), "before" asignaría los hijos del bloque anterior.
  const ordered = [...rows].sort((a, b) => a.excelRow - b.excelRow);

  for (const row of ordered) {
    if (row.kind === "group") row.kind = "account";
    row.childExcelRows = undefined;
    row.collapseLevel = undefined;
    row.excelCollapsed = undefined;
    row.displayDepth = undefined;
  }

  promoteHiddenOrphans(ordered);
  attachOutlineGroups(ordered, options.outlineChildren, options.defaultCollapsed);
  if (options.sectionTotals !== false) {
    attachSectionTotalGroups(ordered);
  }

  return reorderGroupsDownward(ordered);
}
