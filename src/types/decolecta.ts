// Tipos para la API de Decolecta

/**
 * Respuesta de consulta por RUC según documentación de Decolecta
 */
export interface RUCResponse {
  razon_social?: string; // Razón social de la empresa
  numero_documento?: string; // RUC de la empresa
  estado?: string;
  condicion?: string;
  direccion?: string; // Dirección completa (con tilde)
  ubigeo?: string; // Ubigeo según SUNAT
  via_tipo?: string;
  via_nombre?: string;
  zona_codigo?: string;
  zona_tipo?: string;
  numero?: string;
  interior?: string;
  lote?: string;
  dpto?: string; // Departamento
  manzana?: string;
  kilometro?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  es_agente_retencion?: boolean;
  es_buen_contribuyente?: boolean;
  [key: string]: unknown; // Para campos adicionales que pueda devolver la API
}

/**
 * Respuesta de consulta por DNI según documentación de Decolecta
 */
export interface DNIResponse {
  first_name?: string; // Nombres
  first_last_name?: string; // Apellidos paternos
  second_last_name?: string; // Apellidos maternos
  full_name?: string; // Nombre completo
  document_number?: string; // Número de DNI
  [key: string]: unknown; // Para campos adicionales que pueda devolver la API
}

/**
 * Error response de Decolecta
 */
export interface DecolectaError {
  error?: string;
  message?: string;
  statusCode?: number;
  [key: string]: unknown;
}

