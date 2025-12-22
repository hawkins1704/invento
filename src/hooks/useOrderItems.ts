import { useCallback } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import type { ProductListItem } from "../types/products";
import { type EditableItem } from "../components/EditItemModal";

type UseOrderItemsProps = {
    items: EditableItem[];
    setItems: React.Dispatch<React.SetStateAction<EditableItem[]>>;
    products: ProductListItem[];
    branchId: Id<"branches">;
    showInventoryCheck?: boolean; // Si true, verifica inventoryActivated antes de validar stock
};

/**
 * Hook para manejar la lógica de items del pedido con validación de stock
 */
export const useOrderItems = ({
    items,
    setItems,
    products,
    branchId,
    showInventoryCheck = true,
}: UseOrderItemsProps) => {
    // Función helper para obtener el stock disponible de un producto
    const getAvailableStock = useCallback(
        (product: ProductListItem): number => {
            const stockItem = product.stockByBranch.find(
                (item) => item.branchId === branchId
            );
            return stockItem?.stock ?? 0;
        },
        [branchId]
    );

    /**
     * Agrega un producto a la lista de items
     */
    const addProduct = useCallback(
        (product: ProductListItem) => {
            const inventoryActivated = product.inventoryActivated ?? false;

            // Si el inventario no está activado, permitir agregar sin validaciones
            if (showInventoryCheck && !inventoryActivated) {
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
        },
        [setItems, getAvailableStock, showInventoryCheck]
    );

    /**
     * Actualiza la cantidad de un item
     */
    const updateItemQuantity = useCallback(
        (productId: Id<"products">, quantity: number) => {
            // Encontrar el producto para obtener su configuración de stock
            const product = products.find((p) => p._id === productId);
            if (!product) {
                return;
            }

            const inventoryActivated = product.inventoryActivated ?? false;

            // Si el inventario no está activado, permitir cualquier cantidad
            if (showInventoryCheck && !inventoryActivated) {
                setItems((previous) =>
                    previous
                        .map((item) => {
                            if (item.productId !== productId) {
                                return item;
                            }
                            return { ...item, quantity: Math.max(1, quantity) };
                        })
                        .filter((item) => item.quantity > 0)
                );
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
        },
        [products, setItems, getAvailableStock, showInventoryCheck]
    );

    /**
     * Elimina un item de la lista
     */
    const removeItem = useCallback(
        (productId: Id<"products">) => {
            setItems((previous) =>
                previous.filter((item) => item.productId !== productId)
            );
        },
        [setItems]
    );

    /**
     * Actualiza el descuento de un item
     */
    const updateItemDiscount = useCallback(
        (productId: Id<"products">, discountAmount: number) => {
            setItems((previous) =>
                previous.map((line) =>
                    line.productId === productId
                        ? {
                              ...line,
                              discountAmount: Math.max(0, discountAmount),
                          }
                        : line
                )
            );
        },
        [setItems]
    );

    /**
     * Valida el stock de todos los items antes de guardar
     * Retorna un array de errores si hay problemas de stock
     */
    const validateStock = useCallback((): string[] => {
        const stockErrors: string[] = [];
        for (const item of items) {
            const product = products.find((p) => p._id === item.productId);
            if (!product) {
                continue;
            }

            const inventoryActivated = product.inventoryActivated ?? false;

            // Si el inventario no está activado, saltar validación
            if (showInventoryCheck && !inventoryActivated) {
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
        return stockErrors;
    }, [items, products, getAvailableStock, showInventoryCheck]);

    return {
        addProduct,
        updateItemQuantity,
        removeItem,
        updateItemDiscount,
        validateStock,
        getAvailableStock,
    };
};

