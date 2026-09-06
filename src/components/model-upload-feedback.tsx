"use client";

import { useEffect } from "react";

import { useModel } from "@/components/model-provider";

export function ModelUploadFeedback() {
  const { loading, progress, success, error, dismissSuccess, dismissError } = useModel();

  useEffect(() => {
    if (!success && !error) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (success) dismissSuccess();
        if (error) dismissError();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [success, error, dismissSuccess, dismissError]);

  return (
    <>
      {loading && (
        <div className="model-overlay" role="status" aria-live="polite" aria-busy="true">
          <div className="model-overlay-card">
            <p className="kicker">Cargando modelo</p>
            <h2 className="font-serif text-2xl">Procesando el Excel…</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{progress?.label || "Espera un momento."}</p>
            <div className="model-progress-track" aria-hidden="true">
              <div
                className="model-progress-fill"
                style={{ width: `${Math.max(progress?.percent ?? 4, 4)}%` }}
              />
            </div>
            <p className="mt-2 text-right text-xs font-bold text-[var(--green)]">
              {Math.max(progress?.percent ?? 0, 0)}%
            </p>
          </div>
        </div>
      )}

      {success && !loading && (
        <div
          className="model-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="model-loaded-title"
          onClick={dismissSuccess}
        >
          <div className="model-overlay-card model-success-card" onClick={(event) => event.stopPropagation()}>
            <p className="kicker">Confirmación</p>
            <h2 id="model-loaded-title" className="font-serif text-2xl">
              Modelo cargado
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#56655e]">
              <strong>{success.fileName}</strong> quedó listo en esta sesión.
            </p>
            <ul className="mt-4 space-y-1 text-sm text-[#33473e]">
              <li>{success.domainCount} ámbitos en el recorrido</li>
              <li>{success.variableCount} variables leídas</li>
            </ul>
            <button type="button" className="model-modal-btn" onClick={dismissSuccess}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {error && !loading && (
        <div
          className="model-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="model-error-title"
          onClick={dismissError}
        >
          <div className="model-overlay-card" onClick={(event) => event.stopPropagation()}>
            <p className="kicker">Error</p>
            <h2 id="model-error-title" className="font-serif text-2xl">
              No se pudo cargar
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#7a2e2e]">{error}</p>
            <button type="button" className="model-modal-btn" onClick={dismissError}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
