import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { ProductListItem } from "../types/products";
import { formatCurrency, formatTime, formatDuration } from "../utils/format";
import EditItemModal, { type EditableItem } from "./EditItemModal";
import ProductGrid from "./ProductGrid";
import OrderItemsList from "./OrderItemsList";
import CloseButton from "./CloseButton";
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io";
import { useOrderItems } from "../hooks/useOrderItems";

type LiveSale = {
    sale: Doc<"sales">;
    items: Doc<"saleItems">[];
    table?: Doc<"branchTables"> | null;
    staff?: Doc<"staff"> | null;
};

type SaleEditorDrawerProps = {
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
}: SaleEditorDrawerProps) => {
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

    const [saleNotes, setSaleNotes] = useState(sale.sale.notes ?? "");
    const [selectedTableId, setSelectedTableId] = useState<
        Id<"branchTables"> | ""
    >(sale.sale.tableId ? (sale.sale.tableId as Id<"branchTables">) : "");
    const [selectedStaffId, setSelectedStaffId] = useState<Id<"staff"> | "">(
        sale.sale.staffId ? (sale.sale.staffId as Id<"staff">) : ""
    );
    const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);
    const [editingItemId, setEditingItemId] = useState<Id<"products"> | null>(
        null
    );
    const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<"catalogo" | "pedido">(
        "catalogo"
    );
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const previousItemsRef = useRef<EditableItem[]>([]);
    const isInitialMountRef = useRef(true);
    const saleIdRef = useRef<Id<"sales"> | null>(null);

    useEffect(() => {
        // Inicializar items desde sale
        const initialItems = sale.items.map((item) => {
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
        });

        setItems(initialItems);
        previousItemsRef.current = initialItems;
        saleIdRef.current = sale.sale._id;
        setSaleNotes(sale.sale.notes ?? "");
        setSelectedTableId(
            sale.sale.tableId ? (sale.sale.tableId as Id<"branchTables">) : ""
        );
        setSelectedStaffId(
            sale.sale.staffId ? (sale.sale.staffId as Id<"staff">) : ""
        );
        
        // Marcar que la carga inicial está completa después de un pequeño delay
        // Esto evita que se guarde inmediatamente cuando se sincroniza desde sale
        const timeoutId = setTimeout(() => {
            isInitialMountRef.current = false;
        }, 150);
        
        return () => {
            clearTimeout(timeoutId);
        };
    }, [sale, products]);

    // Guardado automático cuando cambian los items
    useEffect(() => {
        // No guardar durante la carga inicial
        if (isInitialMountRef.current) {
            // Actualizar la referencia para la próxima vez
            previousItemsRef.current = items;
            return;
        }

        // Comparar si los items realmente cambiaron (comparación profunda)
        const itemsChanged = JSON.stringify(items) !== JSON.stringify(previousItemsRef.current);
        
        if (!itemsChanged) {
            return;
        }

        // Limpiar timeout anterior si existe
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Guardar después de 500ms de inactividad (debounce)
        saveTimeoutRef.current = setTimeout(async () => {
            if (!saleIdRef.current) return;
            
            try {
                await onSaveItems(
                    saleIdRef.current,
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
                // Actualizar la referencia solo después de guardar exitosamente
                previousItemsRef.current = items;
            } catch (error) {
                console.error("Error al guardar items automáticamente:", error);
            }
        }, 500);

        // Cleanup
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [items, onSaveItems]);

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

    const {
        addProduct: addProductBase,
        updateItemQuantity: updateItemQuantityBase,
        removeItem: removeItemBase,
        updateItemDiscount: updateItemDiscountBase,
    } = useOrderItems({
        items,
        setItems,
        products,
        branchId,
        showInventoryCheck: false,
    });

    // Wrappers que actualizan el estado (el guardado automático se hace en el useEffect)
    // También marcamos que ya no estamos en la carga inicial cuando el usuario hace una acción
    const addItem = useCallback(
        (product: ProductListItem) => {
            isInitialMountRef.current = false; // Permitir guardado inmediatamente
            addProductBase(product);
        },
        [addProductBase]
    );

    const updateItemQuantity = useCallback(
        (productId: Id<"products">, quantity: number) => {
            isInitialMountRef.current = false; // Permitir guardado inmediatamente
            updateItemQuantityBase(productId, quantity);
        },
        [updateItemQuantityBase]
    );

    const removeItem = useCallback(
        (productId: Id<"products">) => {
            isInitialMountRef.current = false; // Permitir guardado inmediatamente
            removeItemBase(productId);
        },
        [removeItemBase]
    );

    const updateItemDiscount = useCallback(
        (productId: Id<"products">, discountAmount: number) => {
            isInitialMountRef.current = false; // Permitir guardado inmediatamente
            updateItemDiscountBase(productId, discountAmount);
        },
        [updateItemDiscountBase]
    );

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
                <header className="flex-shrink-0 flex flex-col gap-2 px-4 py-6 lg:p-6 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-md uppercase tracking-[0.1em] text-slate-400">
                                {sale.table?.label ?? "Venta sin mesa"}
                            </p>
                        </div>
                        <CloseButton onClick={handleClose} />
                    </div>
                </header>

                {/* Layout para pantallas grandes (≥1024px) - Mantiene el diseño original */}
                <div className="hidden lg:flex flex-1 flex-col gap-6 overflow-hidden p-6 lg:flex-row lg:gap-8 min-h-0">
                    <div className="flex flex-3 flex-col gap-4 min-h-0">
                        <ProductGrid
                            products={products}
                            categories={categories}
                            branchId={branchId}
                            onAddProduct={addItem}
                            showInventoryCheck={false}
                        />
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

                        <div className="space-y-3">
                            <OrderItemsList
                                items={items}
                                products={products}
                                branchId={branchId}
                                onEdit={(productId) =>
                                    setEditingItemId(productId)
                                }
                                onRemove={removeItem}
                                onUpdateQuantity={updateItemQuantity}
                                emptyStateMessage="Aún no hay productos en este pedido. Selecciona productos desde el catálogo."
                                showInventoryCheck={false}
                                useIconsForButtons={true}
                            />
                        </div>
                    </div>
                </div>

                <div className="lg:hidden flex flex-1 flex-col gap-4 lg:gap-6 overflow-hidden p-4 lg:p-6 min-h-0 overflow-y-auto">
                    {/* Layout para pantallas pequeñas (<1024px) - Sistema de Tabs */}
                    {/* Tabs solo visibles en pantallas menores a 1024px */}
                    <div className="lg:hidden flex gap-2 mt-2">
                        <button
                            type="button"
                            onClick={() => setActiveTab("catalogo")}
                            className={`flex-1 px-4 py-2 text-sm font-semibold transition border-1 rounded-lg ${
                                activeTab === "catalogo"
                                    ? "border-[#fa7316] bg-[#fa7316]/10 text-white"
                                    : "border-transparent text-slate-400 hover:text-slate-300"
                            }`}
                        >
                            CATÁLOGO
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab("pedido")}
                            className={`flex-1 px-4 py-2 text-sm font-semibold transition border-1 rounded-lg flex items-center justify-center ${
                                activeTab === "pedido"
                                    ? "border-[#fa7316] bg-[#fa7316]/10 text-white"
                                    : "border-transparent text-slate-400 hover:text-slate-300"
                            }`}
                        >
                            PEDIDO
                            {items.length > 0 && (
                                <span className="rounded-full font-bold mx-1 bg-[#fa7316] text-xs font-semibold text-white px-2 py-1">
                                    {items.length}
                                </span>
                            )}
                        </button>
                    </div>
                    {activeTab === "catalogo" && (
                        <div className="flex flex-1 flex-col gap-4 min-h-0">
                            <ProductGrid
                                products={products}
                                categories={categories}
                                branchId={branchId}
                                onAddProduct={addItem}
                                gridClassName="grid grid-cols-1 md:grid-cols-2 gap-3"
                                showInventoryCheck={false}
                            />
                        </div>
                    )}

                    {activeTab === "pedido" && (
                        <div className="flex flex-1 flex-col gap-4 overflow-y-auto min-h-0">
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
                                                <option value="">
                                                    Sin mesa
                                                </option>
                                                {tables.map((table) => (
                                                    <option
                                                        key={table._id}
                                                        value={
                                                            table._id as string
                                                        }
                                                        disabled={
                                                            Boolean(
                                                                table.currentSaleId
                                                            ) &&
                                                            table._id !==
                                                                sale.sale
                                                                    .tableId
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
                                                        value={
                                                            member._id as string
                                                        }
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
                                                    setSaleNotes(
                                                        event.target.value
                                                    )
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

                            <div className="space-y-3">
                                <OrderItemsList
                                    items={items}
                                    products={products}
                                    branchId={branchId}
                                    onEdit={(productId) =>
                                        setEditingItemId(productId)
                                    }
                                    onRemove={removeItem}
                                    onUpdateQuantity={updateItemQuantity}
                                    emptyStateMessage="Aún no hay productos en este pedido. Selecciona productos desde el catálogo."
                                    showInventoryCheck={false}
                                    useIconsForButtons={true}
                                />
                            </div>
                        </div>
                    )}
                </div>

                <footer className="flex-shrink-0 flex flex-col gap-4 p-4 pb-6 lg:pb-4 border-t border-slate-800 bg-slate-900">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex md:flex-col justify-between gap-2">
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">
                                    Total
                                </span>
                                <span className="text-2xl font-semibold text-white">
                                    {formatCurrency(total)}
                                </span>
                            </div>
                            <div className="flex flex-col gap-1 text-sm text-slate-300">
                                <div className="flex items-center justify-end md:justify-start gap-1">
                                    <span className="text-xs sm:text-sm font-semibold text-slate-500">
                                        Creada:
                                    </span>
                                    <span className="font-semibold text-white">
                                        {formatTime(sale.sale.openedAt)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-end md:justify-start gap-1">
                                    <span className="hidden sm:block text-xs sm:text-sm font-semibold text-slate-500">
                                        Tiempo en mesa:
                                    </span>
                                    <span className="block sm:hidden text-xs sm:text-sm font-semibold text-slate-500">
                                        En mesa:
                                    </span>
                                    <span className="font-semibold text-white">
                                        {formatDuration(
                                            sale.sale.openedAt,
                                            Date.now()
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* Botones de acciones */}
                        <div className="flex gap-2 sm:justify-end ">
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
                                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/50 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200 cursor-pointer"
                            >
                                Concluir venta
                            </button>
                            <button
                                type="button"
                                onClick={() => onCancelSale(sale.sale._id)}
                                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-300 transition hover:border-red-400 hover:text-red-200 cursor-pointer"
                            >
                                Cancelar venta
                            </button>
                        </div>
                    </div>
                </footer>

                {editingItem && (
                    <EditItemModal
                        item={editingItem}
                        onUpdateQuantity={updateItemQuantity}
                        onUpdateDiscount={updateItemDiscount}
                        onClose={() => setEditingItemId(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default SaleEditorDrawer;
