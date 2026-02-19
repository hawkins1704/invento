import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { MdOutlinePeople } from "react-icons/md";
import DataTable from "../../components/table/DataTable";
import TableRow from "../../components/table/TableRow";
import Pagination from "../../components/pagination/Pagination";
import EmptyState from "../../components/empty-state/EmptyState";
import PageHeader from "../../components/page-header/PageHeader";
import { formatCurrency } from "../../utils/format";

const ITEMS_PER_PAGE = 10;

type CustomerWithStats = Doc<"customers"> & {
    salesCount: number;
    salesTotal: number;
};

const CustomerCard = ({ customer }: { customer: CustomerWithStats }) => {
    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="space-y-3">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {customer.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {customer.documentType} {customer.documentNumber}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    {customer.email && (
                        <div>
                            <span className="text-xs text-slate-500">Email: </span>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                {customer.email}
                            </p>
                        </div>
                    )}
                    {customer.phone && (
                        <div>
                            <span className="text-xs text-slate-500">Tel: </span>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                                {customer.phone}
                            </p>
                        </div>
                    )}
                </div>
                <div className="flex gap-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <div>
                        <span className="text-xs text-slate-500">Ventas: </span>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {customer.salesCount}
                        </p>
                    </div>
                    <div>
                        <span className="text-xs text-slate-500">Total: </span>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {formatCurrency(customer.salesTotal)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SORTABLE_COLUMNS = ["name", "salesCount", "salesTotal"] as const;

const AdminCustomers = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortBy, setSortBy] = useState<string>("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    const customersData = useQuery(api.customers.listWithStats, {
        limit: ITEMS_PER_PAGE,
        offset,
        sortBy: sortBy as "name" | "salesCount" | "salesTotal",
        sortOrder,
    }) as { customers: CustomerWithStats[]; total: number } | undefined;

    const customers = customersData?.customers ?? [];
    const totalCustomers = customersData?.total ?? 0;
    const totalPages = Math.ceil(totalCustomers / ITEMS_PER_PAGE);

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
    };

    const handleSort = (key: string) => {
        if (!SORTABLE_COLUMNS.includes(key as (typeof SORTABLE_COLUMNS)[number]))
            return;
        if (sortBy === key) {
            setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(key);
            setSortOrder(
                key === "salesCount" || key === "salesTotal" ? "desc" : "asc"
            );
        }
        setCurrentPage(1);
    };

    return (
        <div className="space-y-8">
            <PageHeader
                chipLabel="Clientes"
                title="Base de clientes"
                description="Consulta los clientes registrados, sus datos de contacto y el historial de compras."
            />

            <section>
                {customers.length === 0 ? (
                    <EmptyState
                        icon={<MdOutlinePeople className="w-10 h-10" />}
                        message="Aún no tienes clientes registrados. Los clientes se crean automáticamente al registrar ventas con DNI o RUC."
                    />
                ) : (
                    <>
                        {/* Vista de tarjetas para mobile */}
                        <div className="space-y-3 md:hidden">
                            {customers.map((customer) => (
                                <CustomerCard
                                    key={customer._id as string}
                                    customer={customer}
                                />
                            ))}
                        </div>
                        {/* Vista de tabla para tablet y desktop */}
                        <div className="hidden md:block">
                            <DataTable
                                columns={[
                                    {
                                        label: "Nombre",
                                        key: "name",
                                        sortable: true,
                                    },
                                    { label: "Documento", key: "document" },
                                    { label: "Contacto", key: "contact" },
                                    {
                                        label: "Ventas",
                                        key: "salesCount",
                                        sortable: true,
                                    },
                                    {
                                        label: "Total",
                                        key: "salesTotal",
                                        sortable: true,
                                    },
                                ]}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                onSort={handleSort}
                            >
                                {customers.map((customer) => (
                                    <TableRow key={customer._id as string}>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                                            {customer.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {customer.documentType}{" "}
                                            {customer.documentNumber}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {customer.email ?? customer.phone ?? (
                                                <span className="text-slate-400">
                                                    —
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                                            {customer.salesCount}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                                            {formatCurrency(customer.salesTotal)}
                                        </td>
                                    </TableRow>
                                ))}
                            </DataTable>
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalCustomers}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={handlePageChange}
                            itemLabel="clientes"
                        />
                    </>
                )}
            </section>
        </div>
    );
};

export default AdminCustomers;
