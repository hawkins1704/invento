import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { ChangeEvent, FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import ConfirmDialog from "../../components/ConfirmDialog";
import { FaArrowLeft } from "react-icons/fa";
import { FiEdit3 } from "react-icons/fi";
import { MdOutlineTableRestaurant } from "react-icons/md";
import { BiDish } from "react-icons/bi";
import { FaBoxArchive } from "react-icons/fa6";
import DataTable from "../../components/table/DataTable";
import TableRow from "../../components/table/TableRow";
import Pagination from "../../components/pagination/Pagination";
import { formatCurrency } from "../../utils/format";

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
    onStockChange,
    onSave,
}: {
    item: InventoryProduct;
    productId: string;
    stockDraft: string;
    isSaving: boolean;
    onStockChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onSave: () => void;
}) => {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-start gap-4">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-slate-300 bg-white flex items-center justify-center dark:border-slate-800 dark:bg-slate-900">
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
                                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                />
                            </div>
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

type BranchFormState = {
    name: string;
    address: string;
    serieBoleta: string;
    serieFactura: string;
};

const DEFAULT_BRANCH_FORM: BranchFormState = {
    name: "",
    address: "",
    serieBoleta: "",
    serieFactura: "",
};

type TableFormState = {
    label: string;
    capacity: string;
    status: "available" | "occupied" | "reserved" | "out_of_service";
};

const DEFAULT_TABLE_FORM: TableFormState = {
    label: "",
    capacity: "",
    status: "available",
};

const TABLE_STATUSES: Array<{
    value: TableFormState["status"];
    label: string;
}> = [
    { value: "available", label: "Disponible" },
    { value: "occupied", label: "Ocupada" },
    { value: "reserved", label: "Reservada" },
    { value: "out_of_service", label: "Fuera de servicio" },
];

const ITEMS_PER_PAGE = 10;

const AdminBranchDetails = () => {
    const params = useParams();
    const branchIdParam = params.branchId;
    const branchId = branchIdParam
        ? (branchIdParam as Id<"branches">)
        : undefined;
    const navigate = useNavigate();
    const location = useLocation();

    // Obtener la sucursal específica por ID usando la query optimizada
    const branchFromQuery = useQuery(
        api.branches.getById,
        branchId ? { branchId } : "skip"
    ) as Doc<"branches"> | null | undefined;
    const categories = useQuery(
        api.branchInventory.categories,
        branchId ? { branchId } : "skip"
    ) as CategorySummary[] | undefined;
    const tables = useQuery(
        api.branchTables.list,
        branchId ? { branchId } : "skip"
    ) as Doc<"branchTables">[] | undefined;

    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
        null
    );
    const [currentPage, setCurrentPage] = useState(1);
    const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
    const [savingProductId, setSavingProductId] = useState<string | null>(null);
    const updateStock = useMutation(api.branchInventory.updateStock);

    const [isEditingBranch, setIsEditingBranch] = useState(false);
    const [branchForm, setBranchForm] =
        useState<BranchFormState>(DEFAULT_BRANCH_FORM);
    const [branchFormError, setBranchFormError] = useState<string | null>(null);
    const [isSavingBranch, setIsSavingBranch] = useState(false);
    const updateBranch = useMutation(api.branches.update);
    const createTable = useMutation(api.branchTables.create);
    const updateTable = useMutation(api.branchTables.update);
    const removeTable = useMutation(api.branchTables.remove);

    const [isTableModalOpen, setIsTableModalOpen] = useState(false);
    const [tableForm, setTableForm] =
        useState<TableFormState>(DEFAULT_TABLE_FORM);
    const [tableFormError, setTableFormError] = useState<string | null>(null);
    const [isSavingTable, setIsSavingTable] = useState(false);
    const [editingTableId, setEditingTableId] =
        useState<Id<"branchTables"> | null>(null);
    const [tableToDelete, setTableToDelete] =
        useState<Doc<"branchTables"> | null>(null);

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
    }, [categories, selectedCategoryId, branchId]);

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
                  branchId,
                  categoryId: selectedCategoryId as Id<"categories">,
                  limit: ITEMS_PER_PAGE,
                  offset,
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

    const branchFromState = (
        location.state as { branch?: Doc<"branches"> } | null
    )?.branch;

    // Priorizar la query (datos frescos de la BD), usar branchFromState como fallback
    const branch =
        branchFromQuery ??
        (branchFromState && branchFromState._id === branchId
            ? branchFromState
            : null);
    const branchTables = tables ?? [];
    const totalTables = branchTables.length;
    const availableTables = branchTables.filter(
        (table) => (table.status ?? "available") === "available"
    ).length;
    const occupiedTables = branchTables.filter(
        (table) => table.status === "occupied"
    ).length;
    const branchName =
        (location.state as { branchName?: string } | null)?.branchName ??
        branch?.name ??
        "Sucursal";

    useEffect(() => {
        if (isEditingBranch) {
            return;
        }

        if (branch) {
            setBranchForm((previous) => {
                const next = {
                    name: branch.name,
                    address: branch.address,
                    serieBoleta: branch.serieBoleta ?? "",
                    serieFactura: branch.serieFactura ?? "",
                };

                if (
                    previous.name === next.name &&
                    previous.address === next.address &&
                    previous.serieBoleta === next.serieBoleta &&
                    previous.serieFactura === next.serieFactura
                ) {
                    return previous;
                }

                return next;
            });
        } else {
            setBranchForm((previous) => {
                if (
                    previous.name !== DEFAULT_BRANCH_FORM.name ||
                    previous.address !== DEFAULT_BRANCH_FORM.address
                ) {
                    return { ...DEFAULT_BRANCH_FORM };
                }
                return previous;
            });
        }
    }, [branch, isEditingBranch]);

    if (!branchId) {
        return (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white">
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                    Sucursal no encontrada
                </h1>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    No se encontró el identificador de la sucursal. Regresa al
                    listado e inténtalo nuevamente.
                </p>
                <button
                    type="button"
                    onClick={() => navigate("/admin/branches")}
                    className="mt-6 inline-flex items-center justify-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                >
                    Volver a sucursales
                </button>
            </div>
        );
    }

    if (branchId && branchFromQuery === null) {
        return (
            <div className="space-y-6">
                <header className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white">
                    <button
                        type="button"
                        onClick={() => navigate("/admin/branches")}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-1 text-xs font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                    >
                        <FaArrowLeft />
                        <span>Volver</span>
                    </button>
                    <h1 className="mt-4 text-3xl font-semibold text-slate-900 dark:text-white">
                        Sucursal no disponible
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        No pudimos encontrar la información de esta sucursal.
                        Verifica el enlace o regresa al listado.
                    </p>
                </header>
            </div>
        );
    }

    const formattedAddress = branch
        ? `${branch.address}${totalTables > 0 ? ` · ${totalTables} mesa${totalTables === 1 ? "" : "s"}` : ""}`
        : "";

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
                    branchId,
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

    const handleBranchFormChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setBranchForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const resetBranchForm = () => {
        if (branch) {
            setBranchForm({
                name: branch.name,
                address: branch.address,
                serieBoleta: branch.serieBoleta ?? "",
                serieFactura: branch.serieFactura ?? "",
            });
        } else {
            setBranchForm(DEFAULT_BRANCH_FORM);
        }
        setBranchFormError(null);
        setIsSavingBranch(false);
    };

    const handleBranchFormSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        if (!branchId) {
            return;
        }

        setBranchFormError(null);

        if (!branchForm.name.trim() || !branchForm.address.trim()) {
            setBranchFormError(
                "Completa el nombre y la dirección de la sucursal."
            );
            return;
        }

        try {
            setIsSavingBranch(true);
            await updateBranch({
                branchId,
                name: branchForm.name.trim(),
                address: branchForm.address.trim(),
                serieBoleta: branchForm.serieBoleta.trim() || undefined,
                serieFactura: branchForm.serieFactura.trim() || undefined,
            });
            setIsEditingBranch(false);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "No se pudo actualizar la sucursal. Inténtalo de nuevo.";
            setBranchFormError(message);
        } finally {
            setIsSavingBranch(false);
        }
    };

    const handleTableFormChange = (
        event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = event.target;
        setTableForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    const handleTableFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!branchId) {
            return;
        }

        setTableFormError(null);

        const normalizedLabel = tableForm.label.trim();
        if (!normalizedLabel) {
            setTableFormError("Ingresa un nombre para la mesa.");
            return;
        }

        let capacityValue: number | undefined;
        if (tableForm.capacity.trim()) {
            const parsed = Number(tableForm.capacity);
            if (Number.isNaN(parsed) || parsed < 0) {
                setTableFormError("La capacidad debe ser un número positivo.");
                return;
            }
            capacityValue = Math.floor(parsed);
        }

        try {
            setIsSavingTable(true);
            if (editingTableId) {
                await updateTable({
                    tableId: editingTableId,
                    label: normalizedLabel,
                    capacity: capacityValue,
                    status: tableForm.status,
                });
            } else {
                await createTable({
                    branchId,
                    label: normalizedLabel,
                    capacity: capacityValue,
                });
            }
            setIsTableModalOpen(false);
            setEditingTableId(null);
            setTableForm(DEFAULT_TABLE_FORM);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "No se pudo guardar la mesa. Inténtalo de nuevo.";
            setTableFormError(message);
        } finally {
            setIsSavingTable(false);
        }
    };

    const handleConfirmDeleteTable = async () => {
        if (!tableToDelete) {
            return;
        }
        try {
            await removeTable({ tableId: tableToDelete._id });
            setTableToDelete(null);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-8 text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={() => navigate("/admin/branches")}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                    >
                        <FaArrowLeft />
                        <span>Volver</span>
                    </button>
                    <div>
                        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
                            Sucursal · {branchName}
                        </h1>
                        {formattedAddress && (
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                {formattedAddress}
                            </p>
                        )}
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                            Ajusta los datos de la sucursal y gestiona el
                            inventario disponible en este local.
                        </p>
                    </div>
                </div>
            </header>

            <section className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                            Información de la sucursal
                        </h2>
                    </div>
                    {!isEditingBranch && (
                        <button
                            type="button"
                            onClick={() => {
                                setIsEditingBranch(true);
                                resetBranchForm();
                            }}
                            className="inline-flex items-center gap-2 justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                        >
                            <FiEdit3 />
                            <span>Editar información</span>
                        </button>
                    )}
                </div>

                {isEditingBranch ? (
                    <form
                        className="mt-6 space-y-5"
                        onSubmit={handleBranchFormSubmit}
                    >
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div className="space-y-2">
                                <label
                                    htmlFor="name"
                                    className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                >
                                    Nombre de la sucursal
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    value={branchForm.name}
                                    onChange={handleBranchFormChange}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-2 lg:col-span-2">
                                <label
                                    htmlFor="address"
                                    className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                >
                                    Dirección
                                </label>
                                <input
                                    id="address"
                                    name="address"
                                    type="text"
                                    required
                                    value={branchForm.address}
                                    onChange={handleBranchFormChange}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <label
                                    htmlFor="serieBoleta"
                                    className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                >
                                    Serie Boleta
                                </label>
                                <input
                                    id="serieBoleta"
                                    name="serieBoleta"
                                    type="text"
                                    maxLength={4}
                                    value={branchForm.serieBoleta}
                                    onChange={handleBranchFormChange}
                                    placeholder="B001"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    4 caracteres (ej: B001)
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label
                                    htmlFor="serieFactura"
                                    className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                >
                                    Serie Factura
                                </label>
                                <input
                                    id="serieFactura"
                                    name="serieFactura"
                                    type="text"
                                    maxLength={4}
                                    value={branchForm.serieFactura}
                                    onChange={handleBranchFormChange}
                                    placeholder="F001"
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    4 caracteres (ej: F001)
                                </p>
                            </div>
                        </div>

                        {branchFormError && (
                            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                {branchFormError}
                            </div>
                        )}

                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    resetBranchForm();
                                    setIsEditingBranch(false);
                                }}
                                className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                                disabled={isSavingBranch}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                                disabled={isSavingBranch}
                            >
                                {isSavingBranch
                                    ? "Guardando..."
                                    : "Guardar cambios"}
                            </button>
                        </div>
                    </form>
                ) : (
                    <>
                        <div className="mt-6 grid gap-4 lg:grid-cols-3">
                            <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950/40">
                                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                                    Nombre
                                </span>
                                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                                    {branch?.name ?? "—"}
                                </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-2 dark:border-slate-800 dark:bg-slate-950/40">
                                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                                    Dirección
                                </span>
                                <p className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                                    {branch?.address ?? "—"}
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                            <SummaryStatCard
                                title="Mesas registradas"
                                value={totalTables.toString()}
                                helper="Total de mesas configuradas."
                            />
                            <SummaryStatCard
                                title="Disponibles"
                                value={availableTables.toString()}
                                helper="Mesas listas para asignar."
                            />
                            <SummaryStatCard
                                title="Ocupadas"
                                value={occupiedTables.toString()}
                                helper="Mesas con ventas activas."
                            />

                            <SummaryStatCard
                                title="Serie Boleta"
                                value={branch?.serieBoleta ?? "—"}
                                helper="Serie de boletas para la sucursal."
                            />
                            <SummaryStatCard
                                title="Serie Factura"
                                value={branch?.serieFactura ?? "—"}
                                helper="Serie de facturas para la sucursal."
                            />
                        </div>
                    </>
                )}
            </section>

            <section className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900/60 dark:text-white">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                            Mesas de la sucursal
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            setEditingTableId(null);
                            setTableForm(DEFAULT_TABLE_FORM);
                            setTableFormError(null);
                            setIsTableModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                        disabled={!branchId}
                    >
                        <MdOutlineTableRestaurant />
                        <span>Registrar mesa</span>
                    </button>
                </div>

                {branchTables.length === 0 ? (
                    <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-400">
                        <BiDish className="h-6 w-6 text-slate-400 dark:text-slate-600" />
                        <p className="max-w-sm text-sm">
                            Aún no has creado mesas para esta sucursal. Agrega
                            mesas para que el punto de venta pueda asignar
                            pedidos.
                        </p>
                    </div>
                ) : (
                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {branchTables.map((table) => (
                            <article
                                key={table._id as string}
                                className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 text-slate-900 dark:border-slate-800 dark:bg-slate-950/40 dark:text-white"
                            >
                                <header className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
                                            Mesa
                                        </p>
                                        <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                                            {table.label}
                                        </h3>
                                    </div>
                                    <TableStatusBadge
                                        status={table.status ?? "available"}
                                    />
                                </header>
                                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                    <p>
                                        Capacidad:{" "}
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                            {table.capacity !== undefined
                                                ? `${table.capacity} persona${table.capacity === 1 ? "" : "s"}`
                                                : "Sin definir"}
                                        </span>
                                    </p>
                                    <p>
                                        Venta activa:{" "}
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                            {table.currentSaleId ? "Sí" : "No"}
                                        </span>
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingTableId(table._id);
                                            setTableForm({
                                                label: table.label,
                                                capacity:
                                                    table.capacity !== undefined
                                                        ? table.capacity.toString()
                                                        : "",
                                                status:
                                                    table.status ?? "available",
                                            });
                                            setTableFormError(null);
                                            setIsTableModalOpen(true);
                                        }}
                                        className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTableToDelete(table)}
                                        className="inline-flex items-center justify-center rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 transition hover:border-red-500 hover:text-red-800 dark:border-red-500/40 dark:text-red-300 dark:hover:border-red-400 dark:hover:text-red-200"
                                        disabled={Boolean(table.currentSaleId)}
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {isTableModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10 mb-0">
                    <div className="absolute inset-0 bg-black/40 dark:bg-slate-950/70 backdrop-blur" />
                    <div className="relative w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 text-slate-900 shadow-2xl shadow-black/60 dark:border-slate-800 dark:bg-slate-900/95 dark:text-white">
                        <header className="flex items-center justify-between">
                            <div>
                                <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                                    {editingTableId
                                        ? "Actualizar información"
                                        : "Registrar nueva mesa"}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsTableModalOpen(false);
                                    setEditingTableId(null);
                                    setTableForm(DEFAULT_TABLE_FORM);
                                }}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                                aria-label="Cerrar"
                            >
                                ✕
                            </button>
                        </header>

                        <form
                            className="mt-6 space-y-4"
                            onSubmit={handleTableFormSubmit}
                        >
                            <div className="space-y-2">
                                <label
                                    className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                    htmlFor="label"
                                >
                                    Nombre de la mesa
                                </label>
                                <input
                                    id="label"
                                    name="label"
                                    type="text"
                                    autoFocus
                                    value={tableForm.label}
                                    onChange={handleTableFormChange}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                    placeholder="Ej. Terraza 1"
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <label
                                        className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                        htmlFor="capacity"
                                    >
                                        Capacidad (opcional)
                                    </label>
                                    <input
                                        id="capacity"
                                        name="capacity"
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={tableForm.capacity}
                                        onChange={handleTableFormChange}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                        placeholder="Número de personas"
                                    />
                                </div>
                                {editingTableId && (
                                    <div className="space-y-2">
                                        <label
                                            className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                            htmlFor="status"
                                        >
                                            Estado
                                        </label>
                                        <select
                                            id="status"
                                            name="status"
                                            value={tableForm.status}
                                            onChange={handleTableFormChange}
                                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                        >
                                            {TABLE_STATUSES.map((option) => (
                                                <option
                                                    key={option.value}
                                                    value={option.value}
                                                >
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {tableFormError && (
                                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                    {tableFormError}
                                </div>
                            )}

                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsTableModalOpen(false);
                                        setEditingTableId(null);
                                        setTableForm(DEFAULT_TABLE_FORM);
                                        setTableFormError(null);
                                    }}
                                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                                    disabled={isSavingTable}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white  transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                                    disabled={isSavingTable}
                                >
                                    {isSavingTable
                                        ? "Guardando..."
                                        : editingTableId
                                          ? "Guardar cambios"
                                          : "Crear mesa"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={Boolean(tableToDelete)}
                title="Eliminar mesa"
                tone="danger"
                description="¿Deseas eliminar esta mesa? Solo puedes eliminar mesas que no tengan ventas abiertas."
                confirmLabel="Eliminar"
                onCancel={() => setTableToDelete(null)}
                onConfirm={handleConfirmDeleteTable}
            />

            <section>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                    Inventario
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                                className={`flex flex-col gap-1 rounded-lg border p-4 text-left transition ${
                                    isSelected
                                        ? "border-[#fa7316] bg-[#fa7316]/10 text-slate-900 dark:text-white"
                                        : "border-slate-300 bg-white text-slate-700 hover:border-[#fa7316]/50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white"
                                }`}
                            >
                                <span className="text-md font-semibold ">
                                    {item.category.name}
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                                    {item.productCount} productos
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
                            Selecciona una categoría para gestionar el
                            inventario de sus productos.
                        </p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-500 dark:text-slate-400">
                        <FaBoxArchive className="w-10 h-10 text-slate-500 dark:text-slate-400" />
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
                                    { label: "Acciones", key: "actions" },
                                ]}
                            >
                                {products.map((item) => {
                                    const productId = item.product
                                        ._id as unknown as string;
                                    return (
                                        <TableRow key={productId}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-300 bg-white flex items-center justify-center dark:border-slate-800 dark:bg-slate-900">
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
                                                {item.product
                                                    .inventoryActivated ? (
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
                                                    <span className="text-sm text-slate-500">
                                                        ---
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
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
                                            </td>
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

const SummaryStatCard = ({
    title,
    value,
    helper,
}: {
    title: string;
    value: string;
    helper: string;
}) => (
    <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950/40">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            {title}
        </span>
        <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p>
    </div>
);

const TableStatusBadge = ({ status }: { status: TableFormState["status"] }) => {
    const config: Record<
        TableFormState["status"],
        { label: string; className: string }
    > = {
        available: {
            label: "Disponible",
            className:
                "border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200",
        },
        occupied: {
            label: "Ocupada",
            className: "border-[#fa7316]/40 bg-[#fa7316]/10 text-[#fa7316]",
        },
        reserved: {
            label: "Reservada",
            className: "border-sky-500/40 bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200",
        },
        out_of_service: {
            label: "Fuera de servicio",
            className: "border-red-500/40 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-200",
        },
    };

    const data = config[status];
    return (
        <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] ${data.className}`}
        >
            {data.label}
        </span>
    );
};

export default AdminBranchDetails;
