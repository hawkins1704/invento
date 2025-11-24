import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { useAPISUNAT } from "../../hooks/useAPISUNAT";
import type { APISUNATDocument, PDFFormat } from "../../types/apisunat";
import { formatDate } from "../../utils/format";
import { FaDownload } from "react-icons/fa";

const getStatusBadge = (status: string) => {
  const statusConfig = {
    PENDIENTE: {
      label: "Pendiente",
      className: "border-yellow-500/40 bg-yellow-500/10 text-yellow-200",
    },
    ACEPTADO: {
      label: "Aceptado",
      className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    },
    RECHAZADO: {
      label: "Rechazado",
      className: "border-red-500/40 bg-red-500/10 text-red-200",
    },
    EXCEPCION: {
      label: "Excepción",
      className: "border-orange-500/40 bg-orange-500/10 text-orange-200",
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    className: "border-slate-500/40 bg-slate-500/10 text-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
};

const getDocumentTypeName = (type: string): string => {
  const typeMap: Record<string, string> = {
    "01": "Factura",
    "03": "Boleta de Venta",
    "04": "Liquidación de Compra",
    "07": "Nota de Crédito",
    "08": "Nota de Débito",
    "09": "Guía de Remisión - Remitente",
  };

  return typeMap[type] || type;
};

const AdminDocuments = () => {
  const currentUser = useQuery(api.users.getCurrent) as Doc<"users"> | undefined;
  const { listDocuments, downloadPDF, isLoading, error } = useAPISUNAT();
  const [documents, setDocuments] = useState<APISUNATDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<APISUNATDocument | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<PDFFormat>("A4");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocuments = async () => {
      if (!currentUser?.personaId || !currentUser?.personaToken) {
        return;
      }

      setIsLoadingDocuments(true);
      const result = await listDocuments(
        currentUser.personaId,
        currentUser.personaToken,
        {
          limit: 100,
          order: "DESC",
        }
      );

      if (result) {
        setDocuments(result);
      }
      setIsLoadingDocuments(false);
    };

    if (currentUser?.personaId && currentUser?.personaToken) {
      void loadDocuments();
    }
  }, [currentUser?.personaId, currentUser?.personaToken, listDocuments]);

  const handleDownloadClick = (document: APISUNATDocument) => {
    setSelectedDocument(document);
    setSelectedFormat("A4");
    setDownloadError(null);
  };

  const handleCloseModal = () => {
    if (!isDownloading) {
      setSelectedDocument(null);
      setDownloadError(null);
    }
  };

  const handleDownload = async () => {
    if (!selectedDocument || !currentUser?.personaToken) {
      return;
    }

    setIsDownloading(true);
    setDownloadError(null);


    try {
      const blob = await downloadPDF(
        selectedDocument.id,
        selectedFormat,
        selectedDocument.fileName,
      );

      if (blob) {
        // Crear URL del blob y descargar
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${selectedDocument.fileName}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        // Cerrar modal después de descargar
        setSelectedDocument(null);
      } else {
        setDownloadError("No se pudo descargar el PDF. Intenta nuevamente.");
      }
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Error al descargar el PDF"
      );
    } finally {
      setIsDownloading(false);
    }
  };

  if (currentUser === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-400">
        Cargando información...
      </div>
    );
  }

  if (!currentUser.personaId || !currentUser.personaToken) {
    return (
      <div className="space-y-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold">Documentos Emitidos</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Visualiza todos los documentos electrónicos emitidos a través de APISUNAT.
            </p>
          </div>
        </header>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20">
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-400">
            <span className="text-4xl" aria-hidden>
              ⚠️
            </span>
            <p className="text-sm text-slate-400">
              Para ver los documentos emitidos, necesitas configurar tu Persona ID y Persona Token en tu perfil.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-white shadow-inner shadow-black/20 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold">Documentos Emitidos</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Visualiza todos los documentos electrónicos emitidos a través de APISUNAT.
          </p>
        </div>
      </header>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-white shadow-inner shadow-black/20">
        {isLoadingDocuments || isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-400">
            <span className="text-4xl" aria-hidden>
              ⏳
            </span>
            <p className="text-sm text-slate-400">Cargando documentos...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-red-400">
            <span className="text-4xl" aria-hidden>
              ❌
            </span>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-slate-400">
            <span className="text-4xl" aria-hidden>
              📄
            </span>
            <p className="text-sm text-slate-400">
              No hay documentos emitidos aún. Los documentos aparecerán aquí después de ser emitidos.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.24em] text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Filename
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Tipo
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Fecha Emisión
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Fecha Respuesta
                  </th>
                  <th scope="col" className="px-6 py-4 font-semibold">
                    Descargar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40 text-slate-200">
                {documents.map((document, index) => (
                  <tr
                    key={index}
                    className="transition hover:bg-slate-900/60"
                  >
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-white">
                        {document.fileName}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {getDocumentTypeName(document.type)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(document.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {formatDate(document.issueTime * 1000)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {document.responseTime ? formatDate(document.responseTime * 1000) : "-"}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleDownloadClick(document)}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900/50 p-2 text-slate-300 transition hover:border-[#fa7316] hover:bg-slate-800 hover:text-[#fa7316]"
                        aria-label="Descargar PDF"
                      >
                        <FaDownload className="text-lg" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de descarga */}
      {selectedDocument && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 px-4 py-10 backdrop-blur">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/95 p-6 text-white shadow-2xl shadow-black/60">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isDownloading}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Cerrar"
            >
              ✕
            </button>

            <div className="space-y-5 pt-6">
              <header className="space-y-2">
                <h2 className="text-2xl font-semibold text-white">Descargar PDF</h2>
                <p className="text-sm text-slate-400">
                  Selecciona el formato del documento que deseas descargar.
                </p>
              </header>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Documento</p>
                <p className="mt-2 text-lg font-semibold text-white">{selectedDocument.fileName}</p>
                <p className="text-xs text-slate-500">{getDocumentTypeName(selectedDocument.type)}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500" htmlFor="pdf-format">
                  Formato
                </label>
                <select
                  id="pdf-format"
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value as PDFFormat)}
                  disabled={isDownloading}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 text-sm text-white outline-none transition focus:border-[#fa7316] focus:ring-2 focus:ring-[#fa7316]/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="ticket58mm">Ticket 58mm</option>
                  <option value="ticket80mm">Ticket 80mm</option>
                </select>
                <p className="text-xs text-slate-500">
                  Selecciona el formato de impresión del documento.
                </p>
              </div>

              {downloadError && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {downloadError}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isDownloading}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-[#fa7316] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#fa7316] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#fa7316]/40 transition hover:bg-[#e86811] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isDownloading ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Descargando...
                    </>
                  ) : (
                    <>
                      <FaDownload />
                      Descargar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDocuments;
