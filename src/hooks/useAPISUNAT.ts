import { useState, useCallback } from "react";
import { apisunatClient } from "../services/apisunat";
import type {
  EmitDocumentRequest,
  EmitDocumentResponse,
  APISUNATDocument,
  ListDocumentsParams,
  PDFFormat,
  LastDocumentRequest,
  LastDocumentResponse,
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
   * Obtiene el último número correlativo para un documento
   */
  const getLastDocument = useCallback(async (
    request: LastDocumentRequest
  ): Promise<LastDocumentResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apisunatClient.getLastDocument(request);
      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido al obtener número correlativo";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
  const listDocuments = useCallback(async (
    personaId: string,
    personaToken: string,
    params?: ListDocumentsParams
  ): Promise<APISUNATDocument[] | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apisunatClient.listDocuments(personaId, personaToken, params);

      // console.log(response);
      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido al listar documentos";
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
   * Abre el PDF de un documento en una nueva pestaña
   */
  const downloadPDF = async (
    documentId: string,
    format: PDFFormat,
    fileName: string,
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await apisunatClient.downloadPDF(documentId, format, fileName);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al abrir PDF";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  

  return {
    getLastDocument,
    emitDocument,
    listDocuments,
    getDocument,
    downloadPDF,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}

