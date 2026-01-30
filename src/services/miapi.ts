import axios from "axios";
import type { AxiosInstance } from "axios";

// URL base de la API de MiAPI
const MIAPI_BASE_URL = import.meta.env.VITE_MIAPI_BASE_URL as string;
const MIAPI_API_TOKEN = import.meta.env.VITE_MIAPI_API_TOKEN as string;

/**
 * Tipos para la generación de XML de comprobante
 */
export interface GenerarXMLComprobanteRequest {
  claveSecreta: string;
  tipoDoc: "01" | "03"; // 01: Factura, 03: Boleta
  serie: string;
  correlativo: string;
  observacion?: string;
  fechaEmision: string; // YYYY-MM-DD
  horaEmision?: string; // HH:mm:ss
  tipoMoneda: "PEN" | "USD";
  tipoPago: "Contado" | "Credito";
  total?: number;
  mtoIGV?: number;
  igvOp?: number;
  mtoOperGravadas?: number;
  cliente: {
    codigoPais: string;
    tipoDoc: string; // "1" para DNI, "6" para RUC
    numDoc: string;
    rznSocial: string;
    direccion: string;
  };
  items: Array<{
    codProducto: string;
    descripcion: string;
    unidad: string;
    cantidad: number;
    mtoBaseIgv: number;
    mtoValorUnitario: number;
    mtoPrecioUnitario: number;
    codeAfect: string;
    igvPorcent: number;
    igv: number;
  }>;
}

/**
 * Tipos para enviar XML a SUNAT
 */
export interface EnviarXMLASUNATRequest {
  claveSecreta: string;
  comprobante: {
    tipoDoc: "01" | "03"; // 01: Factura, 03: Boleta
    serie: string;
    correlativo: string;
  };
}

/**
 * Respuesta al enviar XML a SUNAT (dentro del objeto respuesta)
 */
export interface EnviarXMLASUNATResponseData {
  success: boolean;
  status: number;
  hash?: string;
  "xml-sin-firmar"?: string;
  "xml-firmado"?: string;
  "pdf-a4"?: string;
  "pdf-ticket"?: string;
  cdr?: string;
  code: string;
  mensaje: string;
}

/**
 * Respuesta completa al enviar XML a SUNAT (envuelta en respuesta)
 */
export interface EnviarXMLASUNATResponse {
  respuesta: EnviarXMLASUNATResponseData;
}

/**
 * Request para anular un comprobante (RA)
 * Endpoint: POST /apifact/voided/send
 */
export interface AnularComprobanteRequest {
  claveSecreta: string;
  cabecera: {
    tipodoc: "RA";
    serie: string; // YYYYMMDD
    correlativo: string;
    fechaEmision: string; // YYYY-MM-DD
    fechaEnvio: string; // YYYY-MM-DD
  };
  items: Array<{
    tipodoc: "01" | "03";
    serie: string;
    correlativo: string; // string con 8 dígitos (padStart(8, "0"))
    motivo: string;
  }>;
}

/**
 * Respuesta al anular comprobante
 */
export interface AnularComprobanteResponseData {
  success: boolean;
  status: number;
  mensaje: string;
}

export interface AnularComprobanteResponse {
  respuesta: AnularComprobanteResponseData;
}

/**
 * Cliente HTTP para interactuar con la API de MiAPI para facturación
 */
class MiAPIClient {
  private axiosInstance: AxiosInstance;

  constructor(baseUrl: string = MIAPI_BASE_URL) {
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MIAPI_API_TOKEN}`,
      },
    });
  }

  /**
   * Genera el XML de un comprobante (factura o boleta)
   * Endpoint: POST /apifact/invoice/create
   *
   * @param request Datos del comprobante según estructura de MiAPI
   * @returns Respuesta con el XML generado
   */
  async generarXMLComprobante(
    request: GenerarXMLComprobanteRequest
  ): Promise<unknown> {
    try {
      // Construir el JSON según la estructura requerida
      const requestBody = {
        claveSecreta: request.claveSecreta,
        comprobante: {
          tipoOperacion: "0101",
          tipoDoc: request.tipoDoc,
          serie: request.serie,
          correlativo: request.correlativo,
          fechaEmision: request.fechaEmision,
          horaEmision: request.horaEmision || new Date().toTimeString().slice(0, 8),
          tipoMoneda: request.tipoMoneda,
          tipoPago: request.tipoPago,
          observacion: request.observacion || "",
        },
        cliente: request.cliente,
        items: request.items,
      };

      // Log del objeto que se envía a MiAPI para generar XML
      console.log("Objeto enviado a MiAPI (generarXMLComprobante):", JSON.stringify(requestBody, null, 2));

      const { data } = await this.axiosInstance.post<unknown>(
        "/apifact/invoice/create",
        requestBody
      );
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as
          | { message?: string; error?: string }
          | undefined;
        throw new Error(
          errorData?.message ||
            errorData?.error ||
            error.message ||
            "Error al generar XML"
        );
      }
      throw new Error("Error de conexión con MiAPI");
    }
  }

  /**
   * Envía el XML generado a SUNAT
   * Endpoint: POST /apifact/invoice/send
   *
   * @param request Datos del comprobante (claveSecreta, tipoDoc, serie, correlativo)
   * @returns Respuesta con los documentos generados (XML, PDF, CDR)
   */
  async enviarXMLASUNAT(
    request: EnviarXMLASUNATRequest
  ): Promise<EnviarXMLASUNATResponse> {
    try {
      // Log del objeto que se envía a SUNAT
      console.log("Objeto enviado a SUNAT:", JSON.stringify(request, null, 2));
      
      const { data } = await this.axiosInstance.post<EnviarXMLASUNATResponse>(
        "/apifact/invoice/send",
        request
      );
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as
          | { message?: string; error?: string; respuesta?: EnviarXMLASUNATResponseData }
          | undefined;
        // Si viene con estructura de respuesta, extraer el mensaje
        if (errorData?.respuesta?.mensaje) {
          throw new Error(errorData.respuesta.mensaje);
        }
        throw new Error(
          errorData?.message ||
            errorData?.error ||
            error.message ||
            "Error al enviar XML a SUNAT"
        );
      }
      throw new Error("Error de conexión con MiAPI");
    }
  }

  /**
   * Anula un comprobante emitido (envía documento RA a SUNAT).
   * Endpoint: POST /apifact/voided/send
   *
   * @param request claveSecreta, cabecera (tipodoc RA, serie YYYYMMDD, correlativo RA, fechas), items (tipodoc, serie, correlativo del documento original como string 8 dígitos, motivo)
   * @returns Respuesta con success y mensaje; si success es true la anulación fue aceptada.
   */
  async anularComprobante(
    request: AnularComprobanteRequest
  ): Promise<AnularComprobanteResponse> {
    try {
      const { data } = await this.axiosInstance.post<AnularComprobanteResponse>(
        "/apifact/voided/send",
        request
      );
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as
          | { message?: string; error?: string; respuesta?: AnularComprobanteResponseData }
          | undefined;
        if (errorData?.respuesta?.mensaje) {
          throw new Error(errorData.respuesta.mensaje);
        }
        throw new Error(
          errorData?.message ??
            errorData?.error ??
            error.message ??
            "Error al anular comprobante"
        );
      }
      throw new Error("Error de conexión con MiAPI");
    }
  }
}

// Instancia singleton del cliente
export const miapiClient = new MiAPIClient();

// Exportar la clase por si se necesita crear instancias personalizadas
export default MiAPIClient;
