const SalesInventory = () => {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20">
      <h1 className="text-3xl font-semibold">Inventario</h1>
      <p className="mt-3 max-w-2xl text-sm text-slate-400">
        Ajusta las existencias disponibles en la sucursal durante el turno. Podrás ver consumos en vivo y registrar
        devoluciones o bajas directamente desde el punto de venta.
      </p>
    </div>
  );
};

export default SalesInventory;

