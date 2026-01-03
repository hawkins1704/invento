import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { Doc } from "../../../convex/_generated/dataModel";
import { AREA_STORAGE_KEY, useSalesShift } from "../../hooks/useSalesShift";
import { FaLocationDot } from "react-icons/fa6";
import { LuStore } from "react-icons/lu";

const SalesSelectBranch = () => {
  const { branches, isLoadingBranches, setBranchId } = useSalesShift();
  const navigate = useNavigate();

  const sortedBranches = useMemo(() => {
    if (!branches) {
      return [] as Doc<"branches">[];
    }
    return [...branches].sort((a, b) => a.name.localeCompare(b.name));
  }, [branches]);

  const handleSelectBranch = (branchId: string) => {
    setBranchId(branchId);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AREA_STORAGE_KEY, "sales");
    }
    navigate("/sales/tables", { replace: true });
  };

  if (isLoadingBranches) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#fa7316] dark:border-slate-800" aria-hidden />
      </div>
    );
  }

  if (sortedBranches.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center text-slate-600 dark:text-slate-300">
        <LuStore size={40} />
        <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
          Necesitas crear al menos una sucursal desde el panel de administración antes de registrar ventas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1 text-sm font-semibold uppercase tracking-[0.1em] text-slate-700 dark:bg-white/5 dark:text-white">
          Selecciona la sucursal
        </span>
        <h1 className="text-4xl font-semibold text-slate-900 dark:text-white">¿En qué sede vas a trabajar hoy?</h1>
        <p className="max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          Elige una sucursal para iniciar el flujo de ventas. El turno y las operaciones quedarán asociadas a esta sede.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-3">
        {sortedBranches.map((branch) => (
          <button
            type="button"
            key={branch._id as string}
            onClick={() => handleSelectBranch(branch._id as string)}
            className="group flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-6 text-left transition hover:border-[#fa7316] hover:bg-[#fa7316]/10 dark:border-slate-800 dark:bg-slate-900/60"
          >
            <div className="flex items-center justify-between">
            <FaLocationDot className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-700 dark:bg-white/10 dark:text-white">
                Sucursal
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{branch.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{branch.address}</p>
            </div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#fa7316]">
              Seleccionar
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-5 w-5 transition group-hover:translate-x-1"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </span>
          </button>
        ))}
      </section>
    </div>
  );
};

export default SalesSelectBranch;

