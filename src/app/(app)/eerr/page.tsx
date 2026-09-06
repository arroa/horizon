"use client";

import { useMemo } from "react";

import { useModel } from "@/components/model-provider";
import { ModelLoading } from "@/components/model-loading";
import { StatementTable } from "@/components/statement-table";

export default function EerrPage() {
  const { snapshot, ready } = useModel();
  const eerr = snapshot?.eerr;

  const emptyHint = useMemo(() => {
    if (!snapshot) return "Carga el Excel con Cargar modelo para ver el Estado de Resultados.";
    if (!eerr) return "El modelo cargado no trae rangos EERRCuenta / EERRMeses / EERRValores.";
    return null;
  }, [snapshot, eerr]);

  if (!ready) return <ModelLoading />;

  return (
    <main className="statement-page">
      <header className="statement-page-header">
        <p className="kicker">Como está en el Excel</p>
        <h1 className="font-serif text-4xl">Estado de resultados</h1>
        <p className="mt-3 max-w-3xl text-sm text-[var(--muted)]">
          Hoja <code>EERR MdS</code> · <code>EERRCuenta</code> / <code>EERRValores</code>. Misma
          lógica que Balance, más agrupaciones de columnas (trimestres y años).
        </p>
      </header>

      {emptyHint ? (
        <p className="mt-8 rounded-[13px] border border-[var(--line)] bg-[#f8f4ed] px-4 py-3 text-sm text-[#5f4d3d]">
          {emptyHint}
        </p>
      ) : (
        eerr && (
          <div className="statement-page-canvas">
            <StatementTable statement={eerr} />
          </div>
        )
      )}
    </main>
  );
}
