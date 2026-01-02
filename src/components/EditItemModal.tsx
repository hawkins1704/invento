import type { Id } from "../../convex/_generated/dataModel";
import CloseButton from "./CloseButton";
import { IoMdAdd, IoMdRemove } from "react-icons/io";

type EditableItem = {
    productId: Id<"products">;
    productName: string;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
};

type EditItemModalProps = {
    item: EditableItem;
    onUpdateQuantity: (productId: Id<"products">, quantity: number) => void;
    onUpdateName: (productId: Id<"products">, productName: string) => void;
    onUpdatePrice: (productId: Id<"products">, unitPrice: number) => void;
    onClose: () => void;
};

const EditItemModal = ({
    item,
    onUpdateQuantity,
    onUpdateName,
    onUpdatePrice,
    onClose,
}: EditItemModalProps) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur dark:bg-slate-950/80"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Editar producto</h3>
                    <CloseButton onClick={onClose} />
                </div>
                <div className="space-y-4">
                    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Nombre del producto
                        <input
                            type="text"
                            value={item.productName}
                            onChange={(event) =>
                                onUpdateName(
                                    item.productId,
                                    event.target.value
                                )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            placeholder="Nombre del producto"
                        />
                    </label>
                    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Precio unitario (S/.)
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(event) =>
                                onUpdatePrice(
                                    item.productId,
                                    Math.max(0, Number(event.target.value) || 0)
                                )
                            }
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                            placeholder="0.00"
                        />
                    </label>
                    <div className="flex flex-col gap-2">
                        <label htmlFor="quantity-input" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            Cantidad
                        </label>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    onUpdateQuantity(item.productId, item.quantity - 1)
                                }
                                className="inline-flex h-9 flex-1 items-center justify-center rounded border border-slate-300 bg-slate-100 text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white cursor-pointer"
                                aria-label="Disminuir cantidad"
                            >
                                <IoMdRemove className="w-4 h-4" />
                            </button>
                            <input
                                id="quantity-input"
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={(event) =>
                                    onUpdateQuantity(
                                        item.productId,
                                        Number(event.target.value)
                                    )
                                }
                                className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-900 outline-none transition hover:border-slate-400 focus:border-[#fa7316] focus:ring-1 focus:ring-[#fa7316]/30 cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:hover:border-slate-600"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    onUpdateQuantity(item.productId, item.quantity + 1)
                                }
                                className="inline-flex h-9 flex-1 items-center justify-center rounded border border-slate-300 bg-slate-100 text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white cursor-pointer"
                                aria-label="Aumentar cantidad"
                            >
                                <IoMdAdd className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-4 py-2 text-sm font-semibold text-white  transition hover:bg-[#e86811] cursor-pointer"
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditItemModal;
export type { EditableItem };

