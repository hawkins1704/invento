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
import type { ShiftSummary } from "../../hooks/useSalesShift";
import { MdDeleteOutline, MdOutlineDinnerDining } from "react-icons/md";
import { FaRegEdit } from "react-icons/fa";
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io";
import { BiDish } from "react-icons/bi";
import CloseButton from "../../components/CloseButton";
import { IoMdAdd, IoMdRemove } from "react-icons/io";
import { FaMagnifyingGlass } from "react-icons/fa6";

type LiveSale = {
    sale: Doc<"sales">;
    items: Doc<"saleItems">[];
    table?: Doc<"branchTables"> | null;
    staff?: Doc<"staff"> | null;
};

type EditableItem = {
    productId: Id<"products">;
    productName: string;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
    discountAmount: number;
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
            <header className="flex flex-col gap-6 rounded-lg border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold">
                            Mesas y pedidos
                        </h1>
                    </div>
                </div>
            </header>

            <section className="grid gap-4 lg:grid-cols-3">
                <SummaryCard
                    title="Mesas registradas"
                    value={branchTables.length.toString()}
                    subtitle="Total de mesas configuradas en la sucursal."
                />
                <SummaryCard
                    title="Ventas abiertas"
                    value={summary.totalSales.toString()}
                    subtitle="Tickets activos esperando cierre."
                />
                <SummaryCard
                    title="Total en curso"
                    value={formatCurrency(summary.totalAmount)}
                    subtitle="Suma de los pedidos abiertos."
                />
            </section>

            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Mesas</h2>
                    <button
                        type="button"
                        onClick={() => openCreateModal(null)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#fa7316] hover:text-white cursor-pointer"
                        disabled={!hasActiveShift}
                    >
                        Venta sin mesa
                    </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {branchTables.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-800 bg-slate-950/50 p-12 text-center text-slate-400 flex-col items-center justify-center">
                            <BiDish className="h-6 w-6 text-slate-600" />
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
                                    className={`flex flex-col gap-4 rounded-lg border p-5 text-white shadow-inner shadow-black/20 ${
                                        activeSale
                                            ? "border-[#fa7316]/50 bg-[#fa7316]/10"
                                            : "border-slate-800 bg-slate-900/60"
                                    }`}
                                >
                                    <header className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.1em] text-slate-400">
                                                Mesa
                                            </p>
                                            <h3 className="text-2xl font-semibold text-white">
                                                {table.label}
                                            </h3>
                                        </div>
                                        <StatusBadge
                                            status={table.status ?? "available"}
                                        />
                                    </header>

                                    <div className="text-sm text-slate-300">
                                        {table.capacity ? (
                                            <p>
                                                Capacidad:{" "}
                                                <span className="font-semibold text-white">
                                                    {table.capacity} personas
                                                </span>
                                            </p>
                                        ) : (
                                            <p>Capacidad no asignada</p>
                                        )}
                                    </div>

                                    {activeSale ? (
                                        <div className="space-y-2 rounded-lg border border-[#fa7316]/40 bg-[#fa7316]/10 p-4 text-sm text-slate-200">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-300">
                                                    Ticket
                                                </span>
                                                <span className="font-semibold text-white">
                                                    {formatCurrency(
                                                        activeSale.sale.total
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-slate-300">
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
                                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 cursor-pointer"
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
                                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#fa7316] hover:text-white cursor-pointer"
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
                <header className="flex items-center justify-between text-white">
                    <h2 className="text-lg font-semibold">Pedidos abiertos</h2>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.1em] text-slate-300">
                        {branchLiveSales.length} activos
                    </span>
                </header>

                {branchLiveSales.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-400">
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
                                className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-5 text-white shadow-inner shadow-black/20"
                            >
                                <header className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.1em] text-slate-400">
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

                                <div className="space-y-2 text-sm text-slate-300">
                                    <div className="flex items-center justify-between">
                                        <span>Creada</span>
                                        <span className="font-semibold text-white">
                                            {formatDateTime(
                                                entry.sale.openedAt
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Atiende</span>
                                        <span className="font-semibold text-white">
                                            {entry.sale.staffId
                                                ? (entry.staff?.name ??
                                                  "Personal")
                                                : "Sin asignar"}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm text-slate-200">
                                    <h4 className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                                        Productos
                                    </h4>
                                    <ul className="space-y-2">
                                        {entry.items.length === 0 ? (
                                            <li className="rounded-lg border border-dashed border-slate-700 px-3 py-2 text-slate-400">
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
                                                        className="flex items-center justify-between gap-3 rounded-lg bg-slate-950/40 px-3 py-2"
                                                    >
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-white">
                                                                {product?.name ??
                                                                    "Producto"}
                                                            </span>
                                                            <span className="text-xs text-slate-400">
                                                                {item.quantity}{" "}
                                                                ×{" "}
                                                                {formatCurrency(
                                                                    item.unitPrice
                                                                )}
                                                            </span>
                                                        </div>
                                                        <span className="text-sm font-semibold text-white">
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
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20 cursor-pointer"
                                    >
                                        Gestionar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openCloseDialog(entry.sale._id)
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/50 px-3 py-2 text-sm font-semibold text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200 cursor-pointer"
                                    >
                                        Concluir
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            openCancelDialog(entry.sale._id)
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-300 transition hover:border-red-400 hover:text-red-200 cursor-pointer"
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
                                        quantity: item.quantity,
                                        unitPrice: item.unitPrice,
                                        discountAmount: item.discountAmount,
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
                                        quantity: item.quantity,
                                        unitPrice: item.unitPrice,
                                        discountAmount: item.discountAmount,
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
            />

            <ConfirmDialog
                isOpen={isCancellingSale}
                title="Cancelar venta"
                tone="danger"
                description={
                    <div className="space-y-3">
                        <p className="text-sm text-slate-200">
                            Cancela la venta seleccionada. No se descontará
                            inventario, pero se registrará la cancelación para
                            auditoría.
                        </p>
                        <label className="flex flex-col gap-1 text-left text-slate-200">
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
                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
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

const NewSaleModal = ({
    branchId,
    table,
    products,
    categories,
    staffMembers,
    onClose,
    onCreate,
}: {
    branchId: Id<"branches">;
    table: Doc<"branchTables"> | null;
    products: ProductListItem[];
    categories: Doc<"categories">[];
    staffMembers: Doc<"staff">[];
    onClose: () => void;
    onCreate: (payload: {
        branchId: Id<"branches">;
        tableId?: Id<"branchTables">;
        staffId?: Id<"staff">;
        notes?: string;
        items?: Array<{
            productId: Id<"products">;
            quantity: number;
            unitPrice: number;
            discountAmount?: number;
            notes?: string;
        }>;
    }) => Promise<void>;
}) => {
    const [isClosing, setIsClosing] = useState(false);
    const [staffId, setStaffId] = useState<Id<"staff"> | "">("");

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300); // Esperar a que termine la animación (300ms)
    };
    const [notes, setNotes] = useState("");
    const [search, setSearch] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
    const [items, setItems] = useState<EditableItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingItemId, setEditingItemId] = useState<Id<"products"> | null>(
        null
    );
    const categoryOptions = useMemo(
        () => [
            { key: "all", label: "Todos" },
            ...categories.map((category) => ({
                key: category._id as string,
                label: category.name,
            })),
        ],
        [categories]
    );

    const availableProducts = useMemo(() => {
        const query = search.trim().toLowerCase();
        return products.filter((product) => {
            const matchesSearch = product.name.toLowerCase().includes(query);
            const matchesCategory =
                selectedCategoryId === "all" ||
                (product.categoryId as unknown as string) ===
                    selectedCategoryId;
            return matchesSearch && matchesCategory;
        });
    }, [products, search, selectedCategoryId]);

    const editingItem = useMemo(() => {
        if (!editingItemId) return null;
        return items.find((i) => i.productId === editingItemId) ?? null;
    }, [editingItemId, items]);

    useEffect(() => {
        setSelectedCategoryId("all");
    }, [categories]);

    // Función helper para obtener el stock disponible de un producto
    const getAvailableStock = (product: ProductListItem): number => {
        const stockItem = product.stockByBranch.find(
            (item) => item.branchId === branchId
        );
        return stockItem?.stock ?? 0;
    };

    const addProduct = (product: ProductListItem) => {
        const inventoryActivated = product.inventoryActivated ?? false;

        // Si el inventario no está activado, permitir agregar sin validaciones
        if (!inventoryActivated) {
            setItems((previous) => {
                const existing = previous.find(
                    (item) => item.productId === product._id
                );
                if (existing) {
                    return previous.map((item) =>
                        item.productId === product._id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    );
                }
                return [
                    ...previous,
                    {
                        productId: product._id,
                        productName: product.name,
                        imageUrl: product.imageUrl,
                        unitPrice: product.price,
                        quantity: 1,
                        discountAmount: 0,
                    },
                ];
            });
            return;
        }

        const allowNegativeSale = product.allowNegativeSale ?? false;
        const availableStock = getAvailableStock(product);

        // Si no permite venta en negativo y no hay stock disponible, no hacer nada
        if (!allowNegativeSale && availableStock <= 0) {
            return;
        }

        setItems((previous) => {
            const existing = previous.find(
                (item) => item.productId === product._id
            );
            if (existing) {
                // Si permite venta en negativo, incrementar sin límite
                // Si no permite, verificar que no exceda el stock disponible
                const newQuantity = existing.quantity + 1;
                if (!allowNegativeSale && newQuantity > availableStock) {
                    // No incrementar si excedería el stock disponible
                    return previous;
                }
                return previous.map((item) =>
                    item.productId === product._id
                        ? { ...item, quantity: newQuantity }
                        : item
                );
            }
            // Si no existe y no hay stock disponible (y no permite negativo), no agregar
            if (!allowNegativeSale && availableStock <= 0) {
                return previous;
            }
            return [
                ...previous,
                {
                    productId: product._id,
                    productName: product.name,
                    imageUrl: product.imageUrl,
                    unitPrice: product.price,
                    quantity: 1,
                    discountAmount: 0,
                },
            ];
        });
    };

    const updateItemQuantity = (
        productId: Id<"products">,
        quantity: number
    ) => {
        // Encontrar el producto para obtener su configuración de stock
        const product = products.find((p) => p._id === productId);
        if (!product) {
            return;
        }

        const allowNegativeSale = product.allowNegativeSale ?? false;
        const availableStock = getAvailableStock(product);

        setItems((previous) =>
            previous
                .map((item) => {
                    if (item.productId !== productId) {
                        return item;
                    }
                    // Validar cantidad mínima
                    const minQuantity = 1;
                    let newQuantity = Math.max(minQuantity, quantity);

                    // Si no permite venta en negativo, limitar al stock disponible
                    if (!allowNegativeSale && newQuantity > availableStock) {
                        newQuantity = availableStock;
                    }

                    return { ...item, quantity: newQuantity };
                })
                .filter((item) => item.quantity > 0)
        );
    };

    const removeItem = (productId: Id<"products">) => {
        setItems((previous) =>
            previous.filter((item) => item.productId !== productId)
        );
    };

    const handleSubmit = async () => {
        if (items.length === 0) {
            setIsSubmitting(true);
            try {
                await onCreate({
                    branchId,
                    ...(table ? { tableId: table._id } : {}),
                    ...(staffId ? { staffId } : {}),
                    notes: notes.trim() || undefined,
                });
            } finally {
                setIsSubmitting(false);
            }
            return;
        }

        // Validar stock antes de crear la venta (solo si el inventario está activado)
        const stockErrors: string[] = [];
        for (const item of items) {
            const product = products.find((p) => p._id === item.productId);
            if (!product) {
                continue;
            }

            const inventoryActivated = product.inventoryActivated ?? false;

            // Si el inventario no está activado, saltar validación
            if (!inventoryActivated) {
                continue;
            }

            const allowNegativeSale = product.allowNegativeSale ?? false;
            const availableStock = getAvailableStock(product);

            if (!allowNegativeSale && item.quantity > availableStock) {
                stockErrors.push(
                    `${product.name}: cantidad solicitada (${item.quantity}) excede el stock disponible (${availableStock})`
                );
            }
        }

        if (stockErrors.length > 0) {
            alert(
                "No se puede crear la venta. El pedido excede el inventario disponible:\n\n" +
                    stockErrors.join("\n")
            );
            return;
        }

        const payloadItems = items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount:
                item.discountAmount > 0 ? item.discountAmount : undefined,
        }));

        setIsSubmitting(true);
        try {
            await onCreate({
                branchId,
                ...(table ? { tableId: table._id } : {}),
                ...(staffId ? { staffId } : {}),
                notes: notes.trim() || undefined,
                items: payloadItems,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 ${isClosing ? "animate-[fadeOut_0.3s_ease-out]" : "animate-[fadeIn_0.2s_ease-out]"}`}
        >
            <div
                className={`absolute inset-0 bg-slate-950/70 backdrop-blur ${isClosing ? "animate-[fadeOut_0.3s_ease-out]" : "animate-[fadeIn_0.2s_ease-out]"}`}
            />
            <div
                className={`relative flex w-full max-w-5xl flex-col gap-6 rounded-lg border border-slate-800 bg-slate-900/95 p-6 text-white shadow-2xl shadow-black/60 max-h-[90vh] overflow-y-auto ${isClosing ? "animate-[fadeOutScale_0.3s_ease-out]" : "animate-[fadeInScale_0.3s_ease-out]"}`}
            >
                <header className="flex-shrink-0 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-semibold">Nueva venta</h2>
                        <CloseButton onClick={handleClose} />
                    </div>
                </header>

                <div className="flex flex-1 flex-col gap-6 min-h-0 lg:flex-row lg:gap-8 ">
                    <div className="flex flex-3 flex-col gap-4 min-h-0">
                        <div className="flex-shrink-0 space-y-3">
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                {categoryOptions.map((category) => {
                                    const isActive =
                                        selectedCategoryId === category.key;
                                    return (
                                        <button
                                            key={category.key}
                                            type="button"
                                            onClick={() =>
                                                setSelectedCategoryId(
                                                    category.key
                                                )
                                            }
                                            className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition ${
                                                isActive
                                                    ? "border-[#fa7316] bg-[#fa7316]/10 text-white "
                                                    : "border-slate-700 bg-slate-950/40 text-slate-300 hover:border-[#fa7316]/40 hover:text-white"
                                            }`}
                                        >
                                            {category.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex-shrink-0 flex items-center gap-2">
                            <input
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Buscar productos"
                                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                            />
                            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.1em] text-slate-300">
                                {availableProducts.length}
                            </span>
                        </div>

                        <div className="flex-1 rounded-lg overflow-y-auto min-h-0 bg-slate-950/50 p-3 border border-slate-800">
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-2">
                                {availableProducts.map((product) => {
                                    const inventoryActivated =
                                        product.inventoryActivated ?? false;
                                    const availableStock =
                                        product.stockByBranch.find(
                                            (item) => item.branchId === branchId
                                        )?.stock ?? 0;
                                    const allowNegativeSale =
                                        product.allowNegativeSale ?? false;
                                    // Solo validar stock si el inventario está activado
                                    const isOutOfStock =
                                        inventoryActivated &&
                                        availableStock <= 0 &&
                                        !allowNegativeSale;
                                    return (
                                        <button
                                            key={product._id}
                                            type="button"
                                            onClick={() => addProduct(product)}
                                            className={`flex h-full gap-3 rounded-lg border p-2 text-left text-sm transition border-slate-800  ${
                                                isOutOfStock
                                                    ? "cursor-not-allowed border-red-500/40 bg-red-500/10 text-red-200"
                                                    : "border-slate-800 bg-slate-900/60 text-slate-200 hover:border-[#fa7316] hover:text-white"
                                            }`}
                                            disabled={isOutOfStock}
                                        >
                                            <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-slate-800 bg-slate-900/50">
                                                {product.imageUrl ? (
                                                    <img
                                                        src={product.imageUrl}
                                                        alt={product.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                                                        <BiDish className="w-10 h-10" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 flex flex-col gap-2 min-w-0">
                                                <div className="space-y-1">
                                                    <p
                                                        className={`text-sm font-semibold ${isOutOfStock ? "text-red-100" : "text-white"} line-clamp-2`}
                                                    >
                                                        {product.name}
                                                    </p>
                                                    <p
                                                        className={`text-xs ${isOutOfStock ? "text-red-200/80" : "text-slate-400"} line-clamp-3`}
                                                    >
                                                        {product.description}
                                                    </p>
                                                    <p
                                                        className={`text-sm font-semibold ${isOutOfStock ? "text-red-100" : "text-white"}`}
                                                    >
                                                        {formatCurrency(
                                                            product.price
                                                        )}
                                                    </p>
                                                    {inventoryActivated && (
                                                        <p className="text-xs text-slate-400">
                                                            Stock:{" "}
                                                            {availableStock}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {availableProducts.length === 0 && (
                                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-sm text-slate-400">
                                    <FaMagnifyingGlass className="w-8 h-8" />
                                    <p>
                                        No se encontraron productos para los
                                        filtros seleccionados.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-2 flex-col gap-4 overflow-y-auto min-h-0">
                        <div className="flex-shrink-0 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
                                Personal asignado
                                <select
                                    value={staffId}
                                    onChange={(event) =>
                                        setStaffId(
                                            event.target.value as
                                                | Id<"staff">
                                                | ""
                                        )
                                    }
                                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                                >
                                    <option value="">Sin asignar</option>
                                    {staffMembers.map((member) => (
                                        <option
                                            key={member._id}
                                            value={member._id as string}
                                        >
                                            {member.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-slate-200">
                                Notas
                                <textarea
                                    value={notes}
                                    onChange={(event) =>
                                        setNotes(event.target.value)
                                    }
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                                    placeholder="Agregar algún detalle del pedido o mesa"
                                />
                            </label>
                        </div>

                        <div className="flex-1 space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4 overflow-y-auto min-h-0">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">
                                    Pedido
                                </h3>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.1em] text-slate-300">
                                    {items.length} items
                                </span>
                            </div>
                            {items.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center text-sm text-slate-400">
                                    Selecciona productos para construir el
                                    ticket.
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-800">
                                    {items.map((item) => (
                                        <li
                                            key={item.productId}
                                            className="py-3 text-sm text-slate-200"
                                        >
                                            <div className="flex items-center justify-between gap-3 mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-white truncate">
                                                        {item.productName}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        {item.discountAmount >
                                                        0 ? (
                                                            <>
                                                                <p className="text-xs text-slate-400 line-through">
                                                                    {formatCurrency(
                                                                        item.quantity *
                                                                            item.unitPrice
                                                                    )}
                                                                </p>
                                                                <span className="text-xs text-slate-500">
                                                                    →
                                                                </span>
                                                                <p className="text-xs font-semibold text-[#fa7316]">
                                                                    {formatCurrency(
                                                                        item.quantity *
                                                                            item.unitPrice -
                                                                            item.discountAmount
                                                                    )}
                                                                </p>
                                                            </>
                                                        ) : (
                                                            <p className="text-xs text-slate-400">
                                                                {formatCurrency(
                                                                    item.unitPrice
                                                                )}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <FaRegEdit
                                                        className="w-4 h-4 text-slate-300 transition hover:text-[#fa7316] cursor-pointer"
                                                        onClick={() =>
                                                            setEditingItemId(
                                                                item.productId
                                                            )
                                                        }
                                                    />

                                                    <MdDeleteOutline
                                                        className="w-5 h-5 text-red-700 transition hover:text-red-300 cursor-pointer"
                                                        onClick={() =>
                                                            removeItem(
                                                                item.productId
                                                            )
                                                        }
                                                        aria-label="Eliminar producto"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateItemQuantity(
                                                            item.productId,
                                                            item.quantity - 1
                                                        )
                                                    }
                                                    className="inline-flex h-9 flex-1 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-[#fa7316] hover:text-white"
                                                    aria-label="Disminuir cantidad"
                                                >
                                                    −
                                                </button>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={item.quantity}
                                                    onChange={(event) =>
                                                        updateItemQuantity(
                                                            item.productId,
                                                            Number(
                                                                event.target
                                                                    .value
                                                            )
                                                        )
                                                    }
                                                    className="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white outline-none transition focus:border-[#fa7316] focus:ring-1 focus:ring-[#fa7316]/30"
                                                />
                                                {(() => {
                                                    const product =
                                                        products.find(
                                                            (p) =>
                                                                p._id ===
                                                                item.productId
                                                        );
                                                    const inventoryActivated =
                                                        product?.inventoryActivated ??
                                                        false;
                                                    // Si el inventario no está activado, siempre permitir incrementar
                                                    if (!inventoryActivated) {
                                                        return (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateItemQuantity(
                                                                        item.productId,
                                                                        item.quantity +
                                                                            1
                                                                    )
                                                                }
                                                                className="inline-flex h-9 flex-1 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-[#fa7316] hover:text-white"
                                                                aria-label="Aumentar cantidad"
                                                            >
                                                                +
                                                            </button>
                                                        );
                                                    }
                                                    const allowNegativeSale =
                                                        product?.allowNegativeSale ??
                                                        false;
                                                    const availableStock =
                                                        product
                                                            ? getAvailableStock(
                                                                  product
                                                              )
                                                            : 0;
                                                    const canIncrement =
                                                        allowNegativeSale ||
                                                        item.quantity <
                                                            availableStock;
                                                    return (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateItemQuantity(
                                                                    item.productId,
                                                                    item.quantity +
                                                                        1
                                                                )
                                                            }
                                                            disabled={
                                                                !canIncrement
                                                            }
                                                            className={`inline-flex h-9 flex-1 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 transition ${
                                                                canIncrement
                                                                    ? "hover:border-[#fa7316] hover:text-white"
                                                                    : "cursor-not-allowed opacity-50"
                                                            }`}
                                                            aria-label="Aumentar cantidad"
                                                        >
                                                            +
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                <footer className="flex-shrink-0 flex flex-col gap-3 md:flex-row md:justify-end">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-[#fa7316] hover:text-white cursor-pointer"
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white  transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Guardando..." : "Crear venta"}
                    </button>
                </footer>
            </div>

            {editingItem && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur"
                        onClick={() => setEditingItemId(null)}
                    />
                    <div className="relative w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                                Editar producto
                            </h3>

                            <CloseButton
                                onClick={() => setEditingItemId(null)}
                            />
                        </div>
                        <div className="mb-4">
                            <p className="font-semibold text-white">
                                {editingItem.productName}
                            </p>
                            <p className="text-xs text-slate-400">
                                {formatCurrency(editingItem.unitPrice)}
                            </p>
                        </div>
                        <div className="space-y-4">
                            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
                                Cantidad
                                <div className="flex items-center justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            updateItemQuantity(
                                                editingItem.productId,
                                                editingItem.quantity - 1
                                            )
                                        }
                                        className="inline-flex h-9 flex-1 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-[#fa7316] hover:text-white cursor-pointer"
                                        aria-label="Disminuir cantidad"
                                    >
                                        <IoMdRemove className="w-4 h-4" />
                                    </button>
                                    <input
                                        type="number"
                                        min={1}
                                        value={editingItem.quantity}
                                        onChange={(event) =>
                                            updateItemQuantity(
                                                editingItem.productId,
                                                Number(event.target.value)
                                            )
                                        }
                                        className="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white outline-none transition focus:border-[#fa7316] focus:ring-1 focus:ring-[#fa7316]/30 cursor-pointer"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            updateItemQuantity(
                                                editingItem.productId,
                                                editingItem.quantity + 1
                                            )
                                        }
                                        className="inline-flex h-9 flex-1 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-[#fa7316] hover:text-white"
                                        aria-label="Aumentar cantidad"
                                    >
                                        <IoMdAdd className="w-4 h-4" />
                                    </button>
                                </div>
                            </label>
                            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
                                Descuento (S/.)
                                <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={editingItem.discountAmount}
                                    onChange={(event) =>
                                        setItems((previous) =>
                                            previous.map((line) =>
                                                line.productId ===
                                                editingItem.productId
                                                    ? {
                                                          ...line,
                                                          discountAmount:
                                                              Math.max(
                                                                  0,
                                                                  Number(
                                                                      event
                                                                          .target
                                                                          .value
                                                                  ) || 0
                                                              ),
                                                      }
                                                    : line
                                            )
                                        )
                                    }
                                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                                    placeholder="0.00"
                                />
                            </label>
                            {editingItem.discountAmount > 0 && (
                                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
                                    <div className="flex items-center justify-between text-slate-200">
                                        <span>Subtotal:</span>
                                        <span className="line-through text-slate-400">
                                            {formatCurrency(
                                                editingItem.quantity *
                                                    editingItem.unitPrice
                                            )}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between font-semibold text-white">
                                        <span>Total con descuento:</span>
                                        <span className="text-emerald-300">
                                            {formatCurrency(
                                                editingItem.quantity *
                                                    editingItem.unitPrice -
                                                    editingItem.discountAmount
                                            )}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setEditingItemId(null)}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#fa7316] hover:text-white cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditingItemId(null)}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-4 py-2 text-sm font-semibold text-white  transition hover:bg-[#e86811] cursor-pointer"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SaleEditorDrawer = ({
    sale,
    branchId,
    tables,
    products,
    categories,
    staffMembers,
    onClose,
    onSaveItems,
    onUpdateDetails,
    onCloseSale,
    onCancelSale,
}: {
    sale: LiveSale;
    branchId: Id<"branches">;
    tables: Doc<"branchTables">[];
    products: ProductListItem[];
    categories: Doc<"categories">[];
    staffMembers: Doc<"staff">[];
    onClose: () => void;
    onSaveItems: (
        saleId: Id<"sales">,
        items: Array<{
            productId: Id<"products">;
            quantity: number;
            unitPrice: number;
            discountAmount?: number;
        }>
    ) => Promise<void>;
    onUpdateDetails: (payload: {
        saleId: Id<"sales">;
        tableId?: Id<"branchTables"> | null;
        staffId?: Id<"staff"> | null;
        notes?: string;
    }) => Promise<void>;
    onCloseSale: (
        saleId: Id<"sales">,
        saleData: LiveSale,
        paymentMethod: "Contado" | "Tarjeta" | "Transferencia" | "Otros",
        notes: string
    ) => void;
    onCancelSale: (saleId: Id<"sales">) => void;
}) => {
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300); // Esperar a que termine la animación (300ms)
    };

    const [items, setItems] = useState<EditableItem[]>(() =>
        sale.items.map((item) => {
            const product = products.find(
                (productItem) => productItem._id === item.productId
            );
            return {
                productId: item.productId,
                productName: product?.name ?? "Producto",
                imageUrl: product?.imageUrl ?? null,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                discountAmount: item.discountAmount ?? 0,
            };
        })
    );

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
    const categoryOptions = useMemo(
        () => [
            { key: "all", label: "Todos" },
            ...categories.map((category) => ({
                key: category._id as string,
                label: category.name,
            })),
        ],
        [categories]
    );
    const [saleNotes, setSaleNotes] = useState(sale.sale.notes ?? "");
    const [selectedTableId, setSelectedTableId] = useState<
        Id<"branchTables"> | ""
    >(sale.sale.tableId ? (sale.sale.tableId as Id<"branchTables">) : "");
    const [selectedStaffId, setSelectedStaffId] = useState<Id<"staff"> | "">(
        sale.sale.staffId ? (sale.sale.staffId as Id<"staff">) : ""
    );
    const [isSavingItems, setIsSavingItems] = useState(false);
    const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);
    const [editingItemId, setEditingItemId] = useState<Id<"products"> | null>(
        null
    );
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

    const filteredProducts = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return products.filter((product) => {
            const matchesSearch = product.name.toLowerCase().includes(query);
            const matchesCategory =
                selectedCategoryId === "all" ||
                (product.categoryId as unknown as string) ===
                    selectedCategoryId;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, selectedCategoryId]);

    useEffect(() => {
        setSelectedCategoryId("all");
    }, [categories]);

    useEffect(() => {
        setItems(
            sale.items.map((item) => {
                const product = products.find(
                    (productItem) => productItem._id === item.productId
                );
                return {
                    productId: item.productId,
                    productName: product?.name ?? "Producto",
                    imageUrl: product?.imageUrl ?? null,
                    unitPrice: item.unitPrice,
                    quantity: item.quantity,
                    discountAmount: item.discountAmount ?? 0,
                };
            })
        );
        setSaleNotes(sale.sale.notes ?? "");
        setSelectedTableId(
            sale.sale.tableId ? (sale.sale.tableId as Id<"branchTables">) : ""
        );
        setSelectedStaffId(
            sale.sale.staffId ? (sale.sale.staffId as Id<"staff">) : ""
        );
    }, [sale, products]);

    const total = useMemo(() => {
        return items.reduce((accumulator, item) => {
            const line = item.quantity * item.unitPrice - item.discountAmount;
            return accumulator + Math.max(0, line);
        }, 0);
    }, [items]);

    const editingItem = useMemo(() => {
        if (!editingItemId) return null;
        return items.find((i) => i.productId === editingItemId) ?? null;
    }, [editingItemId, items]);

    // Función helper para obtener el stock disponible de un producto
    const getAvailableStock = (product: ProductListItem): number => {
        const stockItem = product.stockByBranch.find(
            (item) => item.branchId === branchId
        );
        return stockItem?.stock ?? 0;
    };

    const addItem = (product: ProductListItem) => {
        const inventoryActivated = product.inventoryActivated ?? false;

        // Si el inventario no está activado, permitir agregar sin validaciones
        if (!inventoryActivated) {
            setItems((previous) => {
                const existing = previous.find(
                    (item) => item.productId === product._id
                );
                if (existing) {
                    return previous.map((item) =>
                        item.productId === product._id
                            ? { ...item, quantity: item.quantity + 1 }
                            : item
                    );
                }
                return [
                    ...previous,
                    {
                        productId: product._id,
                        productName: product.name,
                        imageUrl: product.imageUrl,
                        unitPrice: product.price,
                        quantity: 1,
                        discountAmount: 0,
                    },
                ];
            });
            return;
        }

        const allowNegativeSale = product.allowNegativeSale ?? false;
        const availableStock = getAvailableStock(product);

        // Si no permite venta en negativo y no hay stock disponible, no hacer nada
        if (!allowNegativeSale && availableStock <= 0) {
            return;
        }

        setItems((previous) => {
            const existing = previous.find(
                (item) => item.productId === product._id
            );
            if (existing) {
                // Si permite venta en negativo, incrementar sin límite
                // Si no permite, verificar que no exceda el stock disponible
                const newQuantity = existing.quantity + 1;
                if (!allowNegativeSale && newQuantity > availableStock) {
                    // No incrementar si excedería el stock disponible
                    return previous;
                }
                return previous.map((item) =>
                    item.productId === product._id
                        ? { ...item, quantity: newQuantity }
                        : item
                );
            }
            // Si no existe y no hay stock disponible (y no permite negativo), no agregar
            if (!allowNegativeSale && availableStock <= 0) {
                return previous;
            }
            return [
                ...previous,
                {
                    productId: product._id,
                    productName: product.name,
                    imageUrl: product.imageUrl,
                    unitPrice: product.price,
                    quantity: 1,
                    discountAmount: 0,
                },
            ];
        });
    };

    const updateItemQuantity = (
        productId: Id<"products">,
        quantity: number
    ) => {
        // Encontrar el producto para obtener su configuración de stock
        const product = products.find((p) => p._id === productId);
        if (!product) {
            return;
        }

        const inventoryActivated = product.inventoryActivated ?? false;

        // Si el inventario no está activado, permitir cualquier cantidad
        if (!inventoryActivated) {
            setItems((previous) =>
                previous.map((item) => {
                    if (item.productId !== productId) {
                        return item;
                    }
                    return { ...item, quantity: Math.max(1, quantity) };
                })
            );
            return;
        }

        const allowNegativeSale = product.allowNegativeSale ?? false;
        const availableStock = getAvailableStock(product);

        setItems((previous) =>
            previous.map((item) => {
                if (item.productId !== productId) {
                    return item;
                }
                // Validar cantidad mínima
                const minQuantity = 1;
                let newQuantity = Math.max(minQuantity, quantity);

                // Si no permite venta en negativo, limitar al stock disponible
                if (!allowNegativeSale && newQuantity > availableStock) {
                    newQuantity = availableStock;
                }

                return { ...item, quantity: newQuantity };
            })
        );
    };

    const removeItem = (productId: Id<"products">) => {
        setItems((previous) =>
            previous.filter((item) => item.productId !== productId)
        );
    };

    const saveItems = async () => {
        // Validar stock antes de guardar los items (solo si el inventario está activado)
        const stockErrors: string[] = [];
        for (const item of items) {
            const product = products.find((p) => p._id === item.productId);
            if (!product) {
                continue;
            }

            const inventoryActivated = product.inventoryActivated ?? false;

            // Si el inventario no está activado, saltar validación
            if (!inventoryActivated) {
                continue;
            }

            const allowNegativeSale = product.allowNegativeSale ?? false;
            const availableStock = getAvailableStock(product);

            if (!allowNegativeSale && item.quantity > availableStock) {
                stockErrors.push(
                    `${product.name}: cantidad solicitada (${item.quantity}) excede el stock disponible (${availableStock})`
                );
            }
        }

        if (stockErrors.length > 0) {
            alert(
                "No se pueden guardar los cambios. El pedido excede el inventario disponible:\n\n" +
                    stockErrors.join("\n")
            );
            return;
        }

        setIsSavingItems(true);
        try {
            await onSaveItems(
                sale.sale._id,
                items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    discountAmount:
                        item.discountAmount > 0
                            ? item.discountAmount
                            : undefined,
                }))
            );
        } finally {
            setIsSavingItems(false);
        }
    };

    const saveDetails = async () => {
        setIsUpdatingDetails(true);
        try {
            await onUpdateDetails({
                saleId: sale.sale._id,
                tableId:
                    selectedTableId === ""
                        ? null
                        : (selectedTableId as Id<"branchTables">),
                staffId:
                    selectedStaffId === ""
                        ? null
                        : (selectedStaffId as Id<"staff">),
                notes: saleNotes.trim() || undefined,
            });
        } finally {
            setIsUpdatingDetails(false);
        }
    };

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center ${isClosing ? "animate-[fadeOut_0.3s_ease-out]" : "animate-[fadeIn_0.2s_ease-out]"}`}
        >
            <div
                className={`absolute inset-0  ${isClosing ? "animate-[fadeOut_0.3s_ease-out]" : "animate-[fadeIn_0.2s_ease-out]"}`}
            />
            <div
                className={`relative flex flex-col w-full h-full bg-slate-900 text-white shadow-xl shadow-black/50 ${isClosing ? "animate-[fadeOutScale_0.3s_ease-out]" : "animate-[fadeInScale_0.3s_ease-out]"}`}
            >
                <header className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-800">
                    <div>
                        <p className="text-md uppercase tracking-[0.1em] text-slate-400">
                            {sale.table?.label ?? "Venta sin mesa"}
                        </p>
                    
                    </div>
                    <CloseButton onClick={handleClose} />
                </header>

                <div className="flex-1 flex flex-col gap-6 overflow-hidden p-6 lg:flex-row lg:gap-8 min-h-0">
                    <div className="flex flex-3 flex-col gap-4   min-h-0">
                        <div className="space-y-3">
                          
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                {categoryOptions.map((category) => {
                                    const isActive =
                                        selectedCategoryId === category.key;
                                    return (
                                        <button
                                            key={category.key}
                                            type="button"
                                            onClick={() =>
                                                setSelectedCategoryId(
                                                    category.key
                                                )
                                            }
                                            className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition ${
                                                isActive
                                                    ? "border-[#fa7316] bg-[#fa7316]/10 text-white "
                                                    : "border-slate-700 bg-slate-950/40 text-slate-300 hover:border-[#fa7316]/40 hover:text-white"
                                            }`}
                                        >
                                            {category.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(event) =>
                                    setSearchTerm(event.target.value)
                                }
                                placeholder="Buscar productos"
                                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                            />
                            <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.1em] text-slate-300">
                                {filteredProducts.length}
                            </span>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 overflow-y-auto">
                            {filteredProducts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-sm text-slate-400">
                                    <span className="text-3xl" aria-hidden>
                                        🔍
                                    </span>
                                    <p>
                                        No se encontraron productos para los
                                        filtros seleccionados.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                                    {filteredProducts.map((product) => {
                                        const availableStock =
                                            product.stockByBranch.find(
                                                (item) =>
                                                    item.branchId === branchId
                                            )?.stock ?? 0;
                                        const allowNegativeSale =
                                            product.allowNegativeSale ?? false;
                                        const isOutOfStock =
                                            availableStock <= 0 &&
                                            !allowNegativeSale;
                                        return (
                                            <button
                                                key={product._id}
                                                type="button"
                                                onClick={() => addItem(product)}
                                                className={`flex h-full gap-3 rounded-lg border p-4 text-left text-sm transition ${
                                                    isOutOfStock
                                                        ? "cursor-not-allowed border-red-500/40 bg-red-500/10 text-red-200"
                                                        : "border-slate-800 bg-slate-900/60 text-slate-200 hover:border-[#fa7316] hover:text-white"
                                                }`}
                                                disabled={isOutOfStock}
                                            >
                                                <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-slate-800 bg-slate-900/50">
                                                    {product.imageUrl ? (
                                                        <img
                                                            src={
                                                                product.imageUrl
                                                            }
                                                            alt={product.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                                                            <BiDish className="w-10 h-10" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 flex flex-col gap-2 min-w-0">
                                                    <div className="space-y-1">
                                                        <p
                                                            className={`text-sm font-semibold ${isOutOfStock ? "text-red-100" : "text-white"} line-clamp-2`}
                                                        >
                                                            {product.name}
                                                        </p>
                                                        <p
                                                            className={`text-xs ${isOutOfStock ? "text-red-200/80" : "text-slate-400"} line-clamp-3`}
                                                        >
                                                            {
                                                                product.description
                                                            }
                                                        </p>
                                                        <p
                                                            className={`text-sm font-semibold ${isOutOfStock ? "text-red-100" : "text-white"}`}
                                                        >
                                                            {formatCurrency(
                                                                product.price
                                                            )}
                                                        </p>
                                                        {product.inventoryActivated && (
                                                            <p className="text-xs text-slate-400">
                                                                Stock:{" "}
                                                                {availableStock}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-2 flex-col gap-4 overflow-y-auto  ">
                        <div className="flex-shrink-0 rounded-lg border border-slate-800 bg-slate-950/50 overflow-hidden">
                            <button
                                type="button"
                                onClick={() =>
                                    setIsDetailsExpanded(!isDetailsExpanded)
                                }
                                className="w-full flex items-center justify-between p-4 text-left text-white hover:bg-slate-900/50 transition"
                            >
                                <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">
                                    Detalles del pedido
                                </h3>
                                <span className="text-slate-400">
                                    {isDetailsExpanded ? (
                                        <IoIosArrowUp />
                                    ) : (
                                        <IoIosArrowDown />
                                    )}
                                </span>
                            </button>
                            {isDetailsExpanded && (
                                <div className="space-y-4 p-4 border-t border-slate-800">
                                    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
                                        Mesa asignada
                                        <select
                                            value={selectedTableId}
                                            onChange={(event) =>
                                                setSelectedTableId(
                                                    event.target.value as
                                                        | Id<"branchTables">
                                                        | ""
                                                )
                                            }
                                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                                        >
                                            <option value="">Sin mesa</option>
                                            {tables.map((table) => (
                                                <option
                                                    key={table._id}
                                                    value={table._id as string}
                                                    disabled={
                                                        Boolean(
                                                            table.currentSaleId
                                                        ) &&
                                                        table._id !==
                                                            sale.sale.tableId
                                                    }
                                                >
                                                    {table.label}
                                                    {table.currentSaleId &&
                                                    table._id !==
                                                        sale.sale.tableId
                                                        ? " · Ocupada"
                                                        : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
                                        Personal asignado
                                        <select
                                            value={selectedStaffId}
                                            onChange={(event) =>
                                                setSelectedStaffId(
                                                    event.target.value as
                                                        | Id<"staff">
                                                        | ""
                                                )
                                            }
                                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                                        >
                                            <option value="">
                                                Sin asignar
                                            </option>
                                            {staffMembers.map((member) => (
                                                <option
                                                    key={member._id}
                                                    value={member._id as string}
                                                >
                                                    {member.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
                                        Notas del pedido
                                        <textarea
                                            value={saleNotes}
                                            onChange={(event) =>
                                                setSaleNotes(event.target.value)
                                            }
                                            rows={3}
                                            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                                            placeholder="Comentarios especiales o instrucciones"
                                        />
                                    </label>
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={saveDetails}
                                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-4 py-2 text-sm font-semibold text-white  transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                                            disabled={isUpdatingDetails}
                                        >
                                            {isUpdatingDetails
                                                ? "Guardando..."
                                                : "Guardar detalles"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">
                                    Pedido
                                </h3>
                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.1em] text-slate-300">
                                    {items.length} items
                                </span>
                            </div>
                            {items.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center text-sm text-slate-400">
                                    Aún no hay productos en este pedido.
                                    Selecciona productos desde el catálogo.
                                </div>
                            ) : (
                                <ul className="divide-y divide-slate-800  overflow-y-auto pr-1">
                                    {items.map((item) => (
                                        <li
                                            key={item.productId}
                                            className="py-3 text-sm text-slate-200"
                                        >
                                            <div className="flex items-center justify-between gap-3 mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-white truncate">
                                                        {item.productName}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        {item.discountAmount >
                                                        0 ? (
                                                            <>
                                                                <p className="text-xs text-slate-400 line-through">
                                                                    {formatCurrency(
                                                                        item.quantity *
                                                                            item.unitPrice
                                                                    )}
                                                                </p>
                                                                <span className="text-xs text-slate-500">
                                                                    →
                                                                </span>
                                                                <p className="text-xs font-semibold text-[#fa7316]">
                                                                    {formatCurrency(
                                                                        item.quantity *
                                                                            item.unitPrice -
                                                                            item.discountAmount
                                                                    )}
                                                                </p>
                                                            </>
                                                        ) : (
                                                            <p className="text-xs text-slate-400">
                                                                {formatCurrency(
                                                                    item.unitPrice
                                                                )}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <FaRegEdit
                                                        className="w-4 h-4 text-slate-300 transition hover:text-[#fa7316] cursor-pointer"
                                                        onClick={() =>
                                                            setEditingItemId(
                                                                item.productId
                                                            )
                                                        }
                                                    />
                                                    <MdDeleteOutline
                                                        className="w-5 h-5 text-red-700 transition hover:text-red-300 cursor-pointer"
                                                        onClick={() =>
                                                            removeItem(
                                                                item.productId
                                                            )
                                                        }
                                                        aria-label="Eliminar producto"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        updateItemQuantity(
                                                            item.productId,
                                                            item.quantity - 1
                                                        )
                                                    }
                                                    className="inline-flex h-9 flex-1 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-[#fa7316] hover:text-white cursor-pointer"
                                                    aria-label="Disminuir cantidad"
                                                >
                                                    <IoMdRemove className="w-4 h-4" />
                                                </button>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={item.quantity}
                                                    onChange={(event) =>
                                                        updateItemQuantity(
                                                            item.productId,
                                                            Number(
                                                                event.target
                                                                    .value
                                                            )
                                                        )
                                                    }
                                                    className="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white outline-none transition focus:border-[#fa7316] focus:ring-1 focus:ring-[#fa7316]/30"
                                                />
                                                {(() => {
                                                    const product =
                                                        products.find(
                                                            (p) =>
                                                                p._id ===
                                                                item.productId
                                                        );
                                                    const allowNegativeSale =
                                                        product?.allowNegativeSale ??
                                                        false;
                                                    const availableStock =
                                                        product
                                                            ? getAvailableStock(
                                                                  product
                                                              )
                                                            : 0;
                                                    const canIncrement =
                                                        allowNegativeSale ||
                                                        item.quantity <
                                                            availableStock;
                                                    return (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateItemQuantity(
                                                                    item.productId,
                                                                    item.quantity +
                                                                        1
                                                                )
                                                            }
                                                            disabled={
                                                                !canIncrement
                                                            }
                                                            className={`inline-flex h-9 flex-1 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 transition cursor-pointer ${
                                                                canIncrement
                                                                    ? "hover:border-[#fa7316] hover:text-white"
                                                                    : "cursor-not-allowed opacity-50"
                                                            }`}
                                                            aria-label="Aumentar cantidad"
                                                        >
                                                            <IoMdAdd className="w-4 h-4" />
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={saveItems}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-4 py-2 text-sm font-semibold text-white  transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                                    disabled={isSavingItems}
                                >
                                    {isSavingItems
                                        ? "Guardando..."
                                        : "Guardar productos"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="flex-shrink-0 flex flex-col gap-4 p-3 border-t border-slate-800 bg-slate-900">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <span className="text-xs uppercase tracking-[0.1em] text-slate-500">
                                    Total
                                </span>
                                <span className="text-2xl font-semibold text-white">
                                    {formatCurrency(total)}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 text-sm text-slate-300">
                                <div className="flex items-center gap-2">
                                    <span>Creada:</span>
                                    <span className="font-semibold text-white">
                                        {formatDateTime(sale.sale.openedAt)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span>Tiempo en mesa:</span>
                                    <span className="font-semibold text-white">
                                        {formatDuration(
                                            sale.sale.openedAt,
                                            Date.now()
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 md:flex-row md:items-center">
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() =>
                                        onCloseSale(
                                            sale.sale._id,
                                            sale,
                                            "Contado",
                                            saleNotes
                                        )
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/50 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200 cursor-pointer"
                                >
                                    Concluir venta
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onCancelSale(sale.sale._id)}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-300 transition hover:border-red-400 hover:text-red-200 cursor-pointer"
                                >
                                    Cancelar venta
                                </button>
                            </div>
                        </div>
                    </div>
                </footer>

                {editingItem && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
                        <div
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur"
                            onClick={() => setEditingItemId(null)}
                        />
                        <div className="relative w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-lg font-semibold">
                                    Editar producto
                                </h3>

                                <CloseButton
                                    onClick={() => setEditingItemId(null)}
                                />
                            </div>
                            <div className="mb-4">
                                <p className="font-semibold text-white">
                                    {editingItem.productName}
                                </p>
                                <p className="text-xs text-slate-400">
                                    {formatCurrency(editingItem.unitPrice)}
                                </p>
                            </div>
                            <div className="space-y-4">
                                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
                                    Cantidad
                                    <div className="flex items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateItemQuantity(
                                                    editingItem.productId,
                                                    editingItem.quantity - 1
                                                )
                                            }
                                            className="inline-flex h-9 flex-1 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-[#fa7316] hover:text-white cursor-pointer"
                                            aria-label="Disminuir cantidad"
                                        >
                                            <IoMdRemove className="w-4 h-4" />
                                        </button>
                                        <input
                                            type="number"
                                            min={1}
                                            value={editingItem.quantity}
                                            onChange={(event) =>
                                                updateItemQuantity(
                                                    editingItem.productId,
                                                    Number(event.target.value)
                                                )
                                            }
                                            className="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white outline-none transition focus:border-[#fa7316] focus:ring-1 focus:ring-[#fa7316]/30"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                updateItemQuantity(
                                                    editingItem.productId,
                                                    editingItem.quantity + 1
                                                )
                                            }
                                            className="inline-flex h-9 flex-1 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-[#fa7316] hover:text-white cursor-pointer"
                                            aria-label="Aumentar cantidad"
                                        >
                                            <IoMdAdd className="w-4 h-4" />
                                        </button>
                                    </div>
                                </label>
                                <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
                                    Descuento (S/.)
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.01"
                                        value={editingItem.discountAmount}
                                        onChange={(event) =>
                                            setItems((previous) =>
                                                previous.map((line) =>
                                                    line.productId ===
                                                    editingItem.productId
                                                        ? {
                                                              ...line,
                                                              discountAmount:
                                                                  Math.max(
                                                                      0,
                                                                      Number(
                                                                          event
                                                                              .target
                                                                              .value
                                                                      ) || 0
                                                                  ),
                                                          }
                                                        : line
                                                )
                                            )
                                        }
                                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                                        placeholder="0.00"
                                    />
                                </label>
                                {editingItem.discountAmount > 0 && (
                                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
                                        <div className="flex items-center justify-between text-slate-200">
                                            <span>Subtotal:</span>
                                            <span className="line-through text-slate-400">
                                                {formatCurrency(
                                                    editingItem.quantity *
                                                        editingItem.unitPrice
                                                )}
                                            </span>
                                        </div>
                                        <div className="mt-1 flex items-center justify-between font-semibold text-white">
                                            <span>Total con descuento:</span>
                                            <span className="text-emerald-300">
                                                {formatCurrency(
                                                    editingItem.quantity *
                                                        editingItem.unitPrice -
                                                        editingItem.discountAmount
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingItemId(null)}
                                    className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#fa7316] hover:text-white cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingItemId(null)}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-4 py-2 text-sm font-semibold text-white  transition hover:bg-[#e86811] cursor-pointer"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
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
                    "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
            },
            occupied: {
                label: "Ocupada",
                className: "border-[#fa7316]/40 bg-[#fa7316]/10 text-[#fa7316]",
            },
            reserved: {
                label: "Reservada",
                className: "border-sky-500/40 bg-sky-500/10 text-sky-300",
            },
            out_of_service: {
                label: "Fuera de servicio",
                className: "border-red-500/40 bg-red-500/10 text-red-300",
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
