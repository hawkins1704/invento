import axios from "axios";
import type { AxiosInstance } from "axios";
import type {
  EmitDocumentRequest,
  EmitDocumentResponse,
  APISUNATDocument,
  APISUNATError,
  ListDocumentsParams,
  PDFFormat,
} from "../types/apisunat";

// URL base de la API de APISUNAT
const APISUNAT_BASE_URL = "https://back.apisunat.com";

/**
 * Cliente HTTP para interactuar con la API de APISUNAT
 */
class APISUNATClient {
  private axiosInstance: AxiosInstance;

  constructor(baseUrl: string = APISUNAT_BASE_URL) {
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      headers: {
        "Content-Type": "application/json",
      },
    });
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
      const { data } = await this.axiosInstance.post<EmitDocumentResponse>(
        "/sendBill",
        document
      );
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as APISUNATError | undefined;
        throw new Error(
          errorData?.message || errorData?.error || error.message || "Error al emitir documento"
        );
      }
      throw new Error("Error de conexión con APISUNAT");
    }
  }

  /**
   * Obtiene todos los documentos emitidos
   * Endpoint: GET /documents/getAll
   * 
   * @param personaId ID de la empresa
   * @param personaToken Token de autenticación
   * @param params Parámetros opcionales para filtros y paginación
   * @returns Array de documentos
   */
  async listDocuments(
    personaId: string,
    personaToken: string,
    params?: ListDocumentsParams
  ): Promise<APISUNATDocument[]> {
    try {
      const queryParams = new URLSearchParams({
        personaId,
        personaToken,
      });

      // Agregar parámetros opcionales
      if (params?.limit !== undefined) {
        queryParams.append("limit", params.limit.toString());
      }
      if (params?.skip !== undefined) {
        queryParams.append("skip", params.skip.toString());
      }
      if (params?.from !== undefined) {
        queryParams.append("from", params.from.toString());
      }
      if (params?.to !== undefined) {
        queryParams.append("to", params.to.toString());
      }
      if (params?.status) {
        queryParams.append("status", params.status);
      }
      if (params?.type) {
        queryParams.append("type", params.type);
      }
      if (params?.order) {
        queryParams.append("order", params.order);
      }
      if (params?.serie) {
        queryParams.append("serie", params.serie);
      }
      if (params?.number) {
        queryParams.append("number", params.number);
      }

      const { data } = await this.axiosInstance.get<APISUNATDocument[]>(
        `/documents/getAll?${queryParams.toString()}`
      );
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as APISUNATError | undefined;
        throw new Error(
          errorData?.message || errorData?.error || error.message || "Error al listar documentos"
        );
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
      const { data } = await this.axiosInstance.get<APISUNATDocument>(
        `/documents/${documentId}`,
        {
          headers: {
            Authorization: `Bearer ${personaToken}`,
          },
        }
      );
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data as APISUNATError | undefined;
        throw new Error(
          errorData?.message || errorData?.error || error.message || "Error al obtener documento"
        );
      }
      throw new Error("Error de conexión con APISUNAT");
    }
  }



  /**
   * Descarga el PDF de un documento
   * Endpoint: GET /documents/:documentId/getPDF/:format/:fileName[.pdf]
   * 
   * @param documentId ID del documento
   * @param format Formato del PDF (A4, A5, ticket58mm, ticket80mm)
   * @param fileName Nombre del archivo (con o sin .pdf)
   * @param personaToken Token de autenticación
   * @returns Blob del archivo PDF
   */
  async downloadPDF(
    documentId: string,
    format: PDFFormat,
    fileName: string,
  ): Promise<Blob> {
    try {
      // Asegurar que el fileName termine en .pdf
      const fileNameWithExtension = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
      console.log(`/documents/${documentId}/getPDF/${format}/${fileNameWithExtension}`);
      const { data } = await this.axiosInstance.get(
        `/documents/${documentId}/getPDF/${format}/${fileNameWithExtension}`,
   
      );
      console.log("DATA PDF", data);
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(error.message || "Error al descargar PDF");
      }
      throw new Error("Error de conexión con APISUNAT");
    }
  }



}

// Instancia singleton del cliente
export const apisunatClient = new APISUNATClient();

// Exportar la clase por si se necesita crear instancias personalizadas
export default APISUNATClient;

