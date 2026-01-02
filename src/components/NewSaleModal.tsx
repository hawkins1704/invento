import { useMemo, useState } from "react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { ProductListItem } from "../types/products";
import EditItemModal, { type EditableItem } from "./EditItemModal";
import ProductGrid from "./ProductGrid";
import OrderItemsList from "./OrderItemsList";
import CloseButton from "./CloseButton";
import { useOrderItems } from "../hooks/useOrderItems";

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

    const editingItem = useMemo(() => {
        if (!editingItemId) return null;
        return items.find((i) => i.productId === editingItemId) ?? null;
    }, [editingItemId, items]);

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
                className={`relative flex w-full max-w-7xl flex-col gap-2 lg:gap-6 rounded-lg border border-slate-200 bg-white p-4 lg:p-6 text-slate-900 shadow-2xl shadow-black/60 dark:border-slate-800 dark:bg-slate-900/95 dark:text-white h-[90vh] max-h-[80vh] md:max-h-[90vh] overflow-y-auto ${isClosing ? "animate-[fadeOutScale_0.3s_ease-out]" : "animate-[fadeInScale_0.3s_ease-out]"}`}
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

                {/* Layout para pantallas grandes (≥1024px) - Mantiene el diseño original */}
                <div className="hidden lg:flex flex-1 flex-col gap-6 min-h-0 lg:flex-row lg:gap-8">
                    <div className="flex flex-3 flex-col gap-4 min-h-0">
                        <ProductGrid
                            products={products}
                            categories={categories}
                            branchId={branchId}
                            onAddProduct={addProduct}
                            showInventoryCheck={true}
                        />
                    </div>

                    <div className="flex flex-2 flex-col gap-4 overflow-y-auto min-h-0">
                        <div className="flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
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
                            <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
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

                        <OrderItemsList
                            items={items}
                            products={products}
                            branchId={branchId}
                            onEdit={(productId) => setEditingItemId(productId)}
                            onRemove={removeItem}
                            onUpdateQuantity={updateItemQuantity}
                            emptyStateMessage="Selecciona productos para construir el ticket."
                            showInventoryCheck={true}
                            useIconsForButtons={false}
                        />
                    </div>
                </div>

                {/* Layout para pantallas pequeñas (<1024px) - Sistema de Tabs */}
                <div className="lg:hidden flex flex-1 flex-col gap-6 min-h-0 overflow-y-auto">
                    {activeTab === "catalogo" && (
                        <div className="flex flex-1 flex-col gap-4 min-h-0">
                            <ProductGrid
                                products={products}
                                categories={categories}
                                branchId={branchId}
                                onAddProduct={addProduct}
                                gridClassName="grid grid-cols-1 md:grid-cols-2 gap-3"
                                showInventoryCheck={true}
                            />
                        </div>
                    )}

                    {activeTab === "pedido" && (
                        <div className="flex flex-1 flex-col gap-4 overflow-y-auto min-h-0">
                            <div className="flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
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
                                <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
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

                            <OrderItemsList
                                items={items}
                                products={products}
                                branchId={branchId}
                                onEdit={(productId) => setEditingItemId(productId)}
                                onRemove={removeItem}
                                onUpdateQuantity={updateItemQuantity}
                                emptyStateMessage="Selecciona productos para construir el ticket."
                                showInventoryCheck={true}
                                useIconsForButtons={false}
                            />
                        </div>
                    )}
                </div>

                <footer className="flex-shrink-0 flex flex-col gap-3 md:flex-row md:justify-end">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white cursor-pointer"
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

