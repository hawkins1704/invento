import axios from "axios";
import type { AxiosInstance } from "axios";
import type { RUCResponse, DNIResponse, DecolectaError } from "../types/decolecta";

// URL base de la API de Decolecta
const DECOLECTA_BASE_URL = import.meta.env.VITE_DECOLECTA_BASE_URL as string;

// Token de autenticación
const DECOLECTA_API_TOKEN = import.meta.env.VITE_DECOLECTA_API_TOKEN as string;

/**
 * Cliente HTTP para interactuar con la API de Decolecta
 */
class DecolectaClient {
  private axiosInstance: AxiosInstance;

  constructor(baseUrl: string = DECOLECTA_BASE_URL, apiToken: string = DECOLECTA_API_TOKEN) {

    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
    });
  }

  /**
   * Consulta datos de una empresa por RUC
   * 
   * @param ruc Número de RUC (11 dígitos)
   * @returns Datos de la empresa
   */
  async consultarRUC(ruc: string): Promise<RUCResponse> {
    try {
      // Limpiar el RUC de espacios y caracteres especiales
      const rucLimpio = ruc.trim().replace(/\D/g, "");
      
      if (!rucLimpio || rucLimpio.length < 8) {
        throw new Error("El RUC debe tener al menos 8 dígitos");
      }

      const { data } = await this.axiosInstance.get<RUCResponse>(
        `/ruc/${rucLimpio}`
      );
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as DecolectaError | undefined;
        throw new Error(
          errorData?.message || errorData?.error || error.message || "Error al consultar RUC"
        );
      }
      throw new Error("Error de conexión con Decolecta");
    }
  }

  /**
   * Consulta datos de una persona por DNI
   * Endpoint: GET /v1/reniec/dni?numero={dni}
   * 
   * @param dni Número de DNI (8 dígitos)
   * @returns Datos de la persona
   */
  async consultarDNI(dni: string): Promise<DNIResponse> {
    try {
      // Limpiar el DNI de espacios y caracteres especiales
      const dniLimpio = dni.trim().replace(/\D/g, "");
      
      if (!dniLimpio || dniLimpio.length < 8) {
        throw new Error("El DNI debe tener 8 dígitos");
      }

      const { data } = await this.axiosInstance.get<DNIResponse>(
        `/v1/reniec/dni`,
        {
          params: {
            numero: dniLimpio,
          },
        }
      );
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as DecolectaError | undefined;
        throw new Error(
          errorData?.message || errorData?.error || error.message || "Error al consultar DNI"
        );
      }
      throw new Error("Error de conexión con Decolecta");
    }
  }
}

// Instancia singleton del cliente
export const decolectaClient = new DecolectaClient();

// Exportar la clase por si se necesita crear instancias personalizadas
export default DecolectaClient;

