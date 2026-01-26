import { useAuthActions } from "@convex-dev/auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import CodePinInput from "../components/CodePinInput";


type Step = "signIn" | "signUp";

export function SignIn() {
    const { signIn } = useAuthActions();
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>("signIn");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [administratorCode, setAdministratorCode] = useState<string[]>(() =>
        Array(4).fill("")
    );
    const [salesCode, setSalesCode] = useState<string[]>(() =>
        Array(4).fill("")
    );
    const [inventoryCode, setInventoryCode] = useState<string[]>(() =>
        Array(4).fill("")
    );

    useEffect(() => {
        setError(null);
    }, [step]);

    const resetCodes = useCallback(() => {
        setAdministratorCode(Array(4).fill(""));
        setSalesCode(Array(4).fill(""));
        setInventoryCode(Array(4).fill(""));
    }, []);

    useEffect(() => {
        if (step === "signIn") {
            resetCodes();
        }
    }, [resetCodes, step]);

    const heading = useMemo(
        () => (step === "signIn" ? "Bienvenido de nuevo!" : "Crea tu cuenta"),
        [step]
    );

    const subheading = useMemo(
        () =>
            step === "signIn"
                ? ""
                : "Completa tus datos para configurar los accesos a cada área",
        [step]
    );

    const toggleMessage =
        step === "signIn" ? "¿Aún no tienes cuenta?" : "¿Ya tienes una cuenta?";
    const toggleAction = step === "signIn" ? "Regístrate" : "Inicia sesión";

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        if (step === "signUp") {
            const adminComplete = administratorCode.every(
                (digit) => digit !== ""
            );
            const salesComplete = salesCode.every((digit) => digit !== "");
            const inventoryComplete = inventoryCode.every((digit) => digit !== "");

            if (!adminComplete || !salesComplete || !inventoryComplete) {
                setError(
                    "Ingresa los códigos completos de 4 dígitos para cada área."
                );
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
        <div className=" flex min-h-screen w-full  flex-col overflow-hidden rounded-none  lg:flex-row">
            <aside className="relative hidden w-full flex-1 items-end justify-between overflow-hidden  px-12 py-14 text-white lg:flex bg-cover bg-center bg-no-repeat " style={{ backgroundImage: "url('/background.png')" }}>
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 to-slate-950/90" />
               
                <div className="relative z-10 flex flex-col gap-6">
                    <h2 className="text-4xl font-semibold leading-tight text-white">
                        Gestiona tus productos, ventas y caja en un solo lugar
                    </h2>
                    <p className="max-w-sm text-base text-white/80">
                        Administra sucursales, controla inventarios y registra
                        ventas en tiempo real con una interfaz hecha para
                        restaurantes.
                    </p>
                </div>
            </aside>
            <main className="flex flex-1 items-center justify-center bg-white dark:bg-slate-950 px-6 py-16 sm:px-10">
                <div className="w-full max-w-md">
                    <header className="mb-10 flex flex-col gap-3 text-center">
                        <img src="/logo-main.svg" alt="Logo" className="w-full h-10 object-contain" />
                        <div className="space-y-1">
                            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
                                {heading}
                            </h1>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                {subheading}
                            </p>
                        </div>
                    </header>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <input name="flow" type="hidden" value={step} />

                        {step === "signUp" && (
                            <div className="space-y-2">
                                <label
                                    className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                                    htmlFor="name"
                                >
                                    Nombre completo
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    placeholder="María López"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/40 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                                    autoComplete="name"
                                    required
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label
                                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
                                htmlFor="email"
                            >
                                Correo electrónico
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="correo@ejemplo.com"
                                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/40 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label
                                    className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                    htmlFor="password"
                                >
                                    Contraseña
                                </label>
                                <span className="text-xs text-slate-500 dark:text-slate-500">
                                    Mínimo 8 caracteres
                                </span>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="••••••••"
                                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/40 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                                autoComplete={
                                    step === "signIn"
                                        ? "current-password"
                                        : "new-password"
                                }
                                required
                            />
                        </div>

                        {step === "signUp" && (
                            <div className="space-y-6 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 p-5">
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    Códigos de acceso
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Define los códigos de 4 dígitos para acceder
                                    a cada área. Podrás compartirlos con tu
                                    equipo después.
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
                                <CodePinInput
                                    label="Código de inventario"
                                    name="inventoryCode"
                                    value={inventoryCode}
                                    onChange={setInventoryCode}
                                />
                            </div>
                        )}

                        {error && (
                            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                               Ups! Tal vez tus credenciales no son correctas. Intenta de nuevo.
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-4 py-3 text-sm font-semibold text-white  transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isSubmitting
                                ? "Cargando..."
                                : step === "signIn"
                                  ? "Iniciar sesión"
                                  : "Crear cuenta"}
                        </button>

                        {step === "signIn" && (
                            <div className="text-center">
                                <Link
                                    to="/password-reset"
                                    className="text-sm font-medium text-slate-600 transition hover:text-[#fa7316] dark:text-slate-400 dark:hover:text-[#fa7316]"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                        )}
                    </form>

                    <footer className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
                        <span>{toggleMessage} </span>
                        <button
                            type="button"
                            onClick={() =>
                                setStep(step === "signIn" ? "signUp" : "signIn")
                            }
                            className="font-semibold text-slate-900 dark:text-white transition hover:text-[#fa7316]"
                        >
                            {toggleAction}
                        </button>
                    </footer>
                </div>
            </main>
        </div>
    );
}
