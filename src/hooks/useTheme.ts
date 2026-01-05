import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "theme";

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Leer del localStorage si existe
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (savedTheme === "light" || savedTheme === "dark") {
        return savedTheme;
      }
    }
    // Por defecto, modo claro
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Aplicar tema al cargar
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Guardar en localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    
    // Debug: verificar que se aplicó correctamente
    // console.log("Theme changed to:", theme);
    // console.log("HTML has dark class:", root.classList.contains("dark"));
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setLightTheme = () => {
    setTheme("light");
  };

  const setDarkTheme = () => {
    setTheme("dark");
  };

  return {
    theme,
    toggleTheme,
    setLightTheme,
    setDarkTheme,
    isDark: theme === "dark",
  };
};

