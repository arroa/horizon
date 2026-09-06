"use client";

import { useMemo } from "react";

import { useModel } from "@/components/model-provider";
import { ModelLoading } from "@/components/model-loading";
import { StatementTable } from "@/components/statement-table";

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
    <main className="statement-page">
      <header className="statement-page-header">
        <p className="kicker">Como está en el Excel</p>
        <h1 className="font-serif text-4xl">Balance general</h1>
        <p className="mt-3 max-w-3xl text-sm text-[var(--muted)]">
          Cuentas × meses desde <code>BGCuenta</code> / <code>BGValores</code>. Los grupos
          se abren hacia abajo; las columnas distinguen Real vs Proy.
        </p>
      </header>

      {emptyHint ? (
        <p className="mt-8 rounded-[13px] border border-[var(--line)] bg-[#f8f4ed] px-4 py-3 text-sm text-[#5f4d3d]">
          {emptyHint}
        </p>
      ) : (
        balance && (
          <div className="statement-page-canvas">
            <StatementTable statement={balance} />
          </div>
        )
      )}
    </main>
  );
}
