"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useModel } from "@/components/model-provider";
import { ModelLoading } from "@/components/model-loading";
import { ReportChat } from "@/components/report-chat";
import { attachCollapseGroups } from "@/lib/excel/statement-collapse";
import type { FinancialStatement, StatementMonthNature, StatementRow } from "@/lib/excel/types";

const VISIBLE_MONTHS = 6;
const MONTH_SCROLL_STEP = 48;

function natureLabel(nature: StatementMonthNature) {
  if (nature === "real") return "Real";
  if (nature === "proy") return "Proy";
  return null;
}

function withCollapseGroups(rows: StatementRow[]) {
  return attachCollapseGroups(
    rows.map((row) => ({
      ...row,
      kind: row.kind === "group" ? "account" : row.kind,
      childExcelRows: undefined,
      collapseLevel: undefined,
      excelCollapsed: undefined,
      displayDepth: undefined,
    })),
  );
}

function StatementTable({ statement }: { statement: FinancialStatement }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const syncingFromState = useRef(false);

  const rows = useMemo(() => withCollapseGroups(statement.rows), [statement.rows]);

  const maxStart = Math.max(0, statement.months.length - VISIBLE_MONTHS);

  const [startIndex, setStartIndex] = useState(() => {
    const preferred = statement.months.findIndex((label) => /jun-?26|jul-?26|ene-?26/i.test(label));
    if (preferred >= 0) return Math.min(maxStart, Math.max(0, preferred - 1));
    return maxStart;
  });

  const [collapsed, setCollapsed] = useState<Record<number, boolean>>(() => {
    const initial: Record<number, boolean> = {};
    const prepared = withCollapseGroups(statement.rows);
    for (const row of prepared) {
      if (row.childExcelRows?.length && row.excelCollapsed) {
        initial[row.excelRow] = true;
      }
    }
    return initial;
  });

  const endIndex = Math.min(statement.months.length, startIndex + VISIBLE_MONTHS);
  const visibleMonths = statement.months.slice(startIndex, endIndex);
  const monthNatures = statement.monthNatures ?? statement.months.map(() => "unknown" as const);
  const visibleNatures = monthNatures.slice(startIndex, endIndex);
  const hasNatureSplit = monthNatures.some((n) => n === "real") && monthNatures.some((n) => n === "proy");

  const hiddenRows = useMemo(() => {
    const hidden = new Set<number>();
    for (const row of rows) {
      if (!collapsed[row.excelRow] || !row.childExcelRows?.length) continue;
      row.childExcelRows.forEach((excelRow) => hidden.add(excelRow));
    }
    return hidden;
  }, [collapsed, rows]);

  const visibleRows = useMemo(
    () => rows.filter((row) => row.kind === "spacer" || !hiddenRows.has(row.excelRow)),
    [hiddenRows, rows],
  );

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const nextLeft = startIndex * MONTH_SCROLL_STEP;
    if (Math.abs(el.scrollLeft - nextLeft) > 1) {
      syncingFromState.current = true;
      el.scrollLeft = nextLeft;
      requestAnimationFrame(() => {
        syncingFromState.current = false;
      });
    }
  }, [startIndex, statement.months.length]);

  const onMonthScroll = () => {
    if (syncingFromState.current) return;
    const el = scrollerRef.current;
    if (!el) return;
    const next = Math.min(maxStart, Math.max(0, Math.round(el.scrollLeft / MONTH_SCROLL_STEP)));
    setStartIndex((prev) => (prev === next ? prev : next));
  };

  const toggleCollapse = (excelRow: number) => {
    setCollapsed((prev) => ({ ...prev, [excelRow]: !prev[excelRow] }));
  };

  const expandAll = () => setCollapsed({});

  const collapseAllGroups = () => {
    const next: Record<number, boolean> = {};
    for (const row of rows) {
      if (row.childExcelRows?.length) next[row.excelRow] = true;
    }
    setCollapsed(next);
  };

  return (
    <div className="balance-panel">
      <div className="balance-toolbar">
        <p className="balance-meta">
          {statement.sheet} · {statement.rows.filter((r) => r.kind !== "spacer").length} cuentas ·{" "}
          {statement.months.length} meses
        </p>
        <div className="balance-toolbar-right">
          {hasNatureSplit && (
            <div className="balance-legend" aria-label="Leyenda Real vs Proyectado">
              <span className="balance-legend-item nature-real">Real</span>
              <span className="balance-legend-item nature-proy">Proy</span>
            </div>
          )}
          <div className="balance-collapse-actions">
            <button type="button" className="balance-ghost-btn" onClick={expandAll}>
              Expandir grupos
            </button>
            <button type="button" className="balance-ghost-btn" onClick={collapseAllGroups}>
              Colapsar grupos
            </button>
          </div>
          <p className="balance-range">
            {visibleMonths[0]} – {visibleMonths[visibleMonths.length - 1]}
          </p>
        </div>
      </div>

      <div className="balance-table-wrap">
        <div
          ref={scrollerRef}
          className="balance-month-scroller"
          onScroll={onMonthScroll}
          title="Desplaza para cambiar el rango de meses"
          aria-label="Desplazamiento de meses"
        >
          <div
            className="balance-month-scroller-track"
            style={{ width: `calc(100% + ${maxStart * MONTH_SCROLL_STEP}px)` }}
          />
        </div>

        <div className="balance-table-body">
          <table className="balance-table">
            <thead>
              <tr>
                <th className="balance-col-account">Cuenta</th>
                {visibleMonths.map((month, index) => {
                  const nature = visibleNatures[index] ?? "unknown";
                  const label = natureLabel(nature);
                  const prevNature = index > 0 ? visibleNatures[index - 1] : undefined;
                  const isBoundary = Boolean(prevNature && prevNature !== nature && nature !== "unknown" && prevNature !== "unknown");
                  return (
                    <th
                      key={`${startIndex + index}-${month}`}
                      className={`balance-col-month${isBoundary ? " nature-boundary" : ""}`}
                      data-nature={nature}
                    >
                      <span className="balance-month-label">{month}</span>
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
                      <td colSpan={1 + visibleMonths.length} />
                    </tr>
                  );
                }

                const canCollapse = (row.childExcelRows?.length ?? 0) > 0;
                const isCollapsed = !!collapsed[row.excelRow];
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
                          onClick={() => toggleCollapse(row.excelRow)}
                        >
                          <span className="balance-collapse-chevron" data-open={isCollapsed ? "0" : "1"}>
                            ▸
                          </span>
                          <span>{row.label}</span>
                        </button>
                      ) : (
                        <span
                          className={outlineLevel > 0 || (row.displayDepth ?? 0) > 0 ? "balance-detail-label" : undefined}
                          style={{ paddingLeft: indent }}
                        >
                          {row.label}
                        </span>
                      )}
                    </td>
                    {row.values.slice(startIndex, endIndex).map((value, index) => {
                      const nature = visibleNatures[index] ?? "unknown";
                      const prevNature = index > 0 ? visibleNatures[index - 1] : undefined;
                      const isBoundary = Boolean(prevNature && prevNature !== nature && nature !== "unknown" && prevNature !== "unknown");
                      return (
                        <td
                          key={`${row.excelRow}-${startIndex + index}`}
                          className={`balance-col-month${isBoundary ? " nature-boundary" : ""}`}
                          data-nature={nature}
                        >
                          {value || "—"}
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

export default function BalancePage() {
  const { snapshot, ready } = useModel();
  const balance = snapshot?.balance;

  const emptyHint = useMemo(() => {
    if (!snapshot) return "Carga el Excel con Cargar modelo para ver el Balance General.";
    if (!balance) return "El modelo cargado no trae rangos BGCuenta / BGMeses / BGValores.";
    return null;
  }, [snapshot, balance]);

  if (!ready) return <ModelLoading />;

  return (
    <main className="grid gap-6 px-6 py-12 lg:grid-cols-[1.55fr_.75fr] lg:px-16">
      <section>
        <p className="kicker">Como está en el Excel</p>
        <h1 className="font-serif text-4xl">Balance general</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">
          Cuentas × meses desde <code>BGCuenta</code> / <code>BGValores</code>. Los grupos
          se abren hacia abajo; las columnas distinguen Real vs Proy.
        </p>

        {emptyHint ? (
          <p className="mt-8 rounded-[13px] border border-[var(--line)] bg-[#f8f4ed] px-4 py-3 text-sm text-[#5f4d3d]">
            {emptyHint}
          </p>
        ) : (
          balance && (
            <div className="mt-8">
              <StatementTable statement={balance} />
            </div>
          )
        )}
      </section>
      <ReportChat screen="Balance" />
    </main>
  );
}
