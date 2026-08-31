"use client";

import { useState } from "react";

export function ReportChat({ screen }: { screen: string }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text) return;
    setMessages((current) => [
      ...current,
      { role: "user", text },
      {
        role: "assistant",
        text: `El chat de ${screen} usará el paquete de contexto (tabla del mes, drivers y fórmulas). OpenAI todavía no está conectado.`,
      },
    ]);
    setQuestion("");
  }

  return (
    <aside className="flex min-h-[420px] flex-col rounded-[13px] border border-[var(--line)] bg-white">
      <div className="border-b border-[var(--line)] px-5 py-4">
        <p className="kicker">Chat OpenAI</p>
        <p className="text-sm text-[var(--muted)]">Pregunta sobre lo que ves en {screen}.</p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
        {messages.length === 0 && (
          <p className="text-[var(--muted)]">Ejemplo: ¿por qué se disparó la caja en julio 2026?</p>
        )}
        {messages.map((message, index) => (
          <p key={`${message.role}-${index}`} className={message.role === "user" ? "font-semibold" : "text-[#56655e]"}>
            {message.text}
          </p>
        ))}
      </div>
      <form onSubmit={onSubmit} className="border-t border-[var(--line)] p-4">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Preguntar al modelo…"
          className="w-full rounded-xl border border-[var(--line)] px-4 py-3 text-sm"
        />
      </form>
    </aside>
  );
}
