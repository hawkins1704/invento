import type {
  EmitDocumentRequest,
  EmitDocumentResponse,
  ListDocumentsResponse,
  APISUNATDocument,
  APISUNATError,
} from "../types/apisunat";

// URL base de la API de APISUNAT
const APISUNAT_BASE_URL = "https://back.apisunat.com";

/**
 * Cliente HTTP para interactuar con la API de APISUNAT
 */
class APISUNATClient {
  private baseUrl: string;

  constructor(baseUrl: string = APISUNAT_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Emite un documento electrónico (factura o boleta)
   * Endpoint: POST /sendBill
   * 
   * @param document Datos del documento en formato UBL
   * @returns Respuesta con status y documentId
   */
  async emitDocument(
    document: EmitDocumentRequest
  ): Promise<EmitDocumentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/sendBill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(document),
      });

      if (!response.ok) {
        const errorData: APISUNATError = await response.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: `Error HTTP ${response.status}`,
          statusCode: response.status,
        }));

        throw new Error(errorData.message || errorData.error || "Error al emitir documento");
      }

      const data: EmitDocumentResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Error de conexión con APISUNAT");
    }
  }

  /**
   * Obtiene todos los documentos emitidos
   * Endpoint: GET /documents
   * 
   * @param personaToken Token de autenticación
   * @returns Lista de documentos
   */
  async listDocuments(
    personaToken: string
  ): Promise<ListDocumentsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/documents`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${personaToken}`,
        },
      });

      if (!response.ok) {
        const errorData: APISUNATError = await response.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: `Error HTTP ${response.status}`,
          statusCode: response.status,
        }));

        throw new Error(errorData.message || errorData.error || "Error al listar documentos");
      }

      const data: ListDocumentsResponse = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Error de conexión con APISUNAT");
    }
  }

  /**
   * Obtiene un documento específico por ID
   * Endpoint: GET /documents/:documentId
   * 
   * @param documentId ID del documento
   * @param personaToken Token de autenticación
   * @returns Documento completo
   */
  async getDocument(
    documentId: string,
    personaToken: string
  ): Promise<APISUNATDocument> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${personaToken}`,
        },
      });

      if (!response.ok) {
        const errorData: APISUNATError = await response.json().catch(() => ({
          error: "UNKNOWN_ERROR",
          message: `Error HTTP ${response.status}`,
          statusCode: response.status,
        }));

        throw new Error(errorData.message || errorData.error || "Error al obtener documento");
      }

      const data: APISUNATDocument = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Error de conexión con APISUNAT");
    }
  }

  /**
   * Descarga el XML de un documento
   * Endpoint: GET /documents/:documentId/xml
   * 
   * @param documentId ID del documento
   * @param personaToken Token de autenticación
   * @returns Blob del archivo XML
   */
  async downloadXML(
    documentId: string,
    personaToken: string
  ): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}/xml`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${personaToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error al descargar XML: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Error de conexión con APISUNAT");
    }
  }

  /**
   * Descarga el PDF de un documento
   * Endpoint: GET /documents/:documentId/pdf
   * 
   * @param documentId ID del documento
   * @param personaToken Token de autenticación
   * @returns Blob del archivo PDF
   */
  async downloadPDF(
    documentId: string,
    personaToken: string
  ): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}/pdf`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${personaToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error al descargar PDF: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Error de conexión con APISUNAT");
    }
  }

  /**
   * Descarga el CDR (Constancia de Recepción) de un documento
   * Endpoint: GET /documents/:documentId/cdr
   * 
   * @param documentId ID del documento
   * @param personaToken Token de autenticación
   * @returns Blob del archivo CDR
   */
  async downloadCDR(
    documentId: string,
    personaToken: string
  ): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/documents/${documentId}/cdr`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${personaToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error al descargar CDR: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Error de conexión con APISUNAT");
    }
  }
}

// Instancia singleton del cliente
export const apisunatClient = new APISUNATClient();

// Exportar la clase por si se necesita crear instancias personalizadas
export default APISUNATClient;

