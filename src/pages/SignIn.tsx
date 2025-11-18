import { useAuthActions } from "@convex-dev/auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import CodePinInput from "../components/CodePinInput";

const PRIMARY_COLOR = "#fa7316";

type Step = "signIn" | "signUp";

export function SignIn() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("signIn");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [administratorCode, setAdministratorCode] = useState<string[]>(() => Array(4).fill(""));
  const [salesCode, setSalesCode] = useState<string[]>(() => Array(4).fill(""));

  useEffect(() => {
    setError(null);
  }, [step]);

  const resetCodes = useCallback(() => {
    setAdministratorCode(Array(4).fill(""));
    setSalesCode(Array(4).fill(""));
  }, []);

  useEffect(() => {
    if (step === "signIn") {
      resetCodes();
    }
  }, [resetCodes, step]);

  const heading = useMemo(
    () => (step === "signIn" ? "Bienvenido de nuevo" : "Crea tu cuenta"),
    [step]
  );

  const subheading = useMemo(
    () =>
      step === "signIn"
        ? "Ingresa tus credenciales para continuar gestionando tus operaciones"
        : "Completa tus datos para configurar los accesos a cada área",
    [step]
  );

  const toggleMessage = step === "signIn" ? "¿Aún no tienes cuenta?" : "¿Ya tienes una cuenta?";
  const toggleAction = step === "signIn" ? "Regístrate" : "Inicia sesión";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (step === "signUp") {
      const adminComplete = administratorCode.every((digit) => digit !== "");
      const salesComplete = salesCode.every((digit) => digit !== "");

      if (!adminComplete || !salesComplete) {
        setError("Ingresa los códigos completos de 4 dígitos para cada área.");
        return;
      }
    }

    const formData = new FormData(event.currentTarget);
  
    try {
      setIsSubmitting(true);

      await signIn("password", formData);
      navigate("/select-area");
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : "Ocurrió un error inesperado. Inténtalo de nuevo.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col overflow-hidden rounded-none bg-slate-950 shadow-none lg:flex-row lg:rounded-3xl lg:border lg:border-slate-800">
        <aside
          className="relative hidden w-full flex-1 items-end justify-between overflow-hidden bg-slate-900 px-12 py-14 text-white lg:flex"
          style={{ background: `linear-gradient(135deg, ${PRIMARY_COLOR}, #1f2937)` }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.15),_transparent_55%)]" />
          <div className="relative z-10 flex flex-col gap-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-sm font-medium uppercase tracking-[0.16em] text-white">
              Invento
            </div>
            <h2 className="text-4xl font-semibold leading-tight text-white">
              Gestiona tus productos, ventas y caja en un solo lugar
            </h2>
            <p className="max-w-sm text-base text-white/80">
              Administra sucursales, controla inventarios y registra ventas en tiempo real con una interfaz hecha para restaurantes.
            </p>
          </div>
          
        </aside>
        <main className="flex flex-1 items-center justify-center bg-slate-950 px-6 py-16 sm:px-10">
          <div className="w-full max-w-md">
            <header className="mb-10 flex flex-col gap-3 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: PRIMARY_COLOR }}>
                <span className="text-lg font-semibold text-white">IN</span>
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-semibold text-white">{heading}</h1>
                <p className="text-sm text-slate-400">{subheading}</p>
              </div>
            </header>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <input name="flow" type="hidden" value={step} />

              {step === "signUp" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-200" htmlFor="name">
                    Nombre completo
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="María López"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/40"
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-200" htmlFor="email">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/40"
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-200" htmlFor="password">
                    Contraseña
                  </label>
                  <span className="text-xs text-slate-500">Mínimo 8 caracteres</span>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/40"
                  autoComplete={step === "signIn" ? "current-password" : "new-password"}
                  required
                />
              </div>

              {step === "signUp" && (
                <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                  <p className="text-sm font-semibold text-slate-200">Códigos de acceso</p>
                  <p className="text-xs text-slate-400">
                    Define los códigos de 4 dígitos para acceder a cada área. Podrás compartirlos con tu equipo después.
                  </p>
                  <CodePinInput
                    label="Código de administrador"
                    name="administratorCode"
                    value={administratorCode}
                    onChange={setAdministratorCode}
                    focusOnMount
                  />
                  <CodePinInput
                    label="Código de ventas"
                    name="salesCode"
                    value={salesCode}
                    onChange={setSalesCode}
                  />
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#fa7316] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#fa7316]/40 transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Procesando..." : step === "signIn" ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            </form>

            <footer className="mt-8 text-center text-sm text-slate-400">
              <span>{toggleMessage} </span>
              <button
                type="button"
                onClick={() => setStep(step === "signIn" ? "signUp" : "signIn")}
                className="font-semibold text-white transition hover:text-[#fa7316]"
              >
                {toggleAction}
              </button>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}