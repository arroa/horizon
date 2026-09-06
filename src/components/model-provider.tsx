"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { ParseProgress } from "@/lib/excel/parse-model";
import type { ModelDomain, ModelSnapshot } from "@/lib/excel/types";
import { getFallbackDomains } from "@/lib/fallback-domains";
import { clearModelSnapshot, loadModelSnapshot, saveModelSnapshot } from "@/lib/model-storage";

export type UploadProgress = ParseProgress | null;

export type UploadSuccess = {
  fileName: string;
  domainCount: number;
  variableCount: number;
} | null;

type ModelContextValue = {
  snapshot: ModelSnapshot | null;
  domains: ModelDomain[];
  ready: boolean;
  loading: boolean;
  progress: UploadProgress;
  success: UploadSuccess;
  error: string | null;
  uploadFile: (file: File) => Promise<void>;
  clearModel: () => void;
  dismissSuccess: () => void;
  dismissError: () => void;
};

const ModelContext = createContext<ModelContextValue | null>(null);

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<ModelSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>(null);
  const [success, setSuccess] = useState<UploadSuccess>(null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSnapshot(loadModelSnapshot());
    setHydrated(true);
  }, []);

  async function uploadFile(file: File) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setProgress({ percent: 2, label: "Preparando…" });
    try {
      const { parseModelFile } = await import("@/lib/excel/parse-model");
      const parsed = await parseModelFile(file, (next) => setProgress(next));
      setSnapshot(parsed);
      saveModelSnapshot(parsed);
      setSuccess({
        fileName: parsed.fileName,
        domainCount: parsed.domains.length,
        variableCount: parsed.variables.length,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al procesar el Excel.";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  function clearModel() {
    setSnapshot(null);
    clearModelSnapshot();
    setSuccess(null);
  }

  function dismissSuccess() {
    setSuccess(null);
  }

  function dismissError() {
    setError(null);
  }

  const activeSnapshot = hydrated ? snapshot : null;
  const domains = activeSnapshot?.domains ?? getFallbackDomains();

  const value = useMemo(
    () => ({
      snapshot: activeSnapshot,
      domains,
      ready: hydrated,
      loading,
      progress,
      success,
      error,
      uploadFile,
      clearModel,
      dismissSuccess,
      dismissError,
    }),
    [activeSnapshot, domains, hydrated, loading, progress, success, error],
  );

  return <ModelContext.Provider value={value}>{children}</ModelContext.Provider>;
}

export function useModel() {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error("useModel debe usarse dentro de ModelProvider");
  }
  return context;
}
