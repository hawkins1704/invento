import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import CodePinInput from "../components/CodePinInput";
import { AREA_STORAGE_KEY, BRANCH_STORAGE_KEY } from "../hooks/useSalesShift";

type AreaKey = "admin" | "sales";

const AREAS: Array<{
  key: AreaKey;
  title: string;
  description: string;
  badge: string;
}> = [
  {
    key: "admin",
    title: "Administrador",
    description:
      "Gestiona inventarios, sucursales y reportes generales para toda la operación.",
    badge: "Control total",
  },
  {
    key: "sales",
    title: "Ventas",
    description:
      "Registra pedidos por mesa, controla inventario en piso y gestiona la caja diaria.",
    badge: "Punto de venta",
  },
];

const SelectArea = () => {
  const [selectedArea, setSelectedArea] = useState<AreaKey | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const stored = window.localStorage.getItem(AREA_STORAGE_KEY) as AreaKey | null;
    return stored ?? null;
  });
  const [code, setCode] = useState<string[]>(() => Array(4).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const convex = useConvex();

  const selectedAreaLabel = useMemo(() => {
    if (!selectedArea) {
      return "Selecciona un área";
    }
    return selectedArea === "admin" ? "Código de administrador" : "Código de ventas";
  }, [selectedArea]);

  const handleAreaSelect = (area: AreaKey) => {
    setSelectedArea(area);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AREA_STORAGE_KEY, area);
    }
    setCode(Array(4).fill(""));
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedArea) {
      setError("Selecciona un área para continuar.");
      return;
    }

    if (code.some((digit) => digit === "")) {
      setError("Ingresa el código completo de 4 dígitos.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const joinedCode = code.join("");
      const result = await convex.query(api.access.verifyAreaCode, {
        area: selectedArea,
        code: joinedCode,
      });

      if (result?.valid) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(AREA_STORAGE_KEY, selectedArea);
        }
        if (selectedArea === "admin") {
          navigate("/admin", { state: { accessCode: joinedCode, area: selectedArea } });
        } else {
          const storedBranch =
            typeof window !== "undefined" ? window.localStorage.getItem(BRANCH_STORAGE_KEY) : null;
          const destination = storedBranch ? "/sales/tables" : "/sales/select-branch";
          navigate(destination, { state: { accessCode: joinedCode, area: selectedArea } });
        }
        return;
      }

      if (result?.reason === "notConfigured") {
        setError("Tu perfil no tiene un código configurado para esta área.");
      } else {
        setError("Código incorrecto. Revisa el código asignado a esta área.");
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "No fue posible validar el código. Inténtalo de nuevo.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-10 px-6 py-16 text-white">
        <header className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1 text-sm font-medium uppercase tracking-[0.18em] text-white">
            Selecciona el área
          </span>
          <h1 className="text-4xl font-semibold text-white">¿Dónde vas a trabajar hoy?</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            Elige el módulo correspondiente a tus tareas. Necesitarás ingresar el código de acceso configurado en tu perfil para continuar.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {AREAS.map((area) => {
            const isSelected = selectedArea === area.key;
            return (
              <button
                type="button"
                key={area.key}
                onClick={() => handleAreaSelect(area.key)}
                className={`group relative overflow-hidden rounded-3xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-[#fa7316] ${
                  isSelected ? "border-[#fa7316] bg-[#fa7316]/10" : "border-slate-800 bg-slate-900"
                }`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,115,22,0.18),_transparent_60%)] opacity-0 transition group-hover:opacity-100" />
                <div className="relative flex h-full flex-col gap-6 p-8 text-left">
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                        isSelected ? "bg-[#fa7316] text-white" : "bg-white/5 text-slate-300"
                      }`}
                    >
                      {area.badge}
                    </span>
                    <span className="text-3xl" aria-hidden>
                      {area.key === "admin" ? "🛠️" : "🧾"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-semibold text-white">{area.title}</h2>
                    <p className="text-sm leading-relaxed text-slate-400">{area.description}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-2 text-sm font-semibold ${
                      isSelected ? "text-[#fa7316]" : "text-slate-400"
                    }`}
                  >
                    {isSelected ? "Seleccionado" : "Seleccionar"}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      className={`h-5 w-5 transition ${isSelected ? "translate-x-1" : "group-hover:translate-x-1"}`}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-8"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-white">
                {selectedArea ? "Verificación de acceso" : "Selecciona un área para continuar"}
              </h3>
              <p className="text-sm text-slate-400">
                {selectedArea
                  ? "Ingresa el código asignado para esta área. Si no lo recuerdas, contacta a un administrador."
                  : "Cada módulo requiere un código único. Selecciona una tarjeta para habilitar el ingreso."}
              </p>
            </div>
            <div className="rounded-full border border-[#fa7316]/30 bg-[#fa7316]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#fa7316]">
              Seguridad activa
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[auto,1fr] md:items-center">
            <div className="rounded-2xl border border-slate-800 bg-slate-950 px-5 py-4 text-sm text-slate-400">
              <p className="font-semibold text-white">Área seleccionada</p>
              <p>{selectedArea ? (selectedArea === "admin" ? "Administrador" : "Ventas") : "Pendiente"}</p>
            </div>

            <CodePinInput
              label={selectedAreaLabel}
              name="areaCode"
              value={code}
              onChange={setCode}
              focusOnMount={Boolean(selectedArea)}
              className={selectedArea ? "" : "pointer-events-none opacity-40"}
            />
          </div>

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              El código es personal e intransferible. Los accesos quedan registrados para auditoría.
            </p>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fa7316] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#fa7316]/40 transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!selectedArea || isSubmitting}
            >
              {isSubmitting ? "Verificando..." : "Continuar"}
              {!isSubmitting && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5l6 6-6 6m-9-12l6 6-6 6" />
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SelectArea;