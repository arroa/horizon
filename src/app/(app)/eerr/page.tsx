import { ReportChat } from "@/components/report-chat";

const rows = ["Ventas", "Costo de ventas", "Margen", "GAV", "Otros ingresos y gastos", "Utilidad neta"];

export default function EerrPage() {
  return (
    <main className="grid gap-6 px-6 py-12 lg:grid-cols-[1.4fr_.8fr] lg:px-16">
      <section>
        <p className="kicker">Como está en el Excel</p>
        <h1 className="font-serif text-4xl">Estado de resultados</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">
          Hoja EERR MdS · rangos <code>EERRCuenta</code> / <code>EERRValores</code>.
        </p>
        <div className="mt-8 overflow-x-auto rounded-[13px] border border-[var(--line)] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--paper)] text-xs uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Cuenta</th>
                <th className="px-4 py-3">jun-26</th>
                <th className="px-4 py-3">jul-26</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3">{row}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">—</td>
                  <td className="px-4 py-3 text-[var(--muted)]">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <ReportChat screen="EERR" />
    </main>
  );
}
