"use client";

import Link from "next/link";

import { useModel } from "@/components/model-provider";
import { ModelLoading } from "@/components/model-loading";

export default function ModeloPage() {
  const { domains, ready } = useModel();
  const journeyTitle =
    domains.length === 1 ? "Un ámbito, una sola historia" : `${domains.length} ámbitos, una sola historia`;

  if (!ready) return <ModelLoading />;

  return (
    <main className="px-6 py-12 lg:px-12 xl:px-16">
      <div className="mb-10 max-w-3xl">
        <p className="kicker">El recorrido</p>
        <h1 className="font-serif text-4xl tracking-tight lg:text-5xl">{journeyTitle}</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-[var(--muted)]">
          Usa el árbol de la izquierda para bajar por ámbitos, inputs y outputs sin salir de esta vista.
          El contenido se abre aquí a la derecha.
        </p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {domains.map((domain) => (
          <li key={domain.id}>
            <Link
              href={`/modelo/${domain.id}`}
              className="flex min-h-[160px] flex-col rounded-[14px] border border-[var(--line)] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="font-serif italic text-[#9aaa9f]">{domain.number}</span>
              <span className="mt-4 font-serif text-xl">{domain.title}</span>
              <span className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                {domain.shortDesc || domain.question}
              </span>
              <span className="mt-auto pt-4 text-xs text-[var(--muted)]">
                {domain.inputs.length} inputs · {domain.outputs.length} outputs
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
