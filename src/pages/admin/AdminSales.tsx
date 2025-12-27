import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import {
    formatCurrency,
    formatDate,
    formatDateTime,
    formatDuration,
} from "../../utils/format";
import Chip from "../../components/Chip";
import { FaRegSadTear, FaDownload, FaSpinner } from "react-icons/fa";
import { HiOutlineReceiptTax } from "react-icons/hi";
import { LuStore } from "react-icons/lu";
import DataTable from "../../components/table/DataTable";
import TableRow from "../../components/table/TableRow";
import Pagination from "../../components/pagination/Pagination";
import DateRangePicker from "../../components/date-range-picker/DateRangePicker";
import CloseButton from "../../components/CloseButton";
import { useAPISUNAT } from "../../hooks/useAPISUNAT";
import type { PDFFormat } from "../../types/apisunat";

type PeriodKey = "day" | "month" | "custom";

type LiveSale = {
    sale: Doc<"sales">;
    items: Doc<"saleItems">[];
    table?: Doc<"branchTables"> | null;
    staff?: Doc<"staff"> | null;
};

type HistorySale = LiveSale;

const ITEMS_PER_PAGE = 10;

const computePeriodRange = (
    period: PeriodKey,
    customRange?: { from: Date | null; to: Date | null },
    selectedMonth?: number,
    selectedYear?: number
): { from: number; to: number } | null => {
    if (period === "custom") {
        if (customRange?.from && customRange?.to) {
            const start = new Date(customRange.from);
            start.setHours(0, 0, 0, 0);
            const end = new Date(customRange.to);
            end.setHours(23, 59, 59, 999);
            return {
                from: start.getTime(),
                to: end.getTime(),
            };
        }
        // Si está en modo custom pero no tiene rango completo, retornar null
        return null;
    }

    if (
        period === "month" &&
        selectedMonth !== undefined &&
        selectedYear !== undefined
    ) {
        // Primer día del mes seleccionado
        const start = new Date(selectedYear, selectedMonth, 1);
        start.setHours(0, 0, 0, 0);
        // Último día del mes seleccionado
        const end = new Date(selectedYear, selectedMonth + 1, 0);
        end.setHours(23, 59, 59, 999);
        return {
            from: start.getTime(),
            to: end.getTime(),
        };
    }

    if (period === "month") {
        // Si está en modo month pero no tiene mes/año seleccionado, retornar null
        return null;
    }

    // Periodo "day" (Hoy)
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    now.setHours(23, 59, 59, 999);

    return {
        from: start.getTime(),
        to: now.getTime(),
    };
};

const summarizeHistory = (data: HistorySale[]) => {
    const totals = data.reduce(
        (accumulator, entry) => {
            const total = entry.sale.total;
            const paymentMethod = entry.sale.paymentMethod ?? "Sin registrar";
            const staffId = entry.sale.staffId
                ? (entry.sale.staffId as string)
                : "sinStaff";

            accumulator.totalAmount += total;
            accumulator.totalSales += 1;
            accumulator.paymentBreakdown.set(
                paymentMethod,
                (accumulator.paymentBreakdown.get(paymentMethod) ?? 0) + total
            );
            accumulator.salesByStaff.set(
                staffId,
                (accumulator.salesByStaff.get(staffId) ?? 0) + total
            );

            return accumulator;
        },
        {
            totalAmount: 0,
            totalSales: 0,
            paymentBreakdown: new Map<string, number>(),
            salesByStaff: new Map<string, number>(),
        }
    );

    return totals;
};

const summarizeLive = (data: LiveSale[]) => {
    return data.reduce(
        (accumulator, entry) => {
            accumulator.totalAmount += entry.sale.total;
            accumulator.totalSales += 1;
            return accumulator;
        },
        {
            totalAmount: 0,
            totalSales: 0,
        }
    );
};

const AdminSales = () => {
    // Para los filtros, necesitamos todas las sucursales y miembros del personal (sin paginación)
    const allBranchesData = useQuery(api.branches.list, {
        limit: 1000, // Un número grande para obtener todas
        offset: 0,
    }) as { branches: Doc<"branches">[]; total: number } | undefined;

    const allStaffData = useQuery(api.staff.list, {
        includeInactive: false,
        limit: 1000, // Un número grande para obtener todas
        offset: 0,
    }) as { staff: Doc<"staff">[]; total: number } | undefined;

    const branches = useMemo(
        () => allBranchesData?.branches ?? [],
        [allBranchesData]
    );
    const staffMembers = useMemo(
        () => allStaffData?.staff ?? [],
        [allStaffData]
    );

    const [viewMode, setViewMode] = useState<"history" | "live">("history");
    const [period, setPeriod] = useState<PeriodKey>("day");
    const [customDateRange, setCustomDateRange] = useState<{
        from: Date | null;
        to: Date | null;
    }>({ from: null, to: null });
    const [selectedMonth, setSelectedMonth] = useState<number | undefined>(
        undefined
    );
    const [selectedYear, setSelectedYear] = useState<number | undefined>(
        undefined
    );
    const [historyBranchFilter, setHistoryBranchFilter] = useState<
        "all" | Id<"branches">
    >("all");
    const [historyStaffFilter, setHistoryStaffFilter] = useState<
        "all" | Id<"staff">
    >("all");
    const [liveBranchId, setLiveBranchId] = useState<Id<"branches"> | null>(
        null
    );
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        if (!branches || branches.length === 0) {
            return;
        }

        if (liveBranchId === null) {
            setLiveBranchId(branches[0]._id);
        } else if (!branches.some((branch) => branch._id === liveBranchId)) {
            setLiveBranchId(branches[0]._id);
        }

        if (
            historyBranchFilter !== "all" &&
            !branches.some((branch) => branch._id === historyBranchFilter)
        ) {
            setHistoryBranchFilter("all");
        }
    }, [branches, liveBranchId, historyBranchFilter]);

    const periodRange = useMemo(() => {
        // Solo usar rango personalizado si está en modo "custom" y tiene ambas fechas
        if (period === "custom" && customDateRange.from && customDateRange.to) {
            return computePeriodRange(period, customDateRange);
        }
        // Si está en modo "custom" pero no tiene rango completo, no hacer query
        if (period === "custom") {
            return null;
        }
        // Modo "month" con mes y año seleccionados
        if (period === "month") {
            return computePeriodRange(
                period,
                undefined,
                selectedMonth,
                selectedYear
            );
        }
        // Modo "day" (Hoy)
        return computePeriodRange(period);
    }, [period, customDateRange, selectedMonth, selectedYear]);

    // Resetear a página 1 cuando cambien los filtros
    useEffect(() => {
        setCurrentPage(1);
    }, [periodRange, historyBranchFilter, historyStaffFilter]);

    // Resetear filtros cuando se cambia de periodo
    useEffect(() => {
        if (period === "day") {
            setCustomDateRange({ from: null, to: null });
            setSelectedMonth(undefined);
            setSelectedYear(undefined);
        } else if (period === "custom") {
            setSelectedMonth(undefined);
            setSelectedYear(undefined);
        } else if (period === "month") {
            setCustomDateRange({ from: null, to: null });
        }
    }, [period]);

    const historyArgs = useMemo(() => {
        // Si no hay rango válido, no hacer query
        if (!periodRange) {
            return "skip" as const;
        }

        const offset = (currentPage - 1) * ITEMS_PER_PAGE;

        const args: {
            from: number;
            to: number;
            limit: number;
            offset: number;
            branchId?: Id<"branches">;
            staffId?: Id<"staff">;
        } = {
            from: periodRange.from,
            to: periodRange.to,
            limit: ITEMS_PER_PAGE,
            offset,
        };

        if (historyBranchFilter !== "all") {
            args.branchId = historyBranchFilter;
        }

        if (historyStaffFilter !== "all") {
            args.staffId = historyStaffFilter;
        }

        return args;
    }, [periodRange, historyBranchFilter, historyStaffFilter, currentPage]);

    const historyDataResult = useQuery(
        api.sales.listHistory,
        historyArgs === "skip" ? "skip" : historyArgs
    ) as { sales: HistorySale[]; total: number } | undefined;

    const historyData = useMemo(
        () => historyDataResult?.sales ?? [],
        [historyDataResult]
    );
    const totalHistorySales = historyDataResult?.total ?? 0;
    const totalPages = Math.ceil(totalHistorySales / ITEMS_PER_PAGE);

    // Queries para Métodos de pago y Productos más vendidos con filtros
    const paymentBreakdownArgs = useMemo(() => {
        if (!periodRange) {
            return "skip" as const;
        }
        const args: {
            from: number;
            to: number;
            branchId?: Id<"branches">;
            staffId?: Id<"staff">;
        } = {
            from: periodRange.from,
            to: periodRange.to,
        };
        if (historyBranchFilter !== "all") {
            args.branchId = historyBranchFilter;
        }
        if (historyStaffFilter !== "all") {
            args.staffId = historyStaffFilter;
        }
        return args;
    }, [periodRange, historyBranchFilter, historyStaffFilter]);

    const paymentBreakdown = useQuery(
        api.sales.getPaymentMethodBreakdown,
        paymentBreakdownArgs === "skip" ? "skip" : paymentBreakdownArgs
    ) as
        | Array<{
              method: string;
              amount: number;
              percentage: number;
          }>
        | undefined;

    const topProductsArgs = useMemo(() => {
        if (!periodRange) {
            return "skip" as const;
        }
        const args: {
            limit: number;
            from: number;
            to: number;
            branchId?: Id<"branches">;
            staffId?: Id<"staff">;
        } = {
            limit: 3,
            from: periodRange.from,
            to: periodRange.to,
        };
        if (historyBranchFilter !== "all") {
            args.branchId = historyBranchFilter;
        }
        if (historyStaffFilter !== "all") {
            args.staffId = historyStaffFilter;
        }
        return args;
    }, [periodRange, historyBranchFilter, historyStaffFilter]);

    const topProducts = useQuery(
        api.sales.getTopProducts,
        topProductsArgs === "skip" ? "skip" : topProductsArgs
    ) as
        | Array<{
              productId: Id<"products">;
              productName: string;
              quantity: number;
              revenue: number;
          }>
        | undefined;

    const topStaffArgs = useMemo(() => {
        if (!periodRange) {
            return "skip" as const;
        }
        const args: {
            limit: number;
            from: number;
            to: number;
            branchId?: Id<"branches">;
            staffId?: Id<"staff">;
        } = {
            limit: 3,
            from: periodRange.from,
            to: periodRange.to,
        };
        if (historyBranchFilter !== "all") {
            args.branchId = historyBranchFilter;
        }
        if (historyStaffFilter !== "all") {
            args.staffId = historyStaffFilter;
        }
        return args;
    }, [periodRange, historyBranchFilter, historyStaffFilter]);

    const topStaff = useQuery(
        api.sales.getTopStaff,
        topStaffArgs === "skip" ? "skip" : topStaffArgs
    ) as
        | Array<{
              staffId: Id<"staff"> | "sinStaff";
              staffName: string;
              totalAmount: number;
          }>
        | undefined;

    const salesByHourArgs = useMemo(() => {
        if (!periodRange) {
            return "skip" as const;
        }
        const args: {
            from: number;
            to: number;
            branchId?: Id<"branches">;
            staffId?: Id<"staff">;
        } = {
            from: periodRange.from,
            to: periodRange.to,
        };
        if (historyBranchFilter !== "all") {
            args.branchId = historyBranchFilter;
        }
        if (historyStaffFilter !== "all") {
            args.staffId = historyStaffFilter;
        }
        return args;
    }, [periodRange, historyBranchFilter, historyStaffFilter]);

    const salesByHour = useQuery(
        api.sales.getSalesByHour,
        salesByHourArgs === "skip" ? "skip" : salesByHourArgs
    ) as
        | Array<{
              hour: number;
              amount: number;
          }>
        | undefined;

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const liveArgs = useMemo(() => {
        if (!liveBranchId) {
            return "skip" as const;
        }
        return { branchId: liveBranchId };
    }, [liveBranchId]);

    const liveData = useQuery(
        api.sales.listLiveByBranch,
        liveArgs === "skip" ? "skip" : liveArgs
    ) as LiveSale[] | undefined;

    const historySummary = useMemo(
        () => summarizeHistory(historyData ?? []),
        [historyData]
    );
    const liveSummary = useMemo(
        () => summarizeLive(liveData ?? []),
        [liveData]
    );

    const staffOptions = useMemo(() => {
        if (!staffMembers) {
            return [];
        }
        return staffMembers.sort((a, b) => a.name.localeCompare(b.name));
    }, [staffMembers]);

    const branchNameById = useMemo(() => {
        const map = new Map<string, string>();
        branches?.forEach((branch) => {
            map.set(branch._id as string, branch.name);
        });
        return map;
    }, [branches]);

    const staffNameById = useMemo(() => {
        const map = new Map<string, string>();
        staffMembers?.forEach((member) => {
            map.set(member._id as string, member.name);
        });
        map.set("sinStaff", "Sin asignar");
        return map;
    }, [staffMembers]);

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-6 rounded-lg border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                    <Chip label="Ventas" />
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold">
                            Panel de ventas
                        </h1>
                        <p className="max-w-2xl text-sm text-slate-300">
                            Alterna entre el historial consolidado y las ventas
                            en vivo para monitorear cada sucursal en tiempo
                            real.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setViewMode("history")}
                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition rounded-lg cursor-pointer ${
                            viewMode === "history"
                                ? "bg-[#fa7316] text-white"
                                : "border border-slate-700 bg-slate-900/60 text-slate-300 hover:border-white/30 hover:text-white"
                        }`}
                    >
                        Historial
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode("live")}
                        className={`inline-flex items-center gap-2  px-4 py-2 text-sm font-semibold transition rounded-lg cursor-pointer ${
                            viewMode === "live"
                                ? "bg-[#fa7316] text-white "
                                : "border border-slate-700 bg-slate-900/60 text-slate-300 hover:border-white/30 hover:text-white"
                        }`}
                    >
                        Ventas en vivo
                    </button>
                </div>
            </header>

            {viewMode === "history" ? (
                <HistoryView
                    branches={branches ?? []}
                    staffMembers={staffOptions}
                    branchNameById={branchNameById}
                    staffNameById={staffNameById}
                    data={historyData ?? []}
                    summary={historySummary}
                    paymentBreakdown={paymentBreakdown}
                    topProducts={topProducts}
                    topStaff={topStaff}
                    salesByHour={salesByHour}
                    period={period}
                    onPeriodChange={setPeriod}
                    customDateRange={customDateRange}
                    onCustomRangeChange={setCustomDateRange}
                    selectedMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                    selectedYear={selectedYear}
                    onYearChange={setSelectedYear}
                    selectedBranch={historyBranchFilter}
                    onBranchChange={setHistoryBranchFilter}
                    selectedStaff={historyStaffFilter}
                    onStaffChange={setHistoryStaffFilter}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalHistorySales}
                    onPageChange={handlePageChange}
                />
            ) : (
                <LiveView
                    branches={branches ?? []}
                    data={liveData ?? []}
                    summary={liveSummary}
                    selectedBranch={liveBranchId}
                    onSelectBranch={setLiveBranchId}
                    staffNameById={staffNameById}
                />
            )}
        </div>
    );
};

type HistoryViewProps = {
    branches: Doc<"branches">[];
    staffMembers: Doc<"staff">[];
    branchNameById: Map<string, string>;
    staffNameById: Map<string, string>;
    data: HistorySale[];
    summary: ReturnType<typeof summarizeHistory>;
    paymentBreakdown:
        | Array<{
              method: string;
              amount: number;
              percentage: number;
          }>
        | undefined;
    topProducts:
        | Array<{
              productId: Id<"products">;
              productName: string;
              quantity: number;
              revenue: number;
          }>
        | undefined;
    topStaff:
        | Array<{
              staffId: Id<"staff"> | "sinStaff";
              staffName: string;
              totalAmount: number;
          }>
        | undefined;
    salesByHour:
        | Array<{
              hour: number;
              amount: number;
          }>
        | undefined;
    period: PeriodKey;
    onPeriodChange: (period: PeriodKey) => void;
    customDateRange: { from: Date | null; to: Date | null };
    onCustomRangeChange: (range: {
        from: Date | null;
        to: Date | null;
    }) => void;
    selectedMonth: number | undefined;
    onMonthChange: (month: number | undefined) => void;
    selectedYear: number | undefined;
    onYearChange: (year: number | undefined) => void;
    selectedBranch: "all" | Id<"branches">;
    onBranchChange: (branch: "all" | Id<"branches">) => void;
    selectedStaff: "all" | Id<"staff">;
    onStaffChange: (staff: "all" | Id<"staff">) => void;
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
};

const HistoryView = ({
    branches,
    staffMembers,
    branchNameById,
    staffNameById,
    data,
    summary,
    paymentBreakdown: paymentBreakdownData,
    topProducts,
    topStaff: topStaffData,
    salesByHour: salesByHourData,
    period,
    onPeriodChange,
    customDateRange,
    onCustomRangeChange,
    selectedMonth,
    onMonthChange,
    selectedYear,
    onYearChange,
    selectedBranch,
    onBranchChange,
    selectedStaff,
    onStaffChange,
    currentPage,
    totalPages,
    totalItems,
    onPageChange,
}: HistoryViewProps) => {
    const currentUser = useQuery(api.users.getCurrent) as
        | Doc<"users">
        | undefined;
    const { getDocument, downloadPDF } = useAPISUNAT();
    const [selectedSale, setSelectedSale] = useState<HistorySale | null>(null);
    const [documentFileName, setDocumentFileName] = useState<string | null>(
        null
    );
    const [selectedFormat, setSelectedFormat] = useState<PDFFormat>("A4");
    const [isLoadingDocument, setIsLoadingDocument] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const handleDocumentClick = async (entry: HistorySale) => {
        if (!entry.sale.documentId || !currentUser?.personaToken) {
            return;
        }

        setSelectedSale(entry);
        setSelectedFormat("A4");
        setDownloadError(null);
        setDocumentFileName(null);
        setIsLoadingDocument(true);

        try {
            // Obtener el documento para conseguir el fileName
            const document = await getDocument(
                entry.sale.documentId,
                currentUser.personaToken
            );

            if (document) {
                setDocumentFileName(document.fileName);
            } else {
                setDownloadError(
                    "No se pudo obtener la información del documento"
                );
            }
        } catch (error) {
            setDownloadError(
                error instanceof Error
                    ? error.message
                    : "Error al obtener el documento"
            );
        } finally {
            setIsLoadingDocument(false);
        }
    };

    const handleCloseModal = () => {
        if (!isDownloading) {
            setSelectedSale(null);
            setDocumentFileName(null);
            setDownloadError(null);
        }
    };

    const handleDownload = async () => {
        if (
            !selectedSale?.sale.documentId ||
            !documentFileName ||
            !currentUser?.personaToken
        ) {
            return;
        }

        setIsDownloading(true);
        setDownloadError(null);

        try {
            await downloadPDF(
                selectedSale.sale.documentId,
                selectedFormat,
                documentFileName
            );

            // Cerrar modal después de abrir el PDF
            setSelectedSale(null);
        } catch (err) {
            setDownloadError(
                err instanceof Error ? err.message : "Error al abrir el PDF"
            );
        } finally {
            setIsDownloading(false);
        }
    };

    const getDocumentTypeLabel = (documentType?: "01" | "03") => {
        if (!documentType) return null;
        return documentType === "01" ? "FACTURA" : "BOLETA";
    };
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

    // Generar opciones de meses
    const months = [
        { value: 0, label: "Enero" },
        { value: 1, label: "Febrero" },
        { value: 2, label: "Marzo" },
        { value: 3, label: "Abril" },
        { value: 4, label: "Mayo" },
        { value: 5, label: "Junio" },
        { value: 6, label: "Julio" },
        { value: 7, label: "Agosto" },
        { value: 8, label: "Septiembre" },
        { value: 9, label: "Octubre" },
        { value: 10, label: "Noviembre" },
        { value: 11, label: "Diciembre" },
    ];

    // Generar opciones de años (últimos 5 años hasta el año actual)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

    return (
        <div className="space-y-6">
            <section className="flex flex-wrap items-start gap-4 rounded-lg border border-slate-800 bg-slate-900/50 p-5 text-white shadow-inner shadow-black/20">
                <div className="flex flex-col gap-2">
                    <span className="text-xs uppercase tracking-[0.1em] text-slate-500">
                        Periodo
                    </span>
                    <div className="flex flex-wrap items-end gap-2">
                        <button
                            type="button"
                            onClick={() => onPeriodChange("day")}
                            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                                period === "day"
                                    ? "bg-[#fa7316] text-white border border-[#fa7316]"
                                    : "border border-slate-700 bg-slate-900/60 text-slate-300 hover:border-white/30 hover:text-white"
                            }`}
                        >
                            Hoy
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onPeriodChange("month");
                            }}
                            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                                period === "month"
                                    ? "bg-[#fa7316] text-white border border-[#fa7316]"
                                    : "border border-slate-700 bg-slate-900/60 text-slate-300 hover:border-white/30 hover:text-white"
                            }`}
                        >
                            Por Mes
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onPeriodChange("custom");
                            }}
                            className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                                period === "custom"
                                    ? "bg-[#fa7316] text-white border border-[#fa7316]"
                                    : "border border-slate-700 bg-slate-900/60 text-slate-300 hover:border-white/30 hover:text-white"
                            }`}
                        >
                            Por rango
                        </button>
                    </div>
                    <div>
                        {period === "custom" && (
                            <DateRangePicker
                                startDate={customDateRange.from}
                                endDate={customDateRange.to}
                                onRangeChange={(range) => {
                                    onCustomRangeChange(range);
                                }}
                            />
                        )}
                        {period === "month" && (
                            <div className="flex gap-2">
                                <select
                                    value={selectedMonth ?? ""}
                                    onChange={(e) => {
                                        const month = e.target.value
                                            ? parseInt(e.target.value, 10)
                                            : undefined;
                                        onMonthChange(month);
                                        if (
                                            month !== undefined &&
                                            selectedYear !== undefined
                                        ) {
                                            onPeriodChange("month");
                                        } else if (month === undefined) {
                                            // Si se deselecciona el mes, cambiar a otro periodo si no hay año
                                            if (selectedYear === undefined) {
                                                onPeriodChange("day");
                                            }
                                        }
                                    }}
                                    className={`rounded-lg flex-2 border px-4 py-2 text-xs font-semibold transition ${
                                        period === "month" &&
                                        selectedMonth !== undefined
                                            ? "border-[#fa7316] text-white"
                                            : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-white/30 hover:text-white"
                                    } outline-none `}
                                >
                                    <option value="">Mes</option>
                                    {months.map((month) => (
                                        <option
                                            key={month.value}
                                            value={month.value}
                                        >
                                            {month.label}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={selectedYear ?? ""}
                                    onChange={(e) => {
                                        const year = e.target.value
                                            ? parseInt(e.target.value, 10)
                                            : undefined;
                                        onYearChange(year);
                                        if (
                                            selectedMonth !== undefined &&
                                            year !== undefined
                                        ) {
                                            onPeriodChange("month");
                                        }
                                    }}
                                    className={`rounded-lg flex-1 border px-4 py-2 text-xs font-semibold transition ${
                                        period === "month" &&
                                        selectedYear !== undefined
                                            ? "border-[#fa7316] text-white"
                                            : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-white/30 hover:text-white"
                                    } outline-none`}
                                >
                                    <option value="">Año</option>
                                    {years.map((year) => (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-[0.1em] text-slate-500">
                        Sucursal
                    </label>
                    <select
                        value={
                            selectedBranch === "all"
                                ? "all"
                                : (selectedBranch as string)
                        }
                        onChange={(event) => {
                            const value = event.target.value;
                            if (value === "all") {
                                onBranchChange("all");
                            } else {
                                onBranchChange(value as Id<"branches">);
                            }
                        }}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                    >
                        <option value="all">Todas las sucursales</option>
                        {branches.map((branch) => (
                            <option
                                key={branch._id}
                                value={branch._id as string}
                            >
                                {branch.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs uppercase tracking-[0.1em] text-slate-500">
                        Personal
                    </label>
                    <select
                        value={
                            selectedStaff === "all"
                                ? "all"
                                : (selectedStaff as string)
                        }
                        onChange={(event) => {
                            const value = event.target.value;
                            if (value === "all") {
                                onStaffChange("all");
                            } else {
                                onStaffChange(value as Id<"staff">);
                            }
                        }}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                    >
                        <option value="all">Todo el personal</option>
                        {staffMembers.map((member) => (
                            <option
                                key={member._id}
                                value={member._id as string}
                            >
                                {member.name}
                            </option>
                        ))}
                    </select>
                </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-4">
                <SummaryCard
                    title="Total vendido"
                    value={formatCurrency(summary.totalAmount)}
                    subtitle="Suma de ventas cerradas en el periodo seleccionado."
                />
                <SummaryCard
                    title="Tickets cerrados"
                    value={summary.totalSales.toString()}
                    subtitle="Cantidad de ventas finalizadas."
                />
                <SummaryCard
                    title="Ticket promedio"
                    value={
                        summary.totalSales === 0
                            ? "S/ 0.00"
                            : formatCurrency(
                                  summary.totalAmount / summary.totalSales
                              )
                    }
                    subtitle="Promedio del valor de cada ticket."
                />
                <SummaryCard
                    title="Métodos registrados"
                    value={
                        paymentBreakdownData
                            ? paymentBreakdownData.length.toString()
                            : "0"
                    }
                    subtitle="Variantes de pago utilizadas en el periodo."
                />
            </section>

            <section className="grid gap-4">
                <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60 text-white shadow-inner shadow-black/20">
                    <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                        <h2 className="text-lg font-semibold">
                            Ventas cerradas
                        </h2>

                        <Chip label={data.length.toString() + " registros"} />
                    </header>

                    {data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-400">
                            <FaRegSadTear size={40} />
                            <p className="text-sm">
                                No se encontraron ventas en el periodo
                                seleccionado. Ajusta los filtros para ver otros
                                resultados.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Vista de tarjetas para mobile */}
                            <div className="space-y-3 p-5 md:hidden">
                                {data.map((entry) => (
                                    <SaleCard
                                        key={entry.sale._id}
                                        entry={entry}
                                        branchNameById={branchNameById}
                                        staffNameById={staffNameById}
                                        onDocumentClick={handleDocumentClick}
                                    />
                                ))}
                            </div>
                            {/* Vista de tabla para tablet y desktop */}

                            <div className="hidden w-full md:block p-5 pb-0">
                                <DataTable
                                    columns={[
                                        { label: "Fecha", key: "date" },
                                        { label: "Sucursal", key: "branch" },
                                        { label: "Mesa", key: "table" },
                                        { label: "Atiende", key: "staff" },
                                        { label: "Método", key: "method" },
                                        {
                                            label: "Documento Emitido",
                                            key: "document",
                                        },
                                        {
                                            label: "Total",
                                            key: "total",
                                            align: "right",
                                        },
                                    ]}
                                >
                                    {data.map((entry) => (
                                        <TableRow key={entry.sale._id}>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-white">
                                                        {formatDate(
                                                            entry.sale
                                                                .closedAt ??
                                                                entry.sale
                                                                    .openedAt
                                                        )}
                                                    </span>
                                                    <span className="text-xs text-slate-400">
                                                        {formatTime(
                                                            entry.sale
                                                                .closedAt ??
                                                                entry.sale
                                                                    .openedAt
                                                        )}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-200">
                                                {branchNameById.get(
                                                    entry.sale
                                                        .branchId as string
                                                ) ?? "Sucursal"}
                                            </td>
                                            
                                            <td className="px-6 py-4 text-sm text-slate-300">
                                                {entry.table?.label ??
                                                    "Sin mesa"}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-300">
                                                {entry.sale.staffId
                                                    ? (staffNameById.get(
                                                          entry.sale
                                                              .staffId as string
                                                      ) ?? "Personal")
                                                    : "Sin asignar"}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-300">
                                                {entry.sale.paymentMethod
                                                    ? methodLabel(
                                                          entry.sale
                                                              .paymentMethod
                                                      )
                                                    : "No registrado"}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                {entry.sale.documentId &&
                                                entry.sale.documentType ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleDocumentClick(
                                                                entry
                                                            )
                                                        }
                                                        className="text-[#fa7316] hover:text-[#e86811] transition-colors cursor-pointer font-semibold"
                                                    >
                                                        {getDocumentTypeLabel(
                                                            entry.sale
                                                                .documentType
                                                        )}
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-500">
                                                        SIN DOC
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-semibold text-white">
                                                {formatCurrency(
                                                    entry.sale.total
                                                )}
                                            </td>
                                        </TableRow>
                                    ))}
                                </DataTable>
                            </div>
                        </>
                    )}

                    <div className="border-slate-800 px-5 pb-5">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={onPageChange}
                            itemLabel="ventas"
                        />
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-white shadow-inner shadow-black/20">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-400">
                            Métodos de pago
                        </h3>
                        <ul className="mt-4 space-y-3 text-sm">
                            {!paymentBreakdownData ||
                            paymentBreakdownData.length === 0 ? (
                                <li className="rounded-lg border border-slate-800/60 bg-slate-950/60 px-4 py-3 text-slate-400">
                                    Aún no se registran métodos de pago en este
                                    periodo.
                                </li>
                            ) : (
                                paymentBreakdownData.map((item) => (
                                    <li
                                        key={item.method}
                                        className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-950/60 px-4 py-3"
                                    >
                                        <div className="flex-1">
                                            <span className="text-slate-200">
                                                {getPaymentMethodLabel(
                                                    item.method
                                                )}
                                            </span>
                                            <span className="ml-2 text-xs text-slate-500">
                                                {item.percentage.toFixed(1)}%
                                            </span>
                                        </div>
                                        <span className="font-semibold text-white">
                                            {formatCurrency(item.amount)}
                                        </span>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-white shadow-inner shadow-black/20">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-400">
                            Productos más vendidos
                        </h3>
                        <ul className="mt-4 space-y-3 text-sm">
                            {!topProducts || topProducts.length === 0 ? (
                                <li className="rounded-lg border border-slate-800/60 bg-slate-950/60 px-4 py-3 text-slate-400">
                                    Aún no se registran productos vendidos en
                                    este periodo.
                                </li>
                            ) : (
                                topProducts.map((product) => (
                                    <li
                                        key={product.productId as string}
                                        className="flex flex-col gap-1 rounded-lg border border-slate-800/60 bg-slate-950/60 px-4 py-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-200">
                                                {product.productName}
                                            </span>
                                            <span className="font-semibold text-white">
                                                {formatCurrency(
                                                    product.revenue
                                                )}
                                            </span>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {product.quantity} unidades
                                        </span>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-white shadow-inner shadow-black/20">
                        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-400">
                            Top personal
                        </h3>
                        <ul className="mt-4 space-y-3 text-sm">
                            {!topStaffData || topStaffData.length === 0 ? (
                                <li className="rounded-lg border border-slate-800/60 bg-slate-950/60 px-4 py-3 text-slate-400">
                                    Aún no se registran ventas por personal en
                                    este periodo.
                                </li>
                            ) : (
                                topStaffData.map((staff) => (
                                    <li
                                        key={staff.staffId}
                                        className="flex items-center justify-between rounded-lg border border-slate-800/60 bg-slate-950/60 px-4 py-3"
                                    >
                                        <span className="text-slate-200">
                                            {staff.staffName}
                                        </span>
                                        <span className="font-semibold text-white">
                                            {formatCurrency(staff.totalAmount)}
                                        </span>
                                    </li>
                                ))
                            )}
                        </ul>
                    </div>
                </div>
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-white shadow-inner shadow-black/20">
                <h2 className="text-lg font-semibold mb-6">
                    Mapa de ventas por hora
                </h2>
                {!salesByHourData ||
                salesByHourData.length === 0 ||
                salesByHourData.every((h) => h.amount === 0) ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center text-slate-400">
                        <HiOutlineReceiptTax size={40} />
                        <p className="text-sm">
                            Aún no hay ventas registradas en el periodo
                            seleccionado.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {(() => {
                            const maxHourlyAmount = Math.max(
                                ...salesByHourData.map((h) => h.amount),
                                1
                            );
                            const formatHour = (hour: number) => {
                                return `${hour.toString().padStart(2, "0")}:00`;
                            };

                            return (
                                <div className="flex flex-col gap-2">
                                    {/* Gráfico vertical en móvil, horizontal en pantallas grandes */}
                                    {/* Móvil: barras horizontales apiladas verticalmente */}
                                    <div className="flex flex-col gap-2 md:hidden">
                                        {salesByHourData.map((hourData) => {
                                            const barWidth =
                                                (hourData.amount /
                                                    maxHourlyAmount) *
                                                100;

                                            const intensity =
                                                hourData.amount > 0
                                                    ? Math.max(
                                                          0.3,
                                                          barWidth / 100
                                                      )
                                                    : 0;

                                            return (
                                                <div
                                                    key={hourData.hour}
                                                    className="flex items-center gap-3"
                                                >
                                                    <div className="w-16 text-xs font-semibold text-slate-400">
                                                        {formatHour(
                                                            hourData.hour
                                                        )}
                                                    </div>
                                                    <div className="flex-1 relative">
                                                        <div className="h-8 rounded-lg bg-slate-950/60 overflow-hidden">
                                                            <div
                                                                className="h-full rounded-lg transition-all bg-[#fa7316]"
                                                                style={{
                                                                    width: `${Math.max(
                                                                        barWidth,
                                                                        hourData.amount >
                                                                            0
                                                                            ? 2
                                                                            : 0
                                                                    )}%`,
                                                                    opacity:
                                                                        intensity,
                                                                    minWidth:
                                                                        hourData.amount >
                                                                        0
                                                                            ? "2px"
                                                                            : "0",
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Desktop: barras verticales en horizontal */}
                                    <div className="hidden md:flex items-end justify-between gap-1 h-64 px-2 overflow-x-scroll">
                                        {salesByHourData.map((hourData) => {
                                            const barHeight =
                                                (hourData.amount /
                                                    maxHourlyAmount) *
                                                100;

                                            const intensity =
                                                hourData.amount > 0
                                                    ? Math.max(
                                                          0.3,
                                                          barHeight / 100
                                                      )
                                                    : 0;

                                            return (
                                                <div
                                                    key={hourData.hour}
                                                    className="flex-1 flex flex-col items-center gap-1 h-full"
                                                >
                                                    {/* Barra vertical */}
                                                    <div className="w-full flex-1 flex items-end relative">
                                                        <div className="w-full rounded-t-lg bg-slate-950/60 overflow-hidden h-full flex items-end">
                                                            <div
                                                                className="w-full rounded-t-lg transition-all bg-[#fa7316]"
                                                                style={{
                                                                    height: `${Math.max(
                                                                        barHeight,
                                                                        hourData.amount >
                                                                            0
                                                                            ? 2
                                                                            : 0
                                                                    )}%`,
                                                                    opacity:
                                                                        intensity,
                                                                    minHeight:
                                                                        hourData.amount >
                                                                        0
                                                                            ? "2px"
                                                                            : "0",
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    {/* Hora en el eje X */}
                                                    <div className="text-xs font-semibold text-slate-400 mt-1">
                                                        {formatHour(
                                                            hourData.hour
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </section>

            {/* Modal de descarga de documento */}
            {selectedSale && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 px-4 py-10 backdrop-blur">
                    <div className="relative w-full max-w-md rounded-lg border border-slate-800 bg-slate-900/95 p-6 text-white shadow-2xl shadow-black/60">
                        <CloseButton onClick={handleCloseModal} />

                        <div className="space-y-5 pt-6">
                            <header className="space-y-2">
                                <h2 className="text-2xl font-semibold text-white">
                                    Descargar PDF
                                </h2>
                                <p className="text-sm text-slate-400">
                                    Selecciona el formato del documento que
                                    deseas descargar.
                                </p>
                            </header>

                            {isLoadingDocument ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-8">
                                    <FaSpinner className="animate-spin text-2xl text-[#fa7316]" />
                                    <p className="text-sm text-slate-400">
                                        Cargando información del documento...
                                    </p>
                                </div>
                            ) : documentFileName ? (
                                <>
                                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                                        <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
                                            Documento
                                        </p>
                                        <p className="mt-2 text-lg font-semibold text-white">
                                            {documentFileName}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {selectedSale.sale.documentType ===
                                            "01"
                                                ? "Factura"
                                                : "Boleta de Venta"}
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label
                                            className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500"
                                            htmlFor="pdf-format"
                                        >
                                            Formato
                                        </label>
                                        <select
                                            id="pdf-format"
                                            value={selectedFormat}
                                            onChange={(e) =>
                                                setSelectedFormat(
                                                    e.target.value as PDFFormat
                                                )
                                            }
                                            disabled={isDownloading}
                                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <option value="A4">A4</option>
                                            <option value="A5">A5</option>
                                            <option value="ticket58mm">
                                                Ticket 58mm
                                            </option>
                                            <option value="ticket80mm">
                                                Ticket 80mm
                                            </option>
                                        </select>
                                        <p className="text-xs text-slate-500">
                                            Selecciona el formato de impresión
                                            del documento.
                                        </p>
                                    </div>

                                    {downloadError && (
                                        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                            {downloadError}
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            disabled={isDownloading}
                                            className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-[#fa7316] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDownload}
                                            disabled={isDownloading}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                                        >
                                            {isDownloading ? (
                                                <>
                                                    <FaSpinner className="animate-spin" />
                                                    Descargando...
                                                </>
                                            ) : (
                                                <>
                                                    <FaDownload />
                                                    Descargar
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                    {downloadError ||
                                        "No se pudo cargar la información del documento"}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const LiveView = ({
    branches,
    summary,
    data,
    selectedBranch,
    onSelectBranch,
    staffNameById,
}: {
    branches: Doc<"branches">[];
    summary: ReturnType<typeof summarizeLive>;
    data: LiveSale[];
    selectedBranch: Id<"branches"> | null;
    onSelectBranch: (branch: Id<"branches"> | null) => void;
    staffNameById: Map<string, string>;
}) => {
    return (
        <div className="space-y-6">
            <section className="flex flex-wrap items-center gap-2">
                {branches.map((branch) => {
                    const isActive = selectedBranch === branch._id;
                    return (
                        <button
                            key={branch._id}
                            type="button"
                            onClick={() => onSelectBranch(branch._id)}
                            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                                isActive
                                    ? "border-transparent bg-[#fa7316] text-white "
                                    : "border-slate-700 bg-slate-900/60 text-slate-300 hover:border-white/30 hover:text-white"
                            }`}
                        >
                            {branch.name}
                        </button>
                    );
                })}
                {branches.length === 0 && (
                    <span className="rounded-lg border border-dashed border-slate-700 bg-slate-950/50 px-4 py-2 text-sm text-slate-400">
                        Crea una sucursal para comenzar a registrar ventas.
                    </span>
                )}
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
                <SummaryCard
                    title="Ventas abiertas"
                    value={summary.totalSales.toString()}
                    subtitle="Tickets activos en la sucursal seleccionada."
                />
                <SummaryCard
                    title="Total en curso"
                    value={formatCurrency(summary.totalAmount)}
                    subtitle="Suma de los tickets abiertos."
                />
            </section>

            <section className="rounded-lg border border-slate-800 bg-slate-900/60 text-white shadow-inner shadow-black/20">
                <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
                    <h2 className="text-lg font-semibold">Pedidos en vivo</h2>
                    <Chip label={data.length.toString() + " activos"} />
                </header>

                {selectedBranch === null ? (
                    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-400">
                        <LuStore size={40} />
                        <p className="text-sm">
                            Selecciona una sucursal para visualizar los pedidos
                            en vivo.
                        </p>
                    </div>
                ) : data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-400">
                        <FaRegSadTear size={40} />
                        <p className="text-sm">
                            No hay pedidos abiertos actualmente en esta
                            sucursal. Las ventas cerradas se enviarán al
                            historial automáticamente.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 p-6 lg:grid-cols-2">
                        {data.map((entry) => (
                            <article
                                key={entry.sale._id}
                                className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-950/50 p-5 shadow-inner shadow-black/20"
                            >
                                <header className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
                                            {entry.table?.label ??
                                                "Pedido sin mesa"}
                                        </p>
                                        <h3 className="text-xl font-semibold text-white">
                                            {formatCurrency(entry.sale.total)}
                                        </h3>
                                    </div>
                                    <span className="rounded-full border border-[#fa7316]/30 bg-[#fa7316]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-[#fa7316]">
                                        {formatDuration(
                                            entry.sale.openedAt,
                                            Date.now()
                                        )}
                                    </span>
                                </header>

                                <div className="space-y-2 text-sm text-slate-200">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">
                                            Atiende
                                        </span>
                                        <span className="font-semibold">
                                            {entry.sale.staffId
                                                ? (staffNameById.get(
                                                      entry.sale
                                                          .staffId as string
                                                  ) ?? "Personal")
                                                : "Sin asignar"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">
                                            Creado
                                        </span>
                                        <span className="font-semibold">
                                            {formatDateTime(
                                                entry.sale.openedAt
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                                        Productos
                                    </h4>
                                    <ul className="space-y-2 text-sm text-slate-200">
                                        {entry.items.length === 0 ? (
                                            <li className="rounded-lg border border-dashed border-slate-700 px-3 py-2 text-slate-400">
                                                No hay productos aún en este
                                                pedido.
                                            </li>
                                        ) : (
                                            entry.items.map((item) => (
                                                <li
                                                    key={item._id}
                                                    className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2"
                                                >
                                                    <span className="text-slate-300">
                                                        {item.quantity} ×{" "}
                                                        {formatCurrency(
                                                            item.unitPrice
                                                        )}
                                                    </span>
                                                    <span className="font-semibold text-white">
                                                        {formatCurrency(
                                                            item.totalPrice
                                                        )}
                                                    </span>
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                </div>

                                {entry.sale.notes && (
                                    <p className="rounded-lg border border-slate-800/60 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
                                        {entry.sale.notes}
                                    </p>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
};

const SummaryCard = ({
    title,
    value,
    subtitle,
}: {
    title: string;
    value: string;
    subtitle: string;
}) => {
    return (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-white shadow-inner shadow-black/20">
            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
                {title}
            </p>
            <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
            <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
        </div>
    );
};

const methodLabel = (
    method: "Contado" | "Tarjeta" | "Transferencia" | "Otros"
) => {
    switch (method) {
        case "Contado":
            return "Efectivo";
        case "Tarjeta":
            return "Tarjeta";
        case "Transferencia":
            return "Transferencia";
        case "Otros":
        default:
            return "Otro";
    }
};

const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

const SaleCard = ({
    entry,
    branchNameById,
    staffNameById,
    onDocumentClick,
}: {
    entry: HistorySale;
    branchNameById: Map<string, string>;
    staffNameById: Map<string, string>;
    onDocumentClick?: (entry: HistorySale) => void;
}) => {
    const getDocumentTypeLabel = (documentType?: "01" | "03") => {
        if (!documentType) return null;
        return documentType === "01" ? "FACTURA" : "BOLETA";
    };

    return (
        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 transition hover:bg-slate-900/60">
            <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">
                        {formatCurrency(entry.sale.total)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        {formatDate(entry.sale.closedAt ?? entry.sale.openedAt)}{" "}
                        {formatTime(entry.sale.closedAt ?? entry.sale.openedAt)}
                    </p>
                </div>
                <div className="flex-shrink-0">
                    <span className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs font-semibold text-slate-300">
                        {entry.sale.paymentMethod
                            ? methodLabel(entry.sale.paymentMethod)
                            : "No registrado"}
                    </span>
                </div>
            </div>
            <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Sucursal:</span>
                    <p className="text-sm font-medium text-slate-200">
                        {branchNameById.get(entry.sale.branchId as string) ??
                            "Sucursal"}
                    </p>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Mesa:</span>
                    <p className="text-sm font-medium text-slate-300">
                        {entry.table?.label ?? "Sin mesa"}
                    </p>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Atiende:</span>
                    <p className="text-sm font-medium text-slate-300">
                        {entry.sale.staffId
                            ? (staffNameById.get(
                                  entry.sale.staffId as string
                              ) ?? "Personal")
                            : "Sin asignar"}
                    </p>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Documento:</span>
                    {entry.sale.documentId && entry.sale.documentType ? (
                        <button
                            type="button"
                            onClick={() => onDocumentClick?.(entry)}
                            className="text-sm font-medium text-[#fa7316] underline hover:text-[#e86811] transition-colors"
                        >
                            {getDocumentTypeLabel(entry.sale.documentType)}
                        </button>
                    ) : (
                        <p className="text-sm font-medium text-slate-500">
                            SIN DOC
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSales;
