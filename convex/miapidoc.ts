import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

/**
 * Acción para consultar datos de una empresa por RUC
 * Actúa como proxy para evitar problemas de CORS
 * "use node" permite usar process.env y fetch nativo de Node.js
 * Utiliza MiAPI Cloud para consultas de RUC
 */
export const consultarRUC = action({
  args: {
    ruc: v.string(),
  },
  handler: async (ctx, args) => {
    "use node";
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    // Obtener variables de entorno
    const baseUrl = process.env.MIAPI_BASE_URL;
    const apiToken = process.env.MIAPI_API_TOKEN;

    if (!baseUrl || !apiToken) {
      throw new ConvexError("Configuración de MiAPI no encontrada");
    }

    // Limpiar el RUC de espacios y caracteres especiales
    const rucLimpio = args.ruc.trim().replace(/\D/g, "");

    if (!rucLimpio || rucLimpio.length !== 11) {
      throw new ConvexError("El RUC debe tener 11 dígitos");
    }

    try {
      // Endpoint de MiAPI: GET /v1/ruc/{ruc}
      const url = `${baseUrl}/v1/ruc/${rucLimpio}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ConvexError(
          errorData.message || errorData.error || `Error al consultar RUC: ${response.statusText}`
        );
      }

      const data = await response.json();
      
      // MiAPI devuelve { success: true, datos: {...} }
      // Retornamos solo los datos para mantener compatibilidad con el código existente
      if (data.success && data.datos) {
        return data.datos;
      }
      
      // Si success es false o no hay datos, lanzar error
      if (!data.success) {
        throw new ConvexError(
          data.message || data.error || "Error al consultar RUC: La consulta no fue exitosa"
        );
      }
      
      // Fallback: retornar data directamente si no tiene la estructura esperada
      return data;
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError(
        error instanceof Error ? error.message : "Error de conexión con MiAPI"
      );
    }
  },
});

/**
 * Acción para consultar datos de una persona por DNI
 * Actúa como proxy para evitar problemas de CORS
 * Utiliza MiAPI Cloud para consultas de DNI
 */
export const consultarDNI = action({
  args: {
    dni: v.string(),
  },
  handler: async (ctx, args) => {
    "use node";
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("No autenticado");
    }

    // Obtener variables de entorno
    const baseUrl = process.env.MIAPI_BASE_URL;
    const apiToken = process.env.MIAPI_API_TOKEN;

    if (!baseUrl || !apiToken) {
      throw new ConvexError("Configuración de MiAPI no encontrada");
    }

    // Limpiar el DNI de espacios y caracteres especiales
    const dniLimpio = args.dni.trim().replace(/\D/g, "");

    if (!dniLimpio || dniLimpio.length !== 8) {
      throw new ConvexError("El DNI debe tener 8 dígitos");
    }

    try {
      // Endpoint de MiAPI: GET /v1/dni/{dni}
      const url = `${baseUrl}/v1/dni/${dniLimpio}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ConvexError(
          errorData.message || errorData.error || `Error al consultar DNI: ${response.statusText}`
        );
      }

      const data = await response.json();
      
      // MiAPI devuelve { success: true, datos: {...} }
      // Retornamos solo los datos para mantener compatibilidad con el código existente
      if (data.success && data.datos) {
        return data.datos;
      }
      
      // Si success es false o no hay datos, lanzar error
      if (!data.success) {
        throw new ConvexError(
          data.message || data.error || "Error al consultar DNI: La consulta no fue exitosa"
        );
      }
      
      // Fallback: retornar data directamente si no tiene la estructura esperada
      return data;
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError(
        error instanceof Error ? error.message : "Error de conexión con MiAPI"
      );
    }
  },
});

