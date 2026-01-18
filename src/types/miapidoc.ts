// Tipos para la API de MiAPI Cloud

/**
 * Estructura de domicilio en respuestas de MiAPI
 */
export interface Domiciliado {
  direccion?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  ubigeo?: string;
}

/**
 * Respuesta de consulta por RUC según documentación de MiAPI Cloud
 * Nota: El proxy de Convex extrae solo el objeto "datos" de la respuesta completa
 */
export interface RUCResponse {
  ruc?: string; // RUC de la empresa
  razon_social?: string; // Razón social de la empresa
  estado?: string; // Estado (ej: "ACTIVO")
  condicion?: string; // Condición (ej: "HABIDO")
  domiciliado?: Domiciliado; // Información de domicilio
  [key: string]: unknown; // Para campos adicionales que pueda devolver la API
}

/**
 * Respuesta de consulta por DNI según documentación de MiAPI Cloud
 * Nota: El proxy de Convex extrae solo el objeto "datos" de la respuesta completa
 */
export interface DNIResponse {
  dni?: string; // Número de DNI
  nombres?: string; // Nombres (ej: "RENZO ANTONIO")
  ape_paterno?: string; // Apellido paterno (ej: "ARROYO")
  ape_materno?: string; // Apellido materno (ej: "ANDRADE")
  domiciliado?: Domiciliado; // Información de domicilio
  [key: string]: unknown; // Para campos adicionales que pueda devolver la API
}

/**
 * Error response de MiAPI Cloud
 */
export interface MiAPIError {
  success?: boolean;
  error?: string;
  message?: string;
  statusCode?: number;
  [key: string]: unknown;
}
