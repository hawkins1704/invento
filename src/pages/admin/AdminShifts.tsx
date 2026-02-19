import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { FaRegClock } from "react-icons/fa";
import DataTable from "../../components/table/DataTable";
import TableRow from "../../components/table/TableRow";
import Pagination from "../../components/pagination/Pagination";
import EmptyState from "../../components/empty-state/EmptyState";
import PageHeader from "../../components/page-header/PageHeader";
import {
    formatCurrency,
    formatDateTime,
} from "../../utils/format";

const ITEMS_PER_PAGE = 10;

type ShiftWithDetails = Doc<"shifts"> & {
    branchName: string;
    staffName: string;
    cashSalesTotal?: number;
};

const ShiftCard = ({ shift }: { shift: ShiftWithDetails }) => {
    const isOpen = shift.status === "open";
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="space-y-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {shift.branchName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {shift.staffName}
                        </p>
                    </div>
                    {isOpen ? (
                        <span className="rounded-full border border-emerald-500/40 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                            Abierto
                        </span>
                    ) : (
                        <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-500/10 dark:text-slate-200">
                            Cerrado
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <span className="text-xs text-slate-500">
                            Apertura
                        </span>
                        <p className="font-medium text-slate-700 dark:text-slate-200">
                            {formatDateTime(shift.openedAt)}
                        </p>
                    </div>
                    {shift.closedAt && (
                        <div>
                            <span className="text-xs text-slate-500">
                                Cierre
                            </span>
                            <p className="font-medium text-slate-700 dark:text-slate-200">
                                {formatDateTime(shift.closedAt)}
                            </p>
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div>
                        <span className="text-xs text-slate-500">
                            Caja inicial:{" "}
                        </span>
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {formatCurrency(shift.openingCash)}
                        </span>
                    </div>
                    {shift.cashSalesTotal !== undefined && (
                        <div>
                            <span className="text-xs text-slate-500">
                                Ventas efectivo:{" "}
                            </span>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {formatCurrency(shift.cashSalesTotal)}
                            </span>
                        </div>
                    )}
                    {shift.closingActualCash !== undefined && (
                        <div>
                            <span className="text-xs text-slate-500">
                                Caja real:{" "}
                            </span>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                {formatCurrency(shift.closingActualCash)}
                            </span>
                        </div>
                    )}
                    {shift.closingDiff !== undefined &&
                        Math.abs(shift.closingDiff) >= 0.01 && (
                            <div
                                className={
                                    shift.closingDiff >= 0
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-red-600 dark:text-red-400"
                                }
                            >
                                <span className="text-xs">Diferencia: </span>
                                <span className="text-sm font-semibold">
                                    {formatCurrency(shift.closingDiff)}
                                </span>
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
};

const AdminShifts = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    const shiftsData = useQuery(api.shifts.list, {
        limit: ITEMS_PER_PAGE,
        offset,
    }) as { shifts: ShiftWithDetails[]; total: number } | undefined;

    const shifts = shiftsData?.shifts ?? [];
    const totalShifts = shiftsData?.total ?? 0;
    const totalPages = Math.ceil(totalShifts / ITEMS_PER_PAGE);

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    return (
        <div className="space-y-8">
            <PageHeader
                chipLabel="Turnos"
                title="Historial de turnos"
                description="Revisa los turnos abiertos y cerrados en cada sucursal, caja inicial, ventas y diferencias."
            />

            <section>
                {shifts.length === 0 ? (
                    <EmptyState
                        icon={<FaRegClock className="w-10 h-10" />}
                        message="Aún no hay turnos registrados. Los turnos se crean desde el área de Ventas al abrir un turno en una sucursal."
                    />
                ) : (
                    <>
                        {/* Vista de tarjetas para mobile */}
                        <div className="space-y-3 md:hidden">
                            {shifts.map((shift) => (
                                <ShiftCard
                                    key={shift._id as string}
                                    shift={shift}
                                />
                            ))}
                        </div>
                        {/* Vista de tabla para tablet y desktop */}
                        <div className="hidden md:block">
                            <DataTable
                                columns={[
                                    { label: "Sucursal", key: "branch" },
                                    { label: "Responsable", key: "staff" },
                                    { label: "Apertura", key: "openedAt" },
                                    { label: "Cierre", key: "closedAt" },
                                    { label: "Caja inicial", key: "openingCash" },
                                    {
                                        label: "Ventas efectivo",
                                        key: "cashSales",
                                    },
                                    { label: "Caja real", key: "closingCash" },
                                    {
                                        label: "Diferencia",
                                        key: "diff",
                                    },
                                    { label: "Estado", key: "status" },
                                ]}
                            >
                                {shifts.map((shift) => {
                                    const isOpen = shift.status === "open";
                                    return (
                                        <TableRow key={shift._id as string}>
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                                                {shift.branchName}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {shift.staffName}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {formatDateTime(shift.openedAt)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {shift.closedAt
                                                    ? formatDateTime(
                                                          shift.closedAt
                                                      )
                                                    : "—"}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {formatCurrency(
                                                    shift.openingCash
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {shift.cashSalesTotal !==
                                                undefined
                                                    ? formatCurrency(
                                                          shift.cashSalesTotal
                                                      )
                                                    : "—"}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {shift.closingActualCash !==
                                                undefined
                                                    ? formatCurrency(
                                                          shift.closingActualCash
                                                      )
                                                    : "—"}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {shift.closingDiff !==
                                                undefined &&
                                                Math.abs(
                                                    shift.closingDiff
                                                ) >= 0.01 ? (
                                                    <span
                                                        className={
                                                            shift.closingDiff >=
                                                            0
                                                                ? "font-medium text-emerald-600 dark:text-emerald-400"
                                                                : "font-medium text-red-600 dark:text-red-400"
                                                        }
                                                    >
                                                        {formatCurrency(
                                                            shift.closingDiff
                                                        )}
                                                    </span>
                                                ) : (
                                                    "—"
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {isOpen ? (
                                                    <span className="rounded-full border border-emerald-500/40 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                                                        Abierto
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-500/10 dark:text-slate-200">
                                                        Cerrado
                                                    </span>
                                                )}
                                            </td>
                                        </TableRow>
                                    );
                                })}
                            </DataTable>
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalShifts}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={handlePageChange}
                            itemLabel="turnos"
                        />
                    </>
                )}
            </section>
        </div>
    );
};

export default AdminShifts;
