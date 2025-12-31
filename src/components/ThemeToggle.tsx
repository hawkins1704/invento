import { useTheme } from "../hooks/useTheme";
import { HiSun, HiMoon } from "react-icons/hi";

const ThemeToggle = () => {
  const { theme, toggleTheme, isDark } = useTheme();

  const handleToggle = () => {
    console.log("Toggle clicked, current theme:", theme);
    toggleTheme();
    // Verificar después de un pequeño delay
    setTimeout(() => {
      console.log("HTML classes:", document.documentElement.classList.toString());
      console.log("Theme after toggle:", localStorage.getItem("theme"));
    }, 100);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-slate-100 text-slate-900 transition hover:border-[#fa7316] hover:text-[#fa7316] dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:border-[#fa7316] dark:hover:text-[#fa7316]"
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo oscuro activo" : "Modo claro activo"}
    >
      {isDark ? (
        <HiSun className="h-5 w-5" />
      ) : (
        <HiMoon className="h-5 w-5" />
      )}
    </button>
  );
};

export default ThemeToggle;

