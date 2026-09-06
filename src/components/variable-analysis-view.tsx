"use client";

import { useEffect, useMemo, useState } from "react";

import { useModel } from "@/components/model-provider";
import { ExcelFormulaDisplay } from "@/components/excel-formula-display";
import { analyzeVariable, findInputVersion, labelVariant } from "@/lib/excel/analyze-variable";
import type { VariableGroup } from "@/lib/excel/types";

type VariableAnalysisViewProps = {
  group: VariableGroup;
};

export function VariableAnalysisView({ group }: VariableAnalysisViewProps) {
  const { snapshot } = useModel();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedVariantId(group.variants[0]?.id ?? null);
  }, [group]);

  const selectedVariant = useMemo(() => {
    if (!group.variants.length) return null;
    return group.variants.find((item) => item.id === selectedVariantId) ?? group.variants[0];
  }, [group, selectedVariantId]);

  const analysis = useMemo(() => {
    if (!selectedVariant || !snapshot) return null;
    return analyzeVariable(selectedVariant, snapshot.variables);
  }, [selectedVariant, snapshot]);

  const inputVersion = useMemo(() => {
    if (!selectedVariant || !snapshot) return null;
    return findInputVersion(selectedVariant, snapshot.variables);
  }, [selectedVariant, snapshot]);

  if (!snapshot) {
    return (
      <p className="rounded-[13px] border border-[var(--line)] bg-[#f8f4ed] px-4 py-3 text-sm text-[#5f4d3d]">
        Carga el Excel con <strong>Cargar modelo</strong> para ver fórmulas, precedentes y dimensiones reales.
      </p>
    );
  }

  if (!group.variants.length) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Esta variable está en la vista de ejemplo. Carga el Excel para ver su ficha completa.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {group.variantCount > 1 && (
        <div>
          <p className="kicker">Elegir variante</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {group.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedVariantId(variant.id)}
                className={
                  variant.id === selectedVariant?.id
                    ? "rounded-full border border-[var(--green)] bg-[#edf5ea] px-3 py-1.5 text-xs font-bold text-[var(--green)]"
                    : "rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs text-[#56655e]"
                }
              >
                {labelVariant(variant)}
              </button>
            ))}
          </div>
        </div>
      )}

      {analysis && (
        <>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[var(--green)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              {analysis.classification}
            </span>
            <span className={analysis.dimensions.cuenta ? "dim-badge active" : "dim-badge"}>Cuenta</span>
            <span className={analysis.dimensions.linea ? "dim-badge active" : "dim-badge"}>Línea</span>
            <span className={analysis.dimensions.familia ? "dim-badge active" : "dim-badge"}>Familia</span>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-[13px] border border-[var(--line)] bg-white p-6">
              <p className="kicker">En lenguaje humano</p>
              <p className="mt-3 text-sm leading-7 text-[#56655e]">
                {analysis.variable.logica || analysis.explanation}
              </p>
              {analysis.precedents.length > 0 && (
                <div className="mt-6">
                  <p className="kicker">Precedentes</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {analysis.precedents.map((dep) => (
                      <li key={`${dep.type}-${dep.name}`} className="rounded-lg bg-[var(--paper)] px-3 py-2">
                        <strong>{dep.name}</strong>
                        {dep.description ? ` — ${dep.description}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
            <article className="rounded-[13px] border border-[var(--line)] bg-[#14261f] p-6 text-[#e2ece6]">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a9c2b4]">
                Como está en el Excel
              </p>
              <div className="mt-4">
                <ExcelFormulaDisplay
                  formula={analysis.formula}
                  dataType={analysis.variable.dataType}
                  excelRow={analysis.variable.excelRow}
                  months={analysis.variable.months ?? []}
                  monthLabels={snapshot.monthLabels ?? []}
                />
              </div>
            </article>
          </div>

          {inputVersion && selectedVariant?.dataType === "Output" && (
            <article className="rounded-[13px] border border-[var(--line)] bg-[#f7f8f6] p-6">
              <p className="kicker">Versión input asociada</p>
              <p className="mt-2 text-sm">{labelVariant(inputVersion)}</p>
              {inputVersion.logica && <p className="mt-2 text-sm text-[#56655e]">{inputVersion.logica}</p>}
            </article>
          )}
        </>
      )}
    </div>
  );
}
