import { useEffect, useMemo, useState } from "react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import type { ProductListItem } from "../types/products";
import { formatCurrency } from "../utils/format";
import { BiDish } from "react-icons/bi";
import { FaMagnifyingGlass } from "react-icons/fa6";

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
    gridClassName = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3",
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
            <div className="hidden lg:block flex-shrink-0 space-y-3">
                <div className=" flex items-center gap-2 overflow-x-auto pb-1">
                    {categoryOptions.map((category) => {
                        const isActive = selectedCategoryId === category.key;
                        return (
                            <button
                                key={category.key}
                                type="button"
                                onClick={() =>
                                    setSelectedCategoryId(category.key)
                                }
                                className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition ${
                                    isActive
                                        ? "border-[#fa7316] bg-[#fa7316]/10 text-white "
                                        : "border-slate-700 bg-slate-950/40 text-slate-300 hover:border-[#fa7316]/40 hover:text-white"
                                }`}
                            >
                                {category.label}
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
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                />
                <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.1em] text-slate-300">
                    {filteredProducts.length}
                </span>
            </div>

            <div className="flex-1 rounded-lg overflow-y-auto min-h-0 bg-slate-950/50 p-3 border border-slate-800">
                {filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-sm text-slate-400">
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
                            const isOutOfStock = showInventoryCheck
                                ? inventoryActivated &&
                                  availableStock <= 0 &&
                                  !allowNegativeSale
                                : availableStock <= 0 && !allowNegativeSale;

                            return (
                                <button
                                    key={product._id}
                                    type="button"
                                    onClick={() => onAddProduct(product)}
                                    className={`flex flex-row lg:flex-col items-center justify-center h-full gap-3 rounded-lg border ${productButtonPadding} text-left text-sm transition border-slate-800 ${
                                        isOutOfStock
                                            ? "cursor-not-allowed border-red-500/40 bg-red-500/10 text-red-200"
                                            : "border-slate-800 bg-slate-900/60 text-slate-200 hover:border-[#fa7316] hover:text-white"
                                    }`}
                                    disabled={isOutOfStock}
                                >
                                    <div className="flex-shrink-0 lg:w-full h-16 lg:h-auto aspect-square rounded-lg  overflow-hidden border border-slate-800 bg-slate-900/50">
                                        {product.imageUrl ? (
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-500">
                                                <BiDish className="w-10 h-10" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col gap-2 min-w-0 items-center justify-center">
                                        <div className="space-y-1">
                                            {inventoryActivated && (
                                                <p className="text-xs text-slate-400 text-center">
                                                    Stock: {availableStock}
                                                </p>
                                            )}
                                            {isOutOfStock && (
                                                <p className="text-xs text-red-200/80 text-center">
                                                    Producto agotado
                                                </p>
                                            )}
                                            <p
                                                className={`text-sm font-semibold ${isOutOfStock ? "text-red-100" : "text-white"} line-clamp-2 text-center`}
                                            >
                                                {product.name}
                                            </p>
                                            <p
                                                className={`text-xs ${isOutOfStock ? "text-red-200/80" : "text-slate-400"} line-clamp-3 text-center`}
                                            >
                                                {product.description}
                                            </p>
                                            <p
                                                className={`text-sm font-semibold ${isOutOfStock ? "text-red-100" : "text-white"} text-center`}
                                            >
                                                {formatCurrency(product.price)}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductGrid;
