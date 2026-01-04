import axios from "axios";
import type { AxiosInstance } from "axios";
import type {
    EmitDocumentRequest,
    EmitDocumentResponse,
    APISUNATDocument,
    APISUNATError,
    ListDocumentsParams,
    PDFFormat,
    LastDocumentRequest,
    LastDocumentResponse,
} from "../types/apisunat";

// URL base de la API de APISUNAT
const APISUNAT_BASE_URL = import.meta.env.VITE_APISUNAT_BASE_URL as string;

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
     * Obtiene el último número correlativo para un documento
     * Endpoint: POST /personas/lastDocument
     *
     * @param request Parámetros: personaId, personaToken, type, serie
     * @returns Respuesta con lastNumber y suggestedNumber
     */
    async getLastDocument(
        request: LastDocumentRequest
    ): Promise<LastDocumentResponse> {
        try {
            const { data } =
                await this.axiosInstance.post<LastDocumentResponse>(
                    "/personas/lastDocument",
                    request
                );
            return data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data as
                    | APISUNATError
                    | undefined;
                throw new Error(
                    errorData?.message ||
                        errorData?.error ||
                        error.message ||
                        "Error al obtener número correlativo"
                );
            }
            throw new Error("Error de conexión con APISUNAT");
        }
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
            console.log("document: ", document);
            const { data } =
                await this.axiosInstance.post<EmitDocumentResponse>(
                    "/personas/v1/sendBill",
                    document
                );
            return data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.log(
                    "Error encontrado al emitir documento: ",
                    error.response?.data
                );
                // const errorData = error.response?.data as APISUNATError | undefined;
                // throw new Error(
                //   errorData?.message || errorData?.error || error.message || "Error al emitir documento"
                // );
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
                const errorData = error.response?.data as
                    | APISUNATError
                    | undefined;
                throw new Error(
                    errorData?.message ||
                        errorData?.error ||
                        error.message ||
                        "Error al listar documentos"
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
    /**
     * Obtiene un documento específico por ID
     * Endpoint: GET /documents/:documentId/getById
     *
     * @param documentId ID del documento obtenido como respuesta del método sendBill
     * @param personaToken Token de autenticación
     * @returns Documento con toda su información incluyendo fileName, status, type, etc.
     */
    async getDocument(
        documentId: string,
        personaToken: string
    ): Promise<APISUNATDocument> {
        try {
            const { data } = await this.axiosInstance.get<APISUNATDocument>(
                `/documents/${documentId}/getById`,
                {
                    headers: {
                        Authorization: `Bearer ${personaToken}`,
                    },
                }
            );
            return data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const errorData = error.response?.data as
                    | APISUNATError
                    | undefined;
                throw new Error(
                    errorData?.message ||
                        errorData?.error ||
                        error.message ||
                        "Error al obtener documento"
                );
            }
            throw new Error("Error de conexión con APISUNAT");
        }
    }

    /**
     * Abre el PDF de un documento en una nueva pestaña
     * Endpoint: GET /documents/:documentId/getPDF/:format/:fileName[.pdf]
     *
     * @param documentId ID del documento
     * @param format Formato del PDF (A4, A5, ticket58mm, ticket80mm)
     * @param fileName Nombre del archivo (con o sin .pdf)
     */
    async downloadPDF(
        documentId: string,
        format: PDFFormat,
        fileName: string
    ): Promise<void> {
        try {
            // Asegurar que el fileName termine en .pdf
            const fileNameWithExtension = fileName.endsWith(".pdf")
                ? fileName
                : `${fileName}.pdf`;

            // Construir la URL completa
            const baseUrl =
                this.axiosInstance.defaults.baseURL || APISUNAT_BASE_URL;
            const pdfUrl = `${baseUrl}/documents/${documentId}/getPDF/${format}/${fileNameWithExtension}`;

            // Abrir el PDF en una nueva pestaña para evitar problemas de CORS
            window.open(pdfUrl, "_blank");
        } catch (error) {
            console.log("Error al abrir PDF: ", error);
            throw new Error("Error al abrir el PDF");
        }
    }

    async printPDF(
        documentId: string,
        format: PDFFormat,
        fileName: string
    ): Promise<void> {
        try {
            // Asegurar que el fileName termine en .pdf
            const fileNameWithExtension = fileName.endsWith(".pdf")
                ? fileName
                : `${fileName}.pdf`;

            // Construir la URL completa
            const baseUrl =
                this.axiosInstance.defaults.baseURL || APISUNAT_BASE_URL;
            const pdfUrl = `${baseUrl}/documents/${documentId}/getPDF/${format}/${fileNameWithExtension}`;
            // console.log("pdfUrl: ", pdfUrl);

            const formatWithoutTicket = format.replace(/^ticket/i, "");
            const directpdfUrl = `https://pdf.apisunat.com/${documentId}/${formatWithoutTicket}/${fileNameWithExtension}`;
            console.log("directpdfUrl: ", directpdfUrl);
            const iframe = document.createElement("iframe");
            iframe.src = directpdfUrl;
            iframe.style.display = "block";
            iframe.style.width = "100%";
            iframe.style.height = "100%";
            document.body.appendChild(iframe);
            
            const printWindow = iframe.contentWindow;
            if(printWindow) {
              console.log("printWindow disponible: ", printWindow);
                // printWindow.focus();
                // printWindow.print();
            }
            // window.print();
        } catch (error) {
            console.log("Error al imprimir PDF: ", error);
            throw new Error("Error al imprimir el PDF");
        }
    }
}

// Instancia singleton del cliente
export const apisunatClient = new APISUNATClient();

// Exportar la clase por si se necesita crear instancias personalizadas
export default APISUNATClient;
