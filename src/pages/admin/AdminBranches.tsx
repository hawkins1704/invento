import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import type { ChangeEvent, FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

type BranchFormState = {
  name: string;
  address: string;
};

const DEFAULT_FORM: BranchFormState = {
  name: "",
  address: "",
};

const AdminBranches = () => {
  const branches = useQuery(api.branches.list) as Doc<"branches">[] | undefined;
  const createBranch = useMutation(api.branches.create);
  const navigate = useNavigate();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<BranchFormState>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const sortedBranches = useMemo(() => branches ?? [], [branches]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormState((previous) => ({ ...previous, [name]: value }));
  };

  const openForm = () => {
    setIsFormOpen(true);
    setFormState(DEFAULT_FORM);
    setFormError(null);
  };

  const resetForm = () => {
    setFormState(DEFAULT_FORM);
    setFormError(null);
    setIsSubmitting(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!formState.name.trim() || !formState.address.trim()) {
      setFormError("Completa el nombre y la dirección de la sucursal.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createBranch({
        name: formState.name.trim(),
        address: formState.address.trim(),
      });
      resetForm();
      setIsFormOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear la sucursal. Inténtalo de nuevo.";
      setFormError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
            Sucursales
          </div>
          <div>
            <h1 className="text-3xl font-semibold">Locales del restaurante</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Crea sucursales para asignar inventario, mesas y personal. Desde aquí podrás ingresar al inventario
              específico de cada local.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 md:items-end">
          <span className="rounded-full border border-[#fa7316]/30 bg-[#fa7316]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#fa7316]">
            {sortedBranches.length} sucursales
          </span>
          <button
            type="button"
            onClick={openForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#fa7316]/40 transition hover:bg-[#e86811]"
          >
            Agregar sucursal
            <span aria-hidden>＋</span>
          </button>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-white shadow-inner shadow-black/20">
        {sortedBranches.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-400">
            <span className="text-4xl" aria-hidden>
              🏬
            </span>
            <p className="text-sm text-slate-400">
              Todavía no hay sucursales registradas. Crea tu primer local para comenzar a gestionar inventario en piso.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.24em] text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Sucursal
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Dirección
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-200">
                {sortedBranches.map((branch) => {
                  const branchId = branch._id as unknown as string;
                  return (
                    <tr
                      key={branchId}
                      onClick={() =>
                        navigate(`/admin/branches/${branchId}`, {
                          state: { branchName: branch.name },
                        })
                      }
                      className="cursor-pointer transition hover:bg-slate-900/60"
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-white">{branch.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">{branch.address}</td>
                    </tr>
                  );
                })}
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
                Nueva sucursal
              </span>
              <h2 className="text-2xl font-semibold text-white">Crear sucursal</h2>
              <p className="text-sm text-slate-400">
                Define los datos principales de la sucursal. Podrás ajustar su inventario desde la vista dedicada.
              </p>
            </header>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-200">
                  Nombre de la sucursal
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formState.name}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="address" className="text-sm font-medium text-slate-200">
                  Dirección
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  required
                  value={formState.address}
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
                  {isSubmitting ? "Guardando..." : "Guardar sucursal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBranches;

