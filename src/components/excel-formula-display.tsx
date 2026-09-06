"use client";

import { useState } from "react";

import { FormulaModal } from "@/components/formula-modal";
import { isFormula } from "@/lib/excel/translate-formula";
import type { MonthValue } from "@/lib/excel/types";

type ExcelFormulaDisplayProps = {
  formula: string;
  dataType?: string;
  excelRow?: number;
  months?: MonthValue[];
  /** Fallback month titles when the variable has no month rows yet. */
  monthLabels?: string[];
};

function resolveMonths(months: MonthValue[], monthLabels: string[]): MonthValue[] {
  if (months.length > 0) return months;
  if (monthLabels.length > 0) {
    return monthLabels.map((label) => ({ label, value: "", isFormula: false }));
  }
  return [];
}

export function ExcelFormulaDisplay({
  formula,
  dataType,
  excelRow,
  months = [],
  monthLabels = [],
}: ExcelFormulaDisplayProps) {
  const [formulaOpen, setFormulaOpen] = useState(false);
  const formulaLike = isFormula(formula);
  const resolvedMonths = resolveMonths(months, monthLabels);
  const showMonthGrid = resolvedMonths.length > 0;
  const canShowFormula = Boolean(formula) && (formulaLike || dataType !== "Input");

  if (!showMonthGrid && !canShowFormula) {
    const emptyMessage =
      dataType === "Input" ? "No hay valores introducidos." : "Sin fórmula en la columna de valores.";
    return <p className="formula-empty">{emptyMessage}</p>;
  }

  return (
    <div className="formula-panel">
      {showMonthGrid && (
        <div className="month-values">
          <div className="formula-panel-header">
            <span className="formula-panel-label">Valores · MGMeses / MGValores</span>
            <div className="formula-panel-meta">
              {dataType && <span>Tipo: {dataType}</span>}
              {excelRow != null && excelRow > 0 && <span>Fila: {excelRow}</span>}
            </div>
          </div>
          <div className="month-values-grid">
            {resolvedMonths.map((month) => (
              <div key={month.label} className="month-value-card">
                <span className="month-value-label">{month.label}</span>
                <span className="month-value-amount">
                  {month.value ? month.value : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {canShowFormula && (
        <button type="button" className="formula-view-btn" onClick={() => setFormulaOpen(true)}>
          Ver fórmula
        </button>
      )}

      <FormulaModal
        open={formulaOpen}
        onClose={() => setFormulaOpen(false)}
        formula={formula}
        dataType={dataType}
        excelRow={excelRow}
      />
    </div>
  );
}
