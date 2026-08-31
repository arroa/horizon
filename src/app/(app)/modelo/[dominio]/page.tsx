import Link from "next/link";
import { notFound } from "next/navigation";

import { getDomain, getNeighbors } from "@/lib/domains";

export default async function DominioPage({
  params,
}: {
  params: Promise<{ dominio: string }>;
}) {
  const { dominio } = await params;
  const domain = getDomain(dominio);
  if (!domain) notFound();

  const { prev, next, position, total } = getNeighbors(domain.id);
  const outputs = domain.variables.filter((item) => item.kind === "output");
  const inputs = domain.variables.filter((item) => item.kind === "input");

  return (
    <main className="bg-[var(--paper)]">
      <div className="px-6 py-14 lg:px-20">
        <p className="text-xs text-[var(--muted)]">
          Secuencia {String(position).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </p>
        <div className="mt-4 flex items-center gap-6">
          <div className="grid h-[74px] w-[74px] place-items-center rounded-full bg-[var(--green)] font-serif text-[27px] italic text-[var(--lime)]">
            {domain.number}
          </div>
          <div>
            <p className="kicker">{domain.eyebrow}</p>
            <h1 className="font-serif text-4xl lg:text-5xl">{domain.title}</h1>
            <p className="mt-2 text-sm text-[#647169]">{domain.question}</p>
          </div>
        </div>

        <p className="mt-10 max-w-4xl font-serif text-2xl leading-snug text-[#2d4038]">{domain.summary}</p>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <article className="rounded-[13px] border border-[#d5dbd4] bg-white/75 p-6">
            <p className="kicker">Qué entra</p>
            <ul className="mt-3 space-y-2 text-sm">
              {inputs.map((item) => (
                <li key={item.slug}>— {item.name}</li>
              ))}
            </ul>
          </article>
          <article className="rounded-[13px] border border-[#d5dbd4] bg-white p-6">
            <p className="kicker">Qué produce · output</p>
            <ul className="mt-3 space-y-2 text-sm">
              {outputs.map((item) => (
                <li key={item.slug}>
                  <Link href={`/modelo/${domain.id}/${item.slug}`} className="font-semibold text-[var(--green)] hover:underline">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </article>
          <article className="rounded-[13px] border border-[#d5dbd4] bg-white/75 p-6">
            <p className="kicker">Dónde termina</p>
            <ul className="mt-3 space-y-2 text-sm">
              {domain.impact.map((item) => (
                <li key={item}>— {item}</li>
              ))}
            </ul>
          </article>
        </div>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.6fr_.8fr]">
          <article className="rounded-[13px] border border-[#d5dbd4] bg-white p-8">
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
          <aside className="rounded-[13px] bg-[var(--green)] p-8 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a9c2b4]">Ejemplo rápido</p>
            <p className="mt-4 font-serif text-lg leading-relaxed text-[#e2ece6]">{domain.example}</p>
          </aside>
        </section>

        <nav className="mt-12 flex items-center justify-between border-t border-[#d5dbd4] pt-8 text-sm">
          {prev ? (
            <Link href={`/modelo/${prev.id}`} className="font-semibold text-[var(--green)]">
              ← {prev.number} {prev.title}
            </Link>
          ) : (
            <Link href="/modelo" className="text-[var(--muted)]">
              ← Inicio del recorrido
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
      </div>
    </main>
  );
}
