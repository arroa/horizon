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
    if (!snapshot.monthLabels?.length) {
      const fromVar = snapshot.variables?.find((v) => v.months?.length)?.months?.map((m) => m.label);
      snapshot.monthLabels = fromVar ?? [];
    }
    if (snapshot.balance && (!snapshot.balance.monthNatures || snapshot.balance.monthNatures.length !== snapshot.balance.months.length)) {
      snapshot.balance.monthNatures = snapshot.balance.months.map(() => "unknown");
    }
    if (snapshot.balance && !snapshot.balance.columns?.length) {
      snapshot.balance.columns = snapshot.balance.months.map((label, index) => ({
        index,
        label,
        nature: snapshot.balance!.monthNatures?.[index] ?? "unknown",
        kind: "month" as const,
        outlineLevel: 0,
      }));
    }
    if (snapshot.eerr && (!snapshot.eerr.monthNatures || snapshot.eerr.monthNatures.length !== snapshot.eerr.months.length)) {
      snapshot.eerr.monthNatures = snapshot.eerr.months.map(() => "unknown");
    }
    if (snapshot.eerr && !snapshot.eerr.columns?.length) {
      snapshot.eerr.columns = snapshot.eerr.months.map((label, index) => ({
        index,
        label,
        nature: snapshot.eerr!.monthNatures?.[index] ?? "unknown",
        kind: "month" as const,
        outlineLevel: 0,
      }));
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
