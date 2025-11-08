import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FormEvent, ChangeEvent } from "react";
import imageCompression from "browser-image-compression";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

type ProductListItem = Doc<"products"> & {
  imageUrl: string | null;
  categoryName: string;
  totalStock: number;
};

type ProductFormState = {
  name: string;
  description: string;
  categoryId: string;
  price: string;
  stocks: Record<string, string>;
  imageFile: File | null;
};

const DEFAULT_FORM: ProductFormState = {
  name: "",
  description: "",
  categoryId: "",
  price: "",
  stocks: {},
  imageFile: null,
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);

const formatDateTime = (value: number) =>
  new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(value);

const AdminInventory = () => {
  const products = useQuery(api.products.list) as ProductListItem[] | undefined;
  const categories = useQuery(api.categories.list) as Doc<"categories">[] | undefined;
  const branches = useQuery(api.branches.list) as Doc<"branches">[] | undefined;
  const generateUploadUrl = useMutation(api.products.generateUploadUrl);
  const createProduct = useMutation(api.products.create);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<ProductFormState>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const productCount = products?.length ?? 0;
  const categoryCount = categories?.length ?? 0;
  const branchCount = branches?.length ?? 0;

  const sortedProducts = useMemo(() => products ?? [], [products]);

  const updateField = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState((previous) => ({ ...previous, [name]: value }));
  };

  const updateStockField = (branchId: string, value: string) => {
    setFormState((previous) => ({
      ...previous,
      stocks: {
        ...previous.stocks,
        [branchId]: value,
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
    });
    setFormError(null);
  };

  const handleCreateProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!formState.categoryId) {
      setFormError("Selecciona una categoría para el producto.");
      return;
    }

    if (!formState.imageFile) {
      setFormError("Selecciona una imagen para el producto.");
      return;
    }

    if (!branches || branches.length === 0) {
      setFormError("Crea al menos una sucursal antes de agregar productos.");
      return;
    }

    const price = Number(formState.price);
    if (Number.isNaN(price) || price < 0) {
      setFormError("Ingresa un precio válido.");
      return;
    }

    let stockByBranch: { branchId: Id<"branches">; stock: number }[];

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

    try {
      setIsSubmitting(true);
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

      const { storageId } = (await uploadResponse.json()) as { storageId: Id<"_storage"> };

      await createProduct({
        name: formState.name.trim(),
        description: formState.description.trim(),
        categoryId: formState.categoryId as Id<"categories">,
        price,
        stockByBranch,
        image: storageId,
      });

      initializeForm();
      setIsFormOpen(false);
      setIsSubmitting(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Ocurrió un problema creando el producto.";
      setFormError(message);
      setIsSubmitting(false);
    }
  };

  const canCreateProducts = Boolean(categories && categories.length > 0 && branches && branches.length > 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
            Inventario
          </div>
          <div>
            <h1 className="text-3xl font-semibold">Productos registrados</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Gestiona los productos disponibles en cada sucursal. Mantén actualizado el stock por tienda y asegúrate
              de que cada artículo tenga su imagen y categoría correspondiente.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 md:items-end">
          <div className="inline-flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="rounded-full border border-[#fa7316]/30 bg-[#fa7316]/10 px-4 py-1 font-semibold uppercase tracking-[0.18em] text-[#fa7316]">
              {productCount} productos
            </span>
            <span className="rounded-full border border-white/10 px-4 py-1 font-semibold uppercase tracking-[0.18em] text-white/70">
              {categoryCount} categorías
            </span>
            <span className="rounded-full border border-white/10 px-4 py-1 font-semibold uppercase tracking-[0.18em] text-white/70">
              {branchCount} sucursales
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsFormOpen(true);
              initializeForm();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#fa7316]/40 transition hover:bg-[#e86811]"
            disabled={!canCreateProducts}
          >
            Agregar producto
            <span aria-hidden>＋</span>
          </button>
          {!canCreateProducts && (
            <span className="text-xs text-[#fa7316]">
              Crea al menos una categoría y una sucursal para habilitar este flujo.
            </span>
          )}
        </div>
      </header>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-white shadow-inner shadow-black/20">
        {sortedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-400">
            <span className="text-4xl" aria-hidden>
              📦
            </span>
            <p className="text-sm text-slate-400">
              Todavía no hay productos registrados. Agrega tu primer producto para comenzar a gestionar el inventario.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.24em] text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Producto
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Categoría
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Precio
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Stock total
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Última actualización
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-200">
                {sortedProducts.map((product) => (
                  <ProductRow key={product._id as unknown as string} product={product} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-10 backdrop-blur">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-8 text-white shadow-2xl shadow-black/60">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:text-white"
              aria-label="Cerrar"
            >
              ✕
            </button>
            <header className="mb-6 space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                Nuevo producto
              </span>
              <h2 className="text-2xl font-semibold text-white">Crear producto</h2>
              <p className="text-sm text-slate-400">
                Completa los detalles del producto y asigna el stock inicial para cada sucursal.
              </p>
            </header>
            <form className="space-y-5" onSubmit={handleCreateProduct}>
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
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
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
                      required
                      value={formState.categoryId}
                      onChange={updateField}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
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
                    <div className="rounded-xl border border-dashed border-[#fa7316]/60 bg-[#fa7316]/10 px-4 py-3 text-sm text-[#fa7316]">
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
                  required
                  rows={3}
                  value={formState.description}
                  onChange={updateField}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="price" className="text-sm font-medium text-slate-200">
                    Precio
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
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                  />
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
                    required
                    onChange={handleImageChange}
                    className="w-full cursor-pointer rounded-xl border border-dashed border-slate-700 bg-slate-900 px-4 py-4 text-sm text-slate-400 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-[#fa7316] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:border-[#fa7316]/50"
                  />
                  <p className="text-xs text-slate-500">
                    Se optimizará automáticamente antes de subirla. Tamaño recomendado máx. 1280px.
                  </p>
                </div>
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
                          className="space-y-1 rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
                        >
                          <p className="text-sm font-semibold text-white">{branch.name}</p>
                          <p className="text-xs text-slate-500">
                            {branch.address} · {branch.tables} mesas
                          </p>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={formState.stocks[branchKey] ?? "0"}
                            onChange={(event) => updateStockField(branchKey, event.target.value)}
                            className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#fa7316]/60 bg-[#fa7316]/10 px-4 py-3 text-sm text-[#fa7316]">
                    Crea una sucursal para asignar stock.
                  </div>
                )}
              </div>

              {formError && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-[#fa7316] hover:text-white"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#fa7316]/40 transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Guardando..." : "Guardar producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ProductRow = ({ product }: { product: ProductListItem }) => {
  return (
    <tr className="transition hover:bg-slate-900/60">
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl text-slate-600">🍽️</div>
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
      <td className="px-6 py-4 text-xs text-slate-500">{formatDateTime(product.createdAt)}</td>
    </tr>
  );
};

export default AdminInventory;

