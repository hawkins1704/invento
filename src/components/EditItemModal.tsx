import type { Id } from "../../convex/_generated/dataModel";
import { formatCurrency } from "../utils/format";
import CloseButton from "./CloseButton";
import { IoMdAdd, IoMdRemove } from "react-icons/io";

type EditableItem = {
    productId: Id<"products">;
    productName: string;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
    discountAmount: number;
};

type EditItemModalProps = {
    item: EditableItem;
    onUpdateQuantity: (productId: Id<"products">, quantity: number) => void;
    onUpdateDiscount: (productId: Id<"products">, discountAmount: number) => void;
    onClose: () => void;
};

const EditItemModal = ({
    item,
    onUpdateQuantity,
    onUpdateDiscount,
    onClose,
}: EditItemModalProps) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur"
                onClick={onClose}
            />
            <div className="relative w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Editar producto</h3>
                    <CloseButton onClick={onClose} />
                </div>
                <div className="mb-4">
                    <p className="font-semibold text-white">{item.productName}</p>
                    <p className="text-xs text-slate-400">
                        {formatCurrency(item.unitPrice)}
                    </p>
                </div>
                <div className="space-y-4">
                    <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
                        Cantidad
                        <div className="flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    onUpdateQuantity(item.productId, item.quantity - 1)
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
                                    onUpdateQuantity(
                                        item.productId,
                                        Number(event.target.value)
                                    )
                                }
                                className="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-center text-sm font-semibold text-white outline-none transition focus:border-[#fa7316] focus:ring-1 focus:ring-[#fa7316]/30 cursor-pointer"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    onUpdateQuantity(item.productId, item.quantity + 1)
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
                            value={item.discountAmount}
                            onChange={(event) =>
                                onUpdateDiscount(
                                    item.productId,
                                    Math.max(0, Number(event.target.value) || 0)
                                )
                            }
                            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                            placeholder="0.00"
                        />
                    </label>
                    {item.discountAmount > 0 && (
                        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm">
                            <div className="flex items-center justify-between text-slate-200">
                                <span>Subtotal:</span>
                                <span className="line-through text-slate-400">
                                    {formatCurrency(
                                        item.quantity * item.unitPrice
                                    )}
                                </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between font-semibold text-white">
                                <span>Total con descuento:</span>
                                <span className="text-emerald-300">
                                    {formatCurrency(
                                        item.quantity * item.unitPrice -
                                            item.discountAmount
                                    )}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#fa7316] hover:text-white cursor-pointer"
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

