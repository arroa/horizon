"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";

import { useModel } from "@/components/model-provider";
import { ModelLoading } from "@/components/model-loading";
import {
  formatVariableLabel,
  getDomainById,
  getDomainNeighbors,
  variableSlug,
} from "@/lib/model-helpers";

export default function DominioPage() {
  const params = useParams<{ dominio: string }>();
  const { domains, snapshot, ready } = useModel();

  if (!ready) return <ModelLoading />;

  const domain = getDomainById(domains, params.dominio);
  if (!domain) notFound();

  const { prev, next, position, total } = getDomainNeighbors(domains, domain.id);

  return (
    <main className="px-6 py-12 lg:px-12 xl:px-16">
      <p className="text-xs text-[var(--muted)]">
        Ámbito {String(position).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </p>
      <div className="mt-4 flex items-center gap-5">
        <div className="grid h-[64px] w-[64px] place-items-center rounded-full bg-[var(--green)] font-serif text-[24px] italic text-[var(--lime)]">
          {domain.number}
        </div>
        <div>
          <p className="kicker">{domain.eyebrow}</p>
          <h1 className="font-serif text-3xl lg:text-4xl">{domain.title}</h1>
          <p className="mt-2 text-sm text-[#647169]">{domain.question}</p>
        </div>
      </div>

      <p className="mt-8 max-w-3xl font-serif text-xl leading-snug text-[#2d4038] lg:text-2xl">
        {domain.longDesc}
      </p>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <article className="rounded-[13px] border border-[#d5dbd4] bg-white/75 p-5">
          <p className="kicker">Qué entra · {domain.inputs.length}</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {domain.inputs.length === 0 && <li className="text-[var(--muted)]">Sin inputs en este ámbito</li>}
            {domain.inputs.map((item) => (
              <li key={`input-${item.name}`}>
                {snapshot || item.variants.length > 0 ? (
                  <Link
                    href={`/modelo/${domain.id}/${variableSlug(item.name, item.kind)}`}
                    className="text-[var(--green)] hover:underline"
                  >
                    {formatVariableLabel(item)}
                  </Link>
                ) : (
                  <span className="text-[var(--muted)]">{formatVariableLabel(item)}</span>
                )}
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-[13px] border border-[#d5dbd4] bg-white p-5">
          <p className="kicker">Qué produce · {domain.outputs.length}</p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {domain.outputs.length === 0 && <li className="text-[var(--muted)]">Sin outputs en este ámbito</li>}
            {domain.outputs.map((item) => (
              <li key={`output-${item.name}`}>
                {snapshot || item.variants.length > 0 ? (
                  <Link
                    href={`/modelo/${domain.id}/${variableSlug(item.name, item.kind)}`}
                    className="text-[var(--green)] hover:underline"
                  >
                    {formatVariableLabel(item)}
                  </Link>
                ) : (
                  <span className="text-[var(--muted)]">{formatVariableLabel(item)}</span>
                )}
              </li>
            ))}
          </ul>
        </article>
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_.8fr]">
        <article className="rounded-[13px] border border-[#d5dbd4] bg-white p-7">
          <h2 className="font-serif text-2xl">La lógica, en humano</h2>
          <p className="mt-3 text-sm leading-7 text-[#56655e]">{domain.logic}</p>
          {domain.formula && (
            <div className="mt-6 border-l-[3px] border-[var(--orange)] bg-[#f8f4ed] px-4 py-4">
              <span className="kicker">Relación principal</span>
              <code className="block text-[13px] text-[#203a30]">{domain.formula}</code>
            </div>
          )}
          {domain.note && (
            <p className="mt-4 border-t border-[#e2e6e1] pt-4 text-sm text-[#56655e]">
              <strong>Nota de diseño.</strong> {domain.note}
            </p>
          )}
        </article>
        <aside className="rounded-[13px] bg-[var(--green)] p-7 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a9c2b4]">Ejemplo rápido</p>
          <p className="mt-4 font-serif text-lg leading-relaxed text-[#e2ece6]">{domain.example}</p>
        </aside>
      </section>

      <nav className="mt-10 flex items-center justify-between border-t border-[#d5dbd4] pt-6 text-sm">
        {prev ? (
          <Link href={`/modelo/${prev.id}`} className="font-semibold text-[var(--green)]">
            ← {prev.number} {prev.title}
          </Link>
        ) : (
          <Link href="/modelo" className="text-[var(--muted)]">
            ← Todos los ámbitos
          </Link>
        )}
        {next ? (
          <Link href={`/modelo/${next.id}`} className="font-semibold text-[var(--green)]">
            {next.number} {next.title} →
          </Link>
        ) : (
          <Link href="/balance" className="font-semibold text-[var(--green)]">
            Ir al Balance →
          </Link>
        )}
      </nav>
    </main>
  );
}
