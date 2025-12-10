import { useEffect,  useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import type { ChangeEvent, FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import ConfirmDialog from "../../components/ConfirmDialog";
import { FaArrowLeft } from "react-icons/fa";
import { MdDeleteOutline } from "react-icons/md";

const AdminCategoryDetail = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { category?: Doc<"categories"> } };

  // Obtener la categoría específica por ID usando la query optimizada
  const categoryFromQuery = useQuery(
    api.categories.getById,
    categoryId ? { categoryId: categoryId as Id<"categories"> } : "skip"
  ) as Doc<"categories"> | null | undefined;

  const updateCategory = useMutation(api.categories.update);
  const removeCategory = useMutation(api.categories.remove);

  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"delete-category" | null>(null);

  const categoryFromState = location.state?.category;

  // Priorizar la query (datos frescos de la BD), usar categoryFromState como fallback
  const category = categoryFromQuery ?? categoryFromState ?? undefined;

  useEffect(() => {
    if (!category) {
      return;
    }

    setName(category.name);
    setFormError(null);
    setFormSuccess(null);
  }, [category]);

  if (!categoryId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-white">Categoría no encontrada</h1>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-1 text-sm font-semibold  text-slate-300 transition hover:border-[#fa7316] hover:text-white"
        >
          <FaArrowLeft />
          <span>Volver</span>
        </button>
      </div>
    );
  }

  if (categoryId && categoryFromQuery === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-400">
        Cargando información de la categoría...
      </div>
    );
  }

  if (!category) {
    return (
      <div className="space-y-6 text-white">
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
          La categoría solicitada no existe o fue eliminada.
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin/categories")}
          className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-1 text-sm font-semibold  text-slate-300 transition hover:border-[#fa7316] hover:text-white"
        >
          <FaArrowLeft />
          <span>Volver a categorías</span>
        </button>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setFormError("Ingresa un nombre para la categoría.");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      setFormSuccess(null);

      await updateCategory({
        categoryId: category._id as Id<"categories">,
        name: name.trim(),
      });

      setFormSuccess("Categoría actualizada correctamente.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No fue posible actualizar la categoría.";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteCategory = () => {
    setPendingAction("delete-category");
  };

  const executeDeleteCategory = async () => {
    setPendingAction(null);
    try {
      setIsDeleting(true);
      setFormError(null);
      setFormSuccess(null);

      await removeCategory({
        categoryId: category._id as Id<"categories">,
      });

      navigate("/admin/categories");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No fue posible eliminar la categoría.";
      setFormError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate("/admin/categories")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-1 text-sm font-semibold  text-slate-300 transition hover:border-[#fa7316] hover:text-white"
          >
            <FaArrowLeft />
            <span>Volver</span>
          </button>
          <div>
            <h1 className="text-3xl font-semibold">{category.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Actualiza el nombre de la categoría o elimínala si ya no la necesitas.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={requestDeleteCategory}
          className="inline-flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:border-red-500/60 hover:text-red-100"
          disabled={isDeleting || isSubmitting}
        >
          <MdDeleteOutline />
          <span>Eliminar categoría</span>
        </button>
      </header>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20">
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
              value={name}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
            />
          </div>

          {formError && (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              {formSuccess}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => navigate("/admin/categories")}
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
              {isSubmitting ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </section>

      <ConfirmDialog
        isOpen={pendingAction === "delete-category"}
        title="Eliminar categoría"
        description="Esta acción es permanente. Si hay productos asociados a la categoría, primero actualiza sus categorías antes de eliminarla."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        tone="danger"
        isConfirming={isDeleting}
        onCancel={() => {
          if (isDeleting) {
            return;
          }
          setPendingAction(null);
        }}
        onConfirm={() => {
          if (!isDeleting) {
            void executeDeleteCategory();
          }
        }}
      />
    </div>
  );
};

export default AdminCategoryDetail;

