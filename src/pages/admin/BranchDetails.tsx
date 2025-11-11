import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { ChangeEvent, FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

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

type BranchFormState = {
  name: string;
  address: string;
  tables: string;
};

const DEFAULT_BRANCH_FORM: BranchFormState = {
  name: "",
  address: "",
  tables: "0",
};

const BranchDetails = () => {
  const params = useParams();
  const branchIdParam = params.branchId;
  const branchId = branchIdParam ? (branchIdParam as Id<"branches">) : undefined;
  const navigate = useNavigate();
  const location = useLocation();

  const branches = useQuery(api.branches.list) as Doc<"branches">[] | undefined;
  const categories = useQuery(
    api.branchInventory.categories,
    branchId ? { branchId } : "skip"
  ) as CategorySummary[] | undefined;

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({});
  const [savingProductId, setSavingProductId] = useState<string | null>(null);
  const updateStock = useMutation(api.branchInventory.updateStock);

  const [isEditingBranch, setIsEditingBranch] = useState(false);
  const [branchForm, setBranchForm] = useState<BranchFormState>(DEFAULT_BRANCH_FORM);
  const [branchFormError, setBranchFormError] = useState<string | null>(null);
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const updateBranch = useMutation(api.branches.update);

  useEffect(() => {
    if (!categories || categories.length === 0) {
      if (selectedCategoryId !== null) {
        setSelectedCategoryId(null);
      }
      return;
    }

    if (!selectedCategoryId) {
      const firstCategoryWithProducts = categories.find((item) => item.productCount > 0);
      const fallbackCategory = firstCategoryWithProducts ?? categories[0];
      setSelectedCategoryId(fallbackCategory.category._id as unknown as string);
    } else if (!categories.some((item) => (item.category._id as unknown as string) === selectedCategoryId)) {
      setSelectedCategoryId(categories[0].category._id as unknown as string);
    }
  }, [categories, selectedCategoryId, branchId]);

  const products =
    useQuery(
      api.branchInventory.productsByCategory,
      branchId && selectedCategoryId
        ? { branchId, categoryId: selectedCategoryId as Id<"categories"> }
        : "skip"
    ) ?? [];

  useEffect(() => {
    const initialDrafts = products.reduce<Record<string, string>>((accumulator, item) => {
      const key = item.product._id as unknown as string;
      accumulator[key] = item.stock.toString();
      return accumulator;
    }, {});
    setStockDrafts(initialDrafts);
  }, [products]);

  const branch = useMemo(
    () => (branchId ? branches?.find((item) => item._id === branchId) ?? null : null),
    [branches, branchId]
  );
  const branchName =
    (location.state as { branchName?: string } | null)?.branchName ?? branch?.name ?? "Sucursal";

  useEffect(() => {
    if (isEditingBranch) {
      return;
    }

    if (branch) {
      setBranchForm((previous) => {
        const next = {
          name: branch.name,
          address: branch.address,
          tables: branch.tables.toString(),
        };

        if (
          previous.name === next.name &&
          previous.address === next.address &&
          previous.tables === next.tables
        ) {
          return previous;
        }

        return next;
      });
    } else if (
      branchForm.name !== DEFAULT_BRANCH_FORM.name ||
      branchForm.address !== DEFAULT_BRANCH_FORM.address ||
      branchForm.tables !== DEFAULT_BRANCH_FORM.tables
    ) {
      setBranchForm({ ...DEFAULT_BRANCH_FORM });
    }
  }, [branch, isEditingBranch, branchForm.name, branchForm.address, branchForm.tables]);

  if (!branchId) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20">
        <h1 className="text-2xl font-semibold text-white">Sucursal no encontrada</h1>
        <p className="mt-2 text-sm text-slate-400">
          No se encontró el identificador de la sucursal. Regresa al listado e inténtalo nuevamente.
        </p>
        <button
          type="button"
          onClick={() => navigate("/admin/branches")}
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-[#fa7316] hover:text-white"
        >
          Volver a sucursales
        </button>
      </div>
    );
  }

  if (branches && branch === null) {
    return (
      <div className="space-y-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20">
          <button
            type="button"
            onClick={() => navigate("/admin/branches")}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300 transition hover:border-[#fa7316] hover:text-white"
          >
            ← Volver
          </button>
          <h1 className="mt-4 text-3xl font-semibold text-white">Sucursal no disponible</h1>
          <p className="mt-2 text-sm text-slate-400">
            No pudimos encontrar la información de esta sucursal. Verifica el enlace o regresa al listado.
          </p>
        </header>
      </div>
    );
  }

  const formattedAddress = branch ? `${branch.address} · ${branch.tables} mesas` : "";

  const handleStockChange = (productId: string, event: ChangeEvent<HTMLInputElement>) => {
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
        tables: branch.tables.toString(),
      });
    } else {
      setBranchForm(DEFAULT_BRANCH_FORM);
    }
    setBranchFormError(null);
    setIsSavingBranch(false);
  };

  const handleBranchFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!branchId) {
      return;
    }

    setBranchFormError(null);

    if (!branchForm.name.trim() || !branchForm.address.trim()) {
      setBranchFormError("Completa el nombre y la dirección de la sucursal.");
      return;
    }

    const tables = Number(branchForm.tables);
    if (Number.isNaN(tables) || tables < 0) {
      setBranchFormError("La cantidad de mesas debe ser un número positivo.");
      return;
    }

    try {
      setIsSavingBranch(true);
      await updateBranch({
        branchId,
        name: branchForm.name.trim(),
        address: branchForm.address.trim(),
        tables,
      });
      setIsEditingBranch(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo actualizar la sucursal. Inténtalo de nuevo.";
      setBranchFormError(message);
    } finally {
      setIsSavingBranch(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate("/admin/branches")}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300 transition hover:border-[#fa7316] hover:text-white"
          >
            ← Volver
          </button>
          <div>
            <h1 className="text-3xl font-semibold text-white">Sucursal · {branchName}</h1>
            {formattedAddress && <p className="mt-1 text-sm text-slate-400">{formattedAddress}</p>}
            <p className="mt-2 text-sm text-slate-400">
              Ajusta los datos de la sucursal y gestiona el inventario disponible en este local.
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-white shadow-inner shadow-black/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
              Información de la sucursal
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Mantén actualizados el nombre, la dirección y la cantidad de mesas.
            </p>
          </div>
          {!isEditingBranch && (
            <button
              type="button"
              onClick={() => {
                setIsEditingBranch(true);
                resetBranchForm();
              }}
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300 transition hover:border-[#fa7316] hover:text-white"
            >
              Editar información
            </button>
          )}
        </div>

        {isEditingBranch ? (
          <form className="mt-6 space-y-5" onSubmit={handleBranchFormSubmit}>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-200">
                  Nombre de la sucursal
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={branchForm.name}
                  onChange={handleBranchFormChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                />
              </div>
              <div className="space-y-2 lg:col-span-2">
                <label htmlFor="address" className="text-sm font-medium text-slate-200">
                  Dirección
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  required
                  value={branchForm.address}
                  onChange={handleBranchFormChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="tables" className="text-sm font-medium text-slate-200">
                  Cantidad de mesas
                </label>
                <input
                  id="tables"
                  name="tables"
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={branchForm.tables}
                  onChange={handleBranchFormChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                />
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
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-[#fa7316] hover:text-white"
                disabled={isSavingBranch}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#fa7316]/40 transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSavingBranch}
              >
                {isSavingBranch ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Nombre</span>
              <p className="mt-2 text-lg font-semibold text-white">{branch?.name ?? "—"}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 lg:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Dirección</span>
              <p className="mt-2 text-lg font-semibold text-white">{branch?.address ?? "—"}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Mesas</span>
              <p className="mt-2 text-lg font-semibold text-white">{branch?.tables ?? "—"}</p>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">
          Categorías
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories?.map((item) => {
            const categoryId = item.category._id as unknown as string;
            const isSelected = categoryId === selectedCategoryId;
            return (
              <button
                key={categoryId}
                type="button"
                onClick={() => setSelectedCategoryId(categoryId)}
                className={`flex flex-col gap-3 rounded-3xl border px-6 py-5 text-left transition ${
                  isSelected
                    ? "border-[#fa7316] bg-[#fa7316]/10 text-white"
                    : "border-slate-800 bg-slate-900 text-slate-300 hover:border-[#fa7316]/50 hover:text-white"
                }`}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                  {item.productCount} productos
                </span>
                <span className="text-lg font-semibold">{item.category.name}</span>
                <span className="text-xs text-slate-500">
                  {isSelected ? "Seleccionado" : "Toca para gestionar"}
                </span>
              </button>
            );
          })}
          {(!categories || categories.length === 0) && (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-6 text-sm text-slate-400">
              Crea categorías para comenzar a clasificar productos en esta sucursal.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-white shadow-inner shadow-black/20">
        {selectedCategoryId === null ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-400">
            <span className="text-4xl" aria-hidden>
              🗂️
            </span>
            <p className="text-sm text-slate-400">
              Selecciona una categoría para gestionar el inventario de sus productos.
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-400">
            <span className="text-4xl" aria-hidden>
              📦
            </span>
            <p className="text-sm text-slate-400">
              No hay productos en esta categoría. Agrega productos desde el catálogo general.
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
                    Precio
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Stock
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-200">
                {products.map((item) => {
                  const productId = item.product._id as unknown as string;
                  return (
                    <tr key={productId} className="transition hover:bg-slate-900/60">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
                            {item.imageUrl ? (
                              <img src={item.imageUrl} alt={item.product.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xl text-slate-600">
                                🍽️
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{item.product.name}</p>
                            <p className="text-xs text-slate-400">{item.product.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        {formatCurrency(item.product.price)}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={stockDrafts[productId] ?? item.stock.toString()}
                          onChange={(event) => handleStockChange(productId, event)}
                          className="w-24 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => handleSaveStock(item)}
                          className="inline-flex items-center justify-center rounded-xl bg-[#fa7316] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[#fa7316]/30 transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                          disabled={savingProductId === productId}
                        >
                          {savingProductId === productId ? "Guardando..." : "Guardar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);
}

export default BranchDetails;


