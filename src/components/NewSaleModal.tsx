import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import type { ProductListItem } from "../types/products";
import { useToast } from "../contexts/ToastContext";
import EditItemModal, { type EditableItem } from "./EditItemModal";
import ProductGrid from "./ProductGrid";
import OrderSummary from "./OrderSummary";
import CloseButton from "./CloseButton";
import { useOrderItems } from "../hooks/useOrderItems";
import { formatCurrency } from "../utils/format";
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io";

type NewSaleModalProps = {
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
            productName?: string;
            quantity: number;
            unitPrice: number;
            notes?: string;
        }>;
    }) => Promise<void>;
};

const NewSaleModal = ({
    branchId,
    table,
    products,
    categories,
    staffMembers,
    onClose,
    onCreate,
}: NewSaleModalProps) => {
    const [isClosing, setIsClosing] = useState(false);
    const [staffId, setStaffId] = useState<Id<"staff"> | "">("");

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            onClose();
        }, 300); // Esperar a que termine la animación (300ms)
    };
    const [notes, setNotes] = useState("");
    const [items, setItems] = useState<EditableItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingItemId, setEditingItemId] = useState<Id<"products"> | null>(
        null
    );
    const [activeTab, setActiveTab] = useState<"catalogo" | "pedido">("catalogo");
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

    const currentUser = useQuery(api.users.getCurrent) as Doc<"users"> | undefined;
    const salesThisMonthData = useQuery(api.sales.getSalesCountThisMonth) as
        | { count: number }
        | undefined;
    const salesThisMonth = salesThisMonthData?.count ?? 0;
    const { error: toastError } = useToast();

    const getSaleLimit = (subscriptionType: string | undefined): number | null => {
        if (!subscriptionType) return 2000;
        if (subscriptionType === "starter") return 2000;
        return null;
    };
    const saleLimit = getSaleLimit(currentUser?.subscriptionType);
    const atSaleLimit = saleLimit !== null && salesThisMonth >= saleLimit;
    const planLabel =
        { starter: "Starter", negocio: "Negocio", pro: "Pro" }[
            currentUser?.subscriptionType ?? "starter"
        ] ?? "Starter";

    const editingItem = useMemo(() => {
        if (!editingItemId) return null;
        return items.find((i) => i.productId === editingItemId) ?? null;
    }, [editingItemId, items]);

    const total = useMemo(() => {
        return items.reduce((accumulator, item) => {
            return accumulator + item.quantity * item.unitPrice;
        }, 0);
    }, [items]);

    const subtotal = useMemo(() => {
        return total;
    }, [total]);

    const tax = useMemo(() => {
        return 0;
    }, []);

    const {
        addProduct,
        updateItemQuantity,
        removeItem,
        updateItemName,
        updateItemPrice,
        validateStock,
    } = useOrderItems({
        items,
        setItems,
        products,
        branchId,
        showInventoryCheck: true,
    });

    const handleSubmit = async () => {
        if (atSaleLimit && saleLimit !== null) {
            toastError(
                `Has alcanzado el límite de ${saleLimit} ventas del mes de tu plan ${planLabel}. Actualiza tu plan o espera al próximo mes.`
            );
            return;
        }

        if (items.length === 0) {
            toastError("Debes agregar al menos un producto para crear la venta.");
            return;
        }

        // Validar stock antes de crear la venta
        const stockErrors = validateStock();
        if (stockErrors.length > 0) {
            alert(
                "No se puede crear la venta. El pedido excede el inventario disponible:\n\n" +
                    stockErrors.join("\n")
            );
            return;
        }

        const payloadItems = items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
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
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "No se pudo crear la venta. Inténtalo de nuevo.";
            toastError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 ${isClosing ? "animate-[fadeOut_0.3s_ease-out]" : "animate-[fadeIn_0.2s_ease-out]"}`}
        >
            <div
                className={`absolute inset-0 bg-black/40 backdrop-blur dark:bg-slate-950/70 ${isClosing ? "animate-[fadeOut_0.3s_ease-out]" : "animate-[fadeIn_0.2s_ease-out]"}`}
            />
            <div
                className={`relative flex w-full max-w-7xl flex-col gap-2 lg:gap-6 rounded-lg border border-slate-200 bg-white p-4 lg:p-6 text-slate-900 shadow-2xl shadow-black/60 dark:border-slate-800 dark:bg-slate-900/95 dark:text-white h-[90vh] max-h-[80vh] md:max-h-[90vh] overflow-hidden ${isClosing ? "animate-[fadeOutScale_0.3s_ease-out]" : "animate-[fadeInScale_0.3s_ease-out]"}`}
            >
                <header className="flex-shrink-0 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Nueva venta</h2>
                        <CloseButton onClick={handleClose} />
                    </div>
                    
                    {/* Tabs solo visibles en pantallas menores a 1024px */}
                    <div className="lg:hidden flex gap-2 my-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab("catalogo")}
                            className={`flex-1 px-4 py-2 text-sm font-semibold transition border-1 rounded-lg ${
                                activeTab === "catalogo"
                                    ? "border-[#fa7316] bg-[#fa7316]/10 text-slate-900 dark:text-white"
                                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                            }`}
                        >
                            CATÁLOGO
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("pedido")}
                            className={`flex-1 px-4 py-2 text-sm font-semibold transition border-1 rounded-lg flex items-center justify-center ${
                                activeTab === "pedido"
                                    ? "border-[#fa7316] bg-[#fa7316]/10 text-slate-900 dark:text-white"
                                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                            }`}
                        >
                            PEDIDO
                            {items.length > 0 && (
                                <span className="rounded-full font-bold mx-1 bg-[#fa7316] text-xs font-semibold text-white px-2">
                                    {items.length}
                                </span>
                            )}
                        </button>
                    </div>
                </header>

                {/* Layout para pantallas grandes (≥1024px) - Diseño similar a SaleEditorDrawer */}
                <div className="hidden lg:flex flex-1 flex-col gap-6 overflow-hidden lg:flex-row lg:gap-8 min-h-0">
                    {/* Panel izquierdo - Menú de productos */}
                    <div className="flex flex-[2] flex-col gap-4 min-h-0">
                        <ProductGrid
                            products={products}
                            categories={categories}
                            branchId={branchId}
                            onAddProduct={addProduct}
                            showInventoryCheck={true}
                            gridClassName="grid md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                        />
                    </div>

                    {/* Panel derecho - Resumen de orden */}
                    <div className="flex flex-[1] flex-col min-h-0 w-80 relative">
                        {/* Contenido scrollable */}
                        <div className="flex-1 overflow-y-auto min-h-0 pb-24">
                            <div className="flex flex-col gap-4">
                                {/* Header del pedido */}
                                <div className="flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                        {table ? table.label : "Venta sin mesa"}
                                    </h3>
                                </div>

                                {/* Lista de productos ordenados */}
                                <OrderSummary
                                    items={items}
                                    products={products}
                                    branchId={branchId}
                                    onEdit={(productId) => setEditingItemId(productId)}
                                    onRemove={removeItem}
                                    onUpdateQuantity={updateItemQuantity}
                                    emptyStateMessage="Selecciona productos para construir el ticket."
                                />

                                {/* Resumen de pago */}
                                <div className="flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">
                                        Resumen de pago
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                                            <span>Subtotal</span>
                                            <span className="font-semibold">{formatCurrency(subtotal)}</span>
                                        </div>
                                        {tax > 0 && (
                                            <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                                                <span>Impuestos</span>
                                                <span className="font-semibold">{formatCurrency(tax)}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-slate-200 dark:border-slate-800 pt-2 mt-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-base font-semibold text-slate-900 dark:text-white">Total</span>
                                                <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Detalles del pedido (colapsable) */}
                                <div className="flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden dark:border-slate-800 dark:bg-slate-950/50">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsDetailsExpanded(!isDetailsExpanded)
                                        }
                                        className="w-full flex items-center justify-between p-4 text-left text-slate-900 hover:bg-slate-100 transition dark:text-white dark:hover:bg-slate-900/50"
                                    >
                                        <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">
                                            Detalles del pedido
                                        </h3>
                                        <span className="text-slate-500 dark:text-slate-400">
                                            {isDetailsExpanded ? (
                                                <IoIosArrowUp />
                                            ) : (
                                                <IoIosArrowDown />
                                            )}
                                        </span>
                                    </button>
                                    {isDetailsExpanded && (
                                        <div className="space-y-4 p-4 border-t border-slate-200 dark:border-slate-800">
                                            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
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
                                                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                                            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                Notas
                                                <textarea
                                                    value={notes}
                                                    onChange={(event) =>
                                                        setNotes(event.target.value)
                                                    }
                                                    rows={3}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                                    placeholder="Agregar algún detalle del pedido o mesa"
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Botones de acción - Sticky al bottom */}
                        <div className="sticky bottom-0 flex-shrink-0 flex flex-col gap-2 pt-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={handleSubmit}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 cursor-pointer disabled:bg-slate-400 disabled:hover:bg-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
                                disabled={isSubmitting || items.length === 0}
                            >
                                {isSubmitting ? "Guardando..." : "Crear venta"}
                            </button>
                            <button
                                type="button"
                                onClick={handleClose}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 cursor-pointer"
                                disabled={isSubmitting}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>

                {/* Layout para pantallas pequeñas (<1024px) - Sistema de Tabs */}
                <div className="lg:hidden flex flex-1 flex-col gap-4 lg:gap-6 overflow-hidden min-h-0 overflow-y-auto">
                    {activeTab === "catalogo" && (
                        <div className="flex flex-1 flex-col gap-4 min-h-0">
                            <ProductGrid
                                products={products}
                                categories={categories}
                                branchId={branchId}
                                onAddProduct={addProduct}
                                gridClassName="grid grid-cols-2 md:grid-cols-2 gap-3"
                                showInventoryCheck={true}
                            />
                        </div>
                    )}

                    {activeTab === "pedido" && (
                        <div className="flex flex-1 flex-col gap-4 overflow-y-auto min-h-0">
                            {/* Header del pedido */}
                            <div className="flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    {table ? table.label : "Venta sin mesa"}
                                </h3>
                            </div>

                            {/* Lista de productos ordenados */}
                            <OrderSummary
                                items={items}
                                products={products}
                                branchId={branchId}
                                onEdit={(productId) => setEditingItemId(productId)}
                                onRemove={removeItem}
                                onUpdateQuantity={updateItemQuantity}
                                emptyStateMessage="Selecciona productos para construir el ticket."
                            />

                            {/* Resumen de pago */}
                            <div className="flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                                <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500 mb-3">
                                    Resumen de pago
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                                        <span>Subtotal</span>
                                        <span className="font-semibold">{formatCurrency(subtotal)}</span>
                                    </div>
                                    {tax > 0 && (
                                        <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                                            <span>Impuestos</span>
                                            <span className="font-semibold">{formatCurrency(tax)}</span>
                                        </div>
                                    )}
                                    <div className="border-t border-slate-200 dark:border-slate-800 pt-2 mt-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-base font-semibold text-slate-900 dark:text-white">Total</span>
                                            <span className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(total)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detalles del pedido (colapsable) */}
                            <div className="flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden dark:border-slate-800 dark:bg-slate-950/50">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsDetailsExpanded(!isDetailsExpanded)
                                    }
                                    className="w-full flex items-center justify-between p-4 text-left text-slate-900 hover:bg-slate-100 transition dark:text-white dark:hover:bg-slate-900/50"
                                >
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">
                                        Detalles del pedido
                                    </h3>
                                    <span className="text-slate-500 dark:text-slate-400">
                                        {isDetailsExpanded ? (
                                            <IoIosArrowUp />
                                        ) : (
                                            <IoIosArrowDown />
                                        )}
                                    </span>
                                </button>
                                {isDetailsExpanded && (
                                    <div className="space-y-4 p-4 border-t border-slate-200 dark:border-slate-800">
                                        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
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
                                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                                        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            Notas
                                            <textarea
                                                value={notes}
                                                onChange={(event) =>
                                                    setNotes(event.target.value)
                                                }
                                                rows={3}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                                placeholder="Agregar algún detalle del pedido o mesa"
                                            />
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer solo visible en pantallas pequeñas - Sticky al bottom */}
                <footer className="lg:hidden sticky bottom-0 flex-shrink-0 flex flex-col gap-2 p-4 border-t border-slate-200 bg-white dark:bg-slate-900 shadow-lg">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 cursor-pointer disabled:bg-slate-400 disabled:hover:bg-slate-400 disabled:cursor-not-allowed disabled:opacity-70"
                        disabled={isSubmitting || items.length === 0}
                    >
                        {isSubmitting ? "Guardando..." : "Crear venta"}
                    </button>
                    <button
                        type="button"
                        onClick={handleClose}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 cursor-pointer"
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                </footer>
            </div>

            {editingItem && (
                <EditItemModal
                    item={editingItem}
                    onUpdateQuantity={updateItemQuantity}
                    onUpdateName={updateItemName}
                    onUpdatePrice={updateItemPrice}
                    onClose={() => setEditingItemId(null)}
                />
            )}
        </div>
    );
};

export default NewSaleModal;

