/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import type { ProductListItem } from "../../types/products";
import {
    formatCurrency,
    formatDateTime,
    formatDuration,
    buildSunatFileName,
} from "../../utils/format";
import { buildDocumentBody } from "../../utils/sunat";
import { useAPISUNAT } from "../../hooks/useAPISUNAT";
import ConfirmDialog from "../../components/ConfirmDialog";
import CloseSaleDialog from "../../components/CloseSaleDialog";
import SalesShiftGuard from "../../components/SalesShiftGuard";
import NewSaleModal from "../../components/NewSaleModal";
import SaleEditorDrawer from "../../components/SaleEditorDrawer";
import SalesPageHeader from "../../components/sales-page-header/SalesPageHeader";
import InfoCard from "../../components/InfoCard";
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

    const tables = useQuery(
        api.branchTables.list,
        selectedBranchId ? { branchId: selectedBranchId } : "skip"
    ) as Doc<"branchTables">[] | undefined;

    const liveSales = useQuery(
        api.sales.listLiveByBranch,
        selectedBranchId ? { branchId: selectedBranchId } : "skip"
    ) as LiveSale[] | undefined;

    // Necesitamos todos los productos para el mapa, usamos un límite alto
    const productsData = useQuery(api.products.list, {
        limit: 1000, // Límite alto para obtener todos los productos
        offset: 0,
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
    const updateSaleDocumentId = useMutation(api.sales.updateDocumentId);
    const { getLastDocument, emitDocument, downloadPDF } = useAPISUNAT();

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
        paymentMethod: "Contado" | "Tarjeta" | "Transferencia" | "Otros";
        notes: string;
    }>({
        saleId: null,
        saleData: null,
        paymentMethod: "Contado",
        notes: "",
    });
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

    const summary = useMemo(() => {
        const list = liveSales ?? [];
        return list.reduce(
            (accumulator, entry) => {
                accumulator.totalSales += 1;
                accumulator.totalAmount += entry.sale.total;
                return accumulator;
            },
            { totalSales: 0, totalAmount: 0 }
        );
    }, [liveSales]);

    return (
        <div className="space-y-8">
            <SalesPageHeader title="Mesas y pedidos" />

            <section className="grid gap-4 grid-cols-2 lg:grid-cols-3">
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
            </section>

            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Mesas</h2>
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
                            return (
                                <article
                                    key={table._id}
                                    className={`flex flex-col gap-4 rounded-lg border p-5 text-slate-900 dark:text-white ${
                                        activeSale
                                            ? "border-[#fa7316]/50 bg-[#fa7316]/10"
                                            : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60"
                                    }`}
                                >
                                    <header className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                                                Mesa
                                            </p>
                                            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">
                                                {table.label}
                                            </h3>
                                        </div>
                                        <StatusBadge
                                            status={table.status ?? "available"}
                                        />
                                    </header>

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

                                    {activeSale ? (
                                        <div className="space-y-2 rounded-lg border border-[#fa7316]/40 bg-[#fa7316]/10 p-4 text-sm text-slate-700 dark:text-slate-200">
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
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setSelectedSaleId(
                                                        activeSale.sale._id
                                                    )
                                                }
                                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#fa7316]/10 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-[#fa7316]/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 cursor-pointer"
                                            >
                                                Ver pedido
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openCreateModal(table)
                                            }
                                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white cursor-pointer"
                                            disabled={
                                                table.status ===
                                                    "out_of_service" ||
                                                !hasActiveShift
                                            }
                                        >
                                            Abrir pedido
                                        </button>
                                    )}
                                </article>
                            );
                        })
                    )}
                </div>
            </section>

            <section className="space-y-4">
                <header className="flex items-center justify-between text-slate-900 dark:text-white">
                    <h2 className="text-lg font-semibold">Pedidos abiertos</h2>
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.1em] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 font-semibold">
                        {branchLiveSales.length} activos
                    </span>
                </header>

                {branchLiveSales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                        <MdOutlineDinnerDining size={40} />
                        <p className="text-sm">
                            No hay pedidos abiertos. Abre una mesa o crea una
                            venta rápida para comenzar a registrar pedidos.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {branchLiveSales.map((entry) => (
                            <article
                                key={entry.sale._id}
                                className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5 text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white"
                            >
                                <header className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                                            {entry.table?.label ??
                                                "Venta sin mesa"}
                                        </p>
                                        <h3 className="text-xl font-semibold">
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

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSelectedSaleId(entry.sale._id)
                                        }
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white/20 dark:text-white cursor-pointer border border-slate-300 dark:border-slate-700"
                                    >
                                        Gestionar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openCloseDialog(entry.sale._id)
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/50 px-3 py-2 text-sm font-semibold text-emerald-600 transition hover:border-emerald-600 hover:text-emerald-700 dark:text-emerald-300 dark:hover:border-emerald-400 dark:hover:text-emerald-200 cursor-pointer"
                                    >
                                        Concluir
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openCancelDialog(entry.sale._id)
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-600 transition hover:border-red-600 hover:text-red-700 dark:text-red-300 dark:hover:border-red-400 dark:hover:text-red-200 cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

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
                onClose={() => {
                    setIsClosingSale(false);
                    setIsProcessingClose(false);
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
                    notes,
                    customerEmail
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
                            !currentUser?.personaId ||
                            !currentUser?.personaToken ||
                            !currentUser?.ruc ||
                            !branch.serieBoleta
                        ) {
                            throw new Error(
                                "Faltan datos de configuración: Persona ID, Persona Token, RUC o Serie Boleta de la sucursal"
                            );
                        }

                        // PASO 2: Obtener el número correlativo desde SUNAT
                        const lastDocResponse = await getLastDocument({
                            personaId: currentUser.personaId,
                            personaToken: currentUser.personaToken,
                            type: "03", // Boleta
                            serie: branch.serieBoleta,
                        });

                        if (!lastDocResponse) {
                            throw new Error(
                                "No se pudo obtener el número correlativo desde SUNAT"
                            );
                        }

                        // PASO 3: Construir el fileName
                        const fileName = buildSunatFileName(
                            currentUser.ruc,
                            "03", // Boleta
                            branch.serieBoleta,
                            lastDocResponse.suggestedNumber
                        );

                        // PASO 4 - Construir documentBody (estructura UBL completa)
                        // Crear mapeo de productos con información completa (productId -> {name, unitValue, igv})
                        const productsMap = new Map<
                            string,
                            { name: string; unitValue: number; igv: number }
                        >();
                        (products ?? []).forEach((product) => {
                            if (
                                product.unitValue !== undefined &&
                                product.igv !== undefined
                            ) {
                                productsMap.set(product._id as string, {
                                    name: product.name,
                                    unitValue: product.unitValue,
                                    igv: product.igv,
                                });
                            }
                        });

                        const documentBody = buildDocumentBody({
                            documentType: "03", // Boleta
                            serie: branch.serieBoleta,
                            correlativo: lastDocResponse.suggestedNumber,
                            saleData: {
                                sale: {
                                    total: closeState.saleData.sale.total,
                                },
                                items: closeState.saleData.items.map(
                                    (item) => ({
                                        productId: item.productId as string,
                                        productName: item.productName,
                                        quantity: item.quantity,
                                        unitPrice: item.unitPrice,
                                    })
                                ),
                            },
                            customerData: customerData
                                ? {
                                      documentType:
                                          customerData.documentType as
                                              | "RUC"
                                              | "DNI",
                                      documentNumber:
                                          customerData.documentNumber,
                                      name: customerData.name,
                                      address:
                                          customerData.address || undefined,
                                  }
                                : null,
                            userData: {
                                ruc: currentUser.ruc!,
                                companyName: currentUser.companyName,
                                companyCommercialName:
                                    currentUser.companyCommercialName,
                                companyAddress: currentUser.companyAddress,
                                companyDistrict: currentUser.companyDistrict,
                                companyProvince: currentUser.companyProvince,
                                companyDepartment:
                                    currentUser.companyDepartment,
                                IGVPercentage: currentUser.IGVPercentage || 18,
                            },
                            products: productsMap,
                            notes: notes,
                        });

                        // PASO 5 - customerEmail ya viene del formulario (opcional)
                        // Si el usuario marcó "Enviar comprobante por correo" y hay email, se pasa al endpoint
                        // Si no se marca el checkbox o no hay email, customerEmail será undefined

                        // PASO 6 - Emitir el documento a SUNAT
                        const emitResponse = await emitDocument({
                            personaId: currentUser.personaId,
                            personaToken: currentUser.personaToken,
                            fileName,
                            documentBody,
                            ...(customerEmail && { customerEmail }),
                        });

                        if (!emitResponse) {
                            throw new Error(
                                "Error al emitir documento en SUNAT"
                            );
                        }

                        // PASO 7 - Guardar el documentId en la venta
                        await updateSaleDocumentId({
                            saleId: closeState.saleId,
                            documentId: emitResponse.documentId,
                        });

                        // console.log("fileName generado:", fileName);
                        console.log(
                            "saleData disponible:",
                            closeState.saleData
                        );
                        // console.log("documentBody:", documentBody);
                        console.log(
                            "customerEmail:",
                            customerEmail || "No se enviará correo"
                        );
                        // console.log("Documento emitido:", emitResponse);

                        await closeSaleMutation({
                            saleId: closeState.saleId,
                            paymentMethod,
                            notes,
                            customerId,
                            documentType: "03", // Boleta
                        });

                        // Retornar éxito con documentId y fileName
                        return {
                            success: true,
                            documentId: emitResponse.documentId,
                            fileName: fileName,
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
                    notes,
                    customerEmail
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
                            !currentUser?.personaId ||
                            !currentUser?.personaToken ||
                            !currentUser?.ruc ||
                            !branch.serieFactura
                        ) {
                            throw new Error(
                                "Faltan datos de configuración: Persona ID, Persona Token, RUC o Serie Factura de la sucursal"
                            );
                        }

                        // PASO 2: Obtener el número correlativo desde SUNAT
                        const lastDocResponse = await getLastDocument({
                            personaId: currentUser.personaId,
                            personaToken: currentUser.personaToken,
                            type: "01", // Factura
                            serie: branch.serieFactura,
                        });

                        if (!lastDocResponse) {
                            throw new Error(
                                "No se pudo obtener el número correlativo desde SUNAT"
                            );
                        }

                        // PASO 3: Construir el fileName
                        const fileName = buildSunatFileName(
                            currentUser.ruc,
                            "01", // Factura
                            branch.serieFactura,
                            lastDocResponse.suggestedNumber
                        );

                        // PASO 4 - Construir documentBody (estructura UBL completa)
                        // Crear mapeo de productos con información completa (productId -> {name, unitValue, igv})
                        const productsMap = new Map<
                            string,
                            { name: string; unitValue: number; igv: number }
                        >();
                        (products ?? []).forEach((product) => {
                            if (
                                product.unitValue !== undefined &&
                                product.igv !== undefined
                            ) {
                                productsMap.set(product._id as string, {
                                    name: product.name,
                                    unitValue: product.unitValue,
                                    igv: product.igv,
                                });
                            }
                        });

                        const documentBody = buildDocumentBody({
                            documentType: "01", // Factura
                            serie: branch.serieFactura,
                            correlativo: lastDocResponse.suggestedNumber,
                            saleData: {
                                sale: {
                                    total: closeState.saleData.sale.total,
                                },
                                items: closeState.saleData.items.map(
                                    (item) => ({
                                        productId: item.productId as string,
                                        productName: item.productName,
                                        quantity: item.quantity,
                                        unitPrice: item.unitPrice,
                                    })
                                ),
                            },
                            customerData: {
                                documentType: customerData.documentType as
                                    | "RUC"
                                    | "DNI",
                                documentNumber: customerData.documentNumber,
                                name: customerData.name,
                                address: customerData.address || undefined,
                            },
                            userData: {
                                ruc: currentUser.ruc!,
                                companyName: currentUser.companyName,
                                companyCommercialName:
                                    currentUser.companyCommercialName,
                                companyAddress: currentUser.companyAddress,
                                companyDistrict: currentUser.companyDistrict,
                                companyProvince: currentUser.companyProvince,
                                companyDepartment:
                                    currentUser.companyDepartment,
                                IGVPercentage: currentUser.IGVPercentage || 18,
                            },
                            products: productsMap,
                            paymentMethod: paymentMethod,
                            notes: notes,
                        });

                        // PASO 5 - customerEmail ya viene del formulario (opcional)
                        // Si el usuario marcó "Enviar comprobante por correo" y hay email, se pasa al endpoint
                        // Si no se marca el checkbox o no hay email, customerEmail será undefined

                        // PASO 6 - Emitir el documento a SUNAT
                        const emitResponse = await emitDocument({
                            personaId: currentUser.personaId,
                            personaToken: currentUser.personaToken,
                            fileName,
                            documentBody,
                            ...(customerEmail && { customerEmail }),
                        });

                        if (!emitResponse) {
                            throw new Error(
                                "Error al emitir documento en SUNAT"
                            );
                        }

                        // PASO 7 - Guardar el documentId en la venta
                        await updateSaleDocumentId({
                            saleId: closeState.saleId,
                            documentId: emitResponse.documentId,
                        });

                        // console.log("fileName generado:", fileName);
                        console.log(
                            "saleData disponible:",
                            closeState.saleData
                        );
                        // console.log("documentBody:", documentBody);
                        console.log(
                            "customerEmail:",
                            customerEmail || "No se enviará correo"
                        );
                        // console.log("Documento emitido:", emitResponse);

                        await closeSaleMutation({
                            saleId: closeState.saleId,
                            paymentMethod,
                            notes,
                            customerId,
                            documentType: "01", // Factura
                        });

                        // Retornar éxito con documentId y fileName
                        return {
                            success: true,
                            documentId: emitResponse.documentId,
                            fileName: fileName,
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
                onDownloadPDF={async (documentId: string, fileName: string) => {
                    try {
                        // Usar el formato del usuario o A4 por defecto
                        const format =
                            (currentUser as any)?.printFormat || "A4";
                        await downloadPDF(
                            documentId,
                            format as "A4" | "A5" | "ticket58mm" | "ticket80mm",
                            fileName
                        );
                    } catch (error) {
                        console.error("Error al abrir PDF:", error);
                        alert(
                            error instanceof Error
                                ? error.message
                                : "Error al abrir el PDF"
                        );
                    }
                }}
                onSendPDFToWhatsapp={async (
                    phoneNumber: string,
                    documentId: string,
                    fileName: string
                ) => {
                    try {
                        // Usar el formato del usuario o A4 por defecto
                        const format =
                            (currentUser as any)?.printFormat || "A4";

                        // Construir la URL del PDF (misma lógica que downloadPDF)
                        const fileNameWithExtension = fileName.endsWith(".pdf")
                            ? fileName
                            : `${fileName}.pdf`;
                        const baseUrl =
                            import.meta.env.VITE_APISUNAT_BASE_URL as string;
                        const pdfUrl = `${baseUrl}/documents/${documentId}/getPDF/${format}/${fileNameWithExtension}`;
                        console.log("pdfUrl:", pdfUrl);
                        // Formatear el número de teléfono (solo números, sin espacios ni caracteres especiales)
                        const cleanPhone = phoneNumber.replace(/\D/g, "");

                        // Construir el mensaje con el link del PDF
                        const message = `Hola, te comparto tu comprobante de pago:\n${pdfUrl}`;

                        // Codificar el mensaje para URL
                        const encodedMessage = encodeURIComponent(message);

                        // Construir la URL de WhatsApp
                        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;

                        // Abrir WhatsApp en una nueva pestaña
                        window.open(whatsappUrl, "_blank");

                        return { success: true };
                    } catch (error) {
                        console.error("Error al enviar por WhatsApp:", error);
                        const errorMessage =
                            error instanceof Error
                                ? error.message
                                : "Error al enviar por WhatsApp";
                        return { success: false, error: errorMessage };
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

const StatusBadge = ({
    status,
}: {
    status: "available" | "occupied" | "reserved" | "out_of_service";
}) => {
    const config: Record<typeof status, { label: string; className: string }> =
        {
            available: {
                label: "Disponible",
                className:
                    "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
            },
            occupied: {
                label: "Ocupada",
                className: "border-[#fa7316]/40 bg-[#fa7316]/10 text-[#fa7316]",
            },
            reserved: {
                label: "Reservada",
                className: "border-sky-500/40 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200",
            },
            out_of_service: {
                label: "Fuera de servicio",
                className: "border-red-500/40 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200",
            },
        };

    const entry = config[status];

    return (
        <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${entry.className}`}
        >
            {entry.label}
        </span>
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
