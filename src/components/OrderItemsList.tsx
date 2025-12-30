import type { Id } from "../../convex/_generated/dataModel";
import type { ProductListItem } from "../types/products";
import { formatCurrency } from "../utils/format";
import { type EditableItem } from "./EditItemModal";
import { FaRegEdit } from "react-icons/fa";
import { MdDeleteOutline } from "react-icons/md";
import { IoMdAdd, IoMdRemove } from "react-icons/io";

type OrderItemsListProps = {
    items: EditableItem[];
    products: ProductListItem[];
    branchId: Id<"branches">;
    onEdit: (productId: Id<"products">) => void;
    onRemove: (productId: Id<"products">) => void;
    onUpdateQuantity: (productId: Id<"products">, quantity: number) => void;
    emptyStateMessage?: string;
    showInventoryCheck?: boolean; // Si true, verifica inventoryActivated antes de validar stock
    useIconsForButtons?: boolean; // Si true, usa iconos en lugar de símbolos +/-
};

const OrderItemsList = ({
    items,
    products,
    branchId,
    onEdit,
    onRemove,
    onUpdateQuantity,
    emptyStateMessage = "Selecciona productos para construir el ticket.",
    showInventoryCheck = true,
    useIconsForButtons = false,
}: OrderItemsListProps) => {
    // Función helper para obtener el stock disponible de un producto
    const getAvailableStock = (product: ProductListItem): number => {
        const stockItem = product.stockByBranch.find(
            (item) => item.branchId === branchId
        );
        return stockItem?.stock ?? 0;
    };

    return (
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
                    {emptyStateMessage}
                </div>
            ) : (
                <ul className="divide-y divide-slate-800 overflow-y-auto pr-1">
                    {items.map((item) => {
                        const product = products.find(
                            (p) => p._id === item.productId
                        );
                        const inventoryActivated =
                            product?.inventoryActivated ?? false;
                        const allowNegativeSale =
                            product?.allowNegativeSale ?? false;
                        const availableStock = product
                            ? getAvailableStock(product)
                            : 0;

                        // Determinar si se puede incrementar
                        let canIncrement = true;
                        if (product) {
                            if (!showInventoryCheck) {
                                // Si no se verifica inventoryActivated, solo verificar stock
                                canIncrement = allowNegativeSale || item.quantity < availableStock;
                            } else {
                                // Si se verifica inventoryActivated
                                if (!inventoryActivated) {
                                    canIncrement = true;
                                } else {
                                    canIncrement = allowNegativeSale || item.quantity < availableStock;
                                }
                            }
                        }

                        return (
                            <li
                                key={item.productId}
                                className="py-3 text-sm text-slate-200"
                            >
                                <div className="flex items-center justify-between gap-3 mb-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-white truncate">
                                            {item.productName}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {formatCurrency(item.unitPrice)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FaRegEdit
                                            className="w-4 h-4 text-slate-300 transition hover:text-[#fa7316] cursor-pointer"
                                            onClick={() => onEdit(item.productId)}
                                        />
                                        <MdDeleteOutline
                                            className="w-5 h-5 text-red-700 transition hover:text-red-300 cursor-pointer"
                                            onClick={() => onRemove(item.productId)}
                                            aria-label="Eliminar producto"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onUpdateQuantity(
                                                item.productId,
                                                item.quantity - 1
                                            )
                                        }
                                        className={`inline-flex h-9 flex-1 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-[#fa7316] hover:text-white ${
                                            useIconsForButtons ? "" : "cursor-pointer"
                                        }`}
                                        aria-label="Disminuir cantidad"
                                    >
                                        {useIconsForButtons ? (
                                            <IoMdRemove className="w-4 h-4" />
                                        ) : (
                                            "−"
                                        )}
                                    </button>
                                    <input
                                        type="number"
                                        min={1}
                                        value={item.quantity}
                                        onChange={(event) =>
                                            onUpdateQuantity(
                                                item.productId,
                                                Number(event.target.value)
                                            )
                                        }
                                        className="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white outline-none transition focus:border-[#fa7316] focus:ring-1 focus:ring-[#fa7316]/30"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            onUpdateQuantity(
                                                item.productId,
                                                item.quantity + 1
                                            )
                                        }
                                        disabled={!canIncrement}
                                        className={`inline-flex h-9 flex-1 items-center justify-center rounded border border-slate-700 bg-slate-900 text-slate-300 transition ${
                                            canIncrement
                                                ? "hover:border-[#fa7316] hover:text-white"
                                                : "cursor-not-allowed opacity-50"
                                        } ${useIconsForButtons ? "cursor-pointer" : ""}`}
                                        aria-label="Aumentar cantidad"
                                    >
                                        {useIconsForButtons ? (
                                            <IoMdAdd className="w-4 h-4" />
                                        ) : (
                                            "+"
                                        )}
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

export default OrderItemsList;

