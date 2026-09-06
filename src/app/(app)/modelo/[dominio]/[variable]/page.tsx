"use client";

import { notFound, useParams } from "next/navigation";

import { useModel } from "@/components/model-provider";
import { ModelLoading } from "@/components/model-loading";
import { VariableAnalysisView } from "@/components/variable-analysis-view";
import { findVariableGroup, getDomainById } from "@/lib/model-helpers";

export default function VariablePage() {
  const params = useParams<{ dominio: string; variable: string }>();
  const { domains, ready } = useModel();

  if (!ready) return <ModelLoading />;

  const domain = getDomainById(domains, params.dominio);
  if (!domain) notFound();

  const group = findVariableGroup(domain, params.variable);
  if (!group) notFound();

  return (
    <main className="px-6 py-12 lg:px-12 xl:px-16">
      <p className="text-xs text-[var(--muted)]">
        {domain.number} {domain.title}
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">{group.kind === "output" ? "Variable output" : "Variable input"}</p>
          <h1 className="font-serif text-3xl lg:text-4xl">{group.name}</h1>
          {group.variantCount > 1 && (
            <p className="mt-2 text-sm text-[var(--muted)]">{group.variantCount} variantes en este ámbito</p>
          )}
        </div>
        <span className="rounded-full bg-[var(--green)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
          {group.kind}
        </span>
      </div>

      <div className="mt-8">
        <VariableAnalysisView group={group} />
      </div>
    </main>
  );
}
