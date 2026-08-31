import Link from "next/link";

import { domains } from "@/lib/domains";

export default function ModeloPage() {
  return (
    <main className="px-6 py-16 lg:px-20">
      <div className="mb-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <p className="kicker">El recorrido</p>
          <h1 className="font-serif text-4xl tracking-tight lg:text-6xl">Ocho ámbitos, una sola historia</h1>
        </div>
        <p className="max-w-md text-[15px] leading-relaxed text-[var(--muted)]">
          La secuencia es lógica y se recorre completa: de la venta a la caja. Cada bloque
          abre sus variables output.
        </p>
      </div>

      <ol className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {domains.map((domain, index) => (
          <li key={domain.id} className="relative">
            <Link
              href={`/modelo/${domain.id}`}
              className="flex min-h-[230px] flex-col rounded-[14px] border border-[var(--line)] bg-white p-[22px] transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="font-serif italic text-[#9aaa9f]">{domain.number}</span>
              <span className="mt-6 font-serif text-2xl">{domain.title}</span>
              <span className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{domain.question}</span>
              <span className="mt-auto pt-6 text-xs font-bold text-[var(--green)]">
                Abrir <b className="ml-1 text-[#e47f58]">↗</b>
              </span>
            </Link>
            {index < domains.length - 1 && (
              <span className="absolute top-[103px] -right-3 hidden text-[#aab5ae] xl:block">→</span>
            )}
          </li>
        ))}
      </ol>
    </main>
  );
}
