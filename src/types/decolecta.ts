// Tipos para la API de Decolecta

/**
 * Respuesta de consulta por RUC
 */
export interface RUCResponse {
  ruc?: string;
  razonSocial?: string;
  nombreComercial?: string;
  tipo?: string;
  estado?: string;
  condicion?: string;
  direccion?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  email?: string;
  telefono?: string;
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

