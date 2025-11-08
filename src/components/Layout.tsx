import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";

const PRIMARY_COLOR = "#fa7316";

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
            {menuItems.map((item) => {
              const isAreaLink = item.path === "/select-area";
              return (
                <li key={item.path}>
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
