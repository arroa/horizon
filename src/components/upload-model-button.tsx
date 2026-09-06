"use client";

import { useRef } from "react";

import { useModel } from "@/components/model-provider";

export function UploadModelButton() {
  const { snapshot, loading, uploadFile } = useModel();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await uploadFile(file);
    } catch {
      // El overlay de error ya muestra el mensaje.
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="flex max-w-[280px] items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="rounded-lg border border-[var(--green)] bg-[var(--green)] px-3 py-2 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-70"
      >
        {loading ? "Cargando…" : "Cargar modelo"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        hidden
        onChange={handleChange}
      />
      {snapshot && !loading && (
        <span className="truncate text-[10px] text-[var(--muted)]" title={snapshot.fileName}>
          {snapshot.fileName}
        </span>
      )}
    </div>
  );
}
