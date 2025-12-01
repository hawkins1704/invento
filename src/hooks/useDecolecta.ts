import { useState, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { RUCResponse, DNIResponse } from "../types/decolecta";

/**
 * Hook personalizado para usar Decolecta API a través de Convex (proxy)
 * Evita problemas de CORS haciendo las peticiones desde el servidor
 * 
 * Ejemplo de uso:
 * ```tsx
 * const { consultarRUC, consultarDNI, isLoading, error } = useDecolecta();
 * 
 * const handleConsultarRUC = async () => {
 *   const result = await consultarRUC("20100070970");
 *   if (result) {
 *     console.log('Datos del RUC:', result);
 *   }
 * };
 * ```
 */
export function useDecolecta() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Acciones de Convex que actúan como proxy
  const consultarRUCAction = useAction(api.decolecta.consultarRUC);
  const consultarDNIAction = useAction(api.decolecta.consultarDNI);

  /**
   * Consulta datos de una empresa por RUC
   */
  const consultarRUC = useCallback(async (
    ruc: string
  ): Promise<RUCResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await consultarRUCAction({ ruc });
      return response as RUCResponse;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido al consultar RUC";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [consultarRUCAction]);

  /**
   * Consulta datos de una persona por DNI
   */
  const consultarDNI = useCallback(async (
    dni: string
  ): Promise<DNIResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await consultarDNIAction({ dni });
      return response as DNIResponse;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido al consultar DNI";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [consultarDNIAction]);

  return {
    consultarRUC,
    consultarDNI,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

