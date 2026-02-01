import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CodePinInput from "../components/CodePinInput";
import { FaEye, FaEyeSlash } from "react-icons/fa";

type Step = "forgot" | { email: string };

export function PasswordReset() {
    const { signIn } = useAuthActions();
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>("forgot");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [code, setCode] = useState<string[]>(() => Array(8).fill(""));
    const [showPassword, setShowPassword] = useState(false);
    const [showRepeatPassword, setShowRepeatPassword] = useState(false);
    const [repeatPassword, setRepeatPassword] = useState("");

    const handleForgotPassword = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setSuccessMessage(null);

        const formData = new FormData(event.currentTarget);
        const email = formData.get("email") as string;

        if (!email) {
            setError("Por favor ingresa tu correo electrónico");
            return;
        }

        try {
            setIsSubmitting(true);
            await signIn("password", formData);
            setSuccessMessage("Código de verificación enviado. Revisa tu correo electrónico.");
            setStep({ email });
        } catch (exception) {
            const message =
                exception instanceof Error
                    ? exception.message
                    : "Ocurrió un error al enviar el código. Inténtalo de nuevo.";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetVerification = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        const codeString = code.join("");
        if (codeString.length !== 8) {
            setError("Por favor ingresa el código completo de 8 dígitos");
            return;
        }

        const formData = new FormData(event.currentTarget);
        const newPassword = formData.get("newPassword") as string;

        if (!newPassword || newPassword.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres");
            return;
        }

        if (newPassword !== repeatPassword) {
            setError("Las contraseñas no coinciden. Por favor, verifica que ambas sean iguales.");
            return;
        }

        try {
            setIsSubmitting(true);
            await signIn("password", formData);
            setSuccessMessage("Contraseña restablecida exitosamente. Redirigiendo...");
            setTimeout(() => {
                navigate("/login");
            }, 2000);
        } catch (exception) {
            const message =
                exception instanceof Error
                    ? exception.message
                    : "Código inválido o expirado. Inténtalo de nuevo.";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full flex-col overflow-hidden rounded-none lg:flex-row">
            <aside
                className="relative hidden w-full flex-1 items-end justify-between overflow-hidden px-12 py-14 text-white lg:flex bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: "url('/background.png')" }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 to-slate-950/90" />

                <div className="relative z-10 flex flex-col gap-6">
                    <h2 className="text-4xl font-semibold leading-tight text-white">
                        Restablece tu contraseña
                    </h2>
                    <p className="max-w-sm text-base text-white/80">
                        Ingresa tu correo electrónico y te enviaremos un código
                        para restablecer tu contraseña.
                    </p>
                </div>
            </aside>
            <main className="flex flex-1 items-center justify-center bg-white dark:bg-slate-950 px-6 py-16 sm:px-10">
                <div className="w-full max-w-md">
                    <header className="mb-10 flex flex-col gap-3 text-center">
                        <img
                            src="/logo-main.svg"
                            alt="Logo"
                            className="w-full h-10 object-contain"
                        />
                        <div className="space-y-1">
                            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
                                {step === "forgot"
                                    ? "¿Olvidaste tu contraseña?"
                                    : "Ingresa el código"}
                            </h1>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                {step === "forgot"
                                    ? "Te enviaremos un código a tu correo electrónico"
                                    : `Código enviado a ${step.email}`}
                            </p>
                        </div>
                    </header>

                    {step === "forgot" ? (
                        <form className="space-y-6" onSubmit={handleForgotPassword}>
                            <input name="flow" type="hidden" value="reset" />

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

                            {error && (
                                <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                                    {error}
                                </div>
                            )}

                            {successMessage && (
                                <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                                    {successMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {isSubmitting ? "Enviando..." : "Enviar código"}
                            </button>
                        </form>
                    ) : (
                        <form className="space-y-6" onSubmit={handleResetVerification}>
                            <input name="flow" type="hidden" value="reset-verification" />
                            <input name="email" type="hidden" value={step.email} />

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Código de verificación
                                </label>
                                <CodePinInput
                                    label=""
                                    name="code"
                                    value={code}
                                    onChange={setCode}
                                    focusOnMount
                                    length={8}
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Ingresa el código de 8 dígitos que recibiste por correo
                                </p>
                                <input type="hidden" name="code" value={code.join("")} />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label
                                        className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                        htmlFor="newPassword"
                                    >
                                        Nueva contraseña
                                    </label>
                                    <span className="text-xs text-slate-500 dark:text-slate-500">
                                        Mínimo 8 caracteres
                                    </span>
                                </div>
                                <div className="relative">
                                    <input
                                        id="newPassword"
                                        name="newPassword"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-10 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/40 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                                        autoComplete="new-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                        aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                    >
                                        {showPassword ? (
                                            <FaEyeSlash className="h-5 w-5" />
                                        ) : (
                                            <FaEye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label
                                        className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                        htmlFor="repeatPassword"
                                    >
                                        Repetir contraseña
                                    </label>
                                    <span className="text-xs text-slate-500 dark:text-slate-500">
                                        Mínimo 8 caracteres
                                    </span>
                                </div>
                                <div className="relative">
                                    <input
                                        id="repeatPassword"
                                        name="repeatPassword"
                                        type={showRepeatPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={repeatPassword}
                                        onChange={(e) => setRepeatPassword(e.target.value)}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-10 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/40 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                                        autoComplete="new-password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                        aria-label={showRepeatPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                                    >
                                        {showRepeatPassword ? (
                                            <FaEyeSlash className="h-5 w-5" />
                                        ) : (
                                            <FaEye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {error && (
                                <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                                    {error}
                                </div>
                            )}

                            {successMessage && (
                                <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                                    {successMessage}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep("forgot");
                                        setCode(Array(8).fill(""));
                                        setError(null);
                                        setSuccessMessage(null);
                                        setRepeatPassword("");
                                        setShowPassword(false);
                                        setShowRepeatPassword(false);
                                    }}
                                    className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 rounded-lg bg-[#fa7316] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isSubmitting ? "Restableciendo..." : "Restablecer"}
                                </button>
                            </div>
                        </form>
                    )}

                    <footer className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
                        <button
                            type="button"
                            onClick={() => navigate("/login")}
                            className="font-semibold text-slate-900 dark:text-white transition hover:text-[#fa7316]"
                        >
                            ← Volver a iniciar sesión
                        </button>
                    </footer>
                </div>
            </main>
        </div>
    );
}
