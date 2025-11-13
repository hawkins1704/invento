import type { Doc } from "../../convex/_generated/dataModel";
import SalesShiftGuard from "../components/SalesShiftGuard";
import type { ShiftSummary } from "../hooks/useSalesShift";
import { formatCurrency, formatDateTime } from "../utils/format";

const SalesDashboardContent = ({
  branch,
  activeShift,
}: {
  branch: Doc<"branches">;
  activeShift: ShiftSummary;
}) => {
  const tips = [
    {
      title: "Registra tu primera venta",
      description: "Selecciona una mesa y agrega productos para generar tickets en segundos.",
    },
    {
      title: "Control de caja",
      description: "Anota el monto inicial y realiza corte al finalizar tu turno para cuadrar la caja.",
    },
  ];

  const { shift, cashSalesTotal, expectedCash } = activeShift;

  return (
    <div className="space-y-10">
      <header className="flex flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/50 p-8">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
          Punto de venta
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-semibold text-white">Área de ventas</h1>
            <span className="rounded-full border border-[#fa7316]/30 bg-[#fa7316]/10 px-4 py-2 text-sm font-semibold text-[#fa7316]">
              {branch.name}
            </span>
          </div>
          <p className="max-w-2xl text-sm text-slate-400">
            Abre una mesa, agrega productos al pedido y mantén el inventario sincronizado con la operación del día. Aquí
            verás tus tickets activos y los cortes de caja.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="rounded-full border border-[#fa7316]/30 bg-[#fa7316]/10 px-3 py-1 font-semibold uppercase tracking-[0.18em] text-[#fa7316]">
            Turno abierto
          </span>
          <span>{branch.name}</span>
          <span>Inicio: {formatDateTime(shift.openedAt)}</span>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <div className="space-y-5 rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Tickets abiertos</h2>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fa7316] px-4 py-2 text-sm font-semibold text-white shadow-[#fa7316]/30 transition hover:bg-[#e86811]"
            >
              Abrir mesa
            </button>
          </div>
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/70 p-10 text-center">
            <span className="text-4xl" aria-hidden>
              🍽️
            </span>
            <p className="max-w-xs text-sm text-slate-400">
              Aún no tienes ventas registradas hoy. Abre una mesa para comenzar y monitorea aquí cada pedido en curso.
            </p>
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-xl font-semibold text-white">Tips rápidos</h2>
          <ul className="space-y-3 text-sm text-slate-200">
            {tips.map((tip) => (
              <li key={tip.title} className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                <p className="font-semibold text-white">{tip.title}</p>
                <p className="mt-1 text-xs text-slate-400">{tip.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Control de caja</h2>
            <p className="text-xs text-slate-500">Valores acumulados durante el turno actual.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { label: "Apertura", value: formatCurrency(shift.openingCash) },
            { label: "Ventas en efectivo", value: formatCurrency(cashSalesTotal) },
            { label: "Caja estimada", value: formatCurrency(expectedCash) },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
              <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
              <p className="mt-2 text-xs text-slate-500">Actualizado con datos del turno.</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

const SalesDashboard = () => (
  <SalesShiftGuard>
    {(props) => <SalesDashboardContent {...props} />}
  </SalesShiftGuard>
);

export default SalesDashboard;

