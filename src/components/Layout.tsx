import { Fragment, FormEvent, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useSalesShift, type ShiftSummary } from "../hooks/useSalesShift";

const PRIMARY_COLOR = "#fa7316";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(value);

type NavItem = {
  label: string;
  description: string;
  path: string;
  icon: string;
  exact?: boolean;
};

const AREA_LINK: NavItem = {
  label: "Seleccionar área",
  description: "Toca para cambiar área",
  path: "/select-area",
  icon: "🏁",
};

const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    description: "Resumen general",
    path: "/admin",
    icon: "📊",
    exact: true,
  },
  {
    label: "Categorías",
    description: "Clasifica tus productos",
    path: "/admin/categories",
    icon: "🏷️",
  },
  {
    label: "Inventario",
    description: "Productos y niveles",
    path: "/admin/inventory",
    icon: "📦",
  },
  {
    label: "Ventas",
    description: "Reportes y métricas",
    path: "/admin/sales",
    icon: "💹",
  },
  {
    label: "Personal",
    description: "Roles y accesos",
    path: "/admin/staff",
    icon: "🧑‍🍳",
  },
  {
    label: "Sucursales",
    description: "Configuración de locales",
    path: "/admin/branches",
    icon: "📍",
  },
];

const SALES_NAV_ITEMS: NavItem[] = [
  {
    label: "Mesas",
    description: "Gestión en piso",
    path: "/sales/tables",
    icon: "🍽️",
  },
  {
    label: "Ventas del día",
    description: "Corte y totales",
    path: "/sales/daily",
    icon: "🧾",
  },
  {
    label: "Inventario",
    description: "Ajustes en turno",
    path: "/sales/inventory",
    icon: "📦",
  },
];

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const profileButtonRef = useRef<HTMLButtonElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const {
    branches: shiftBranches,
    branchId: shiftBranchId,
    branch: selectedShiftBranch,
    activeShift: activeShiftSummary,
    isLoadingShift,
  } = useSalesShift();
  const shiftStaff = useQuery(
    shiftBranchId ? api.staff.list : "skip",
    shiftBranchId ? { branchId: shiftBranchId as Id<"branches">, includeInactive: false } : "skip"
  ) as Doc<"staff">[] | undefined;
  const openShiftMutation = useMutation(api.shifts.open);
  const closeShiftMutation = useMutation(api.shifts.close);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftMode, setShiftMode] = useState<"open" | "close">("open");
  const [shiftOpeningCash, setShiftOpeningCash] = useState("");
  const [shiftClosingCash, setShiftClosingCash] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");
  const [shiftStaffId, setShiftStaffId] = useState<string>("");
  const [shiftError, setShiftError] = useState<string | null>(null);
  const [isProcessingShift, setIsProcessingShift] = useState(false);

  const activeShift = activeShiftSummary?.shift ?? null;
  const shiftExpectedCash = activeShiftSummary?.expectedCash ?? 0;
  const shiftCashSalesTotal = activeShiftSummary?.cashSalesTotal ?? 0;

  useEffect(() => {
    if (!isShiftModalOpen) {
      return;
    }

    if (shiftMode === "close") {
      if (activeShift) {
        setShiftClosingCash(shiftExpectedCash.toFixed(2));
        setShiftStaffId(activeShift.staffId ? (activeShift.staffId as string) : "");
      } else {
        setShiftClosingCash("");
        setShiftStaffId("");
      }
    } else {
      setShiftOpeningCash("");
      setShiftNotes("");
      setShiftStaffId("");
    }
  }, [activeShift, isShiftModalOpen, shiftExpectedCash, shiftMode]);

  const handleShiftButtonClick = () => {
    if (!selectedShiftBranch) {
      navigate("/sales/select-branch", { replace: true });
      return;
    }
    const targetMode: "open" | "close" = activeShift ? "close" : "open";
    setShiftMode(targetMode);
    setShiftError(null);

    if (targetMode === "close" && activeShiftSummary) {
      setShiftClosingCash(activeShiftSummary.expectedCash.toFixed(2));
      setShiftStaffId(activeShiftSummary.shift.staffId ? (activeShiftSummary.shift.staffId as string) : "");
    } else {
      setShiftOpeningCash("");
      setShiftClosingCash("");
      setShiftStaffId("");
    }

    setShiftNotes("");
    setIsShiftModalOpen(true);
  };

  const handleSubmitOpenShift = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!shiftBranchId) {
      setShiftError("Selecciona una sucursal para abrir el turno.");
      return;
    }

    const amount = Number(shiftOpeningCash);
    if (Number.isNaN(amount) || amount < 0) {
      setShiftError("Ingresa un monto inicial válido.");
      return;
    }

    setIsProcessingShift(true);
    try {
      await openShiftMutation({
        branchId: shiftBranchId as Id<"branches">,
        openingCash: Math.round(amount * 100) / 100,
        staffId: shiftStaffId ? (shiftStaffId as Id<"staff">) : undefined,
      });
      setIsShiftModalOpen(false);
      setShiftOpeningCash("");
      setShiftStaffId("");
      setShiftNotes("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo abrir el turno.";
      setShiftError(message);
    } finally {
      setIsProcessingShift(false);
    }
  };

  const handleSubmitCloseShift = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeShiftSummary) {
      setShiftError("No hay un turno abierto para esta sucursal.");
      return;
    }

    const amount = Number(shiftClosingCash);
    if (Number.isNaN(amount)) {
      setShiftError("Ingresa el monto final en efectivo.");
      return;
    }

    setIsProcessingShift(true);
    try {
      await closeShiftMutation({
        shiftId: activeShiftSummary.shift._id,
        actualCash: Math.round(amount * 100) / 100,
        notes: shiftNotes.trim() ? shiftNotes.trim() : undefined,
      });
      setIsShiftModalOpen(false);
      setShiftClosingCash("");
      setShiftNotes("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cerrar el turno.";
      setShiftError(message);
    } finally {
      setIsProcessingShift(false);
    }
  };

  const toggleSidebar = () => {
    setIsCollapsed((previous) => !previous);
  };

  const closeMobileSidebar = () => setIsMobileOpen(false);

  useEffect(() => {
    if (!isProfileMenuOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        (profileButtonRef.current && profileButtonRef.current.contains(event.target as Node)) ||
        (profileMenuRef.current && profileMenuRef.current.contains(event.target as Node))
      ) {
        return;
      }
      setIsProfileMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [isCollapsed, isMobileOpen]);

  const handleSignOut = async () => {
    await signOut();
    setIsProfileMenuOpen(false);
    navigate("/login");
  };

  const areaNavLabel = location.pathname.startsWith("/admin")
    ? "Administrador"
    : location.pathname.startsWith("/sales")
    ? "Ventas"
    : "Seleccionar área";

  const areaNavDescription = "Toca para cambiar área";

  const currentArea = location.pathname.startsWith("/admin")
    ? "admin"
    : location.pathname.startsWith("/sales")
    ? "sales"
    : null;

  const shiftButtonLabel = activeShift ? "Cerrar turno" : "Abrir turno";
  const shiftButtonDescription = selectedShiftBranch ? selectedShiftBranch.name : "Sin sucursal";
  const shiftButtonClasses = activeShift
    ? "border-red-500/40 bg-red-500/10 text-red-200 hover:border-red-500/60"
    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:border-emerald-500/60";
  const shiftButtonDisabled = !selectedShiftBranch || isLoadingShift;

  const menuItems: NavItem[] = [
    {
      ...AREA_LINK,
      label: areaNavLabel,
      description: areaNavDescription,
    },
    ...(currentArea === "admin"
      ? ADMIN_NAV_ITEMS
      : currentArea === "sales"
      ? SALES_NAV_ITEMS
      : []),
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur transition-all duration-300 md:static md:h-full md:translate-x-0 ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } ${isCollapsed ? "w-20 md:w-20" : "w-64 md:w-72"}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <button
            type="button"
            onClick={() => {
              setIsCollapsed(false);
              setIsMobileOpen(false);
            }}
            className="inline-flex items-center gap-2"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg font-semibold ${
                isCollapsed ? "mx-auto" : ""
              }`}
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              IN
            </span>
            {!isCollapsed && <span className="text-sm font-semibold uppercase tracking-[0.2em]">Invento</span>}
          </button>
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-sm font-semibold text-white hover:border-[#fa7316] hover:text-[#fa7316] md:flex"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? ">" : "<"}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6">
          <ul className="space-y-2">
            {menuItems.map((item, index) => {
              const isAreaLink = item.path === "/select-area";
              return (
                <Fragment key={item.path}>
                  <li>
                    <NavLink
                      to={item.path}
                      end={item.exact}
                      className={({ isActive }) =>
                        `group flex items-center gap-4 rounded-2xl border border-transparent px-4 py-3 text-sm transition hover:border-slate-700 hover:bg-slate-800/50 ${
                          isActive ? "border-[#fa7316]/60 bg-[#fa7316]/10 text-white" : "text-slate-300"
                        }`
                      }
                      onClick={closeMobileSidebar}
                    >
                      <span className="text-xl" aria-hidden>
                        {item.icon}
                      </span>
                      {!isCollapsed && (
                        <span className="flex flex-col">
                          <span className="font-semibold text-white">{isAreaLink ? areaNavLabel : item.label}</span>
                          <span className="text-xs text-slate-400">
                            {isAreaLink ? areaNavDescription : item.description}
                          </span>
                        </span>
                      )}
                    </NavLink>
                  </li>
                  {index === 0 && currentArea === "sales" && (
                    <li key="shift-action">
                      <button
                        type="button"
                        onClick={handleShiftButtonClick}
                        disabled={shiftButtonDisabled}
                        className={`group flex w-full items-center gap-4 rounded-2xl border px-4 py-3 text-sm transition ${
                          shiftButtonDisabled ? "cursor-not-allowed opacity-50" : "hover:border-slate-700 hover:bg-slate-800/50"
                        } ${shiftButtonClasses}`}
                      >
                        <span className="text-xl" aria-hidden>
                          🕒
                        </span>
                        {!isCollapsed && (
                          <span className="flex flex-col text-left">
                            <span className="font-semibold text-white">{shiftButtonLabel}</span>
                            <span className="text-xs text-slate-300">{shiftButtonDescription}</span>
                          </span>
                        )}
                      </button>
                    </li>
                  )}
                </Fragment>
              );
            })}
          </ul>
        </nav>

        <div className="relative mt-auto border-t border-slate-800 px-4 py-5">
          <button
            type="button"
            ref={profileButtonRef}
            onClick={() => setIsProfileMenuOpen((previous) => !previous)}
            className={`flex w-full items-center gap-3 rounded-2xl border border-transparent px-2 py-2 transition hover:border-slate-700 hover:bg-slate-800/50 ${
              isCollapsed ? "justify-center" : ""}
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fa7316]/20 text-sm font-semibold text-[#fa7316]">
              RA
            </div>
            {!isCollapsed && (
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-white">Renzo Arroyo</span>
                <span className="text-xs text-slate-400">Administrador</span>
              </div>
            )}
          </button>

          {isProfileMenuOpen && (
            <div
              ref={profileMenuRef}
              className={`absolute bottom-20 z-50 w-48 rounded-2xl border border-slate-800 bg-slate-900/95 p-3 shadow-xl ${
                isCollapsed ? "left-1/2 -translate-x-1/2" : "left-4"
              }`}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800/80"
                onClick={() => setIsProfileMenuOpen(false)}
              >
                Editar perfil
                <span aria-hidden>⚙️</span>
              </button>
              <button
                type="button"
                className="mt-2 flex w-full items-center justify-between rounded-xl bg-[#fa7316]/10 px-3 py-2 text-sm font-semibold text-[#fa7316] transition hover:bg-[#fa7316]/20"
                onClick={handleSignOut}
              >
                Cerrar sesión
                <span aria-hidden>⎋</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {isShiftModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 px-4 py-10 backdrop-blur">
          <div className="relative w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/95 p-6 text-white shadow-2xl shadow-black/60">
            <button
              type="button"
              onClick={() => {
                if (!isProcessingShift) {
                  setIsShiftModalOpen(false);
                  setShiftError(null);
                }
              }}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition hover:text-white"
              aria-label="Cerrar"
            >
              ✕
            </button>

            {shiftMode === "open" ? (
              <form className="space-y-5 pt-6" onSubmit={handleSubmitOpenShift}>
                <header className="space-y-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                    Abrir turno
                  </span>
                  <h2 className="text-2xl font-semibold text-white">Registrar inicio de turno</h2>
                  <p className="text-sm text-slate-400">
                    Confirma la sucursal y el efectivo inicial con el que arranca el turno.
                  </p>
                </header>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Sucursal</p>
                  <p className="mt-2 text-lg font-semibold text-white">{selectedShiftBranch?.name ?? "Sin sucursal"}</p>
                  <p className="text-xs text-slate-500">{selectedShiftBranch?.address}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500" htmlFor="shift-staff">
                    Responsable (opcional)
                  </label>
                  <select
                    id="shift-staff"
                    value={shiftStaffId}
                    onChange={(event) => setShiftStaffId(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                  >
                    <option value="">Sin asignar</option>
                    {shiftStaff?.map((member) => (
                      <option key={member._id as string} value={member._id as string}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500" htmlFor="shift-opening-cash">
                    Caja inicial (efectivo)
                  </label>
                  <input
                    id="shift-opening-cash"
                    type="number"
                    min="0"
                    step="0.01"
                    value={shiftOpeningCash}
                    onChange={(event) => setShiftOpeningCash(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                    placeholder="0.00"
                  />
                </div>

                {shiftError && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {shiftError}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isProcessingShift) {
                        setIsShiftModalOpen(false);
                        setShiftError(null);
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-[#fa7316] hover:text-white"
                    disabled={isProcessingShift}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#fa7316]/40 transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isProcessingShift}
                  >
                    {isProcessingShift ? "Guardando..." : "Abrir turno"}
                  </button>
                </div>
              </form>
            ) : (
              <form className="space-y-5 pt-6" onSubmit={handleSubmitCloseShift}>
                <header className="space-y-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                    Cerrar turno
                  </span>
                  <h2 className="text-2xl font-semibold text-white">Finalizar turno</h2>
                  <p className="text-sm text-slate-400">
                    Revisa los importes y registra la caja real al finalizar el día.
                  </p>
                </header>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Sucursal</p>
                  <p className="mt-2 text-lg font-semibold text-white">{selectedShiftBranch?.name ?? "Sin sucursal"}</p>
                  <p className="text-xs text-slate-500">{selectedShiftBranch?.address}</p>
                </div>

                {activeShiftSummary ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Caja inicial</p>
                        <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(activeShiftSummary.shift.openingCash)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Ventas en efectivo</p>
                        <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(shiftCashSalesTotal)}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-100">
                      <p className="text-xs uppercase tracking-[0.24em]">Debería haber</p>
                      <p className="mt-2 text-lg font-semibold">{formatCurrency(shiftExpectedCash)}</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500" htmlFor="shift-closing-cash">
                        Efectivo contado
                      </label>
                      <input
                        id="shift-closing-cash"
                        type="number"
                        step="0.01"
                        value={shiftClosingCash}
                        onChange={(event) => setShiftClosingCash(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                        placeholder="0.00"
                      />
                    </div>

                    {shiftClosingCash && (
                      <div
                        className={`rounded-2xl border px-4 py-3 text-sm ${
                          Math.abs(Number(shiftClosingCash) - shiftExpectedCash) < 0.01
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                            : "border-red-500/40 bg-red-500/10 text-red-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>Diferencia</span>
                          <span className="font-semibold">
                            {formatCurrency(Number(shiftClosingCash || "0") - shiftExpectedCash)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs">
                          {Math.abs(Number(shiftClosingCash) - shiftExpectedCash) < 0.01
                            ? "El conteo coincide con lo esperado."
                            : "Registra una nota con el motivo de la diferencia."}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500" htmlFor="shift-notes">
                        Notas
                      </label>
                      <textarea
                        id="shift-notes"
                        rows={3}
                        value={shiftNotes}
                        onChange={(event) => setShiftNotes(event.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                        placeholder="Observaciones sobre la diferencia detectada"
                      />
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-300">
                    No hay un turno abierto en esta sucursal. Selecciona otra sucursal o abre un turno para continuar.
                  </div>
                )}

                {shiftError && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {shiftError}
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isProcessingShift) {
                        setIsShiftModalOpen(false);
                        setShiftError(null);
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-[#fa7316] hover:text-white"
                    disabled={isProcessingShift}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#fa7316]/40 transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={isProcessingShift || !activeShiftSummary}
                  >
                    {isProcessingShift ? "Guardando..." : "Cerrar turno"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {isMobileOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-white hover:border-[#fa7316] hover:text-[#fa7316] md:hidden"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Abrir menú"
            >
              ☰
            </button>
            <div>
              <p className="text-xs uppercase tracking-[0.34em] text-slate-500">Invento</p>
              <h1 className="text-lg font-semibold text-white">
                {menuItems.find((item) => item.path === location.pathname)?.label ?? "Panel"}
              </h1>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-950">
          <div className="mx-auto w-full max-w-6xl px-6 py-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
