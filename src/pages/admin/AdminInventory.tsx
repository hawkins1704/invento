import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FormEvent, ChangeEvent } from "react";
import imageCompression from "browser-image-compression";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { ProductListItem } from "../../types/products";
import { IoMdAdd } from "react-icons/io";
import { BiDish } from "react-icons/bi";
import { FaBoxArchive } from "react-icons/fa6";
import DataTable from "../../components/table/DataTable";
import TableRow from "../../components/table/TableRow";
import Pagination from "../../components/pagination/Pagination";
import EmptyState from "../../components/empty-state/EmptyState";
import PageHeader from "../../components/page-header/PageHeader";

type ProductFormState = {
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

const DEFAULT_FORM: ProductFormState = {
  name: "",
  description: "",
  categoryId: "",
  unitValue: "",
  price: "",
  stocks: {},
  imageFile: null,
  inventoryActivated: true,
  allowNegativeSale: false,
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);

const ITEMS_PER_PAGE = 10;

const AdminInventory = () => {
  const [currentPage, setCurrentPage] = useState(1);
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

  const categories = allCategoriesData?.categories ?? [];
  const branches = allBranchesData?.branches ?? [];
  const currentUser = useQuery(api.users.getCurrent) as Doc<"users"> | undefined;
  const generateUploadUrl = useMutation(api.products.generateUploadUrl);
  const createProduct = useMutation(api.products.create);
  const navigate = useNavigate();

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const productsData = useQuery(api.products.list, {
    limit: ITEMS_PER_PAGE,
    offset,
  }) as { products: ProductListItem[]; total: number } | undefined;

  const products = productsData?.products ?? [];
  const totalProducts = productsData?.total ?? 0;
  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [formState, setFormState] = useState<ProductFormState>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastEditedField, setLastEditedField] = useState<"unitValue" | "price" | null>(null);
  
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsFormOpen(false);
      setIsClosing(false);
      initializeForm();
    }, 300); // Esperar a que termine la animación (300ms)
  };

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

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const updateField = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setLastEditedField(name === "unitValue" || name === "price" ? name : null);
    setFormState((previous) => {
      const updated = { ...previous, [name]: value };
      
      // Función para redondear a 2 decimales
      const roundToCents = (val: number): number => Math.round(val * 100) / 100;
      
      // Si se editó unitValue, actualizar price calculado
      if (name === "unitValue") {
        const newUnitValue = roundToCents(Number(value) || 0);
        const newIGV = roundToCents((newUnitValue * IGVPercentage) / 100);
        const newPrice = roundToCents(newUnitValue + newIGV);
        updated.price = newPrice.toFixed(2);
      }
      // Si se editó price, actualizar unitValue calculado
      else if (name === "price") {
        const newPrice = roundToCents(Number(value) || 0);
        const newUnitValue = roundToCents(newPrice / (1 + IGVPercentage / 100));
        updated.unitValue = newUnitValue.toFixed(2);
      }
      
      return updated;
    });
  };

const updateStockField = (branchId: string, value: string) => {
  const parsedValue = Number(value);
  const sanitized =
    Number.isNaN(parsedValue) || parsedValue < 0 ? "0" : String(Math.floor(parsedValue));

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
  };

  const initializeForm = () => {
    const initialCategory =
      categories && categories.length > 0 ? (categories[0]._id as unknown as string) : "";
    const initialStocks =
      branches?.reduce<Record<string, string>>((accumulator, branch) => {
        const key = branch._id as unknown as string;
        accumulator[key] = "0";
        return accumulator;
      }, {}) ?? {};

    setFormState({
      ...DEFAULT_FORM,
      categoryId: initialCategory,
      stocks: initialStocks,
      inventoryActivated: true,
      allowNegativeSale: false,
    });
    setLastEditedField(null);
    setFormError(null);
  };

  const handleCreateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!formState.categoryId) {
      setFormError("Selecciona una categoría para el producto.");
      return;
    }

    // Función para redondear a 2 decimales
    const roundToCents = (val: number): number => Math.round(val * 100) / 100;
    
    // Siempre usar el valor unitario del estado (ya está calculado correctamente)
    const finalUnitValue = roundToCents(Number(formState.unitValue));
    if (Number.isNaN(finalUnitValue) || finalUnitValue < 0) {
      setFormError("Ingresa un valor unitario válido.");
      return;
    }

    let stockByBranch: { branchId: Id<"branches">; stock: number }[] = [];

    // Solo validar y procesar stock si el inventario está activado
    if (formState.inventoryActivated) {
      if (!branches || branches.length === 0) {
        setFormError("Crea al menos una sucursal antes de agregar productos con inventario.");
        return;
      }

      try {
        stockByBranch = branches.map((branch) => {
          const key = branch._id as unknown as string;
          const rawValue = formState.stocks[key] ?? "0";
          const parsed = Number(rawValue);
          if (Number.isNaN(parsed) || parsed < 0) {
            throw new Error(`El stock para la sucursal ${branch.name} no es válido.`);
          }
          return {
            branchId: branch._id,
            stock: Math.floor(parsed),
          };
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Revisa los valores de stock ingresados.";
        setFormError(message);
        return;
      }
    }

    try {
      setIsSubmitting(true);

      let storageId: Id<"_storage"> | undefined;

      if (formState.imageFile) {
        const uploadUrl = await generateUploadUrl();

        const compressedFile = await imageCompression(formState.imageFile, {
          maxSizeMB: 1,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        });

        const uploadResponse = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": compressedFile.type },
          body: compressedFile,
        });

        if (!uploadResponse.ok) {
          throw new Error("No se pudo subir la imagen, intenta nuevamente.");
        }

        const response = (await uploadResponse.json()) as { storageId: Id<"_storage"> };
        storageId = response.storageId;
      }

      await createProduct({
        name: formState.name.trim(),
        description: formState.description.trim(),
        categoryId: formState.categoryId as Id<"categories">,
        unitValue: finalUnitValue,
        stockByBranch,
        ...(storageId ? { image: storageId } : {}),
        inventoryActivated: formState.inventoryActivated,
        allowNegativeSale: formState.allowNegativeSale,
      });

      // Reset to first page to see the new product
      setCurrentPage(1);
      // Cerrar con animación
      handleClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ocurrió un problema creando el producto.";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCreateProducts = Boolean(categories && categories.length > 0 && branches && branches.length > 0);

  return (
    <div className="space-y-8">
      <PageHeader
        chipLabel="Inventario"
        title="Productos registrados"
        description="Gestiona los productos disponibles en cada sucursal. Mantén actualizado el stock por tienda y asegúrate de que cada artículo tenga su imagen y categoría correspondiente."
        actionButton={
          <>
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(true);
                initializeForm();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e86811] cursor-pointer"
              disabled={!canCreateProducts}
            >
              <IoMdAdd />
              <span>Agregar producto</span>
            </button>
            {!canCreateProducts && (
              <span className="text-xs text-[#fa7316]">
                Crea al menos una categoría y una sucursal para habilitar este flujo.
              </span>
            )}
          </>
        }
      />

      <section className="">
        {products.length === 0 ? (
          <EmptyState
            icon={<FaBoxArchive className="w-10 h-10" />}
            message="Todavía no hay productos registrados. Agrega tu primer producto para comenzar a gestionar el inventario."
          />
        ) : (
          <>
            {/* Vista de tarjetas para mobile */}
            <div className="space-y-3 md:hidden">
              {products.map((product) => (
                <ProductCard
                  key={product._id as unknown as string}
                  product={product}
                  onSelect={(selected) =>
                    navigate(`/admin/inventory/${selected._id}`, {
                      state: { product: selected },
                    })
                  }
                />
              ))}
            </div>
            {/* Vista de tabla para tablet y desktop */}
            <div className="hidden md:block">
              <DataTable
                columns={[
                  { label: "Producto", key: "product" },
                  { label: "Categoría", key: "category" },
                  { label: "Precio", key: "price" },
                  { label: "Stock total", key: "stock" },
                ]}
              >
                {products.map((product) => (
                  <ProductRow
                    key={product._id as unknown as string}
                    product={product}
                    onSelect={(selected) =>
                      navigate(`/admin/inventory/${selected._id}`, {
                        state: { product: selected },
                      })
                    }
                  />
                ))}
              </DataTable>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalProducts}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={handlePageChange}
              itemLabel="productos"
            />
          </>
        )}
      </section>

      {isFormOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-10 backdrop-blur ${isClosing ? 'animate-[fadeOut_0.3s_ease-out]' : 'animate-[fadeIn_0.2s_ease-out]'}`}>
          <div className={`absolute inset-0 bg-slate-950/70 ${isClosing ? 'animate-[fadeOut_0.3s_ease-out]' : 'animate-[fadeIn_0.2s_ease-out]'}`} />
          <div className={`relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-lg border border-slate-800 bg-slate-900 text-white shadow-2xl shadow-black/60 ${isClosing ? 'animate-[fadeOutScale_0.3s_ease-out]' : 'animate-[fadeInScale_0.3s_ease-out]'}`}>
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition hover:text-white"
              aria-label="Cerrar"
            >
              ✕
            </button>
            <header className="px-8 pt-8 pb-6 space-y-2 flex-shrink-0">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white">
                Nuevo producto
              </span>
              <h2 className="text-2xl font-semibold text-white">Crear producto</h2>
              <p className="text-sm text-slate-400">
                Completa los detalles del producto y asigna el stock inicial para cada sucursal.
              </p>
            </header>
            <div className="flex-1 overflow-y-auto px-8">
              <form id="product-form" className="space-y-5 pb-5" onSubmit={handleCreateProduct}>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-slate-200">
                    Nombre
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formState.name}
                    onChange={updateField}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                  />
                </div>
                {categories && categories.length > 0 ? (
                  <div className="space-y-2">
                    <label htmlFor="categoryId" className="text-sm font-medium text-slate-200">
                      Categoría
                    </label>
                    <select
                      id="categoryId"
                      name="categoryId"
                      value={formState.categoryId}
                      onChange={updateField}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                    >
                      {categories.map((category) => {
                        const categoryKey = category._id as unknown as string;
                        return (
                          <option key={categoryKey} value={categoryKey}>
                            {category.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-200">Categoría</label>
                    <div className="rounded-lg border border-dashed border-[#fa7316]/60 bg-[#fa7316]/10 px-4 py-3 text-sm text-[#fa7316]">
                      Crea una categoría antes de agregar productos.
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium text-slate-200">
                  Descripción
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formState.description}
                  onChange={updateField}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                />
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="unitValue" className="text-sm font-medium text-slate-200">
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
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="igv" className="text-sm font-medium text-slate-200">
                    IGV ({IGVPercentage}%)
                  </label>
                  <input
                    id="igv"
                    name="igv"
                    type="number"
                    disabled
                    value={igv.toFixed(2)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-400 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="price" className="text-sm font-medium text-slate-200">
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
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="image" className="text-sm font-medium text-slate-200">
                  Imagen del producto
                </label>
                <input
                  id="image"
                  name="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full cursor-pointer rounded-lg border border-dashed border-slate-700 bg-slate-900 px-4 py-4 text-sm text-slate-400 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#fa7316] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-[#fa7316]/50"
                />
                <p className="text-xs text-slate-500">
                  Se optimizará automáticamente antes de subirla. Tamaño recomendado máx. 1280px.
                  Este campo es opcional.
                </p>
              </div>

              <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/60 p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-white">
                      Control de inventario
                    </label>
                    <p className="text-xs text-slate-400">
                      Activa el control de stock para este producto
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormState((previous) => ({
                        ...previous,
                        inventoryActivated: !previous.inventoryActivated,
                        // Si se desactiva el inventario, también desactivar ventas en negativo
                        allowNegativeSale: previous.inventoryActivated ? false : previous.allowNegativeSale,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                      formState.inventoryActivated
                        ? "bg-[#fa7316]"
                        : "bg-slate-700"
                    }`}
                    role="switch"
                    aria-checked={formState.inventoryActivated}
                    aria-label="Activar control de inventario"
                    disabled={isSubmitting}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formState.inventoryActivated
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {formState.inventoryActivated && (
                  <div className="space-y-4 border-t border-slate-800 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-white">
                          Permitir ventas en negativo
                        </label>
                        <p className="text-xs text-slate-400">
                          Permite vender aunque el stock sea 0 o negativo
                        </p>
                      </div>
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
                            : "bg-slate-700"
                        }`}
                        role="switch"
                        aria-checked={formState.allowNegativeSale}
                        aria-label="Permitir ventas en negativo"
                        disabled={isSubmitting}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formState.allowNegativeSale
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-white">Stock inicial por sucursal</p>
                      {branches && branches.length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          {branches.map((branch) => {
                            const branchKey = branch._id as unknown as string;
                            return (
                              <div
                                key={branchKey}
                                className="space-y-1 rounded-lg border border-slate-800 bg-slate-900/70 p-4"
                              >
                                <p className="text-sm font-semibold text-white">{branch.name}</p>
                                <p className="text-xs text-slate-500">
                                  {branch.address}
                                </p>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={formState.stocks[branchKey] ?? "0"}
                                  onChange={(event) => updateStockField(branchKey, event.target.value)}
                                  className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
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
                  </div>
                )}
              </div>

              {formError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {formError}
                </div>
              )}
              </form>
            </div>
            <div className="px-8 pb-8 pt-4 flex-shrink-0 border-t border-slate-800 bg-slate-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-[#fa7316] hover:text-white"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="product-form"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#fa7316]/40 transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Guardando..." : "Guardar producto"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProductCard = ({
  product,
  onSelect,
}: {
  product: ProductListItem;
  onSelect: (product: ProductListItem) => void;
}) => {
  return (
    <div
      className="cursor-pointer rounded-lg border border-slate-800 bg-slate-950/40 p-4 transition hover:bg-slate-900/60 focus-visible:bg-slate-900/60"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(product)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(product);
        }
      }}
    >
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 flex items-center justify-center">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <BiDish className="h-8 w-8 text-slate-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{product.name}</p>
          {product.description && (
            <p className="mt-1 text-xs text-slate-400 line-clamp-2">{product.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div>
              <span className="text-xs text-slate-500">Categoría:</span>
              <p className="text-sm font-medium text-slate-300">{product.categoryName}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Precio:</span>
              <p className="text-sm font-semibold text-white">{formatCurrency(product.price)}</p>
            </div>
            <div>
              <span className="text-xs text-slate-500">Stock:</span>
              <p className="text-sm font-medium text-slate-300">{product.totalStock}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductRow = ({
  product,
  onSelect,
}: {
  product: ProductListItem;
  onSelect: (product: ProductListItem) => void;
}) => {
  return (
    <TableRow onClick={() => onSelect(product)}>
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 flex items-center justify-center">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <BiDish className="h-6 w-6 text-slate-600" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{product.name}</p>
            <p className="text-xs text-slate-400">{product.description}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-sm text-slate-300">{product.categoryName}</td>
      <td className="px-6 py-4 text-sm text-white">{formatCurrency(product.price)}</td>
      <td className="px-6 py-4 text-sm text-slate-300">{product.totalStock}</td>
    </TableRow>
  );
};

export default AdminInventory;

