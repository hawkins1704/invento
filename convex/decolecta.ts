import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";

/**
 * Acción para consultar datos de una empresa por RUC
 * Actúa como proxy para evitar problemas de CORS
 * "use node" permite usar process.env y fetch nativo de Node.js
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
    const baseUrl = process.env.DECOLECTA_BASE_URL;
    const apiToken = process.env.DECOLECTA_API_TOKEN;

    if (!baseUrl || !apiToken) {
      throw new ConvexError("Configuración de Decolecta no encontrada");
    }

    // Limpiar el RUC de espacios y caracteres especiales
    const rucLimpio = args.ruc.trim().replace(/\D/g, "");

    if (!rucLimpio || rucLimpio.length < 8) {
      throw new ConvexError("El RUC debe tener al menos 8 dígitos");
    }

    try {
      const url = `${baseUrl}/v1/sunat/ruc?numero=${encodeURIComponent(rucLimpio)}`;
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
      return data;
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError(
        error instanceof Error ? error.message : "Error de conexión con Decolecta"
      );
    }
  },
});

/**
 * Acción para consultar datos de una persona por DNI
 * Actúa como proxy para evitar problemas de CORS
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
    const baseUrl = process.env.DECOLECTA_BASE_URL;
    const apiToken = process.env.DECOLECTA_API_TOKEN;



    if (!baseUrl || !apiToken) {
      throw new ConvexError("Configuración de Decolecta no encontrada");
    }

    // Limpiar el DNI de espacios y caracteres especiales
    const dniLimpio = args.dni.trim().replace(/\D/g, "");

    if (!dniLimpio || dniLimpio.length < 8) {
      throw new ConvexError("El DNI debe tener 8 dígitos");
    }

    try {
      const url = `${baseUrl}/v1/reniec/dni?numero=${encodeURIComponent(dniLimpio)}`;
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
      return data;
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }
      throw new ConvexError(
        error instanceof Error ? error.message : "Error de conexión con Decolecta"
      );
    }
  },
});

