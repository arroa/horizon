"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useModel } from "@/components/model-provider";
import { ExcelFormulaDisplay } from "@/components/excel-formula-display";
import { analyzeVariable, findInputVersion, labelVariant } from "@/lib/excel/analyze-variable";
import type { ModelVariable, VariableGroup } from "@/lib/excel/types";

type DimKey = "account" | "line" | "family";

const DIM_META: Record<DimKey, { label: string; empty: string }> = {
  account: { label: "Cuenta", empty: "Sin cuenta" },
  line: { label: "Línea", empty: "Sin línea" },
  family: { label: "Familia", empty: "Sin familia" },
};

function dimValue(variant: ModelVariable, key: DimKey) {
  const raw = variant[key]?.trim() ?? "";
  return raw || DIM_META[key].empty;
}

function uniqueDimValues(variants: ModelVariable[], key: DimKey) {
  return [...new Set(variants.map((v) => dimValue(v, key)))].sort((a, b) => a.localeCompare(b, "es"));
}

function matchesFilters(
  variant: ModelVariable,
  filters: Record<DimKey, string[]>,
  dims: DimKey[],
  except?: DimKey,
) {
  return dims.every((key) => {
    if (key === except) return true;
    const selected = filters[key];
    if (!selected.length) return true;
    return selected.includes(dimValue(variant, key));
  });
}

/** Options for one dimension, constrained by the other active filters. */
function availableValuesFor(
  key: DimKey,
  variants: ModelVariable[],
  filters: Record<DimKey, string[]>,
  dims: DimKey[],
) {
  const pool = variants.filter((variant) => matchesFilters(variant, filters, dims, key));
  return uniqueDimValues(pool, key);
}

/** Drop selections that no longer exist given the other dimensions (both directions). */
function reconcileFilters(
  filters: Record<DimKey, string[]>,
  variants: ModelVariable[],
  dims: DimKey[],
): Record<DimKey, string[]> {
  let next: Record<DimKey, string[]> = {
    account: [...filters.account],
    line: [...filters.line],
    family: [...filters.family],
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (const key of dims) {
      if (!next[key].length) continue;
      const available = new Set(availableValuesFor(key, variants, next, dims));
      const pruned = next[key].filter((value) => available.has(value));
      if (pruned.length !== next[key].length) {
        next = { ...next, [key]: pruned };
        changed = true;
      }
    }
  }
  return next;
}

type VariableAnalysisViewProps = {
  group: VariableGroup;
  domainLabel: string;
};

export function VariableAnalysisView({ group, domainLabel }: VariableAnalysisViewProps) {
  const { snapshot } = useModel();
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<DimKey, string[]>>({
    account: [],
    line: [],
    family: [],
  });
  const [openDim, setOpenDim] = useState<DimKey | null>(null);

  useEffect(() => {
    setSelectedVariantId(group.variants[0]?.id ?? null);
    setFilters({ account: [], line: [], family: [] });
    setOpenDim(null);
  }, [group]);

  const varyingDims = useMemo(() => {
    return (Object.keys(DIM_META) as DimKey[]).filter((key) => uniqueDimValues(group.variants, key).length > 1);
  }, [group.variants]);

  const filteredVariants = useMemo(() => {
    return group.variants.filter((variant) => matchesFilters(variant, filters, varyingDims));
  }, [group.variants, filters, varyingDims]);

  const optionsByDim = useMemo(() => {
    const map = {} as Record<DimKey, string[]>;
    for (const key of varyingDims) {
      map[key] = availableValuesFor(key, group.variants, filters, varyingDims);
    }
    return map;
  }, [group.variants, filters, varyingDims]);

  useEffect(() => {
    if (!filteredVariants.length) return;
    if (!filteredVariants.some((v) => v.id === selectedVariantId)) {
      setSelectedVariantId(filteredVariants[0].id);
    }
  }, [filteredVariants, selectedVariantId]);

  const selectedVariant = useMemo(() => {
    if (!filteredVariants.length) return null;
    return filteredVariants.find((item) => item.id === selectedVariantId) ?? filteredVariants[0];
  }, [filteredVariants, selectedVariantId]);

  const analysis = useMemo(() => {
    if (!selectedVariant || !snapshot) return null;
    return analyzeVariable(selectedVariant, snapshot.variables);
  }, [selectedVariant, snapshot]);

  const inputVersion = useMemo(() => {
    if (!selectedVariant || !snapshot) return null;
    return findInputVersion(selectedVariant, snapshot.variables);
  }, [selectedVariant, snapshot]);

  function toggleFilterValue(key: DimKey, value: string) {
    setFilters((prev) => {
      const current = prev[key];
      const nextValues = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return reconcileFilters({ ...prev, [key]: nextValues }, group.variants, varyingDims);
    });
  }

  function clearDim(key: DimKey) {
    setFilters((prev) => reconcileFilters({ ...prev, [key]: [] }, group.variants, varyingDims));
  }

  if (!snapshot) {
    return (
      <div className="space-y-6">
        <VariableHeader
          domainLabel={domainLabel}
          group={group}
          counterLabel={null}
          filters={null}
        />
        <p className="rounded-[13px] border border-[var(--line)] bg-[#f8f4ed] px-4 py-3 text-sm text-[#5f4d3d]">
          Carga el Excel con <strong>Cargar modelo</strong> para ver fórmulas, precedentes y dimensiones reales.
        </p>
      </div>
    );
  }

  if (!group.variants.length) {
    return (
      <div className="space-y-6">
        <VariableHeader
          domainLabel={domainLabel}
          group={group}
          counterLabel={null}
          filters={null}
        />
        <p className="text-sm text-[var(--muted)]">
          Esta variable está en la vista de ejemplo. Carga el Excel para ver su ficha completa.
        </p>
      </div>
    );
  }

  const total = group.variantCount;
  const visible = filteredVariants.length;
  const hasActiveFilters = varyingDims.some((key) => filters[key].length > 0);
  const counterLabel =
    total > 1 ? (hasActiveFilters ? `${visible} de ${total} variantes` : `${total} variantes`) : null;

  const filterBar =
    varyingDims.length > 0 ? (
      <div className="variable-header-filters">
        <p className="variable-header-filters-label">Filtrar por dimensión</p>
        <div className="variable-header-filters-row">
          {varyingDims.map((key) => (
            <DimensionFilter
              key={key}
              dimKey={key}
              values={optionsByDim[key] ?? []}
              selected={filters[key]}
              open={openDim === key}
              onToggleOpen={() => setOpenDim((prev) => (prev === key ? null : key))}
              onClose={() => setOpenDim(null)}
              onToggleValue={(value) => toggleFilterValue(key, value)}
              onClear={() => clearDim(key)}
            />
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div className="space-y-8">
      <VariableHeader
        domainLabel={domainLabel}
        group={group}
        counterLabel={counterLabel}
        filters={filterBar}
      />

      {total > 1 && (
        <div>
          <div className="variable-variants-head">
            <p className="kicker">Elegir variante</p>
            {hasActiveFilters && (
              <button
                type="button"
                className="variable-filters-reset"
                onClick={() => setFilters({ account: [], line: [], family: [] })}
              >
                Quitar filtros
              </button>
            )}
          </div>
          {visible === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">Ninguna variante coincide con los filtros.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {filteredVariants.map((variant) => (
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
          )}
        </div>
      )}

      {analysis && (
        <>
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

function VariableHeader({
  domainLabel,
  group,
  counterLabel,
  filters,
}: {
  domainLabel: string;
  group: VariableGroup;
  counterLabel: string | null;
  filters: ReactNode;
}) {
  const kindLabel = group.kind === "output" ? "Output" : "Input";

  return (
    <header className="variable-header">
      <p className="variable-header-crumb">{domainLabel}</p>
      <div className="variable-header-title-row">
        <h1 className="variable-header-title font-serif">{group.name}</h1>
        <span className="variable-kind-badge">{kindLabel}</span>
      </div>
      <p className="variable-header-meta">
        Variable {kindLabel.toLowerCase()}
        {counterLabel ? <span aria-hidden> · </span> : null}
        {counterLabel}
      </p>
      {filters}
    </header>
  );
}

type DimensionFilterProps = {
  dimKey: DimKey;
  values: string[];
  selected: string[];
  open: boolean;
  onToggleOpen: () => void;
  onClose: () => void;
  onToggleValue: (value: string) => void;
  onClear: () => void;
};

function DimensionFilter({
  dimKey,
  values,
  selected,
  open,
  onToggleOpen,
  onClose,
  onToggleValue,
  onClear,
}: DimensionFilterProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const meta = DIM_META[dimKey];
  const active = selected.length > 0;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const summary = active
    ? selected.length === 1
      ? selected[0]
      : `${selected.length} seleccionadas`
    : "Todas";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={open}
        className={open || active ? "dim-select is-open" : "dim-select"}
      >
        <span className="dim-select-copy">
          <span className="dim-select-label">{meta.label}</span>
          <span className="dim-select-value">{summary}</span>
        </span>
        <span className="dim-select-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="dim-filter-menu">
          <div className="dim-filter-menu-head">
            <span>{meta.label}</span>
            {active && (
              <button type="button" onClick={onClear} className="dim-filter-clear">
                Limpiar
              </button>
            )}
          </div>
          <ul className="dim-filter-list">
            {values.map((value) => {
              const checked = selected.includes(value);
              return (
                <li key={value}>
                  <label className="dim-filter-option">
                    <input type="checkbox" checked={checked} onChange={() => onToggleValue(value)} />
                    <span>{value}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
