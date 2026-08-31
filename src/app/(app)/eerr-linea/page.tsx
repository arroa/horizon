import { ReportChat } from "@/components/report-chat";

const rows = ["Arquitectura", "Retail", "Con Con", "Industrial", "Ecommerce", "Ventilación"];

export default function EerrLineaPage() {
  return (
    <main className="grid gap-6 px-6 py-12 lg:grid-cols-[1.4fr_.8fr] lg:px-16">
      <section>
        <p className="kicker">Como está en el Excel</p>
        <h1 className="font-serif text-4xl">EERR × línea</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">
          Hoja EERRxLN. El chat viaja con la línea filtrada, como el combo del Excel.
        </p>
        <div className="mt-8 overflow-x-auto rounded-[13px] border border-[var(--line)] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--paper)] text-xs uppercase tracking-wider text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Línea</th>
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
      <ReportChat screen="EERR × línea" />
    </main>
  );
}
