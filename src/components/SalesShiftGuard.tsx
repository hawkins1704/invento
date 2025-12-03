import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { Doc } from "../../convex/_generated/dataModel";
import { useSalesShift, type ShiftSummary } from "../hooks/useSalesShift";
import { FaRegClock } from "react-icons/fa";
import { MdStorefront } from "react-icons/md";
type GuardRenderProps = {
  branch: Doc<"branches">;
  branchId: string;
  activeShift: ShiftSummary;
};

type SalesShiftGuardProps = {
  children: (props: GuardRenderProps) => ReactNode;
};

const SalesShiftGuard = ({ children }: SalesShiftGuardProps) => {
  const navigate = useNavigate();
  const { branches, branchId, branch, activeShift, isLoadingShift, isLoadingBranches } = useSalesShift();
  const PRIMARY_COLOR = "#fa7316";
  if (isLoadingBranches) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-[#fa7316]" aria-hidden />
      </div>
    );
  }

  if (branches.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-300 shadow-inner shadow-black/20">
        <span className="text-3xl" aria-hidden>
          🏬
        </span>
        <p className="max-w-md text-sm text-slate-400">
          Aún no tienes sucursales configuradas. Crea una sucursal desde el panel de administración para comenzar.
        </p>
      </div>
    );
  }

  if (!branchId || !branch) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-center text-slate-300 shadow-inner shadow-black/20">
        <MdStorefront color={PRIMARY_COLOR} size={32}/>
        <p className="max-w-md text-sm text-slate-400">
          Selecciona la sucursal en la que trabajarás para continuar con las ventas.
        </p>
        <button
          type="button"
          onClick={() => navigate("/sales/select-branch", { replace: true })}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e86811]"
        >
          Elegir sucursal
        </button>
      </div>
    );
  }

  if (isLoadingShift) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-[#fa7316]" aria-hidden />
      </div>
    );
  }

  if (!activeShift) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-10 text-center text-slate-300 shadow-inner shadow-black/20">
        <div className="space-y-3">
        <FaRegClock color={PRIMARY_COLOR} />
          <p className="max-w-md text-sm text-slate-400">
            No hay un turno abierto para la sucursal <span className="font-semibold text-white">{branch.name}</span>.
            Usa el botón <span className="font-semibold text-white">Abrir turno</span> en el menú lateral para comenzar a vender.
          </p>
        </div>
      </div>
    );
  }

  return <>{children({ branch, branchId, activeShift })}</>;
};

export default SalesShiftGuard;

