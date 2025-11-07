const AdminInventory = () => {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20">
      <h1 className="text-3xl font-semibold">Inventario</h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-400">
        Aquí podrás administrar los insumos y productos disponibles en todas tus sucursales. Esta sección se conectará
        con Convex para manejar existencias, mínimos y movimientos de inventario.
      </p>
    </div>
  );
};

export default AdminInventory;

