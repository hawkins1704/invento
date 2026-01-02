import { useMemo } from "react";
import { useQuery } from "convex/react";
import SalesShiftGuard from "../../components/SalesShiftGuard";
import SalesPageHeader from "../../components/sales-page-header/SalesPageHeader";
import type { ShiftSummary } from "../../hooks/useSalesShift";
import { formatCurrency, formatDate, formatTime } from "../../utils/format";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import DataTable from "../../components/table/DataTable";
import TableRow from "../../components/table/TableRow";
import { FaRegSadTear } from "react-icons/fa";
import Chip from "../../components/Chip";

type LiveSale = {
    sale: Doc<"sales">;
    items: Doc<"saleItems">[];
    table?: Doc<"branchTables"> | null;
    staff?: Doc<"staff"> | null;
};

const SalesDailyContent = ({ 
    activeShift, 
    branchId 
}: { 
    activeShift: ShiftSummary;
    branchId: string;
}) => {
    // Calcular el rango de fechas del día de hoy
    const todayRange = useMemo(() => {
        const now = new Date();
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return {
            from: start.getTime(),
            to: end.getTime(),
        };
    }, []);

    // Obtener las ventas cerradas del día de hoy
    const salesData = useQuery(
        api.sales.listHistory,
        branchId
            ? {
                  branchId: branchId as Id<"branches">,
                  from: todayRange.from,
                  to: todayRange.to,
                  limit: 1000, // Obtener todas las ventas del día
                  offset: 0,
              }
            : "skip"
    ) as { sales: LiveSale[]; total: number } | undefined;

    const todaySales = useMemo(
        () => salesData?.sales ?? [],
        [salesData?.sales]
    );
    const totalSales = salesData?.total ?? 0;

    // Calcular totales del día
    const dailyTotal = useMemo(() => {
        return todaySales.reduce((sum, entry) => sum + entry.sale.total, 0);
    }, [todaySales]);

    const getPaymentMethodLabel = (method: string) => {
        const labels: Record<string, string> = {
            Contado: "Efectivo",
            Tarjeta: "Tarjeta",
            Transferencia: "Transferencia",
            Otros: "Otros",
            "Sin registrar": "Sin registrar",
        };
        return labels[method] || method;
    };

    const getDocumentTypeLabel = (documentType?: "01" | "03") => {
        if (!documentType) return null;
        return documentType === "01" ? "FACTURA" : "BOLETA";
    };

    return (
        <div className="space-y-8">
            <SalesPageHeader title="Ventas del día" date={Date.now()} />

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
                        className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                    >
                        <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
                            {item.label}
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
                            {item.value}
                        </p>
                        <p className="mt-2 text-xs text-slate-500">
                            Actualizado con ventas cerradas durante el turno.
                        </p>
                    </div>
                ))}
            </section>

            <section className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 text-slate-900 dark:text-white">
                <header className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Ventas cerradas hoy
                    </h2>
                    <div className="flex items-center gap-3">
                        <Chip label={`${totalSales} ventas`} />
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            Total: {formatCurrency(dailyTotal)}
                        </span>
                    </div>
                </header>

                {todaySales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-600 dark:text-slate-400">
                        <FaRegSadTear size={40} />
                        <p className="text-sm">
                            No se han cerrado ventas hoy. Las ventas aparecerán aquí
                            una vez que sean cerradas.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="p-5">
                            <DataTable
                                columns={[
                                    { label: "Hora", key: "time" },
                                    { label: "Mesa", key: "table" },
                                    { label: "Atiende", key: "staff" },
                                    { label: "Método", key: "method" },
                                    {
                                        label: "Documento",
                                        key: "document",
                                    },
                                    {
                                        label: "Total",
                                        key: "total",
                                        align: "right",
                                    },
                                ]}
                            >
                                {todaySales.map((entry) => (
                                    <TableRow key={entry.sale._id}>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900 dark:text-white">
                                                    {formatDate(
                                                        entry.sale.closedAt ??
                                                            entry.sale.openedAt
                                                    )}
                                                </span>
                                                <span className="text-xs text-slate-600 dark:text-slate-400">
                                                    {formatTime(
                                                        entry.sale.closedAt ??
                                                            entry.sale.openedAt
                                                    )}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {entry.table?.label ?? "Sin mesa"}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {entry.staff?.name ?? "Sin asignar"}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {entry.sale.paymentMethod
                                                ? getPaymentMethodLabel(
                                                      entry.sale.paymentMethod
                                                  )
                                                : "No registrado"}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {entry.sale.documentId &&
                                            entry.sale.documentType ? (
                                                <span className="font-semibold text-[#fa7316]">
                                                    {getDocumentTypeLabel(
                                                        entry.sale.documentType
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-slate-500 dark:text-slate-500">
                                                    SIN DOC
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900 dark:text-white">
                                            {formatCurrency(entry.sale.total)}
                                        </td>
                                    </TableRow>
                                ))}
                            </DataTable>
                        </div>
                    </div>
                )}
            </section>

            <section className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white">
                <h2 className="text-lg font-semibold">Notas del turno</h2>
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    Documenta incidencias o transferencias de caja para mantener
                    un historial claro del turno actual.
                </p>
            </section>
        </div>
    );
};

const SalesDaily = () => (
    <SalesShiftGuard>
        {(props) => (
            <SalesDailyContent
                activeShift={props.activeShift}
                branchId={props.branchId}
            />
        )}
    </SalesShiftGuard>
);

export default SalesDaily;
