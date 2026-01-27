import type { Id } from "../../convex/_generated/dataModel";
import type { ProductListItem } from "../types/products";
import { formatCurrency } from "../utils/format";
import { type EditableItem } from "./EditItemModal";
import { FaRegEdit, FaTrash } from "react-icons/fa";
import { FaPlus, FaMinus } from "react-icons/fa";

type OrderSummaryProps = {
    items: EditableItem[];
    products: ProductListItem[];
    branchId: Id<"branches">;
    onEdit: (productId: Id<"products">) => void;
    onRemove: (productId: Id<"products">) => void;
    onUpdateQuantity: (productId: Id<"products">, quantity: number) => void;
    emptyStateMessage?: string;
};

const OrderSummary = ({
    items,
    products,
    branchId,
    onEdit,
    onRemove,
    onUpdateQuantity,
    emptyStateMessage = "Selecciona productos para construir el ticket.",
}: OrderSummaryProps) => {
    // Función helper para obtener el stock disponible de un producto
    const getAvailableStock = (product: ProductListItem): number => {
        const stockItem = product.stockByBranch.find(
            (item) => item.branchId === branchId
        );
        return stockItem?.stock ?? 0;
    };

    // Función para determinar si se puede incrementar la cantidad
    const canIncrement = (item: EditableItem, product: ProductListItem | undefined): boolean => {
        if (!product) return true;
        
        const inventoryActivated = product.inventoryActivated ?? false;
        if (!inventoryActivated) return true;

        const allowNegativeSale = product.allowNegativeSale ?? false;
        if (allowNegativeSale) return true;

        const availableStock = getAvailableStock(product);
        // Si el stock disponible es menor que la cantidad actual, significa que estamos
        // editando un pedido existente donde el stock ya tiene las unidades restadas.
        const isEditingExistingSale = availableStock < item.quantity;
        const effectiveAvailableStock = isEditingExistingSale 
            ? availableStock + item.quantity 
            : availableStock;
        
        return (item.quantity + 1) <= effectiveAvailableStock;
    };

    return (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Productos ordenados ({items.length})
                </h3>
            </div>
            {items.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                    {emptyStateMessage}
                </div>
            ) : (
                <ul className="space-y-2 divide-y divide-slate-200 dark:divide-slate-800">
                    {items.map((item) => {
                        const product = products.find(
                            (p) => p._id === item.productId
                        );
                        const itemTotal = item.quantity * item.unitPrice;
                        const canAdd = canIncrement(item, product);

                        return (
                            <li
                                key={item.productId}
                                className="py-3"
                            >
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-900 dark:text-white">
                                                {item.quantity}x
                                            </span>
                                            <span className="font-semibold text-slate-900 dark:text-white truncate">
                                                {item.productName}
                                            </span>
                                        </div>
                                        {product?.description && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                                                {product.description}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                            {formatCurrency(itemTotal)}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => onEdit(item.productId)}
                                                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                                aria-label="Editar producto"
                                            >
                                                <FaRegEdit className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onRemove(item.productId)}
                                                className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                                                aria-label="Eliminar producto"
                                            >
                                                <FaTrash className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {/* Botones de incrementar/disminuir cantidad */}
                                <div className="flex items-center gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                                        disabled={item.quantity <= 1}
                                        className={`w-8 h-8 rounded-full bg-white flex items-center justify-center transition transform hover:scale-110 dark:bg-slate-700 dark:text-white ${
                                            item.quantity <= 1
                                                ? "opacity-50 cursor-not-allowed"
                                                : "hover:bg-slate-50 dark:hover:bg-slate-600"
                                        }`}
                                        aria-label="Disminuir cantidad"
                                    >
                                        <FaMinus className="w-3 h-3 text-slate-900 dark:text-white" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                                        disabled={!canAdd}
                                        className={`w-8 h-8 rounded-full bg-white flex items-center justify-center transition transform hover:scale-110 dark:bg-slate-700 dark:text-white ${
                                            !canAdd
                                                ? "opacity-50 cursor-not-allowed"
                                                : "hover:bg-slate-50 dark:hover:bg-slate-600"
                                        }`}
                                        aria-label="Aumentar cantidad"
                                    >
                                        <FaPlus className="w-3 h-3 text-slate-900 dark:text-white" />
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default OrderSummary;
