import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import type { ChangeEvent, FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { IoMdAdd } from "react-icons/io";
import CloseButton from "../../components/CloseButton";
import { BsFillPeopleFill } from "react-icons/bs";
import DataTable from "../../components/table/DataTable";
import TableRow from "../../components/table/TableRow";
import Pagination from "../../components/pagination/Pagination";
import EmptyState from "../../components/empty-state/EmptyState";
import PageHeader from "../../components/page-header/PageHeader";

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

const ITEMS_PER_PAGE = 10;

const StaffCard = ({
  member,
  branchName,
  onSelect,
}: {
  member: Doc<"staff">;
  branchName?: string;
  onSelect: () => void;
}) => {
  return (
    <div
      className="cursor-pointer rounded-lg border border-slate-800 bg-slate-950/40 p-4 transition hover:bg-slate-900/60 focus-visible:bg-slate-900/60"
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{member.name}</p>
            {member.role && <p className="mt-1 text-xs text-slate-400">{member.role}</p>}
          </div>
          {member.active ? (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-emerald-300">
              Activo
            </span>
          ) : (
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
              Inactivo
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div>
            <span className="text-xs text-slate-500">Sucursal:</span>
            <p className="text-sm font-medium text-slate-300">{branchName ?? "Sucursal"}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminStaff = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const staffData = useQuery(api.staff.list, {
    includeInactive: true,
    limit: ITEMS_PER_PAGE,
    offset,
  }) as { staff: Doc<"staff">[]; total: number } | undefined;

  const staff = staffData?.staff ?? [];
  const totalStaff = staffData?.total ?? 0;
  const totalPages = Math.ceil(totalStaff / ITEMS_PER_PAGE);

  // Para el select de sucursales, necesitamos todas las sucursales (sin paginación)
  const allBranchesData = useQuery(api.branches.list, {
    limit: 1000, // Un número grande para obtener todas
    offset: 0,
  }) as { branches: Doc<"branches">[]; total: number } | undefined;

  const branches = useMemo(() => allBranchesData?.branches ?? [], [allBranchesData]);
  const createStaff = useMutation(api.staff.create);

  const navigate = useNavigate();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState<StaffFormState>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const branchesMap = useMemo(() => {
    const map = new Map<string, Doc<"branches">>();
    branches.forEach((branch) => map.set(branch._id as string, branch));
    return map;
  }, [branches]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

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
      // Reset to first page to see the new staff member
      setCurrentPage(1);
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
      <PageHeader
        chipLabel="Personal"
        title="Equipo operativo"
        description="Administra a los trabajadores de cada sucursal, asigna roles y mantén sus datos de contacto actualizados."
        actionButton={
          <>
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
          </>
        }
      />

      <section className="">
        {staff.length === 0 ? (
          <EmptyState
            icon={<BsFillPeopleFill className="w-10 h-10" />}
            message="Aún no has registrado personal. Agrega a tu primer colaborador para asignarle códigos y roles."
          />
        ) : (
          <>
            {/* Vista de tarjetas para mobile */}
            <div className="space-y-3 md:hidden">
              {staff.map((member) => {
                const staffId = member._id as string;
                const branch = branchesMap.get(member.branchId as string);
                return (
                  <StaffCard
                    key={staffId}
                    member={member}
                    branchName={branch?.name}
                    onSelect={() => navigate(`/admin/staff/${staffId}`, { state: { staff: member } })}
                  />
                );
              })}
            </div>
            {/* Vista de tabla para tablet y desktop */}
            <div className="hidden md:block">
              <DataTable
                columns={[
                  { label: "Nombre", key: "name" },
                  { label: "Rol", key: "role" },
                  { label: "Sucursal", key: "branch" },
                  { label: "Estado", key: "status" },
                ]}
              >
                {staff.map((member) => {
                  const staffId = member._id as string;
                  const branch = branchesMap.get(member.branchId as string);
                  return (
                    <TableRow
                      key={staffId}
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
                    </TableRow>
                  );
                })}
              </DataTable>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalStaff}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={handlePageChange}
              itemLabel="miembros del personal"
            />
          </>
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

