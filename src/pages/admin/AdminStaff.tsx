import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import type { ChangeEvent, FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import Chip from "../../components/Chip";
import { IoMdAdd } from "react-icons/io";
import CloseButton from "../../components/CloseButton";
import { BsFillPeopleFill } from "react-icons/bs";

type StaffFormState = {
  branchId: string;
  name: string;
  role: string;
  phone: string;
  email: string;
};

const DEFAULT_FORM: StaffFormState = {
  branchId: "",
  name: "",
  role: "",
  phone: "",
  email: "",
};

const AdminStaff = () => {
  const staff = useQuery(api.staff.list, { includeInactive: true }) as Doc<"staff">[] | undefined;
  const branches = useQuery(api.branches.list) as Doc<"branches">[] | undefined;
  const createStaff = useMutation(api.staff.create);

  const navigate = useNavigate();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<StaffFormState>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const sortedStaff = useMemo(() => staff ?? [], [staff]);
  const branchesMap = useMemo(() => {
    const map = new Map<string, Doc<"branches">>();
    branches?.forEach((branch) => map.set(branch._id as string, branch));
    return map;
  }, [branches]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState((previous) => ({ ...previous, [name]: value }));
  };

  const openForm = () => {
    setFormState({
      ...DEFAULT_FORM,
      branchId: branches && branches.length > 0 ? (branches[0]._id as string) : "",
    });
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!formState.branchId) {
      setFormError("Selecciona una sucursal.");
      return;
    }

    if (!formState.name.trim()) {
      setFormError("Ingresa el nombre del miembro del personal.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createStaff({
        branchId: formState.branchId as Id<"branches">,
        name: formState.name.trim(),
        role: formState.role.trim() || undefined,
        phone: formState.phone.trim() || undefined,
        email: formState.email.trim() ? formState.email.trim().toLowerCase() : undefined,
      });
      setIsFormOpen(false);
      setFormState(DEFAULT_FORM);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear el miembro del personal. Inténtalo de nuevo.";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <Chip label="Personal" />
          <div>
            <h1 className="text-3xl font-semibold">Equipo operativo</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Administra a los trabajadores de cada sucursal, asigna roles y mantén sus datos de contacto actualizados.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-3 md:items-end">
         
          <button
            type="button"
            onClick={openForm}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e86811] cursor-pointer"
            disabled={!branches || branches.length === 0}
          >
            <IoMdAdd />
            <span>Agregar personal</span>
          </button>
          {!branches || branches.length === 0 ? (
            <span className="text-xs text-red-300">Crea una sucursal antes de registrar personal.</span>
          ) : null}
        </div>
      </header>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-white shadow-inner shadow-black/20">
        {sortedStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-400">
            <BsFillPeopleFill className="w-10 h-10 text-slate-400" />
            <p className="text-sm text-slate-400">
              Aún no has registrado personal. Agrega a tu primer colaborador para asignarle códigos y roles.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.1em] text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Nombre
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Rol
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Sucursal
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-200">
                {sortedStaff.map((member) => {
                  const staffId = member._id as string;
                  const branch = branchesMap.get(member.branchId as string);
                  return (
                    <tr
                      key={staffId}
                      className="cursor-pointer transition hover:bg-slate-900/60 focus-visible:bg-slate-900/60"
                      onClick={() => navigate(`/admin/staff/${staffId}`, { state: { staff: member } })}
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-white">{member.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">{member.role ?? "Sin rol"}</td>
                      <td className="px-6 py-4 text-sm text-slate-300">{branch?.name ?? "Sucursal"}</td>
                      <td className="px-6 py-4 text-sm">
                        {member.active ? (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-emerald-300">
                            Activo
                          </span>
                        ) : (
                          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                            Inactivo
                          </span>
                        )}
                      </td>
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
          <div className="relative w-full max-w-2xl rounded-lg border border-slate-800 bg-slate-900 p-8 text-white shadow-2xl shadow-black/60">
            <CloseButton onClick={() => setIsFormOpen(false)} />
            <header className="mb-6 space-y-2">
              <h2 className="text-2xl font-semibold text-white">Registrar trabajador</h2>
            </header>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="branchId" className="text-sm font-medium text-slate-200">
                  Sucursal
                </label>
                <select
                  id="branchId"
                  name="branchId"
                  value={formState.branchId}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                  required
                >
                  <option value="">Selecciona una sucursal</option>
                  {branches?.map((branch) => (
                    <option key={branch._id as string} value={branch._id as string}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-200">
                  Nombre completo
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formState.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="role" className="text-sm font-medium text-slate-200">
                    Rol en la sucursal
                  </label>
                  <input
                    id="role"
                    name="role"
                    type="text"
                    value={formState.role}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                    placeholder="Ej. Cajero, Mozo"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium text-slate-200">
                    Teléfono
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formState.phone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                    placeholder="+51 ..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-200">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formState.email}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
                  placeholder="nombre@invento.com"
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
                  onClick={() => setIsFormOpen(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-[#fa7316] hover:text-white"
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Guardando..." : "Guardar personal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStaff;

