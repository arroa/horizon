"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";

import {
  isFormula,
  prepareFormulaDisplay,
  tokenizeFormula,
} from "@/lib/excel/translate-formula";

type FormulaModalProps = {
  open: boolean;
  onClose: () => void;
  formula: string;
  dataType?: string;
  excelRow?: number;
};

const DEFAULT_SIZE = { width: 560, height: 360 };
const MIN_SIZE = { width: 320, height: 220 };

export function FormulaModal({ open, onClose, formula, dataType, excelRow }: FormulaModalProps) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState(DEFAULT_SIZE);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const resizeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originW: number;
    originH: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const width = Math.min(DEFAULT_SIZE.width, window.innerWidth - 32);
    const height = Math.min(DEFAULT_SIZE.height, window.innerHeight - 48);
    setSize({ width, height });
    setPosition({
      x: Math.max(16, Math.round(window.innerWidth / 2 - width / 2)),
      y: Math.max(16, Math.round(window.innerHeight * 0.16)),
    });
  }, [open, formula]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onPointerDownOutside = (event: PointerEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      if (event.target instanceof Node && !panel.contains(event.target)) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    // En el siguiente tick para no cerrar con el mismo click que abrió el modal.
    const timer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDownOutside);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDownOutside);
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const displayFormula = prepareFormulaDisplay(formula);
  const formulaLike = isFormula(formula);
  const tokens = tokenizeFormula(displayFormula);

  const onDragPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
  };

  const onDragPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPosition({
      x: drag.originX + (event.clientX - drag.startX),
      y: drag.originY + (event.clientY - drag.startY),
    });
  };

  const onDragPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  const onResizePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originW: size.width,
      originH: size.height,
    };
  };

  const onResizePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    const maxW = window.innerWidth - position.x - 16;
    const maxH = window.innerHeight - position.y - 16;
    setSize({
      width: Math.min(maxW, Math.max(MIN_SIZE.width, resize.originW + (event.clientX - resize.startX))),
      height: Math.min(maxH, Math.max(MIN_SIZE.height, resize.originH + (event.clientY - resize.startY))),
    });
  };

  const onResizePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;
    resizeRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  return createPortal(
    <div
      ref={panelRef}
      className="formula-modal"
      role="dialog"
      aria-modal="false"
      aria-labelledby="formula-modal-title"
      style={{ left: position.x, top: position.y, width: size.width, height: size.height }}
    >
      <div
        className="formula-modal-header"
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        onPointerCancel={onDragPointerUp}
      >
        <div>
          <p id="formula-modal-title" className="formula-modal-title">
            {formulaLike ? "Fórmula Excel" : "Valor Excel"}
          </p>
          <div className="formula-modal-meta">
            {dataType && <span>Tipo: {dataType}</span>}
            {excelRow != null && excelRow > 0 && <span>Fila: {excelRow}</span>}
          </div>
        </div>
        <button
          type="button"
          className="formula-modal-close"
          onClick={onClose}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
      <div className={formulaLike ? "formula-content-enhanced formula-modal-body" : "formula-content-input formula-modal-body"}>
        <pre>
          <code>
            {tokens.map((token, index) => (
              <span
                key={`${index}-${token.type}-${token.value}`}
                className={`token token-${token.type}`}
              >
                {token.value}
              </span>
            ))}
          </code>
        </pre>
      </div>
      <p className="formula-modal-hint">Arrastra el encabezado para mover · esquina para redimensionar</p>
      <div
        className="formula-modal-resize"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerUp}
        aria-hidden="true"
      />
    </div>,
    document.body,
  );
}
