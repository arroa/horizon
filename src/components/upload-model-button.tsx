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
    <div className="app-upload">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="app-upload-btn"
      >
        {loading ? "Cargando…" : snapshot ? "Cambiar Excel" : "Cargar modelo"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        hidden
        onChange={handleChange}
      />
      {snapshot && !loading && (
        <span className="app-upload-file" title={snapshot.fileName}>
          {snapshot.fileName}
        </span>
      )}
    </div>
  );
}
