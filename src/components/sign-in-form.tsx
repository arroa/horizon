"use client";

import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  devBypass: boolean;
  clerkEnabled: boolean;
};

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

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

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 rounded-lg border border-[#ead7c8] bg-[#fbf4ee] px-3 py-2 text-[13px] leading-snug text-[#7a4a2e]">
      {children}
    </p>
  );
}

function DevSignInForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError("Escribe tu correo para continuar.");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setFieldError("Revisa el formato del correo (ej. tu@empresa.com).");
      return;
    }

    setFieldError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        setError("No se pudo entrar en modo desarrollo.");
        return;
      }
      window.location.assign("/modelo");
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
      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
        <label className="block text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError) setFieldError("");
            }}
            aria-invalid={Boolean(fieldError)}
            className={
              fieldError
                ? "mt-1.5 w-full rounded-xl border border-[#c47a4a] bg-[#fffaf6] px-4 py-3 outline-none"
                : "mt-1.5 w-full rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--green)]"
            }
            placeholder="tu@empresa.com"
            autoComplete="email"
          />
        </label>
        {fieldError && <FieldHint>{fieldError}</FieldHint>}
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
  const [fieldError, setFieldError] = useState("");
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

    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError("Escribe tu correo para continuar.");
      return;
    }
    if (!isValidEmail(trimmed)) {
      setFieldError("Revisa el formato del correo (ej. tu@empresa.com).");
      return;
    }

    setFieldError("");
    setLoading(true);
    try {
      const result = await signIn.create({ identifier: trimmed.toLowerCase() });
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

    if (!code.trim()) {
      setFieldError("Ingresa el código que te enviamos por correo.");
      return;
    }

    setFieldError("");
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
      <form onSubmit={step === "email" ? sendCode : verifyCode} noValidate className="mt-6 space-y-4">
        {step === "email" ? (
          <label className="block text-sm">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldError) setFieldError("");
              }}
              aria-invalid={Boolean(fieldError)}
              className={
                fieldError
                  ? "mt-1.5 w-full rounded-xl border border-[#c47a4a] bg-[#fffaf6] px-4 py-3 outline-none"
                  : "mt-1.5 w-full rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--green)]"
              }
              placeholder="tu@empresa.com"
              autoComplete="email"
            />
          </label>
        ) : (
          <label className="block text-sm">
            Código
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (fieldError) setFieldError("");
              }}
              aria-invalid={Boolean(fieldError)}
              className={
                fieldError
                  ? "mt-1.5 w-full rounded-xl border border-[#c47a4a] bg-[#fffaf6] px-4 py-3 outline-none"
                  : "mt-1.5 w-full rounded-xl border border-[var(--line)] px-4 py-3 outline-none focus:border-[var(--green)]"
              }
              placeholder="123456"
              autoComplete="one-time-code"
            />
          </label>
        )}
        {fieldError && <FieldHint>{fieldError}</FieldHint>}
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
