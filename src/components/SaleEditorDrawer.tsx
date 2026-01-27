import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { ProductListItem } from "../types/products";
import { formatCurrency, formatTime, formatDuration } from "../utils/format";
import EditItemModal, { type EditableItem } from "./EditItemModal";
import ProductGrid from "./ProductGrid";
import OrderSummary from "./OrderSummary";
import CloseButton from "./CloseButton";
import { IoIosArrowUp, IoIosArrowDown } from "react-icons/io";
import { useOrderItems } from "../hooks/useOrderItems";
import { MdDelete } from "react-icons/md";

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
            productName?: string;
            quantity: number;
            unitPrice: number;
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
        paymentMethod: "Contado" | "Credito",
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
                productName: item.productName ?? product?.name ?? "Producto",
                imageUrl: product?.imageUrl ?? null,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
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
    const isSavingRef = useRef(false);
    const lastSyncedSaleIdRef = useRef<Id<"sales"> | null>(null);

    useEffect(() => {
        // Inicializar items desde sale
        const initialItems = sale.items.map((item) => {
            const product = products.find(
                (productItem) => productItem._id === item.productId
            );
            return {
                productId: item.productId,
                productName: item.productName ?? product?.name ?? "Producto",
                imageUrl: product?.imageUrl ?? null,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
            };
        });

        const currentSaleId = sale.sale._id;
        const isNewSale = lastSyncedSaleIdRef.current !== currentSaleId;
        const hasPendingChanges = saveTimeoutRef.current !== null || isSavingRef.current;
        
        // Solo sincronizar si:
        // 1. Es la carga inicial (isInitialMountRef.current), O
        // 2. Es una nueva venta seleccionada (isNewSale), O
        // 3. No hay cambios pendientes Y los items del servidor son diferentes a los locales
        const shouldSync = 
            isInitialMountRef.current || 
            isNewSale ||
            (!hasPendingChanges && JSON.stringify(initialItems) !== JSON.stringify(previousItemsRef.current));

        if (shouldSync) {
            setItems(initialItems);
            previousItemsRef.current = initialItems;
            lastSyncedSaleIdRef.current = currentSaleId;
        }
        
        saleIdRef.current = currentSaleId;
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
            
            isSavingRef.current = true;
            try {
                await onSaveItems(
                    saleIdRef.current,
                    items.map((item) => ({
                        productId: item.productId,
                        productName: item.productName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                    }))
                );
                // Actualizar la referencia solo después de guardar exitosamente
                previousItemsRef.current = items;
            } catch (error) {
                console.error("Error al guardar items automáticamente:", error);
            } finally {
                isSavingRef.current = false;
                saveTimeoutRef.current = null;
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
            return accumulator + item.quantity * item.unitPrice;
        }, 0);
    }, [items]);

    const subtotal = useMemo(() => {
        // Por ahora, el subtotal es igual al total (sin impuestos)
        // Esto puede ajustarse si se agregan impuestos
        return total;
    }, [total]);

    const tax = useMemo(() => {
        // Calcular impuestos si es necesario (IGV 18% en Perú)
        // Por ahora retornamos 0, pero puede calcularse como total - subtotal
        return 0;
    }, []);

    const editingItem = useMemo(() => {
        if (!editingItemId) return null;
        return items.find((i) => i.productId === editingItemId) ?? null;
    }, [editingItemId, items]);

    const {
        addProduct: addProductBase,
        updateItemQuantity: updateItemQuantityBase,
        removeItem: removeItemBase,
        updateItemName: updateItemNameBase,
        updateItemPrice: updateItemPriceBase,
    } = useOrderItems({
        items,
        setItems,
        products,
        branchId,
        showInventoryCheck: true, // Validar stock al agregar nuevos productos
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

    const updateItemName = useCallback(
        (productId: Id<"products">, productName: string) => {
            isInitialMountRef.current = false; // Permitir guardado inmediatamente
            updateItemNameBase(productId, productName);
        },
        [updateItemNameBase]
    );

    const updateItemPrice = useCallback(
        (productId: Id<"products">, unitPrice: number) => {
            isInitialMountRef.current = false; // Permitir guardado inmediatamente
            updateItemPriceBase(productId, unitPrice);
        },
        [updateItemPriceBase]
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
                className={`absolute inset-0 bg-black/40 backdrop-blur dark:bg-slate-950/70 ${isClosing ? "animate-[fadeOut_0.3s_ease-out]" : "animate-[fadeIn_0.2s_ease-out]"}`}
            />
            <div
                className={`relative flex flex-col w-full h-full bg-white text-slate-900 shadow-xl shadow-black/50 dark:bg-slate-900 dark:text-white ${isClosing ? "animate-[fadeOutScale_0.3s_ease-out]" : "animate-[fadeInScale_0.3s_ease-out]"}`}
            >
                <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                        {sale.table?.label ? `${sale.table.label}` : "Venta sin mesa"}
                    </h2>
                    <CloseButton onClick={handleClose} />
                </header>

                {/* Layout para pantallas grandes (≥1024px) - Diseño similar a la referencia */}
                <div className="hidden lg:flex flex-1 flex-col gap-6 overflow-hidden p-6 lg:flex-row lg:gap-8 min-h-0">
                    {/* Panel izquierdo - Menú de productos */}
                    <div className="flex flex-[2] flex-col gap-4 min-h-0">
                        <ProductGrid
                            products={products}
                            categories={categories}
                            branchId={branchId}
                            onAddProduct={addItem}
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
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                            {sale.table?.label ? `${sale.table.label}` : "Venta sin mesa"}
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={() => onCancelSale(sale.sale._id)}
                                            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                                            aria-label="Eliminar pedido"
                                        >
                                            <MdDelete className="w-5 h-5 text-red-600 dark:text-red-400" />
                                        </button>
                                    </div>
                                </div>

                                {/* Lista de productos ordenados */}
                                <OrderSummary
                                    items={items}
                                    products={products}
                                    branchId={branchId}
                                    onEdit={(productId) => setEditingItemId(productId)}
                                    onRemove={removeItem}
                                    onUpdateQuantity={updateItemQuantity}
                                    emptyStateMessage="Aún no hay productos en este pedido. Selecciona productos desde el catálogo."
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
                                                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                                            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
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
                                                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                                            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                Notas del pedido
                                                <textarea
                                                    value={saleNotes}
                                                    onChange={(event) =>
                                                        setSaleNotes(event.target.value)
                                                    }
                                                    rows={3}
                                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                            </div>
                        </div>

                        {/* Botones de acción - Sticky al bottom */}
                        <div className="sticky bottom-0 flex-shrink-0 flex flex-col gap-2 pt-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
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
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 cursor-pointer"
                            >
                                Concluir venta
                            </button>
                            <button
                                type="button"
                                onClick={() => onCancelSale(sale.sale._id)}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 cursor-pointer"
                            >
                                Cancelar venta
                            </button>
                        </div>
                    </div>
                </div>

                <div className="lg:hidden flex flex-1 flex-col gap-4 lg:gap-6 overflow-hidden p-4 lg:p-6 min-h-0 overflow-y-auto pb-40">
                    {/* Layout para pantallas pequeñas (<1024px) - Sistema de Tabs */}
                    {/* Tabs solo visibles en pantallas menores a 1024px */}
                    <div className="lg:hidden flex gap-2 mt-2">
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
                                showInventoryCheck={true}
                            />
                        </div>
                    )}

                    {activeTab === "pedido" && (
                        <div className="flex flex-1 flex-col gap-4 overflow-y-auto min-h-0">
                            {/* Header del pedido */}
                            <div className="flex-shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                                    {sale.table?.label ? `Mesa ${sale.table.label}` : "Venta sin mesa"}
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
                                emptyStateMessage="Aún no hay productos en este pedido. Selecciona productos desde el catálogo."
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
                                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                                        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
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
                                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                                        <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            Notas del pedido
                                            <textarea
                                                value={saleNotes}
                                                onChange={(event) =>
                                                    setSaleNotes(
                                                        event.target.value
                                                    )
                                                }
                                                rows={3}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                        </div>
                    )}
                </div>

                {/* Footer solo visible en pantallas pequeñas - Sticky al bottom */}
                <footer className="lg:hidden sticky bottom-0 flex-shrink-0 flex flex-col gap-4 p-4 border-t border-slate-200 bg-white dark:bg-slate-900 shadow-lg">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">
                                Total
                            </span>
                            <span className="text-2xl font-bold text-slate-900 dark:text-white">
                                {formatCurrency(total)}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-500">
                                    Creada:
                                </span>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                    {formatTime(sale.sale.openedAt)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-500">
                                    Tiempo en mesa:
                                </span>
                                <span className="font-semibold text-slate-900 dark:text-white">
                                    {formatDuration(
                                        sale.sale.openedAt,
                                        Date.now()
                                    )}
                                </span>
                            </div>
                        </div>
                        {/* Botones de acciones */}
                        <div className="flex gap-2">
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
                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 cursor-pointer"
                            >
                                Concluir venta
                            </button>
                            <button
                                type="button"
                                onClick={() => onCancelSale(sale.sale._id)}
                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 cursor-pointer"
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
                        onUpdateName={updateItemName}
                        onUpdatePrice={updateItemPrice}
                        onClose={() => setEditingItemId(null)}
                    />
                )}
            </div>
        </div>
    );
};

export default SaleEditorDrawer;
