import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

// Inicializar tema antes del render para evitar flash de contenido
const initializeTheme = () => {
  const savedTheme = localStorage.getItem("theme");
  const root = document.documentElement;
  
  if (savedTheme === "dark") {
    root.classList.add("dark");
  } else {
    // Por defecto modo claro
    root.classList.remove("dark");
    if (!savedTheme) {
      localStorage.setItem("theme", "light");
    }
  }
};

// Ejecutar antes de renderizar
initializeTheme();

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ConvexAuthProvider client={convex}>
            <App />
        </ConvexAuthProvider>
    </StrictMode>
);
