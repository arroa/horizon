import Link from "next/link";

import { getHorizonUser } from "@/lib/current-user";

export default async function HomePage() {
  const user = await getHorizonUser();

  return (
    <main>
      <section className="grid min-h-[80vh] items-center gap-12 px-6 py-20 lg:grid-cols-[1.2fr_.8fr] lg:px-24">
        <div>
          <p className="kicker">Modelo de proyección</p>
          <h1 className="max-w-3xl font-serif text-5xl leading-[0.98] tracking-tight lg:text-7xl">
            De la actividad comercial
            <br />a la <em className="font-normal text-[#e47f58]">caja.</em>
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[#53615b]">
            El modelo se recorre completo: ventas, compras, condiciones, cartas, GAV, otros,
            balance y uso neto de recursos. Cada dominio llega hasta la variable output.
          </p>
          <div className="mt-10">
            <Link
              href={user ? "/modelo" : "/sign-in"}
              className="inline-flex items-center gap-5 rounded-lg bg-[var(--green)] px-6 py-4 text-sm font-bold !text-[var(--lime)]"
            >
              {user ? "Continuar el recorrido" : "Entrar al modelo"} →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
