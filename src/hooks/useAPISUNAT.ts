import { useState } from "react";
import { apisunatClient } from "../services/apisunat";
import type {
  EmitDocumentRequest,
  EmitDocumentResponse,
  ListDocumentsResponse,
  APISUNATDocument,
} from "../types/apisunat";

/**
 * Hook personalizado para usar APISUNAT con manejo de estado básico
 * 
 * Ejemplo de uso:
 * ```tsx
 * const { emitDocument, isLoading, error } = useAPISUNAT();
 * 
 * const handleEmit = async () => {
 *   const result = await emitDocument(documentData);
 *   if (result) {
 *     console.log('Documento emitido:', result.documentId);
 *   }
 * };
 * ```
 */
export function useAPISUNAT() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Emite un documento (factura o boleta)
   */
  const emitDocument = async (
    document: EmitDocumentRequest
  ): Promise<EmitDocumentResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apisunatClient.emitDocument(document);
      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido al emitir documento";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Obtiene todos los documentos emitidos
   */
  const listDocuments = async (
    personaToken: string
  ): Promise<ListDocumentsResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apisunatClient.listDocuments(personaToken);
      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido al listar documentos";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Obtiene un documento específico por ID
   */
  const getDocument = async (
    documentId: string,
    personaToken: string
  ): Promise<APISUNATDocument | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apisunatClient.getDocument(documentId, personaToken);
      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido al obtener documento";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Descarga el XML de un documento
   */
  const downloadXML = async (
    documentId: string,
    personaToken: string
  ): Promise<Blob | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const blob = await apisunatClient.downloadXML(documentId, personaToken);
      return blob;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al descargar XML";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Descarga el PDF de un documento
   */
  const downloadPDF = async (
    documentId: string,
    personaToken: string
  ): Promise<Blob | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const blob = await apisunatClient.downloadPDF(documentId, personaToken);
      return blob;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al descargar PDF";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Descarga el CDR de un documento
   */
  const downloadCDR = async (
    documentId: string,
    personaToken: string
  ): Promise<Blob | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const blob = await apisunatClient.downloadCDR(documentId, personaToken);
      return blob;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al descargar CDR";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    emitDocument,
    listDocuments,
    getDocument,
    downloadXML,
    downloadPDF,
    downloadCDR,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

