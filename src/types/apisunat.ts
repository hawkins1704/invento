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
 * Documento completo obtenido de APISUNAT (según getAll)
 */
export interface APISUNATDocument {
  id: string; // ID del documento (documentId)
  production: boolean;
  status: DocumentStatus;
  type: string; // "01", "03", "D1", etc.
  issueTime: number; // UNIX timestamp - fecha de emisión
  responseTime: number; // UNIX timestamp - fecha de respuesta SUNAT
  fileName: string;
  xml: string; // URL del XML
  cdr: string; // URL del CDR
  faults: any[]; // arreglo de errores
  notes: any[]; // arreglo de observaciones
  personaId: string;
  reference?: string; // referencia enviada al momento de emitir
}

export type PDFFormat = "A4" | "A5" | "ticket58mm" | "ticket80mm";

/**
 * Parámetros opcionales para listar documentos
 */
export interface ListDocumentsParams {
  limit?: number; // máx. 100
  skip?: number;
  from?: number; // UNIX timestamp
  to?: number; // UNIX timestamp
  status?: DocumentStatus;
  type?: string; // "01", "03", "D1", etc.
  order?: "ASC" | "DESC";
  serie?: string;
  number?: string; // 8 dígitos
}

/**
 * Error response de APISUNAT
 */
export interface APISUNATError {
  error: string;
  message: string;
  statusCode?: number;
}

