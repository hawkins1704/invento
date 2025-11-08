import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { ChangeEvent, FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

const DEFAULT_FORM = {
  name: "",
};

const AdminCategories = () => {
  const categories = useQuery(api.categories.list) as Doc<"categories">[] | undefined;
  const createCategory = useMutation(api.categories.create);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const sortedCategories = useMemo(() => categories ?? [], [categories]);

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
      setIsFormOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear la categoría. Inténtalo de nuevo.";
      setFormError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
            Categorías
          </div>
          <div>
            <h1 className="text-3xl font-semibold">Clasificación de productos</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Organiza tus productos con categorías claras para facilitar la búsqueda y los reportes. Crea nuevas
              categorías o actualiza las existentes cuando sea necesario.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 md:items-end">
          <span className="rounded-full border border-[#fa7316]/30 bg-[#fa7316]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#fa7316]">
            {sortedCategories.length} categorías
          </span>
          <button
            type="button"
            onClick={() => {
              setIsFormOpen(true);
              resetForm();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#fa7316]/40 transition hover:bg-[#e86811]"
          >
            Agregar categoría
            <span aria-hidden>＋</span>
          </button>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-white shadow-inner shadow-black/20">
        {sortedCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-400">
            <span className="text-4xl" aria-hidden>
              🏷️
            </span>
            <p className="text-sm text-slate-400">
              Aún no tienes categorías creadas. Crea la primera para organizar tu inventario.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.24em] text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Categoría
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Creada
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-200">
                {sortedCategories.map((category) => (
                  <CategoryRow key={category._id} category={category} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-10 backdrop-blur">
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-8 text-white shadow-2xl shadow-black/60">
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
                Nueva categoría
              </span>
              <h2 className="text-2xl font-semibold text-white">Crear categoría</h2>
              <p className="text-sm text-slate-400">
                Asigna un nombre descriptivo para que el equipo pueda identificarla fácilmente.
              </p>
            </header>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-200">
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
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                />
              </div>

              {formError && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {formError}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsFormOpen(false);
                  }}
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

const CategoryRow = ({ category }: { category: Doc<"categories"> }) => {
  const formattedDate = new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(category.createdAt);

  return (
    <tr className="transition hover:bg-slate-900/60">
      <td className="px-6 py-4 text-sm font-semibold text-white">{category.name}</td>
      <td className="px-6 py-4 text-xs text-slate-500">{formattedDate}</td>
    </tr>
  );
};

export default AdminCategories;

