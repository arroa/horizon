import type { ModelSnapshot } from "@/lib/excel/types";

const STORAGE_KEY = "horizon-model-snapshot";

export function saveModelSnapshot(snapshot: ModelSnapshot) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadModelSnapshot(): ModelSnapshot | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const snapshot = JSON.parse(raw) as ModelSnapshot;
    // Snapshots guardados antes de monthLabels: recuperar títulos desde cualquier variable.
    if (!snapshot.monthLabels?.length) {
      const fromVar = snapshot.variables?.find((v) => v.months?.length)?.months?.map((m) => m.label);
      snapshot.monthLabels = fromVar ?? [];
    }
    return snapshot;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearModelSnapshot() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
