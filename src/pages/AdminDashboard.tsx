import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { formatCurrency, formatDate } from "../utils/format";
import { LuStore } from "react-icons/lu";
import { HiOutlineReceiptTax } from "react-icons/hi";
import { FaExclamationTriangle } from "react-icons/fa";
import { BiDish } from "react-icons/bi";
import { IoChevronDown } from "react-icons/io5";
import type { Id } from "../../convex/_generated/dataModel";

type Period = "today" | "lastWeek" | "lastMonth";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("today");

  // Calcular fechas según el período seleccionado
  const { from, to, periodLabel, dateRangeLabel } = useMemo(() => {
    const now = Date.now();
    let from: number;
    let to: number;
    let label: string;
    let dateRange: string;

    switch (selectedPeriod) {
      case "today": {
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        from = startOfDay.getTime();
        to = endOfDay.getTime();
        label = "Hoy";
        dateRange = formatDate(now);
        break;
      }
      case "lastWeek": {
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(startOfWeek.getDate() - 6); // Últimos 7 días (incluyendo hoy)
        startOfWeek.setHours(0, 0, 0, 0);
        from = startOfWeek.getTime();
        to = endOfDay.getTime();
        label = "Última semana";
        dateRange = `${formatDate(from)} - ${formatDate(to)}`;
        break;
      }
      case "lastMonth": {
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        const startOfMonth = new Date(now);
        startOfMonth.setDate(1); // Primer día del mes actual
        startOfMonth.setHours(0, 0, 0, 0);
        from = startOfMonth.getTime();
        to = endOfDay.getTime();
        label = "Último mes";
        dateRange = `${formatDate(from)} - ${formatDate(to)}`;
        break;
      }
    }

    return { from, to, periodLabel: label, dateRangeLabel: dateRange };
  }, [selectedPeriod]);

  // Queries para las métricas
  const todaySummary = useQuery(api.sales.getTodaySummary, { from, to }) as
    | {
        totalAmount: number;
        totalTickets: number;
        averageTicket: number;
        openTickets: number;
      }
    | undefined;

  const summaryByBranch = useQuery(api.sales.getSummaryByBranch, { from, to }) as
    | Array<{
        branchId: Id<"branches">;
        branchName: string;
        totalAmount: number;
        totalTickets: number;
        openTickets: number;
        hasActiveShift: boolean;
      }>
    | undefined;

  const paymentBreakdown = useQuery(api.sales.getPaymentMethodBreakdown, { from, to }) as
    | Array<{
        method: string;
        amount: number;
        percentage: number;
      }>
    | undefined;

  const topBranches = useQuery(api.sales.getTopBranches, { limit: 5, from, to }) as
    | Array<{
        branchId: Id<"branches">;
        branchName: string;
        totalAmount: number;
      }>
    | undefined;

  const topProducts = useQuery(api.sales.getTopProducts, { limit: 10, from, to }) as
    | Array<{
        productId: Id<"products">;
        productName: string;
        quantity: number;
        revenue: number;
      }>
    | undefined;

  const lowStockAlerts = useQuery(api.branchInventory.getLowStockAlerts, { threshold: 10 }) as
    | Array<{
        productId: Id<"products">;
        productName: string;
        branchId: Id<"branches">;
        branchName: string;
        stock: number;
        isOutOfStock: boolean;
      }>
    | undefined;


  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      Contado: "Efectivo",
      Tarjeta: "Tarjeta",
      Transferencia: "Transferencia",
      Otros: "Otros",
      "Sin registrar": "Sin registrar",
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white">
          Panel administrador
        </span>
        <div className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-0 items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-semibold text-white">Resumen general</h1>
              <p className="max-w-2xl text-sm text-slate-400 mt-2 hidden sm:block">
                Aquí verás tus métricas clave, alertas de inventario y un resumen rápido de lo que ocurre en tus sucursales.
              </p>
            </div>
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as Period)}
                className="appearance-none rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 pr-10 text-sm font-semibold text-white transition hover:border-[#fa7316] focus:border-[#fa7316] focus:outline-none cursor-pointer"
              >
                <option value="today">Hoy</option>
                <option value="lastWeek">Última semana</option>
                <option value="lastMonth">Último mes</option>
              </select>
              <IoChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{periodLabel} - {dateRangeLabel}</span>
          </div>
        </div>
      </header>

      {/* Sección 1: Métricas de ventas del día */}
      <section className="grid gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Total vendido</p>
          <div className="mt-4">
            <span className="text-2xl font-semibold text-white">
              {todaySummary ? formatCurrency(todaySummary.totalAmount) : "S/ 0.00"}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-400">Suma de todas las ventas cerradas en el período</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Tickets cerrados</p>
          <div className="mt-4">
            <span className="text-2xl font-semibold text-white">
              {todaySummary ? todaySummary.totalTickets : 0}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-400">Ventas finalizadas en el período</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Ticket promedio</p>
          <div className="mt-4">
            <span className="text-2xl font-semibold text-white">
              {todaySummary ? formatCurrency(todaySummary.averageTicket) : "S/ 0.00"}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-400">Promedio por venta</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Tickets abiertos</p>
          <div className="mt-4">
            <span className="text-2xl font-semibold text-white">
              {todaySummary ? todaySummary.openTickets : 0}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-400">Mesas activas en todas las sucursales</p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Sucursales activas</p>
          <div className="mt-4">
            <span className="text-2xl font-semibold text-white">
              {summaryByBranch ? summaryByBranch.filter((b) => b.hasActiveShift).length : 0}
            </span>
          </div>
          <p className="mt-3 text-xs text-slate-400">Con turnos abiertos</p>
        </div>
      </section>

      {/* Sección 2: Resumen por sucursal */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Resumen por sucursal</h2>
            <p className="text-xs text-slate-500 mt-1">Vista rápida del rendimiento de cada sucursal en el período</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin/branches")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-[#fa7316] hover:text-white"
          >
            Ver todas
          </button>
        </div>

        {!summaryByBranch || summaryByBranch.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/80 p-10 text-center">
            <LuStore className="w-10 h-10 text-slate-600" />
            <p className="max-w-xs text-sm text-slate-400">
              Aún no tienes sucursales configuradas. Crea una sucursal para comenzar.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {summaryByBranch.map((branch) => (
              <button
                key={branch.branchId as string}
                type="button"
                onClick={() => navigate(`/admin/branches/${branch.branchId}`)}
                className="group text-left rounded-lg border border-slate-800 bg-slate-900/60 p-5 transition hover:border-[#fa7316] hover:bg-slate-900/80 flex flex-col justify-start"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-[#fa7316] transition">
                      {branch.branchName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {branch.hasActiveShift ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                          Turno abierto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-800/50 px-2 py-0.5 text-xs font-semibold text-slate-400">
                          Sin turno
                        </span>
                      )}
                    </div>
                  </div>
                  <LuStore className="w-5 h-5 text-slate-600 group-hover:text-[#fa7316] transition" />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div>
                    <p className="text-xs text-slate-500">Ventas</p>
                    <p className="text-lg font-semibold text-white">{formatCurrency(branch.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Tickets</p>
                    <p className="text-lg font-semibold text-white">
                      {branch.totalTickets} cerrados
                    </p>
                  </div>
                </div>
                {branch.openTickets > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <p className="text-xs text-slate-400">
                      <span className="font-semibold text-[#fa7316]">{branch.openTickets}</span> tickets abiertos
                    </p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Sección 3: Métodos de pago */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Métodos de pago</h2>
          {!paymentBreakdown || paymentBreakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center text-slate-400">
              <HiOutlineReceiptTax className="w-8 h-8 text-slate-600" />
              <p className="text-sm">Aún no hay ventas registradas en el período</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paymentBreakdown.map((item) => (
                <div
                  key={item.method}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{getPaymentMethodLabel(item.method)}</p>
                    <p className="text-xs text-slate-400 mt-1">{item.percentage.toFixed(1)}% del total</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-white">{formatCurrency(item.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sección 5: Top sucursales */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Top sucursales</h2>
          {!topBranches || topBranches.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center text-slate-400">
              <LuStore className="w-8 h-8 text-slate-600" />
              <p className="text-sm">Aún no hay ventas registradas en el período</p>
            </div>
          ) : (
            <div className="space-y-3">
              {topBranches.map((branch, index) => (
                <button
                  key={branch.branchId as string}
                  type="button"
                  onClick={() => navigate(`/admin/branches/${branch.branchId}`)}
                  className="w-full flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 p-4 transition hover:border-[#fa7316] hover:bg-slate-900/80"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#fa7316]/30 bg-[#fa7316]/10 text-sm font-semibold text-[#fa7316]">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{branch.branchName}</p>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-white">{formatCurrency(branch.totalAmount)}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sección 6: Productos más vendidos */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Productos más vendidos</h2>
          {!topProducts || topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center text-slate-400">
              <BiDish className="w-8 h-8 text-slate-600" />
              <p className="text-sm">Aún no hay productos vendidos en el período</p>
            </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Cantidad
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                    Ingresos
                  </th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product) => (
                  <tr
                    key={product.productId as string}
                    className="border-b border-slate-800/50 hover:bg-slate-900/60 transition"
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-white">{product.productName}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm text-slate-300">{product.quantity}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-semibold text-white">{formatCurrency(product.revenue)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Sección 10: Alertas de inventario */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Alertas de inventario</h2>
            <p className="text-xs text-slate-500 mt-1">Productos con stock bajo o sin stock</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin/inventory")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-[#fa7316] hover:text-white"
          >
            Ver inventario
          </button>
        </div>

        {!lowStockAlerts || lowStockAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-950/80 p-8 text-center text-slate-400">
            <BiDish className="w-8 h-8 text-slate-600" />
            <p className="text-sm">No hay alertas de inventario. Todo está en orden.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lowStockAlerts.slice(0, 10).map((alert) => (
              <div
                key={`${alert.productId}-${alert.branchId}`}
                className={`flex items-center justify-between rounded-lg border p-4 ${
                  alert.isOutOfStock
                    ? "border-red-500/40 bg-red-500/10"
                    : "border-yellow-500/40 bg-yellow-500/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      alert.isOutOfStock
                        ? "bg-red-500/20 text-red-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    <FaExclamationTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{alert.productName}</p>
                    <p className="text-xs text-slate-400">{alert.branchName}</p>
                  </div>
                </div>
                <div className="text-right">
                  {alert.isOutOfStock ? (
                    <span className="inline-flex items-center rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400">
                      Sin stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-400">
                      Stock bajo: {alert.stock}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {lowStockAlerts.length > 10 && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/admin/inventory")}
                  className="text-sm text-slate-400 hover:text-[#fa7316] transition"
                >
                  Ver {lowStockAlerts.length - 10} alertas más →
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminDashboard;
