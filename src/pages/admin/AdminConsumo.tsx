import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import PageHeader from "../../components/page-header/PageHeader";
import { useNavigate } from "react-router-dom";

const SALE_LIMIT_STARTER = 2000;

// Límites por plan (deben coincidir con convex/branches.ts y convex/products.ts)
const BRANCH_LIMIT_BY_PLAN: Record<string, number | null> = {
    starter: 1,
    negocio: 5,
    pro: null,
};
const PRODUCT_LIMIT_BY_PLAN: Record<string, number | null> = {
    starter: 100,
    negocio: 300,
    pro: null,
};

const AdminConsumo = () => {
    const navigate = useNavigate();
    const currentUser = useQuery(api.users.getCurrent) as
        | (Doc<"users"> & { companyLogoUrl: string | null })
        | undefined;

    const salesThisMonthData = useQuery(api.sales.getSalesCountThisMonth) as
        | { count: number }
        | undefined;
    const salesByMonthData = useQuery(api.sales.getSalesByMonth, {
        monthsBack: 12,
    }) as { months: { month: string; count: number; label: string }[] } | undefined;
    const branchesData = useQuery(api.branches.list, {
        limit: 1,
        offset: 0,
    }) as { branches: Doc<"branches">[]; total: number } | undefined;
    const productsData = useQuery(api.products.list, {
        limit: 1,
        offset: 0,
    }) as { products: unknown[]; total: number } | undefined;

    const salesThisMonth = salesThisMonthData?.count ?? 0;
    const totalBranches = branchesData?.total ?? 0;
    const totalProducts = productsData?.total ?? 0;
    const salesByMonth = salesByMonthData?.months ?? [];
    const subscriptionType = currentUser?.subscriptionType ?? "starter";
    const saleLimit =
        subscriptionType === "starter" ? SALE_LIMIT_STARTER : null;
    const salesPercent =
        saleLimit !== null ? Math.min(100, (salesThisMonth / saleLimit) * 100) : null;
    const branchLimit =
        subscriptionType ? BRANCH_LIMIT_BY_PLAN[subscriptionType] : 1;
    const productLimit =
        subscriptionType ? PRODUCT_LIMIT_BY_PLAN[subscriptionType] : 100;
    const branchPercent =
        branchLimit !== null
            ? Math.min(100, (totalBranches / branchLimit) * 100)
            : null;
    const productPercent =
        productLimit !== null
            ? Math.min(100, (totalProducts / productLimit) * 100)
            : null;

    if (currentUser === undefined) {
        return (
            <div className="flex flex-1 items-center justify-center text-slate-500 dark:text-slate-400">
                Cargando información de consumo...
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <PageHeader
                chipLabel="Consumo"
                title="Mi Consumo"
                description="Resumen del uso de tu plan según ventas, sucursales y productos."
            />

            <section className="space-y-6 rounded-lg border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/30">
                <div className="grid gap-4 sm:grid-cols-3">
                    {/* Ventas realizadas (este mes) */}
                    <div
                        className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 cursor-pointer"
                        onClick={() => navigate("/admin/sales")}
                    >
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase">
                            Ventas realizadas
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white flex items-baseline justify-start gap-2">
                            <span>{salesThisMonth}</span>
                            {saleLimit !== null && (
                                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                                    / {saleLimit}
                                </span>
                            )}
                        </p>
                        {saleLimit !== null && (
                            <>
                                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                    <div
                                        className="h-full rounded-full bg-[#fa7316] transition-all"
                                        style={{
                                            width: `${salesPercent ?? 0}%`,
                                        }}
                                    />
                                </div>
                                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    {salesPercent?.toFixed(0) ?? 0}% del límite del plan usado
                                </p>
                            </>
                        )}
                        {saleLimit === null && (
                            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                Este mes · plan sin límite
                            </p>
                        )}
                    </div>

                    {/* Sucursales creadas */}
                    <div
                        className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 cursor-pointer"
                        onClick={() => navigate("/admin/branches")}
                    >
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase">
                            Sucursales creadas
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white flex items-baseline justify-start gap-2">
                            <span>{totalBranches}</span>
                            {branchLimit !== null && (
                                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                                    / {branchLimit}
                                </span>
                            )}
                        </p>
                        {branchLimit !== null && (
                            <>
                                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                    <div
                                        className="h-full rounded-full bg-[#fa7316] transition-all"
                                        style={{
                                            width: `${branchPercent ?? 0}%`,
                                        }}
                                    />
                                </div>
                                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    {branchPercent?.toFixed(0) ?? 0}% del límite del plan usado
                                </p>
                            </>
                        )}
                        {branchLimit === null && (
                            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                Sin límite · plan Pro
                            </p>
                        )}
                    </div>

                    {/* Productos creados */}
                    <div
                        className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50 cursor-pointer"
                        onClick={() => navigate("/admin/inventory")}
                    >
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase">
                            Productos creados
                        </p>
                        <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white flex items-baseline justify-start gap-2">
                            <span>{totalProducts}</span>
                            {productLimit !== null && (
                                <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                                    / {productLimit}
                                </span>
                            )}
                        </p>
                        {productLimit !== null && (
                            <>
                                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                    <div
                                        className="h-full rounded-full bg-[#fa7316] transition-all"
                                        style={{
                                            width: `${productPercent ?? 0}%`,
                                        }}
                                    />
                                </div>
                                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    {productPercent?.toFixed(0) ?? 0}% del límite del plan usado
                                </p>
                            </>
                        )}
                        {productLimit === null && (
                            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                Sin límite · plan Pro
                            </p>
                        )}
                    </div>
                </div>

                {/* Gráfico ventas por mes */}
                <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
                    <p className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Ventas realizadas por mes
                    </p>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={salesByMonth}
                                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    className="stroke-slate-200 dark:stroke-slate-700"
                                />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 12, fill: "currentColor" }}
                                    className="text-slate-500 dark:text-slate-400"
                                />
                                <YAxis
                                    tick={{ fontSize: 12, fill: "currentColor" }}
                                    className="text-slate-500 dark:text-slate-400"
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: "0.5rem",
                                        border: "1px solid var(--slate-200)",
                                    }}
                                    labelStyle={{ color: "var(--slate-700)" }}
                                    formatter={(value: number | undefined) => [
                                        value ?? 0,
                                        "Ventas",
                                    ]}
                                />
                                <Bar
                                    dataKey="count"
                                    fill="#fa7316"
                                    radius={[4, 4, 0, 0]}
                                    name="Ventas"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default AdminConsumo;
