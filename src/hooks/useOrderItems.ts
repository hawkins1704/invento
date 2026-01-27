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

            // Si showInventoryCheck es false, permitir agregar sin validaciones
            if (!showInventoryCheck) {
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
                        },
                    ];
                });
                return;
            }

            // Si showInventoryCheck es true, validar según configuración de inventario
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
                        },
                    ];
                });
                return;
            }

            // Producto es inventariable (inventoryActivated = true)
            // Validar stock disponible
            const allowNegativeSale = product.allowNegativeSale ?? false;
            const availableStock = getAvailableStock(product);

            // Si no permite venta en negativo y no hay stock disponible, bloquear agregar
            if (!allowNegativeSale && availableStock <= 0) {
                return; // No hacer nada, producto sin stock
            }

            setItems((previous) => {
                const existing = previous.find(
                    (item) => item.productId === product._id
                );
                if (existing) {
                    // Si el stock disponible es menor que la cantidad actual, significa que estamos
                    // editando un pedido existente donde el stock ya tiene las unidades restadas.
                    // En ese caso, necesitamos sumar las unidades ya en el pedido porque se
                    // liberarán antes de reservar de nuevo.
                    const isEditingExistingSale = availableStock < existing.quantity;
                    const effectiveAvailableStock = isEditingExistingSale 
                        ? availableStock + existing.quantity 
                        : availableStock;
                    const newQuantity = existing.quantity + 1;
                    
                    // Si permite venta en negativo, incrementar sin límite
                    // Si no permite, verificar que no exceda el stock disponible efectivo
                    if (!allowNegativeSale && newQuantity > effectiveAvailableStock) {
                        // No incrementar si excedería el stock disponible efectivo
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

            // Si showInventoryCheck es false, permitir cualquier cantidad
            if (!showInventoryCheck) {
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

            const inventoryActivated = product.inventoryActivated ?? false;

            // Si el inventario no está activado, permitir cualquier cantidad
            if (!inventoryActivated) {
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

            setItems((previous) => {
                // Encontrar el item actual para obtener su cantidad actual
                const currentItem = previous.find((item) => item.productId === productId);
                const currentQuantity = currentItem?.quantity ?? 0;
                
                // Si el stock disponible es menor que la cantidad actual, significa que estamos
                // editando un pedido existente donde el stock ya tiene las unidades restadas.
                // En ese caso, necesitamos sumar las unidades ya en el pedido porque se
                // liberarán antes de reservar de nuevo.
                const isEditingExistingSale = currentQuantity > 0 && availableStock < currentQuantity;
                const effectiveAvailableStock = isEditingExistingSale 
                    ? availableStock + currentQuantity 
                    : availableStock;

                return previous
                    .map((item) => {
                        if (item.productId !== productId) {
                            return item;
                        }
                        // Validar cantidad mínima
                        const minQuantity = 1;
                        let newQuantity = Math.max(minQuantity, quantity);

                        // Si no permite venta en negativo, limitar al stock disponible efectivo
                        if (!allowNegativeSale && newQuantity > effectiveAvailableStock) {
                            newQuantity = effectiveAvailableStock;
                        }

                        return { ...item, quantity: newQuantity };
                    })
                    .filter((item) => item.quantity > 0);
            });
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
     * Actualiza el nombre de un item (solo para esta venta)
     */
    const updateItemName = useCallback(
        (productId: Id<"products">, productName: string) => {
            setItems((previous) =>
                previous.map((line) =>
                    line.productId === productId
                        ? {
                              ...line,
                              productName: productName,
                          }
                        : line
                )
            );
        },
        [setItems]
    );

    /**
     * Actualiza el precio unitario de un item (solo para esta venta)
     */
    const updateItemPrice = useCallback(
        (productId: Id<"products">, unitPrice: number) => {
            setItems((previous) =>
                previous.map((line) =>
                    line.productId === productId
                        ? {
                              ...line,
                              unitPrice: Math.max(0, unitPrice),
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
        // Si showInventoryCheck es false, no validar stock
        if (!showInventoryCheck) {
            return [];
        }

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
        return stockErrors;
    }, [items, products, getAvailableStock, showInventoryCheck]);

    return {
        addProduct,
        updateItemQuantity,
        removeItem,
        updateItemName,
        updateItemPrice,
        validateStock,
        getAvailableStock,
    };
};

