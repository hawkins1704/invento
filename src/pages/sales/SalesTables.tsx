import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import type { ProductListItem } from "../../types/products";
import {
    formatCurrency,
    formatDateTime,
    formatDuration,
} from "../../utils/format";
import {
    fetchPdfBlobFromUrl,
    printPdfBlobInHiddenIframe,
} from "../../utils/pdfPrint";
import { miapiClient } from "../../services/miapi";
import type { GenerarXMLComprobanteRequest, EnviarXMLASUNATResponse } from "../../services/miapi";
import ConfirmDialog from "../../components/ConfirmDialog";
import CloseSaleDialog from "../../components/CloseSaleDialog";
import SalesShiftGuard from "../../components/SalesShiftGuard";
import NewSaleModal from "../../components/NewSaleModal";
import SaleEditorDrawer from "../../components/SaleEditorDrawer";
// import SalesPageHeader from "../../components/sales-page-header/SalesPageHeader";
// import InfoCard from "../../components/InfoCard";
import type { ShiftSummary } from "../../hooks/useSalesShift";
import { MdOutlineDinnerDining } from "react-icons/md";
import { BiDish } from "react-icons/bi";

type LiveSale = {
    sale: Doc<"sales">;
    items: Doc<"saleItems">[];
    table?: Doc<"branchTables"> | null;
    staff?: Doc<"staff"> | null;
};

type SalesTablesContentProps = {
    branch: Doc<"branches">;
    shiftSummary: ShiftSummary;
};

const SalesTablesContent = ({
    branch,
    shiftSummary,
}: SalesTablesContentProps) => {
    const selectedBranchId = branch._id as Id<"branches">;
    const hasActiveShift = Boolean(shiftSummary);
    const [activeTab, setActiveTab] = useState<"mesas" | "pedidos">("mesas");

    const tables = useQuery(
        api.branchTables.list,
        selectedBranchId ? { branchId: selectedBranchId } : "skip"
    ) as Doc<"branchTables">[] | undefined;

    const liveSales = useQuery(
        api.sales.listLiveByBranch,
        selectedBranchId ? { branchId: selectedBranchId } : "skip"
    ) as LiveSale[] | undefined;

    // Necesitamos todos los productos activos para el mapa, usamos un límite alto
    const productsData = useQuery(api.products.list, {
        limit: 1000, // Límite alto para obtener todos los productos
        offset: 0,
        onlyActive: true, // Solo productos activos en el catálogo
    }) as { products: ProductListItem[]; total: number } | undefined;

    const products = productsData?.products;
    const categoriesData = useQuery(api.categories.list, {
        limit: 1000, // Obtener todas las categorías
        offset: 0,
    }) as { categories: Doc<"categories">[]; total: number } | undefined;
    const categories = categoriesData?.categories ?? [];
    const productMap = useMemo(() => {
        const map = new Map<string, ProductListItem>();
        (products ?? []).forEach((product) => {
            map.set(product._id as string, product);
        });
        return map;
    }, [products]);

    const staffData = useQuery(
        api.staff.list,
        selectedBranchId
            ? {
                  branchId: selectedBranchId,
                  includeInactive: false,
                  limit: 1000,
                  offset: 0,
              }
            : { includeInactive: false, limit: 1000, offset: 0 }
    ) as { staff: Doc<"staff">[]; total: number } | undefined;
    const staffMembers = staffData?.staff ?? [];

    const currentUser = useQuery(api.users.getCurrent) as
        | Doc<"users">
        | undefined;

    const createSale = useMutation(api.sales.create);
    const setSaleItems = useMutation(api.sales.setItems);
    const updateSaleDetails = useMutation(api.sales.updateDetails);
    const closeSaleMutation = useMutation(api.sales.close);
    const cancelSaleMutation = useMutation(api.sales.cancel);
    const createCustomer = useMutation(api.customers.create);
    const updateCustomer = useMutation(api.customers.update);
    const updateBranchCorrelativo = useMutation(api.branches.updateCorrelativo);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [tableForNewSale, setTableForNewSale] =
        useState<Doc<"branchTables"> | null>(null);
    const [selectedSaleId, setSelectedSaleId] = useState<Id<"sales"> | null>(
        null
    );
    const [isClosingSale, setIsClosingSale] = useState(false);
    const [isCancellingSale, setIsCancellingSale] = useState(false);
    const [isProcessingClose, setIsProcessingClose] = useState(false);
    const [isProcessingCancel, setIsProcessingCancel] = useState(false);
    const [closeState, setCloseState] = useState<{
        saleId: Id<"sales"> | null;
        saleData: LiveSale | null;
        paymentMethod: "Contado" | "Credito";
        notes: string;
    }>({
        saleId: null,
        saleData: null,
        paymentMethod: "Contado",
        notes: "",
    });

    const [emittedPdfBlob, setEmittedPdfBlob] = useState<Blob | null>(null);
    const [emittedPdfTicketUrl, setEmittedPdfTicketUrl] = useState<string | null>(null);
    const [cancelState, setCancelState] = useState<{
        saleId: Id<"sales"> | null;
        reason: string;
    }>({
        saleId: null,
        reason: "",
    });

    const selectedSale = useMemo(() => {
        if (!selectedSaleId || !liveSales) {
            return null;
        }
        return (
            liveSales.find((entry) => entry.sale._id === selectedSaleId) ?? null
        );
    }, [selectedSaleId, liveSales]);

    useEffect(() => {
        if (selectedSaleId && !selectedSale) {
            setSelectedSaleId(null);
        }
    }, [selectedSale, selectedSaleId]);

    const openCreateModal = (table: Doc<"branchTables"> | null) => {
        if (!hasActiveShift) {
            return;
        }
        setTableForNewSale(table);
        setIsCreateOpen(true);
    };

    const closeCreateModal = () => {
        setTableForNewSale(null);
        setIsCreateOpen(false);
    };

    const openCloseDialog = (saleId: Id<"sales">) => {
        const saleData = liveSales?.find((s) => s.sale._id === saleId) ?? null;
        setCloseState({
            saleId,
            saleData,
            paymentMethod: "Contado",
            notes: "",
        });
        setIsClosingSale(true);
    };

    const openCancelDialog = (saleId: Id<"sales">) => {
        setCancelState({ saleId, reason: "" });
        setIsCancellingSale(true);
    };

    const branchTables = tables ?? [];
    const branchLiveSales = liveSales ?? [];

    // const summary = useMemo(() => {
    //     const list = liveSales ?? [];
    //     return list.reduce(
    //         (accumulator, entry) => {
    //             accumulator.totalSales += 1;
    //             accumulator.totalAmount += entry.sale.total;
    //             return accumulator;
    //         },
    //         { totalSales: 0, totalAmount: 0 }
    //     );
    // }, [liveSales]);

    return (
        <div className="space-y-8">
            {/* <SalesPageHeader title="Mesas y pedidos" /> */}

            {/* <section className="grid gap-4 grid-cols-2 lg:grid-cols-3">
                <InfoCard
                    label="Mesas registradas"
                    value={branchTables.length.toString()}
                    description="Total de mesas configuradas en la sucursal."
                />
                <InfoCard
                    label="Ventas abiertas"
                    value={summary.totalSales.toString()}
                    description="Tickets activos esperando cierre."
                />
                <InfoCard
                    label="Total en curso"
                    value={formatCurrency(summary.totalAmount)}
                    description="Suma de los pedidos abiertos."
                />
            </section> */}

            {/* Tabs Navigation */}
            <div className="border-b border-slate-200 dark:border-slate-800">
                <nav className=" flex space-x-8" aria-label="Tabs">
                    <button
                        type="button"
                        onClick={() => setActiveTab("mesas")}
                        className={`whitespace-nowrap border-b-2 px-1 pb-3 text-md font-semibold transition-colors ${
                            activeTab === "mesas"
                                ? "border-[#fa7316] text-[#fa7316]"
                                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300"
                        }`}
                    >
                        Mesas
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab("pedidos")}
                        className={`whitespace-nowrap border-b-2 px-1 pb-3 text-md font-semibold transition-colors ${
                            activeTab === "pedidos"
                                ? "border-[#fa7316] text-[#fa7316]"
                                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300"
                        }`}
                    >
                        Pedidos abiertos
                        {branchLiveSales.length > 0 && (
                            <span className="ml-2 rounded-full bg-[#fa7316]/10 px-2 py-0.5 text-xs text-[#fa7316]">
                                {branchLiveSales.length}
                            </span>
                        )}
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === "mesas" && (
                <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => openCreateModal(null)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white cursor-pointer"
                        disabled={!hasActiveShift}
                    >
                        Venta sin mesa
                    </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {branchTables.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400 flex-col items-center justify-center">
                            <BiDish className="h-6 w-6 text-slate-400 dark:text-slate-600" />
                            <p className="max-w-sm text-sm">
                                Aún no se han configurado mesas para esta
                                sucursal. Crea mesas desde el panel de
                                administración para asignar pedidos rápidamente.
                            </p>
                        </div>
                    ) : (
                        branchTables.map((table) => {
                            const activeSale = branchLiveSales.find(
                                (entry) =>
                                    entry.sale.tableId &&
                                    entry.sale.tableId === table._id
                            );

                            const isClickable = 
                                table.status !== "out_of_service" && hasActiveShift;

                            return (
                                <article
                                    key={table._id}
                                    onClick={() => {
                                        if (!isClickable) return;
                                        if (activeSale) {
                                            setSelectedSaleId(activeSale.sale._id);
                                        } else {
                                            openCreateModal(table);
                                        }
                                    }}
                                    className={`flex min-h-[280px] flex-col rounded-lg border border-slate-200 bg-slate-50 p-5 text-slate-900 transition-shadow dark:border-slate-800 dark:bg-slate-900/60 dark:text-white ${
                                        isClickable
                                            ? "cursor-pointer hover:shadow-md"
                                            : "cursor-not-allowed opacity-60"
                                    }`}
                                >
                                    {/* Header */}
                                    <header className="mb-4 flex items-start justify-between">
                                        <div>
                                            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                                                {table.label}
                                            </h3>
                                        </div>
                                        {activeSale && (
                                            <span className="text-sm font-medium text-[#fa7316]">
                                                {formatDuration(
                                                    activeSale.sale.openedAt,
                                                    Date.now()
                                                )}
                                            </span>
                                        )}
                                    </header>

                                    {/* Content */}
                                    <div className="mb-4 flex flex-1 flex-col gap-3">
                                        {/* Capacity */}
                                        <div className="text-sm text-slate-600 dark:text-slate-300">
                                            {table.capacity ? (
                                                <p>
                                                    Capacidad:{" "}
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        {table.capacity} personas
                                                    </span>
                                                </p>
                                            ) : (
                                                <p>Capacidad no asignada</p>
                                            )}
                                        </div>

                                        {/* Ticket info if active sale */}
                                        {activeSale && (
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-600 dark:text-slate-300">
                                                        Ticket
                                                    </span>
                                                    <span className="font-semibold text-slate-900 dark:text-white">
                                                        {formatCurrency(
                                                            activeSale.sale.total
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                                                    <span>Abierta</span>
                                                    <span>
                                                        {formatDuration(
                                                            activeSale.sale
                                                                .openedAt,
                                                            Date.now()
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer with button */}
                                    <div className="mt-auto flex justify-end">
                                        {activeSale ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedSaleId(
                                                        activeSale.sale._id
                                                    );
                                                }}
                                                className="rounded-lg bg-[#fa7316] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#fa7316]/90 cursor-pointer"
                                            >
                                                Ver pedido
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    openCreateModal(table);
                                                }}
                                                className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 cursor-pointer"
                                                disabled={
                                                    table.status ===
                                                        "out_of_service" ||
                                                    !hasActiveShift
                                                }
                                            >
                                                Abrir pedido
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>
            </section>
            )}

            {activeTab === "pedidos" && (
                <section className="space-y-4">
                

                {branchLiveSales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                        <MdOutlineDinnerDining size={40} />
                        <p className="text-sm">
                            No hay pedidos abiertos. Abre una mesa o crea una
                            venta rápida para comenzar a registrar pedidos.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                        {branchLiveSales.map((entry) => (
                            <article
                                key={entry.sale._id}
                                onClick={() => setSelectedSaleId(entry.sale._id)}
                                className="flex min-h-[280px] cursor-pointer flex-col rounded-lg border border-slate-200 bg-slate-50 p-5 text-slate-900 transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                            >
                                <header className="mb-4 flex items-start justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                                            {entry.table?.label ??
                                                "Venta sin mesa"}
                                        </p>
                                        <h3 className="text-xl font-semibold">
                                            {formatCurrency(entry.sale.total)}
                                        </h3>
                                    </div>
                                    <span className="text-sm font-medium text-[#fa7316]">
                                        {formatDuration(
                                            entry.sale.openedAt,
                                            Date.now()
                                        )}
                                    </span>
                                </header>

                                <div className="mb-4 flex flex-1 flex-col gap-3">
                                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                        <div className="flex items-center justify-between">
                                            <span>Creada</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {formatDateTime(
                                                    entry.sale.openedAt
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Atiende</span>
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {entry.sale.staffId
                                                    ? (entry.staff?.name ??
                                                      "Personal")
                                                    : "Sin asignar"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                        <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                                            Productos
                                        </h4>
                                        <ul className="space-y-2">
                                            {entry.items.length === 0 ? (
                                                <li className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                                    Pendiente de agregar productos
                                                </li>
                                            ) : (
                                                entry.items.map((item) => {
                                                    const product = productMap.get(
                                                        item.productId as string
                                                    );
                                                    return (
                                                        <li
                                                            key={item._id}
                                                            className="flex items-center justify-between gap-3 rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-950/40"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                                                    {item.productName? item.productName : (product?.name ?? "Producto")}
                                                                </span>
                                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                                    {item.quantity}{" "}
                                                                    ×{" "}
                                                                    {formatCurrency(
                                                                        item.unitPrice
                                                                    )}
                                                                </span>
                                                            </div>
                                                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                                                {formatCurrency(
                                                                    item.totalPrice
                                                                )}
                                                            </span>
                                                        </li>
                                                    );
                                                })
                                            )}
                                        </ul>
                                    </div>
                                </div>

                                <div className="mt-auto flex gap-2">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedSaleId(entry.sale._id);
                                        }}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#fa7316] bg-transparent px-3 py-2 text-sm font-semibold text-[#fa7316] transition hover:bg-[#fa7316]/10 cursor-pointer"
                                    >
                                        Gestionar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openCloseDialog(entry.sale._id);
                                        }}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 cursor-pointer"
                                    >
                                        Concluir
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openCancelDialog(entry.sale._id);
                                        }}
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
            )}

            {isCreateOpen && selectedBranchId && (
                <NewSaleModal
                    branchId={selectedBranchId}
                    table={tableForNewSale}
                    products={products ?? []}
                    categories={categories ?? []}
                    staffMembers={staffMembers ?? []}
                    onClose={closeCreateModal}
                    onCreate={async (payload) => {
                        await createSale(payload);
                        closeCreateModal();
                    }}
                />
            )}

            {selectedSale && selectedBranchId && (
                <SaleEditorDrawer
                    sale={selectedSale}
                    branchId={selectedBranchId}
                    tables={branchTables}
                    products={products ?? []}
                    categories={categories ?? []}
                    staffMembers={staffMembers ?? []}
                    onClose={() => setSelectedSaleId(null)}
                    onSaveItems={async (saleId, items) => {
                        await setSaleItems({ saleId, items });
                    }}
                    onUpdateDetails={async (payload) => {
                        await updateSaleDetails(payload);
                    }}
                    onCloseSale={(saleId, saleData, paymentMethod, notes) => {
                        setCloseState({
                            saleId,
                            saleData,
                            paymentMethod,
                            notes,
                        });
                        setIsClosingSale(true);
                    }}
                    onCancelSale={(saleId) => {
                        setCancelState({ saleId, reason: "" });
                        setIsCancellingSale(true);
                    }}
                />
            )}

            <CloseSaleDialog
                isOpen={isClosingSale}
                saleId={closeState.saleId}
                paymentMethod={closeState.paymentMethod}
                notes={closeState.notes}
                isProcessing={isProcessingClose}
                onPrint={() => {
                    if (!emittedPdfBlob) {
                        return;
                    }
                    printPdfBlobInHiddenIframe(emittedPdfBlob);
                }}
                companyName={currentUser?.companyCommercialName ?? ""}
                pdfTicketUrl={emittedPdfTicketUrl ?? ""}
                onClose={() => {
                    setIsClosingSale(false);
                    setIsProcessingClose(false);
                    setEmittedPdfBlob(null);
                    setEmittedPdfTicketUrl(null);
                    setCloseState({
                        saleId: null,
                        saleData: null,
                        paymentMethod: "Contado",
                        notes: "",
                    });
                    setSelectedSaleId(null);
                }}
                onCloseWithoutEmit={async (
                    customerData,
                    customerMetadata,
                    paymentMethod,
                    notes
                ) => {
                    if (!closeState.saleId) {
                        return {
                            success: false,
                            error: "No hay venta seleccionada",
                        };
                    }
                    setIsProcessingClose(true);
                    try {
                        let customerId: Id<"customers"> | undefined;

                        if (customerData) {
                            // Si el cliente existe en CONVEX y hay cambios, actualizar
                            if (
                                customerMetadata.customerId &&
                                customerMetadata.hasChanges
                            ) {
                                await updateCustomer({
                                    customerId: customerMetadata.customerId,
                                    name: customerData.name,
                                    address: customerData.address || undefined,
                                    email: customerData.email || undefined,
                                    phone: customerData.phone || undefined,
                                });
                                customerId = customerMetadata.customerId;
                            }
                            // Si el cliente existe en CONVEX pero NO hay cambios, usar el ID existente
                            else if (
                                customerMetadata.customerId &&
                                !customerMetadata.hasChanges
                            ) {
                                customerId = customerMetadata.customerId;
                            }
                            // Si el cliente NO existe en CONVEX, crear nuevo cliente
                            else {
                                customerId = await createCustomer({
                                    documentType: customerData.documentType as
                                        | "RUC"
                                        | "DNI",
                                    documentNumber: customerData.documentNumber,
                                    name: customerData.name,
                                    address: customerData.address || undefined,
                                    email: customerData.email || undefined,
                                    phone: customerData.phone || undefined,
                                });
                            }
                        }

                        await closeSaleMutation({
                            saleId: closeState.saleId,
                            paymentMethod,
                            notes,
                            customerId,
                        });
                        // No cerrar el diálogo aquí, dejar que el componente hijo muestre la confirmación
                        // El diálogo se cerrará cuando el usuario haga clic en "CERRAR" después de ver la confirmación
                        setSelectedSaleId(null);
                        return { success: true };
                    } catch (error) {
                        const errorMessage =
                            error instanceof Error
                                ? error.message
                                : "Error al cerrar la venta";
                        return { success: false, error: errorMessage };
                    } finally {
                        setIsProcessingClose(false);
                    }
                }}
                onEmitBoleta={async (
                    customerData,
                    customerMetadata,
                    paymentMethod,
                    notes
                ) => {
                    if (!closeState.saleId || !closeState.saleData) {
                        throw new Error(
                            "No se encontraron los datos de la venta"
                        );
                    }
                    setIsProcessingClose(true);
                    try {
                        let customerId: Id<"customers"> | undefined;

                        if (customerData) {
                            // Si el cliente existe en CONVEX y hay cambios, actualizar
                            if (
                                customerMetadata.customerId &&
                                customerMetadata.hasChanges
                            ) {
                                await updateCustomer({
                                    customerId: customerMetadata.customerId,
                                    name: customerData.name,
                                    address: customerData.address || undefined,
                                    email: customerData.email || undefined,
                                    phone: customerData.phone || undefined,
                                });
                                customerId = customerMetadata.customerId;
                            }
                            // Si el cliente existe en CONVEX pero NO hay cambios, usar el ID existente
                            else if (
                                customerMetadata.customerId &&
                                !customerMetadata.hasChanges
                            ) {
                                customerId = customerMetadata.customerId;
                            }
                            // Si el cliente NO existe en CONVEX, crear nuevo cliente
                            else {
                                customerId = await createCustomer({
                                    documentType: customerData.documentType as
                                        | "RUC"
                                        | "DNI",
                                    documentNumber: customerData.documentNumber,
                                    name: customerData.name,
                                    address: customerData.address || undefined,
                                    email: customerData.email || undefined,
                                    phone: customerData.phone || undefined,
                                });
                            }
                        }

                        // PASO 1: Validar que tenemos los datos necesarios del usuario
                        if (
                            !currentUser?.secretKey ||
                            !currentUser?.ruc ||
                            !currentUser?.currency ||
                            !branch.serieBoleta ||
                            branch.correlativoBoleta === undefined
                        ) {
                            throw new Error(
                                "Faltan datos de configuración: Secret Key, RUC, Currency, Serie Boleta o Correlativo Boleta de la sucursal"
                            );
                        }

                        // PASO 2: Obtener el número correlativo desde la sucursal
                        const correlativoActual = branch.correlativoBoleta || 1;
                        const correlativoStr = String(correlativoActual).padStart(8, "0");

                        // PASO 3: Preparar datos para generar XML
                        const igvPercentage = currentUser.IGVPercentage || 18;
                        const currency = currentUser.currency;

                        // Obtener fecha y hora actual
                        const now = new Date();
                        const fechaEmision = now.toISOString().split("T")[0]; // YYYY-MM-DD
                        const horaEmision = now.toTimeString().slice(0, 8); // HH:mm:ss

                        // Construir items según la nueva estructura
                        const items = closeState.saleData.items.map((item) => {
                            const product = productMap.get(item.productId as string);
                            if (!product) {
                                throw new Error(`Producto con ID ${item.productId} no encontrado`);
                            }

                            // Usar el precio del item (puede ser editado) en lugar del precio del producto
                            const precioConIGV = item.unitPrice;
                            // Calcular unitValue e igv desde el precio con IGV
                            const mtoValorUnitario = precioConIGV / (1 + igvPercentage / 100);
                            const igvUnitario = precioConIGV - mtoValorUnitario;
                            const mtoBaseIgv = mtoValorUnitario * item.quantity;
                            const mtoPrecioUnitario = precioConIGV;
                            const igvTotal = igvUnitario * item.quantity;

                            // Generar código de producto si no existe
                            let codProducto = product.code;
                            if (!codProducto) {
                                // Fallback: usar los últimos 4 caracteres del ID
                                const productIdStr = product._id as string;
                                codProducto = `PR${productIdStr.slice(-4).padStart(4, "0")}`;
                            }

                            const igvRedondeado = Math.round(igvTotal * 100) / 100;
                            return {
                                codProducto,
                                descripcion: item.productName || product.name,
                                unidad: "NIU",
                                cantidad: item.quantity,
                                mtoBaseIgv: Math.round(mtoBaseIgv * 100) / 100,
                                mtoValorUnitario: Math.round(mtoValorUnitario * 100) / 100,
                                mtoPrecioUnitario: Math.round(mtoPrecioUnitario * 100) / 100,
                                codeAfect: "10",
                                igvPorcent: igvPercentage,
                                igv: igvRedondeado,
                            };
                        });

                        // Construir datos del cliente
                        const cliente = customerData
                            ? {
                                  codigoPais: "PE",
                                  tipoDoc: customerData.documentType === "DNI" ? "1" : "6",
                                  numDoc: customerData.documentNumber,
                                  rznSocial: customerData.name,
                                  direccion: customerData.address || "----",
                              }
                            : {
                                  codigoPais: "PE",
                                  tipoDoc: "1",
                                  numDoc: "00000000",
                                  rznSocial: "CLIENTE VARIOS",
                                  direccion: "----",
                              };

                        // PASO 4: Generar XML llamando al servicio del frontend
                        const request: GenerarXMLComprobanteRequest = {
                            claveSecreta: currentUser.secretKey,
                            tipoDoc: "03", // Boleta
                            serie: branch.serieBoleta,
                            correlativo: correlativoStr,
                            observacion: notes || "",
                            fechaEmision,
                            horaEmision,
                            tipoMoneda: currency,
                            tipoPago: paymentMethod,
                            cliente,
                            items,
                        };
                        const xmlResponse = await miapiClient.generarXMLComprobante(request);

                        // PASO 5: Imprimir respuesta de generar XML en consola
                        console.log("Respuesta del endpoint generarXMLComprobante:", xmlResponse);

                        // PASO 6: Enviar XML a SUNAT
                        let sunatResponse: EnviarXMLASUNATResponse | null = null;
                        try {
                            sunatResponse = await miapiClient.enviarXMLASUNAT({
                                claveSecreta: currentUser.secretKey,
                                comprobante: {
                                    tipoDoc: "03", // Boleta
                                    serie: branch.serieBoleta,
                                    correlativo: correlativoStr,
                                },
                            });

                            // PASO 7: Imprimir respuesta de SUNAT en consola
                            console.log("Respuesta del endpoint enviarXMLASUNAT:", sunatResponse);

                            // Verificar si la respuesta es exitosa
                            if (sunatResponse?.respuesta?.success) {
                                // Actualizar el correlativo
                                await updateBranchCorrelativo({
                                    branchId: selectedBranchId,
                                    documentType: "03",
                                    correlativo: correlativoActual + 1,
                                });
                            } else {
                                // Si la respuesta indica error, lanzar excepción con el mensaje
                                const errorMessage = sunatResponse?.respuesta?.mensaje || "Error al enviar XML a SUNAT";
                                throw new Error(errorMessage);
                            }
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : "Error desconocido al enviar XML a SUNAT";
                            console.error("Error al enviar XML a SUNAT:", errorMessage);
                            throw error; // Re-lanzar el error para que se maneje en el catch externo
                        }

                        // Guardar las URLs del documento en la venta (serie y correlativo antes de incrementar)
                        await closeSaleMutation({
                            saleId: closeState.saleId,
                            paymentMethod,
                            notes,
                            customerId,
                            documentType: "03", // Boleta
                            serie: branch.serieBoleta,
                            correlativo: correlativoActual,
                            cdr: sunatResponse?.respuesta?.cdr,
                            pdfA4: sunatResponse?.respuesta?.["pdf-a4"],
                            pdfTicket: sunatResponse?.respuesta?.["pdf-ticket"],
                            xmlFirmado: sunatResponse?.respuesta?.["xml-firmado"],
                            xmlSinFirmar: sunatResponse?.respuesta?.["xml-sin-firmar"],
                        });

                        const pdfTicketUrl = sunatResponse?.respuesta?.["pdf-ticket"];
                        if (pdfTicketUrl) {
                            setEmittedPdfTicketUrl(pdfTicketUrl);
                        }
                        const pdfBlob = pdfTicketUrl
                            ? await fetchPdfBlobFromUrl(pdfTicketUrl)
                            : null;
                        if (pdfBlob) {
                            setEmittedPdfBlob(pdfBlob);
                        }

                        // Retornar éxito
                        return {
                            success: true,
                        };
                    } catch (error) {
                        console.error("Error al emitir boleta:", error);
                        const errorMessage =
                            error instanceof Error
                                ? error.message
                                : "Error al emitir boleta";
                        return {
                            success: false,
                            error: errorMessage,
                        };
                    } finally {
                        setIsProcessingClose(false);
                    }
                }}
                onEmitFactura={async (
                    customerData,
                    customerMetadata,
                    paymentMethod,
                    notes
                ) => {
                    if (!closeState.saleId || !closeState.saleData) {
                        throw new Error(
                            "No se encontraron los datos de la venta"
                        );
                    }
                    setIsProcessingClose(true);
                    try {
                        let customerId: Id<"customers">;

                        // Si el cliente existe en CONVEX y hay cambios, actualizar
                        if (
                            customerMetadata.customerId &&
                            customerMetadata.hasChanges
                        ) {
                            await updateCustomer({
                                customerId: customerMetadata.customerId,
                                name: customerData.name,
                                address: customerData.address || undefined,
                                email: customerData.email || undefined,
                                phone: customerData.phone || undefined,
                            });
                            customerId = customerMetadata.customerId;
                        }
                        // Si el cliente existe en CONVEX pero NO hay cambios, usar el ID existente
                        else if (
                            customerMetadata.customerId &&
                            !customerMetadata.hasChanges
                        ) {
                            customerId = customerMetadata.customerId;
                        }
                        // Si el cliente NO existe en CONVEX, crear nuevo cliente
                        else {
                            customerId = await createCustomer({
                                documentType: customerData.documentType as
                                    | "RUC"
                                    | "DNI",
                                documentNumber: customerData.documentNumber,
                                name: customerData.name,
                                address: customerData.address || undefined,
                                email: customerData.email || undefined,
                                phone: customerData.phone || undefined,
                            });
                        }

                        // PASO 1: Validar que tenemos los datos necesarios del usuario
                        if (
                            !currentUser?.secretKey ||
                            !currentUser?.ruc ||
                            !currentUser?.currency ||
                            !branch.serieFactura ||
                            branch.correlativoFactura === undefined
                        ) {
                            throw new Error(
                                "Faltan datos de configuración: Secret Key, RUC, Currency, Serie Factura o Correlativo Factura de la sucursal"
                            );
                        }

                        // PASO 2: Obtener el número correlativo desde la sucursal
                        const correlativoActual = branch.correlativoFactura || 1;
                        const correlativoStr = String(correlativoActual).padStart(8, "0");

                        // PASO 3: Preparar datos para generar XML
                        const igvPercentage = currentUser.IGVPercentage || 18;
                        const currency = currentUser.currency;

                        // Obtener fecha y hora actual
                        const now = new Date();
                        const fechaEmision = now.toISOString().split("T")[0]; // YYYY-MM-DD
                        const horaEmision = now.toTimeString().slice(0, 8); // HH:mm:ss

                        // Construir items según la nueva estructura
                        const items = closeState.saleData.items.map((item) => {
                            const product = productMap.get(item.productId as string);
                            if (!product) {
                                throw new Error(`Producto con ID ${item.productId} no encontrado`);
                            }

                            // Usar el precio del item (puede ser editado) en lugar del precio del producto
                            const precioConIGV = item.unitPrice;
                            // Calcular unitValue e igv desde el precio con IGV
                            const mtoValorUnitario = precioConIGV / (1 + igvPercentage / 100);
                            const igvUnitario = precioConIGV - mtoValorUnitario;
                            const mtoBaseIgv = mtoValorUnitario * item.quantity;
                            const mtoPrecioUnitario = precioConIGV;
                            const igvTotal = igvUnitario * item.quantity;

                            // Generar código de producto si no existe
                            let codProducto = product.code;
                            if (!codProducto) {
                                // Fallback: usar los últimos 4 caracteres del ID
                                const productIdStr = product._id as string;
                                codProducto = `PR${productIdStr.slice(-4).padStart(4, "0")}`;
                            }

                            const igvRedondeado = Math.round(igvTotal * 100) / 100;
                            return {
                                codProducto,
                                descripcion: item.productName || product.name,
                                unidad: "NIU",
                                cantidad: item.quantity,
                                mtoBaseIgv: Math.round(mtoBaseIgv * 100) / 100,
                                mtoValorUnitario: Math.round(mtoValorUnitario * 100) / 100,
                                mtoPrecioUnitario: Math.round(mtoPrecioUnitario * 100) / 100,
                                codeAfect: "10",
                                igvPorcent: igvPercentage,
                                igv: igvRedondeado,
                            };
                        });

                        // Construir datos del cliente (obligatorio para factura)
                        const cliente = {
                            codigoPais: "PE",
                            tipoDoc: customerData.documentType === "DNI" ? "1" : "6",
                            numDoc: customerData.documentNumber,
                            rznSocial: customerData.name,
                            direccion: customerData.address || "----",
                        };

                        // PASO 4: Generar XML llamando al servicio del frontend
                        const request: GenerarXMLComprobanteRequest = {
                            claveSecreta: currentUser.secretKey,
                            tipoDoc: "01", // Factura
                            serie: branch.serieFactura,
                            correlativo: correlativoStr,
                            observacion: notes || "",
                            fechaEmision,
                            horaEmision,
                            tipoMoneda: currency,
                            tipoPago: paymentMethod,
                            cliente,
                            items,
                        };
                        const xmlResponse = await miapiClient.generarXMLComprobante(request);

                        // PASO 5: Imprimir respuesta de generar XML en consola
                        console.log("Respuesta del endpoint generarXMLComprobante:", xmlResponse);

                        // PASO 6: Enviar XML a SUNAT
                        let sunatResponse: EnviarXMLASUNATResponse | null = null;
                        try {
                            sunatResponse = await miapiClient.enviarXMLASUNAT({
                                claveSecreta: currentUser.secretKey,
                                comprobante: {
                                    tipoDoc: "01", // Factura
                                    serie: branch.serieFactura,
                                    correlativo: correlativoStr,
                                },
                            });

                            // PASO 7: Imprimir respuesta de SUNAT en consola
                            console.log("Respuesta del endpoint enviarXMLASUNAT:", sunatResponse);

                            // Verificar si la respuesta es exitosa
                            if (sunatResponse?.respuesta?.success) {
                                // Actualizar el correlativo
                                await updateBranchCorrelativo({
                                    branchId: selectedBranchId,
                                    documentType: "01",
                                    correlativo: correlativoActual + 1,
                                });
                            } else {
                                // Si la respuesta indica error, lanzar excepción con el mensaje
                                const errorMessage = sunatResponse?.respuesta?.mensaje || "Error al enviar XML a SUNAT";
                                throw new Error(errorMessage);
                            }
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : "Error desconocido al enviar XML a SUNAT";
                            console.error("Error al enviar XML a SUNAT:", errorMessage);
                            throw error; // Re-lanzar el error para que se maneje en el catch externo
                        }

                        // Guardar las URLs del documento en la venta (serie y correlativo antes de incrementar)
                        await closeSaleMutation({
                            saleId: closeState.saleId,
                            paymentMethod,
                            notes,
                            customerId,
                            documentType: "01", // Factura
                            serie: branch.serieFactura,
                            correlativo: correlativoActual,
                            cdr: sunatResponse?.respuesta?.cdr,
                            pdfA4: sunatResponse?.respuesta?.["pdf-a4"],
                            pdfTicket: sunatResponse?.respuesta?.["pdf-ticket"],
                            xmlFirmado: sunatResponse?.respuesta?.["xml-firmado"],
                            xmlSinFirmar: sunatResponse?.respuesta?.["xml-sin-firmar"],
                        });

                        const pdfTicketUrl = sunatResponse?.respuesta?.["pdf-ticket"];
                        if (pdfTicketUrl) {
                            setEmittedPdfTicketUrl(pdfTicketUrl);
                        }
                        const pdfBlob = pdfTicketUrl
                            ? await fetchPdfBlobFromUrl(pdfTicketUrl)
                            : null;
                        if (pdfBlob) {
                            setEmittedPdfBlob(pdfBlob);
                        }

                        // Retornar éxito
                        return {
                            success: true,
                        };
                    } catch (error) {
                        console.error("Error al emitir factura:", error);
                        const errorMessage =
                            error instanceof Error
                                ? error.message
                                : "Error al emitir factura";
                        return {
                            success: false,
                            error: errorMessage,
                        };
                    } finally {
                        setIsProcessingClose(false);
                    }
                }}
            />

            <ConfirmDialog
                isOpen={isCancellingSale}
                title="Cancelar venta"
                tone="danger"
                description={
                    <div className="space-y-3">
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                            Cancela la venta seleccionada. No se descontará
                            inventario, pero se registrará la cancelación para
                            auditoría.
                        </p>
                        <label className="flex flex-col gap-1 text-left text-slate-700 dark:text-slate-200">
                            <span className="text-xs uppercase tracking-[0.1em] text-slate-500">
                                Motivo (opcional)
                            </span>
                            <textarea
                                value={cancelState.reason}
                                onChange={(event) =>
                                    setCancelState((previous) => ({
                                        ...previous,
                                        reason: event.target.value,
                                    }))
                                }
                                rows={3}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                placeholder="Describe el motivo de la cancelación"
                            />
                        </label>
                    </div>
                }
                confirmLabel="Cancelar venta"
                isConfirming={isProcessingCancel}
                onCancel={() => {
                    setIsCancellingSale(false);
                    setIsProcessingCancel(false);
                }}
                onConfirm={async () => {
                    if (!cancelState.saleId) {
                        setIsCancellingSale(false);
                        return;
                    }
                    setIsProcessingCancel(true);
                    try {
                        await cancelSaleMutation({
                            saleId: cancelState.saleId,
                            reason: cancelState.reason
                                ? cancelState.reason.trim()
                                : undefined,
                        });
                        setIsCancellingSale(false);
                        setCancelState({ saleId: null, reason: "" });
                        setSelectedSaleId(null);
                    } finally {
                        setIsProcessingCancel(false);
                    }
                }}
            />
        </div>
    );
};

const SalesTables = () => (
    <SalesShiftGuard>
        {({ branch, activeShift }) => (
            <SalesTablesContent branch={branch} shiftSummary={activeShift} />
        )}
    </SalesShiftGuard>
);

export default SalesTables;
