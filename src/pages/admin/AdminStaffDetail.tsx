import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import type { ChangeEvent, FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import ConfirmDialog from "../../components/ConfirmDialog";
import { FaArrowLeft } from "react-icons/fa";

type StaffFormState = {
  branchId: string;
  name: string;
  role: string;
  phone: string;
  email: string;
  active: boolean;
};

const DEFAULT_FORM: StaffFormState = {
  branchId: "",
  name: "",
  role: "",
  phone: "",
  email: "",
  active: true,
};

const AdminStaffDetail = () => {
  const params = useParams();
  const staffIdParam = params.staffId;
  const staffId = staffIdParam ? (staffIdParam as Id<"staff">) : undefined;

  const navigate = useNavigate();
  const location = useLocation();

  const staffList = useQuery(api.staff.list, { includeInactive: true }) as Doc<"staff">[] | undefined;
  const branches = useQuery(api.branches.list) as Doc<"branches">[] | undefined;
  const updateStaff = useMutation(api.staff.update);
  const removeStaff = useMutation(api.staff.remove);

  const [formState, setFormState] = useState<StaffFormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const staffMember = useMemo(() => {
    if (!staffId) {
      return null;
    }
    const fromState = (location.state as { staff?: Doc<"staff"> } | null)?.staff;
    if (fromState && fromState._id === staffId) {
      return fromState;
    }
    return staffList?.find((item) => item._id === staffId) ?? null;
  }, [staffId, staffList, location.state]);

  const branchOptions = useMemo(() => branches ?? [], [branches]);

  useEffect(() => {
    if (!staffMember) {
      setFormState(DEFAULT_FORM);
      return;
    }

    setFormState({
      branchId: staffMember.branchId as string,
      name: staffMember.name,
      role: staffMember.role ?? "",
      phone: staffMember.phone ?? "",
      email: staffMember.email ?? "",
      active: staffMember.active,
    });
  }, [staffMember]);

  const branchName =
    branchOptions.find((branch) => branch._id === staffMember?.branchId)?.name ?? "Sucursal";

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState((previous) => ({
      ...previous,
      [name]: name === "active" ? (event.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!staffId || !staffMember) {
      return;
    }

    if (!formState.branchId) {
      setFormError("Selecciona la sucursal a la que pertenece el personal.");
      return;
    }

    if (!formState.name.trim()) {
      setFormError("Ingresa el nombre del personal.");
      return;
    }

    try {
      setIsSaving(true);
      await updateStaff({
        staffId,
        branchId: formState.branchId as Id<"branches">,
        name: formState.name.trim(),
        role: formState.role.trim() || undefined,
        phone: formState.phone.trim() || undefined,
        email: formState.email.trim() ? formState.email.trim().toLowerCase() : undefined,
        active: formState.active,
        userId: staffMember.userId,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo actualizar la información. Inténtalo de nuevo.";
      setFormError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!staffId) {
      return;
    }
    try {
      setIsDeleting(true);
      await removeStaff({ staffId });
      navigate("/admin/staff");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo eliminar al personal. Inténtalo de nuevo.";
      setFormError(message);
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!staffId) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20">
        <h1 className="text-2xl font-semibold text-white">Personal no encontrado</h1>
        <p className="mt-2 text-sm text-slate-400">
          El identificador del miembro del personal no es válido. Regresa al listado e inténtalo nuevamente.
        </p>
        <button
          type="button"
          onClick={() => navigate("/admin/staff")}
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-[#fa7316] hover:text-white"
        >
          Volver a personal
        </button>
      </div>
    );
  }

  if (staffList && staffMember === null) {
    return (
      <div className="space-y-6">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20">
          <button
            type="button"
            onClick={() => navigate("/admin/staff")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-1 text-sm font-semibold  text-slate-300 transition hover:border-[#fa7316] hover:text-white"
          >
            <FaArrowLeft />
            <span>Volver</span>
          </button>
          <h1 className="mt-4 text-3xl font-semibold text-white">Personal no disponible</h1>
          <p className="mt-2 text-sm text-slate-400">
            No encontramos la información solicitada. Verifica el enlace o regresa al listado general.
          </p>
        </header>
      </div>
    );
  }

  if (!staffMember) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20">
        <p className="text-sm text-slate-400">Cargando información del personal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => navigate("/admin/staff")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-1 text-sm font-semibold  text-slate-300 transition hover:border-[#fa7316] hover:text-white"
          >
            <FaArrowLeft />
            <span>Volver</span>
          </button>
          <div>
            <h1 className="text-3xl font-semibold text-white">Personal · {staffMember.name}</h1>
            <p className="mt-1 text-sm text-slate-400">Sucursal asignada: {branchName}</p>
            <p className="mt-2 text-sm text-slate-400">
              Actualiza los datos del colaborador, asigna la sucursal correcta o desactívalo temporalmente cuando sea necesario.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 transition hover:border-red-400 hover:text-red-200"
          disabled={isDeleting}
        >
          Eliminar personal
        </button>
      </header>

      <form className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-white shadow-inner shadow-black/20" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
            Sucursal asignada
            <select
              name="branchId"
              value={formState.branchId}
              onChange={handleChange}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
              required
            >
              {branchOptions.map((branch) => (
                <option key={branch._id as string} value={branch._id as string}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-200">
            <input
              type="checkbox"
              name="active"
              checked={formState.active}
              onChange={handleChange}
              className="h-5 w-5 rounded-lg border-slate-700 bg-slate-900 text-[#fa7316] focus:ring-[#fa7316]"
            />
            Activo en la sucursal
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
            Nombre completo
            <input
              name="name"
              type="text"
              required
              value={formState.name}
              onChange={handleChange}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
            Rol
            <input
              name="role"
              type="text"
              value={formState.role}
              onChange={handleChange}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
              placeholder="Ej. Cajero, Supervisor"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
            Teléfono
            <input
              name="phone"
              type="tel"
              value={formState.phone}
              onChange={handleChange}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
              placeholder="+51 ..."
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
            Correo electrónico
            <input
              name="email"
              type="email"
              value={formState.email}
              onChange={handleChange}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30"
              placeholder="nombre@invento.com"
            />
          </label>
        </div>

        {formError && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {formError}
          </div>
        )}

        <div className="flex flex-col gap-3 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={() => navigate("/admin/staff")}
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-[#fa7316] hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white  transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSaving}
          >
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Eliminar personal"
        tone="danger"
        confirmLabel={isDeleting ? "Eliminando..." : "Eliminar"}
        isConfirming={isDeleting}
        description="Esta acción eliminará al personal seleccionado. Asegúrate de que no tenga ventas abiertas asignadas."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default AdminStaffDetail;

