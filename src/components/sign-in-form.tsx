"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  devBypass: boolean;
  clerkEnabled: boolean;
};

export function SignInForm({ devBypass, clerkEnabled }: Props) {
  if (devBypass) return <DevSignInForm />;
  if (clerkEnabled) return <ClerkSignInForm />;
  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-8">
      <p className="kicker">Configuración</p>
      <h1 className="font-serif text-2xl">Falta Clerk o el bypass</h1>
      <p className="mt-3 text-sm text-[var(--muted)]">
        En <code>.env.local</code> define <code>HORIZON_DEV_BYPASS=true</code> y{" "}
        <code>DEV_SESSION_SECRET</code>, o las keys de Clerk.
      </p>
    </div>
  );
}

function DevSignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setError("No se pudo entrar en modo desarrollo.");
        return;
      }
      router.push("/modelo");
      router.refresh();
    } catch {
      setError("Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-8">
      <p className="kicker">Acceso</p>
      <h1 className="font-serif text-3xl">Entrar a Horizon</h1>
      <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Modo desarrollo: sin OTP ni Clerk. Igual que Xpaces / ControlX.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-4 py-3"
            placeholder="tu@empresa.com"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[var(--green)] py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function ClerkSignInForm() {
  const clerkSignIn = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = clerkSignIn.signIn;
  const setActive = clerkSignIn.setActive;

  if (!clerkSignIn.isLoaded || !signIn || !setActive) {
    return <p className="text-sm text-[var(--muted)]">Cargando…</p>;
  }

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    if (!signIn) return;
    setError("");
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: email.trim().toLowerCase() });
      const factor = result.supportedFirstFactors?.find((item) => item.strategy === "email_code");
      if (!factor || !("emailAddressId" in factor)) {
        setError("Activa el código por email en Clerk.");
        return;
      }
      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: factor.emailAddressId,
      });
      setStep("code");
    } catch {
      setError("No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    if (!signIn || !setActive) return;
    setError("");
    setLoading(true);
    try {
      const result = await signIn.attemptFirstFactor({ strategy: "email_code", code });
      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.push("/modelo");
        router.refresh();
      }
    } catch {
      setError("Código inválido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-[var(--line)] bg-white p-8">
      <p className="kicker">Acceso</p>
      <h1 className="font-serif text-3xl">Entrar a Horizon</h1>
      <form onSubmit={step === "email" ? sendCode : verifyCode} className="mt-6 space-y-4">
        {step === "email" ? (
          <label className="block text-sm">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-4 py-3"
            />
          </label>
        ) : (
          <label className="block text-sm">
            Código
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[var(--line)] px-4 py-3"
            />
          </label>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[var(--green)] py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "…" : step === "email" ? "Enviar código" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
