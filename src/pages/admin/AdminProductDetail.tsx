import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import type { ChangeEvent, FormEvent } from "react";
import imageCompression from "browser-image-compression";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import ConfirmDialog from "../../components/ConfirmDialog";
import type { ProductListItem } from "../../types/products";
import { MdDeleteOutline } from "react-icons/md";
import { FaArrowLeft } from "react-icons/fa";
import { BiDish } from "react-icons/bi";

type ProductEditFormState = {
    name: string;
    description: string;
    categoryId: string;
    unitValue: string;
    price: string;
    stocks: Record<string, string>;
    imageFile: File | null;
    inventoryActivated: boolean;
    allowNegativeSale: boolean;
};

const DEFAULT_FORM: ProductEditFormState = {
    name: "",
    description: "",
    categoryId: "",
    unitValue: "",
    price: "",
    stocks: {},
    imageFile: null,
    inventoryActivated: false,
    allowNegativeSale: false,
};

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
    }).format(value);

const AdminProductDetail = () => {
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();
    const location = useLocation() as { state?: { product?: ProductListItem } };

    // Obtener el producto específico por ID usando la query optimizada
    const productFromQuery = useQuery(
        api.products.getById,
        productId ? { productId: productId as Id<"products"> } : "skip"
    ) as ProductListItem | null | undefined;
    // Para el formulario, necesitamos todas las categorías y sucursales (sin paginación)
    const allCategoriesData = useQuery(
        api.categories.list,
        {
            limit: 1000, // Un número grande para obtener todas
            offset: 0,
        }
    ) as { categories: Doc<"categories">[]; total: number } | undefined;

    const allBranchesData = useQuery(
        api.branches.list,
        {
            limit: 1000, // Un número grande para obtener todas
            offset: 0,
        }
    ) as { branches: Doc<"branches">[]; total: number } | undefined;

    const categories = useMemo(() => allCategoriesData?.categories ?? [], [allCategoriesData]);
    const branches = useMemo(() => allBranchesData?.branches ?? [], [allBranchesData]);
    const currentUser = useQuery(api.users.getCurrent) as
        | Doc<"users">
        | undefined;

    const generateUploadUrl = useMutation(api.products.generateUploadUrl);
    const updateProduct = useMutation(api.products.update);
    const removeProduct = useMutation(api.products.remove);

    const [formState, setFormState] =
        useState<ProductEditFormState>(DEFAULT_FORM);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isImageRemoved, setIsImageRemoved] = useState(false);
    const [pendingAction, setPendingAction] = useState<
        "delete-product" | "remove-image" | null
    >(null);
    const [lastEditedField, setLastEditedField] = useState<
        "unitValue" | "price" | null
    >(null);

    const productFromState = location.state?.product;

    // Priorizar la query (datos frescos de la BD), usar productFromState como fallback
    const product = productFromQuery ?? productFromState ?? undefined;

    const IGVPercentage = currentUser?.IGVPercentage ?? 18;

    // Función para redondear a 2 decimales (centavos)
    const roundToCents = (value: number): number => {
        return Math.round(value * 100) / 100;
    };

    // Calcular valores basado en qué campo fue editado
    const unitValue = useMemo(() => {
        if (lastEditedField === "price") {
            const price = Number(formState.price) || 0;
            const calculated = price / (1 + IGVPercentage / 100);
            return roundToCents(calculated);
        }
        return roundToCents(Number(formState.unitValue) || 0);
    }, [formState.unitValue, formState.price, lastEditedField, IGVPercentage]);

    const igv = useMemo(() => {
        return roundToCents((unitValue * IGVPercentage) / 100);
    }, [unitValue, IGVPercentage]);

    useEffect(() => {
        if (!product || !branches || !currentUser) {
            return;
        }

        const initialStocks = branches.reduce<Record<string, string>>(
            (accumulator, branch) => {
                const key = branch._id as unknown as string;
                const existing = product.stockByBranch.find(
                    (entry) => entry.branchId === branch._id
                );
                accumulator[key] = existing ? String(existing.stock) : "0";
                return accumulator;
            },
            {}
        );

        // Función para redondear a 2 decimales
        const roundToCents = (val: number): number =>
            Math.round(val * 100) / 100;

        // Si el producto tiene unitValue, usarlo directamente
        // Si no, calcularlo desde el price
        const productIGVPercentage = currentUser?.IGVPercentage ?? 18;
        let productUnitValue: number;
        let productPrice: number;

        if (product.unitValue !== undefined && product.unitValue !== null) {
            // El producto ya tiene unitValue guardado, usarlo
            productUnitValue = roundToCents(product.unitValue);
            const productIGV = roundToCents(
                (productUnitValue * productIGVPercentage) / 100
            );
            productPrice = roundToCents(productUnitValue + productIGV);
        } else {
            // Producto antiguo sin unitValue, calcular desde price
            productPrice = roundToCents(product.price);
            productUnitValue = roundToCents(
                productPrice / (1 + productIGVPercentage / 100)
            );
        }

        // Solo actualizar el formulario si los valores han cambiado
        // para evitar limpiar el successMessage después de guardar
        setFormState((previous) => {
            const newUnitValue = productUnitValue.toFixed(2);
            const newPrice = productPrice.toFixed(2);

            const productInventoryActivated = product.inventoryActivated ?? false;
            const productAllowNegativeSale = product.allowNegativeSale ?? false;
            
            // Si los valores son diferentes, actualizar
            if (
                previous.unitValue !== newUnitValue ||
                previous.price !== newPrice ||
                previous.name !== product.name ||
                previous.description !== product.description ||
                previous.categoryId !==
                    (product.categoryId as unknown as string) ||
                previous.inventoryActivated !== productInventoryActivated ||
                previous.allowNegativeSale !== productAllowNegativeSale
            ) {
                return {
                    name: product.name,
                    description: product.description,
                    categoryId: product.categoryId as unknown as string,
                    unitValue: newUnitValue,
                    price: newPrice,
                    stocks: initialStocks,
                    imageFile: previous.imageFile, // Mantener el archivo si existe
                    inventoryActivated: productInventoryActivated,
                    allowNegativeSale: productAllowNegativeSale,
                };
            }
            // Si no hay cambios, mantener el estado actual (incluyendo stocks si no cambiaron)
            return {
                ...previous,
                stocks: initialStocks, // Actualizar stocks siempre
            };
        });
        setLastEditedField(null);
        setCurrentImageUrl(product.imageUrl);
        setFormError(null);
        // NO limpiar successMessage aquí - solo se limpia cuando hay cambios reales en el producto
        setPreviewImageUrl((previous) => {
            if (previous) {
                URL.revokeObjectURL(previous);
            }
            return null;
        });
        setIsImageRemoved(false);
    }, [branches, product, currentUser]);

    const updateField = (
        event: ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => {
        const { name, value } = event.target;
        setLastEditedField(
            name === "unitValue" || name === "price" ? name : null
        );
        setFormState((previous) => {
            const updated = { ...previous, [name]: value };

            // Función para redondear a 2 decimales
            const roundToCents = (val: number): number =>
                Math.round(val * 100) / 100;

            // Si se editó unitValue, actualizar price calculado
            if (name === "unitValue") {
                const newUnitValue = roundToCents(Number(value) || 0);
                const newIGV = roundToCents(
                    (newUnitValue * IGVPercentage) / 100
                );
                const newPrice = roundToCents(newUnitValue + newIGV);
                updated.price = newPrice.toFixed(2);
            }
            // Si se editó price, actualizar unitValue calculado
            else if (name === "price") {
                const newPrice = roundToCents(Number(value) || 0);
                const newUnitValue = roundToCents(
                    newPrice / (1 + IGVPercentage / 100)
                );
                updated.unitValue = newUnitValue.toFixed(2);
            }

            return updated;
        });
    };

    const updateStockField = (branchId: string, value: string) => {
        const parsedValue = Number(value);
        const sanitized =
            Number.isNaN(parsedValue) || parsedValue < 0
                ? "0"
                : String(Math.floor(parsedValue));

        setFormState((previous) => ({
            ...previous,
            stocks: {
                ...previous.stocks,
                [branchId]: sanitized,
            },
        }));
    };

    const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        setFormState((previous) => ({ ...previous, imageFile: file }));
        setPreviewImageUrl((previous) => {
            if (previous) {
                URL.revokeObjectURL(previous);
            }
            return file ? URL.createObjectURL(file) : null;
        });
        setIsImageRemoved(false);
    };

    useEffect(() => {
        return () => {
            if (previewImageUrl) {
                URL.revokeObjectURL(previewImageUrl);
            }
        };
    }, [previewImageUrl]);

    if (!productId) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
                    Producto no encontrado
                </h1>
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                >
                    Volver
                </button>
            </div>
        );
    }

    if (
        (productId && productFromQuery === undefined) ||
        categories === undefined ||
        branches === undefined
    ) {
        return (
            <div className="flex flex-1 items-center justify-center text-slate-600 dark:text-slate-400">
                Cargando información del producto...
            </div>
        );
    }

    if (!product) {
        return (
            <div className="space-y-6 text-slate-900 dark:text-white">
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
                    El producto solicitado no existe o fue eliminado.
                </div>
                <button
                    type="button"
                    onClick={() => navigate("/admin/inventory")}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                >
                    Volver al inventario
                </button>
            </div>
        );
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!branches || branches.length === 0) {
            setFormError(
                "Crea al menos una sucursal para actualizar el producto."
            );
            return;
        }

        if (!formState.categoryId) {
            setFormError("Selecciona una categoría para el producto.");
            return;
        }

        // Función para redondear a 2 decimales
        const roundToCents = (val: number): number =>
            Math.round(val * 100) / 100;

        // Siempre usar el valor unitario del estado (ya está calculado correctamente)
        const finalUnitValue = roundToCents(Number(formState.unitValue));
        if (Number.isNaN(finalUnitValue) || finalUnitValue < 0) {
            setFormError("Ingresa un valor unitario válido.");
            return;
        }

        let stockByBranch: { branchId: Id<"branches">; stock: number }[];

        try {
            stockByBranch = branches.map((branch) => {
                const key = branch._id as unknown as string;
                const rawValue = formState.stocks[key] ?? "0";
                const parsed = Number(rawValue);

                if (Number.isNaN(parsed) || parsed < 0) {
                    throw new Error(
                        `El stock para la sucursal ${branch.name} no es válido.`
                    );
                }

                return {
                    branchId: branch._id,
                    stock: Math.floor(parsed),
                };
            });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Revisa los valores de stock ingresados.";
            setFormError(message);
            return;
        }

        try {
            setIsSubmitting(true);
            setFormError(null);
            setSuccessMessage(null);

            let storageId: Id<"_storage"> | undefined;
            const shouldRemoveImage = isImageRemoved && !formState.imageFile;

            if (formState.imageFile) {
                const uploadUrl = await generateUploadUrl();
                const compressedFile = await imageCompression(
                    formState.imageFile,
                    {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 1280,
                        useWebWorker: true,
                    }
                );

                const uploadResponse = await fetch(uploadUrl, {
                    method: "POST",
                    headers: { "Content-Type": compressedFile.type },
                    body: compressedFile,
                });

                if (!uploadResponse.ok) {
                    throw new Error(
                        "No se pudo subir la nueva imagen, intenta nuevamente."
                    );
                }

                const result = (await uploadResponse.json()) as {
                    storageId: Id<"_storage">;
                };
                storageId = result.storageId;
            }

            await updateProduct({
                productId: product._id,
                name: formState.name.trim(),
                description: formState.description.trim(),
                categoryId: formState.categoryId as Id<"categories">,
                unitValue: finalUnitValue,
                stockByBranch,
                image: storageId,
                removeImage: shouldRemoveImage ? true : undefined,
                inventoryActivated: formState.inventoryActivated,
                allowNegativeSale: formState.allowNegativeSale,
            });

            setSuccessMessage("Producto actualizado correctamente.");
            setFormState((previous) => ({ ...previous, imageFile: null }));
            setPreviewImageUrl((previous) => {
                if (previous) {
                    URL.revokeObjectURL(previous);
                }
                return null;
            });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "No fue posible actualizar el producto.";
            setFormError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const requestDeleteProduct = () => {
        if (!product) {
            return;
        }
        setPendingAction("delete-product");
    };

    const executeDeleteProduct = async () => {
        if (!product) {
            return;
        }

        setPendingAction(null);

        try {
            setIsDeleting(true);
            setFormError(null);
            setSuccessMessage(null);

            await removeProduct({
                productId: product._id,
            });

            navigate("/admin/inventory");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "No fue posible eliminar el producto.";
            setFormError(message);
        } finally {
            setIsDeleting(false);
        }
    };

    const requestRemoveImage = () => {
        if (!currentImageUrl && !formState.imageFile) {
            return;
        }
        setPendingAction("remove-image");
    };

    const executeRemoveImage = () => {
        setPendingAction(null);
        setFormState((previous) => ({ ...previous, imageFile: null }));
        setCurrentImageUrl(null);
        setPreviewImageUrl((previous) => {
            if (previous) {
                URL.revokeObjectURL(previous);
            }
            return null;
        });
        setIsImageRemoved(true);
        setSuccessMessage(null);
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 p-8 text-slate-900 dark:text-white  md:flex-row md:items-center md:justify-between">
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={() => navigate("/admin/inventory")}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-1 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                    >
                        <FaArrowLeft />
                        <span>Volver</span>
                    </button>
                    <div>
                        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
                            {product.name}
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                            Actualiza los detalles del producto y ajusta el
                            stock disponible en cada sucursal.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <button
                        type="button"
                        onClick={requestDeleteProduct}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-50 dark:bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-600 transition hover:border-red-500/60 hover:bg-red-100 hover:text-red-700 dark:text-red-200 dark:hover:text-red-100 dark:hover:bg-red-500/20"
                        disabled={isDeleting || isSubmitting}
                    >
                        <MdDeleteOutline />
                        Eliminar producto
                    </button>
                </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <form
                    className="space-y-5 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 p-8 text-slate-900 dark:text-white "
                    onSubmit={handleSubmit}
                >
                    <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                            <label
                                htmlFor="name"
                                className="text-sm font-medium text-slate-700 dark:text-slate-200"
                            >
                                Nombre
                            </label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                value={formState.name}
                                onChange={updateField}
                                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                            />
                        </div>
                        {categories.length > 0 ? (
                            <div className="space-y-2">
                                <label
                                    htmlFor="categoryId"
                                    className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                >
                                    Categoría
                                </label>
                                <select
                                    id="categoryId"
                                    name="categoryId"
                                    value={formState.categoryId}
                                    onChange={updateField}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                >
                                    {categories.map((category) => {
                                        const categoryKey =
                                            category._id as unknown as string;
                                        return (
                                            <option
                                                key={categoryKey}
                                                value={categoryKey}
                                            >
                                                {category.name}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                    Categoría
                                </label>
                                <div className="rounded-lg border border-dashed border-[#fa7316]/60 bg-[#fa7316]/10 px-4 py-3 text-sm text-[#fa7316]">
                                    Agrega una categoría antes de editar el
                                    producto.
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor="code"
                            className="text-sm font-medium text-slate-700 dark:text-slate-200"
                        >
                            Código
                        </label>
                        <input
                            id="code"
                            name="code"
                            type="text"
                            disabled
                            value={product.code ?? "—"}
                            className="w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-500 cursor-not-allowed dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400"
                        />
                    </div>

                    <div className="space-y-2">
                        <label
                            htmlFor="description"
                            className="text-sm font-medium text-slate-700 dark:text-slate-200"
                        >
                            Descripción
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            rows={3}
                            value={formState.description}
                            onChange={updateField}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                        />
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        <div className="space-y-2">
                            <label
                                htmlFor="unitValue"
                                className="text-sm font-medium text-slate-700 dark:text-slate-200"
                            >
                                Valor Unitario
                            </label>
                            <input
                                id="unitValue"
                                name="unitValue"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={formState.unitValue}
                                onChange={updateField}
                                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <label
                                htmlFor="igv"
                                className="text-sm font-medium text-slate-700 dark:text-slate-200"
                            >
                                IGV ({IGVPercentage}%)
                            </label>
                            <input
                                id="igv"
                                name="igv"
                                type="number"
                                disabled
                                value={igv.toFixed(2)}
                                className="w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-500 cursor-not-allowed dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400"
                            />
                        </div>
                        <div className="space-y-2">
                            <label
                                htmlFor="price"
                                className="text-sm font-medium text-slate-700 dark:text-slate-200"
                            >
                                Precio Unitario
                            </label>
                            <input
                                id="price"
                                name="price"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                value={formState.price}
                                onChange={updateField}
                                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label
                            htmlFor="image"
                            className="text-sm font-medium text-slate-700 dark:text-slate-200"
                        >
                            Imagen del producto
                        </label>
                        <input
                            id="image"
                            name="image"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="w-full cursor-pointer rounded-lg border border-dashed border-slate-300 bg-white px-4 py-4 text-sm text-slate-600 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#fa7316] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-[#fa7316]/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-500">
                            Si no seleccionas una nueva imagen, se mantendrá la
                            actual. Tamaño recomendado máx. 1280px. Este campo
                            es opcional.
                        </p>
                    </div>

                    {formState.inventoryActivated && (
                        <div className="space-y-3">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                Stock por sucursal
                            </p>
                            {branches.length > 0 ? (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {branches.map((branch) => {
                                        const branchKey =
                                            branch._id as unknown as string;
                                        return (
                                            <div
                                                key={branchKey}
                                                className="space-y-1 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70 p-4"
                                            >
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                    {branch.name}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-500">
                                                    {branch.address}
                                                </p>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={
                                                        formState.stocks[
                                                            branchKey
                                                        ] ?? "0"
                                                    }
                                                    onChange={(event) =>
                                                        updateStockField(
                                                            branchKey,
                                                            event.target.value
                                                        )
                                                    }
                                                    className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-lg border border-dashed border-[#fa7316]/60 bg-[#fa7316]/10 px-4 py-3 text-sm text-[#fa7316]">
                                    Crea una sucursal para asignar stock.
                                </div>
                            )}
                        </div>
                    )}

                    {formError && (
                        <div className="rounded-lg border border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300">
                            {formError}
                        </div>
                    )}
                    {successMessage && (
                        <div className="rounded-lg border border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {successMessage}
                        </div>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() => navigate("/admin/inventory")}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? "Guardando cambios..."
                                : "Guardar cambios"}
                        </button>
                    </div>
                </form>

                <aside className="space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 p-6 text-slate-900 dark:text-white ">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Vista previa</h2>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            Así se muestra el producto actualmente.
                        </p>
                        <div className="mt-4 flex flex-col items-center gap-4">
                            <div className="h-48 w-48 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950 flex items-center justify-center">
                                {formState.imageFile ? (
                                    <img
                                        src={previewImageUrl ?? ""}
                                        alt={formState.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : currentImageUrl ? (
                                    <img
                                        src={currentImageUrl}
                                        alt={formState.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <BiDish className="h-12 w-12 text-slate-500 dark:text-slate-600" />
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={requestRemoveImage}
                                className="inline-flex items-center gap-2 rounded-lg border border-red-500 bg-red-50 dark:bg-red-500 px-4 py-2 text-xs font-semibold text-red-600 transition hover:border-red-500 hover:bg-red-100 hover:text-red-700 dark:text-red-200 dark:hover:text-red-100 dark:hover:bg-red-500 disabled:opacity-50"
                                disabled={
                                    isSubmitting ||
                                    isDeleting ||
                                    (!currentImageUrl &&
                                        !formState.imageFile &&
                                        !previewImageUrl)
                                }
                            >
                                <MdDeleteOutline />
                                Quitar imagen
                            </button>
                            <div className="w-full space-y-1 text-center">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {formState.name}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    {formState.description}
                                </p>
                                <p className="text-lg font-semibold text-[#fa7316]">
                                    {formatCurrency(
                                        Number(formState.price) || 0
                                    )}
                                </p>
                            </div>
                            <div className="w-full space-y-3 pt-2">
                                <div className="flex items-center justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setFormState((previous) => {
                                                const newInventoryActivated = !previous.inventoryActivated;
                                                // Si se desactiva el inventario, poner todos los stocks en cero
                                                const newStocks = newInventoryActivated
                                                    ? previous.stocks
                                                    : Object.keys(previous.stocks).reduce<Record<string, string>>(
                                                          (acc, branchId) => {
                                                              acc[branchId] = "0";
                                                              return acc;
                                                          },
                                                          {}
                                                      );
                                                
                                                return {
                                                    ...previous,
                                                    inventoryActivated: newInventoryActivated,
                                                    // Si se desactiva el inventario, también desactivar ventas en negativo
                                                    allowNegativeSale: previous.inventoryActivated ? false : previous.allowNegativeSale,
                                                    stocks: newStocks,
                                                };
                                            })
                                        }
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                                            formState.inventoryActivated
                                                ? "bg-[#fa7316]"
                                                : "bg-slate-300 dark:bg-slate-700"
                                        }`}
                                        role="switch"
                                        aria-checked={formState.inventoryActivated}
                                        aria-label="Activar control de inventario"
                                        disabled={isSubmitting || isDeleting}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                formState.inventoryActivated
                                                    ? "translate-x-6"
                                                    : "translate-x-1"
                                            }`}
                                        />
                                    </button>
                                    <span className="text-sm text-slate-600 dark:text-slate-300">
                                        Control de inventario
                                    </span>
                                </div>
                                {formState.inventoryActivated && (
                                    <div className="flex items-center justify-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setFormState((previous) => ({
                                                    ...previous,
                                                    allowNegativeSale: !previous.allowNegativeSale,
                                                }))
                                            }
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                                                formState.allowNegativeSale
                                                    ? "bg-[#fa7316]"
                                                    : "bg-slate-300 dark:bg-slate-700"
                                            }`}
                                            role="switch"
                                            aria-checked={formState.allowNegativeSale}
                                            aria-label="Permitir ventas en negativo"
                                            disabled={isSubmitting || isDeleting}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    formState.allowNegativeSale
                                                        ? "translate-x-6"
                                                        : "translate-x-1"
                                                }`}
                                            />
                                        </button>
                                        <span className="text-sm text-slate-600 dark:text-slate-300">
                                            Ventas en negativo
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {formState.inventoryActivated && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 p-6 text-slate-900 dark:text-white ">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Stock por sucursal
                            </h2>
                            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                                {branches.map((branch) => {
                                    const key = branch._id as unknown as string;
                                    return (
                                        <div
                                            key={key}
                                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40 px-4 py-3"
                                        >
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">
                                                    {branch.name}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-500">
                                                    {branch.address}
                                                </p>
                                            </div>
                                            <span className="rounded-lg border border-slate-200 dark:border-white/10 px-3 py-1 font-semibold text-slate-900 dark:text-white">
                                                {formState.stocks[key] ?? "0"}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </aside>
            </div>
            <ConfirmDialog
                isOpen={pendingAction !== null}
                title={
                    pendingAction === "delete-product"
                        ? "Eliminar producto"
                        : "Quitar imagen del producto"
                }
                description={
                    pendingAction === "delete-product"
                        ? "Se eliminará el producto de forma permanente junto con su inventario asociado. Esta acción no se puede deshacer."
                        : "Se quitará la imagen actual del producto. Para aplicar el cambio recuerda guardar antes de salir."
                }
                confirmLabel={
                    pendingAction === "delete-product"
                        ? "Eliminar"
                        : "Quitar imagen"
                }
                cancelLabel="Cancelar"
                tone="danger"
                isConfirming={
                    pendingAction === "delete-product" ? isDeleting : false
                }
                onCancel={() => {
                    if (isDeleting) {
                        return;
                    }
                    setPendingAction(null);
                }}
                onConfirm={() => {
                    if (pendingAction === "delete-product") {
                        void executeDeleteProduct();
                    } else if (pendingAction === "remove-image") {
                        executeRemoveImage();
                    }
                }}
            />
        </div>
    );
};

export default AdminProductDetail;
