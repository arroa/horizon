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
      <VariableAnalysisView
        group={group}
        domainLabel={`${domain.number} ${domain.title}`}
      />
    </main>
  );
}
