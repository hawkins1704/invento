import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import type { ProductListItem } from "../../types/products";
import { formatCurrency, formatDateTime, formatDuration } from "../../utils/format";
import ConfirmDialog from "../../components/ConfirmDialog";
import SalesShiftGuard from "../../components/SalesShiftGuard";
import type { ShiftSummary } from "../../hooks/useSalesShift";

type LiveSale = {
  sale: Doc<"sales">;
  items: Doc<"saleItems">[];
  table?: Doc<"branchTables"> | null;
  staff?: Doc<"staff"> | null;
};

type EditableItem = {
  productId: Id<"products">;
  productName: string;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
};

type SalesTablesContentProps = {
  branch: Doc<"branches">;
  shiftSummary: ShiftSummary;
};

const SalesTablesContent = ({
  branch,
  shiftSummary,
}: SalesTablesContentProps) => {
  const selectedBranchId = branch._id as Id<"branches">;
  const hasActiveShift = Boolean(shiftSummary);

  const tables = useQuery(
    api.branchTables.list,
    selectedBranchId ? { branchId: selectedBranchId } : "skip"
  ) as Doc<"branchTables">[] | undefined;

  const liveSales = useQuery(
    api.sales.listLiveByBranch,
    selectedBranchId ? { branchId: selectedBranchId } : "skip"
  ) as LiveSale[] | undefined;

  const products = useQuery(api.products.list) as ProductListItem[] | undefined;
  const categories = useQuery(api.categories.list) as Doc<"categories">[] | undefined;
  const productMap = useMemo(() => {
    const map = new Map<string, ProductListItem>();
    (products ?? []).forEach((product) => {
      map.set(product._id as string, product);
    });
    return map;
  }, [products]);

  const staffMembers = useQuery(
    api.staff.list,
    selectedBranchId
      ? { branchId: selectedBranchId, includeInactive: false }
      : { includeInactive: false }
  ) as Doc<"staff">[] | undefined;

  const createSale = useMutation(api.sales.create);
  const setSaleItems = useMutation(api.sales.setItems);
  const updateSaleDetails = useMutation(api.sales.updateDetails);
  const closeSaleMutation = useMutation(api.sales.close);
  const cancelSaleMutation = useMutation(api.sales.cancel);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [tableForNewSale, setTableForNewSale] = useState<Doc<"branchTables"> | null>(null);
  const [selectedSaleId, setSelectedSaleId] = useState<Id<"sales"> | null>(null);
  const [isClosingSale, setIsClosingSale] = useState(false);
  const [isCancellingSale, setIsCancellingSale] = useState(false);
  const [isProcessingClose, setIsProcessingClose] = useState(false);
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);
  const [closeState, setCloseState] = useState<{
    saleId: Id<"sales"> | null;
    paymentMethod: "cash" | "card" | "transfer" | "other";
    notes: string;
  }>({
    saleId: null,
    paymentMethod: "cash",
    notes: "",
  });
  const [cancelState, setCancelState] = useState<{
    saleId: Id<"sales"> | null;
    reason: string;
  }>({
    saleId: null,
    reason: "",
  });

  const selectedSale = useMemo(() => {
    if (!selectedSaleId || !liveSales) {
      return null;
    }
    return liveSales.find((entry) => entry.sale._id === selectedSaleId) ?? null;
  }, [selectedSaleId, liveSales]);

  useEffect(() => {
    if (selectedSaleId && !selectedSale) {
      setSelectedSaleId(null);
    }
  }, [selectedSale, selectedSaleId]);

  const openCreateModal = (table: Doc<"branchTables"> | null) => {
    if (!hasActiveShift) {
      return;
    }
    setTableForNewSale(table);
    setIsCreateOpen(true);
  };

  const closeCreateModal = () => {
    setTableForNewSale(null);
    setIsCreateOpen(false);
  };

  const openCloseDialog = (saleId: Id<"sales">) => {
    setCloseState({ saleId, paymentMethod: "cash", notes: "" });
    setIsClosingSale(true);
  };

  const openCancelDialog = (saleId: Id<"sales">) => {
    setCancelState({ saleId, reason: "" });
    setIsCancellingSale(true);
  };

  const branchTables = tables ?? [];
  const branchLiveSales = liveSales ?? [];

  const summary = useMemo(() => {
    const list = liveSales ?? [];
    return list.reduce(
      (accumulator, entry) => {
        accumulator.totalSales += 1;
        accumulator.totalAmount += entry.sale.total;
        return accumulator;
      },
      { totalSales: 0, totalAmount: 0 }
    );
  }, [liveSales]);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
            Punto de venta
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">Mesas y pedidos</h1>
          
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[#fa7316]/30 bg-[#fa7316]/10 px-4 py-2 text-sm font-semibold text-[#fa7316]">
            {branch.name}
          </span>
         
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <SummaryCard
          title="Mesas registradas"
          value={branchTables.length.toString()}
          subtitle="Total de mesas configuradas en la sucursal."
        />
        <SummaryCard
          title="Ventas abiertas"
          value={summary.totalSales.toString()}
          subtitle="Tickets activos esperando cierre."
        />
        <SummaryCard
          title="Total en curso"
          value={formatCurrency(summary.totalAmount)}
          subtitle="Suma de los pedidos abiertos."
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Mesas</h2>
          <button
            type="button"
            onClick={() => openCreateModal(null)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#fa7316] hover:text-white"
            disabled={!hasActiveShift}
          >
            Venta sin mesa
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {branchTables.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-800 bg-slate-950/50 p-12 text-center text-slate-400">
              <span className="text-3xl" aria-hidden>
                🍽️
              </span>
              <p className="max-w-sm text-sm">
                Aún no se han configurado mesas para esta sucursal. Crea mesas desde el panel de administración para
                asignar pedidos rápidamente.
              </p>
            </div>
          ) : (
            branchTables.map((table) => {
              const activeSale = branchLiveSales.find(
                (entry) => entry.sale.tableId && entry.sale.tableId === table._id
              );
              return (
                <article
                  key={table._id}
                  className={`flex flex-col gap-4 rounded-3xl border p-5 text-white shadow-inner shadow-black/20 ${
                    activeSale
                      ? "border-[#fa7316]/50 bg-[#fa7316]/10"
                      : "border-slate-800 bg-slate-900/60"
                  }`}
                >
                  <header className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Mesa</p>
                      <h3 className="text-2xl font-semibold text-white">{table.label}</h3>
                    </div>
                    <StatusBadge status={table.status ?? "available"} />
                  </header>

                  <div className="text-sm text-slate-300">
                    {table.capacity ? (
                      <p>
                        Capacidad: <span className="font-semibold text-white">{table.capacity} personas</span>
                      </p>
                    ) : (
                      <p>Capacidad no asignada</p>
                    )}
                  </div>

                  {activeSale ? (
                    <div className="space-y-2 rounded-2xl border border-[#fa7316]/40 bg-[#fa7316]/10 p-4 text-sm text-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Ticket</span>
                        <span className="font-semibold text-white">{formatCurrency(activeSale.sale.total)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>Abierta</span>
                        <span>{formatDuration(activeSale.sale.openedAt, Date.now())}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedSaleId(activeSale.sale._id)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                      >
                        Ver pedido
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openCreateModal(table)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#fa7316] hover:text-white"
                      disabled={table.status === "out_of_service" || !hasActiveShift}
                    >
                      Abrir pedido
                    </button>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="space-y-4">
        <header className="flex items-center justify-between text-white">
          <h2 className="text-lg font-semibold">Pedidos abiertos</h2>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
            {branchLiveSales.length} activos
          </span>
        </header>

        {branchLiveSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-400">
            <span className="text-3xl" aria-hidden>
              ✅
            </span>
            <p className="max-w-sm text-sm">
              No hay pedidos abiertos. Abre una mesa o crea una venta rápida para comenzar a registrar pedidos.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {branchLiveSales.map((entry) => (
              <article key={entry.sale._id} className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 text-white shadow-inner shadow-black/20">
                <header className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                      {entry.table?.label ?? "Venta sin mesa"}
                    </p>
                    <h3 className="text-xl font-semibold">{formatCurrency(entry.sale.total)}</h3>
                  </div>
                  <span className="rounded-full border border-[#fa7316]/30 bg-[#fa7316]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#fa7316]">
                    {formatDuration(entry.sale.openedAt, Date.now())}
                  </span>
                </header>

                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Creada</span>
                    <span className="font-semibold text-white">{formatDateTime(entry.sale.openedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Atiende</span>
                    <span className="font-semibold text-white">
                      {entry.sale.staffId ? entry.staff?.name ?? "Personal" : "Sin asignar"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-200">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Productos</h4>
                  <ul className="space-y-2">
                    {entry.items.length === 0 ? (
                      <li className="rounded-xl border border-dashed border-slate-700 px-3 py-2 text-slate-400">
                        Pendiente de agregar productos
                      </li>
                    ) : (
                      entry.items.map((item) => {
                        const product = productMap.get(item.productId as string);
                        return (
                          <li
                            key={item._id}
                            className="flex items-center justify-between gap-3 rounded-xl bg-slate-950/40 px-3 py-2"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-white">
                                {product?.name ?? "Producto"}
                              </span>
                              <span className="text-xs text-slate-400">
                                {item.quantity} × {formatCurrency(item.unitPrice)}
                              </span>
                            </div>
                            <span className="text-sm font-semibold text-white">
                              {formatCurrency(item.totalPrice)}
                            </span>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSaleId(entry.sale._id)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                  >
                    Gestionar
                  </button>
                  <button
                    type="button"
                    onClick={() => openCloseDialog(entry.sale._id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/50 px-3 py-2 text-sm font-semibold text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200"
                  >
                    Concluir
                  </button>
                  <button
                    type="button"
                    onClick={() => openCancelDialog(entry.sale._id)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-300 transition hover:border-red-400 hover:text-red-200"
                  >
                    Cancelar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {isCreateOpen && selectedBranchId && (
        <NewSaleModal
          branchId={selectedBranchId}
          table={tableForNewSale}
          products={products ?? []}
          categories={categories ?? []}
          staffMembers={staffMembers ?? []}
          onClose={closeCreateModal}
          onCreate={async (payload) => {
            await createSale(payload);
            closeCreateModal();
          }}
        />
      )}

      {selectedSale && selectedBranchId && (
        <SaleEditorDrawer
          sale={selectedSale}
          branchId={selectedBranchId}
          tables={branchTables}
          products={products ?? []}
          categories={categories ?? []}
          staffMembers={staffMembers ?? []}
          onClose={() => setSelectedSaleId(null)}
          onSaveItems={async (saleId, items) => {
            await setSaleItems({ saleId, items });
          }}
          onUpdateDetails={async (payload) => {
            await updateSaleDetails(payload);
          }}
          onCloseSale={(saleId, paymentMethod, notes) => {
            setCloseState({ saleId, paymentMethod, notes });
            setIsClosingSale(true);
          }}
          onCancelSale={(saleId) => {
            setCancelState({ saleId, reason: "" });
            setIsCancellingSale(true);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={isClosingSale}
        title="Cerrar venta"
        description={
          <div className="space-y-4">
            <p className="text-sm">
              Confirma el método de pago y un comentario opcional antes de cerrar la venta. El inventario se descontará
              automáticamente.
            </p>
            <div className="space-y-3 text-sm">
              <label className="flex flex-col gap-1 text-left text-slate-200">
                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Método de pago</span>
                <select
                  value={closeState.paymentMethod}
                  onChange={(event) =>
                    setCloseState((previous) => ({
                      ...previous,
                      paymentMethod: event.target.value as typeof previous.paymentMethod,
                    }))
                  }
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                >
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                  <option value="other">Otro</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-left text-slate-200">
                <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Notas</span>
                <textarea
                  value={closeState.notes}
                  onChange={(event) =>
                    setCloseState((previous) => ({ ...previous, notes: event.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                  placeholder="Comentario opcional para el cierre"
                />
              </label>
            </div>
          </div>
        }
        confirmLabel="Cerrar venta"
        isConfirming={isProcessingClose}
        onCancel={() => {
          setIsClosingSale(false);
          setIsProcessingClose(false);
        }}
        onConfirm={async () => {
          if (!closeState.saleId) {
            setIsClosingSale(false);
            return;
          }
          setIsProcessingClose(true);
          try {
            await closeSaleMutation({
              saleId: closeState.saleId,
              paymentMethod: closeState.paymentMethod,
              notes: closeState.notes ? closeState.notes.trim() : undefined,
            });
            setIsClosingSale(false);
            setCloseState({ saleId: null, paymentMethod: "cash", notes: "" });
            setSelectedSaleId(null);
          } finally {
            setIsProcessingClose(false);
          }
        }}
      />

      <ConfirmDialog
        isOpen={isCancellingSale}
        title="Cancelar venta"
        tone="danger"
        description={
          <div className="space-y-3">
            <p className="text-sm text-slate-200">
              Cancela la venta seleccionada. No se descontará inventario, pero se registrará la cancelación para
              auditoría.
            </p>
            <label className="flex flex-col gap-1 text-left text-slate-200">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Motivo (opcional)</span>
              <textarea
                value={cancelState.reason}
                onChange={(event) =>
                  setCancelState((previous) => ({ ...previous, reason: event.target.value }))
                }
                rows={3}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                placeholder="Describe el motivo de la cancelación"
              />
            </label>
          </div>
        }
        confirmLabel="Cancelar venta"
        isConfirming={isProcessingCancel}
        onCancel={() => {
          setIsCancellingSale(false);
          setIsProcessingCancel(false);
        }}
        onConfirm={async () => {
          if (!cancelState.saleId) {
            setIsCancellingSale(false);
            return;
          }
          setIsProcessingCancel(true);
          try {
            await cancelSaleMutation({
              saleId: cancelState.saleId,
              reason: cancelState.reason ? cancelState.reason.trim() : undefined,
            });
            setIsCancellingSale(false);
            setCancelState({ saleId: null, reason: "" });
            setSelectedSaleId(null);
          } finally {
            setIsProcessingCancel(false);
          }
        }}
      />
    </div>
  );
};

const NewSaleModal = ({
  branchId,
  table,
  products,
  categories,
  staffMembers,
  onClose,
  onCreate,
}: {
  branchId: Id<"branches">;
  table: Doc<"branchTables"> | null;
  products: ProductListItem[];
  categories: Doc<"categories">[];
  staffMembers: Doc<"staff">[];
  onClose: () => void;
  onCreate: (payload: {
    branchId: Id<"branches">;
    tableId?: Id<"branchTables">;
    staffId?: Id<"staff">;
    notes?: string;
    items?: Array<{
      productId: Id<"products">;
      quantity: number;
      unitPrice: number;
      discountAmount?: number;
      notes?: string;
    }>;
  }) => Promise<void>;
}) => {
  const [staffId, setStaffId] = useState<Id<"staff"> | "">("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [items, setItems] = useState<EditableItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const categoryOptions = useMemo(
    () => [
      { key: "all", label: "Todas" },
      ...categories.map((category) => ({
        key: category._id as string,
        label: category.name,
      })),
    ],
    [categories]
  );

  const availableProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(query);
      const matchesCategory =
        selectedCategoryId === "all" ||
        (product.categoryId as unknown as string) === selectedCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategoryId]);

  useEffect(() => {
    setSelectedCategoryId("all");
  }, [categories]);

  const addProduct = (product: ProductListItem) => {
    setItems((previous) => {
      const existing = previous.find((item) => item.productId === product._id);
      if (existing) {
        return previous.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...previous,
        {
          productId: product._id,
          productName: product.name,
          unitPrice: product.price,
          quantity: 1,
          discountAmount: 0,
        },
      ];
    });
  };

  const updateItemQuantity = (productId: Id<"products">, quantity: number) => {
    setItems((previous) =>
      previous
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(1, quantity) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId: Id<"products">) => {
    setItems((previous) => previous.filter((item) => item.productId !== productId));
  };

  const total = useMemo(() => {
    return items.reduce((accumulator, item) => {
      const line = item.quantity * item.unitPrice - item.discountAmount;
      return accumulator + Math.max(0, line);
    }, 0);
  }, [items]);

  const handleSubmit = async () => {
    if (items.length === 0) {
      setIsSubmitting(true);
      try {
        await onCreate({
          branchId,
          ...(table ? { tableId: table._id } : {}),
          ...(staffId ? { staffId } : {}),
          notes: notes.trim() || undefined,
        });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const payloadItems = items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount > 0 ? item.discountAmount : undefined,
    }));

    setIsSubmitting(true);
    try {
      await onCreate({
        branchId,
        ...(table ? { tableId: table._id } : {}),
        ...(staffId ? { staffId } : {}),
        notes: notes.trim() || undefined,
        items: payloadItems,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-10">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur" />
      <div className="relative flex w-full max-w-5xl flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-900/95 p-6 text-white shadow-2xl shadow-black/60 max-h-[90vh] overflow-hidden">
        <header className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Nueva venta</h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition hover:text-white"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        
        </header>

        <div className="flex flex-1 flex-col gap-6 overflow-hidden lg:flex-row lg:gap-8">
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto pr-1 lg:pr-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Categorías</h3>
                <span className="text-xs text-slate-400">{categories.length} en catálogo</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {categoryOptions.map((category) => {
                  const isActive = selectedCategoryId === category.key;
                  return (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.key)}
                      className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition ${
                        isActive
                          ? "border-[#fa7316] bg-[#fa7316]/10 text-white shadow-inner shadow-[#fa7316]/30"
                          : "border-slate-700 bg-slate-950/40 text-slate-300 hover:border-[#fa7316]/40 hover:text-white"
                      }`}
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar productos"
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
              />
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
                {availableProducts.length}
              </span>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {availableProducts.map((product) => {
                  const availableStock =
                    product.stockByBranch.find((item) => item.branchId === branchId)?.stock ?? 0;
                  const isOutOfStock = availableStock <= 0;
                  return (
                    <button
                      key={product._id}
                      type="button"
                      onClick={() => addProduct(product)}
                      className={`flex h-full flex-col gap-2 rounded-2xl border p-4 text-left text-sm transition ${
                        isOutOfStock
                          ? "cursor-not-allowed border-red-500/40 bg-red-500/10 text-red-200"
                          : "border-slate-800 bg-slate-900/60 text-slate-200 hover:border-[#fa7316] hover:text-white"
                      }`}
                      disabled={isOutOfStock}
                    >
                      <div className="space-y-1">
                        <p className={`text-xs uppercase tracking-[0.24em] ${isOutOfStock ? "text-red-200" : "text-slate-500"}`}>
                          {product.categoryName}
                        </p>
                        <p className={`text-sm font-semibold ${isOutOfStock ? "text-red-100" : "text-white"} line-clamp-2`}>
                          {product.name}
                        </p>
                        <p className={`text-xs ${isOutOfStock ? "text-red-200/80" : "text-slate-400"} line-clamp-3`}>
                          {product.description}
                        </p>
                      </div>
                      <div
                        className={`mt-auto flex items-center justify-between text-xs ${
                          isOutOfStock ? "text-red-200" : "text-slate-400"
                        }`}
                      >
                        <span>Stock: {availableStock}</span>
                        <span className={`text-sm font-semibold ${isOutOfStock ? "text-red-100" : "text-white"}`}>
                          {formatCurrency(product.price)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {availableProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-sm text-slate-400">
                  <span className="text-3xl" aria-hidden>
                    🔍
                  </span>
                  <p>No se encontraron productos para los filtros seleccionados.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full flex-col gap-4 lg:w-[360px] lg:flex-shrink-0 lg:self-start lg:sticky lg:top-0">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
                Personal asignado
                <select
                  value={staffId}
                  onChange={(event) => setStaffId(event.target.value as Id<"staff"> | "")}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                >
                  <option value="">Sin asignar</option>
                  {staffMembers.map((member) => (
                    <option key={member._id} value={member._id as string}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-4 flex flex-col gap-2 text-sm font-semibold text-slate-200">
                Notas
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                  placeholder="Agregar algún detalle del pedido o mesa"
                />
              </label>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Resumen de pedido</h3>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
                  {items.length} items
                </span>
              </div>
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center text-sm text-slate-400">
                  Selecciona productos para construir el ticket.
                </div>
              ) : (
                <ul className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                  {items.map((item) => (
                    <li
                      key={item.productId}
                      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{item.productName}</p>
                          <p className="text-xs text-slate-400">{formatCurrency(item.unitPrice)} c/u</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition hover:text-white"
                          aria-label="Eliminar producto"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.24em] text-slate-500">
                          Cantidad
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={(event) => updateItemQuantity(item.productId, Number(event.target.value))}
                            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.24em] text-slate-500">
                          Descuento
                          <input
                            type="number"
                            min={0}
                            value={item.discountAmount}
                            onChange={(event) =>
                              setItems((previous) =>
                                previous.map((line) =>
                                  line.productId === item.productId
                                    ? { ...line, discountAmount: Math.max(0, Number(event.target.value) || 0) }
                                    : line
                                )
                              )
                            }
                            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                          />
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
              <div className="flex items-center justify-between uppercase tracking-[0.24em] text-slate-400">
                <span>Total</span>
                <span className="text-xl font-semibold text-white">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <footer className="flex flex-col gap-3 md:flex-row md:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-[#fa7316] hover:text-white"
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#fa7316]/40 transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Guardando..." : "Crear venta"}
          </button>
        </footer>
      </div>
    </div>
  );
};

const SaleEditorDrawer = ({
  sale,
  branchId,
  tables,
  products,
  categories,
  staffMembers,
  onClose,
  onSaveItems,
  onUpdateDetails,
  onCloseSale,
  onCancelSale,
}: {
  sale: LiveSale;
  branchId: Id<"branches">;
  tables: Doc<"branchTables">[];
  products: ProductListItem[];
  categories: Doc<"categories">[];
  staffMembers: Doc<"staff">[];
  onClose: () => void;
  onSaveItems: (
    saleId: Id<"sales">,
    items: Array<{
      productId: Id<"products">;
      quantity: number;
      unitPrice: number;
      discountAmount?: number;
    }>
  ) => Promise<void>;
  onUpdateDetails: (payload: {
    saleId: Id<"sales">;
    tableId?: Id<"branchTables"> | null;
    staffId?: Id<"staff"> | null;
    notes?: string;
  }) => Promise<void>;
  onCloseSale: (
    saleId: Id<"sales">,
    paymentMethod: "cash" | "card" | "transfer" | "other",
    notes: string
  ) => void;
  onCancelSale: (saleId: Id<"sales">) => void;
}) => {
  const [items, setItems] = useState<EditableItem[]>(() =>
    sale.items.map((item) => {
      const product = products.find((productItem) => productItem._id === item.productId);
      return {
        productId: item.productId,
        productName: product?.name ?? "Producto",
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discountAmount: item.discountAmount ?? 0,
      };
    })
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const categoryOptions = useMemo(
    () => [
      { key: "all", label: "Todas" },
      ...categories.map((category) => ({
        key: category._id as string,
        label: category.name,
      })),
    ],
    [categories]
  );
  const [saleNotes, setSaleNotes] = useState(sale.sale.notes ?? "");
  const [selectedTableId, setSelectedTableId] = useState<Id<"branchTables"> | "">(
    sale.sale.tableId ? (sale.sale.tableId as Id<"branchTables">) : ""
  );
  const [selectedStaffId, setSelectedStaffId] = useState<Id<"staff"> | "">(
    sale.sale.staffId ? (sale.sale.staffId as Id<"staff">) : ""
  );
  const [isSavingItems, setIsSavingItems] = useState(false);
  const [isUpdatingDetails, setIsUpdatingDetails] = useState(false);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(query);
      const matchesCategory =
        selectedCategoryId === "all" ||
        (product.categoryId as unknown as string) === selectedCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategoryId]);

  useEffect(() => {
    setSelectedCategoryId("all");
  }, [categories]);

  useEffect(() => {
    setItems(
      sale.items.map((item) => {
        const product = products.find((productItem) => productItem._id === item.productId);
        return {
          productId: item.productId,
          productName: product?.name ?? "Producto",
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          discountAmount: item.discountAmount ?? 0,
        };
      })
    );
    setSaleNotes(sale.sale.notes ?? "");
    setSelectedTableId(sale.sale.tableId ? (sale.sale.tableId as Id<"branchTables">) : "");
    setSelectedStaffId(sale.sale.staffId ? (sale.sale.staffId as Id<"staff">) : "");
  }, [sale, products]);

  const total = useMemo(() => {
    return items.reduce((accumulator, item) => {
      const line = item.quantity * item.unitPrice - item.discountAmount;
      return accumulator + Math.max(0, line);
    }, 0);
  }, [items]);

  const addItem = (product: ProductListItem) => {
    setItems((previous) => {
      const existing = previous.find((item) => item.productId === product._id);
      if (existing) {
        return previous.map((item) =>
          item.productId === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...previous,
        {
          productId: product._id,
          productName: product.name,
          unitPrice: product.price,
          quantity: 1,
          discountAmount: 0,
        },
      ];
    });
  };

  const updateItemQuantity = (productId: Id<"products">, quantity: number) => {
    setItems((previous) =>
      previous.map((item) =>
        item.productId === productId
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      )
    );
  };

  const removeItem = (productId: Id<"products">) => {
    setItems((previous) => previous.filter((item) => item.productId !== productId));
  };

  const saveItems = async () => {
    setIsSavingItems(true);
    try {
      await onSaveItems(
        sale.sale._id,
        items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount > 0 ? item.discountAmount : undefined,
        }))
      );
    } finally {
      setIsSavingItems(false);
    }
  };

  const saveDetails = async () => {
    setIsUpdatingDetails(true);
    try {
      await onUpdateDetails({
        saleId: sale.sale._id,
        tableId: selectedTableId === "" ? null : (selectedTableId as Id<"branchTables">),
        staffId: selectedStaffId === "" ? null : (selectedStaffId as Id<"staff">),
        notes: saleNotes.trim() || undefined,
      });
    } finally {
      setIsUpdatingDetails(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-7xl overflow-y-auto border-l border-slate-800 bg-slate-950/95 p-6 text-white shadow-xl shadow-black/50">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
            {sale.table?.label ?? "Venta sin mesa"}
          </p>
          <h2 className="text-2xl font-semibold text-white">{formatCurrency(sale.sale.total)}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition hover:text-white"
          aria-label="Cerrar panel"
        >
          ✕
        </button>
      </header>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Catálogo</h3>
              <span className="text-xs text-slate-400">{filteredProducts.length} resultados</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {categoryOptions.map((category) => {
                const isActive = selectedCategoryId === category.key;
                return (
                  <button
                    key={category.key}
                    type="button"
                    onClick={() => setSelectedCategoryId(category.key)}
                    className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] transition ${
                      isActive
                        ? "border-[#fa7316] bg-[#fa7316]/10 text-white shadow-inner shadow-[#fa7316]/30"
                        : "border-slate-700 bg-slate-950/40 text-slate-300 hover:border-[#fa7316]/40 hover:text-white"
                    }`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar productos"
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
            />
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
              {filteredProducts.length}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-sm text-slate-400">
                <span className="text-3xl" aria-hidden>
                  🔍
                </span>
                <p>No se encontraron productos para los filtros seleccionados.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                {filteredProducts.map((product) => {
                  const availableStock =
                    product.stockByBranch.find((item) => item.branchId === branchId)?.stock ?? 0;
                  const isOutOfStock = availableStock <= 0;
                  return (
                    <button
                      key={product._id}
                      type="button"
                      onClick={() => addItem(product)}
                      className={`flex h-full flex-col gap-2 rounded-2xl border p-4 text-left text-sm transition ${
                        isOutOfStock
                          ? "cursor-not-allowed border-red-500/40 bg-red-500/10 text-red-200"
                          : "border-slate-800 bg-slate-900/60 text-slate-200 hover:border-[#fa7316] hover:text-white"
                      }`}
                      disabled={isOutOfStock}
                    >
                      <div className="space-y-1">
                        <p className={`text-xs uppercase tracking-[0.24em] ${isOutOfStock ? "text-red-200" : "text-slate-500"}`}>
                          {product.categoryName}
                        </p>
                        <p className={`text-sm font-semibold ${isOutOfStock ? "text-red-100" : "text-white"} line-clamp-2`}>
                          {product.name}
                        </p>
                        <p className={`text-xs ${isOutOfStock ? "text-red-200/80" : "text-slate-400"} line-clamp-3`}>
                          {product.description}
                        </p>
                      </div>
                      <div
                        className={`mt-auto flex items-center justify-between text-xs ${
                          isOutOfStock ? "text-red-200" : "text-slate-400"
                        }`}
                      >
                        <span>Stock: {availableStock}</span>
                        <span className={`text-sm font-semibold ${isOutOfStock ? "text-red-100" : "text-white"}`}>
                          {formatCurrency(product.price)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex w-full flex-col gap-4 lg:w-[380px]">
          <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
              Mesa asignada
              <select
                value={selectedTableId}
                onChange={(event) => setSelectedTableId(event.target.value as Id<"branchTables"> | "")}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
              >
                <option value="">Sin mesa</option>
                {tables.map((table) => (
                  <option
                    key={table._id}
                    value={table._id as string}
                    disabled={Boolean(table.currentSaleId) && table._id !== sale.sale.tableId}
                  >
                    {table.label}
                    {table.currentSaleId && table._id !== sale.sale.tableId ? " · Ocupada" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
              Personal asignado
              <select
                value={selectedStaffId}
                onChange={(event) => setSelectedStaffId(event.target.value as Id<"staff"> | "")}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
              >
                <option value="">Sin asignar</option>
                {staffMembers.map((member) => (
                  <option key={member._id} value={member._id as string}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold text-slate-200">
              Notas del pedido
              <textarea
                value={saleNotes}
                onChange={(event) => setSaleNotes(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                placeholder="Comentarios especiales o instrucciones"
              />
            </label>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveDetails}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fa7316] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#fa7316]/40 transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isUpdatingDetails}
              >
                {isUpdatingDetails ? "Guardando..." : "Guardar detalles"}
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">Resumen</h3>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
                {items.length} items
              </span>
            </div>
            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center text-sm text-slate-400">
                Aún no hay productos en este pedido. Selecciona productos desde el catálogo.
              </div>
            ) : (
              <ul className="max-h-[260px] space-y-3 overflow-y-auto pr-1">
                {items.map((item) => (
                  <li
                    key={item.productId}
                    className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{item.productName}</p>
                        <p className="text-xs text-slate-400">{formatCurrency(item.unitPrice)} c/u</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition hover:text-white"
                        aria-label="Eliminar producto"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.24em] text-slate-500">
                        Cantidad
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(event) => updateItemQuantity(item.productId, Number(event.target.value))}
                          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs uppercase tracking-[0.24em] text-slate-500">
                        Descuento
                        <input
                          type="number"
                          min={0}
                          value={item.discountAmount}
                          onChange={(event) =>
                            setItems((previous) =>
                              previous.map((line) =>
                                line.productId === item.productId
                                  ? { ...line, discountAmount: Math.max(0, Number(event.target.value) || 0) }
                                  : line
                              )
                            )
                          }
                          className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                        />
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveItems}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fa7316] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#fa7316]/40 transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isSavingItems}
              >
                {isSavingItems ? "Guardando..." : "Guardar productos"}
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.24em] text-slate-500">Total</span>
              <span className="text-xl font-semibold text-white">{formatCurrency(total)}</span>
            </div>
            <div className="grid gap-2 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>Creada</span>
                <span className="font-semibold text-white">{formatDateTime(sale.sale.openedAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Tiempo en mesa</span>
                <span className="font-semibold text-white">{formatDuration(sale.sale.openedAt, Date.now())}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => onCloseSale(sale.sale._id, "cash", saleNotes)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/50 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:border-emerald-400 hover:text-emerald-200"
              >
                Concluir venta
              </button>
              <button
                type="button"
                onClick={() => onCancelSale(sale.sale._id)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-300 transition hover:border-red-400 hover:text-red-200"
              >
                Cancelar venta
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:border-[#fa7316] hover:text-white"
            >
              Cerrar panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) => {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-white shadow-inner shadow-black/20">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{subtitle}</p>
    </div>
  );
};

const StatusBadge = ({
  status,
}: {
  status: "available" | "occupied" | "reserved" | "out_of_service";
}) => {
  const config: Record<typeof status, { label: string; className: string }> = {
    available: {
      label: "Disponible",
      className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    },
    occupied: {
      label: "Ocupada",
      className: "border-[#fa7316]/40 bg-[#fa7316]/10 text-[#fa7316]",
    },
    reserved: {
      label: "Reservada",
      className: "border-sky-500/40 bg-sky-500/10 text-sky-300",
    },
    out_of_service: {
      label: "Fuera de servicio",
      className: "border-red-500/40 bg-red-500/10 text-red-300",
    },
  };

  const entry = config[status];

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${entry.className}`}>
      {entry.label}
    </span>
  );
};

const SalesTables = () => (
  <SalesShiftGuard>
    {({ branch, activeShift }) => (
      <SalesTablesContent branch={branch} shiftSummary={activeShift} />
    )}
  </SalesShiftGuard>
);

export default SalesTables;

