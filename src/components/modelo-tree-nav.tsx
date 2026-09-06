"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { useModel } from "@/components/model-provider";
import { ModelLoading } from "@/components/model-loading";
import { formatVariableLabel, variableSlug } from "@/lib/model-helpers";
import { searchModelo } from "@/lib/modelo-search";
import type { ModelDomain, VariableGroup } from "@/lib/excel/types";

function parseModeloPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "modelo") return { domainId: null as string | null, variableSlug: null as string | null };
  return {
    domainId: parts[1] ?? null,
    variableSlug: parts[2] ?? null,
  };
}

function VariableBranch({
  domain,
  groups,
  kind,
  open,
  onToggle,
  activeVariableSlug,
}: {
  domain: ModelDomain;
  groups: VariableGroup[];
  kind: "input" | "output";
  open: boolean;
  onToggle: () => void;
  activeVariableSlug: string | null;
}) {
  const label = kind === "input" ? "Inputs" : "Outputs";
  const count = groups.length;

  return (
    <div className={`modelo-tree-branch modelo-tree-branch--${kind}`} data-level="2">
      <button
        type="button"
        className={`modelo-tree-kind modelo-tree-kind--${kind}`}
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="modelo-tree-chevron" data-open={open ? "1" : "0"}>
          ▸
        </span>
        <span className={`modelo-tree-kind-badge modelo-tree-kind-badge--${kind}`}>{label}</span>
        <span className="modelo-tree-kind-count">{count}</span>
      </button>
      {open && (
        <ul className="modelo-tree-vars" data-level="3">
          {groups.length === 0 && <li className="modelo-tree-empty">Sin {label.toLowerCase()}</li>}
          {groups.map((group) => {
            const slug = variableSlug(group.name, kind);
            const href = `/modelo/${domain.id}/${slug}`;
            const active = activeVariableSlug === slug;
            return (
              <li key={`${kind}-${group.name}`} className="modelo-tree-var-item">
                <Link
                  href={href}
                  className={active ? `modelo-tree-var modelo-tree-var--${kind} active` : `modelo-tree-var modelo-tree-var--${kind}`}
                >
                  <span className="modelo-tree-var-dot" aria-hidden="true" />
                  <span className="modelo-tree-var-label">{formatVariableLabel(group)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ModeloTreeNav() {
  const pathname = usePathname();
  const { domains, ready } = useModel();
  const { domainId, variableSlug: activeVar } = useMemo(() => parseModeloPath(pathname), [pathname]);

  const [expandedDomains, setExpandedDomains] = useState<Record<string, boolean>>({});
  const [expandedKinds, setExpandedKinds] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");

  const searchHits = useMemo(() => searchModelo(domains, query), [domains, query]);
  const searching = query.trim().length > 0;

  useEffect(() => {
    if (!domainId) return;
    setExpandedDomains((prev) => ({ ...prev, [domainId]: true }));
    const kindFromSlug = activeVar?.endsWith("--output")
      ? "output"
      : activeVar?.endsWith("--input")
        ? "input"
        : null;
    setExpandedKinds((prev) => ({
      ...prev,
      ...(kindFromSlug
        ? { [`${domainId}:${kindFromSlug}`]: true }
        : { [`${domainId}:input`]: true, [`${domainId}:output`]: true }),
    }));
    setMobileOpen(false);
  }, [domainId, activeVar]);

  if (!ready) return <ModelLoading />;

  const toggleDomain = (id: string) => {
    setExpandedDomains((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleKind = (key: string) => {
    setExpandedKinds((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeDomain = domains.find((d) => d.id === domainId);
  const mobileLabel = activeVar
    ? activeDomain
      ? `${activeDomain.number} · variable`
      : "Variable"
    : activeDomain
      ? `${activeDomain.number} ${activeDomain.title}`
      : "Ámbitos del modelo";

  return (
    <aside className="modelo-tree">
      <div className="modelo-tree-mobile-bar">
        <button type="button" className="modelo-tree-mobile-toggle" onClick={() => setMobileOpen((v) => !v)}>
          <span>{mobileOpen ? "Ocultar árbol" : "Árbol del modelo"}</span>
          <strong>{mobileLabel}</strong>
        </button>
      </div>

      <div className={mobileOpen ? "modelo-tree-panel open" : "modelo-tree-panel"}>
        <div className="modelo-tree-search">
          <label className="modelo-tree-search-label" htmlFor="modelo-semantic-search">
            Buscar
          </label>
          <div className="modelo-tree-search-field">
            <input
              id="modelo-semantic-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej. ventas, margen, bonificación…"
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button type="button" className="modelo-tree-search-clear" onClick={() => setQuery("")}>
                Limpiar
              </button>
            )}
          </div>
          <p className="modelo-tree-search-hint">Busca por significado en ámbitos y variables</p>
        </div>

        {searching ? (
          <div className="modelo-tree-results" aria-live="polite">
            <p className="modelo-tree-results-count">
              {searchHits.length === 0
                ? "Sin coincidencias"
                : `${searchHits.length} resultado${searchHits.length === 1 ? "" : "s"}`}
            </p>
            <ul className="modelo-tree-results-list">
              {searchHits.map((hit) => (
                <li key={hit.id}>
                  <Link
                    href={hit.href}
                    className={`modelo-tree-result modelo-tree-result--${hit.kind}`}
                    onClick={() => {
                      setQuery("");
                      setMobileOpen(false);
                    }}
                  >
                    <span className="modelo-tree-result-kind">{hit.subtitle}</span>
                    <span className="modelo-tree-result-title">{hit.title}</span>
                    {hit.snippet && <span className="modelo-tree-result-snippet">{hit.snippet}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <div className="modelo-tree-head">
              <p className="kicker">Árbol</p>
              <Link href="/modelo" className={!domainId ? "modelo-tree-root active" : "modelo-tree-root"}>
                Todos los ámbitos
              </Link>
            </div>

            <nav className="modelo-tree-list" aria-label="Navegación del modelo">
              {domains.map((domain) => {
                const open = !!expandedDomains[domain.id];
                const domainActive = domainId === domain.id && !activeVar;
                const domainCurrent = domainId === domain.id;
                return (
                  <div
                    key={domain.id}
                    className={
                      domainCurrent
                        ? "modelo-tree-domain modelo-tree-domain--current"
                        : open
                          ? "modelo-tree-domain modelo-tree-domain--open"
                          : "modelo-tree-domain"
                    }
                    data-level="1"
                  >
                    <div className="modelo-tree-domain-row">
                      <button
                        type="button"
                        className="modelo-tree-expand"
                        aria-expanded={open}
                        aria-label={open ? "Contraer ámbito" : "Expandir ámbito"}
                        onClick={() => toggleDomain(domain.id)}
                      >
                        <span className="modelo-tree-chevron" data-open={open ? "1" : "0"}>
                          ▸
                        </span>
                      </button>
                      <Link
                        href={`/modelo/${domain.id}`}
                        className={domainActive ? "modelo-tree-domain-link active" : "modelo-tree-domain-link"}
                      >
                        <span className="modelo-tree-num">{domain.number}</span>
                        <span className="modelo-tree-title">{domain.title}</span>
                      </Link>
                    </div>

                    {open && (
                      <div className="modelo-tree-children">
                        <VariableBranch
                          domain={domain}
                          groups={domain.inputs}
                          kind="input"
                          open={!!expandedKinds[`${domain.id}:input`]}
                          onToggle={() => toggleKind(`${domain.id}:input`)}
                          activeVariableSlug={domainId === domain.id ? activeVar : null}
                        />
                        <VariableBranch
                          domain={domain}
                          groups={domain.outputs}
                          kind="output"
                          open={!!expandedKinds[`${domain.id}:output`]}
                          onToggle={() => toggleKind(`${domain.id}:output`)}
                          activeVariableSlug={domainId === domain.id ? activeVar : null}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </>
        )}
      </div>
    </aside>
  );
}
