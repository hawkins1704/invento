import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import type { ChangeEvent, FormEvent } from "react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { IoMdAdd } from "react-icons/io";
import CloseButton from "../../components/CloseButton";
import { LuStore } from "react-icons/lu";
import DataTable from "../../components/table/DataTable";
import TableRow from "../../components/table/TableRow";
import Pagination from "../../components/pagination/Pagination";
import EmptyState from "../../components/empty-state/EmptyState";
import PageHeader from "../../components/page-header/PageHeader";
import { useToast } from "../../contexts/ToastContext";

type BranchFormState = {
    name: string;
    address: string;
};

const DEFAULT_FORM: BranchFormState = {
    name: "",
    address: "",
};

const ITEMS_PER_PAGE = 10;

/** Límite de sucursales por plan: starter 1, negocio 5, pro ilimitado. */
const getBranchLimit = (subscriptionType: string | undefined): number | null => {
    if (!subscriptionType) return 1;
    switch (subscriptionType) {
        case "starter":
            return 1;
        case "negocio":
            return 5;
        case "pro":
            return null;
        default:
            return 1;
    }
};

const PLAN_LABELS: Record<string, string> = {
    starter: "Starter",
    negocio: "Negocio",
    pro: "Pro",
};

const AdminBranches = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    const branchesData = useQuery(api.branches.list, {
        limit: ITEMS_PER_PAGE,
        offset,
    }) as { branches: Doc<"branches">[]; total: number } | undefined;

    const branches = branchesData?.branches ?? [];
    const totalBranches = branchesData?.total ?? 0;
    const totalPages = Math.ceil(totalBranches / ITEMS_PER_PAGE);

    const createBranch = useMutation(api.branches.create);
    const navigate = useNavigate();
    const currentUser = useQuery(api.users.getCurrent) as Doc<"users"> | undefined;
    const { error: toastError } = useToast();

    const branchLimit = getBranchLimit(currentUser?.subscriptionType);
    const atBranchLimit =
        branchLimit !== null && totalBranches >= branchLimit;
    const planLabel =
        PLAN_LABELS[currentUser?.subscriptionType ?? "starter"] ?? "Starter";

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [formState, setFormState] = useState<BranchFormState>(DEFAULT_FORM);
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

    const openForm = () => {
        setIsFormOpen(true);
        setFormState(DEFAULT_FORM);
        setFormError(null);
    };

    const handleOpenForm = () => {
        if (atBranchLimit && branchLimit !== null) {
            toastError(
                `Has alcanzado el límite de ${branchLimit} sucursal${branchLimit === 1 ? "" : "es"} de tu plan ${planLabel}. Actualiza tu plan para agregar más.`
            );
            return;
        }
        openForm();
    };

    const resetForm = () => {
        setFormState(DEFAULT_FORM);
        setFormError(null);
        setIsSubmitting(false);
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormError(null);

        if (atBranchLimit && branchLimit !== null) {
            const limitMessage = `Has alcanzado el límite de ${branchLimit} sucursal${branchLimit === 1 ? "" : "es"} de tu plan ${planLabel}. Actualiza tu plan para agregar más.`;
            setFormError(limitMessage);
            toastError(limitMessage);
            return;
        }

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
            // Reset to first page to see the new branch
            setCurrentPage(1);
            // Cerrar con animación
            handleClose();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "No se pudo crear la sucursal. Inténtalo de nuevo.";
            setFormError(message);
            toastError(message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-8">
            <PageHeader
                chipLabel="Sucursales"
                title="Locales del restaurante"
                description="Crea sucursales para asignar inventario, mesas y personal. Desde aquí podrás ingresar al inventario específico de cada local."
                actionButton={
                    <button
                        type="button"
                        onClick={handleOpenForm}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e86811] cursor-pointer"
                    >
                        <IoMdAdd />
                        <span>Agregar</span>
                    </button>
                }
            />

            <section className="">
                {branches.length === 0 ? (
                    <EmptyState
                        icon={<LuStore className="w-10 h-10" />}
                        message="Todavía no hay sucursales registradas. Crea tu primer local para comenzar a gestionar inventario en piso."
                    />
                ) : (
                    <>
                        {/* Vista de tarjetas para mobile */}
                        <div className="space-y-3 md:hidden">
                            {branches.map((branch) => {
                                const branchId = branch._id as unknown as string;
                                return (
                                    <BranchCard
                                        key={branchId}
                                        branch={branch}
                                        onSelect={() =>
                                            navigate(`/admin/branches/${branchId}`, {
                                                state: {
                                                    branchName: branch.name,
                                                },
                                            })
                                        }
                                    />
                                );
                            })}
                        </div>
                        {/* Vista de tabla para tablet y desktop */}
                        <div className="hidden md:block">
                            <DataTable
                                columns={[
                                    { label: "Sucursal", key: "name" },
                                    { label: "Dirección", key: "address" },
                                ]}
                            >
                                {branches.map((branch) => {
                                    const branchId = branch._id as unknown as string;
                                    return (
                                        <TableRow
                                            key={branchId}
                                            onClick={() =>
                                                navigate(`/admin/branches/${branchId}`, {
                                                    state: {
                                                        branchName: branch.name,
                                                    },
                                                })
                                            }
                                        >
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                                                {branch.name}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {branch.address}
                                            </td>
                                        </TableRow>
                                    );
                                })}
                            </DataTable>
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalBranches}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={handlePageChange}
                            itemLabel="sucursales"
                        />
                    </>
                )}
            </section>

            {isFormOpen && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-10 backdrop-blur ${isClosing ? 'animate-[fadeOut_0.3s_ease-out]' : 'animate-[fadeIn_0.2s_ease-out]'}`}>
                    <div className={`absolute inset-0 bg-black/40 dark:bg-slate-950/70 ${isClosing ? 'animate-[fadeOut_0.3s_ease-out]' : 'animate-[fadeIn_0.2s_ease-out]'}`} />
                    <div className={`relative w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-8 text-slate-900 shadow-2xl shadow-black/60 dark:border-slate-800 dark:bg-slate-900 dark:text-white ${isClosing ? 'animate-[fadeOutScale_0.3s_ease-out]' : 'animate-[fadeInScale_0.3s_ease-out]'}`}>
                        <CloseButton onClick={handleClose} />
                        <header className="mb-6 space-y-2">
                            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                                Crear sucursal
                            </h2>
                        </header>
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <label
                                    htmlFor="name"
                                    className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                >
                                    Nombre de la sucursal
                                </label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    value={formState.name}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <label
                                    htmlFor="address"
                                    className="text-sm font-medium text-slate-700 dark:text-slate-200"
                                >
                                    Dirección
                                </label>
                                <input
                                    id="address"
                                    name="address"
                                    type="text"
                                    required
                                    value={formState.address}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-500 focus:border-[#fa7316] focus:outline-none focus:ring-2 focus:ring-[#fa7316]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                                />
                            </div>
                            {formError && (
                                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
                                    {formError}
                                </div>
                            )}

                            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#fa7316] hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white cursor-pointer"
                                    disabled={isSubmitting}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? "Guardando..."
                                        : "Guardar sucursal"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const BranchCard = ({
    branch,
    onSelect,
}: {
    branch: Doc<"branches">;
    onSelect: () => void;
}) => {
    return (
        <div
            className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:bg-slate-100 focus-visible:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-900/60 dark:focus-visible:bg-slate-900/60"
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
            <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{branch.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{branch.address}</p>
            </div>
        </div>
    );
};

export default AdminBranches;
