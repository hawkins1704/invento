import type { Doc } from "../../../convex/_generated/dataModel";
import SalesShiftGuard from "../../components/SalesShiftGuard";
import type { ShiftSummary } from "../../hooks/useSalesShift";
import { formatCurrency, formatDateTime } from "../../utils/format";

const SalesInventoryContent = ({
  branch,
  activeShift,
}: {
  branch: Doc<"branches">;
  activeShift: ShiftSummary;
}) => {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
              Inventario en turno
            </div>
            <h1 className="mt-3 text-3xl font-semibold">Inventario</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Ajusta las existencias disponibles en la sucursal durante el turno. Podrás ver consumos en vivo y registrar
              devoluciones o bajas directamente desde el punto de venta.
            </p>
          </div>
          <span className="rounded-full border border-[#fa7316]/30 bg-[#fa7316]/10 px-4 py-2 text-sm font-semibold text-[#fa7316]">
            {branch.name}
          </span>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-white shadow-inner shadow-black/20">
        <p className="text-sm text-slate-400">
          Turno iniciado el {formatDateTime(activeShift.shift.openedAt)} en {branch.name}. Caja inicial:
          <span className="ml-1 font-semibold text-white">{formatCurrency(activeShift.shift.openingCash)}</span>.
        </p>
      </section>
    </div>
  );
};

const SalesInventory = () => (
  <SalesShiftGuard>
    {(props) => <SalesInventoryContent {...props} />}
  </SalesShiftGuard>
);

export default SalesInventory;

