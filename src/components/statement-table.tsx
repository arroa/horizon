"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { attachCollapseGroups } from "@/lib/excel/statement-collapse";
import type {
  FinancialStatement,
  StatementColumn,
  StatementMonthNature,
} from "@/lib/excel/types";

const VISIBLE_COLS = 6;
const COL_SCROLL_STEP = 48;

function natureLabel(nature: StatementMonthNature) {
  if (nature === "real") return "Real";
  if (nature === "proy") return "Proy";
  if (nature === "grupo") return "Grupo";
  return null;
}

function withCollapseGroups(statement: FinancialStatement) {
  const options = statement.rowCollapse ?? { outlineChildren: "after" as const, sectionTotals: true };
  return attachCollapseGroups(
    statement.rows.map((row) => ({
      ...row,
      kind: row.kind === "group" ? "account" : row.kind,
      childExcelRows: undefined,
      collapseLevel: undefined,
      excelCollapsed: undefined,
      displayDepth: undefined,
    })),
    options,
  );
}

function ensureColumns(statement: FinancialStatement): StatementColumn[] {
  if (statement.columns?.length) return statement.columns;
  return statement.months.map((label, index) => ({
    index,
    label,
    nature: statement.monthNatures?.[index] ?? "unknown",
    kind: "month" as const,
    outlineLevel: 0,
  }));
}

export function StatementTable({ statement }: { statement: FinancialStatement }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const syncingFromState = useRef(false);

  const rows = useMemo(() => withCollapseGroups(statement), [statement]);
  const columns = useMemo(() => ensureColumns(statement), [statement]);
  const hasColumnGroups = columns.some((col) => (col.childIndexes?.length ?? 0) > 0);

  const [collapsedRows, setCollapsedRows] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    const prepared = withCollapseGroups(statement);
    for (const row of prepared) {
      if (row.childExcelRows?.length && row.excelCollapsed) {
        initial[row.excelRow] = true;
      }
    }
    return initial;
  });

  const [collapsedCols, setCollapsedCols] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    for (const col of ensureColumns(statement)) {
      if (col.childIndexes?.length && col.excelCollapsed) {
        initial[col.index] = true;
      }
    }
    return initial;
  });

  const hiddenRows = useMemo(() => {
    const hidden = new Set<number>();
    for (const row of rows) {
      if (!collapsedRows[row.excelRow] || !row.childExcelRows?.length) continue;
      row.childExcelRows.forEach((excelRow) => hidden.add(excelRow));
    }
    return hidden;
  }, [collapsedRows, rows]);

  const visibleRows = useMemo(
    () => rows.filter((row) => row.kind === "spacer" || !hiddenRows.has(row.excelRow)),
    [hiddenRows, rows],
  );

  const hiddenColIndexes = useMemo(() => {
    const hidden = new Set<number>();
    for (const col of columns) {
      if (!collapsedCols[col.index] || !col.childIndexes?.length) continue;
      col.childIndexes.forEach((index) => hidden.add(index));
    }
    return hidden;
  }, [collapsedCols, columns]);

  const activeColumns = useMemo(
    () => columns.filter((col) => !hiddenColIndexes.has(col.index)),
    [columns, hiddenColIndexes],
  );

  const maxStart = Math.max(0, activeColumns.length - VISIBLE_COLS);

  const [startIndex, setStartIndex] = useState(() => {
    const preferred = activeColumns.findIndex((col) => /jun-?26|jul-?26|ene-?26/i.test(col.label));
    if (preferred >= 0) return Math.min(Math.max(0, activeColumns.length - VISIBLE_COLS), Math.max(0, preferred - 1));
    return Math.max(0, activeColumns.length - VISIBLE_COLS);
  });

  const safeStart = Math.min(startIndex, maxStart);
  const endIndex = Math.min(activeColumns.length, safeStart + VISIBLE_COLS);
  const visibleColumns = activeColumns.slice(safeStart, endIndex);

  const hasNatureSplit =
    columns.some((c) => c.nature === "real") && columns.some((c) => c.nature === "proy");
  const hasGrupo = columns.some((c) => c.nature === "grupo");

  useEffect(() => {
    if (startIndex > maxStart) setStartIndex(maxStart);
  }, [maxStart, startIndex]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const nextLeft = safeStart * COL_SCROLL_STEP;
    if (Math.abs(el.scrollLeft - nextLeft) > 1) {
      syncingFromState.current = true;
      el.scrollLeft = nextLeft;
      requestAnimationFrame(() => {
        syncingFromState.current = false;
      });
    }
  }, [safeStart, activeColumns.length]);

  const onMonthScroll = () => {
    if (syncingFromState.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const next = Math.min(maxStart, Math.max(0, Math.round(el.scrollLeft / COL_SCROLL_STEP)));
    setStartIndex((prev) => (prev === next ? prev : next));
  };

  const toggleRow = (excelRow: number) => {
    setCollapsedRows((prev) => ({ ...prev, [excelRow]: !prev[excelRow] }));
  };

  const toggleCol = (index: number) => {
    setCollapsedCols((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const expandRows = () => setCollapsedRows({});
  const collapseRows = () => {
    const next: Record<number, boolean> = {};
    for (const row of rows) {
      if (row.childExcelRows?.length) next[row.excelRow] = true;
    }
    setCollapsedRows(next);
  };

  const expandPeriods = () => setCollapsedCols({});
  const collapseMonths = () => {
    const next: Record<number, boolean> = {};
    for (const col of columns) {
      if (col.kind === "quarter" && col.childIndexes?.length) next[col.index] = true;
    }
    setCollapsedCols(next);
  };
  const collapseToYears = () => {
    const next: Record<number, boolean> = {};
    for (const col of columns) {
      if ((col.kind === "year" || col.kind === "quarter") && col.childIndexes?.length) {
        next[col.index] = true;
      }
    }
    setCollapsedCols(next);
  };

  return (
    <div className="balance-panel">
      <div className="balance-toolbar">
        <p className="balance-meta">
          {statement.sheet} · {statement.rows.filter((r) => r.kind !== "spacer").length} cuentas ·{" "}
          {activeColumns.length}/{columns.length} periodos
        </p>
        <div className="balance-toolbar-right">
          {(hasNatureSplit || hasGrupo) && (
            <div className="balance-legend" aria-label="Leyenda de columnas">
              {hasNatureSplit && <span className="balance-legend-item nature-real">Real</span>}
              {hasNatureSplit && <span className="balance-legend-item nature-proy">Proy</span>}
              {hasGrupo && <span className="balance-legend-item nature-grupo">Grupo</span>}
            </div>
          )}
          <div className="balance-collapse-actions">
            <button type="button" className="balance-ghost-btn" onClick={expandRows}>
              Expandir filas
            </button>
            <button type="button" className="balance-ghost-btn" onClick={collapseRows}>
              Colapsar filas
            </button>
            {hasColumnGroups && (
              <>
                <button type="button" className="balance-ghost-btn" onClick={expandPeriods}>
                  Expandir periodos
                </button>
                <button type="button" className="balance-ghost-btn" onClick={collapseMonths}>
                  Solo trimestres
                </button>
                <button type="button" className="balance-ghost-btn" onClick={collapseToYears}>
                  Solo años
                </button>
              </>
            )}
          </div>
          <p className="balance-range">
            {visibleColumns[0]?.label ?? "—"} – {visibleColumns[visibleColumns.length - 1]?.label ?? "—"}
          </p>
        </div>
      </div>

      <div className="balance-table-wrap">
        <div
          ref={scrollerRef}
          className="balance-month-scroller"
          onScroll={onMonthScroll}
          title="Desplaza para cambiar el rango de periodos"
          aria-label="Desplazamiento de periodos"
        >
          <div
            className="balance-month-scroller-track"
            style={{ width: `calc(100% + ${maxStart * COL_SCROLL_STEP}px)` }}
          />
        </div>

        <div className="balance-table-body">
          <table className="balance-table">
            <thead>
              <tr>
                <th className="balance-col-account">Cuenta</th>
                {visibleColumns.map((col, index) => {
                  const prev = index > 0 ? visibleColumns[index - 1] : undefined;
                  const isBoundary = Boolean(
                    prev &&
                      prev.nature !== col.nature &&
                      col.nature !== "unknown" &&
                      prev.nature !== "unknown",
                  );
                  const canCollapse = (col.childIndexes?.length ?? 0) > 0;
                  const isCollapsed = !!collapsedCols[col.index];
                  const label = natureLabel(col.nature);
                  return (
                    <th
                      key={`h-${col.index}-${col.label}`}
                      className={`balance-col-month${isBoundary ? " nature-boundary" : ""}${
                        canCollapse ? " balance-col-group" : ""
                      }`}
                      data-nature={col.nature}
                      data-kind={col.kind}
                    >
                      {canCollapse ? (
                        <button
                          type="button"
                          className="balance-col-collapse-btn"
                          aria-expanded={!isCollapsed}
                          onClick={() => toggleCol(col.index)}
                          title={isCollapsed ? "Expandir periodo" : "Colapsar detalle"}
                        >
                          <span className="balance-collapse-chevron" data-open={isCollapsed ? "0" : "1"}>
                            ▸
                          </span>
                          <span className="balance-month-label">{col.label}</span>
                        </button>
                      ) : (
                        <span className="balance-month-label">{col.label}</span>
                      )}
                      {label && <span className="balance-month-nature">{label}</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                if (row.kind === "spacer") {
                  return (
                    <tr key={`spacer-${row.excelRow}`} className="balance-row-spacer">
                      <td colSpan={1 + visibleColumns.length} />
                    </tr>
                  );
                }

                const canCollapse = (row.childExcelRows?.length ?? 0) > 0;
                const isCollapsed = !!collapsedRows[row.excelRow];
                const outlineLevel = row.outlineLevel ?? 0;
                const indent = (row.displayDepth ?? 0) * 14 + outlineLevel * 14;
                const rowClass =
                  row.kind === "total"
                    ? "balance-row-total"
                    : canCollapse
                      ? "balance-row-group"
                      : outlineLevel > 0 || (row.displayDepth ?? 0) > 0
                        ? "balance-row-detail"
                        : "balance-row-account";

                return (
                  <tr key={`${row.excelRow}-${row.label}`} className={rowClass} data-outline={outlineLevel}>
                    <td className="balance-col-account">
                      {canCollapse ? (
                        <button
                          type="button"
                          className={`balance-collapse-btn level-${row.collapseLevel ?? 1}`}
                          style={{ paddingLeft: indent }}
                          aria-expanded={!isCollapsed}
                          onClick={() => toggleRow(row.excelRow)}
                        >
                          <span className="balance-collapse-chevron" data-open={isCollapsed ? "0" : "1"}>
                            ▸
                          </span>
                          <span>{row.label}</span>
                        </button>
                      ) : (
                        <span
                          className={
                            outlineLevel > 0 || (row.displayDepth ?? 0) > 0 ? "balance-detail-label" : undefined
                          }
                          style={{ paddingLeft: indent }}
                        >
                          {row.label}
                        </span>
                      )}
                    </td>
                    {visibleColumns.map((col, index) => {
                      const prev = index > 0 ? visibleColumns[index - 1] : undefined;
                      const isBoundary = Boolean(
                        prev &&
                          prev.nature !== col.nature &&
                          col.nature !== "unknown" &&
                          prev.nature !== "unknown",
                      );
                      return (
                        <td
                          key={`${row.excelRow}-${col.index}`}
                          className={`balance-col-month${isBoundary ? " nature-boundary" : ""}`}
                          data-nature={col.nature}
                          data-kind={col.kind}
                        >
                          {row.values[col.index] || "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
