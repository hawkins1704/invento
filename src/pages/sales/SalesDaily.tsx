import SalesShiftGuard from "../../components/SalesShiftGuard";
import type { ShiftSummary } from "../../hooks/useSalesShift";
import { formatCurrency, formatDate } from "../../utils/format";

const SalesDailyContent = ({ activeShift }: { activeShift: ShiftSummary }) => {
    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="mt-3 text-3xl font-semibold">
                            Ventas del día
                        </h1>
                    </div>
                </div>
                <div className="text-xs uppercase tracking-[0.1em] text-slate-400">
                    {formatDate(Date.now())}
                </div>
            </header>

            <section className="grid gap-4 lg:grid-cols-3">
                {[
                    {
                        label: "Caja inicial",
                        value: formatCurrency(activeShift.shift.openingCash),
                    },
                    {
                        label: "Ventas en efectivo",
                        value: formatCurrency(activeShift.cashSalesTotal),
                    },
                    {
                        label: "Caja estimada",
                        value: formatCurrency(activeShift.expectedCash),
                    },
                ].map((item) => (
                    <div
                        key={item.label}
                        className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-white shadow-inner shadow-black/20"
                    >
                        <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
                            {item.label}
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-white">
                            {item.value}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                            Actualizado con ventas cerradas durante el turno.
                        </p>
                    </div>
                ))}
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20">
                <h2 className="text-lg font-semibold">Notas del turno</h2>
                <p className="mt-3 text-sm text-slate-400">
                    Documenta incidencias o transferencias de caja para mantener
                    un historial claro del turno actual.
                </p>
            </section>
        </div>
    );
};

const SalesDaily = () => (
    <SalesShiftGuard>
        {(props) => <SalesDailyContent {...props} />}
    </SalesShiftGuard>
);

export default SalesDaily;
