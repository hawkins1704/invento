import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useConvex } from "convex/react";
import type { ChangeEvent, FormEvent } from "react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import SalesShiftGuard from "../../components/SalesShiftGuard";
import SalesPageHeader from "../../components/sales-page-header/SalesPageHeader";
import type { ShiftSummary } from "../../hooks/useSalesShift";
import { formatCurrency} from "../../utils/format";
import { api } from "../../../convex/_generated/api";
import { BiDish } from "react-icons/bi";
import { FaBoxArchive } from "react-icons/fa6";
import DataTable from "../../components/table/DataTable";
import TableRow from "../../components/table/TableRow";
import Pagination from "../../components/pagination/Pagination";
import CodePinInput from "../../components/CodePinInput";

type CategorySummary = {
    category: Doc<"categories">;
    productCount: number;
};

type InventoryProduct = {
    product: Doc<"products">;
    stock: number;
    inventoryId: Id<"branchInventories"> | null;
    imageUrl: string | null;
};


const InventoryProductCard = ({
    item,
    productId,
    stockDraft,
    isSaving,
    isEditable,
    onStockChange,
    onSave,
}: {
    item: InventoryProduct;
    productId: string;
    stockDraft: string;
    isSaving: boolean;
    isEditable: boolean;
    onStockChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onSave: () => void;
}) => {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-start gap-4">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center dark:border-slate-800 dark:bg-slate-900">
                    {item.imageUrl ? (
                        <img
                            src={item.imageUrl}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <BiDish className="h-8 w-8 text-slate-400 dark:text-slate-600" />
                    )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {item.product.name}
                        </p>
                        {item.product.description && (
                            <p className=" text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                {item.product.description}
                            </p>
                        )}
                    </div>
                    <div className=" flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div>
                            <span className="text-xs text-slate-500">
                                Precio:
                            </span>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                {formatCurrency(item.product.price)}
                            </p>
                        </div>
                    </div>
                    {item.product.inventoryActivated && (
                        <div className="flex flex-col gap-4">
                            <div className="flex-1">
                                <label
                                    htmlFor={`stock-${productId}`}
                                    className="text-xs text-slate-500 mb-1 block"
                                >
                                    Stock
                                </label>
                                <input
                                    id={`stock-${productId}`}
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={stockDraft}
                                    onChange={onStockChange}
                                    disabled={!isEditable}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                />
                            </div>
                            {isEditable && (
                                <div className="flex items-end">
                                    <button
                                        type="button"
                                        onClick={onSave}
                                        className="inline-flex items-center justify-center rounded-lg bg-[#fa7316] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                                        disabled={isSaving}
                                    >
                                        {isSaving ? "Guardando..." : "Guardar"}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const ITEMS_PER_PAGE = 10;

const InventoryCodeVerification = ({
    onVerified,
}: {
    onVerified: () => void;
}) => {
    const convex = useConvex();
    const [code, setCode] = useState<string[]>(() => Array(4).fill(""));
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (code.some((digit) => digit === "")) {
            setError("Ingresa el código completo de 4 dígitos.");
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const joinedCode = code.join("");
            const result = await convex.query(api.access.verifyAreaCode, {
                area: "inventory",
                code: joinedCode,
            });

            if (result?.valid) {
                onVerified();
                return;
            }

            if (result?.reason === "notConfigured") {
                setError("Tu perfil no tiene un código de inventario configurado.");
            } else {
                setError("Código incorrecto. Revisa el código asignado para inventario.");
            }
        } catch (caughtError) {
            const message =
                caughtError instanceof Error
                    ? caughtError.message
                    : "No fue posible validar el código. Inténtalo de nuevo.";
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white">
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                            Código de Inventario
                        </h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Ingresa el código de 4 dígitos para acceder a la gestión de inventario.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <CodePinInput
                            label="Código de inventario"
                            name="inventoryCode"
                            value={code}
                            onChange={setCode}
                            focusOnMount
                            className="flex flex-col items-center justify-center"
                        />

                        {error && (
                            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full inline-flex items-center justify-center rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {isSubmitting ? "Verificando..." : "Verificar código"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

const SalesInventoryContent = ({
  branch,
  branchId,
}: {
  branch: Doc<"branches">;
  branchId: string;
  activeShift: ShiftSummary;
}) => {
    const [isCodeVerified, setIsCodeVerified] = useState<boolean>(false);

    const categories = useQuery(
        api.branchInventory.categories,
        branchId ? { branchId: branchId as Id<"branches"> } : "skip"
    ) as CategorySummary[] | undefined;

    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
        null
    );
    const [currentPage, setCurrentPage] = useState(1);
    const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
    const [savingProductId, setSavingProductId] = useState<string | null>(null);
    const updateStock = useMutation(api.branchInventory.updateStock);

    useEffect(() => {
        if (!categories || categories.length === 0) {
            if (selectedCategoryId !== null) {
                setSelectedCategoryId(null);
            }
            return;
        }

        if (!selectedCategoryId) {
            const firstCategoryWithProducts = categories.find(
                (item) => item.productCount > 0
            );
            const fallbackCategory = firstCategoryWithProducts ?? categories[0];
            setSelectedCategoryId(
                fallbackCategory.category._id as unknown as string
            );
        } else if (
            !categories.some(
                (item) =>
                    (item.category._id as unknown as string) ===
                    selectedCategoryId
            )
        ) {
            setSelectedCategoryId(
                categories[0].category._id as unknown as string
            );
        }
    }, [categories, selectedCategoryId]);

    // Resetear página cuando cambia la categoría seleccionada
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedCategoryId]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            // Scroll to top of table when changing pages
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    };

    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    const productsData = useQuery(
        api.branchInventory.productsByCategory,
        branchId && selectedCategoryId
            ? {
                  branchId: branchId as Id<"branches">,
                  categoryId: selectedCategoryId as Id<"categories">,
                  limit: ITEMS_PER_PAGE,
                  offset,
                  onlyActive: true, // Solo productos activos en el catálogo
              }
            : "skip"
    ) as { products: InventoryProduct[]; total: number } | undefined;

    const products = productsData?.products ?? [];
    const totalProducts = productsData?.total ?? 0;
    const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

    useEffect(() => {
        const initialDrafts = products.reduce<Record<string, string>>(
            (accumulator, item) => {
                const key = item.product._id as unknown as string;
                accumulator[key] = item.stock.toString();
                return accumulator;
            },
            {}
        );
        setStockDrafts((previous) => {
            // Comparar si realmente cambió antes de actualizar
            const previousKeys = Object.keys(previous);
            const newKeys = Object.keys(initialDrafts);

            if (previousKeys.length !== newKeys.length) {
                return initialDrafts;
            }

            for (const key of newKeys) {
                if (previous[key] !== initialDrafts[key]) {
                    return initialDrafts;
                }
            }

            return previous;
        });
    }, [products]);

    const handleStockChange = (
        productId: string,
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const { value } = event.target;
        setStockDrafts((previous) => ({
            ...previous,
            [productId]: value,
        }));
    };

    const handleSaveStock = async (product: InventoryProduct) => {
        const productId = product.product._id as unknown as string;
        const rawValue = stockDrafts[productId] ?? "0";
        const parsed = Number(rawValue);

        if (Number.isNaN(parsed) || parsed < 0) {
            setStockDrafts((previous) => ({
                ...previous,
                [productId]: product.stock.toString(),
            }));
            return;
        }

        try {
            setSavingProductId(productId);
            if (branchId) {
                await updateStock({
                    branchId: branchId as Id<"branches">,
                    productId: product.product._id,
                    stock: Math.floor(parsed),
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSavingProductId(null);
        }
    };

    if (!isCodeVerified) {
        return <InventoryCodeVerification onVerified={() => setIsCodeVerified(true)} />;
    }

  return (
    <div className="space-y-8">
      <SalesPageHeader
        title="Inventario"
        chip="Inventario en turno"
        actions={
          <span className="rounded-full border border-[#fa7316]/30 bg-[#fa7316]/10 px-4 py-2 text-sm font-semibold text-[#fa7316]">
            {branch.name}
          </span>
        }
      />

     

      <section>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                    Inventario
                </h2>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    {categories?.map((item) => {
                        const categoryId = item.category
                            ._id as unknown as string;
                        const isSelected = categoryId === selectedCategoryId;
                        return (
                            <button
                                key={categoryId}
                                type="button"
                                onClick={() =>
                                    setSelectedCategoryId(categoryId)
                                }
                                className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition ${
                                    isSelected
                                        ? "border-[#fa7316] bg-[#fa7316]/10 text-slate-900 dark:text-white"
                                        : "border-slate-300 bg-white text-slate-700 hover:border-[#fa7316]/50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
                                }`}
                            >
                                <span className="text-sm font-semibold ">
                                    {item.category.name}
                                </span>
                                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                    {item.productCount} Productos
                                </span>
                            </button>
                        );
                    })}
                    {(!categories || categories.length === 0) && (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                            Crea categorías para comenzar a clasificar productos
                            en esta sucursal.
                        </div>
                    )}
                </div>
            </section>

            <section className="">
                {selectedCategoryId === null ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-500 dark:text-slate-400">
                        <span className="text-4xl" aria-hidden>
                            🗂️
                        </span>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Selecciona una categoría para ver el
                            inventario de sus productos.
                        </p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-500 dark:text-slate-400">
                        <FaBoxArchive className="w-10 h-10 text-slate-400 dark:text-slate-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
                            No hay productos en esta categoría. Agrega productos
                            desde el catálogo general.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Vista de tarjetas para mobile */}
                        <div className="space-y-3 md:hidden">
                            {products.map((item) => {
                                const productId = item.product
                                    ._id as unknown as string;
                                return (
                                    <InventoryProductCard
                                        key={productId}
                                        item={item}
                                        productId={productId}
                                        stockDraft={
                                            stockDrafts[productId] ??
                                            item.stock.toString()
                                        }
                                        isSaving={savingProductId === productId}
                                        isEditable={isCodeVerified && Boolean(item.product.inventoryActivated)}
                                        onStockChange={(event) =>
                                            handleStockChange(productId, event)
                                        }
                                        onSave={() => handleSaveStock(item)}
                                    />
                                );
                            })}
                        </div>
                        {/* Vista de tabla para tablet y desktop */}
                        <div className="hidden md:block">
                            <DataTable
                                columns={[
                                    { label: "Producto", key: "product" },
                                    { label: "Precio", key: "price" },
                                    { label: "Stock", key: "stock" },
                                    ...(isCodeVerified ? [{ label: "Acciones", key: "actions" }] : []),
                                ]}
                            >
                                {products.map((item) => {
                                    const productId = item.product
                                        ._id as unknown as string;
                                    return (
                                        <TableRow key={productId}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center dark:border-slate-800 dark:bg-slate-900">
                                                        {item.imageUrl ? (
                                                            <img
                                                                src={
                                                                    item.imageUrl
                                                                }
                                                                alt={
                                                                    item.product
                                                                        .name
                                                                }
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <BiDish className="h-6 w-6 text-slate-400 dark:text-slate-600" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                            {item.product.name}
                                                        </p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            {
                                                                item.product
                                                                    .description
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                                                {formatCurrency(
                                                    item.product.price
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                                                {item.product.inventoryActivated ? (
                                                    isCodeVerified ? (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            value={
                                                                stockDrafts[
                                                                    productId
                                                                ] ??
                                                                item.stock.toString()
                                                            }
                                                            onChange={(event) =>
                                                                handleStockChange(
                                                                    productId,
                                                                    event
                                                                )
                                                            }
                                                            className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                                        />
                                                    ) : (
                                                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                                            {item.stock}
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="text-sm text-slate-500">
                                                        ---
                                                    </span>
                                                )}
                                            </td>
                                            {isCodeVerified && (
                                                <td className="px-6 py-4">
                                                    {item.product.inventoryActivated && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleSaveStock(item)
                                                            }
                                                            className="inline-flex items-center justify-center rounded-lg bg-[#fa7316] px-4 py-2 text-xs font-semibold text-white  transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                                                            disabled={
                                                                savingProductId ===
                                                                productId
                                                            }
                                                        >
                                                            {savingProductId ===
                                                            productId
                                                                ? "Guardando..."
                                                                : "Guardar"}
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </TableRow>
                                    );
                                })}
                            </DataTable>
                        </div>
                    </>
                )}
                {selectedCategoryId !== null && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalItems={totalProducts}
                        itemsPerPage={ITEMS_PER_PAGE}
                        onPageChange={handlePageChange}
                        itemLabel="productos"
                    />
                )}
      </section>
    </div>
  );
};

const SalesInventory = () => (
  <SalesShiftGuard>
    {(props) => <SalesInventoryContent {...props} />}
  </SalesShiftGuard>
);

export default SalesInventory;

