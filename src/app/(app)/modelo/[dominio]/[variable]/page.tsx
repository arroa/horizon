import Link from "next/link";
import { notFound } from "next/navigation";

import { getVariable } from "@/lib/domains";

export default async function VariablePage({
  params,
}: {
  params: Promise<{ dominio: string; variable: string }>;
}) {
  const { dominio, variable: slug } = await params;
  const found = getVariable(dominio, slug);
  if (!found) notFound();

  const { domain, variable } = found;

  return (
    <main className="px-6 py-14 lg:px-20">
      <p className="text-xs text-[var(--muted)]">
        <Link href="/modelo" className="hover:underline">
          Modelo
        </Link>
        {" / "}
        <Link href={`/modelo/${domain.id}`} className="hover:underline">
          {domain.number} {domain.title}
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">{variable.kind === "output" ? "Variable output" : "Variable input"}</p>
          <h1 className="font-serif text-4xl">{variable.name}</h1>
        </div>
        <span className="rounded-full bg-[var(--green)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
          {variable.kind}
        </span>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <article className="rounded-[13px] border border-[var(--line)] bg-white p-6">
          <p className="kicker">En lenguaje humano</p>
          <p className="mt-3 text-sm leading-7 text-[#56655e]">
            {variable.formulaHumana || domain.logic}
          </p>
          {variable.inputs && variable.inputs.length > 0 && (
            <div className="mt-6">
              <p className="kicker">Valores de input que usa</p>
              <ul className="mt-2 space-y-2 text-sm">
                {variable.inputs.map((name) => (
                  <li key={name} className="rounded-lg bg-[var(--paper)] px-3 py-2">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>
        <article className="rounded-[13px] border border-[var(--line)] bg-[#14261f] p-6 text-[#e2ece6]">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a9c2b4]">Como está en el Excel</p>
          <pre className="mt-4 overflow-x-auto font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
            {variable.formulaExcel || "La fórmula INDEX/MATCH se cargará desde el snapshot del Modelo Horizon."}
          </pre>
        </article>
      </div>

      <p className="mt-8 text-sm text-[var(--muted)]">
        Los valores mensuales y el grafo real llegan con el ingest del Excel. Esta ficha ya
        tiene el marco: humano + Excel + inputs.
      </p>

      <Link href={`/modelo/${domain.id}`} className="mt-8 inline-block text-sm font-semibold text-[var(--green)]">
        ← Volver a {domain.title}
      </Link>
    </main>
  );
}
