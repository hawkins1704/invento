

const metricCards = [
  {
    label: "Ventas del día",
    value: "$ 0.00",
    trend: "+0%",
    description: "Pendiente de registrar",
  },
  {
    label: "Productos activos",
    value: "0",
    trend: "",
    description: "Agrega tus primeros productos",
  },
  {
    label: "Sucursales",
    value: "0",
    trend: "",
    description: "Configura tus locaciones",
  },
];

const upcomingTasks = [
  "Configura el inventario base",
  "Crea códigos de mesas",
  "Carga la lista de productos",
];

const AdminDashboard = () => {
  return (
    <div className="space-y-10">
      <header className="space-y-4">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white">
          Panel administrador
        </span>
        <div className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-8">
          <h1 className="text-3xl font-semibold text-white">Resumen general</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            Aquí verás tus métricas clave, alertas de inventario y un resumen rápido de lo que ocurre en tus sucursales. Completa la configuración inicial para empezar a ver datos en tiempo real.
          </p>
          <div className="inline-flex items-center gap-3 rounded-full border border-[#fa7316]/30 bg-[#fa7316]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#fa7316]">
            Estado: Configuración inicial
          </div>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {metricCards.map((metric) => (
          <div
            key={metric.label}
            className="rounded-lg border border-slate-800 bg-slate-900/40 p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              {metric.label}
            </p>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-semibold text-white">{metric.value}</span>
              {metric.trend && (
                <span className="rounded-full border border-[#fa7316]/30 bg-[#fa7316]/10 px-2 py-1 text-xs font-semibold text-[#fa7316]">
                  {metric.trend}
                </span>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-400">{metric.description}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
        <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Próximos pasos sugeridos</h2>
              <p className="text-xs text-slate-500">Completa estas tareas para habilitar reportes.</p>
            </div>
            <span
              className="rounded-full border border-[#fa7316]/20 bg-[#fa7316]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#fa7316]"
            >
              Prioridad
            </span>
          </div>
          <ul className="space-y-3 text-sm text-slate-200">
            {upcomingTasks.map((task) => (
              <li
                key={task}
                className="flex items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-3"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[#fa7316]/40 bg-[#fa7316]/10 text-sm font-semibold text-[#fa7316]"
                >
                  •
                </span>
                <span>{task}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-5 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Estado de inventario</h2>
            <p className="text-xs text-slate-500">Configura productos para ver alertas.</p>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/80 p-6 text-center">
            
            <p className="max-w-xs text-sm text-slate-400">
              Aún no tienes inventario registrado. Agrega productos para monitorear existencias por sucursal.
            </p>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fa7316] px-4 py-2 text-sm font-semibold text-white shadow-[#fa7316]/40 transition hover:bg-[#e86811]"
            >
              Crear producto
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;

