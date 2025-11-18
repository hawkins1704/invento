// Tipos para la API de APISUNAT

export type DocumentType = "01" | "03"; // 01: Factura, 03: Boleta

export type DocumentStatus = "PENDIENTE" | "ACEPTADO" | "RECHAZADO" | "EXCEPCION";

/**
 * Request para emitir un documento (factura o boleta)
 */
export interface EmitDocumentRequest {
  personaId: string;
  personaToken: string;
  fileName: string;
  documentBody: Record<string, any>; // Estructura UBL completa
}

/**
 * Response al emitir un documento
 */
export interface EmitDocumentResponse {
  status: DocumentStatus;
  documentId: string;
}

/**
 * Documento completo obtenido de APISUNAT
 */
export interface APISUNATDocument {
  _id: string;
  status: DocumentStatus;
  fileName: string;
  documentType: DocumentType;
  xmlUrl?: string;
  pdfUrl?: string;
  cdrUrl?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response al listar documentos
 */
export interface ListDocumentsResponse {
  documents: APISUNATDocument[];
  total: number;
}

/**
 * Error response de APISUNAT
 */
export interface APISUNATError {
  error: string;
  message: string;
  statusCode?: number;
}

