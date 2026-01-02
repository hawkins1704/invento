import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { IoMdAdd } from "react-icons/io";
import CloseButton from "../../components/CloseButton";
import { FaTags } from "react-icons/fa";
import DataTable from "../../components/table/DataTable";
import TableRow from "../../components/table/TableRow";
import Pagination from "../../components/pagination/Pagination";
import EmptyState from "../../components/empty-state/EmptyState";
import PageHeader from "../../components/page-header/PageHeader";

const DEFAULT_FORM = {
  name: "",
};

const ITEMS_PER_PAGE = 10;

const CategoryCard = ({
  category,
  onSelect,
}: {
  category: Doc<"categories">;
  onSelect: (category: Doc<"categories">) => void;
}) => {
  return (
    <div
      className="cursor-pointer rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/40 p-4 transition hover:bg-slate-100 dark:hover:bg-slate-900/60 focus-visible:bg-slate-100 dark:focus-visible:bg-slate-900/60"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(category)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(category);
        }
      }}
    >
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{category.name}</p>
    </div>
  );
};

const AdminCategories = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const categoriesData = useQuery(api.categories.list, {
    limit: ITEMS_PER_PAGE,
    offset,
  }) as { categories: Doc<"categories">[]; total: number } | undefined;

  const categories = categoriesData?.categories ?? [];
  const totalCategories = categoriesData?.total ?? 0;
  const totalPages = Math.ceil(totalCategories / ITEMS_PER_PAGE);

  const createCategory = useMutation(api.categories.create);
  const navigate = useNavigate();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [formState, setFormState] = useState(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsFormOpen(false);
      setIsClosing(false);
      resetForm();
    }, 300); // Esperar a que termine la animación (300ms)
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState((previous) => ({ ...previous, [name]: value }));
  };

  const resetForm = () => {
    setFormState(DEFAULT_FORM);
    setFormError(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!formState.name.trim()) {
      setFormError("Ingresa un nombre para la categoría.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createCategory({ name: formState.name.trim() });
      resetForm();
      // Reset to first page to see the new category
      setCurrentPage(1);
      // Cerrar con animación
      handleClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear la categoría. Inténtalo de nuevo.";
      setFormError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        chipLabel="Categorías"
        title="Clasificación de productos"
        description="Organiza tus productos con categorías claras para facilitar la búsqueda y los reportes. Crea nuevas categorías o actualiza las existentes cuando sea necesario."
        actionButton={
          <button
            type="button"
            onClick={() => {
              setIsFormOpen(true);
              resetForm();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e86811] cursor-pointer"
          >
            <IoMdAdd />
            <span>Agregar categoría</span>
          </button>
        }
      />

      <section className="">
        {categories.length === 0 ? (
          <EmptyState
            icon={<FaTags className="w-10 h-10" />}
            message="Aún no tienes categorías creadas. Crea la primera para organizar tu inventario."
          />
        ) : (
          <>
            {/* Vista de tarjetas para mobile */}
            <div className="space-y-3 md:hidden">
              {categories.map((category) => (
                <CategoryCard
                  key={category._id}
                  category={category}
                  onSelect={(selected) =>
                    navigate(`/admin/categories/${selected._id}`, {
                      state: { category: selected },
                    })
                  }
                />
              ))}
            </div>
            {/* Vista de tabla para tablet y desktop */}
            <div className="hidden md:block">
              <DataTable
                columns={[{ label: "Categoría", key: "name" }]}
              >
                {categories.map((category) => (
                  <CategoryRow
                    key={category._id}
                    category={category}
                    onSelect={(selected) =>
                      navigate(`/admin/categories/${selected._id}`, {
                        state: { category: selected },
                      })
                    }
                  />
                ))}
              </DataTable>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalCategories}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={handlePageChange}
              itemLabel="categorías"
            />
          </>
        )}
      </section>

      {isFormOpen && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-10 backdrop-blur ${isClosing ? 'animate-[fadeOut_0.3s_ease-out]' : 'animate-[fadeIn_0.2s_ease-out]'}`}>
          <div className={`absolute inset-0 bg-black/40 dark:bg-slate-950/70 ${isClosing ? 'animate-[fadeOut_0.3s_ease-out]' : 'animate-[fadeIn_0.2s_ease-out]'}`} />
          <div className={`relative w-full max-w-lg rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-8 text-slate-900 dark:text-white shadow-2xl shadow-black/60 ${isClosing ? 'animate-[fadeOutScale_0.3s_ease-out]' : 'animate-[fadeInScale_0.3s_ease-out]'}`}>
            <CloseButton onClick={handleClose} />
            <header className="mb-6 space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-200 dark:bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-700 dark:text-white">
                Nueva categoría
              </span>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Crear categoría</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Asigna un nombre descriptivo para que el equipo pueda identificarla fácilmente.
              </p>
            </header>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Nombre de categoría
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  autoFocus
                  value={formState.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>

              {formError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleClose}
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
                  {isSubmitting ? "Guardando..." : "Guardar categoría"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const CategoryRow = ({
  category,
  onSelect,
}: {
  category: Doc<"categories">;
  onSelect: (category: Doc<"categories">) => void;
}) => {
  return (
    <TableRow onClick={() => onSelect(category)}>
      <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">{category.name}</td>
    </TableRow>
  );
};

export default AdminCategories;

