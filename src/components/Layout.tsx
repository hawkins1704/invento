import { Fragment, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useSalesShift } from "../hooks/useSalesShift";
import { HiOutlineSwitchHorizontal } from "react-icons/hi";
import { RiDashboardFill } from "react-icons/ri";
import { FaChevronLeft, FaChevronRight, FaTags } from "react-icons/fa";
import { FaBoxArchive } from "react-icons/fa6";
import { PiMoney } from "react-icons/pi";
import { BsFillPeopleFill } from "react-icons/bs";
import { FaRegClock } from "react-icons/fa";
import { MdOutlineDinnerDining } from "react-icons/md";
import { IoLogInOutline } from "react-icons/io5";
import { FaRegUser } from "react-icons/fa";
import { FaFileInvoice } from "react-icons/fa6";
import { FaCreditCard } from "react-icons/fa";
import { LuStore } from "react-icons/lu";
import { FaCheck } from "react-icons/fa";
import CloseButton from "./CloseButton";
import ConfirmDialog from "./ConfirmDialog";
import { FiUser } from "react-icons/fi";
import { FaBars } from "react-icons/fa";
const PRIMARY_COLOR = "#fa7316";

const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: "PEN",
    }).format(value);

type NavItem = {
    label: string;
    description: string;
    path: string;
    icon: React.ReactNode;
    exact?: boolean;
};

const AREA_LINK: NavItem = {
    label: "Seleccionar área",
    description: "Toca para cambiar área",
    path: "/select-area",
    icon: <HiOutlineSwitchHorizontal color={PRIMARY_COLOR} />,
};

const ADMIN_NAV_ITEMS: NavItem[] = [
    {
        label: "Dashboard",
        description: "Resumen general",
        path: "/admin",
        icon: <RiDashboardFill color={PRIMARY_COLOR} />,
        exact: true,
    },
    {
        label: "Categorías",
        description: "Clasifica tus productos",
        path: "/admin/categories",
        icon: <FaTags color={PRIMARY_COLOR} />,
    },
    {
        label: "Inventario",
        description: "Productos y niveles",
        path: "/admin/inventory",
        icon: <FaBoxArchive color={PRIMARY_COLOR} />,
    },
    {
        label: "Ventas",
        description: "Reportes y métricas",
        path: "/admin/sales",
        icon: <PiMoney color={PRIMARY_COLOR} />,
    },
    {
        label: "Documentos Emitidos",
        description: "Facturas y boletas",
        path: "/admin/documents",
        icon: <FaFileInvoice color={PRIMARY_COLOR} />,
    },
    {
        label: "Personal",
        description: "Roles y accesos",
        path: "/admin/staff",
        icon: <BsFillPeopleFill color={PRIMARY_COLOR} />,
    },
    {
        label: "Sucursales",
        description: "Configuración de locales",
        path: "/admin/branches",
        icon: <LuStore color={PRIMARY_COLOR} />,
    },
];

const SALES_NAV_ITEMS: NavItem[] = [
    {
        label: "Mesas",
        description: "Gestión en piso",
        path: "/sales/tables",
        icon: <MdOutlineDinnerDining color={PRIMARY_COLOR} />,
    },
    {
        label: "Ventas del día",
        description: "Corte y totales",
        path: "/sales/daily",
        icon: <PiMoney color={PRIMARY_COLOR} />,
    },
    {
        label: "Inventario",
        description: "Ajustes en turno",
        path: "/sales/inventory",
        icon: <FaBoxArchive color={PRIMARY_COLOR} />,
    },
];

const Layout = () => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isProfileMenuClosing, setIsProfileMenuClosing] = useState(false);
    const [isBranchMenuOpen, setIsBranchMenuOpen] = useState(false);
    const [isBranchMenuClosing, setIsBranchMenuClosing] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { signOut } = useAuthActions();
    const profileButtonRef = useRef<HTMLButtonElement | null>(null);
    const profileMenuRef = useRef<HTMLDivElement | null>(null);
    const branchButtonRef = useRef<HTMLButtonElement | null>(null);
    const branchMenuRef = useRef<HTMLDivElement | null>(null);
    const currentUser = useQuery(api.users.getCurrent) as
        | (Doc<"users"> & { companyLogoUrl: string | null })
        | undefined;
    const {
        branchId: shiftBranchId,
        branch: selectedShiftBranch,
        branches,
        activeShift: activeShiftSummary,
        isLoadingShift,
        setBranchId,
    } = useSalesShift();
    const shiftStaffData = useQuery(
        api.staff.list,
        shiftBranchId
            ? ({
                  branchId: shiftBranchId as Id<"branches">,
                  includeInactive: false,
                  limit: 1000,
                  offset: 0,
              } as const)
            : "skip"
    ) as { staff: Doc<"staff">[]; total: number } | undefined;

    const shiftStaff = shiftStaffData?.staff ?? [];
    const openShiftMutation = useMutation(api.shifts.open);
    const closeShiftMutation = useMutation(api.shifts.close);

    // Obtener ventas abiertas para la sucursal actual
    const openSales = useQuery(
        api.sales.listLiveByBranch,
        shiftBranchId
            ? ({ branchId: shiftBranchId as Id<"branches"> } as const)
            : "skip"
    ) as
        | Array<{
              sale: Doc<"sales">;
              items: Doc<"saleItems">[];
              table?: Doc<"branchTables"> | null;
              staff?: Doc<"staff"> | null;
          }>
        | undefined;
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [shiftMode, setShiftMode] = useState<"open" | "close">("open");
    const [shiftOpeningCash, setShiftOpeningCash] = useState("");
    const [shiftClosingCash, setShiftClosingCash] = useState("");
    const [shiftNotes, setShiftNotes] = useState("");
    const [shiftStaffId, setShiftStaffId] = useState<string>("");
    const [shiftError, setShiftError] = useState<string | null>(null);
    const [isProcessingShift, setIsProcessingShift] = useState(false);
    const [isShiftModalClosing, setIsShiftModalClosing] = useState(false);
    const [showOpenSalesAlert, setShowOpenSalesAlert] = useState(false);

    const handleCloseShiftModal = () => {
        if (!isProcessingShift) {
            setIsShiftModalClosing(true);
            setTimeout(() => {
                setIsShiftModalOpen(false);
                setIsShiftModalClosing(false);
                setShiftError(null);
            }, 300); // Esperar a que termine la animación (300ms)
        }
    };

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
                setShiftStaffId(
                    activeShift.staffId ? (activeShift.staffId as string) : ""
                );
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
            setShiftStaffId(
                activeShiftSummary.shift.staffId
                    ? (activeShiftSummary.shift.staffId as string)
                    : ""
            );
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
                staffId: shiftStaffId
                    ? (shiftStaffId as Id<"staff">)
                    : undefined,
            });
            setIsShiftModalOpen(false);
            setShiftOpeningCash("");
            setShiftStaffId("");
            setShiftNotes("");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "No se pudo abrir el turno.";
            setShiftError(message);
        } finally {
            setIsProcessingShift(false);
        }
    };

    const handleSubmitCloseShift = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();
        if (!activeShiftSummary) {
            setShiftError("No hay un turno abierto para esta sucursal.");
            return;
        }

        // Verificar si hay ventas abiertas
        const hasOpenSales = openSales && openSales.length > 0;
        if (hasOpenSales) {
            setShowOpenSalesAlert(true);
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
            const message =
                error instanceof Error
                    ? error.message
                    : "No se pudo cerrar el turno.";
            setShiftError(message);
        } finally {
            setIsProcessingShift(false);
        }
    };

    const toggleSidebar = () => {
        setIsCollapsed((previous) => !previous);
    };

    const closeMobileSidebar = () => setIsMobileOpen(false);

    const handleCloseProfileMenu = () => {
        setIsProfileMenuClosing(true);
        setTimeout(() => {
            setIsProfileMenuOpen(false);
            setIsProfileMenuClosing(false);
        }, 300); // Esperar a que termine la animación (300ms)
    };

    const handleCloseBranchMenu = () => {
        setIsBranchMenuClosing(true);
        setTimeout(() => {
            setIsBranchMenuOpen(false);
            setIsBranchMenuClosing(false);
        }, 300); // Esperar a que termine la animación (300ms)
    };

    useEffect(() => {
        if (!isProfileMenuOpen || isProfileMenuClosing) {
            return;
        }

        // Pequeño delay para evitar que el clic que abre el menú lo cierre inmediatamente
        let cleanup: (() => void) | null = null;
        const timeoutId = setTimeout(() => {
            const handleClickOutside = (event: MouseEvent) => {
                const target = event.target as Node;
                if (
                    (profileButtonRef.current &&
                        profileButtonRef.current.contains(target)) ||
                    (profileMenuRef.current &&
                        profileMenuRef.current.contains(target))
                ) {
                    return;
                }
                handleCloseProfileMenu();
            };

            document.addEventListener("mousedown", handleClickOutside);
            cleanup = () => {
                document.removeEventListener("mousedown", handleClickOutside);
            };
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            if (cleanup) {
                cleanup();
            }
        };
    }, [isProfileMenuOpen, isProfileMenuClosing]);

    useEffect(() => {
        if (isProfileMenuOpen && (isCollapsed || isMobileOpen)) {
            setIsProfileMenuClosing(true);
            setTimeout(() => {
                setIsProfileMenuOpen(false);
                setIsProfileMenuClosing(false);
            }, 300);
        }
        setIsBranchMenuOpen(false);
    }, [isCollapsed, isMobileOpen, isProfileMenuOpen]);

    useEffect(() => {
        if (!isBranchMenuOpen || isBranchMenuClosing) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (
                (branchButtonRef.current &&
                    branchButtonRef.current.contains(event.target as Node)) ||
                (branchMenuRef.current &&
                    branchMenuRef.current.contains(event.target as Node))
            ) {
                return;
            }
            handleCloseBranchMenu();
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isBranchMenuOpen, isBranchMenuClosing]);

    const handleSignOut = async () => {
        await signOut();
        handleCloseProfileMenu();
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
    const shiftButtonDescription = selectedShiftBranch
        ? selectedShiftBranch.name
        : "Sin sucursal";
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
        <>
            <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
                <aside
                    className={`fixed inset-y-0 left-0 z-40 flex h-full flex-col border-r border-slate-800 bg-slate-900/95 backdrop-blur transition-all duration-300 md:static md:h-full md:translate-x-0 ${
                        isMobileOpen
                            ? "translate-x-0"
                            : "-translate-x-full md:translate-x-0"
                    } ${isCollapsed ? "w-20 md:w-20" : "w-64 md:w-72"}`}
                >
                    <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
                        {isCollapsed ? (
                            <button
                                type="button"
                                onClick={toggleSidebar}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-sm font-semibold text-white transition hover:border-[#fa7316] hover:text-[#fa7316]"
                                aria-label="Expandir sidebar"
                            >
                                <FaChevronRight />
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCollapsed(false);
                                        setIsMobileOpen(false);
                                    }}
                                    className="inline-flex items-center gap-2"
                                >
                                    <img
                                        src="/logo-main.svg"
                                        alt="Logo"
                                        className="w-full h-7 object-contain"
                                    />
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleSidebar}
                                    className="hidden h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-sm font-semibold text-white hover:border-[#fa7316] hover:text-[#fa7316] md:flex"
                                    aria-label="Colapsar sidebar"
                                >
                                    <FaChevronLeft />
                                </button>
                            </>
                        )}
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
                                                    `group flex items-center gap-4 rounded-lg border border-transparent px-4 py-3 text-sm transition hover:border-slate-700 hover:bg-slate-800/50 ${
                                                        isActive
                                                            ? "border-[#fa7316]/60 bg-[#fa7316]/10 text-white"
                                                            : "text-slate-300"
                                                    }`
                                                }
                                                onClick={closeMobileSidebar}
                                            >
                                                <span
                                                    className="text-xl"
                                                    aria-hidden
                                                >
                                                    {item.icon}
                                                </span>
                                                {!isCollapsed && (
                                                    <span className="flex flex-col">
                                                        <span className="font-semibold text-white">
                                                            {isAreaLink
                                                                ? areaNavLabel
                                                                : item.label}
                                                        </span>
                                                        <span className="text-xs text-slate-400">
                                                            {isAreaLink
                                                                ? areaNavDescription
                                                                : item.description}
                                                        </span>
                                                    </span>
                                                )}
                                            </NavLink>
                                        </li>
                                        {index === 0 &&
                                            currentArea === "sales" && (
                                                <li key="shift-action">
                                                    <button
                                                        type="button"
                                                        onClick={
                                                            handleShiftButtonClick
                                                        }
                                                        disabled={
                                                            shiftButtonDisabled
                                                        }
                                                        className={`group flex w-full items-center gap-4 rounded-lg border px-4 py-3 text-sm transition ${
                                                            shiftButtonDisabled
                                                                ? "cursor-not-allowed opacity-50"
                                                                : "hover:border-slate-700 hover:bg-slate-800/50"
                                                        } ${shiftButtonClasses}`}
                                                    >
                                                        <FaRegClock
                                                            color={
                                                                PRIMARY_COLOR
                                                            }
                                                        />
                                                        {!isCollapsed && (
                                                            <span className="flex flex-col text-left">
                                                                <span className="font-semibold text-white">
                                                                    {
                                                                        shiftButtonLabel
                                                                    }
                                                                </span>
                                                                <span className="text-xs text-slate-300">
                                                                    {
                                                                        shiftButtonDescription
                                                                    }
                                                                </span>
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
                            onClick={() => {
                                if (isCollapsed) {
                                    return;
                                } else {
                                    if (isProfileMenuOpen) {
                                        handleCloseProfileMenu();
                                    } else {
                                        setIsProfileMenuOpen(true);
                                    }
                                }
                            }}
                            className={`flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2 transition  ${
                                isCollapsed
                                    ? "justify-center"
                                    : "hover:border-slate-700 hover:bg-slate-800/50 cursor-pointer"
                            }
            }`}
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fa7316]/20 text-sm font-semibold text-[#fa7316] overflow-hidden">
                                {currentUser?.companyLogoUrl ? (
                                    <img
                                        src={currentUser.companyLogoUrl}
                                        alt="Company logo"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <FiUser size={16} />
                                )}
                            </div>
                            {!isCollapsed && (
                                <div className="flex flex-col text-left">
                                    <span className="text-sm font-semibold text-white">
                                        {currentUser?.name}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {currentUser?.companyCommercialName}
                                    </span>
                                </div>
                            )}
                        </button>

                        {isProfileMenuOpen && (
                            <div
                                ref={profileMenuRef}
                                className={`${
                                    isCollapsed
                                        ? "fixed bottom-5 left-20"
                                        : "absolute bottom-20 left-4"
                                } z-50 w-48 rounded-lg border border-slate-800 bg-slate-900/95 p-3 shadow-xl ${isProfileMenuClosing ? "animate-[fadeOutScale_0.3s_ease-out]" : "animate-[fadeInScale_0.3s_ease-out]"}`}
                            >
                                {currentArea === "admin" && (
                                    <>
                                        <button
                                            type="button"
                                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800/80 cursor-pointer"
                                            onClick={() => {
                                                handleCloseProfileMenu();
                                                setTimeout(() => {
                                                    navigate("/admin/profile");
                                                }, 300);
                                            }}
                                        >
                                            <span className="text-sm font-semibold text-white text-left">
                                                Editar perfil
                                            </span>
                                            <FaRegUser color={PRIMARY_COLOR} />
                                        </button>
                                        <button
                                            type="button"
                                            className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800/80 cursor-pointer"
                                            onClick={() => {
                                                handleCloseProfileMenu();
                                                setTimeout(() => {
                                                    navigate(
                                                        "/admin/suscripcion"
                                                    );
                                                }, 300);
                                            }}
                                        >
                                            <span className="text-sm font-semibold text-white text-left">
                                                Mi suscripción
                                            </span>
                                            <FaCreditCard
                                                color={PRIMARY_COLOR}
                                            />
                                        </button>
                                    </>
                                )}
                                <button
                                    type="button"
                                    className={`flex w-full items-center justify-between rounded-lg bg-[#fa7316]/10 px-3 py-2 text-sm font-semibold text-[#fa7316] transition hover:bg-[#fa7316]/20 cursor-pointer ${
                                        currentArea === "admin" ? "mt-2" : ""
                                    }`}
                                    onClick={handleSignOut}
                                >
                                    <span className="text-sm font-semibold text-white text-left">
                                        Cerrar sesión
                                    </span>
                                    <IoLogInOutline color={PRIMARY_COLOR} />
                                </button>
                            </div>
                        )}
                    </div>
                </aside>

                {isShiftModalOpen && (
                    <div
                        className={`fixed inset-0 z-[70] flex items-center justify-center px-4 py-10 ${isShiftModalClosing ? "animate-[fadeOut_0.3s_ease-out]" : "animate-[fadeIn_0.2s_ease-out]"}`}
                    >
                        <div
                            className={`absolute inset-0 bg-slate-950/70 backdrop-blur ${isShiftModalClosing ? "animate-[fadeOut_0.3s_ease-out]" : "animate-[fadeIn_0.2s_ease-out]"}`}
                        />
                        <div
                            className={`relative w-full max-w-xl rounded-lg border border-slate-800 bg-slate-900/95 p-6 text-white shadow-2xl shadow-black/60 ${isShiftModalClosing ? "animate-[fadeOutScale_0.3s_ease-out]" : "animate-[fadeInScale_0.3s_ease-out]"}`}
                        >
                            <CloseButton onClick={handleCloseShiftModal} />

                            <div className="max-h-[90vh] overflow-y-auto pr-1">
                                {shiftMode === "open" ? (
                                    <form
                                        className="space-y-5 pt-6"
                                        onSubmit={handleSubmitOpenShift}
                                    >
                                        <header className="space-y-2">
                                            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white">
                                                Abrir turno
                                            </span>
                                            <h2 className="text-2xl font-semibold text-white">
                                                Registrar inicio de turno
                                            </h2>
                                            <p className="text-sm text-slate-400">
                                                Confirma la sucursal y el
                                                efectivo inicial con el que
                                                arranca el turno.
                                            </p>
                                        </header>

                                        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                                            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
                                                Sucursal
                                            </p>
                                            <p className="mt-2 text-lg font-semibold text-white">
                                                {selectedShiftBranch?.name ??
                                                    "Sin sucursal"}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {selectedShiftBranch?.address}
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <label
                                                className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500"
                                                htmlFor="shift-staff"
                                            >
                                                Responsable (opcional)
                                            </label>
                                            <select
                                                id="shift-staff"
                                                value={shiftStaffId}
                                                onChange={(event) =>
                                                    setShiftStaffId(
                                                        event.target.value
                                                    )
                                                }
                                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                                            >
                                                <option value="">
                                                    Sin asignar
                                                </option>
                                                {shiftStaff?.map((member) => (
                                                    <option
                                                        key={
                                                            member._id as string
                                                        }
                                                        value={
                                                            member._id as string
                                                        }
                                                    >
                                                        {member.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label
                                                className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500"
                                                htmlFor="shift-opening-cash"
                                            >
                                                Caja inicial (efectivo)
                                            </label>
                                            <input
                                                id="shift-opening-cash"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={shiftOpeningCash}
                                                onChange={(event) =>
                                                    setShiftOpeningCash(
                                                        event.target.value
                                                    )
                                                }
                                                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                                                placeholder="0.00"
                                            />
                                        </div>

                                        {shiftError && (
                                            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                                {shiftError}
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                                            <button
                                                type="button"
                                                onClick={handleCloseShiftModal}
                                                className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-[#fa7316] hover:text-white cursor-pointer"
                                                disabled={isProcessingShift}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white  transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                                                disabled={isProcessingShift}
                                            >
                                                {isProcessingShift
                                                    ? "Guardando..."
                                                    : "Abrir turno"}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <form
                                        className="space-y-5 pt-6"
                                        onSubmit={handleSubmitCloseShift}
                                    >
                                        <header className="space-y-2">
                                            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-white">
                                                Cerrar turno
                                            </span>
                                            <h2 className="text-2xl font-semibold text-white">
                                                Finalizar turno
                                            </h2>
                                            <p className="text-sm text-slate-400">
                                                Revisa los importes y registra
                                                la caja real al finalizar el
                                                día.
                                            </p>
                                        </header>

                                        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                                            <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
                                                Sucursal
                                            </p>
                                            <p className="mt-2 text-lg font-semibold text-white">
                                                {selectedShiftBranch?.name ??
                                                    "Sin sucursal"}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {selectedShiftBranch?.address}
                                            </p>
                                        </div>

                                        {activeShiftSummary ? (
                                            <>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                                                        <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
                                                            Caja inicial
                                                        </p>
                                                        <p className="mt-2 text-lg font-semibold text-white">
                                                            {formatCurrency(
                                                                activeShiftSummary
                                                                    .shift
                                                                    .openingCash
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                                                        <p className="text-xs uppercase tracking-[0.1em] text-slate-500">
                                                            Ventas en efectivo
                                                        </p>
                                                        <p className="mt-2 text-lg font-semibold text-white">
                                                            {formatCurrency(
                                                                shiftCashSalesTotal
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-100">
                                                    <p className="text-xs uppercase tracking-[0.1em]">
                                                        Debería haber
                                                    </p>
                                                    <p className="mt-2 text-lg font-semibold">
                                                        {formatCurrency(
                                                            shiftExpectedCash
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    <label
                                                        className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500"
                                                        htmlFor="shift-closing-cash"
                                                    >
                                                        Efectivo contado
                                                    </label>
                                                    <input
                                                        id="shift-closing-cash"
                                                        type="number"
                                                        step="0.01"
                                                        value={shiftClosingCash}
                                                        onChange={(event) =>
                                                            setShiftClosingCash(
                                                                event.target
                                                                    .value
                                                            )
                                                        }
                                                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                                                        placeholder="0.00"
                                                    />
                                                </div>

                                                {shiftClosingCash && (
                                                    <div
                                                        className={`rounded-lg border px-4 py-3 text-sm ${
                                                            Math.abs(
                                                                Number(
                                                                    shiftClosingCash
                                                                ) -
                                                                    shiftExpectedCash
                                                            ) < 0.01
                                                                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                                                                : "border-red-500/40 bg-red-500/10 text-red-200"
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span>
                                                                Diferencia
                                                            </span>
                                                            <span className="font-semibold">
                                                                {formatCurrency(
                                                                    Number(
                                                                        shiftClosingCash ||
                                                                            "0"
                                                                    ) -
                                                                        shiftExpectedCash
                                                                )}
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xs">
                                                            {Math.abs(
                                                                Number(
                                                                    shiftClosingCash
                                                                ) -
                                                                    shiftExpectedCash
                                                            ) < 0.01
                                                                ? "El conteo coincide con lo esperado."
                                                                : "Registra una nota con el motivo de la diferencia."}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    <label
                                                        className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500"
                                                        htmlFor="shift-notes"
                                                    >
                                                        Notas
                                                    </label>
                                                    <textarea
                                                        id="shift-notes"
                                                        rows={3}
                                                        value={shiftNotes}
                                                        onChange={(event) =>
                                                            setShiftNotes(
                                                                event.target
                                                                    .value
                                                            )
                                                        }
                                                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30"
                                                        placeholder="Observaciones sobre la diferencia detectada"
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-300">
                                                No hay un turno abierto en esta
                                                sucursal. Selecciona otra
                                                sucursal o abre un turno para
                                                continuar.
                                            </div>
                                        )}

                                        {shiftError && (
                                            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                                {shiftError}
                                            </div>
                                        )}

                                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                                            <button
                                                type="button"
                                                onClick={handleCloseShiftModal}
                                                className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-[#fa7316] hover:text-white cursor-pointer"
                                                disabled={isProcessingShift}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="submit"
                                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white  transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
                                                disabled={
                                                    isProcessingShift ||
                                                    !activeShiftSummary
                                                }
                                            >
                                                {isProcessingShift
                                                    ? "Guardando..."
                                                    : "Cerrar turno"}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
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
                                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-white hover:border-[#fa7316] hover:text-[#fa7316] md:hidden cursor-pointer"
                                onClick={() => setIsMobileOpen(true)}
                                aria-label="Abrir menú"
                            >
                                <FaBars />
                            </button>
                            <div>
                              
                                <h1 className="text-lg font-semibold text-white">
                                    {menuItems.find(
                                        (item) =>
                                            item.path === location.pathname
                                    )?.label ?? "Panel"}
                                </h1>
                            </div>
                        </div>
                        {currentArea === "sales" && selectedShiftBranch && (
                            <div className="relative">
                                <button
                                    type="button"
                                    ref={branchButtonRef}
                                    onClick={() => {
                                        if (isBranchMenuOpen) {
                                            handleCloseBranchMenu();
                                        } else {
                                            setIsBranchMenuOpen(true);
                                        }
                                    }}
                                    className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-semibold text-white transition hover:border-[#fa7316] hover:bg-slate-800/80 cursor-pointer"
                                >
                                    <LuStore color={PRIMARY_COLOR} />
                                    <span>{selectedShiftBranch.name}</span>
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                        className={`h-4 w-4 transition-transform ${isBranchMenuOpen ? "rotate-180" : ""}`}
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                                        />
                                    </svg>
                                </button>

                                {(isBranchMenuOpen || isBranchMenuClosing) &&
                                    branches &&
                                    branches.length > 0 && (
                                        <div
                                            ref={branchMenuRef}
                                            className={`absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-slate-800 bg-slate-900/95 p-3 shadow-xl ${isBranchMenuClosing ? "animate-[fadeOutScale_0.3s_ease-out]" : "animate-[fadeInScale_0.3s_ease-out]"}`}
                                        >
                                            <div className="mb-2 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                                                Seleccionar sucursal
                                            </div>
                                            {branches
                                                .sort((a, b) =>
                                                    a.name.localeCompare(b.name)
                                                )
                                                .map((branch) => {
                                                    const isSelected =
                                                        (branch._id as string) ===
                                                        shiftBranchId;
                                                    return (
                                                        <button
                                                            key={
                                                                branch._id as string
                                                            }
                                                            type="button"
                                                            onClick={() => {
                                                                setBranchId(
                                                                    branch._id as string
                                                                );
                                                                handleCloseBranchMenu();
                                                            }}
                                                            className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                                                                isSelected
                                                                    ? "bg-[#fa7316]/10 text-[#fa7316] border border-[#fa7316]/30"
                                                                    : "text-slate-200 hover:bg-slate-800/80"
                                                            }`}
                                                        >
                                                            <LuStore
                                                                color={
                                                                    isSelected
                                                                        ? PRIMARY_COLOR
                                                                        : undefined
                                                                }
                                                                className="mt-0.5 flex-shrink-0"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="font-semibold">
                                                                    {
                                                                        branch.name
                                                                    }
                                                                </div>
                                                                {branch.address && (
                                                                    <div
                                                                        className={`mt-0.5 text-xs ${isSelected ? "text-[#fa7316]/80" : "text-slate-400"}`}
                                                                    >
                                                                        {
                                                                            branch.address
                                                                        }
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {isSelected && (
                                                                <FaCheck />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    )}
                            </div>
                        )}
                    </header>

                    <main className="flex-1 overflow-y-auto bg-slate-950">
                        <div className="mx-auto w-full max-w-6xl px-6 py-10">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>

            <ConfirmDialog
                isOpen={showOpenSalesAlert}
                title="No se puede cerrar el turno"
                tone="danger"
                description={
                    <div className="space-y-3">
                        <p className="text-sm text-slate-200">
                            No se puede cerrar el turno mientras haya ventas
                            abiertas. Por favor, cierra o cancela todas las
                            ventas antes de cerrar el turno.
                        </p>
                        {openSales && openSales.length > 0 && (
                            <p className="text-sm text-slate-300">
                                Ventas abiertas:{" "}
                                <span className="font-semibold text-white">
                                    {openSales.length}
                                </span>
                            </p>
                        )}
                    </div>
                }
                confirmLabel="Entendido"
                cancelLabel=""
                onConfirm={() => setShowOpenSalesAlert(false)}
                onCancel={() => setShowOpenSalesAlert(false)}
            />
        </>
    );
};

export default Layout;
