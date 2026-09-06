"use client";

import { ModeloTreeNav } from "@/components/modelo-tree-nav";

export default function ModeloLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="modelo-shell">
      <ModeloTreeNav />
      <div className="modelo-content">{children}</div>
    </div>
  );
}
