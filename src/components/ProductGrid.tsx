import { useEffect, useMemo, useState } from "react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { ProductListItem } from "../types/products";
import { formatCurrency } from "../utils/format";
import { BiDish } from "react-icons/bi";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { FaPlus } from "react-icons/fa";

type ProductGridProps = {
    products: ProductListItem[];
    categories: Doc<"categories">[];
    branchId: Id<"branches">;
    onAddProduct: (product: ProductListItem) => void;
    gridClassName?: string;
    productButtonPadding?: string;
    showInventoryCheck?: boolean; // Si true, verifica inventoryActivated antes de validar stock
};

const ProductGrid = ({
    products,
    categories,
    branchId,
    onAddProduct,
    gridClassName = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3",
    productButtonPadding = "p-2 lg:p-4",
    showInventoryCheck = true,
}: ProductGridProps) => {
    const [search, setSearch] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");

    const categoryOptions = useMemo(
        () => [
            { key: "all", label: "Todos" },
            ...categories.map((category) => ({
                key: category._id as string,
                label: category.name,
            })),
        ],
        [categories]
    );

    const filteredProducts = useMemo(() => {
        const query = search.trim().toLowerCase();
        return products.filter((product) => {
            const matchesSearch = product.name.toLowerCase().includes(query);
            const matchesCategory =
                selectedCategoryId === "all" ||
                (product.categoryId as unknown as string) ===
                    selectedCategoryId;
            return matchesSearch && matchesCategory;
        });
    }, [products, search, selectedCategoryId]);

    useEffect(() => {
        setSelectedCategoryId("all");
    }, [categories]);

    // Función helper para obtener el stock disponible de un producto
    const getAvailableStock = (product: ProductListItem): number => {
        const stockItem = product.stockByBranch.find(
            (item) => item.branchId === branchId
        );
        return stockItem?.stock ?? 0;
    };

    return (
        <div className="flex flex-col gap-4 min-h-0">
            <div className="flex-shrink-0 space-y-3">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Menú</h2>
                <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {categoryOptions.map((category) => {
                        const isActive = selectedCategoryId === category.key;
                        const itemCount = category.key === "all" 
                            ? products.length 
                            : products.filter(p => (p.categoryId as unknown as string) === category.key).length;
                        return (
                            <button
                                key={category.key}
                                type="button"
                                onClick={() =>
                                    setSelectedCategoryId(category.key)
                                }
                                className={`flex-shrink-0 flex items-center gap-3 rounded-lg px-4 py-2 transition ${
                                    isActive
                                        ? "border-[#fa7316] bg-[#fa7316]/10"
                                        : "border-slate-300 bg-slate-100 hover:border-[#fa7316]/40 dark:border-slate-700 dark:bg-slate-800"
                                }`}
                            >
                                <div className="text-left">
                                    <p className={`text-sm font-semibold ${
                                        isActive
                                            ? "text-slate-900 dark:text-white"
                                            : "text-slate-700 dark:text-slate-300"
                                    }`}>
                                        {category.label}
                                    </p>
                                    <p className={`text-xs ${
                                        isActive
                                            ? "text-slate-700 dark:text-slate-300"
                                            : "text-slate-500 dark:text-slate-400"
                                    }`}>
                                        {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex-shrink-0 flex items-center gap-2">
                <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar productos"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
                <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 text-xs uppercase tracking-[0.1em] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {filteredProducts.length}
                </span>
            </div>

            <div className="flex-1 rounded-lg overflow-y-auto min-h-0 ">
                {filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                        <FaMagnifyingGlass className="w-8 h-8" />
                        <p>
                            No se encontraron productos para los filtros
                            seleccionados.
                        </p>
                    </div>
                ) : (
                    <div className={gridClassName}>
                        {filteredProducts.map((product) => {
                            const inventoryActivated =
                                product.inventoryActivated ?? false;
                            const availableStock = getAvailableStock(product);
                            const allowNegativeSale =
                                product.allowNegativeSale ?? false;

                            // Validar stock según la configuración
                            // Si showInventoryCheck es false, no verificar stock en absoluto
                            // Si showInventoryCheck es true, solo verificar si inventoryActivated está activado
                            const isOutOfStock = showInventoryCheck
                                ? inventoryActivated &&
                                  availableStock <= 0 &&
                                  !allowNegativeSale
                                : false; // No verificar stock cuando showInventoryCheck es false

                            return (
                                <div
                                    key={product._id}
                                    className={`group relative flex flex-col cursor-pointer  rounded-lg ${productButtonPadding} border border-slate-200 dark:border-slate-800  ${
                                        isOutOfStock
                                            ? "bg-red-50 dark:bg-red-500/10"
                                            : "bg-slate-100 dark:bg-slate-800/50"
                                    }`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAddProduct(product);
                                    }}
                                >
                                    {/* Texto superior - alineado a la izquierda */}
                                    <div className="flex flex-col gap-1 mb-3 text-left">
                                        <p
                                            className={`text-base font-bold ${isOutOfStock ? "text-red-800 dark:text-red-100" : "text-slate-900 dark:text-white"}`}
                                        >
                                            {product.name}
                                        </p>
                                        {(product.categoryName || product.description) && (
                                            <p
                                                className={`text-xs ${isOutOfStock ? "text-red-700 dark:text-red-200/80" : "text-slate-500 dark:text-slate-400"}`}
                                            >
                                                {product.categoryName || product.description}
                                            </p>
                                        )}
                                    </div>

                                    {/* Imagen del producto - sin redondear */}
                                    <div className="w-full aspect-square mb-3 flex-shrink-0 rounded-lg overflow-hidden">
                                        {product.imageUrl ? (
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-slate-700">
                                                <BiDish className="w-16 h-16 text-slate-400 dark:text-slate-500" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Precio */}
                                    <div className="mb-3 text-left">
                                        <p
                                            className={`text-xl  font-bold ${isOutOfStock ? "text-red-800 dark:text-red-100" : "text-slate-900 dark:text-white"}`}
                                        >
                                            {formatCurrency(product.price)}
                                        </p>
                                    </div>
                                    {inventoryActivated && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Stock: {availableStock}
                                            </p>
                                        )}
                                        {isOutOfStock && (
                                            <p className="text-xs font-semibold text-red-700 dark:text-red-200/80">
                                               AGOTADO
                                            </p>
                                        )}

                                    {/* Botón circular flotante en esquina inferior derecha */}
                                    {!isOutOfStock && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddProduct(product);
                                            }}
                                            className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-900   dark:bg-slate-700 dark:text-white cursor-pointer"
                                            aria-label="Agregar producto"
                                        >
                                            <FaPlus
                                                className="w-3 h-3"
                                            />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductGrid;
