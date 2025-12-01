import { useState, useCallback } from "react";
import { decolectaClient } from "../services/decolecta";
import type { RUCResponse, DNIResponse } from "../types/decolecta";

/**
 * Hook personalizado para usar Decolecta API con manejo de estado básico
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

  /**
   * Consulta datos de una empresa por RUC
   */
  const consultarRUC = useCallback(async (
    ruc: string
  ): Promise<RUCResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await decolectaClient.consultarRUC(ruc);
      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido al consultar RUC";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Consulta datos de una persona por DNI
   */
  const consultarDNI = useCallback(async (
    dni: string
  ): Promise<DNIResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await decolectaClient.consultarDNI(dni);
      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido al consultar DNI";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    consultarRUC,
    consultarDNI,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

